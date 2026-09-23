import { prisma } from "@/lib/prisma";
import { AREA_ORDEN, AREA_LABELS, AREA_HEX } from "@/lib/areas";

// Tablero de dirección: una sola lectura del negocio — dinero, decisiones
// pendientes, pulso del equipo y los eventos que vienen.

export type Semaforo = {
  bancos: number;
  cxcVencido: number;
  cxcVencidoCount: number;
  vendidoMes: number;
  vendidoMesCount: number;
  ingresosMes: number;
  egresosMes: number;
  flujoMes: number;
};

export type Pendiente = {
  id: string;
  label: string;
  detalle: string;
  href: string;
  nivel: "rojo" | "ambar";
};

export type PulsoArea = {
  area: string;
  label: string;
  color: string;
  activas: number;
  vencidas: number;
  completadasMes: number;
  cumplimiento: number;
};

export type EventoProximo = {
  id: string;
  nombre: string;
  cliente: string;
  fecha: Date;
  href: string;
  alerta: string | null;
};

export type Tablero = {
  semaforo: Semaforo;
  pendientes: Pendiente[];
  pulso: PulsoArea[];
  eventos: EventoProximo[];
  mes: string;
};

// Las tareas derivadas de trato/evento/proyecto solo cuentan como trabajo real
// cuando alguien ya les puso fecha y responsable (mismo criterio que la gestión
// operativa; ver api/dashboard/tareas-areas).
const SOLO_AGENDADAS = {
  NOT: {
    AND: [
      { OR: [{ tratoId: { not: null } }, { proyectoEventoId: { not: null } }, { proyectoInternoId: { not: null } }] },
      { OR: [{ fecha: null }, { asignadoAId: null }] },
    ],
  },
};

export async function getTablero(): Promise<Tablero> {
  const ahora = new Date();
  const hoy = new Date(ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const en14dias = new Date(hoy.getTime() + 14 * 86400000);
  const hace5dias = new Date(ahora.getTime() - 5 * 86400000);

  const [
    entradas,
    salidas,
    cxcVencidaAgg,
    cotizacionesMes,
    movimientosMes,
    eventosSinPersonal,
    cotizacionesSinRespuesta,
    tratosSinSeguimiento,
    nominaPendiente,
    tareasVencidas,
    proyectosProximos,
  ] = await Promise.all([
    prisma.movimientoFinanciero.aggregate({ _sum: { monto: true }, where: { cuentaDestino: { activa: true } } }),
    prisma.movimientoFinanciero.aggregate({ _sum: { monto: true }, where: { cuentaOrigen: { activa: true } } }),
    prisma.cuentaCobrar.aggregate({
      _sum: { monto: true, montoCobrado: true },
      _count: { _all: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: hoy } },
    }),
    prisma.cotizacion.aggregate({
      _sum: { granTotal: true },
      _count: { _all: true },
      where: { estado: "APROBADA", updatedAt: { gte: inicioMes, lte: finMes } },
    }),
    prisma.movimientoFinanciero.groupBy({
      by: ["tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }),
    prisma.proyecto.count({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        fechaEvento: { gte: hoy, lte: en14dias },
        personal: { none: { confirmado: true } },
      },
    }),
    prisma.cotizacion.count({ where: { estado: "ENVIADA", updatedAt: { lt: hace5dias } } }),
    prisma.trato.count({
      where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] }, fechaProximaAccion: { lt: hoy } },
    }),
    prisma.pagoNomina.aggregate({ _sum: { monto: true }, _count: { _all: true }, where: { estado: "PENDIENTE" } }),
    prisma.tarea.count({
      where: {
        ...SOLO_AGENDADAS,
        parentId: null,
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
        OR: [{ fecha: { lt: hoy } }, { fecha: null, fechaVencimiento: { lt: hoy } }],
      },
    }),
    prisma.proyecto.findMany({
      where: { estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] }, fechaEvento: { gte: hoy, lte: en14dias } },
      select: {
        id: true,
        nombre: true,
        fechaEvento: true,
        cliente: { select: { nombre: true } },
        personal: { where: { confirmado: true }, select: { id: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 8,
    }),
  ]);

  const pulso = await Promise.all(
    AREA_ORDEN.map(async (area) => {
      const pertenece = { OR: [{ area }, { area: "GENERAL", asignadoA: { area } }] };
      const activo = { parentId: null, estado: { notIn: ["COMPLETADA", "CANCELADA"] } };

      const [activas, vencidas, completadasMes] = await Promise.all([
        prisma.tarea.count({ where: { AND: [pertenece, SOLO_AGENDADAS, activo] } }),
        prisma.tarea.count({
          where: {
            AND: [
              pertenece,
              SOLO_AGENDADAS,
              activo,
              { OR: [{ fecha: { lt: hoy } }, { fecha: null, fechaVencimiento: { lt: hoy } }] },
            ],
          },
        }),
        prisma.tarea.count({
          where: {
            AND: [pertenece, SOLO_AGENDADAS, { parentId: null, estado: "COMPLETADA", updatedAt: { gte: inicioMes } }],
          },
        }),
      ]);

      const total = activas + completadasMes;
      return {
        area,
        label: AREA_LABELS[area] ?? area,
        color: AREA_HEX[area] ?? AREA_HEX.GENERAL,
        activas,
        vencidas,
        completadasMes,
        cumplimiento: total > 0 ? Math.round((completadasMes / total) * 100) : 0,
      };
    })
  );

  const bancos = (entradas._sum.monto ?? 0) - (salidas._sum.monto ?? 0);
  const cxcVencido = (cxcVencidaAgg._sum.monto ?? 0) - (cxcVencidaAgg._sum.montoCobrado ?? 0);
  const ingresosMes = movimientosMes.find((m) => m.tipo === "INGRESO")?._sum.monto ?? 0;
  const egresosMes = movimientosMes.find((m) => m.tipo === "GASTO")?._sum.monto ?? 0;

  const pendientes: Pendiente[] = [
    cxcVencido > 0 && {
      id: "cxc",
      label: "Cobros vencidos",
      detalle: `${cxcVencidaAgg._count._all} cuenta${cxcVencidaAgg._count._all === 1 ? "" : "s"} · ${moneda(cxcVencido)}`,
      href: "/finanzas/cobros-pagos",
      nivel: "rojo" as const,
    },
    eventosSinPersonal > 0 && {
      id: "personal",
      label: "Eventos sin personal confirmado",
      detalle: `${eventosSinPersonal} en los próximos 14 días`,
      href: "/proyectos",
      nivel: "rojo" as const,
    },
    tareasVencidas > 0 && {
      id: "tareas",
      label: "Tareas vencidas del equipo",
      detalle: `${tareasVencidas} sin cerrar`,
      href: "/gestion",
      nivel: "rojo" as const,
    },
    cotizacionesSinRespuesta > 0 && {
      id: "cotizaciones",
      label: "Cotizaciones sin respuesta",
      detalle: `${cotizacionesSinRespuesta} enviadas hace más de 5 días`,
      href: "/cotizaciones",
      nivel: "ambar" as const,
    },
    tratosSinSeguimiento > 0 && {
      id: "tratos",
      label: "Ventas sin siguiente paso",
      detalle: `${tratosSinSeguimiento} con la próxima acción vencida`,
      href: "/crm/tratos",
      nivel: "ambar" as const,
    },
    (nominaPendiente._sum.monto ?? 0) > 0 && {
      id: "nomina",
      label: "Nómina por pagar",
      detalle: `${nominaPendiente._count._all} pago${nominaPendiente._count._all === 1 ? "" : "s"} · ${moneda(nominaPendiente._sum.monto ?? 0)}`,
      href: "/personal/nomina",
      nivel: "ambar" as const,
    },
  ].filter(Boolean) as Pendiente[];

  const eventos: EventoProximo[] = proyectosProximos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cliente: p.cliente?.nombre ?? "Sin cliente",
    fecha: p.fechaEvento!,
    href: `/proyectos/${p.id}`,
    alerta: p.personal.length === 0 ? "Sin personal" : null,
  }));

  return {
    semaforo: {
      bancos,
      cxcVencido,
      cxcVencidoCount: cxcVencidaAgg._count._all,
      vendidoMes: cotizacionesMes._sum.granTotal ?? 0,
      vendidoMesCount: cotizacionesMes._count._all,
      ingresosMes,
      egresosMes,
      flujoMes: ingresosMes - egresosMes,
    },
    pendientes,
    pulso,
    eventos,
    mes: ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
  };
}

function moneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
