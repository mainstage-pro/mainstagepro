import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Svg,
  Rect, Line, G, Path,
} from "@react-pdf/renderer";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const BLACK   = "#0a0a0a";
const DARK    = "#1a1a1a";
const GOLD    = "#B3985B";
const GOLD_LT = "#E8D5A3";
const WHITE   = "#FFFFFF";
const GRAY1   = "#111111";
const GRAY2   = "#333333";
const GRAY3   = "#555555";
const GRAY4   = "#888888";
const GRAY5   = "#cccccc";
const RED     = "#dc2626";
const GREEN   = "#16a34a";
const GREEN_LT= "#dcfce7";
const RED_LT  = "#fee2e2";
const AMBER   = "#d97706";
const AMBER_LT= "#fef3c7";
const BLUE    = "#2563eb";
const BLUE_LT = "#dbeafe";
const CREAM   = "#FAFAF8";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ERProyecto {
  id: string; nombre: string; cliente: string; empresa?: string | null;
  fechaEvento: string; tipoEvento: string;
  ingreso: number; ingresoSinIva: number; costoDirecto: number;
  cobrado: number; porCobrar: number;
  utilidadBruta: number; margenPct: number;
}

export interface ERGastoCategoria {
  nombre: string; monto: number;
  items: { id: string; concepto: string; monto: number; fecha: string; proveedor?: string | null }[];
}

export interface ERNominaItem {
  id: string; nombre: string; puesto?: string | null; area?: string | null; monto: number;
}

export interface ERCuotaDeuda {
  id: string; nombre: string; categoria: string; monto: number;
  numeroCuota: number; estado: string; fechaVencimiento: string;
}

export interface ERAnalisis {
  analisisFinanciero?: string | null;
  analisisOperativo?: string | null;
  analisisMercado?: string | null;
  queLogramos?: string | null;
  queNoLogramos?: string | null;
  queCambiariamos?: string | null;
  decisionesUrgentes?: string | null;
  proyeccionSiguiente?: string | null;
  propuesta1?: string | null; propuesta2?: string | null; propuesta3?: string | null;
  propuesta4?: string | null; propuesta5?: string | null;
  comentariosFinales?: string | null;
  saldoCuentaFiscalAnterior?: number | null;
  saldoCuentaFiscalActual?: number | null;
  isrRetenidoMes?: number | null;
}

export interface ERComparativo {
  mes: string; totalIngresos: number; totalNomina: number; totalGastos: number;
}

export interface EstadoResultadosData {
  mes: string; mesLabel: string; logoSrc?: string | null;
  proyectos: ERProyecto[];
  cantidadProyectos: number;
  totalIngresos: number;
  totalCostosDirectos: number;
  utilidadBruta: number; margenBrutoPct: number;
  gastosPorCategoria: ERGastoCategoria[];
  totalGastosOperativos: number;
  nominaItems: ERNominaItem[];
  nominaPorArea: Record<string, number>;
  totalNomina: number;
  utilidadOperativa: number; margenOperativoPct: number;
  cuotasDeuda: ERCuotaDeuda[];
  totalCostosFinancieros: number;
  totalRepartos: number;
  isrEstimado: number;
  utilidadNeta: number; margenNetoPct: number;
  comparativo?: ERComparativo | null;
  analisis?: ERAnalisis | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const getMesLabel = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
    fontSize: 8,
    color: BLACK,
  },

  // Header negro con marca
  header: {
    backgroundColor: BLACK,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "column" },
  headerBrand: { fontSize: 11, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  headerTitle: { fontSize: 18, color: WHITE, fontFamily: "Helvetica-Bold", marginTop: 3 },
  headerSubtitle: { fontSize: 8, color: GRAY4, marginTop: 2, letterSpacing: 0.5 },
  headerRight: { alignItems: "flex-end" },
  headerMes: { fontSize: 22, color: GOLD, fontFamily: "Helvetica-Bold" },
  headerMetaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  headerMeta: { fontSize: 7, color: GRAY4 },

  body: { paddingHorizontal: 36, paddingTop: 24 },

  // KPI strip
  kpiStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: CREAM,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: GRAY5,
  },
  kpiCardHighlight: {
    flex: 1,
    backgroundColor: BLACK,
    borderRadius: 6,
    padding: 10,
  },
  kpiLabel: { fontSize: 6.5, color: GRAY3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  kpiLabelLight: { fontSize: 6.5, color: GRAY4, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  kpiValue: { fontSize: 14, color: BLACK, fontFamily: "Helvetica-Bold" },
  kpiValueLight: { fontSize: 14, color: WHITE, fontFamily: "Helvetica-Bold" },
  kpiGold: { fontSize: 14, color: GOLD, fontFamily: "Helvetica-Bold" },
  kpiSub: { fontSize: 6.5, color: GRAY4, marginTop: 3 },
  kpiSubLight: { fontSize: 6.5, color: GRAY4, marginTop: 3 },

  // Sección
  sectionTitle: {
    fontSize: 7.5,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 4,
  },

  // Tabla
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLACK,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: { fontSize: 6.5, color: GRAY4, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: CREAM,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tableTotal: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1.5,
    borderTopColor: GRAY2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cell: { fontSize: 7.5, color: BLACK },
  cellGray: { fontSize: 7.5, color: GRAY3 },
  cellBold: { fontSize: 7.5, color: BLACK, fontFamily: "Helvetica-Bold" },
  cellGold: { fontSize: 7.5, color: GOLD, fontFamily: "Helvetica-Bold" },
  cellGreen: { fontSize: 7.5, color: GREEN, fontFamily: "Helvetica-Bold" },
  cellRed: { fontSize: 7.5, color: RED, fontFamily: "Helvetica-Bold" },
  cellRight: { textAlign: "right" },

  // Resultado strip
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 6,
  },
  resultLabel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  resultSubLabel: { fontSize: 7, marginTop: 1 },
  resultValue: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  resultPct: { fontSize: 8, textAlign: "right", marginTop: 1 },

  // Mini chart bar (horizontal)
  barTrack: { height: 5, backgroundColor: "#e5e5e5", borderRadius: 3, flex: 1 },
  barFill: { height: 5, borderRadius: 3 },

  // Waterfall bar
  waterfallRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 6,
  },
  waterfallLabel: { fontSize: 7, color: GRAY2, width: 110 },
  waterfallValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", width: 72, textAlign: "right" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: GRAY5,
    paddingTop: 6,
  },
  footerText: { fontSize: 6, color: GRAY4 },

  // Two cols
  cols2: { flexDirection: "row", gap: 14, marginBottom: 16 },
  col: { flex: 1 },

  // Análisis
  analysisCard: {
    backgroundColor: CREAM,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    borderWidth: 1,
    borderColor: GRAY5,
  },
  analysisQ: { fontSize: 7, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 4, letterSpacing: 0.3 },
  analysisA: { fontSize: 7.5, color: GRAY2, lineHeight: 1.5 },

  // ISR card
  isrCard: {
    borderWidth: 1.5,
    borderColor: AMBER,
    borderRadius: 6,
    padding: 10,
    backgroundColor: AMBER_LT,
    marginBottom: 12,
  },
  isrTitle: { fontSize: 7, color: AMBER, fontFamily: "Helvetica-Bold", marginBottom: 6, letterSpacing: 0.5 },
  isrRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  isrLabel: { fontSize: 7, color: GRAY2 },
  isrValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY2 },

  // Propuesta badge
  propuestaBadge: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 8,
    backgroundColor: WHITE,
    borderRadius: 5,
    padding: 8,
    borderWidth: 1,
    borderColor: GRAY5,
  },
  propuestaNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  propuestaNumText: { fontSize: 8, color: WHITE, fontFamily: "Helvetica-Bold" },
  propuestaText: { fontSize: 7.5, color: GRAY2, flex: 1, lineHeight: 1.5 },

  // Separador
  divider: { borderBottomWidth: 0.5, borderBottomColor: GRAY5, marginVertical: 12 },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
});

// ─── Waterfall Chart ──────────────────────────────────────────────────────────
function WaterfallChart({ data }: {
  data: { label: string; value: number; color: string }[];
}) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const W = 340;
  const BAR_H = 16;
  const BAR_GAP = 6;
  const LABEL_W = 120;
  const VALUE_W = 72;
  const BAR_W = W - LABEL_W - VALUE_W;

  return (
    <Svg width={W} height={data.length * (BAR_H + BAR_GAP) + 4}>
      {data.map((d, i) => {
        const y = i * (BAR_H + BAR_GAP);
        const pct = Math.abs(d.value) / maxAbs;
        const barW = pct * (BAR_W - 8);
        const isNeg = d.value < 0;

        return (
          <G key={d.label}>
            {/* Track */}
            <Rect x={LABEL_W + VALUE_W + 4} y={y + 2} width={BAR_W - 8} height={BAR_H - 4}
              rx={3} fill="#f0f0f0" />
            {/* Bar */}
            <Rect x={LABEL_W + VALUE_W + 4} y={y + 2} width={barW} height={BAR_H - 4}
              rx={3} fill={d.color} />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Pie Donut Simple ─────────────────────────────────────────────────────────
function DonutChart({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return null;

  const CX = 28; const CY = 28; const R = 22; const r = 13;
  const paths: React.ReactNode[] = [];
  let angle = -90;

  for (const part of parts) {
    const sweep = (part.value / total) * 360;
    if (sweep < 1) continue;
    const start = angle;
    const end   = angle + sweep;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const x1 = CX + R * Math.cos(toRad(start));
    const y1 = CY + R * Math.sin(toRad(start));
    const x2 = CX + R * Math.cos(toRad(end));
    const y2 = CY + R * Math.sin(toRad(end));
    const xi1 = CX + r * Math.cos(toRad(start));
    const yi1 = CY + r * Math.sin(toRad(start));
    const xi2 = CX + r * Math.cos(toRad(end));
    const yi2 = CY + r * Math.sin(toRad(end));
    const large = sweep > 180 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`;
    paths.push(<Path key={start} d={d} fill={part.color} />);
    angle += sweep;
  }

  return (
    <Svg width={56} height={56}>
      {paths}
    </Svg>
  );
}

// ─── Página 1: Resumen Ejecutivo ──────────────────────────────────────────────
function Pagina1({ data }: { data: EstadoResultadosData }) {
  const positivo = data.utilidadNeta >= 0;
  const utilBrutaOk = data.utilidadBruta >= 0;

  // Waterfall data para cascada de utilidades
  const waterfallData = [
    { label: "Ingresos Devengados",  value: data.totalIngresos,         color: GREEN },
    { label: "— Costos Directos",    value: -data.totalCostosDirectos,  color: RED },
    { label: "= Utilidad Bruta",     value: data.utilidadBruta,         color: data.utilidadBruta >= 0 ? BLUE : RED },
    { label: "— Gastos Operativos",  value: -data.totalGastosOperativos,color: AMBER },
    { label: "— Nómina",             value: -data.totalNomina,          color: "#8b5cf6" },
    { label: "= Utilidad Operativa", value: data.utilidadOperativa,     color: data.utilidadOperativa >= 0 ? BLUE : RED },
    { label: "— Costos Financieros", value: -data.totalCostosFinancieros, color: "#6b7280" },
    { label: "— ISR Estimado (30%)", value: -data.isrEstimado,          color: "#6b7280" },
    { label: "= Utilidad Neta",      value: data.utilidadNeta,          color: data.utilidadNeta >= 0 ? GREEN : RED },
  ];

  // Comparativo
  const comp = data.comparativo;
  const varIngresos = comp && comp.totalIngresos > 0
    ? ((data.totalIngresos - comp.totalIngresos) / comp.totalIngresos) * 100
    : null;

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerBrand}>MAINSTAGE</Text>
          <Text style={s.headerTitle}>Estado de Resultados</Text>
          <Text style={s.headerSubtitle}>BASE DEVENGADO · DIRECCIÓN GENERAL</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerMes}>{data.mesLabel}</Text>
          <Text style={{ fontSize: 7, color: GRAY4, marginTop: 3 }}>
            {data.cantidadProyectos} proyecto{data.cantidadProyectos !== 1 ? "s" : ""} ejecutado{data.cantidadProyectos !== 1 ? "s" : ""}
          </Text>
          {varIngresos !== null && (
            <Text style={{ fontSize: 7, color: varIngresos >= 0 ? GREEN : RED, marginTop: 2 }}>
              {varIngresos >= 0 ? "▲" : "▼"} {Math.abs(varIngresos).toFixed(1)}% vs mes anterior
            </Text>
          )}
        </View>
      </View>

      <View style={s.body}>
        {/* KPIs strip */}
        <View style={s.kpiStrip}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Ingresos Devengados</Text>
            <Text style={s.kpiValue}>{fmt(data.totalIngresos)}</Text>
            <Text style={s.kpiSub}>{data.cantidadProyectos} proyectos del período</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Utilidad Bruta</Text>
            <Text style={[s.kpiValue, { color: utilBrutaOk ? GREEN : RED }]}>
              {fmt(data.utilidadBruta)}
            </Text>
            <Text style={s.kpiSub}>Margen {data.margenBrutoPct.toFixed(1)}%</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Utilidad Operativa</Text>
            <Text style={[s.kpiValue, { color: data.utilidadOperativa >= 0 ? GREEN : RED }]}>
              {fmt(data.utilidadOperativa)}
            </Text>
            <Text style={s.kpiSub}>Margen {data.margenOperativoPct.toFixed(1)}%</Text>
          </View>
          <View style={s.kpiCardHighlight}>
            <Text style={s.kpiLabelLight}>Utilidad Neta</Text>
            <Text style={[s.kpiGold]}>
              {fmt(data.utilidadNeta)}
            </Text>
            <Text style={s.kpiSubLight}>Margen neto {data.margenNetoPct.toFixed(1)}%</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Por Cobrar</Text>
            <Text style={[s.kpiValue, { color: AMBER }]}>
              {fmt(data.proyectos.reduce((s, p) => s + p.porCobrar, 0))}
            </Text>
            <Text style={s.kpiSub}>Pendiente de clientes</Text>
          </View>
        </View>

        <View style={s.cols2}>
          {/* Columna izquierda: Cascada de utilidades */}
          <View style={[s.col, { flex: 1.1 }]}>
            <Text style={s.sectionTitle}>Cascada de Utilidades</Text>

            {waterfallData.map((row, i) => {
              const isTotal = row.label.startsWith("=");
              const maxVal  = data.totalIngresos > 0 ? data.totalIngresos : 1;
              const barW    = Math.min(Math.abs(row.value) / maxVal, 1) * 160;

              return (
                <View key={i} style={[s.waterfallRow, isTotal ? { borderTopWidth: 0.5, borderTopColor: GRAY5, paddingTop: 4, marginTop: 2 } : {}]}>
                  <Text style={[s.waterfallLabel, isTotal ? { fontFamily: "Helvetica-Bold", color: BLACK } : {}]}>
                    {row.label}
                  </Text>
                  <Text style={[s.waterfallValue, { color: row.color }]}>
                    {row.value >= 0 ? "" : ""}{fmt(Math.abs(row.value))}
                  </Text>
                  {/* Mini bar */}
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={[s.barTrack]}>
                      <View style={[s.barFill, { width: barW, backgroundColor: row.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Columna derecha: Desglose resumen */}
          <View style={[s.col]}>
            <Text style={s.sectionTitle}>Desglose del Período</Text>

            {/* Ingresos */}
            <View style={[s.resultRow, { backgroundColor: "#f0fdf4" }]}>
              <View>
                <Text style={[s.resultLabel, { color: GREEN }]}>Ingresos por Proyectos</Text>
                <Text style={[s.resultSubLabel, { color: GRAY4 }]}>Base devengado — fecha de evento</Text>
              </View>
              <View>
                <Text style={[s.resultValue, { color: GREEN }]}>{fmt(data.totalIngresos)}</Text>
              </View>
            </View>

            {/* Costos Directos */}
            <View style={[s.resultRow, { backgroundColor: RED_LT }]}>
              <View>
                <Text style={[s.resultLabel, { color: RED }]}>Costos Directos de Proyectos</Text>
                <Text style={[s.resultSubLabel, { color: GRAY4 }]}>CxP + gastos operativos de eventos</Text>
              </View>
              <View>
                <Text style={[s.resultValue, { color: RED }]}>({fmt(data.totalCostosDirectos)})</Text>
              </View>
            </View>

            {/* Gastos Operativos */}
            <View style={[s.resultRow, { backgroundColor: AMBER_LT }]}>
              <View>
                <Text style={[s.resultLabel, { color: AMBER }]}>Gastos Operativos</Text>
                <Text style={[s.resultSubLabel, { color: GRAY4 }]}>Fijos + variables del período</Text>
              </View>
              <View>
                <Text style={[s.resultValue, { color: AMBER }]}>({fmt(data.totalGastosOperativos)})</Text>
              </View>
            </View>

            {/* Nómina */}
            <View style={[s.resultRow, { backgroundColor: "#f3e8ff" }]}>
              <View>
                <Text style={[s.resultLabel, { color: "#7c3aed" }]}>Nómina</Text>
                <Text style={[s.resultSubLabel, { color: GRAY4 }]}>{data.nominaItems.length} colaboradores</Text>
              </View>
              <View>
                <Text style={[s.resultValue, { color: "#7c3aed" }]}>({fmt(data.totalNomina)})</Text>
              </View>
            </View>

            {/* Costos financieros */}
            {data.totalCostosFinancieros > 0 && (
              <View style={[s.resultRow, { backgroundColor: "#f1f5f9" }]}>
                <View>
                  <Text style={[s.resultLabel, { color: GRAY3 }]}>Costos Financieros</Text>
                  <Text style={[s.resultSubLabel, { color: GRAY4 }]}>Cuotas de deuda del período</Text>
                </View>
                <View>
                  <Text style={[s.resultValue, { color: GRAY3 }]}>({fmt(data.totalCostosFinancieros)})</Text>
                </View>
              </View>
            )}

            {/* ISR */}
            {data.isrEstimado > 0 && (
              <View style={[s.resultRow, { backgroundColor: AMBER_LT }]}>
                <View>
                  <Text style={[s.resultLabel, { color: AMBER }]}>ISR Estimado (30%)</Text>
                  <Text style={[s.resultSubLabel, { color: GRAY4 }]}>Sobre utilidad operativa</Text>
                </View>
                <View>
                  <Text style={[s.resultValue, { color: AMBER }]}>({fmt(data.isrEstimado)})</Text>
                </View>
              </View>
            )}

            {/* Utilidad Neta */}
            <View style={[s.resultRow, { backgroundColor: positivo ? BLACK : "#1f0000" }]}>
              <View>
                <Text style={[s.resultLabel, { color: WHITE }]}>UTILIDAD NETA</Text>
                <Text style={[s.resultSubLabel, { color: GRAY4 }]}>Después de impuestos y financieros</Text>
              </View>
              <View>
                <Text style={[s.resultValue, { color: GOLD }]}>{fmt(data.utilidadNeta)}</Text>
                <Text style={[s.resultPct, { color: GRAY4 }]}>{data.margenNetoPct.toFixed(1)}% de margen</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>Estado de Resultados · Dirección General · Base Devengado</Text>
        <Text style={s.footerText}>{data.mesLabel} · Confidencial</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Página 2: Detalle de Proyectos ──────────────────────────────────────────
function Pagina2Proyectos({ data }: { data: EstadoResultadosData }) {
  const MESES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerBrand}>MAINSTAGE</Text>
          <Text style={s.headerTitle}>Proyectos del Período</Text>
          <Text style={s.headerSubtitle}>Ingresos y costos directos devengados · {data.mesLabel}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={[s.headerMes, { fontSize: 14 }]}>{data.cantidadProyectos} Proyectos</Text>
        </View>
      </View>

      <View style={s.body}>
        {/* Tabla de proyectos */}
        <View style={s.mb12}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: 150 }]}>Proyecto</Text>
            <Text style={[s.tableHeaderCell, { width: 80 }]}>Cliente</Text>
            <Text style={[s.tableHeaderCell, { width: 55 }]}>Tipo</Text>
            <Text style={[s.tableHeaderCell, { width: 44, textAlign: "right" }]}>Ingreso</Text>
            <Text style={[s.tableHeaderCell, { width: 52, textAlign: "right" }]}>Costo Directo</Text>
            <Text style={[s.tableHeaderCell, { width: 52, textAlign: "right" }]}>Ut. Bruta</Text>
            <Text style={[s.tableHeaderCell, { width: 35, textAlign: "right" }]}>Margen</Text>
            <Text style={[s.tableHeaderCell, { width: 55, textAlign: "right" }]}>Por Cobrar</Text>
          </View>

          {data.proyectos.map((p, i) => {
            const d    = new Date(p.fechaEvento);
            const fecha = `${d.getDate()} ${MESES_SHORT[d.getMonth()]}`;
            const margenColor = p.margenPct >= 40 ? GREEN : p.margenPct >= 20 ? AMBER : RED;
            return (
              <View key={p.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <View style={{ width: 150 }}>
                  <Text style={s.cellBold}>{p.nombre}</Text>
                  <Text style={[s.cellGray, { fontSize: 6.5 }]}>{fecha}</Text>
                </View>
                <Text style={[s.cellGray, { width: 80 }]}>{p.cliente}</Text>
                <Text style={[s.cellGray, { width: 55 }]}>{p.tipoEvento}</Text>
                <Text style={[s.cell, { width: 44, textAlign: "right" }]}>{fmt(p.ingresoSinIva)}</Text>
                <Text style={[s.cell, { width: 52, textAlign: "right", color: RED }]}>({fmt(p.costoDirecto)})</Text>
                <Text style={[s.cellBold, { width: 52, textAlign: "right", color: p.utilidadBruta >= 0 ? GREEN : RED }]}>
                  {fmt(p.utilidadBruta)}
                </Text>
                <Text style={[s.cellBold, { width: 35, textAlign: "right", color: margenColor }]}>
                  {p.margenPct.toFixed(0)}%
                </Text>
                <Text style={[s.cell, { width: 55, textAlign: "right", color: p.porCobrar > 0 ? AMBER : GRAY3 }]}>
                  {p.porCobrar > 0 ? fmt(p.porCobrar) : "✓ Liquidado"}
                </Text>
              </View>
            );
          })}

          {data.proyectos.length === 0 && (
            <View style={[s.tableRow, { justifyContent: "center" }]}>
              <Text style={[s.cellGray, { textAlign: "center" }]}>Sin proyectos ejecutados en el período</Text>
            </View>
          )}

          <View style={s.tableTotal}>
            <Text style={[s.cellBold, { width: 150 }]}>TOTALES</Text>
            <Text style={[s.cellGray, { width: 80 }]} />
            <Text style={[s.cellGray, { width: 55 }]} />
            <Text style={[s.cellBold, { width: 44, textAlign: "right", color: GREEN }]}>
              {fmt(data.totalIngresos)}
            </Text>
            <Text style={[s.cellBold, { width: 52, textAlign: "right", color: RED }]}>
              ({fmt(data.totalCostosDirectos)})
            </Text>
            <Text style={[s.cellBold, { width: 52, textAlign: "right", color: data.utilidadBruta >= 0 ? GREEN : RED }]}>
              {fmt(data.utilidadBruta)}
            </Text>
            <Text style={[s.cellBold, { width: 35, textAlign: "right", color: GOLD }]}>
              {data.margenBrutoPct.toFixed(0)}%
            </Text>
            <Text style={[s.cellBold, { width: 55, textAlign: "right", color: AMBER }]}>
              {fmt(data.proyectos.reduce((s, p) => s + p.porCobrar, 0))}
            </Text>
          </View>
        </View>

        {/* Gastos por categoría + Nómina */}
        <View style={s.cols2}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Gastos Operativos por Categoría</Text>
            {data.gastosPorCategoria.slice(0, 12).map((cat, i) => {
              const pct = data.totalGastosOperativos > 0 ? (cat.monto / data.totalGastosOperativos) * 100 : 0;
              const barW = pct * 1.4;
              return (
                <View key={cat.nombre} style={s.waterfallRow}>
                  <Text style={[s.waterfallLabel, { width: 120 }]}>{cat.nombre}</Text>
                  <Text style={[s.waterfallValue, { color: AMBER }]}>{fmt(cat.monto)}</Text>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: barW, backgroundColor: AMBER }]} />
                    </View>
                  </View>
                  <Text style={[s.cellGray, { fontSize: 6.5, marginLeft: 4 }]}>{pct.toFixed(0)}%</Text>
                </View>
              );
            })}
            <View style={[s.waterfallRow, { borderTopWidth: 0.5, borderTopColor: GRAY5, marginTop: 4, paddingTop: 4 }]}>
              <Text style={[s.waterfallLabel, { width: 120, fontFamily: "Helvetica-Bold" }]}>TOTAL GASTOS</Text>
              <Text style={[s.waterfallValue, { color: AMBER, fontFamily: "Helvetica-Bold" }]}>
                {fmt(data.totalGastosOperativos)}
              </Text>
            </View>
          </View>

          <View style={s.col}>
            <Text style={s.sectionTitle}>Nómina del Período</Text>
            {Object.entries(data.nominaPorArea).map(([area, monto]) => {
              const pct = data.totalNomina > 0 ? (monto / data.totalNomina) * 100 : 0;
              return (
                <View key={area} style={s.waterfallRow}>
                  <Text style={[s.waterfallLabel, { width: 120 }]}>{area}</Text>
                  <Text style={[s.waterfallValue, { color: "#7c3aed" }]}>{fmt(monto)}</Text>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: pct * 1.4, backgroundColor: "#7c3aed" }]} />
                    </View>
                  </View>
                  <Text style={[s.cellGray, { fontSize: 6.5, marginLeft: 4 }]}>{pct.toFixed(0)}%</Text>
                </View>
              );
            })}
            <View style={[s.waterfallRow, { borderTopWidth: 0.5, borderTopColor: GRAY5, marginTop: 4, paddingTop: 4 }]}>
              <Text style={[s.waterfallLabel, { width: 120, fontFamily: "Helvetica-Bold" }]}>TOTAL NÓMINA</Text>
              <Text style={[s.waterfallValue, { color: "#7c3aed", fontFamily: "Helvetica-Bold" }]}>
                {fmt(data.totalNomina)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>Estado de Resultados · Detalle de Proyectos</Text>
        <Text style={s.footerText}>{data.mesLabel} · Confidencial</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Página 3: Análisis Directivo ─────────────────────────────────────────────
function Pagina3Analisis({ data }: { data: EstadoResultadosData }) {
  const a = data.analisis;
  if (!a) return null;

  const preguntasEstrategicas = [
    { q: "¿Qué logramos este mes?",                       v: a.queLogramos },
    { q: "¿Qué no logramos y por qué?",                   v: a.queNoLogramos },
    { q: "¿Qué cambiaríamos si pudiéramos?",              v: a.queCambiariamos },
    { q: "¿Qué decisiones urgentes hay que tomar?",       v: a.decisionesUrgentes },
    { q: "Proyección y enfoque del siguiente mes",         v: a.proyeccionSiguiente },
  ].filter((p) => p.v);

  const analisis = [
    { t: "Análisis Financiero",   v: a.analisisFinanciero },
    { t: "Análisis Operativo",    v: a.analisisOperativo },
    { t: "Análisis de Mercado",   v: a.analisisMercado },
  ].filter((p) => p.v);

  const propuestas = [a.propuesta1, a.propuesta2, a.propuesta3, a.propuesta4, a.propuesta5].filter(Boolean);

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerBrand}>MAINSTAGE</Text>
          <Text style={s.headerTitle}>Análisis Directivo</Text>
          <Text style={s.headerSubtitle}>Evaluación estratégica · Dirección General · {data.mesLabel}</Text>
        </View>
      </View>

      <View style={s.body}>
        <View style={s.cols2}>
          {/* Columna izquierda: Análisis narrativo + Preguntas estratégicas */}
          <View style={[s.col, { flex: 1.1 }]}>

            {analisis.length > 0 && (
              <View style={s.mb12}>
                <Text style={s.sectionTitle}>Análisis del Responsable</Text>
                {analisis.map((item) => (
                  <View key={item.t} style={s.analysisCard}>
                    <Text style={s.analysisQ}>{item.t}</Text>
                    <Text style={s.analysisA}>{item.v}</Text>
                  </View>
                ))}
              </View>
            )}

            {preguntasEstrategicas.length > 0 && (
              <View>
                <Text style={s.sectionTitle}>Preguntas Estratégicas</Text>
                {preguntasEstrategicas.map((p) => (
                  <View key={p.q} style={s.analysisCard}>
                    <Text style={s.analysisQ}>{p.q}</Text>
                    <Text style={s.analysisA}>{p.v}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Columna derecha: 5 Propuestas + ISR + Comentarios */}
          <View style={s.col}>

            {propuestas.length > 0 && (
              <View style={s.mb12}>
                <Text style={s.sectionTitle}>5 Propuestas de Mejora</Text>
                {propuestas.map((p, i) => (
                  <View key={i} style={s.propuestaBadge}>
                    <View style={s.propuestaNum}>
                      <Text style={s.propuestaNumText}>{i + 1}</Text>
                    </View>
                    <Text style={s.propuestaText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ISR / Cuenta Fiscal */}
            {(a.saldoCuentaFiscalAnterior != null || a.saldoCuentaFiscalActual != null) && (
              <View style={s.isrCard}>
                <Text style={s.isrTitle}>⚠ CUENTA FISCAL / ISR</Text>
                {a.saldoCuentaFiscalAnterior != null && (
                  <View style={s.isrRow}>
                    <Text style={s.isrLabel}>Saldo cuenta fiscal mes anterior</Text>
                    <Text style={s.isrValue}>{fmt(a.saldoCuentaFiscalAnterior)}</Text>
                  </View>
                )}
                {a.saldoCuentaFiscalActual != null && (
                  <View style={s.isrRow}>
                    <Text style={s.isrLabel}>Saldo estimado mes actual</Text>
                    <Text style={s.isrValue}>{fmt(a.saldoCuentaFiscalActual)}</Text>
                  </View>
                )}
                {a.isrRetenidoMes != null && (
                  <View style={s.isrRow}>
                    <Text style={s.isrLabel}>ISR retenido / pagado en el mes</Text>
                    <Text style={s.isrValue}>{fmt(a.isrRetenidoMes)}</Text>
                  </View>
                )}
                <View style={[s.isrRow, { marginTop: 4 }]}>
                  <Text style={s.isrLabel}>ISR estimado sobre ut. operativa (30%)</Text>
                  <Text style={[s.isrValue, { color: AMBER }]}>{fmt(data.isrEstimado)}</Text>
                </View>
              </View>
            )}

            {a.comentariosFinales && (
              <View style={[s.analysisCard, { borderLeftColor: BLACK }]}>
                <Text style={[s.analysisQ, { color: BLACK }]}>Comentarios Finales</Text>
                <Text style={s.analysisA}>{a.comentariosFinales}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>Estado de Resultados · Análisis Directivo</Text>
        <Text style={s.footerText}>{data.mesLabel} · Confidencial</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Documento Principal ──────────────────────────────────────────────────────
export function EstadoResultadosPDF({ data }: { data: EstadoResultadosData }) {
  return (
    <Document
      title={`Estado de Resultados — ${data.mesLabel}`}
      author="Mainstage"
      subject="Estado de Resultados · Dirección General · Base Devengado"
    >
      <Pagina1 data={data} />
      <Pagina2Proyectos data={data} />
      {data.analisis && <Pagina3Analisis data={data} />}
    </Document>
  );
}
