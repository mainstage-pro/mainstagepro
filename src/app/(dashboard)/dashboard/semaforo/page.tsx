import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return `${Math.round(n)}%`;
}

type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

function calcSemaforo(valor: number, verde: number, amarillo: number, invert = false): Semaforo {
  if (!invert) {
    if (valor >= verde) return "VERDE";
    if (valor >= amarillo) return "AMARILLO";
    return "ROJO";
  } else {
    // invert: menos es mejor (ej. vencidos)
    if (valor <= verde) return "VERDE";
    if (valor <= amarillo) return "AMARILLO";
    return "ROJO";
  }
}

const SEMAFORO_COLOR: Record<Semaforo, string> = {
  VERDE:   "bg-green-500",
  AMARILLO: "bg-yellow-400",
  ROJO:    "bg-red-500",
};
const SEMAFORO_TEXT: Record<Semaforo, string> = {
  VERDE:   "text-green-400",
  AMARILLO: "text-yellow-400",
  ROJO:    "text-red-400",
};
const SEMAFORO_BORDER: Record<Semaforo, string> = {
  VERDE:   "border-green-900/50",
  AMARILLO: "border-yellow-900/50",
  ROJO:    "border-red-900/50",
};
const SEMAFORO_LABEL: Record<Semaforo, string> = {
  VERDE:   "Bien",
  AMARILLO: "Atención",
  ROJO:    "Alerta",
};

function IndicadorCard({
  titulo, semaforo, valor, meta, detalle, href,
}: {
  titulo: string;
  semaforo: Semaforo;
  valor: string;
  meta?: string;
  detalle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`block bg-[#111] border rounded-2xl p-5 hover:bg-[#141414] transition-all ${SEMAFORO_BORDER[semaforo]}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-[#555]">{titulo}</p>
        <span className={`shrink-0 w-3 h-3 rounded-full mt-0.5 ${SEMAFORO_COLOR[semaforo]}`} />
      </div>
      <p className={`text-2xl font-bold mb-0.5 ${SEMAFORO_TEXT[semaforo]}`}>{valor}</p>
      {meta && <p className="text-[11px] text-[#555] mb-2">Meta: {meta}</p>}
      <p className="text-xs text-[#666] leading-relaxed">{detalle}</p>
      <div className={`mt-3 text-[10px] font-bold uppercase tracking-wider ${SEMAFORO_TEXT[semaforo]}`}>
        {SEMAFORO_LABEL[semaforo]}
      </div>
    </Link>
  );
}

export default async function SemaforoPage() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "DIRECCION")) {
    redirect("/dashboard");
  }

  const ahora        = new Date();
  const inicioDeHoy  = new Date(ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const inicioMes    = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes       = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
  const en30dias     = new Date(ahora.getTime() + 30 * 86400000);
  const mesPub       = ahora.toISOString().slice(0, 7);

  // ── Leer meta ventas de AppConfig ────────────────────────────────────────
  const configMeta = await prisma.appConfig.findFirst({ where: { key: "meta_ventas_mensual" } }).catch(() => null);
  const META_VENTAS = configMeta ? parseFloat(configMeta.value) : 150000;

  const [
    // 1. Ventas
    cotizacionesAprobadas,
    // 2. Producción
    proyectosProximos,
    // 3. CxC
    cxcPendiente,
    cxcVencidas,
    // 4. Flujo de caja
    movimientosMes,
    // 5. Marketing
    pubsMes,
    // 6. Equipo
    tareasVencidas,
    // 7. CxP
    cxpVencidas,
    // 8. Tratos enfriados (+21d)
    tratosEnfriados,
  ] = await Promise.all([

    // 1. Cotizaciones aprobadas este mes (suma de granTotal)
    prisma.cotizacion.aggregate({
      _sum: { granTotal: true },
      where: {
        estado: "APROBADA",
        updatedAt: { gte: inicioMes, lte: finMes },
      },
    }),

    // 2. Proyectos en los próximos 30 días por estado de asignación de personal
    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: inicioDeHoy, lte: en30dias },
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
      },
      select: {
        id: true, nombre: true, numeroProyecto: true,
        fechaEvento: true, estado: true,
        personal: { select: { id: true } },
        equipos: { select: { id: true } },
      },
    }),

    // 3. CxC pendiente total
    prisma.cuentaCobrar.aggregate({
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    }),

    // 3b. CxC vencidas
    prisma.cuentaCobrar.aggregate({
      _sum: { monto: true },
      _count: { _all: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: inicioDeHoy } },
    }),

    // 4. Movimientos del mes
    prisma.movimientoFinanciero.groupBy({
      by: ["tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }),

    // 5. Publicaciones del mes
    prisma.publicacion.groupBy({
      by: ["estado"],
      _count: { _all: true },
      where: {
        fecha: {
          gte: new Date(`${mesPub}-01`),
          lt: new Date(new Date(`${mesPub}-01`).setMonth(new Date(`${mesPub}-01`).getMonth() + 1)),
        },
      },
    }),

    // 6. Tareas vencidas (no completadas, fecha < hoy)
    prisma.tarea.count({
      where: {
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
        parentId: null,
        fecha: { lt: inicioDeHoy },
      },
    }),

    // 7. CxP vencidas
    prisma.cuentaPagar.aggregate({
      _count: { _all: true },
      _sum: { monto: true },
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: inicioDeHoy } },
    }),

    // 8. Tratos +21 días en pipeline activo
    prisma.trato.count({
      where: {
        etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
        createdAt: { lte: new Date(ahora.getTime() - 21 * 86400000) },
      },
    }),
  ]);

  // ── Calcular indicadores ─────────────────────────────────────────────────

  // 1. Ventas
  const ventasMes = cotizacionesAprobadas._sum.granTotal ?? 0;
  const ventasPct = META_VENTAS > 0 ? (ventasMes / META_VENTAS) * 100 : 0;
  const semaforoVentas = calcSemaforo(ventasPct, 70, 40);

  // 2. Producción — proyectos sin personal asignado
  const proySinPersonal = proyectosProximos.filter(p => p.personal.length === 0);
  const proyConPersonal = proyectosProximos.filter(p => p.personal.length > 0);
  const semaforoProduccion = calcSemaforo(proySinPersonal.length, 0, 2, true);

  // 3. CxC
  const cxcTotal = cxcPendiente._sum.monto ?? 0;
  const cxcVencidaMonto = cxcVencidas._sum.monto ?? 0;
  const cxcVencidaCount = cxcVencidas._count._all ?? 0;
  const cxcVencidaPct = cxcTotal > 0 ? (cxcVencidaMonto / cxcTotal) * 100 : 0;
  const semaforoCxC = cxcVencidaCount === 0 ? "VERDE" : calcSemaforo(cxcVencidaPct, 999, 20, true);

  // 4. Flujo de caja
  const ingresos = movimientosMes.find(m => m.tipo === "INGRESO")?._sum.monto ?? 0;
  const egresos  = movimientosMes.find(m => m.tipo === "GASTO")?._sum.monto ?? 0;
  const flujoNeto = ingresos - egresos;
  const semaforoFlujo: Semaforo = flujoNeto >= 0 ? "VERDE" : flujoNeto >= -20000 ? "AMARILLO" : "ROJO";

  // 5. Marketing
  const pubsMap: Record<string, number> = {};
  for (const g of pubsMes) pubsMap[g.estado] = g._count._all;
  const pubsPublicadas = pubsMap["PUBLICADO"] ?? 0;
  const pubsTotal = Object.values(pubsMap).reduce((a, b) => a + b, 0) - (pubsMap["CANCELADO"] ?? 0);
  const pubsPct = pubsTotal > 0 ? (pubsPublicadas / pubsTotal) * 100 : 100;
  const semaforoMarketing: Semaforo = pubsTotal === 0 ? "AMARILLO" : calcSemaforo(pubsPct, 70, 40);

  // 6. Equipo
  const semaforoEquipo = calcSemaforo(tareasVencidas, 0, 5, true);

  // 7. CxP
  const cxpVencidaCount = cxpVencidas._count._all ?? 0;
  const cxpVencidaMonto = cxpVencidas._sum.monto ?? 0;
  const semaforoCxP = calcSemaforo(cxpVencidaCount, 0, 2, true);

  // 8. Tratos enfriados en pipeline
  const semaforoTratos: Semaforo = tratosEnfriados === 0 ? "VERDE" : tratosEnfriados <= 2 ? "AMARILLO" : "ROJO";

  // ── Score global ─────────────────────────────────────────────────────────
  const puntos: Record<Semaforo, number> = { VERDE: 3, AMARILLO: 2, ROJO: 0 };
  const todos = [semaforoVentas, semaforoProduccion, semaforoCxC, semaforoFlujo, semaforoMarketing, semaforoEquipo, semaforoCxP, semaforoTratos];
  const scoreTotal = todos.reduce((s, c) => s + puntos[c], 0);
  const scoreMax = todos.length * 3;
  const scorePct = Math.round((scoreTotal / scoreMax) * 100);
  const scoreLabel = scorePct >= 80 ? "Operación saludable" : scorePct >= 50 ? "Requiere atención" : "Estado crítico";
  const scoreSemaforo: Semaforo = scorePct >= 80 ? "VERDE" : scorePct >= 50 ? "AMARILLO" : "ROJO";

  const rojos = todos.filter(s => s === "ROJO").length;
  const amarillos = todos.filter(s => s === "AMARILLO").length;
  const verdes = todos.filter(s => s === "VERDE").length;

  const hora = ahora.toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" });
  const fecha = ahora.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Dashboard · Semáforo</p>
          <h1 className="text-white text-2xl font-bold">Salud del Negocio</h1>
          <p className="text-[#555] text-sm mt-1 capitalize">{fecha} · {hora}</p>
        </div>
        <Link
          href="/dashboard/direccion"
          className="shrink-0 text-[#555] hover:text-white text-xs mt-1 transition-colors"
        >
          ← Dirección
        </Link>
      </div>

      {/* Score global */}
      <div className={`bg-[#111] border ${SEMAFORO_BORDER[scoreSemaforo]} rounded-2xl p-6`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl ${SEMAFORO_COLOR[scoreSemaforo]} flex items-center justify-center shrink-0`}>
            <span className="text-black text-2xl font-bold">{scorePct}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xl font-bold ${SEMAFORO_TEXT[scoreSemaforo]}`}>{scoreLabel}</p>
            <p className="text-[#666] text-sm mt-0.5">Score: {scoreTotal}/{scoreMax} puntos</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500" />{verdes} bien
              </span>
              <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />{amarillos} atención
              </span>
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />{rojos} alerta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <IndicadorCard
          titulo="Ventas del mes"
          semaforo={semaforoVentas}
          valor={fmt(ventasMes)}
          meta={`${fmt(META_VENTAS)} (${fmtPct(ventasPct)} alcanzado)`}
          detalle={`Cotizaciones aprobadas en ${ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}.`}
          href="/crm/tratos"
        />

        <IndicadorCard
          titulo="Producción"
          semaforo={semaforoProduccion}
          valor={proySinPersonal.length === 0 ? "Todos asignados" : `${proySinPersonal.length} sin personal`}
          meta={`${proyectosProximos.length} eventos en los próximos 30 días`}
          detalle={
            proySinPersonal.length > 0
              ? `Sin asignar: ${proySinPersonal.map(p => p.numeroProyecto).join(", ")}.`
              : proyectosProximos.length === 0
                ? "Sin eventos próximos programados."
                : `${proyConPersonal.length} proyecto(s) con personal asignado.`
          }
          href="/proyectos"
        />

        <IndicadorCard
          titulo="Cartera (CxC)"
          semaforo={semaforoCxC}
          valor={cxcVencidaCount === 0 ? "Sin vencidos" : `${cxcVencidaCount} vencidos`}
          meta={`Total por cobrar: ${fmt(cxcTotal)}`}
          detalle={
            cxcVencidaCount === 0
              ? "Todas las cuentas al corriente."
              : `${fmt(cxcVencidaMonto)} vencidos (${fmtPct(cxcVencidaPct)} de cartera).`
          }
          href="/finanzas/cxc"
        />

        <IndicadorCard
          titulo="Flujo de Caja"
          semaforo={semaforoFlujo}
          valor={fmt(flujoNeto)}
          meta={`Ingresos: ${fmt(ingresos)} · Egresos: ${fmt(egresos)}`}
          detalle={
            flujoNeto >= 0
              ? "Flujo positivo este mes."
              : "Egresos superan ingresos registrados."
          }
          href="/finanzas/movimientos"
        />

        <IndicadorCard
          titulo="Marketing"
          semaforo={semaforoMarketing}
          valor={pubsTotal === 0 ? "Sin publicaciones" : `${pubsPublicadas}/${pubsTotal} publicadas`}
          meta={pubsTotal > 0 ? fmtPct(pubsPct) + " ejecutado" : undefined}
          detalle={
            pubsTotal === 0
              ? "No hay publicaciones programadas este mes."
              : `${pubsMap["PENDIENTE"] ?? 0} pendientes · ${pubsMap["EN_PROCESO"] ?? 0} en proceso · ${pubsMap["LISTO"] ?? 0} listas.`
          }
          href="/marketing/calendario"
        />

        <IndicadorCard
          titulo="Equipo (Tareas)"
          semaforo={semaforoEquipo}
          valor={tareasVencidas === 0 ? "Al corriente" : `${tareasVencidas} vencidas`}
          detalle={
            tareasVencidas === 0
              ? "Sin tareas con fecha vencida en todo el equipo."
              : `${tareasVencidas} tarea(s) con fecha pasada sin completar.`
          }
          href="/operaciones/equipo"
        />

        <IndicadorCard
          titulo="Pagos (CxP)"
          semaforo={semaforoCxP}
          valor={cxpVencidaCount === 0 ? "Al corriente" : `${cxpVencidaCount} vencidos`}
          meta={cxpVencidaCount > 0 ? fmt(cxpVencidaMonto) + " por pagar" : undefined}
          detalle={
            cxpVencidaCount === 0
              ? "Sin pagos vencidos pendientes."
              : `${fmt(cxpVencidaMonto)} en pagos vencidos.`
          }
          href="/finanzas/cxp"
        />

        <IndicadorCard
          titulo="Pipeline (tratos +21d)"
          semaforo={semaforoTratos}
          valor={tratosEnfriados === 0 ? "Pipeline activo" : `${tratosEnfriados} enfriados`}
          detalle={
            tratosEnfriados === 0
              ? "Todos los tratos tienen menos de 21 días en pipeline."
              : `${tratosEnfriados} trato(s) con más de 21 días sin cerrarse.`
          }
          href="/crm/tratos"
        />

      </div>

      {/* Notas de umbral */}
      <div className="ms-card-deep p-4 text-[11px] text-[#444] leading-relaxed space-y-1">
        <p className="text-[#555] font-semibold mb-2 uppercase tracking-wider text-[10px]">Umbrales de referencia</p>
        <p>Ventas: Verde ≥70% de meta · Amarillo 40-69% · Rojo &lt;40%</p>
        <p>Producción: Verde = 0 sin personal · Amarillo = 1-2 · Rojo = 3+</p>
        <p>CxC: Verde = 0 vencidos · Amarillo = monto vencido &lt;20% · Rojo = &gt;20%</p>
        <p>Flujo: Verde = positivo · Amarillo = hasta -$20k · Rojo = &lt;-$20k</p>
        <p>Marketing: Verde ≥70% publicadas · Amarillo 40-69% · Rojo &lt;40%</p>
        <p>Equipo: Verde = 0 vencidas · Amarillo = 1-5 · Rojo = &gt;5</p>
        <p>CxP: Verde = 0 vencidos · Amarillo = 1-2 · Rojo = &gt;2</p>
        <p>Pipeline: Verde = 0 tratos +21d · Amarillo = 1-2 · Rojo = &gt;2</p>
        <p className="pt-1 text-[#333]">Meta de ventas configurable en <Link href="/admin/configuracion" className="text-[#555] hover:text-[#B3985B]">Configuración</Link> con clave <code>meta_ventas_mensual</code>.</p>
      </div>

    </div>
  );
}
