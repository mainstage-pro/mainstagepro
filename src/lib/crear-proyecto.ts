import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Migración lazy: hasta hoy un trato tenía a lo más un proyecto (índice único en
// proyectos.tratoId). Ahora un trato puede generar varios proyectos (uno por
// cotización aprobada), así que soltamos ese índice único en la primera corrida.
// Idempotente y seguro de correr múltiples veces.
let _indiceTratoSoltado = false;
export async function ensureTratoIndiceSoltado() {
  if (_indiceTratoSoltado) return;
  try {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "proyectos_tratoId_key"`);
  } catch { /* ya soltado o no existe */ }
  _indiceTratoSoltado = true;
}

function proximoLunesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (8 - dow) % 7);
  return d;
}

function proximoMiercolesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

// Checklist operativo base para producción técnica / dirección técnica
const CHECKLIST_BASE = [
  "Confirmar personal asignado",
  "Confirmar equipos propios",
  "Confirmar equipos externos / proveedores",
  "Confirmar transporte",
  "Confirmar alimentación / catering",
  "Confirmar hospedaje (si aplica)",
  "Confirmar horarios del evento y montaje",
  "Confirmar documentos técnicos (rider, input list, plot)",
  "Confirmar contactos clave del cliente y del lugar",
  "Solicitar a administración presupuesto operativo (gasolinas, emergencia y gastos necesarios)",
  "Solicitar y coordinar catering de producción de acuerdo al número de personal",
  "Cierre financiero preliminar confirmado",
];

// Checklist operativo base para renta de equipo
const CHECKLIST_RENTA = [
  "Confirmar lista de equipos a entregar",
  "Verificar inventario y estado del equipo antes de salida",
  "Preparar y revisar hoja de entrega (firmas y cantidades)",
  "Confirmar dirección y horario de entrega",
  "Confirmar fecha y horario de devolución/recolección",
  "Confirmar si el cliente tiene técnico propio (y su contacto)",
  "Confirmar anticipo y condiciones de pago",
  "Confirmar contacto del cliente para el día de entrega",
  "Empacar y etiquetar equipo por bulto",
  "Registrar fotos del equipo al momento de entrega",
  "Obtener firma de responsiva al entregar",
  "Verificar regreso del equipo en buen estado",
  "Cierre financiero confirmado",
];

/**
 * Genera el siguiente número de proyecto (PRY-YYYY-NNN) leyendo el máximo actual.
 * Dentro de una transacción, ve los proyectos creados por llamadas previas.
 */
async function siguienteNumeroProyecto(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const last = await tx.proyecto.findFirst({
    where: { numeroProyecto: { startsWith: `PRY-${year}-` } },
    orderBy: { numeroProyecto: "desc" },
    select: { numeroProyecto: true },
  });
  const nextNum = last ? parseInt(last.numeroProyecto.split("-")[2]) + 1 : 1;
  return `PRY-${year}-${String(nextNum).padStart(3, "0")}`;
}

/**
 * Crea un proyecto completo a partir de una cotización dentro de una transacción:
 * proyecto, equipos, CxP de externos, checklist, CxC y bitácora.
 *
 * NO modifica el estado de la cotización ni la etapa del trato — eso lo maneja
 * el endpoint que la invoca, para poder reutilizarla en aprobación individual y
 * en cierre de venta multi-cotización.
 *
 * Es idempotente por cotización: si ya existe un proyecto para esa cotización,
 * lo devuelve sin crear otro.
 */
export async function crearProyectoDesdeCotizacion(
  tx: Prisma.TransactionClient,
  cotizacionId: string,
  usuario: { id: string; name?: string | null },
): Promise<{ id: string; numeroProyecto: string; yaExistia: boolean }> {
  const cot = await tx.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: { trato: true, cliente: true, lineas: true, proyecto: { select: { id: true, numeroProyecto: true } } },
  });

  if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`);
  if (cot.proyecto) {
    return { id: cot.proyecto.id, numeroProyecto: cot.proyecto.numeroProyecto, yaExistia: true };
  }

  const numeroProyecto = await siguienteNumeroProyecto(tx);

  // Coordinador de producción por defecto: Rodrigo Vera (fallback: quien creó la cotización)
  const esRentaProy = (cot.tipoServicio || cot.trato?.tipoServicio) === "RENTA";
  let coordinadorId = cot.creadaPorId;
  if (!esRentaProy) {
    const rodrigo = await tx.user.findFirst({
      where: { name: { contains: "Rodrigo Vera", mode: "insensitive" }, active: true },
      select: { id: true },
    });
    if (rodrigo) coordinadorId = rodrigo.id;
  }

  const hoy = new Date();
  const fechaEvento = cot.fechaEvento ?? new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

  const lineasEquipo = cot.lineas.filter(
    (l) => ["EQUIPO_PROPIO", "EQUIPO_EXTERNO"].includes(l.tipo) && l.equipoId,
  );

  // 1. Crear el proyecto
  const proy = await tx.proyecto.create({
    data: {
      numeroProyecto,
      tratoId: cot.tratoId ?? undefined,
      cotizacionId: cot.id,
      clienteId: cot.clienteId,
      encargadoId: coordinadorId,
      nombre: cot.nombreEvento || `Proyecto ${cot.numeroCotizacion}`,
      estado: "PLANEACION",
      zona: cot.zonaEvento ?? "LOCAL",
      tipoEvento: cot.tipoEvento || cot.trato?.tipoEvento || "OTRO",
      tipoServicio: cot.tipoServicio || cot.trato?.tipoServicio,
      recoleccionStatus: (cot.tipoServicio || cot.trato?.tipoServicio) === "RENTA" ? "PENDIENTE" : "NO_APLICA",
      fechaEvento,
      lugarEvento: cot.lugarEvento,
      descripcionGeneral: cot.observaciones,
      horaInicioEvento: cot.trato?.horaInicioEvento ?? null,
      horaFinEvento: cot.trato?.horaFinEvento ?? null,
      horaInicioMontaje: cot.trato?.ventanaMontajeInicio ?? null,
      duracionMontajeHrs: cot.trato?.duracionMontajeHrs ?? null,
      encargadoLugar: cot.trato?.contactoVenueNombre ?? null,
      encargadoLugarContacto: cot.trato?.contactoVenueTelefono ?? null,
      detallesEspecificos: (() => {
        const partes: string[] = [];
        if (cot.trato?.notas) partes.push(cot.trato.notas);
        const tipoSrv = cot.tipoServicio || cot.trato?.tipoServicio;
        if (tipoSrv !== "RENTA") {
          try {
            const cats = cot.trato?.serviciosInteres ? JSON.parse(cot.trato.serviciosInteres) : [];
            if (cats.length > 0) partes.push(`Categorías: ${cats.join(", ")}`);
          } catch { /* ignore */ }
          if (cot.trato?.ideasReferencias) partes.push(`Referencias: ${cot.trato.ideasReferencias}`);
          if (cot.trato?.ventanaMontajeFin) partes.push(`Límite montaje: ${cot.trato.ventanaMontajeFin}`);
          if (cot.trato?.horaTerminoMontaje) partes.push(`Salida desmontaje: ${cot.trato.horaTerminoMontaje}`);
          try {
            const s = cot.trato?.scoutingData ? JSON.parse(cot.trato.scoutingData) : {};
            const venue: string[] = [];
            if (s.nombreVenue) venue.push(`Venue: ${s.nombreVenue}`);
            if (s.direccion) venue.push(`Dir: ${s.direccion}`);
            if (s.largo && s.ancho) venue.push(`Dimensiones: ${s.largo}m × ${s.ancho}m${s.alturaMaxima ? ` × ${s.alturaMaxima}m alt` : ""}`);
            if (s.voltajeDisponible || s.amperajeTotalDisponible) venue.push(`Eléctrico: ${[s.fases, s.voltajeDisponible && `${s.voltajeDisponible}V`, s.amperajeTotalDisponible && `${s.amperajeTotalDisponible}A`].filter(Boolean).join(", ")}`);
            if (s.restriccionDecibeles) venue.push(`Límite dB: ${s.restriccionDecibeles}`);
            if (s.restriccionHorarioAcceso) venue.push(`Horario acceso: ${s.restriccionHorarioAcceso}`);
            if (s.restriccionInstalacion) venue.push(`Restricciones: ${s.restriccionInstalacion}`);
            if (s.accesoVehicular) venue.push(`Acceso vehicular: ${s.accesoVehicular}`);
            if (s.notasScouting) venue.push(`Notas venue: ${s.notasScouting}`);
            if (venue.length > 0) partes.push(venue.join(" | "));
          } catch { /* ignore */ }
        }
        return partes.length > 0 ? partes.join("\n") : null;
      })(),
      logisticaRenta: (() => {
        if ((cot.tipoServicio || cot.trato?.tipoServicio) !== "RENTA") return null;
        try {
          const s = cot.trato?.scoutingData ? JSON.parse(cot.trato.scoutingData) : {};
          if (!s.rentaPiso && !s.rentaHorarioEntrega && !s.rentaHorarioRecoleccion) return null;
          return JSON.stringify({
            piso: s.rentaPiso || null,
            hayElevador: s.rentaHayElevador || null,
            horarioEntrega: s.rentaHorarioEntrega || null,
            horarioRecoleccion: s.rentaHorarioRecoleccion || null,
            zonaCarga: s.rentaZonaCarga || null,
            accesoVehicular: s.rentaAccesoVehicular || null,
            notas: s.rentaNotasEntrega || null,
          });
        } catch { return null; }
      })(),
    },
  });

  // 2. Copiar equipos al proyecto (incluyendo proveedorId para externos)
  if (lineasEquipo.length > 0) {
    await tx.proyectoEquipo.createMany({
      data: lineasEquipo.map((l) => ({
        proyectoId: proy.id,
        equipoId: l.equipoId!,
        tipo: l.tipo === "EQUIPO_EXTERNO" ? "EXTERNO" : "PROPIO",
        cantidad: Math.round(l.cantidad),
        dias: l.dias,
        costoExterno: l.tipo === "EQUIPO_EXTERNO" ? l.costoUnitario : null,
        proveedorId: l.tipo === "EQUIPO_EXTERNO" ? (l.proveedorId ?? null) : null,
      })),
    });
  }

  // 2b. Crear CxP para cada equipo externo con costo
  const lineasExternas = lineasEquipo.filter(
    (l) => l.tipo === "EQUIPO_EXTERNO" && (l.costoUnitario ?? 0) > 0,
  );
  if (lineasExternas.length > 0) {
    const fechaCxP = proximoMiercolesTraEvento(fechaEvento);
    await tx.cuentaPagar.createMany({
      data: lineasExternas.map((l) => ({
        tipoAcreedor: l.proveedorId ? "PROVEEDOR" : "OTRO",
        proveedorId: l.proveedorId ?? null,
        proyectoId: proy.id,
        concepto: `${l.descripcion} (x${Math.round(l.cantidad)} × ${l.dias}d)${!l.proveedorId ? " — ⚠ Asignar proveedor" : ""}`,
        monto: l.costoUnitario * Math.round(l.cantidad) * l.dias,
        fechaCompromiso: fechaCxP,
        estado: "PENDIENTE",
        notas: !l.proveedorId ? "Proveedor no asignado en la cotización. Asignar manualmente en CxP." : null,
      })),
    });
  }

  // 4. Crear checklist base según tipo de servicio
  const tipoServicio = cot.tipoServicio || cot.trato?.tipoServicio;
  const checklistItems = tipoServicio === "RENTA" ? CHECKLIST_RENTA : CHECKLIST_BASE;
  await tx.proyectoChecklist.createMany({
    data: checklistItems.map((item, i) => ({
      proyectoId: proy.id,
      item,
      orden: i,
      completado: false,
    })),
  });

  // 4b. Para renta: copiar logística del trato al proyecto
  if (tipoServicio === "RENTA" && cot.trato?.ideasReferencias) {
    try {
      const rentaData = JSON.parse(cot.trato.ideasReferencias);
      if (rentaData && typeof rentaData === "object" && rentaData.nivelServicio) {
        await tx.proyecto.update({
          where: { id: proy.id },
          data: { logisticaRenta: cot.trato.ideasReferencias },
        });
      }
    } catch { /* ideasReferencias es texto plano, no JSON */ }
  }

  // 5. Crear una única CxC por el total del evento
  await tx.cuentaCobrar.create({
    data: {
      clienteId: cot.clienteId,
      proyectoId: proy.id,
      cotizacionId: cot.id,
      concepto: `Total — ${proy.nombre}`,
      tipoPago: "TOTAL",
      monto: cot.granTotal,
      fechaCompromiso: proximoLunesTraEvento(fechaEvento),
      estado: "PENDIENTE",
    },
  });

  // 7. Entrada en bitácora
  await tx.proyectoBitacora.create({
    data: {
      proyectoId: proy.id,
      usuarioId: usuario.id,
      tipo: "ACCION",
      contenido: `Proyecto creado automáticamente desde cotización ${cot.numeroCotizacion} por ${usuario.name ?? "sistema"}.`,
    },
  });

  return { id: proy.id, numeroProyecto: proy.numeroProyecto, yaExistia: false };
}
