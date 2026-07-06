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
const BLUE  = "#3b82f6";
const PURP  = "#a855f7";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}
function pct(n: number) { return `${n.toFixed(1)}%`; }

const ORIGEN_LABEL: Record<string, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  ORGANICO: "Orgánico",
  RECOMPRA: "Recompra",
  REFERIDO: "Referido",
  PROSPECCION: "Prospección",
  OTRO: "Otro",
};
const TIPO_EVENTO_LABEL: Record<string, string> = {
  MUSICAL: "Musical",
  SOCIAL: "Social",
  EMPRESARIAL: "Empresarial",
  OTRO: "Otro",
};
const TIPO_SERVICIO_LABEL: Record<string, string> = {
  RENTA: "Renta de Equipo",
  PRODUCCION_TECNICA: "Producción Técnica",
  DIRECCION_TECNICA: "Dirección Técnica",
  OTRO: "Otro",
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
  // KPI grid
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: DARK, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: DARK2 },
  kpiLabel: { fontSize: 6.5, color: LG, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  kpiValueGold: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 2 },
  kpiSub: { fontSize: 6, color: GRAY },
  // Section
  sectionRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  section: { flex: 1 },
  sectionTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: DARK2 },
  // Barras
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { fontSize: 7, color: LG, width: 90 },
  barTrack: { flex: 1, height: 7, backgroundColor: DARK2, borderRadius: 3 },
  barFill: { height: 7, backgroundColor: GOLD, borderRadius: 3 },
  barPct: { fontSize: 6.5, color: LG, marginLeft: 6, width: 30, textAlign: "right" },
  barCount: { fontSize: 6.5, color: WHITE, marginLeft: 4, width: 20 },
  // Tabla
  tableHeader: { flexDirection: "row", backgroundColor: DARK2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: DARK2 },
  tableCell: { fontSize: 7, color: LG },
  tableCellBold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE },
  tableCellGold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD },
  // Top clientes
  clientCard: { backgroundColor: DARK, borderRadius: 6, padding: 10, marginBottom: 6, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: DARK2 },
  clientRank: { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK2, marginRight: 12, width: 22 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  clientSub: { fontSize: 6.5, color: LG },
  clientMonto: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD },
  // Análisis
  analysisSection: { marginTop: 16, borderTopWidth: 2, borderTopColor: DARK2, paddingTop: 14 },
  analysisTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  analysisBlock: { marginBottom: 10 },
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
interface OrigenItem { origen: string; count: number; monto: number; pct: number; }
interface TipoItem { tipo: string; count: number; monto: number; pct: number; }
interface ClienteTop { nombre: string; empresa: string | null; monto: number; eventos: number; }
interface ReporteMensualData {
  periodo: { mes: string; label: string };
  ventasTotal: { count: number; monto: number };
  ticketPromedio: number;
  porTipoEvento: TipoItem[];
  porTipoServicio: TipoItem[];
  cotizaciones: { totalCreadas: number; ventasCerradas: number; conProyecto: number; sinProyecto: number };
  top3Clientes: ClienteTop[];
  clientesRecurrentes: { count: number };
  clientesNuevos: { count: number };
  porServicio: { rentas: { count: number; monto: number; pct: number }; produccion: { count: number; monto: number; pct: number }; otro: { count: number; monto: number; pct: number } };
  origenLeads: OrigenItem[];
  analisis?: string;
  propuestas?: string;
  comentarios?: string;
  logoSrc?: string | null;
  generadoEn?: string;
}

// ─── Bar Component ────────────────────────────────────────────────────────────
function Bar({ label, count, monto, pct: pctVal, maxPct, color = GOLD }: {
  label: string; count: number; monto: number; pct: number; maxPct: number; color?: string;
}) {
  const fillWidth = maxPct > 0 ? (pctVal / maxPct) * 100 : 0;
  return (
    <View style={s.barRow}>
      <Text style={[s.barLabel, { color: WHITE, fontSize: 6.5 }]}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { backgroundColor: color, width: `${Math.min(fillWidth, 100)}%` }]} />
      </View>
      <Text style={s.barCount}>{count}</Text>
      <Text style={s.barPct}>{pct(pctVal)}</Text>
    </View>
  );
}

// ─── Main PDF Component ───────────────────────────────────────────────────────
export function ReporteVentasMensualPDF({ data }: { data: ReporteMensualData }) {
  const maxOrigenPct = data.origenLeads.reduce((m, o) => Math.max(m, o.pct), 0);
  const maxEventoPct = data.porTipoEvento.reduce((m, o) => Math.max(m, o.pct), 0);
  const maxServicioPct = data.porTipoServicio.reduce((m, o) => Math.max(m, o.pct), 0);
  const conversionPct = data.cotizaciones.totalCreadas > 0
    ? (data.cotizaciones.ventasCerradas / data.cotizaciones.totalCreadas) * 100 : 0;

  const COLORS = [GOLD, BLUE, GREEN, PURP, "#f97316", "#14b8a6"];

  return (
    <Document title={`Reporte de Ventas — ${data.periodo.label}`}>
      <Page size="A3" orientation="landscape" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {data.logoSrc && <Image src={data.logoSrc} style={{ width: 110, height: 28, objectFit: "contain", marginBottom: 8 }} />}
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA DE EVENTOS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>Reporte de Ventas Mensual</Text>
            <Text style={s.docSub}>{data.periodo.label}</Text>
            <Text style={[s.docSub, { marginTop: 3 }]}>Generado: {data.generadoEn ?? new Date().toLocaleDateString("es-MX")}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>
          {/* ── KPI CARDS (fila 1) ─────────────────────────────────────────── */}
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Ventas Generadas</Text>
              <Text style={s.kpiValueGold}>{fmt(data.ventasTotal.monto)}</Text>
              <Text style={s.kpiSub}>{data.ventasTotal.count} {data.ventasTotal.count === 1 ? "evento" : "eventos"} cerrados</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Ticket Promedio</Text>
              <Text style={s.kpiValue}>{fmt(data.ticketPromedio)}</Text>
              <Text style={s.kpiSub}>por evento cerrado</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Cotizaciones vs Cierres</Text>
              <Text style={s.kpiValue}>{data.cotizaciones.totalCreadas} → {data.cotizaciones.ventasCerradas}</Text>
              <Text style={s.kpiSub}>Conversión: {pct(conversionPct)}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Con Proyecto (ejecutadas)</Text>
              <Text style={s.kpiValue}>{data.cotizaciones.conProyecto}</Text>
              <Text style={s.kpiSub}>{data.cotizaciones.sinProyecto} sin proyecto aún</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Clientes Nuevos</Text>
              <Text style={s.kpiValue}>{data.clientesNuevos.count}</Text>
              <Text style={s.kpiSub}>registrados en el período</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Clientes Recurrentes</Text>
              <Text style={s.kpiValue}>{data.clientesRecurrentes.count}</Text>
              <Text style={s.kpiSub}>con eventos previos</Text>
            </View>
          </View>

          {/* ── FILA 2: Tipo evento + Tipo servicio + Origen ───────────────── */}
          <View style={s.sectionRow}>
            {/* Tipo Evento */}
            <View style={[s.section, { flex: 1.2 }]}>
              <Text style={s.sectionTitle}>Por Tipo de Evento</Text>
              {data.porTipoEvento.map((item, i) => (
                <Bar key={item.tipo}
                  label={TIPO_EVENTO_LABEL[item.tipo] ?? item.tipo}
                  count={item.count} monto={item.monto}
                  pct={item.pct} maxPct={maxEventoPct}
                  color={COLORS[i % COLORS.length]}
                />
              ))}
              {data.porTipoEvento.length === 0 && <Text style={s.tableCell}>Sin datos</Text>}
            </View>

            {/* Tipo Servicio */}
            <View style={[s.section, { flex: 1.2 }]}>
              <Text style={s.sectionTitle}>Por Tipo de Servicio</Text>
              <View style={[s.barRow, { marginBottom: 10 }]}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[s.kpiValueGold, { fontSize: 12 }]}>{pct(data.porServicio.rentas.pct)}</Text>
                  <Text style={{ fontSize: 6.5, color: GOLD }}>Rentas</Text>
                  <Text style={{ fontSize: 6, color: LG }}>{data.porServicio.rentas.count} ev.</Text>
                </View>
                <View style={{ width: 1, backgroundColor: DARK2, marginHorizontal: 8 }} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[s.kpiValue, { fontSize: 12, color: BLUE }]}>{pct(data.porServicio.produccion.pct)}</Text>
                  <Text style={{ fontSize: 6.5, color: BLUE }}>Producción</Text>
                  <Text style={{ fontSize: 6, color: LG }}>{data.porServicio.produccion.count} ev.</Text>
                </View>
                {data.porServicio.otro.count > 0 && (
                  <>
                    <View style={{ width: 1, backgroundColor: DARK2, marginHorizontal: 8 }} />
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={[s.kpiValue, { fontSize: 12, color: GRAY }]}>{pct(data.porServicio.otro.pct)}</Text>
                      <Text style={{ fontSize: 6.5, color: GRAY }}>Otro</Text>
                      <Text style={{ fontSize: 6, color: LG }}>{data.porServicio.otro.count} ev.</Text>
                    </View>
                  </>
                )}
              </View>
              {data.porTipoServicio.map((item, i) => (
                <Bar key={item.tipo}
                  label={TIPO_SERVICIO_LABEL[item.tipo] ?? item.tipo}
                  count={item.count} monto={item.monto}
                  pct={item.pct} maxPct={maxServicioPct}
                  color={COLORS[i % COLORS.length]}
                />
              ))}
            </View>

            {/* Origen de Leads */}
            <View style={[s.section, { flex: 1.4 }]}>
              <Text style={s.sectionTitle}>Origen de Leads y Ventas</Text>
              {data.origenLeads.map((item, i) => (
                <Bar key={item.origen}
                  label={ORIGEN_LABEL[item.origen] ?? item.origen}
                  count={item.count} monto={item.monto}
                  pct={item.pct} maxPct={maxOrigenPct}
                  color={COLORS[i % COLORS.length]}
                />
              ))}
              {data.origenLeads.length === 0 && <Text style={s.tableCell}>Sin datos</Text>}
            </View>

            {/* Top 3 Clientes */}
            <View style={[s.section, { flex: 1.4 }]}>
              <Text style={s.sectionTitle}>Top 3 Clientes del Período</Text>
              {data.top3Clientes.map((c, i) => (
                <View key={i} style={s.clientCard}>
                  <Text style={s.clientRank}>{i + 1}</Text>
                  <View style={s.clientInfo}>
                    <Text style={s.clientName}>{c.nombre}</Text>
                    <Text style={s.clientSub}>{c.empresa ?? "—"} · {c.eventos} {c.eventos === 1 ? "evento" : "eventos"}</Text>
                  </View>
                  <Text style={s.clientMonto}>{fmt(c.monto)}</Text>
                </View>
              ))}
              {data.top3Clientes.length === 0 && <Text style={s.tableCell}>Sin datos</Text>}
            </View>
          </View>

          {/* ── ANÁLISIS ──────────────────────────────────────────────────── */}
          <View style={s.analysisSection}>
            <Text style={s.analysisTitle}>Análisis del Responsable de Ventas</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={[s.analysisBlock, { flex: 1.2 }]}>
                <Text style={s.analysisLabel}>Análisis de Resultados</Text>
                <Text style={s.analysisText}>{data.analisis || "—"}</Text>
              </View>
              <View style={[s.analysisBlock, { flex: 1.2 }]}>
                <Text style={s.analysisLabel}>3 Propuestas de Mejora</Text>
                <Text style={s.analysisText}>{data.propuestas || "—"}</Text>
              </View>
              <View style={[s.analysisBlock, { flex: 0.9 }]}>
                <Text style={s.analysisLabel}>Comentarios Finales</Text>
                <Text style={s.analysisText}>{data.comentarios || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRO</Text>
          <Text style={s.footerText}>Reporte de Ventas — {data.periodo.label} · Documento Confidencial</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
