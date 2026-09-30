import { prisma } from "@/lib/prisma";
import { ensureSyncColumns, ensureCotizacionHorarioColumns } from "@/lib/migraciones-lazy";
import { sembrarNotasEquiposProyecto } from "@/lib/notas-equipos";

/**
 * Motor de sincronización cotización → proyecto.
 *
 * Cuando una cotización aprobada se edita, propaga los cambios de equipos y
 * operación técnica al proyecto ligado, SIN destruir nunca datos manuales:
 *
 * - Equipos (ProyectoEquipo): agrega los nuevos, ajusta cantidad/días de los que
 *   cambiaron, y para los que ya no están en la cotización distingue: si el equipo
 *   no tiene nada capturado a mano (proveedor, notas, rider, montaje, confirmación)
 *   lo borra; si sí lo tiene, lo marca `necesitaRevision` para que alguien decida.
 * - Operación técnica (ProyectoPersonal): auto-crea slots VACÍOS para los roles/
 *   fechas nuevos y marca `necesitaRevision` en los puestos que sobran, ya sea
 *   porque el rol se quitó de la cotización o porque bajó la cantidad cotizada.
 *   Aquí nunca borra ni desasigna: atrás de un puesto hay una persona a la que
 *   ya se le prometió trabajo, y a quién se le cancela lo decide alguien. Ignora
 *   los slots `esAdicional`.
 * - Rider de carga (RiderAccesorio): cuelga de ProyectoEquipo, así que sigue la
 *   lista de equipos automáticamente (se conserva al marcar el equipo en revisión).
 *
 * Es idempotente: correrlo dos veces con la misma cotización no cambia nada.
 * Nunca lanza hacia afuera — cualquier error se registra y se traga, para no
 * romper la mutación de la cotización que lo dispara.
 */

// Extrae fecha (YYYY-MM-DD) y fase (participación) embebidas en la descripción de
// una línea de OPERACION_TECNICA. Mismo parser que la vista del proyecto.
function datosOperacionDeLinea(desc: string | null | undefined): {
  fechaJornada: string | null;
  participacion: string;
} {
  const d = desc ?? "";
  const mFecha = d.match(/·\s*(\d{4}-\d{2}-\d{2})/);
  const mFase = d.match(/\(\s*(Montaje|Desmontaje|Operaci[óo]n)\b/i);
  let participacion = "OPERACION";
  if (mFase) {
    const f = mFase[1].toLowerCase();
    participacion = f.startsWith("montaje")
      ? "MONTAJE"
      : f.startsWith("desmontaje")
      ? "DESMONTAJE"
      : "OPERACION";
  }
  return { fechaJornada: mFecha ? mFecha[1] : null, participacion };
}

type EquipoDeseado = {
  equipoId: string;
  tipo: "PROPIO" | "EXTERNO";
  cantidad: number;
  dias: number;
  costoExterno: number | null;
  proveedorId: string | null;
};

type SlotDeseado = {
  key: string;
  rolTecnicoId: string | null;
  fechaJornada: string | null;
  participacion: string;
  nivel: string | null;
  jornada: string | null;
  responsabilidad: string | null;
  tarifa: number | null;
  cantidad: number;
};

export async function sincronizarProyectoDesdeCotizacion(
  cotizacionId: string,
): Promise<{ sincronizado: boolean; motivo?: string }> {
  try {
    await ensureSyncColumns();
    await ensureCotizacionHorarioColumns();

    const cot = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        lineas: true,
        proyecto: {
          select: {
            id: true,
            equipos: true,
            personal: true,
          },
        },
      },
    });

    if (!cot) return { sincronizado: false, motivo: "cotización no encontrada" };
    if (!cot.proyecto) return { sincronizado: false, motivo: "sin proyecto ligado" };

    const proyectoId = cot.proyecto.id;

    // ── 1. Derivar equipos deseados desde la cotización ────────────────────────
    // Líneas de equipo directo + expansión de componentes de paquetes.
    const deseadosMap = new Map<string, EquipoDeseado>();
    const addEquipo = (e: EquipoDeseado) => {
      const key = `${e.tipo}:${e.equipoId}`;
      const prev = deseadosMap.get(key);
      if (prev) {
        prev.cantidad += e.cantidad;
        prev.dias = Math.max(prev.dias, e.dias);
        if (prev.costoExterno == null) prev.costoExterno = e.costoExterno;
        if (prev.proveedorId == null) prev.proveedorId = e.proveedorId;
      } else {
        deseadosMap.set(key, { ...e });
      }
    };

    for (const l of cot.lineas) {
      if (["EQUIPO_PROPIO", "EQUIPO_EXTERNO"].includes(l.tipo) && l.equipoId) {
        addEquipo({
          equipoId: l.equipoId,
          tipo: l.tipo === "EQUIPO_EXTERNO" ? "EXTERNO" : "PROPIO",
          cantidad: Math.round(l.cantidad),
          dias: l.dias,
          costoExterno: l.tipo === "EQUIPO_EXTERNO" ? l.costoUnitario : null,
          proveedorId: l.tipo === "EQUIPO_EXTERNO" ? l.proveedorId ?? null : null,
        });
      }
    }
    for (const l of cot.lineas.filter((x) => x.tipo === "PAQUETE")) {
      let comps: { equipoId?: string; cantidad?: number }[] = [];
      try {
        comps = JSON.parse(l.notasInternas ?? "{}").componentes ?? [];
      } catch {
        /* notasInternas no es JSON */
      }
      for (const c of comps) {
        if (!c.equipoId) continue;
        addEquipo({
          equipoId: c.equipoId,
          tipo: "PROPIO",
          cantidad: Math.round((c.cantidad ?? 0) * l.cantidad),
          dias: l.dias,
          costoExterno: null,
          proveedorId: null,
        });
      }
    }

    // ── 2. Diff de equipos contra el proyecto ──────────────────────────────────
    const existentes = cot.proyecto.equipos;
    const existentesPorKey = new Map<string, typeof existentes>();
    for (const pe of existentes) {
      const key = `${pe.tipo}:${pe.equipoId}`;
      const arr = existentesPorKey.get(key) ?? [];
      arr.push(pe);
      existentesPorKey.set(key, arr);
    }

    const equiposACrear: EquipoDeseado[] = [];
    for (const [key, d] of deseadosMap) {
      const filas = existentesPorKey.get(key);
      if (!filas || filas.length === 0) {
        equiposACrear.push(d);
        continue;
      }
      // El equipo sigue en la cotización → quitar bandera de revisión y, si hay
      // exactamente una fila, ajustar cantidad/días. Con varias filas (edición
      // manual) no tocamos cantidades para no romper el reparto manual.
      if (filas.length === 1) {
        const f = filas[0];
        const data: { cantidad?: number; dias?: number; necesitaRevision: boolean } = {
          necesitaRevision: false,
        };
        if (f.cantidad !== d.cantidad) data.cantidad = d.cantidad;
        if (f.dias !== d.dias) data.dias = d.dias;
        await prisma.proyectoEquipo.update({ where: { id: f.id }, data });
      } else {
        await prisma.proyectoEquipo.updateMany({
          where: { id: { in: filas.map((f) => f.id) } },
          data: { necesitaRevision: false },
        });
      }
    }

    if (equiposACrear.length > 0) {
      await prisma.proyectoEquipo.createMany({
        data: equiposACrear.map((d) => ({
          proyectoId,
          equipoId: d.equipoId,
          tipo: d.tipo,
          cantidad: d.cantidad,
          dias: d.dias,
          costoExterno: d.costoExterno,
          proveedorId: d.proveedorId,
        })),
      });
    }

    // Equipos que ya no están en la cotización. Los que no cargan nada capturado a
    // mano se borran (si no, quedarían de fantasmas en el rider y en la carga del
    // camión); los que sí, se marcan para que una persona decida.
    const sobrantes = existentes.filter((pe) => !deseadosMap.has(`${pe.tipo}:${pe.equipoId}`));
    if (sobrantes.length > 0) {
      const conTrabajo = await prisma.proyectoEquipo.findMany({
        where: {
          id: { in: sobrantes.map((pe) => pe.id) },
          OR: [
            { notas: { not: null } },
            { confirmado: true },
            { confirmDisponible: { not: null } },
            { proveedorId: { not: null } },
            { costoExterno: { not: null } },
            { riderAccesorios: { some: {} } },
            { posiciones: { some: {} } },
          ],
        },
        select: { id: true },
      });
      const idsConTrabajo = new Set(conTrabajo.map((x) => x.id));

      const idsABorrar = sobrantes.filter((pe) => !idsConTrabajo.has(pe.id)).map((pe) => pe.id);
      if (idsABorrar.length > 0) {
        await prisma.proyectoEquipo.deleteMany({ where: { id: { in: idsABorrar } } });
      }

      const idsARevisar = sobrantes
        .filter((pe) => idsConTrabajo.has(pe.id) && !pe.necesitaRevision)
        .map((pe) => pe.id);
      if (idsARevisar.length > 0) {
        await prisma.proyectoEquipo.updateMany({
          where: { id: { in: idsARevisar } },
          data: { necesitaRevision: true },
        });
      }
    }

    // ── 3. Operación técnica: auto-crear slots vacíos para roles nuevos ────────
    const slotsDeseados = new Map<string, SlotDeseado>();
    for (const l of cot.lineas.filter((x) => x.tipo === "OPERACION_TECNICA")) {
      const { fechaJornada, participacion } = datosOperacionDeLinea(l.descripcion);
      const key = `${l.rolTecnicoId ?? "sinrol"}:${fechaJornada ?? "sinfecha"}:${participacion}`;
      const prev = slotsDeseados.get(key);
      const cantidad = Math.max(1, Math.round(l.cantidad));
      const tarifa = l.precioUnitario > 0 ? l.precioUnitario : null;
      if (prev) {
        prev.cantidad += cantidad;
        if (prev.tarifa == null) prev.tarifa = tarifa;
      } else {
        slotsDeseados.set(key, {
          key,
          rolTecnicoId: l.rolTecnicoId ?? null,
          fechaJornada,
          participacion,
          nivel: l.nivel ?? null,
          jornada: l.jornada ?? null,
          responsabilidad: l.descripcion ?? null,
          tarifa,
          cantidad,
        });
      }
    }

    const personal = cot.proyecto.personal;
    const keyDeSlot = (p: (typeof personal)[number]) =>
      `${p.rolTecnicoId ?? "sinrol"}:${p.fechaJornada ?? "sinfecha"}:${p.participacion ?? "OPERACION"}`;

    const existentesPorSlot = new Map<string, typeof personal>();
    for (const p of personal) {
      if (p.esAdicional) continue; // los adicionales son manuales, fuera del diff
      const k = keyDeSlot(p);
      existentesPorSlot.set(k, [...(existentesPorSlot.get(k) ?? []), p]);
    }

    const slotsACrear: {
      proyectoId: string;
      rolTecnicoId: string | null;
      participacion: string;
      fechaJornada: string | null;
      nivel: string | null;
      jornada: string | null;
      responsabilidad: string | null;
      tarifaAcordada: number | null;
    }[] = [];
    for (const [key, d] of slotsDeseados) {
      const existentesN = existentesPorSlot.get(key)?.length ?? 0;
      const faltan = d.cantidad - existentesN;
      for (let i = 0; i < faltan; i++) {
        slotsACrear.push({
          proyectoId,
          rolTecnicoId: d.rolTecnicoId,
          participacion: d.participacion,
          fechaJornada: d.fechaJornada,
          nivel: d.nivel,
          jornada: d.jornada,
          responsabilidad: d.responsabilidad,
          tarifaAcordada: d.tarifa,
        });
      }
    }
    if (slotsACrear.length > 0) {
      await prisma.proyectoPersonal.createMany({ data: slotsACrear });
    }

    // Slots creados antes de que el sync copiara la tarifa: heredarla de su
    // línea cotizada. Solo rellena nulos — una tarifa negociada a mano manda.
    const porTarifa = new Map<number, string[]>();
    for (const p of personal) {
      if (p.esAdicional || p.tarifaAcordada != null) continue;
      const tarifa = slotsDeseados.get(keyDeSlot(p))?.tarifa;
      if (tarifa == null) continue;
      porTarifa.set(tarifa, [...(porTarifa.get(tarifa) ?? []), p.id]);
    }
    for (const [tarifa, ids] of porTarifa) {
      await prisma.proyectoPersonal.updateMany({
        where: { id: { in: ids } },
        data: { tarifaAcordada: tarifa },
      });
    }

    // Puestos que sobran: el rol salió de la cotización, o sigue ahí pero con
    // menos cantidad (3 operadores cotizados que bajan a 1 dejan 2 de más). El
    // diff es por conteo, no por presencia del rol, porque bajar la cantidad
    // dejaba puestos invisibles: ni se avisaba de ellos ni se podían distinguir.
    // A diferencia de los equipos, aquí nunca se borra: atrás de un puesto hay
    // una persona a la que ya se le prometió trabajo, y quién se queda lo decide
    // alguien, no el sync.
    const sinAsignar = (p: (typeof personal)[number]) =>
      !p.tecnicoId && !p.confirmado && p.movimientoId == null && !p.notas?.trim();

    const idsPersonalRevisar: string[] = [];
    const idsPersonalOk: string[] = [];
    for (const [key, filas] of existentesPorSlot) {
      const sobran = filas.length - (slotsDeseados.get(key)?.cantidad ?? 0);
      // Sobra primero el puesto que nadie ocupa: si de tres operadores cotizados
      // quedan dos, se señala el hueco vacío antes que a un técnico ya llamado.
      const orden = [...filas].sort(
        (a, b) => Number(!sinAsignar(a)) - Number(!sinAsignar(b)) || a.id.localeCompare(b.id),
      );
      orden.forEach((p, i) => {
        if (i >= sobran) {
          if (p.necesitaRevision) idsPersonalOk.push(p.id);
        } else if (!p.necesitaRevision) {
          idsPersonalRevisar.push(p.id);
        }
      });
    }

    if (idsPersonalRevisar.length > 0) {
      await prisma.proyectoPersonal.updateMany({
        where: { id: { in: idsPersonalRevisar } },
        data: { necesitaRevision: true },
      });
    }
    // Puestos que volvieron a la cotización → quitar la bandera de revisión.
    if (idsPersonalOk.length > 0) {
      await prisma.proyectoPersonal.updateMany({
        where: { id: { in: idsPersonalOk } },
        data: { necesitaRevision: false },
      });
    }

    // Sembrar notas de equipo desde la cotización hacia los ProyectoEquipo que
    // aún no tienen (incluye los recién creados). No sobrescribe notas manuales.
    await sembrarNotasEquiposProyecto(proyectoId);

    return { sincronizado: true };
  } catch (err) {
    console.error("[sync-cotizacion-proyecto]", err);
    return { sincronizado: false, motivo: err instanceof Error ? err.message : String(err) };
  }
}
