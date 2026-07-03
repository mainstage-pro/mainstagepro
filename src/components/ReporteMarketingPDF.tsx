import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image, Svg,
  Rect, G, Path, Line, Circle,
} from "@react-pdf/renderer";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const DARK   = "#111111";
const GRAY   = "#4a4a4a";
const LIGHT  = "#888888";
const WHITE  = "#FFFFFF";
const CREAM  = "#F7F5F0";
const CREAM2 = "#FFFBF2";

const PLT_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  Facebook:  "#1877F2",
  TikTok:    "#10b981",
  YouTube:   "#ef4444",
};
const ESTADO_COLORS: Record<string, string> = {
  PUBLICADO:  "#10b981",
  EN_PROCESO: "#3b82f6",
  LISTO:      "#f59e0b",
  PENDIENTE:  "#6b7280",
  CANCELADO:  "#ef4444",
};
const ESTADO_LABEL: Record<string, string> = {
  PUBLICADO:  "Publicado",
  EN_PROCESO: "En proceso",
  LISTO:      "Listo",
  PENDIENTE:  "Pendiente",
  CANCELADO:  "Cancelado",
};
const CAMP_EST_COLORS: Record<string, string> = {
  PLANIFICADA:  "#6b7280",
  EN_EJECUCION: "#3b82f6",
  COMPLETADA:   "#10b981",
  CANCELADA:    "#ef4444",
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Página
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },

  // ── Header (igual que cotizaciones) ────────────────────────────────────────
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
  headerLeft: { flexDirection: "column" },
  logo: { width: 120, marginBottom: 6 },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 3,
  },
  tagline: { fontSize: 7.5, color: LIGHT, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 3,
    textAlign: "right",
  },
  headerSub: { fontSize: 8.5, color: LIGHT, textAlign: "right" },

  // Barra dorada
  goldBar: { height: 3, backgroundColor: GOLD },

  // Strip de mes
  mesStrip: {
    backgroundColor: CREAM,
    paddingHorizontal: 40,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1 solid #e0ddd8",
  },
  mesLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK },
  mesGen:   { fontSize: 8, color: LIGHT, fontFamily: "Helvetica-Oblique" },

  // Sección
  section: { paddingHorizontal: 40, marginTop: 18 },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: "1 solid #e0ddd8",
  },
  sectionLine:  { height: 2, width: 18, backgroundColor: GOLD, marginRight: 8 },
  sectionLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // KPI cards
  kpiRow:   { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiCard:  {
    flex: 1,
    backgroundColor: CREAM,
    borderLeft: "3 solid " + GOLD,
    padding: 10,
    borderRadius: 2,
  },
  kpiLabel: { fontSize: 7, color: LIGHT, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: DARK },
  kpiSub:   { fontSize: 7, color: LIGHT, marginTop: 2 },

  // Tabla
  tableWrap: { marginTop: 4 },
  thead: { flexDirection: "row", backgroundColor: BLACK, paddingVertical: 5, paddingHorizontal: 0 },
  theadCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  trow:    { flexDirection: "row", paddingVertical: 4.5, borderBottom: "1 solid #f0ede8" },
  trowAlt: { backgroundColor: CREAM },
  tcell:   { fontSize: 7.5, color: GRAY },
  tcellB:  { fontSize: 7.5, color: DARK, fontFamily: "Helvetica-Bold" },

  // Columnas de tabla de publicaciones
  colFecha:   { width: 62 },
  colNombre:  { flex: 3 },
  colFormato: { width: 46, textAlign: "center" },
  colRedes:   { width: 44, textAlign: "center" },
  colEstado:  { width: 62, textAlign: "center" },
  colCausa:   { flex: 2 },

  // Análisis / comentario
  analisisBox: {
    backgroundColor: CREAM,
    borderLeft: "3 solid " + GOLD,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 2,
  },
  analisisLabel: { fontSize: 7, color: LIGHT, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  analisisText:  { fontSize: 8, color: GRAY, lineHeight: 1.6 },

  // Propuesta
  propuestaBox: {
    backgroundColor: CREAM2,
    border: "1 solid " + GOLD,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 3,
  },
  propuestaTitulo: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  propuestaTexto: { fontSize: 8, color: GRAY, lineHeight: 1.5 },

  // Dot de plataforma
  pltDot: { width: 8, height: 8, borderRadius: 4 },

  // Footer (fijo, igual que cotizaciones)
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: BLACK,
    paddingVertical: 13,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand:  { fontSize: 8.5, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  footerCenter: { fontSize: 7.5, color: LIGHT, textAlign: "center" },
  footerPage:   { fontSize: 7.5, color: "#666", textAlign: "right" },

  // Portada
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: BLACK,
    fontSize: 9,
  },
  coverLogo:      { width: 150, marginBottom: 20 },
  coverBrand:     { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 3, marginBottom: 6 },
  coverTagline:   { fontSize: 9, color: "#666", letterSpacing: 1.5, marginBottom: 40 },
  coverReporte:   { fontSize: 11, color: LIGHT, letterSpacing: 2, marginBottom: 8 },
  coverMes:       { fontSize: 32, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 4 },
  coverTipoLabel: { fontSize: 12, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 30 },
  coverGen:       { fontSize: 8, color: "#444", fontFamily: "Helvetica-Oblique" },
  coverFooter: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    borderTop: "1 solid #222",
    paddingVertical: 16,
    paddingHorizontal: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverFooterText: { fontSize: 7.5, color: "#555", letterSpacing: 0.5 },
});

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface ReporteMarketingData {
  mes: string;
  mesLabel: string;
  tipo: "ejecucion-organica" | "resultados-organicos" | "ejecucion-campanas" | "resultados-campanas";
  logoSrc: string | null;
  publicaciones?: {
    id: string; fecha: string; formato: string | null; objetivo: string | null;
    descripcion: string | null; tipo: { nombre: string; formato: string } | null;
    enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean;
    estado: string; comentarios: string | null;
  }[];
  rpOrganico?: { comentariosGenerales: string | null; logros: string | null } | null;
  metricas?: {
    mes: string; plataforma: string; seguidores: number | null; alcance: number | null;
    impresiones: number | null; interacciones: number | null; guardados: number | null; publicaciones: number | null;
  }[];
  meses3?: string[];
  rpResultados?: {
    analisis: string | null; propuesta1: string | null; propuesta2: string | null;
    propuesta3: string | null; comentariosFinales: string | null;
  } | null;
  ejecuciones?: {
    id: string; nombre: string; objetivo: string | null; canal: string | null;
    fechaInicio: string; fechaFin: string; estado: string; presupuesto: number | null;
    alcance: number | null; impresiones: number | null; clics: number | null;
    ctr: number | null; cantResultados: number | null; costoResultado: number | null;
    tipo: { nombre: string } | null;
  }[];
  rpCampEj?: { comentariosEjecucion: string | null; comentariosFinales: string | null } | null;
  rpCampRes?: {
    analisis: string | null; propuesta1: string | null; propuesta2: string | null;
    propuesta3: string | null; comentariosFinales: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_LABEL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`
       : String(n);
}
function fmxMXN(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fechaCorta(fecha: string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}
function getPlatStr(p: { enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean }): string {
  const r: string[] = [];
  if (p.enFacebook) r.push("FB");
  if (p.enInstagram) r.push("IG");
  if (p.enTiktok) r.push("TT");
  if (p.enYoutube) r.push("YT");
  return r.join(" · ") || "—";
}
function mesLabelShort(mes: string): string {
  const [, m] = mes.split("-");
  return MESES_LABEL[parseInt(m) - 1]?.slice(0, 3) ?? mes;
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

function BarChartPdf({
  data, width = 460, height = 90,
}: { data: { label: string; value: number; color: string }[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const max  = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(34, (width / data.length) - 12);
  const gapX = width / data.length;
  return (
    <Svg width={width} height={height + 28}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * height, 2);
        const x    = i * gapX + (gapX - barW) / 2;
        const y    = height - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} fill={d.color} rx={3} />
            {d.value > 0 && (
              <Text style={{ fontSize: 6.5, fill: "#555", fontFamily: "Helvetica-Bold" } as never}
                x={x + barW / 2} y={y - 4} textAnchor="middle">
                {fmtNum(d.value)}
              </Text>
            )}
            <Text style={{ fontSize: 6.5, fill: LIGHT } as never}
              x={x + barW / 2} y={height + 14} textAnchor="middle">
              {d.label}
            </Text>
          </G>
        );
      })}
      <Line x1={0} y1={height} x2={width} y2={height} stroke="#e0ddd8" strokeWidth={1} />
    </Svg>
  );
}

// Barras agrupadas: total vs publicadas
function GroupedBarPdf({
  data, width = 460, height = 80,
}: { data: { label: string; v1: number; v2: number }[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const max  = Math.max(...data.flatMap(d => [d.v1, d.v2]), 1);
  const slot = width / data.length;
  const bw   = Math.min(22, slot / 2.8);
  const gap  = 3;
  return (
    <Svg width={width} height={height + 32}>
      {data.map((d, i) => {
        const x  = i * slot + (slot - (bw * 2 + gap)) / 2;
        const h1 = Math.max((d.v1 / max) * height, 2);
        const h2 = Math.max((d.v2 / max) * height, 2);
        return (
          <G key={i}>
            <Rect x={x}          y={height - h1} width={bw} height={h1} fill="#c8c4be" rx={2} />
            <Rect x={x + bw + gap} y={height - h2} width={bw} height={h2} fill="#10b981" rx={2} />
            <Text style={{ fontSize: 6.5, fill: LIGHT } as never}
              x={x + bw + gap / 2} y={height + 12} textAnchor="middle">
              {d.label}
            </Text>
          </G>
        );
      })}
      <Line x1={0} y1={height} x2={width} y2={height} stroke="#e0ddd8" strokeWidth={1} />
      {/* leyenda */}
      <Rect x={0}  y={height + 20} width={8} height={6} fill="#c8c4be" rx={1} />
      <Text style={{ fontSize: 6.5, fill: LIGHT } as never} x={12} y={height + 26}>Total</Text>
      <Rect x={44} y={height + 20} width={8} height={6} fill="#10b981" rx={1} />
      <Text style={{ fontSize: 6.5, fill: LIGHT } as never} x={56} y={height + 26}>Publicadas</Text>
    </Svg>
  );
}

// Donut chart
function DonutPdf({ data, size = 90 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2;
  const ro = size * 0.40, ri = size * 0.24;
  let angle = -Math.PI / 2;
  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = angle; angle += sweep;
    return { ...d, start, sweep };
  });
  function arc(startA: number, endA: number) {
    const large = endA - startA > Math.PI ? 1 : 0;
    return [
      `M ${cx + ro * Math.cos(startA)} ${cy + ro * Math.sin(startA)}`,
      `A ${ro} ${ro} 0 ${large} 1 ${cx + ro * Math.cos(endA)} ${cy + ro * Math.sin(endA)}`,
      `L ${cx + ri * Math.cos(endA)} ${cy + ri * Math.sin(endA)}`,
      `A ${ri} ${ri} 0 ${large} 0 ${cx + ri * Math.cos(startA)} ${cy + ri * Math.sin(startA)}`,
      "Z",
    ].join(" ");
  }
  return (
    <Svg width={size} height={size}>
      {slices.map((sl, i) => (
        <Path key={i} d={arc(sl.start, sl.start + sl.sweep)} fill={sl.color} />
      ))}
      {/* círculo central blanco */}
      <Circle cx={cx} cy={cy} r={ri * 0.85} fill={WHITE} />
    </Svg>
  );
}

// Gráfica de líneas simples (tendencia)
function LineChartPdf({
  data, width = 200, height = 60, color = GOLD,
}: { data: { label: string; value: number }[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const max  = Math.max(...data.map(d => d.value), 1);
  const min  = 0;
  const range = max - min || 1;
  const pts  = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (width - 10) + 5,
    y: height - ((d.value - min) / range) * (height - 10) - 5,
  }));
  const path = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  return (
    <Svg width={width} height={height + 16}>
      <Line x1={5} y1={height} x2={width - 5} y2={height} stroke="#e0ddd8" strokeWidth={1} />
      <Path d={path} stroke={color} strokeWidth={2} fill="none" />
      {pts.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={2.5} fill={color} />
          <Text style={{ fontSize: 6, fill: LIGHT } as never} x={p.x} y={height + 12} textAnchor="middle">
            {data[i].label}
          </Text>
        </G>
      ))}
    </Svg>
  );
}

// ─── Componentes reutilizables ────────────────────────────────────────────────

function PageHeader({ logoSrc, titulo, subtitulo }: { logoSrc: string | null; titulo: string; subtitulo: string }) {
  return (
    <>
      <View style={s.header}>
        <View style={s.headerLeft}>
          {logoSrc
            ? <Image src={logoSrc} style={s.logo} />
            : <Text style={s.brand}>MAINSTAGE PRO</Text>
          }
          <Text style={s.tagline}>PRODUCCIÓN DE EVENTOS · AUDIO · ILUMINACIÓN · VIDEO</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>{titulo}</Text>
          <Text style={s.headerSub}>{subtitulo}</Text>
        </View>
      </View>
      <View style={s.goldBar} />
    </>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <View style={s.sectionTitle}>
      <View style={s.sectionLine} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

function PageFooter({ generado, tipo }: { generado: string; tipo: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>MAINSTAGE PRO</Text>
      <Text style={s.footerCenter}>Reporte de Marketing · {tipo} · {generado}</Text>
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function AnalisisBox({ label, text }: { label: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <View style={s.analisisBox}>
      <Text style={s.analisisLabel}>{label}</Text>
      <Text style={s.analisisText}>{text}</Text>
    </View>
  );
}

function PropuestaBox({ num, text }: { num: number; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <View style={s.propuestaBox}>
      <Text style={s.propuestaTitulo}>PROPUESTA DE MEJORA {num}</Text>
      <Text style={s.propuestaTexto}>{text}</Text>
    </View>
  );
}

// ─── PORTADA ─────────────────────────────────────────────────────────────────

const TIPO_COVER_LABELS: Record<string, string> = {
  "ejecucion-organica":   "Ejecución Orgánica",
  "resultados-organicos": "Resultados Orgánicos",
  "ejecucion-campanas":   "Ejecución de Campañas",
  "resultados-campanas":  "Resultados de Campañas",
};
const TIPO_COVER_DESC: Record<string, string> = {
  "ejecucion-organica":   "Publicaciones programadas, rendimiento y análisis de contenido orgánico.",
  "resultados-organicos": "Métricas por plataforma, crecimiento de audiencia y propuestas de mejora.",
  "ejecucion-campanas":   "Campañas activas, presupuesto ejecutado y análisis de ejecución.",
  "resultados-campanas":  "KPIs de campañas, ROI, alcance, impresiones y estrategia.",
};

function CoverPage({ data, gen }: { data: ReporteMarketingData; gen: string }) {
  return (
    <Page size="A4" orientation="landscape" style={s.coverPage}>
      {/* Fondo negro total */}
      <View style={{ flex: 1, paddingHorizontal: 48, paddingTop: 60, paddingBottom: 80 }}>
        {/* Logo / Marca */}
        <View style={{ marginBottom: 48 }}>
          {data.logoSrc
            ? <Image src={data.logoSrc} style={s.coverLogo} />
            : <Text style={s.coverBrand}>MAINSTAGE PRO</Text>
          }
          <Text style={s.coverTagline}>PRODUCCIÓN DE EVENTOS · AUDIO · ILUMINACIÓN · VIDEO</Text>
        </View>

        {/* Línea dorada decorativa */}
        <View style={{ height: 2, backgroundColor: GOLD, width: 60, marginBottom: 28 }} />

        {/* Tipo de reporte */}
        <Text style={s.coverReporte}>REPORTE DE MARKETING</Text>

        {/* Mes grande */}
        <Text style={s.coverMes}>{data.mesLabel}</Text>

        {/* Subtítulo del tipo */}
        <Text style={s.coverTipoLabel}>{TIPO_COVER_LABELS[data.tipo]}</Text>

        {/* Descripción */}
        <View style={{ maxWidth: 320, marginBottom: 32 }}>
          <Text style={{ fontSize: 9, color: "#666", lineHeight: 1.7 }}>
            {TIPO_COVER_DESC[data.tipo]}
          </Text>
        </View>

        {/* Fecha de generación */}
        <Text style={s.coverGen}>Generado el {gen}</Text>
      </View>

      {/* Footer de portada */}
      <View style={s.coverFooter}>
        <Text style={s.coverFooterText}>MAINSTAGE PRO — CONFIDENCIAL</Text>
        <Text style={[s.coverFooterText, { color: GOLD }]}>mainstagepro.mx</Text>
      </View>
    </Page>
  );
}

// ─── Página 1: Ejecución Orgánica ─────────────────────────────────────────────

function PaginaEjecucionOrganica({ d, gen }: { d: ReporteMarketingData; gen: string }) {
  const pubs      = d.publicaciones ?? [];
  const total     = pubs.length;
  const publicadas = pubs.filter(p => p.estado === "PUBLICADO").length;
  const canceladas = pubs.filter(p => p.estado === "CANCELADO").length;
  const noPub      = pubs.filter(p => p.estado !== "PUBLICADO" && p.estado !== "CANCELADO").length;
  const rendimiento = total > 0 ? Math.round((publicadas / total) * 100) : 0;
  const rendColor   = rendimiento >= 80 ? "#10b981" : rendimiento >= 60 ? "#f59e0b" : "#ef4444";

  // Donut por estado
  const estadoCount = pubs.reduce((acc, p) => { acc[p.estado] = (acc[p.estado] || 0) + 1; return acc; }, {} as Record<string, number>);
  const pieData     = Object.entries(estadoCount).map(([k, v]) => ({ label: ESTADO_LABEL[k] ?? k, value: v, color: ESTADO_COLORS[k] ?? "#aaa" }));

  // Barras agrupadas por formato
  const fmtData = ["POST", "REEL", "STORIE", "TIK_TOK"].map(f => ({
    label: f === "TIK_TOK" ? "TikTok" : f.charAt(0) + f.slice(1).toLowerCase(),
    v1:   pubs.filter(p => (p.formato ?? p.tipo?.formato) === f).length,
    v2:   pubs.filter(p => (p.formato ?? p.tipo?.formato) === f && p.estado === "PUBLICADO").length,
  })).filter(x => x.v1 > 0);

  // Barras por plataforma
  const pltData = [
    { label: "IG",   value: pubs.filter(p => p.enInstagram).length, color: PLT_COLORS.Instagram },
    { label: "FB",   value: pubs.filter(p => p.enFacebook).length,  color: PLT_COLORS.Facebook  },
    { label: "TT",   value: pubs.filter(p => p.enTiktok).length,    color: PLT_COLORS.TikTok    },
    { label: "YT",   value: pubs.filter(p => p.enYoutube).length,   color: PLT_COLORS.YouTube   },
  ].filter(x => x.value > 0);

  const noPublicadasList = pubs.filter(p => p.estado !== "PUBLICADO");

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PageHeader logoSrc={d.logoSrc} titulo="REPORTE DE MARKETING" subtitulo={`Ejecución Orgánica — ${d.mesLabel}`} />

      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>Ejecución Orgánica — {d.mesLabel}</Text>
        <Text style={s.mesGen}>Generado: {gen}</Text>
      </View>

      {/* KPIs */}
      <View style={s.section}>
        <SectionTitle label="Resumen del mes" />
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Total programadas</Text>
            <Text style={s.kpiValue}>{total}</Text>
            <Text style={s.kpiSub}>publicaciones</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#10b981" }]}>
            <Text style={s.kpiLabel}>Publicadas</Text>
            <Text style={[s.kpiValue, { color: "#10b981" }]}>{publicadas}</Text>
            <Text style={s.kpiSub}>estado PUBLICADO</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#f59e0b" }]}>
            <Text style={s.kpiLabel}>Pendientes</Text>
            <Text style={[s.kpiValue, { color: "#f59e0b" }]}>{noPub}</Text>
            <Text style={s.kpiSub}>en proceso / listo</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#ef4444" }]}>
            <Text style={s.kpiLabel}>Canceladas</Text>
            <Text style={[s.kpiValue, { color: "#ef4444" }]}>{canceladas}</Text>
            <Text style={s.kpiSub}>no ejecutadas</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: rendColor }]}>
            <Text style={s.kpiLabel}>Rendimiento</Text>
            <Text style={[s.kpiValue, { color: rendColor }]}>{rendimiento}%</Text>
            <Text style={s.kpiSub}>publicadas / total</Text>
          </View>
        </View>
      </View>

      {/* Gráficas */}
      {(pieData.length > 0 || fmtData.length > 0 || pltData.length > 0) && (
        <View style={[s.section, { marginTop: 4 }]}>
          <SectionTitle label="Distribución visual" />
          <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>

            {/* Donut por estado */}
            {pieData.length > 0 && (
              <View style={{ width: 155 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Por estado</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <DonutPdf data={pieData} size={82} />
                  <View style={{ flex: 1 }}>
                    {pieData.map((item, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 4 }}>
                        <View style={[s.pltDot, { width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }]} />
                        <Text style={{ fontSize: 6.5, color: GRAY }}>{item.label}: {item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Barras agrupadas por formato */}
            {fmtData.length > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Total vs. publicadas por formato</Text>
                <GroupedBarPdf data={fmtData} width={170} height={70} />
              </View>
            )}

            {/* Barras por plataforma */}
            {pltData.length > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Pubs. por plataforma</Text>
                <BarChartPdf data={pltData} width={130} height={70} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabla de no publicadas */}
      {noPublicadasList.length > 0 && (
        <View style={[s.section, { marginTop: 10 }]}>
          <SectionTitle label={`Publicaciones no publicadas (${noPublicadasList.length})`} />
          <View style={s.tableWrap}>
            <View style={s.thead}>
              <Text style={[s.theadCell, s.colFecha,   { paddingLeft: 8 }]}>Fecha</Text>
              <Text style={[s.theadCell, s.colNombre,  { paddingLeft: 4 }]}>Publicación</Text>
              <Text style={[s.theadCell, s.colFormato]}>Formato</Text>
              <Text style={[s.theadCell, s.colRedes]}>Redes</Text>
              <Text style={[s.theadCell, s.colEstado]}>Estado</Text>
              <Text style={[s.theadCell, s.colCausa,   { paddingLeft: 4 }]}>Causa</Text>
            </View>
            {noPublicadasList.map((p, i) => {
              const fmt = p.formato ?? p.tipo?.formato ?? "—";
              const fmtColors: Record<string, string> = { POST: "#3b82f6", REEL: "#a855f7", STORIE: "#ec4899", TIK_TOK: "#06b6d4" };
              return (
                <View key={p.id} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
                  <Text style={[s.tcell, s.colFecha, { paddingLeft: 8 }]}>{fechaCorta(p.fecha)}</Text>
                  <View style={[s.colNombre, { paddingLeft: 4 }]}>
                    <Text style={s.tcellB}>{p.tipo?.nombre ?? p.descripcion ?? "—"}</Text>
                    {p.objetivo ? <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{p.objetivo}</Text> : null}
                  </View>
                  <Text style={[s.tcell, s.colFormato, { color: fmtColors[fmt] ?? GRAY }]}>{fmt}</Text>
                  <Text style={[s.tcell, s.colRedes]}>{getPlatStr(p)}</Text>
                  <Text style={[s.tcell, s.colEstado, { color: ESTADO_COLORS[p.estado] ?? GRAY }]}>{ESTADO_LABEL[p.estado] ?? p.estado}</Text>
                  <Text style={[s.tcell, s.colCausa, { paddingLeft: 4, fontFamily: p.comentarios ? "Helvetica" : "Helvetica-Oblique" }]}>
                    {p.comentarios ?? "Sin causa registrada"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Análisis del responsable */}
      {d.rpOrganico && (
        <View style={[s.section, { marginTop: 12 }]}>
          <SectionTitle label="Análisis del responsable" />
          <AnalisisBox label="Resumen ejecutivo de la ejecución" text={d.rpOrganico.comentariosGenerales} />
          <AnalisisBox label="Logros y destacados del mes" text={d.rpOrganico.logros} />
        </View>
      )}

      <PageFooter generado={gen} tipo="Ejecución Orgánica" />
    </Page>
  );
}

// ─── Página 2: Resultados Orgánicos ───────────────────────────────────────────

function PaginaResultadosOrganicos({ d, gen }: { d: ReporteMarketingData; gen: string }) {
  const mets   = d.metricas ?? [];
  const meses3 = d.meses3 ?? [];
  const PLAT   = ["Instagram", "Facebook", "TikTok", "YouTube"];
  const COLS   = ["seguidores", "alcance", "impresiones", "interacciones", "guardados", "publicaciones"] as const;
  const COLSL  = ["Seguidores", "Alcance", "Impresiones", "Interacc.", "Guardados", "Pubs"];

  function getMet(mes: string, plt: string, col: string): number | null {
    const f = mets.find(m => m.mes === mes && m.plataforma === plt);
    return f ? (f[col as keyof typeof f] as number | null) : null;
  }

  const mesMes    = meses3[meses3.length - 1] ?? d.mes;
  const totalSeg  = PLAT.reduce((s, p) => s + (getMet(mesMes, p, "seguidores") ?? 0), 0);
  const totalAlc  = PLAT.reduce((s, p) => s + (getMet(mesMes, p, "alcance") ?? 0), 0);
  const totalInt  = PLAT.reduce((s, p) => s + (getMet(mesMes, p, "interacciones") ?? 0), 0);
  const totalImp  = PLAT.reduce((s, p) => s + (getMet(mesMes, p, "impresiones") ?? 0), 0);

  // Datos para barras comparativas
  const barSeg = meses3.map(m => ({ label: mesLabelShort(m), value: PLAT.reduce((s, p) => s + (getMet(m, p, "seguidores") ?? 0), 0), color: GOLD }));
  const barAlc = meses3.map(m => ({ label: mesLabelShort(m), value: PLAT.reduce((s, p) => s + (getMet(m, p, "alcance") ?? 0), 0), color: "#3b82f6" }));
  const barInt = meses3.map(m => ({ label: mesLabelShort(m), value: PLAT.reduce((s, p) => s + (getMet(m, p, "interacciones") ?? 0), 0), color: "#a855f7" }));

  // Donut por plataforma (seguidores del mes)
  const pltPieData = PLAT.map(plt => ({
    label: plt, value: getMet(mesMes, plt, "seguidores") ?? 0, color: PLT_COLORS[plt] ?? "#888",
  })).filter(x => x.value > 0);

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PageHeader logoSrc={d.logoSrc} titulo="REPORTE DE MARKETING" subtitulo={`Resultados Orgánicos — ${d.mesLabel}`} />

      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>Resultados Orgánicos — {d.mesLabel}</Text>
        <Text style={s.mesGen}>Generado: {gen}</Text>
      </View>

      {/* KPIs globales */}
      <View style={s.section}>
        <SectionTitle label="KPIs del mes" />
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Seguidores totales</Text>
            <Text style={s.kpiValue}>{fmtNum(totalSeg)}</Text>
            <Text style={s.kpiSub}>suma todas las redes</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#10b981" }]}>
            <Text style={s.kpiLabel}>Alcance total</Text>
            <Text style={[s.kpiValue, { color: "#10b981" }]}>{fmtNum(totalAlc)}</Text>
            <Text style={s.kpiSub}>personas alcanzadas</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#3b82f6" }]}>
            <Text style={s.kpiLabel}>Interacciones</Text>
            <Text style={[s.kpiValue, { color: "#3b82f6" }]}>{fmtNum(totalInt)}</Text>
            <Text style={s.kpiSub}>likes + comentarios</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#a855f7" }]}>
            <Text style={s.kpiLabel}>Impresiones</Text>
            <Text style={[s.kpiValue, { color: "#a855f7" }]}>{fmtNum(totalImp)}</Text>
            <Text style={s.kpiSub}>vistas totales</Text>
          </View>
        </View>
      </View>

      {/* Gráficas comparativas */}
      {meses3.length > 0 && (
        <View style={[s.section, { marginTop: 6 }]}>
          <SectionTitle label="Tendencia — últimos 3 meses" />
          <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>

            {/* Donut plataformas */}
            {pltPieData.length > 0 && (
              <View style={{ width: 140 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Seguidores por red</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <DonutPdf data={pltPieData} size={80} />
                  <View>
                    {pltPieData.map((item, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 4 }}>
                        <View style={[s.pltDot, { width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }]} />
                        <Text style={{ fontSize: 6.5, color: GRAY }}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Barras comparativas */}
            {barSeg.length > 1 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 4 }}>Seguidores</Text>
                <BarChartPdf data={barSeg} width={100} height={65} />
              </View>
            )}
            {barAlc.length > 1 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 4 }}>Alcance</Text>
                <BarChartPdf data={barAlc} width={100} height={65} />
              </View>
            )}
            {barInt.length > 1 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 4 }}>Interacciones</Text>
                <BarChartPdf data={barInt} width={100} height={65} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabla por plataforma */}
      <View style={[s.section, { marginTop: 10 }]}>
        <SectionTitle label={`Métricas por plataforma — ${d.mesLabel}`} />
        <View style={s.tableWrap}>
          <View style={s.thead}>
            <Text style={[s.theadCell, { width: 72, paddingLeft: 8 }]}>Plataforma</Text>
            {COLSL.map((c, i) => (
              <Text key={i} style={[s.theadCell, { flex: 1, textAlign: "right", paddingRight: i === COLSL.length - 1 ? 6 : 0 }]}>{c}</Text>
            ))}
          </View>
          {PLAT.map((plt, ri) => {
            const found = mets.find(m => m.mes === mesMes && m.plataforma === plt);
            return (
              <View key={plt} style={[s.trow, ri % 2 === 1 ? s.trowAlt : {}]}>
                <View style={{ width: 72, paddingLeft: 8, flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={[s.pltDot, { backgroundColor: PLT_COLORS[plt] ?? "#888" }]} />
                  <Text style={s.tcellB}>{plt}</Text>
                </View>
                {COLS.map((col, ci) => (
                  <Text key={col} style={[s.tcell, { flex: 1, textAlign: "right", paddingRight: ci === COLS.length - 1 ? 6 : 0 }]}>
                    {fmtNum(found ? (found[col] as number | null) : null)}
                  </Text>
                ))}
              </View>
            );
          })}
          {/* Fila totales */}
          <View style={[s.trow, { backgroundColor: CREAM2, borderTop: "1.5 solid " + GOLD }]}>
            <View style={{ width: 72, paddingLeft: 8 }}>
              <Text style={[s.tcellB, { color: GRAY }]}>TOTAL</Text>
            </View>
            {COLS.map((col, ci) => {
              const tot = PLAT.reduce((sum, plt) => {
                const found = mets.find(m => m.mes === mesMes && m.plataforma === plt);
                return sum + ((found ? (found[col] as number | null) : null) ?? 0);
              }, 0);
              return (
                <Text key={col} style={[s.tcellB, { flex: 1, textAlign: "right", color: GOLD, paddingRight: ci === COLS.length - 1 ? 6 : 0 }]}>
                  {fmtNum(tot)}
                </Text>
              );
            })}
          </View>
        </View>
      </View>

      {/* Análisis y propuestas */}
      {d.rpResultados && (
        <View style={[s.section, { marginTop: 10 }]}>
          <SectionTitle label="Análisis y propuestas de mejora" />
          <AnalisisBox label="Análisis objetivo" text={d.rpResultados.analisis} />
          <PropuestaBox num={1} text={d.rpResultados.propuesta1} />
          <PropuestaBox num={2} text={d.rpResultados.propuesta2} />
          <PropuestaBox num={3} text={d.rpResultados.propuesta3} />
          <AnalisisBox label="Comentarios finales" text={d.rpResultados.comentariosFinales} />
        </View>
      )}

      <PageFooter generado={gen} tipo="Resultados Orgánicos" />
    </Page>
  );
}

// ─── Página 3: Ejecución Campañas ─────────────────────────────────────────────

function PaginaEjecucionCampanas({ d, gen }: { d: ReporteMarketingData; gen: string }) {
  const ejs        = d.ejecuciones ?? [];
  const gastoTotal = ejs.reduce((s, e) => s + (e.presupuesto ?? 0), 0);

  const barData = (["PLANIFICADA", "EN_EJECUCION", "COMPLETADA", "CANCELADA"] as const)
    .map(est => ({
      label: est === "EN_EJECUCION" ? "En ejecución" : est === "PLANIFICADA" ? "Planificada" : est.charAt(0) + est.slice(1).toLowerCase(),
      value: ejs.filter(e => e.estado === est).length,
      color: CAMP_EST_COLORS[est],
    }))
    .filter(x => x.value > 0);

  // Barras por canal
  const canalCount = ejs.reduce((acc, e) => { const c = e.canal ?? "Otro"; acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>);
  const canalBar   = Object.entries(canalCount).map(([label, value]) => ({ label, value, color: GOLD }));

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PageHeader logoSrc={d.logoSrc} titulo="REPORTE DE MARKETING" subtitulo={`Ejecución de Campañas — ${d.mesLabel}`} />

      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>Ejecución de Campañas — {d.mesLabel}</Text>
        <Text style={s.mesGen}>Generado: {gen}</Text>
      </View>

      {/* KPIs */}
      <View style={s.section}>
        <SectionTitle label="Resumen de campañas" />
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Total campañas</Text>
            <Text style={s.kpiValue}>{ejs.length}</Text>
            <Text style={s.kpiSub}>{d.mesLabel}</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#3b82f6" }]}>
            <Text style={s.kpiLabel}>En ejecución</Text>
            <Text style={[s.kpiValue, { color: "#3b82f6" }]}>{ejs.filter(e => e.estado === "EN_EJECUCION").length}</Text>
            <Text style={s.kpiSub}>activas al cierre</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#10b981" }]}>
            <Text style={s.kpiLabel}>Completadas</Text>
            <Text style={[s.kpiValue, { color: "#10b981" }]}>{ejs.filter(e => e.estado === "COMPLETADA").length}</Text>
            <Text style={s.kpiSub}>finalizadas</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: GOLD }]}>
            <Text style={s.kpiLabel}>Presupuesto total</Text>
            <Text style={[s.kpiValue, { color: GOLD, fontSize: 13 }]}>{ejs.length > 0 ? fmxMXN(gastoTotal) : "—"}</Text>
            <Text style={s.kpiSub}>ejecutado</Text>
          </View>
        </View>
      </View>

      {/* Gráficas */}
      {(barData.length > 0 || canalBar.length > 0) && (
        <View style={[s.section, { marginTop: 4 }]}>
          <SectionTitle label="Distribución visual" />
          <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
            {barData.length > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Campañas por estado</Text>
                <BarChartPdf data={barData} width={200} height={70} />
              </View>
            )}
            {canalBar.length > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Campañas por canal</Text>
                <BarChartPdf data={canalBar} width={200} height={70} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabla de campañas */}
      <View style={[s.section, { marginTop: 12 }]}>
        <SectionTitle label="Detalle de campañas" />
        {ejs.length === 0 ? (
          <View style={[s.analisisBox, { borderLeftColor: "#6b7280" }]}>
            <Text style={[s.analisisText, { fontFamily: "Helvetica-Oblique", color: LIGHT }]}>
              No hay campañas registradas para {d.mesLabel}. Los datos se generarán automáticamente cuando se operen campañas en el módulo de Publicidad.
            </Text>
          </View>
        ) : (
          <View style={s.tableWrap}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 3, paddingLeft: 8 }]}>Campaña</Text>
              <Text style={[s.theadCell, { width: 50 }]}>Canal</Text>
              <Text style={[s.theadCell, { width: 72, textAlign: "right" }]}>Presupuesto</Text>
              <Text style={[s.theadCell, { width: 80, textAlign: "center" }]}>Fechas</Text>
              <Text style={[s.theadCell, { width: 62, textAlign: "center" }]}>Estado</Text>
            </View>
            {ejs.map((e, i) => (
              <View key={e.id} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
                <View style={{ flex: 3, paddingLeft: 8 }}>
                  <Text style={s.tcellB}>{e.nombre}</Text>
                  {e.objetivo ? <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{e.objetivo}</Text> : null}
                </View>
                <Text style={[s.tcell, { width: 50 }]}>{e.canal ?? "—"}</Text>
                <Text style={[s.tcellB, { width: 72, textAlign: "right", color: GOLD }]}>{e.presupuesto ? fmxMXN(e.presupuesto) : "—"}</Text>
                <Text style={[s.tcell, { width: 80, textAlign: "center", fontSize: 6.5 }]}>
                  {new Date(e.fechaInicio).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" })}
                  {" → "}
                  {new Date(e.fechaFin).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" })}
                </Text>
                <Text style={[s.tcell, { width: 62, textAlign: "center", color: CAMP_EST_COLORS[e.estado] ?? GRAY }]}>
                  {e.estado.replace(/_/g, " ")}
                </Text>
              </View>
            ))}
            {/* Total */}
            <View style={[s.trow, { backgroundColor: CREAM2, borderTop: "1.5 solid " + GOLD }]}>
              <Text style={[s.tcellB, { flex: 3, paddingLeft: 8 }]}>TOTAL PRESUPUESTO</Text>
              <Text style={[s.tcell, { width: 130 }]} />
              <Text style={[s.tcellB, { width: 72, textAlign: "right", color: GOLD }]}>{fmxMXN(gastoTotal)}</Text>
              <Text style={[s.tcell, { width: 142 }]} />
            </View>
          </View>
        )}
      </View>

      {/* Análisis */}
      {d.rpCampEj && (
        <View style={[s.section, { marginTop: 10 }]}>
          <SectionTitle label="Análisis de ejecución" />
          <AnalisisBox label="Análisis de la ejecución de campañas" text={d.rpCampEj.comentariosEjecucion} />
          <AnalisisBox label="Comentarios finales" text={d.rpCampEj.comentariosFinales} />
        </View>
      )}

      <PageFooter generado={gen} tipo="Ejecución de Campañas" />
    </Page>
  );
}

// ─── Página 4: Resultados Campañas ────────────────────────────────────────────

function PaginaResultadosCampanas({ d, gen }: { d: ReporteMarketingData; gen: string }) {
  const ejs         = d.ejecuciones ?? [];
  const gastoTotal  = ejs.reduce((s, e) => s + (e.presupuesto ?? 0), 0);
  const alcanceTotal = ejs.reduce((s, e) => s + (e.alcance ?? 0), 0);
  const impresTotal  = ejs.reduce((s, e) => s + (e.impresiones ?? 0), 0);
  const ejsCtr       = ejs.filter(e => e.ctr != null);
  const ctrProm      = ejsCtr.length > 0 ? ejsCtr.reduce((s, e) => s + (e.ctr ?? 0), 0) / ejsCtr.length : null;

  // Gráficas de resultados por campaña
  const alcBar = ejs.map(e => ({ label: e.nombre.slice(0, 10), value: e.alcance ?? 0, color: "#3b82f6" }));
  const impBar = ejs.map(e => ({ label: e.nombre.slice(0, 10), value: e.impresiones ?? 0, color: "#a855f7" }));

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PageHeader logoSrc={d.logoSrc} titulo="REPORTE DE MARKETING" subtitulo={`Resultados de Campañas — ${d.mesLabel}`} />

      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>Resultados de Campañas — {d.mesLabel}</Text>
        <Text style={s.mesGen}>Generado: {gen}</Text>
      </View>

      {/* KPIs */}
      <View style={s.section}>
        <SectionTitle label="KPIs globales" />
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Gasto total</Text>
            <Text style={[s.kpiValue, { color: GOLD, fontSize: 13 }]}>{fmxMXN(gastoTotal)}</Text>
            <Text style={s.kpiSub}>presupuesto ejecutado</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#3b82f6" }]}>
            <Text style={s.kpiLabel}>Alcance</Text>
            <Text style={[s.kpiValue, { color: "#3b82f6" }]}>{fmtNum(alcanceTotal)}</Text>
            <Text style={s.kpiSub}>personas alcanzadas</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#a855f7" }]}>
            <Text style={s.kpiLabel}>Impresiones</Text>
            <Text style={[s.kpiValue, { color: "#a855f7" }]}>{fmtNum(impresTotal)}</Text>
            <Text style={s.kpiSub}>vistas totales</Text>
          </View>
          <View style={[s.kpiCard, { borderLeftColor: "#10b981" }]}>
            <Text style={s.kpiLabel}>CTR promedio</Text>
            <Text style={[s.kpiValue, { color: "#10b981" }]}>{ctrProm != null ? `${ctrProm.toFixed(2)}%` : "—"}</Text>
            <Text style={s.kpiSub}>click-through rate</Text>
          </View>
        </View>
      </View>

      {/* Gráficas de resultados */}
      {ejs.length > 0 && (alcBar.some(x => x.value > 0) || impBar.some(x => x.value > 0)) && (
        <View style={[s.section, { marginTop: 6 }]}>
          <SectionTitle label="Comparativa por campaña" />
          <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
            {alcBar.some(x => x.value > 0) && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Alcance</Text>
                <BarChartPdf data={alcBar} width={210} height={70} />
              </View>
            )}
            {impBar.some(x => x.value > 0) && (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 6 }}>Impresiones</Text>
                <BarChartPdf data={impBar} width={210} height={70} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabla de KPIs por campaña */}
      <View style={[s.section, { marginTop: 12 }]}>
        <SectionTitle label="KPIs por campaña" />
        {ejs.length === 0 ? (
          <View style={[s.analisisBox, { borderLeftColor: "#6b7280" }]}>
            <Text style={[s.analisisText, { fontFamily: "Helvetica-Oblique", color: LIGHT }]}>
              No hay campañas con resultados para {d.mesLabel}. Los KPIs se registran en Publicidad → Campañas.
            </Text>
          </View>
        ) : (
          <View style={s.tableWrap}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 2.5, paddingLeft: 8 }]}>Campaña</Text>
              <Text style={[s.theadCell, { width: 58, textAlign: "right" }]}>Gasto</Text>
              <Text style={[s.theadCell, { width: 44, textAlign: "right" }]}>Alcance</Text>
              <Text style={[s.theadCell, { width: 44, textAlign: "right" }]}>Impr.</Text>
              <Text style={[s.theadCell, { width: 34, textAlign: "right" }]}>Clics</Text>
              <Text style={[s.theadCell, { width: 34, textAlign: "right" }]}>CTR</Text>
              <Text style={[s.theadCell, { width: 40, textAlign: "right" }]}>Res.</Text>
              <Text style={[s.theadCell, { width: 56, textAlign: "right", paddingRight: 4 }]}>C/Res.</Text>
            </View>
            {ejs.map((e, i) => (
              <View key={e.id} style={[s.trow, i % 2 === 1 ? s.trowAlt : {}]}>
                <View style={{ flex: 2.5, paddingLeft: 8 }}>
                  <Text style={s.tcellB}>{e.nombre}</Text>
                  {e.tipo ? <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{e.tipo.nombre}</Text> : null}
                </View>
                <Text style={[s.tcellB, { width: 58, textAlign: "right", color: GOLD }]}>{fmxMXN(e.presupuesto)}</Text>
                <Text style={[s.tcell,  { width: 44, textAlign: "right" }]}>{fmtNum(e.alcance)}</Text>
                <Text style={[s.tcell,  { width: 44, textAlign: "right" }]}>{fmtNum(e.impresiones)}</Text>
                <Text style={[s.tcell,  { width: 34, textAlign: "right" }]}>{fmtNum(e.clics)}</Text>
                <Text style={[s.tcell,  { width: 34, textAlign: "right", color: "#3b82f6" }]}>{e.ctr != null ? `${e.ctr.toFixed(2)}%` : "—"}</Text>
                <Text style={[s.tcell,  { width: 40, textAlign: "right", color: "#10b981" }]}>{fmtNum(e.cantResultados)}</Text>
                <Text style={[s.tcell,  { width: 56, textAlign: "right", paddingRight: 4 }]}>{e.costoResultado != null ? fmxMXN(e.costoResultado) : "—"}</Text>
              </View>
            ))}
            {/* Fila totales */}
            <View style={[s.trow, { backgroundColor: CREAM2, borderTop: "1.5 solid " + GOLD }]}>
              <Text style={[s.tcellB, { flex: 2.5, paddingLeft: 8 }]}>TOTALES</Text>
              <Text style={[s.tcellB, { width: 58, textAlign: "right", color: GOLD }]}>{fmxMXN(gastoTotal)}</Text>
              <Text style={[s.tcellB, { width: 44, textAlign: "right" }]}>{fmtNum(alcanceTotal)}</Text>
              <Text style={[s.tcellB, { width: 44, textAlign: "right" }]}>{fmtNum(impresTotal)}</Text>
              <Text style={[s.tcell,  { width: 164 }]} />
            </View>
          </View>
        )}
      </View>

      {/* Análisis y propuestas */}
      {d.rpCampRes && (
        <View style={[s.section, { marginTop: 10 }]}>
          <SectionTitle label="Análisis y propuestas de mejora" />
          <AnalisisBox label="Análisis objetivo de resultados de campaña" text={d.rpCampRes.analisis} />
          <PropuestaBox num={1} text={d.rpCampRes.propuesta1} />
          <PropuestaBox num={2} text={d.rpCampRes.propuesta2} />
          <PropuestaBox num={3} text={d.rpCampRes.propuesta3} />
          <AnalisisBox label="Comentarios finales" text={d.rpCampRes.comentariosFinales} />
        </View>
      )}

      <PageFooter generado={gen} tipo="Resultados de Campañas" />
    </Page>
  );
}

// ─── Documento principal ──────────────────────────────────────────────────────

export function ReporteMarketingPDF({ data }: { data: ReporteMarketingData }) {
  const gen = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Document
      title={`Reporte de Marketing — ${data.mesLabel}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
      subject="Reporte mensual de marketing"
    >
      {/* Portada */}
      <CoverPage data={data} gen={gen} />

      {/* Contenido según pestaña */}
      {data.tipo === "ejecucion-organica"   && <PaginaEjecucionOrganica   d={data} gen={gen} />}
      {data.tipo === "resultados-organicos" && <PaginaResultadosOrganicos  d={data} gen={gen} />}
      {data.tipo === "ejecucion-campanas"   && <PaginaEjecucionCampanas    d={data} gen={gen} />}
      {data.tipo === "resultados-campanas"  && <PaginaResultadosCampanas   d={data} gen={gen} />}
    </Document>
  );
}
