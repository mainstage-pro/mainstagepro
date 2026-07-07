import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

// ─── Paleta Marketing-standard ────────────────────────────────────────────────
const GOLD   = "#B3985B";   // acento principal, borders KPI, secciones
const BLACK  = "#0a0a0a";   // fondos header/footer
const DARK   = "#111111";   // texto valores KPI
const GRAY   = "#4a4a4a";   // texto de tablas
const LIGHT  = "#888888";   // etiquetas, subvalores
const WHITE  = "#FFFFFF";   // fondo páginas
const CREAM  = "#F7F5F0";   // fondo KPI cards, mesStrip, filas alternas
const CREAM2 = "#FFFBF2";   // fila totales, propuestas
const GREEN  = "#22c55e";
const RED    = "#ef4444";
const BLUE   = "#3b82f6";

const COLORS = [GOLD, BLUE, GREEN, "#a855f7", "#f97316", "#14b8a6", "#f43f5e"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

const ORIGEN_LABEL: Record<string, string> = {
  META_ADS: "Meta Ads", GOOGLE_ADS: "Google Ads", ORGANICO: "Orgánico",
  RECOMPRA: "Recompra", REFERIDO: "Referido", PROSPECCION: "Prospección", OTRO: "Otro",
};
const TIPO_EVENTO_LABEL: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
const TIPO_SERVICIO_LABEL: Record<string, string> = {
  RENTA: "Renta de Equipo", PRODUCCION_TECNICA: "Producción Técnica",
  DIRECCION_TECNICA: "Dirección Técnica", OTRO: "Otro",
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TipoItem   { tipo: string; count: number; monto: number; pct: number }
interface OrigenItem { origen: string; count: number; monto: number; pct: number }
interface ClienteTop { nombre: string; empresa: string | null; monto: number; eventos: number }
interface VendedorItem { id: string; nombre: string; eventos: number; monto: number }
interface ZonaItem   { zona: string; count: number; monto: number; pct: number }
interface MotivoPerdida { motivo: string; count: number; pct: number }
interface MesHistorico  { mes: string; label: string; count: number; monto: number; perdidos: number }

interface ReporteVentasPDFData {
  periodo: { mes: string; label: string };
  ventasTotal: { count: number; monto: number };
  ticketPromedio: number;
  crecimientoMensual: number | null;
  porTipoEvento: TipoItem[];
  porTipoServicio: TipoItem[];
  cotizaciones: { totalCreadas: number; ventasCerradas: number; conProyecto: number; sinProyecto: number };
  tratosPerdidos: { count: number; montoEstimadoPerdido: number; motivosPerdida: MotivoPerdida[] };
  top3Clientes: ClienteTop[];
  top5Clientes: ClienteTop[];
  clientesRecurrentes: { count: number };
  clientesNuevos: { count: number; lista: { nombre: string; empresa: string | null }[] };
  porServicio: {
    rentas:    { count: number; monto: number; pct: number };
    produccion:{ count: number; monto: number; pct: number };
    otro:      { count: number; monto: number; pct: number };
  };
  origenLeads: OrigenItem[];
  porVendedor: VendedorItem[];
  porZona: ZonaItem[];
  porMesHistorico: MesHistorico[];
  analisis?: string;
  propuestas?: string;
  comentarios?: string;
  logoSrc?: string | null;
  generadoEn?: string;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Página: fondo blanco, padding top para el header que arranca en negativo
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontSize: 8,
    color: DARK,
  },

  // Header negro
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 25,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2 },
  tagline: { fontSize: 6.5, color: LIGHT, letterSpacing: 1, marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  docSub: { fontSize: 7.5, color: LIGHT },

  // Barra dorada 3px
  goldBar: { height: 3, backgroundColor: GOLD },

  // Strip CREAM con mes y fecha
  mesStrip: {
    backgroundColor: CREAM,
    paddingHorizontal: 40,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0ddd8",
  },
  mesStripLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase", letterSpacing: 1 },
  mesStripValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },

  // Body
  body: { paddingHorizontal: 40, paddingTop: 18 },

  // KPI grid — tarjetas CREAM con borde dorado izquierdo
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: CREAM,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: 10,
    borderRadius: 2,
  },
  kpiLabel: { fontSize: 6, color: LIGHT, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 1 },
  kpiValueGold: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 1 },
  kpiValueGreen: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 1 },
  kpiValueRed: { fontSize: 15, fontFamily: "Helvetica-Bold", color: RED, marginBottom: 1 },
  kpiSub: { fontSize: 6, color: GRAY },

  // Badge crecimiento
  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5, fontSize: 6, fontFamily: "Helvetica-Bold", marginTop: 3, alignSelf: "flex-start" },

  // Rows de secciones
  row: { flexDirection: "row", gap: 12, marginBottom: 16 },

  // Section — fondo CREAM con border sutil
  section: {
    backgroundColor: CREAM,
    borderRadius: 2,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0ddd8",
  },

  // Section title: línea GOLD + label uppercase dorado
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e0ddd8",
  },
  sectionBar: { width: 2, height: 10, backgroundColor: GOLD, marginRight: 5 },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1.5 },

  // Barras
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { fontSize: 7, color: GRAY, width: 75 },
  barTrack: { flex: 1, height: 4, backgroundColor: "#e0ddd8", borderRadius: 2, marginHorizontal: 6 },
  barFill: { height: 4, borderRadius: 2 },
  barRight: { fontSize: 6.5, color: GRAY, width: 38, textAlign: "right" },

  // Tabla clientes
  clientRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#e0ddd8" },
  clientRank: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#e0ddd8", width: 20 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK },
  clientSub:  { fontSize: 6, color: GRAY, marginTop: 1 },
  clientMonto:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD },

  // Tendencia mini barras
  trendRow: { flexDirection: "row", gap: 4, alignItems: "flex-end", height: 50, marginBottom: 4 },
  trendBar: { flex: 1, borderRadius: 2 },
  trendLabel: { fontSize: 5.5, color: GRAY, textAlign: "center" },

  // Análisis — fondo CREAM2
  analysisSection: { backgroundColor: CREAM2, borderRadius: 2, padding: 14, borderWidth: 1, borderColor: "#e0ddd8", marginBottom: 16 },
  analysisTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e0ddd8" },
  analysisBlock: { backgroundColor: WHITE, borderRadius: 2, padding: 10, borderWidth: 1, borderColor: "#e0ddd8" },
  analysisLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: LIGHT, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.6 },
  analysisText: { fontSize: 7.5, color: DARK, lineHeight: 1.55 },

  // Footer negro fijo
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5 },
  footerText: { fontSize: 6.5, color: LIGHT },
});

// ─── Título de sección (línea GOLD + label) ───────────────────────────────────
function SectionTitle({ label }: { label: string }) {
  return (
    <View style={s.sectionTitleRow}>
      <View style={s.sectionBar} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

// ─── Barra horizontal ─────────────────────────────────────────────────────────
function Bar({ label, count, monto, pct, maxPct, color }: {
  label: string; count: number; monto: number; pct: number; maxPct: number; color: string;
}) {
  const w = maxPct > 0 ? (pct / maxPct) * 100 : 0;
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${w}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barRight}>{count} · {fmtPct(pct)}</Text>
    </View>
  );
}

function BarMonto({ label, monto, pct, maxMonto, color }: {
  label: string; monto: number; pct: number; maxMonto: number; color: string;
}) {
  const w = maxMonto > 0 ? (monto / maxMonto) * 100 : 0;
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${w}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barRight}>{fmt(monto)}</Text>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReporteVentasMensualPDF({ data }: { data: ReporteVentasPDFData }) {
  const conversionPct = data.cotizaciones.totalCreadas > 0
    ? (data.cotizaciones.ventasCerradas / data.cotizaciones.totalCreadas) * 100 : 0;

  const maxEventoPct   = Math.max(...data.porTipoEvento.map(x => x.pct),   1);
  const maxServicioPct = Math.max(...data.porTipoServicio.map(x => x.pct), 1);
  const maxOrigenPct   = Math.max(...data.origenLeads.map(x => x.pct),     1);
  const maxVendMonto   = Math.max(...data.porVendedor.map(x => x.monto),   1);
  const maxZonaMonto   = Math.max(...data.porZona.map(x => x.monto),       1);
  const maxHistMonto   = Math.max(...data.porMesHistorico.map(x => x.monto), 1);

  const crecOk = data.crecimientoMensual !== null && data.crecimientoMensual >= 0;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* ── HEADER negro ── */}
        <View style={s.header}>
          <View>
            {data.logoSrc
              ? <Image src={data.logoSrc} style={{ width: 90, height: 28, objectFit: "contain" }} />
              : <Text style={s.brand}>MAINSTAGE</Text>}
            <Text style={s.tagline}>AUDIO · ILUMINACIÓN · PRODUCCIÓN</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>Reporte Mensual de Ventas</Text>
            <Text style={s.docSub}>{data.periodo.label}</Text>
            <Text style={[s.docSub, { marginTop: 3 }]}>Generado: {data.generadoEn ?? new Date().toLocaleDateString("es-MX")}</Text>
          </View>
        </View>

        {/* ── Barra GOLD 3px ── */}
        <View style={s.goldBar} />

        {/* ── Strip CREAM ── */}
        <View style={s.mesStrip}>
          <View>
            <Text style={s.mesStripLabel}>Período</Text>
            <Text style={s.mesStripValue}>{data.periodo.label}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.mesStripLabel}>Fecha de generación</Text>
            <Text style={s.mesStripValue}>{data.generadoEn ?? new Date().toLocaleDateString("es-MX")}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── FILA 1: KPIs ── */}
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Ingresos del Mes</Text>
              <Text style={s.kpiValueGold}>{fmt(data.ventasTotal.monto)}</Text>
              <Text style={s.kpiSub}>{data.ventasTotal.count} ventas cerradas</Text>
              {data.crecimientoMensual !== null && (
                <View style={[s.badge, { backgroundColor: crecOk ? "#dcfce7" : "#fee2e2" }]}>
                  <Text style={{ color: crecOk ? "#15803d" : "#b91c1c" }}>{crecOk ? "+" : ""}{data.crecimientoMensual.toFixed(1)}% vs mes anterior</Text>
                </View>
              )}
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Ticket Promedio</Text>
              <Text style={s.kpiValue}>{fmt(data.ticketPromedio)}</Text>
              <Text style={s.kpiSub}>por venta cerrada</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Tasa de Conversión</Text>
              <Text style={s.kpiValueGreen}>{fmtPct(conversionPct)}</Text>
              <Text style={s.kpiSub}>{data.cotizaciones.ventasCerradas} de {data.cotizaciones.totalCreadas} cotizaciones</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Ventas Perdidas</Text>
              <Text style={s.kpiValueRed}>{data.tratosPerdidos.count}</Text>
              <Text style={s.kpiSub}>{data.tratosPerdidos.montoEstimadoPerdido > 0 ? `~${fmt(data.tratosPerdidos.montoEstimadoPerdido)} estimado` : "este período"}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Clientes Nuevos</Text>
              <Text style={s.kpiValue}>{data.clientesNuevos.count}</Text>
              <Text style={s.kpiSub}>primer proyecto en el período</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Clientes Recurrentes</Text>
              <Text style={s.kpiValue}>{data.clientesRecurrentes.count}</Text>
              <Text style={s.kpiSub}>con proyectos previos</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Con Proyecto</Text>
              <Text style={s.kpiValue}>{data.cotizaciones.conProyecto}</Text>
              <Text style={s.kpiSub}>{data.cotizaciones.sinProyecto} sin proyecto aún</Text>
            </View>
          </View>

          {/* ── FILA 2: Tendencia + Top Clientes + Funnel ── */}
          <View style={s.row}>

            {/* Tendencia 6 meses */}
            <View style={[s.section, { flex: 1.8 }]}>
              <SectionTitle label="Tendencia — Últimos 6 Meses" />
              <View style={s.trendRow}>
                {data.porMesHistorico.map((m) => {
                  const h = maxHistMonto > 0 ? (m.monto / maxHistMonto) * 46 : 2;
                  const isCurrent = m.mes === data.periodo.mes;
                  return (
                    <View key={m.mes} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                      <View style={[s.trendBar, { height: Math.max(h, 2), backgroundColor: isCurrent ? GOLD : "#B3985B44" }]} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row" }}>
                {data.porMesHistorico.map(m => (
                  <View key={m.mes} style={{ flex: 1, alignItems: "center" }}>
                    <Text style={s.trendLabel}>{m.label}</Text>
                    <Text style={{ fontSize: 5, color: GRAY }}>{m.count}ev.</Text>
                    {m.perdidos > 0 && <Text style={{ fontSize: 5, color: RED }}>-{m.perdidos}</Text>}
                  </View>
                ))}
              </View>
            </View>

            {/* Top 5 Clientes */}
            <View style={[s.section, { flex: 2 }]}>
              <SectionTitle label="Top Clientes del Período" />
              {data.top5Clientes.map((c, i) => (
                <View key={i} style={s.clientRow}>
                  <Text style={[s.clientRank, { color: i === 0 ? GOLD : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "#e0ddd8" }]}>{i + 1}</Text>
                  <View style={s.clientInfo}>
                    <Text style={s.clientName}>{c.nombre}</Text>
                    <Text style={s.clientSub}>{c.empresa ?? "—"} · {c.eventos} {c.eventos === 1 ? "evento" : "eventos"}</Text>
                  </View>
                  <Text style={s.clientMonto}>{fmt(c.monto)}</Text>
                </View>
              ))}
              {data.top5Clientes.length === 0 && <Text style={{ fontSize: 7, color: GRAY }}>Sin datos</Text>}
            </View>

            {/* Embudo */}
            <View style={[s.section, { flex: 1.4 }]}>
              <SectionTitle label="Embudo de Conversión" />
              {[
                { label: "Cotizaciones", value: data.cotizaciones.totalCreadas, pctVal: 100, color: GRAY },
                { label: "Cierres", value: data.cotizaciones.ventasCerradas, pctVal: conversionPct, color: GOLD },
                { label: "Con proyecto", value: data.cotizaciones.conProyecto, pctVal: data.cotizaciones.totalCreadas > 0 ? (data.cotizaciones.conProyecto / data.cotizaciones.totalCreadas) * 100 : 0, color: GREEN },
                { label: "Perdidos", value: data.tratosPerdidos.count, pctVal: data.cotizaciones.totalCreadas > 0 ? (data.tratosPerdidos.count / data.cotizaciones.totalCreadas) * 100 : 0, color: RED },
              ].map(k => (
                <View key={k.label} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 7, color: LIGHT }}>{k.label}</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK }}>{k.value}</Text>
                      <Text style={{ fontSize: 6.5, color: k.color }}>{fmtPct(k.pctVal)}</Text>
                    </View>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${k.pctVal}%`, backgroundColor: k.color, opacity: 0.85 }]} />
                  </View>
                </View>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: "#e0ddd8", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 6.5, color: LIGHT, textTransform: "uppercase" }}>Conversión global</Text>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD }}>{fmtPct(conversionPct)}</Text>
              </View>
            </View>
          </View>

          {/* ── FILA 3: Mix + Origen + Vendedores + Pérdidas ── */}
          <View style={s.row}>

            {/* Por tipo de evento */}
            <View style={[s.section, { flex: 1.2 }]}>
              <SectionTitle label="Por Tipo de Evento" />
              {data.porTipoEvento.map((item, i) => (
                <Bar key={item.tipo}
                  label={TIPO_EVENTO_LABEL[item.tipo] ?? item.tipo}
                  count={item.count} monto={item.monto}
                  pct={item.pct} maxPct={maxEventoPct}
                  color={COLORS[i % COLORS.length]} />
              ))}
              {data.porTipoEvento.length === 0 && <Text style={{ fontSize: 7, color: GRAY }}>Sin datos</Text>}
            </View>

            {/* Mix servicios */}
            <View style={[s.section, { flex: 1.2 }]}>
              <SectionTitle label="Mix de Servicios" />
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {[
                  { label: "Rentas", val: data.porServicio.rentas, color: GOLD },
                  { label: "Producción", val: data.porServicio.produccion, color: BLUE },
                  ...(data.porServicio.otro.count > 0 ? [{ label: "Otro", val: data.porServicio.otro, color: GRAY }] : []),
                ].map(sv => (
                  <View key={sv.label} style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: sv.color }}>{fmtPct(sv.val.pct)}</Text>
                    <Text style={{ fontSize: 6, color: sv.color }}>{sv.label}</Text>
                    <Text style={{ fontSize: 5.5, color: GRAY }}>{sv.val.count} ev.</Text>
                  </View>
                ))}
              </View>
              {data.porTipoServicio.map((item, i) => (
                <Bar key={item.tipo}
                  label={TIPO_SERVICIO_LABEL[item.tipo] ?? item.tipo}
                  count={item.count} monto={item.monto}
                  pct={item.pct} maxPct={maxServicioPct}
                  color={COLORS[i % COLORS.length]} />
              ))}
            </View>

            {/* Origen leads */}
            <View style={[s.section, { flex: 1.3 }]}>
              <SectionTitle label="Origen de Leads" />
              {data.origenLeads.map((item, i) => (
                <Bar key={item.origen}
                  label={ORIGEN_LABEL[item.origen] ?? item.origen}
                  count={item.count} monto={item.monto}
                  pct={item.pct} maxPct={maxOrigenPct}
                  color={COLORS[i % COLORS.length]} />
              ))}
              {data.origenLeads.length === 0 && <Text style={{ fontSize: 7, color: GRAY }}>Sin datos</Text>}
            </View>

            {/* Vendedores */}
            <View style={[s.section, { flex: 1.3 }]}>
              <SectionTitle label="Rendimiento por Vendedor" />
              {data.porVendedor.map((v, i) => (
                <BarMonto key={v.id}
                  label={v.nombre}
                  monto={v.monto} pct={v.monto > 0 ? (v.monto / data.ventasTotal.monto) * 100 : 0}
                  maxMonto={maxVendMonto}
                  color={COLORS[i % COLORS.length]} />
              ))}
              {data.porVendedor.length === 0 && <Text style={{ fontSize: 7, color: GRAY }}>Sin datos</Text>}
            </View>

            {/* Pérdidas / Zonas */}
            <View style={[s.section, { flex: 1.2 }]}>
              {data.tratosPerdidos.count > 0 ? (
                <>
                  <SectionTitle label={`Motivos de Pérdida (${data.tratosPerdidos.count})`} />
                  {data.tratosPerdidos.motivosPerdida.slice(0, 5).map((m) => (
                    <View key={m.motivo} style={s.barRow}>
                      <Text style={[s.barLabel, { color: LIGHT, width: 80 }]}>{m.motivo}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${m.pct}%`, backgroundColor: RED, opacity: 0.7 }]} />
                      </View>
                      <Text style={[s.barRight, { color: RED }]}>{m.count} · {fmtPct(m.pct)}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <SectionTitle label="Distribución por Zona" />
                  {data.porZona.length > 0
                    ? data.porZona.slice(0, 6).map((z, i) => (
                        <BarMonto key={z.zona} label={z.zona} monto={z.monto}
                          pct={z.pct} maxMonto={maxZonaMonto} color={COLORS[i % COLORS.length]} />
                      ))
                    : <Text style={{ fontSize: 7, color: "#15803d" }}>Sin pérdidas este mes ✓</Text>}
                </>
              )}
            </View>
          </View>

          {/* ── CLIENTES NUEVOS ── */}
          {data.clientesNuevos.lista.length > 0 && (
            <View style={[s.section, { marginBottom: 16 }]}>
              <SectionTitle label={`Clientes Nuevos — Primera vez en el período (${data.clientesNuevos.count})`} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {data.clientesNuevos.lista.slice(0, 12).map((c, i) => (
                  <View key={i} style={{ backgroundColor: WHITE, borderRadius: 2, borderWidth: 1, borderColor: "#e0ddd8", paddingHorizontal: 8, paddingVertical: 5, minWidth: 100 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: BLUE }} />
                      <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: DARK }}>{c.nombre}</Text>
                    </View>
                    {c.empresa && <Text style={{ fontSize: 6, color: GRAY, marginTop: 1, marginLeft: 8 }}>{c.empresa}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── ANÁLISIS DEL RESPONSABLE ── */}
          <View style={s.analysisSection}>
            <View style={s.analysisTitleRow}>
              <View style={s.sectionBar} />
              <Text style={s.sectionLabel}>Análisis del Responsable de Ventas</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View style={[s.analysisBlock, { flex: 1.2 }]}>
                <Text style={s.analysisLabel}>Análisis de Resultados</Text>
                <Text style={s.analysisText}>{data.analisis || "—"}</Text>
              </View>
              <View style={[s.analysisBlock, { flex: 1.2 }]}>
                <Text style={s.analysisLabel}>Propuestas de Mejora</Text>
                <Text style={s.analysisText}>{data.propuestas || "—"}</Text>
              </View>
              <View style={[s.analysisBlock, { flex: 0.9 }]}>
                <Text style={s.analysisLabel}>Comentarios Finales</Text>
                <Text style={s.analysisText}>{data.comentarios || "—"}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* ── FOOTER negro fijo ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>MAINSTAGE PRO</Text>
          <Text style={s.footerText}>Reporte de Ventas — {data.periodo.label} · Documento Confidencial</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
