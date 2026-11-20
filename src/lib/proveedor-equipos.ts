import type { Prisma } from "@prisma/client";
import { ventanasIniciales } from "@/lib/proveedor-evento";
import { asegurarCxPDeProveedorEvento } from "@/lib/pagos-proveedor";

// ── El equipo de tercero se captura una sola vez ─────────────────────────────
// Quién trae cada equipo y a cómo se captura en el rider del proyecto, que es
// donde vive el equipo. De ahí se deriva el renglón del proveedor —su
// cronología, su cuenta por pagar— sin que nadie vuelva a teclear el mismo dato
// en la pestaña de operación.

/** Lo que cuesta un equipo rentado: su costo por día y unidad, por las dos cosas. */
const totalDe = (e: { costoExterno: number | null; cantidad: number; dias: number }) =>
  (e.costoExterno ?? 0) * e.cantidad * Math.max(1, e.dias);

const nombreEquipo = (e: { descripcion: string; marca: string | null; modelo: string | null }) =>
  [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion;

/**
 * Pone al día el renglón de un proveedor con los equipos que el proyecto le
 * asignó. Se llama después de tocar un equipo externo, con el proveedor nuevo y
 * con el anterior si cambió.
 *
 * El costo acordado se deriva de los equipos mientras haya alguno con precio: el
 * rider manda. Un proveedor sin equipos conserva su captura manual, porque ahí
 * el renglón cubre un servicio que no es renta de piezas (planta, montacarga).
 */
export async function sincronizarProveedorDeEquipos(
  tx: Prisma.TransactionClient,
  proyectoId: string,
  proveedorId: string | null,
): Promise<void> {
  if (!proveedorId) return;

  const equipos = await tx.proyectoEquipo.findMany({
    where: { proyectoId, proveedorId, tipo: "EXTERNO" },
    select: {
      equipoId: true,
      cantidad: true,
      dias: true,
      costoExterno: true,
      equipo: { select: { descripcion: true, marca: true, modelo: true } },
    },
  });

  const bloque = await tx.proveedorEvento.findFirst({
    where: { proyectoId, proveedorId, imprevisto: false },
    select: {
      id: true,
      servicioEquipo: true,
      costoAcordado: true,
      cuentaPagarId: true,
      _count: { select: { items: true, lineas: true } },
    },
  });

  // El proveedor se quedó sin equipos: si no arrastra nada más, su renglón se va
  // con ellos. Lo que ya tiene cuenta por pagar o conceptos propios se respeta.
  if (equipos.length === 0) {
    if (!bloque) return;
    if (bloque.cuentaPagarId || bloque._count.items > 0 || bloque._count.lineas > 0) return;
    await tx.proyectoBloqueTiempo.deleteMany({ where: { proveedorEventoId: bloque.id } });
    await tx.proveedorEvento.delete({ where: { id: bloque.id } });
    return;
  }

  const total = equipos.reduce((s, e) => s + totalDe(e), 0);
  const detalle = equipos.map((e) => `${e.cantidad}× ${nombreEquipo(e.equipo)}`).join(", ");

  let bloqueId = bloque?.id;

  if (!bloqueId) {
    const proveedor = await tx.proveedor.findUnique({
      where: { id: proveedorId },
      select: { nombre: true, empresa: true, telefono: true },
    });
    if (!proveedor) return;
    const proyecto = await tx.proyecto.findUnique({
      where: { id: proyectoId },
      select: { fechaMontaje: true, fechaEvento: true, fechaDesmontaje: true },
    });
    const nombreProveedor = proveedor.empresa || proveedor.nombre;

    // Antes de abrir renglón, buscar la deuda que el proyecto ya tenía con este
    // proveedor por el mismo monto: es este mismo equipo, capturado cuando cada
    // alta generaba su cuenta suelta. Se adopta en lugar de duplicarla.
    const huerfanas =
      total > 0
        ? await tx.cuentaPagar.findMany({
            where: {
              proyectoId,
              proveedorId,
              esNomina: false,
              esDeuda: false,
              esReparto: false,
              proveedorEvento: { is: null },
            },
            select: { id: true, monto: true },
          })
        : [];
    const adoptable = huerfanas.filter((c) => Math.abs(c.monto - total) < 1);
    const cuentaPagarId = adoptable.length === 1 ? adoptable[0].id : null;

    const creado = await tx.proveedorEvento.create({
      data: {
        proyectoId,
        tipoAcreedor: "PROVEEDOR",
        proveedorId,
        nombreProveedor,
        telefonoProveedor: proveedor.telefono,
        servicioEquipo: detalle.slice(0, 180),
        costoAcordado: total > 0 ? total : null,
        cuentaPagarId,
      },
      select: { id: true },
    });
    bloqueId = creado.id;

    await tx.proyectoBloqueTiempo.createMany({
      data: ventanasIniciales({
        proyectoId,
        proveedorEventoId: bloqueId,
        nombreProveedor,
        responsable: null,
        fechaMontaje: proyecto?.fechaMontaje ?? null,
        fechaEvento: proyecto?.fechaEvento ?? null,
        fechaDesmontaje: proyecto?.fechaDesmontaje ?? null,
      }),
    });
  } else {
    await tx.proveedorEvento.update({
      where: { id: bloqueId },
      data: {
        // Sin precios capturados todavía, el monto que ya estuviera acordado se queda.
        ...(total > 0 ? { costoAcordado: total } : {}),
        // El texto que alguien escribió a mano describe mejor el trato que la lista.
        ...(bloque?.servicioEquipo?.trim() ? {} : { servicioEquipo: detalle.slice(0, 180) }),
      },
    });
  }

  // Las líneas de la cotización siguen a su equipo: así el resto del sistema ve
  // el concepto como resuelto y la cuenta por pagar se describe sola.
  const proyecto = await tx.proyecto.findUnique({
    where: { id: proyectoId },
    select: { cotizacionId: true },
  });
  if (proyecto?.cotizacionId) {
    const equipoIds = equipos.map((e) => e.equipoId);
    await tx.cotizacionLinea.updateMany({
      where: {
        cotizacionId: proyecto.cotizacionId,
        tipo: "EQUIPO_EXTERNO",
        equipoId: { in: equipoIds },
      },
      data: { proveedorEventoId: bloqueId },
    });
  }

  // La deuda ya formalizada se mantiene al día; crearla sigue siendo una decisión
  // de finanzas, no un efecto de editar el rider.
  if (bloque?.cuentaPagarId) await asegurarCxPDeProveedorEvento(tx, bloqueId);
}

/**
 * Sincroniza varios proveedores de un jalón. Útil cuando un equipo cambia de
 * dueño: el que lo deja y el que lo toma se recalculan juntos.
 */
export async function sincronizarProveedoresDeEquipos(
  tx: Prisma.TransactionClient,
  proyectoId: string,
  proveedorIds: (string | null | undefined)[],
): Promise<void> {
  const unicos = [...new Set(proveedorIds.filter((p): p is string => !!p))];
  for (const proveedorId of unicos) {
    await sincronizarProveedorDeEquipos(tx, proyectoId, proveedorId);
  }
}

// ── Conceptos de la cotización que cubre un proveedor ────────────────────────
// Equipo propio que de último momento hay que subarrendar, equipo de tercero o un
// servicio: se elige de lo que ya está cotizado en lugar de volver a escribirlo.

/** Tipos de línea que un proveedor puede cubrir. El descuento no es algo que se renta. */
export const TIPOS_LINEA_ASIGNABLES = [
  "EQUIPO_PROPIO",
  "EQUIPO_EXTERNO",
  "PAQUETE",
  "OPERACION_TECNICA",
  "TRANSPORTE",
  "HOSPEDAJE",
  "COMIDA",
  "DJ",
  "OTRO",
] as const;

/**
 * Deja ligadas al renglón del proveedor exactamente las líneas indicadas de la
 * cotización del proyecto. Una línea que ya cubría otro proveedor pasa a este;
 * las que este tenía y ya no vienen en la lista quedan libres. Ids ajenos a la
 * cotización del proyecto se ignoran.
 */
export async function asignarLineasAProveedorEvento(
  tx: Prisma.TransactionClient,
  proyectoId: string,
  proveedorEventoId: string,
  lineaIds: string[],
): Promise<void> {
  const proyecto = await tx.proyecto.findUnique({
    where: { id: proyectoId },
    select: { cotizacionId: true },
  });
  if (!proyecto?.cotizacionId) return;

  const ids = [...new Set(lineaIds.filter((x) => typeof x === "string" && x))];

  await tx.cotizacionLinea.updateMany({
    where: { proveedorEventoId, id: { notIn: ids } },
    data: { proveedorEventoId: null },
  });
  if (ids.length) {
    await tx.cotizacionLinea.updateMany({
      where: {
        id: { in: ids },
        cotizacionId: proyecto.cotizacionId,
        tipo: { in: [...TIPOS_LINEA_ASIGNABLES] },
      },
      data: { proveedorEventoId },
    });
  }
}
