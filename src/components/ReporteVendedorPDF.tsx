import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const DARK  = "#181818";
const DARK2 = "#222222";
const GRAY  = "#555555";
const LG    = "#888888";
const WHITE = "#FFFFFF";
const GREEN = "#22c55e";
const YELLOW = "#eab308";
const RED   = "#ef4444";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

const ORIGEN_LABEL: Record<string, string> = {
  CLIENTE_PROPIO: "Cliente Propio",
  PUBLICIDAD: "Publicidad",
  ASIGNADO: "Asignado",
};
const ESTADO_LABEL: Record<string, string> = {
  LIQUIDADO: "Liquidado ✓",
  PARCIAL: "Anticipo",
  PENDIENTE: "Pendiente",
};
const ESTADO_COLOR: Record<string, string> = {
  LIQUIDADO: GREEN,
  PARCIAL: YELLOW,
  PENDIENTE: GRAY,
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 44,
    paddingHorizontal: 0,
    fontSize: 8,
    color: BLACK,
  },
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "column" },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 2 },
  tagline: { fontSize: 6.5, color: LG, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  docSub: { fontSize: 7.5, color: LG },
  goldBar: { height: 3, backgroundColor: GOLD },
  body: { paddingHorizontal: 36, paddingTop: 20 },
  // Vendedor info
  vendedorBand: {
    backgroundColor: DARK,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DARK2,
  },
  vendedorName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  vendedorSub: { fontSize: 7, color: LG },
  // KPI row
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: DARK, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: DARK2 },
  kpiLabel: { fontSize: 6.5, color: LG, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  kpiValueGold: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 2 },
  kpiValueGreen: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 2 },
  kpiValueYellow: { fontSize: 16, fontFamily: "Helvetica-Bold", color: YELLOW, marginBottom: 2 },
  kpiSub: { fontSize: 6, color: GRAY },
  // Table
  tableWrapper: { borderWidth: 1, borderColor: DARK2, borderRadius: 6, overflow: "hidden", marginBottom: 16 },
  tableHeader: { flexDirection: "row", backgroundColor: DARK2, paddingHorizontal: 10, paddingVertical: 7 },
  tableRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: DARK2 },
  tableRowAlt: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: DARK2, backgroundColor: "#111" },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: LG, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { fontSize: 7, color: LG },
  tdBold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE },
  tdGold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD },
  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2, fontSize: 6, fontFamily: "Helvetica-Bold" },
  // Resumen pago
  payBox: { backgroundColor: DARK, borderRadius: 6, padding: 14, borderLeftWidth: 3, borderLeftColor: GOLD, marginBottom: 16 },
  payTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  payRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  payLabel: { fontSize: 7.5, color: LG },
  payValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: WHITE },
  payTotal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD },
  divider: { height: 1, backgroundColor: DARK2, marginVertical: 8 },
  // Verificación badge
  verBadgeOk: { backgroundColor: "#14532d", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  verBadgeWarn: { backgroundColor: "#713f12", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  verTextOk: { fontSize: 6, color: GREEN, fontFamily: "Helvetica-Bold" },
  verTextWarn: { fontSize: 6, color: YELLOW, fontFamily: "Helvetica-Bold" },
  // Análisis
  analysisSection: { marginTop: 14, borderTopWidth: 2, borderTopColor: DARK2, paddingTop: 14 },
  analysisTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  analysisRow: { flexDirection: "row", gap: 14 },
  analysisBlock: { flex: 1 },
  analysisLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 4 },
  analysisText: { fontSize: 7.5, color: GRAY, lineHeight: 1.5, minHeight: 36 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BLACK,
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 6.5, color: GRAY },
  footerBrand: { fontSize: 7, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
});

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DetalleComision {
  tratoId: string;
  cliente: { nombre: string; empresa: string | null };
  nombreEvento: string | null;
  fechaCierre: string | null;
  origenVenta: string;
  numeroCotizacion: string | null;
  granTotal: number;
  baseCalculo: number;
  pctComision: number;
  montoComision: number;
  liquidado100: boolean;
  estadoPago: string;
  esDelegado?: boolean;
  vendedorNombreReal?: string | null;
  cotizadorNombre?: string | null;
}
interface ResumenComision {
  totalTratos: number;
  baseLiquidada: number;
  totalComisiones: number;
  alcanzaPiso: boolean;
  montoBono: number;
  totalAPagar: number;
}

interface ReporteVendedorData {
  vendedor: { id: string; name: string };
  mes: string;
  mesTrabajo: number;
  piso: number;
  config: { pctBono: number };
  detalles: DetalleComision[];
  resumen: ResumenComision;
  totalCotizaciones: number;
  comisionPendiente: number;
  logoSrc?: string | null;
  analisis?: string;
  propuestas?: string;
  comentarios?: string;
  generadoEn?: string;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Main PDF Component ───────────────────────────────────────────────────────
export function ReporteVendedorPDF({ data }: { data: ReporteVendedorData }) {
  const mesLabel = (() => {
    const [y, m] = data.mes.split("-").map(Number);
    const l = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    return l.charAt(0).toUpperCase() + l.slice(1);
  })();

  const conversionPct = data.totalCotizaciones > 0
    ? ((data.detalles.length / data.totalCotizaciones) * 100).toFixed(1)
    : "0.0";

  return (
    <Document title={`Reporte de Vendedor — ${data.vendedor.name} — ${mesLabel}`}>
      <Page size="A3" orientation="landscape" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {data.logoSrc && <Image src={data.logoSrc} style={{ width: 110, height: 28, objectFit: "contain", marginBottom: 8 }} />}
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA DE EVENTOS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>Reporte de Comisiones por Vendedor</Text>
            <Text style={s.docSub}>{mesLabel}</Text>
            <Text style={[s.docSub, { marginTop: 3 }]}>Generado: {data.generadoEn ?? new Date().toLocaleDateString("es-MX")}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          {/* VENDEDOR BAND */}
          <View style={s.vendedorBand}>
            <View style={{ flex: 1 }}>
              <Text style={s.vendedorName}>{data.vendedor.name}</Text>
              <Text style={s.vendedorSub}>Mes de trabajo #{data.mesTrabajo} · Meta del mes: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(data.piso)}</Text>
            </View>
            {data.resumen.alcanzaPiso && (
              <View style={{ backgroundColor: "#14532d", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 7, color: GREEN, fontFamily: "Helvetica-Bold" }}>✓ META ALCANZADA — BONO {data.config.pctBono}%</Text>
              </View>
            )}
          </View>

          {/* KPI CARDS */}
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Cotizaciones</Text>
              <Text style={s.kpiValue}>{data.totalCotizaciones}</Text>
              <Text style={s.kpiSub}>enviadas en el período</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Eventos Cerrados</Text>
              <Text style={s.kpiValue}>{data.detalles.length}</Text>
              <Text style={s.kpiSub}>Conversión: {conversionPct}%</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Base Liquidada</Text>
              <Text style={s.kpiValueGold}>{fmt(data.resumen.baseLiquidada)}</Text>
              <Text style={s.kpiSub}>equipos liquidados al 100%</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Comisión Generada</Text>
              <Text style={s.kpiValueGreen}>{fmt(data.resumen.totalComisiones)}</Text>
              <Text style={s.kpiSub}>sobre base liquidada</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Comisión Pendiente</Text>
              <Text style={s.kpiValueYellow}>{fmt(data.comisionPendiente)}</Text>
              <Text style={s.kpiSub}>esperando liquidación cliente</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Bono</Text>
              <Text style={[s.kpiValue, { color: data.resumen.alcanzaPiso ? GREEN : GRAY }]}>{data.resumen.alcanzaPiso ? fmt(data.resumen.montoBono) : "—"}</Text>
              <Text style={s.kpiSub}>{data.resumen.alcanzaPiso ? "meta superada" : "meta no alcanzada"}</Text>
            </View>
          </View>

          {/* TABLA DE EVENTOS */}
          <View style={s.tableWrapper}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1.8 }]}>Evento / Cliente</Text>
              <Text style={[s.th, { width: 70 }]}>Cierre</Text>
              <Text style={[s.th, { width: 60 }]}>Cotización</Text>
              <Text style={[s.th, { width: 80 }]}>Origen</Text>
              <Text style={[s.th, { width: 75 }]}>Gran Total</Text>
              <Text style={[s.th, { width: 75 }]}>Base Equipos</Text>
              <Text style={[s.th, { width: 40 }]}>%</Text>
              <Text style={[s.th, { width: 75 }]}>Comisión</Text>
              <Text style={[s.th, { width: 65 }]}>Estado</Text>
              <Text style={[s.th, { width: 80 }]}>Verificación</Text>
            </View>
            {data.detalles.map((d, i) => (
              <View key={d.tratoId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <View style={{ flex: 1.8 }}>
                  <Text style={s.tdBold}>{d.nombreEvento ?? "Sin nombre"}</Text>
                  <Text style={[s.td, { marginTop: 1 }]}>{d.cliente.nombre}{d.cliente.empresa ? ` · ${d.cliente.empresa}` : ""}</Text>
                </View>
                <Text style={[s.td, { width: 70 }]}>{fmtDate(d.fechaCierre)}</Text>
                <Text style={[s.td, { width: 60 }]}>{d.numeroCotizacion ?? "—"}</Text>
                <Text style={[s.td, { width: 80 }]}>{ORIGEN_LABEL[d.origenVenta] ?? d.origenVenta}</Text>
                <Text style={[s.tdGold, { width: 75 }]}>{fmt(d.granTotal)}</Text>
                <Text style={[s.td, { width: 75 }]}>{fmt(d.baseCalculo)}</Text>
                <Text style={[s.td, { width: 40 }]}>{d.pctComision}%</Text>
                <Text style={[s.tdGold, { width: 75 }]}>{d.montoComision > 0 ? fmt(d.montoComision) : "—"}</Text>
                <View style={{ width: 65 }}>
                  <Text style={[s.td, { color: ESTADO_COLOR[d.estadoPago] ?? GRAY }]}>
                    {ESTADO_LABEL[d.estadoPago] ?? d.estadoPago}
                  </Text>
                </View>
                <View style={{ width: 80 }}>
                  {d.esDelegado ? (
                    <View style={s.verBadgeWarn}>
                      <Text style={s.verTextWarn}>Delegado</Text>
                    </View>
                  ) : (
                    <View style={s.verBadgeOk}>
                      <Text style={s.verTextOk}>Vendedor ✓</Text>
                    </View>
                  )}
                  {d.esDelegado && d.cotizadorNombre && (
                    <Text style={[s.td, { marginTop: 2, fontSize: 6 }]}>Cotizó: {d.cotizadorNombre}</Text>
                  )}
                </View>
              </View>
            ))}
            {data.detalles.length === 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { flex: 1, textAlign: "center" }]}>Sin eventos cerrados en este período</Text>
              </View>
            )}
          </View>

          {/* RESUMEN DE PAGO */}
          <View style={s.payBox}>
            <Text style={s.payTitle}>Resumen de Pago</Text>
            <View style={s.payRow}>
              <Text style={s.payLabel}>Comisión base (liquidados):</Text>
              <Text style={s.payValue}>{fmt(data.resumen.totalComisiones)}</Text>
            </View>
            {data.resumen.alcanzaPiso && (
              <View style={s.payRow}>
                <Text style={s.payLabel}>Bono por meta ({data.config.pctBono}%):</Text>
                <Text style={[s.payValue, { color: GREEN }]}>+ {fmt(data.resumen.montoBono)}</Text>
              </View>
            )}
            <View style={s.divider} />
            <View style={s.payRow}>
              <Text style={[s.payLabel, { color: WHITE, fontFamily: "Helvetica-Bold" }]}>TOTAL A PAGAR:</Text>
              <Text style={s.payTotal}>{fmt(data.resumen.totalAPagar)}</Text>
            </View>
            {data.comisionPendiente > 0 && (
              <View style={[s.payRow, { marginTop: 6 }]}>
                <Text style={[s.payLabel, { color: YELLOW }]}>Comisión pendiente (por liquidar):</Text>
                <Text style={[s.payValue, { color: YELLOW }]}>{fmt(data.comisionPendiente)}</Text>
              </View>
            )}
          </View>

          {/* ANÁLISIS */}
          <View style={s.analysisSection}>
            <Text style={s.analysisTitle}>Análisis del Responsable de Ventas</Text>
            <View style={s.analysisRow}>
              <View style={s.analysisBlock}>
                <Text style={s.analysisLabel}>Análisis de Resultados</Text>
                <Text style={s.analysisText}>{data.analisis || "—"}</Text>
              </View>
              <View style={s.analysisBlock}>
                <Text style={s.analysisLabel}>3 Propuestas de Mejora</Text>
                <Text style={s.analysisText}>{data.propuestas || "—"}</Text>
              </View>
              <View style={[s.analysisBlock, { flex: 0.8 }]}>
                <Text style={s.analysisLabel}>Comentarios Finales</Text>
                <Text style={s.analysisText}>{data.comentarios || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRO</Text>
          <Text style={s.footerText}>Reporte de Vendedor — {data.vendedor.name} — {mesLabel} · Confidencial</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
