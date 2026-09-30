import { prisma } from "@/lib/prisma";
import { diasEntre, inicioDeMes, num, sumarDias, ventana } from "./base";

const ABIERTAS = ["PROSPECCION", "DESCUBRIMIENTO", "OPORTUNIDAD", "EN_NEGOCIACION"];
const COTIZACION_VIVA = ["ENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO", "REENVIADA"];

export async function resumenVentas() {
  const { hoy, finDeHoy } = ventana();
  const mesActual = inicioDeMes(hoy);
  const hace90 = sumarDias(hoy, -90);

  const [abiertos, sinAccion, cotizacionesVivas, cerradasRecientes, perdidas90, aprobadasSinProyecto, etapas] =
    await Promise.all([
      prisma.trato.findMany({
        where: { etapa: { in: ABIERTAS } },
        select: {
          id: true,
          nombreEvento: true,
          etapa: true,
          presupuestoEstimado: true,
          fechaEventoEstimada: true,
          fechaProximaAccion: true,
          proximaAccion: true,
          cliente: { select: { nombre: true, empresa: true } },
        },
      }),
      prisma.trato.count({ where: { etapa: { in: ABIERTAS }, fechaProximaAccion: null } }),
      // El corte de "15 días" se hace en la consulta: traer todas las vivas para
      // luego descartarlas en memoria arriesga perder las que sí urgen.
      prisma.cotizacion.findMany({
        where: {
          estado: { in: COTIZACION_VIVA },
          fechaVencimiento: { not: null, lte: sumarDias(hoy, 15) },
        },
        select: {
          id: true,
          numeroCotizacion: true,
          estado: true,
          granTotal: true,
          fechaVencimiento: true,
          fechaEvento: true,
          cliente: { select: { nombre: true, empresa: true } },
        },
        orderBy: { fechaVencimiento: "asc" },
      }),
      prisma.trato.findMany({
        where: { etapa: "VENTA_CERRADA", fechaCierre: { gte: hace90, lte: finDeHoy } },
        select: {
          id: true,
          nombreEvento: true,
          montoFinal: true,
          presupuestoEstimado: true,
          fechaCierre: true,
          fechaEventoEstimada: true,
          origenLead: true,
          cliente: { select: { nombre: true, empresa: true } },
        },
        orderBy: { fechaCierre: "desc" },
      }),
      prisma.trato.findMany({
        where: { etapa: "VENTA_PERDIDA", fechaCierre: { gte: hace90 } },
        select: { id: true, montoFinal: true, presupuestoEstimado: true, motivoPerdida: true },
      }),
      prisma.cotizacion.findMany({
        where: { estado: "APROBADA", proyecto: { is: null } },
        select: {
          id: true,
          numeroCotizacion: true,
          granTotal: true,
          fechaEvento: true,
          aprobacionFecha: true,
          cliente: { select: { nombre: true, empresa: true } },
        },
        orderBy: { fechaEvento: "asc" },
      }),
      prisma.trato.groupBy({ by: ["etapa"], where: { etapa: { in: ABIERTAS } }, _count: { _all: true } }),
    ]);

  const dia = (f: Date) => new Date(f.toISOString().slice(0, 10));
  const nombre = (c: { nombre: string; empresa: string | null } | null) => c?.empresa || c?.nombre || "—";

  const pipeline = abiertos.reduce((s, t) => s + num(t.presupuestoEstimado), 0);

  // Acción vencida = el compromiso que el vendedor se puso a sí mismo y no cumplió.
  const accionVencida = abiertos
    .filter(t => t.fechaProximaAccion && dia(t.fechaProximaAccion) < hoy)
    .map(t => ({
      id: t.id,
      titulo: t.nombreEvento ?? "Trato",
      cliente: nombre(t.cliente),
      accion: t.proximaAccion || "Sin definir",
      dias: diasEntre(dia(t.fechaProximaAccion!), hoy),
      monto: num(t.presupuestoEstimado),
    }))
    .sort((a, b) => b.dias - a.dias);

  const cotizPorVencer = cotizacionesVivas
    .map(c => ({
      id: c.id,
      numero: c.numeroCotizacion,
      cliente: nombre(c.cliente),
      estado: c.estado,
      monto: num(c.granTotal),
      dias: diasEntre(hoy, dia(c.fechaVencimiento!)), // negativo = ya venció
    }))
    .filter(c => c.dias <= 15)
    .sort((a, b) => a.dias - b.dias);

  const cerradasMes = cerradasRecientes.filter(t => t.fechaCierre && t.fechaCierre >= mesActual);
  const ganado90 = cerradasRecientes.reduce((s, t) => s + num(t.montoFinal || t.presupuestoEstimado), 0);
  const perdido90 = perdidas90.reduce((s, t) => s + num(t.montoFinal || t.presupuestoEstimado), 0);

  const sinProyecto = aprobadasSinProyecto.map(c => ({
    id: c.id,
    numero: c.numeroCotizacion,
    cliente: nombre(c.cliente),
    monto: num(c.granTotal),
    // Sin fecha de evento no se puede saber si urge; se trata como lejano.
    dias: c.fechaEvento ? diasEntre(hoy, dia(c.fechaEvento)) : 999,
  }));

  const conteoEtapa = (e: string) => num(etapas.find(x => x.etapa === e)?._count._all);

  return {
    pipeline,
    abiertos: abiertos.length,
    sinAccion,
    accionVencida,
    cotizPorVencer,
    cerradasMes: {
      n: cerradasMes.length,
      monto: cerradasMes.reduce((s, t) => s + num(t.montoFinal || t.presupuestoEstimado), 0),
    },
    cerradas90: cerradasRecientes.map(t => ({
      id: t.id,
      titulo: t.nombreEvento ?? "Trato",
      cliente: nombre(t.cliente),
      monto: num(t.montoFinal || t.presupuestoEstimado),
      dias: t.fechaCierre ? diasEntre(dia(t.fechaCierre), hoy) : 0,
    })),
    // Tasa sobre lo que ya se decidió; los tratos abiertos aún no son ni una cosa ni la otra.
    tasaGanadas:
      cerradasRecientes.length + perdidas90.length > 0
        ? Math.round((cerradasRecientes.length / (cerradasRecientes.length + perdidas90.length)) * 100)
        : 0,
    ganado90,
    perdido90,
    sinProyecto: sinProyecto.sort((a, b) => a.dias - b.dias),
    etapas: {
      prospeccion: conteoEtapa("PROSPECCION"),
      descubrimiento: conteoEtapa("DESCUBRIMIENTO"),
      oportunidad: conteoEtapa("OPORTUNIDAD"),
      enNegociacion: conteoEtapa("EN_NEGOCIACION"),
    },
  };
}
