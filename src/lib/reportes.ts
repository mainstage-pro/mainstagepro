import { prisma } from "@/lib/prisma";

export interface ReporteData {
  periodo: { inicio: string; fin: string; semana: number; año: number };
  score: {
    total: number;
    ventas: { pts: number; max: number };
    finanzas: { pts: number; max: number };
    produccion: { pts: number; max: number };
    marketing: { pts: number; max: number };
    rrhh: { pts: number; max: number };
    socios: { pts: number; max: number };
  };
  alertas: string[];
  highlights: string[];
  ventas: ReporteVentas;
  finanzas: ReporteFinanzas;
  produccion: ReporteProduccion;
  marketing: ReporteMarketing;
  rrhh: ReporteRRHH;
  socios: ReporteSocios;
}

interface ReporteVentas {
  tratosNuevos: number;
  pipelineActivo: number;
  valorPipeline: number;
  cotizacionesEnviadas: number;
  cotizacionesAprobadas: number;
  tasaConversion: number;
  tratosCerrados: number;
  tratosPerdidos: number;
  seguimientosVencidos: number;
  valorCotizacionesAprobadas: number;
}

interface ReporteFinanzas {
  ingresosSemana: number;
  gastosSemana: number;
  flujoNeto: number;
  ingresosMes: number;
  gastosMes: number;
  cxcTotal: number;
  cxcVencidas: number;
  cxpTotal: number;
  cxpVence7dias: number;
  disponibleBancos: number;
  hervamEstado: string | null;
  hervamMontoAcordado: number;
  hervamMontoPagado: number;
}

interface ReporteProduccion {
  proyectosActivos: number;
  proyectosCompletadosSemana: number;
  eventosSemana: number;
  eventosProximos7: number;
  proyectosSinPersonal: number;
  equiposMantenimiento: number;
  ordenesPendientes: number;
}

interface ReporteMarketing {
  publicacionesMes: number;
  publicadasMes: number;
  pctCumplimiento: number;
  publicacionesSemana: number;
  publicadasSemana: number;
  pendientes: number;
}

interface ReporteRRHH {
  nominaPendiente: number;
  incidenciasAbiertas: number;
  evaluacionesPendientes: number;
  asistenciasSemana: number;
}

interface ReporteSocios {
  sociosActivos: number;
  sociosEnRevision: number;
  facturadoMes: number;
  aSociosMes: number;
  aMainstageMes: number;
  reportesPendientes: number;
  contratosVencen30: number;
}

export async function generarReporteData(
  fechaInicio: Date,
  fechaFin: Date
): Promise<ReporteData> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const en7dias   = new Date(ahora.getTime() + 7 * 86400000);
  const en30dias  = new Date(ahora.getTime() + 30 * 86400000);
  const mes       = ahora.getMonth() + 1;
  const anio      = ahora.getFullYear();

  const [
    // Ventas
    tratosPorEtapa,
    tratosNuevos,
    cotizacionesSemana,
    cotizacionesAprobadasSemana,
    valorCotizAprob,
    seguimientosVencidos,
    pipelinePresupuesto,
    // Finanzas
    movimientosSemana,
    movimientosMes,
    cxcPendiente,
    cxcVencidas,
    cxpPendiente,
    cxpVence7dias,
    cuentasBancarias,
    hervamPago,
    // Producción
    proyectosPorEstado,
    proyectosCompletadosSemana,
    eventosSemana,
    eventosProximos7,
    proyectosSinPersonal,
    equiposMantenimiento,
    ordenesPendientes,
    // Marketing
    pubsMes,
    pubsSemana,
    // RRHH
    nominaPendiente,
    incidenciasAbiertas,
    evaluacionesPendientes,
    asistenciasSemana,
    // Socios
    sociosPorStatus,
    sociosReporteMes,
    sociosReportesPendientes,
    sociosContratosVencen,
  ] = await Promise.all([
    // ── VENTAS ───────────────────────────────────────────────────────────────
    prisma.trato.groupBy({ by: ["etapa"], _count: { _all: true } }),
    prisma.trato.count({ where: { createdAt: { gte: fechaInicio, lte: fechaFin } } }),
    prisma.cotizacion.count({ where: { createdAt: { gte: fechaInicio, lte: fechaFin } } }),
    prisma.cotizacion.count({ where: { createdAt: { gte: fechaInicio, lte: fechaFin }, estado: "APROBADA" } }),
    prisma.cotizacion.aggregate({
      _sum: { granTotal: true },
      where: { updatedAt: { gte: fechaInicio, lte: fechaFin }, estado: "APROBADA" },
    }),
    prisma.trato.count({
      where: { etapa: { in: ["DESCUBRIMIENTO","OPORTUNIDAD"] }, fechaProximaAccion: { lt: ahora } },
    }),
    prisma.trato.aggregate({
      _sum: { presupuestoEstimado: true },
      where: { etapa: { in: ["DESCUBRIMIENTO","OPORTUNIDAD"] } },
    }),

    // ── FINANZAS ─────────────────────────────────────────────────────────────
    prisma.movimientoFinanciero.groupBy({
      by: ["tipo"], _sum: { monto: true },
      where: { fecha: { gte: fechaInicio, lte: fechaFin } },
    }),
    prisma.movimientoFinanciero.groupBy({
      by: ["tipo"], _sum: { monto: true },
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }),
    prisma.cuentaCobrar.aggregate({ _sum: { monto: true }, where: { estado: { in: ["PENDIENTE","PARCIAL"] } } }),
    prisma.cuentaCobrar.count({ where: { estado: { in: ["PENDIENTE","PARCIAL"] }, fechaCompromiso: { lt: ahora } } }),
    prisma.cuentaPagar.aggregate({ _sum: { monto: true }, where: { estado: { in: ["PENDIENTE","PARCIAL"] } } }),
    prisma.cuentaPagar.count({ where: { estado: { in: ["PENDIENTE","PARCIAL"] }, fechaCompromiso: { gte: ahora, lte: en7dias } } }),
    prisma.cuentaBancaria.findMany({
      where: { activa: true },
      select: {
        movimientosEntrada: { select: { monto: true } },
        movimientosSalida:  { select: { monto: true } },
      },
    }),
    prisma.hervamPago.findFirst({ where: { mes, anio } }),

    // ── PRODUCCIÓN ───────────────────────────────────────────────────────────
    prisma.proyecto.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.proyecto.count({
      where: { estado: "COMPLETADO", updatedAt: { gte: fechaInicio, lte: fechaFin } },
    }),
    prisma.proyecto.count({
      where: { estado: { in: ["PLANEACION","CONFIRMADO","EN_CURSO"] }, fechaEvento: { gte: fechaInicio, lte: fechaFin } },
    }),
    prisma.proyecto.count({
      where: { estado: { in: ["PLANEACION","CONFIRMADO","EN_CURSO"] }, fechaEvento: { gte: ahora, lte: en7dias } },
    }),
    prisma.proyecto.count({
      where: { estado: { in: ["PLANEACION","CONFIRMADO"] }, personal: { none: { confirmado: true } }, fechaEvento: { lte: en30dias, gte: ahora } },
    }),
    prisma.equipo.count({ where: { estado: "EN_MANTENIMIENTO" } }),
    prisma.ordenCompra.count({ where: { estado: "PENDIENTE" } }).catch(() => 0),

    // ── MARKETING ────────────────────────────────────────────────────────────
    prisma.publicacion.groupBy({
      by: ["estado"], _count: { _all: true },
      where: { fecha: { gte: inicioMes, lte: finMes } },
    }),
    prisma.publicacion.groupBy({
      by: ["estado"], _count: { _all: true },
      where: { fecha: { gte: fechaInicio, lte: fechaFin } },
    }),

    // ── RRHH ─────────────────────────────────────────────────────────────────
    prisma.pagoNomina.aggregate({ _sum: { monto: true }, where: { estado: "PENDIENTE" } }),
    prisma.incidencia.count({ where: { aplicada: false } }).catch(() => 0),
    prisma.evaluacionEmpleado.count({ where: { fecha: { gte: inicioMes, lte: finMes } } }).catch(() => 0),
    prisma.asistencia.count({ where: { fecha: { gte: fechaInicio, lte: fechaFin } } }).catch(() => 0),

    // ── SOCIOS ───────────────────────────────────────────────────────────────
    prisma.socio.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.socioReporte.aggregate({
      _sum: { totalFacturado: true, totalSocio: true, totalMainstage: true },
      where: { mes, anio },
    }),
    prisma.socioReporte.count({ where: { estado: { not: "PAGADO" } } }),
    prisma.socio.count({ where: { contratoFin: { gte: ahora, lte: en30dias } } }),
  ]);

  // ── Cálculos Ventas ───────────────────────────────────────────────────────
  const etapasMap: Record<string, number> = {};
  tratosPorEtapa.forEach(t => { etapasMap[t.etapa] = t._count._all; });
  const pipelineActivo    = (etapasMap.DESCUBRIMIENTO ?? 0) + (etapasMap.OPORTUNIDAD ?? 0);
  const tratosCerrados    = etapasMap.VENTA_CERRADA ?? 0;
  const tratosPerdidos    = etapasMap.VENTA_PERDIDA ?? 0;
  const tasaConversion    = (tratosCerrados + tratosPerdidos) > 0
    ? Math.round((tratosCerrados / (tratosCerrados + tratosPerdidos)) * 100) : 0;

  // ── Cálculos Finanzas ─────────────────────────────────────────────────────
  const ingresosSemana = movimientosSemana.find(m => m.tipo === "INGRESO")?._sum.monto ?? 0;
  const gastosSemana   = movimientosSemana.find(m => m.tipo === "GASTO")?._sum.monto   ?? 0;
  const ingresosMes    = movimientosMes.find(m => m.tipo === "INGRESO")?._sum.monto    ?? 0;
  const gastosMes      = movimientosMes.find(m => m.tipo === "GASTO")?._sum.monto      ?? 0;
  const disponible     = cuentasBancarias.reduce((s: number, c) =>
    s + c.movimientosEntrada.reduce((a: number, m: { monto: number }) => a + m.monto, 0)
      - c.movimientosSalida.reduce((a: number, m: { monto: number }) => a + m.monto, 0), 0);

  // ── Cálculos Producción ───────────────────────────────────────────────────
  const estadosMap: Record<string, number> = {};
  proyectosPorEstado.forEach(p => { estadosMap[p.estado] = p._count._all; });
  const proyectosActivos = (estadosMap.PLANEACION ?? 0) + (estadosMap.CONFIRMADO ?? 0) + (estadosMap.EN_CURSO ?? 0);

  // ── Cálculos Marketing ────────────────────────────────────────────────────
  const pubsMapMes: Record<string, number> = {};
  pubsMes.forEach(p => { pubsMapMes[p.estado] = p._count._all; });
  const totalPubsMes   = Object.values(pubsMapMes).reduce((s, v) => s + v, 0);
  const publicadasMes  = pubsMapMes.PUBLICADO ?? 0;
  const pubsMapSem: Record<string, number> = {};
  pubsSemana.forEach(p => { pubsMapSem[p.estado] = p._count._all; });
  const totalPubsSem   = Object.values(pubsMapSem).reduce((s, v) => s + v, 0);
  const publicadasSem  = pubsMapSem.PUBLICADO ?? 0;
  const pctCumplimiento = totalPubsMes > 0 ? Math.round((publicadasMes / totalPubsMes) * 100) : 0;
  const pubsPendientes  = (pubsMapMes.PENDIENTE ?? 0) + (pubsMapMes.EN_PROCESO ?? 0);

  // ── Cálculos Socios ───────────────────────────────────────────────────────
  const statusMap: Record<string, number> = {};
  sociosPorStatus.forEach(s => { statusMap[s.status] = s._count._all; });

  // ══════════════════════════════════════════════════════════════════════════
  // SCORE ENGINE (100 pts total)
  // ══════════════════════════════════════════════════════════════════════════

  // VENTAS (20 pts)
  let ptsVentas = 0;
  if (pipelineActivo >= 3)   ptsVentas += 5;
  if (tasaConversion >= 50)  ptsVentas += 8;
  else if (tasaConversion >= 30) ptsVentas += 4;
  if (seguimientosVencidos === 0) ptsVentas += 4;
  else if (seguimientosVencidos <= 2) ptsVentas += 2;
  if (cotizacionesAprobadasSemana > 0) ptsVentas += 3;

  // FINANZAS (25 pts)
  let ptsFinanzas = 0;
  const flujoNeto = ingresosMes - gastosMes;
  if (flujoNeto > 0)         ptsFinanzas += 10;
  else if (flujoNeto > -50000) ptsFinanzas += 4;
  if (cxcVencidas === 0)     ptsFinanzas += 8;
  else if (cxcVencidas <= 2) ptsFinanzas += 4;
  const hervamOk = hervamPago?.estado === "PAGADO" || hervamPago?.estado === "PARCIAL";
  if (hervamOk)              ptsFinanzas += 7;
  else if (!hervamPago)      ptsFinanzas += 4; // sin registro = sin penalización total

  // PRODUCCIÓN (20 pts)
  let ptsProduccion = 0;
  if (proyectosActivos > 0)           ptsProduccion += 5;
  if (proyectosSinPersonal === 0)     ptsProduccion += 8;
  else if (proyectosSinPersonal <= 1) ptsProduccion += 4;
  if (equiposMantenimiento === 0)     ptsProduccion += 4;
  else if (equiposMantenimiento <= 2) ptsProduccion += 2;
  if (ordenesPendientes === 0)        ptsProduccion += 3;
  else ptsProduccion += 1;

  // MARKETING (15 pts)
  let ptsMarketing = 0;
  if (pctCumplimiento >= 80)      ptsMarketing += 15;
  else if (pctCumplimiento >= 60) ptsMarketing += 10;
  else if (pctCumplimiento >= 40) ptsMarketing += 6;
  else if (totalPubsMes === 0)    ptsMarketing += 8; // sin plan = sin penalización

  // RRHH (10 pts)
  let ptsRRHH = 0;
  const nomPend = nominaPendiente._sum.monto ?? 0;
  if (nomPend === 0)                ptsRRHH += 5;
  else if (nomPend < 20000)         ptsRRHH += 3;
  if (incidenciasAbiertas === 0)    ptsRRHH += 5;
  else if (incidenciasAbiertas <= 2) ptsRRHH += 2;

  // SOCIOS (10 pts)
  let ptsSocios = 0;
  if ((statusMap.ACTIVO ?? 0) > 0) ptsSocios += 4;
  if (sociosReportesPendientes === 0) ptsSocios += 6;
  else if (sociosReportesPendientes <= 2) ptsSocios += 3;

  const scoreTotal = ptsVentas + ptsFinanzas + ptsProduccion + ptsMarketing + ptsRRHH + ptsSocios;

  // ── Alertas ───────────────────────────────────────────────────────────────
  const alertas: string[] = [];
  if (cxcVencidas > 0) alertas.push(`${cxcVencidas} cobranza${cxcVencidas > 1 ? "s" : ""} vencida${cxcVencidas > 1 ? "s" : ""}`);
  if (proyectosSinPersonal > 0) alertas.push(`${proyectosSinPersonal} proyecto${proyectosSinPersonal > 1 ? "s" : ""} próximo${proyectosSinPersonal > 1 ? "s" : ""} sin personal confirmado`);
  if (seguimientosVencidos > 0) alertas.push(`${seguimientosVencidos} trato${seguimientosVencidos > 1 ? "s" : ""} con seguimiento vencido`);
  if (hervamPago?.estado === "PENDIENTE") alertas.push("Pago HERVAM del mes pendiente");
  if (nomPend > 0) alertas.push(`Nómina pendiente de pago: $${nomPend.toLocaleString("es-MX")}`);
  if (equiposMantenimiento > 2) alertas.push(`${equiposMantenimiento} equipos en mantenimiento`);
  if (sociosReportesPendientes > 0) alertas.push(`${sociosReportesPendientes} reporte${sociosReportesPendientes > 1 ? "s" : ""} de socios sin pagar`);
  if (flujoNeto < 0) alertas.push(`Flujo neto negativo este mes: -$${Math.abs(flujoNeto).toLocaleString("es-MX")}`);

  // ── Highlights ────────────────────────────────────────────────────────────
  const highlights: string[] = [];
  if (tasaConversion >= 50) highlights.push(`Tasa de conversión excelente: ${tasaConversion}%`);
  if (flujoNeto > 0) highlights.push(`Flujo neto positivo del mes: $${flujoNeto.toLocaleString("es-MX")}`);
  if (cotizacionesAprobadasSemana > 0) highlights.push(`${cotizacionesAprobadasSemana} cotización${cotizacionesAprobadasSemana > 1 ? "es" : ""} aprobada${cotizacionesAprobadasSemana > 1 ? "s" : ""} esta semana`);
  if (pctCumplimiento >= 80 && totalPubsMes > 0) highlights.push(`Marketing al ${pctCumplimiento}% de cumplimiento`);
  if (proyectosCompletadosSemana > 0) highlights.push(`${proyectosCompletadosSemana} proyecto${proyectosCompletadosSemana > 1 ? "s" : ""} completado${proyectosCompletadosSemana > 1 ? "s" : ""} esta semana`);
  if (proyectosSinPersonal === 0 && proyectosActivos > 0) highlights.push("Todos los proyectos próximos con personal confirmado");
  if (cxcVencidas === 0 && (cxcPendiente._sum.monto ?? 0) > 0) highlights.push("Sin cobranzas vencidas");

  // ── Número de semana del año ───────────────────────────────────────────────
  const startOfYear = new Date(fechaInicio.getFullYear(), 0, 1);
  const semana = Math.ceil(((fechaInicio.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  return {
    periodo: {
      inicio: fechaInicio.toISOString().slice(0, 10),
      fin:    fechaFin.toISOString().slice(0, 10),
      semana,
      año:    fechaInicio.getFullYear(),
    },
    score: {
      total:     scoreTotal,
      ventas:    { pts: ptsVentas,    max: 20 },
      finanzas:  { pts: ptsFinanzas,  max: 25 },
      produccion:{ pts: ptsProduccion,max: 20 },
      marketing: { pts: ptsMarketing, max: 15 },
      rrhh:      { pts: ptsRRHH,      max: 10 },
      socios:    { pts: ptsSocios,    max: 10 },
    },
    alertas,
    highlights,
    ventas: {
      tratosNuevos,
      pipelineActivo,
      valorPipeline:              pipelinePresupuesto._sum.presupuestoEstimado ?? 0,
      cotizacionesEnviadas:       cotizacionesSemana,
      cotizacionesAprobadas:      cotizacionesAprobadasSemana,
      tasaConversion,
      tratosCerrados,
      tratosPerdidos,
      seguimientosVencidos,
      valorCotizacionesAprobadas: valorCotizAprob._sum.granTotal ?? 0,
    },
    finanzas: {
      ingresosSemana,
      gastosSemana,
      flujoNeto:          ingresosSemana - gastosSemana,
      ingresosMes,
      gastosMes,
      cxcTotal:           cxcPendiente._sum.monto ?? 0,
      cxcVencidas,
      cxpTotal:           cxpPendiente._sum.monto ?? 0,
      cxpVence7dias,
      disponibleBancos:   disponible,
      hervamEstado:       hervamPago?.estado ?? null,
      hervamMontoAcordado:hervamPago?.montoAcordado ?? 0,
      hervamMontoPagado:  hervamPago?.montoPagado ?? 0,
    },
    produccion: {
      proyectosActivos,
      proyectosCompletadosSemana,
      eventosSemana,
      eventosProximos7,
      proyectosSinPersonal,
      equiposMantenimiento,
      ordenesPendientes,
    },
    marketing: {
      publicacionesMes:   totalPubsMes,
      publicadasMes,
      pctCumplimiento,
      publicacionesSemana:totalPubsSem,
      publicadasSemana:   publicadasSem,
      pendientes:         pubsPendientes,
    },
    rrhh: {
      nominaPendiente:       nomPend,
      incidenciasAbiertas,
      evaluacionesPendientes,
      asistenciasSemana,
    },
    socios: {
      sociosActivos:         statusMap.ACTIVO ?? 0,
      sociosEnRevision:      statusMap.EN_REVISION ?? 0,
      facturadoMes:          sociosReporteMes._sum.totalFacturado ?? 0,
      aSociosMes:            sociosReporteMes._sum.totalSocio ?? 0,
      aMainstageMes:         sociosReporteMes._sum.totalMainstage ?? 0,
      reportesPendientes:    sociosReportesPendientes,
      contratosVencen30:     sociosContratosVencen,
    },
  };
}

// Calcula el lunes de la semana actual
export function getLunesDeSemana(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Formatea un número como moneda MXN (sin importar el import de formatCurrency)
export function fmtMXN(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Genera el mensaje de WhatsApp con el resumen del reporte
export function generarMensajeWhatsApp(data: ReporteData): string {
  const score = data.score.total;
  const emoji = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";

  const alertasTexto = data.alertas.length > 0
    ? data.alertas.map(a => `• ⚠️ ${a}`).join("\n")
    : "• Sin alertas críticas ✅";

  const highlightsTexto = data.highlights.length > 0
    ? data.highlights.map(h => `• ✅ ${h}`).join("\n")
    : "• Sin highlights esta semana";

  return [
    `📊 *Reporte Semanal — Mainstage Pro*`,
    `Semana ${data.periodo.semana} · ${data.periodo.inicio} al ${data.periodo.fin}`,
    ``,
    `${emoji} *Score del negocio: ${score}/100*`,
    `Ventas ${data.score.ventas.pts}/${data.score.ventas.max} · Finanzas ${data.score.finanzas.pts}/${data.score.finanzas.max} · Producción ${data.score.produccion.pts}/${data.score.produccion.max} · Mkt ${data.score.marketing.pts}/${data.score.marketing.max} · RRHH ${data.score.rrhh.pts}/${data.score.rrhh.max} · Socios ${data.score.socios.pts}/${data.score.socios.max}`,
    ``,
    `💡 *Highlights:*`,
    highlightsTexto,
    ``,
    `⚠️ *Alertas:*`,
    alertasTexto,
    ``,
    `📈 *Ventas:* ${data.ventas.pipelineActivo} tratos activos · ${data.ventas.tasaConversion}% conversión`,
    `💰 *Finanzas:* Flujo neto ${fmtMXN(data.finanzas.ingresosMes - data.finanzas.gastosMes)} · CxC ${fmtMXN(data.finanzas.cxcTotal)}`,
    `🎪 *Producción:* ${data.produccion.proyectosActivos} proyectos activos · ${data.produccion.eventosSemana} eventos esta semana`,
    ``,
    `Ver reporte completo en Mainstage Pro 👉 https://mainstagepro.vercel.app/reportes`,
  ].join("\n");
}
