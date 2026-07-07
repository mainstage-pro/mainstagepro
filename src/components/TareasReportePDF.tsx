import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Svg,
  Rect, Line,
} from "@react-pdf/renderer";

// ─── Paleta (misma que ReporteMarketingPDF) ───────────────────────────────────
const GOLD    = "#B3985B";
const BLACK   = "#0a0a0a";
const DARK    = "#111111";
const GRAY    = "#4a4a4a";
const LIGHT   = "#888888";
const WHITE   = "#FFFFFF";
const CREAM   = "#F7F5F0";
const CREAM2  = "#FFFBF2";
const GREEN   = "#16a34a";
const RED     = "#dc2626";
const AMBER   = "#d97706";
const BLUE    = "#2563eb";
const VIOLET  = "#7c3aed";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TareasReporteData {
  mes: string;
  mesLabel: string;
  totalMes: number;
  completadasMes: number;
  enProgresoMes: number;
  pendientesMes: number;
  pctGeneral: number;
  totalAtrasadas: number;
  sinResponsable: number;
  usuarios: {
    id: string; name: string; area: string | null;
    total: number; completadas: number; enProgreso: number;
    pendientes: number; urgentes: number; atrasadas: number; pct: number;
    tareasPendientesDetalle: {
      id: string; titulo: string; prioridad: string;
      estado: string; vence: string | null; proyecto: string | null;
    }[];
  }[];
  prioridades: { prioridad: string; total: number; completadas: number; pct: number }[];
  areas: { area: string; total: number; completadas: number; pct: number }[];
  semanas: { label: string; total: number; completadas: number; pct: number }[];
  urgentesIncompletas: {
    id: string; titulo: string; estado: string;
    asignadoA: string; vence: string | null; proyecto: string | null;
  }[];
  tareasAtrasadasDetalle: {
    id: string; titulo: string; prioridad: string;
    estado: string; vence: string | null;
    asignadoA: string; proyecto: string | null;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const PRIO_COLOR: Record<string, string> = {
  URGENTE: RED, ALTA: AMBER, MEDIA: GOLD, BAJA: LIGHT,
};
const PRIO_LABEL: Record<string, string> = {
  URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};
const AREA_LABEL: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción",
  MARKETING: "Marketing", RRHH: "RRHH", GENERAL: "General", DIRECCION: "Dirección",
};

function perfColor(pct: number): string {
  return pct >= 80 ? GREEN : pct >= 50 ? AMBER : RED;
}

function fmtFecha(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ─── Estilos (misma estructura que ReporteMarketingPDF) ───────────────────────
const s = StyleSheet.create({
  // Página
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 9,
    color: DARK,
  },

  // Header — igual que Marketing
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "column" },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 3,
  },
  tagline: { fontSize: 7, color: LIGHT, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 3,
    textAlign: "right",
  },
  headerSub: { fontSize: 8, color: LIGHT, textAlign: "right" },

  // Barra dorada (signature line igual que Marketing)
  goldBar: { height: 3, backgroundColor: GOLD },

  // Strip de periodo
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
  section: { paddingHorizontal: 40, marginTop: 16 },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: "1 solid #e0ddd8",
  },
  sectionLine:  { height: 2, width: 18, backgroundColor: GOLD, marginRight: 7 },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // KPI cards (igual que Marketing — CREAM con border gold izquierdo)
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14, paddingHorizontal: 40, marginTop: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: CREAM,
    borderLeft: "3 solid " + GOLD,
    padding: 10,
    borderRadius: 2,
  },
  kpiCardAlert: {
    flex: 1,
    backgroundColor: "#fff5f5",
    borderLeft: "3 solid " + RED,
    padding: 10,
    borderRadius: 2,
  },
  kpiCardWarning: {
    flex: 1,
    backgroundColor: "#fffbeb",
    borderLeft: "3 solid " + AMBER,
    padding: 10,
    borderRadius: 2,
  },
  kpiLabel: { fontSize: 7, color: LIGHT, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK },
  kpiSub:   { fontSize: 7, color: LIGHT, marginTop: 2 },

  // Layout 2 cols
  cols2: { flexDirection: "row", paddingHorizontal: 40, gap: 16, marginTop: 4 },
  col:   { flex: 1 },

  // Tabla universal
  tableWrap: { marginTop: 4 },
  thead: {
    flexDirection: "row",
    backgroundColor: BLACK,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  theadCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  trow:     { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: "1 solid #f0ede8" },
  trowAlt:  { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: "1 solid #f0ede8", backgroundColor: CREAM },
  tcell:    { fontSize: 7.5, color: GRAY },
  tcellB:   { fontSize: 7.5, color: DARK, fontFamily: "Helvetica-Bold" },
  tcellGreen: { fontSize: 7.5, color: GREEN, fontFamily: "Helvetica-Bold" },
  tcellRed:   { fontSize: 7.5, color: RED, fontFamily: "Helvetica-Bold" },
  tcellAmber: { fontSize: 7.5, color: AMBER },

  // Progress bar container
  barBg:    { height: 5, backgroundColor: "#e5e5e5", borderRadius: 3, marginTop: 2 },
  barFill:  { height: 5, borderRadius: 3 },

  // Pie de página
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: LIGHT },

  // Cards de colaborador
  userCard: {
    backgroundColor: CREAM2,
    borderRadius: 4,
    padding: 8,
    borderTopWidth: 2,
    marginBottom: 0,
  },
  userCardName:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK },
  userCardSub:   { fontSize: 6.5, color: LIGHT, marginBottom: 4 },
  userTaskRow:   { flexDirection: "row", alignItems: "flex-start", gap: 4, paddingVertical: 2.5, borderTop: "0.5 solid #e0ddd8" },
  userTaskDot:   { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  userTaskText:  { fontSize: 6.5, color: GRAY, flex: 1, lineHeight: 1.4 },
  userTaskFecha: { fontSize: 6, color: LIGHT, marginTop: 1 },
});

// ─── Componentes reutilizables ────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <View style={s.sectionTitle}>
      <View style={s.sectionLine} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

function PageHeader({
  title, sub, rightMain, rightSub
}: { title: string; sub: string; rightMain?: string; rightSub?: string }) {
  const now = new Date();
  const gen = now.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.brand}>MAINSTAGE</Text>
          <Text style={s.tagline}>PRODUCCIÓN · DIRECCIÓN GENERAL</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>{title}</Text>
          <Text style={s.headerSub}>{sub}</Text>
          {rightMain && <Text style={[s.headerSub, { color: GOLD, marginTop: 4, fontSize: 9 }]}>{rightMain}</Text>}
          {rightSub && <Text style={[s.headerSub, { marginTop: 2 }]}>{rightSub}</Text>}
        </View>
      </View>
      <View style={s.goldBar} />
      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>{sub}</Text>
        <Text style={s.mesGen}>Generado el {gen}</Text>
      </View>
    </>
  );
}

function ProgressBarSvg({ pct, width = 100 }: { pct: number; width?: number }) {
  const fill = Math.max(0, Math.min(100, pct));
  const fillW = (fill / 100) * width;
  const color = perfColor(pct);
  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} rx={3} fill="#e5e5e5" />
      {fillW > 0 && <Rect x={0} y={0} width={fillW} height={6} rx={3} fill={color} />}
    </Svg>
  );
}

function WeekBarChart({ semanas }: { semanas: { label: string; total: number; completadas: number; pct: number }[] }) {
  const maxVal = Math.max(...semanas.map(s => s.total), 1);
  const W = 180; // total width
  const H = 70;
  const barW = semanas.length > 0 ? Math.floor((W - (semanas.length - 1) * 4) / semanas.length) : 30;

  return (
    <Svg width={W} height={H + 20}>
      {semanas.map((sem, i) => {
        const x = i * (barW + 4);
        const totalH = Math.max(2, Math.round((sem.total / maxVal) * H));
        const compH  = Math.max(0, Math.round((sem.completadas / maxVal) * H));
        const totalY = H - totalH;
        const compY  = H - compH;

        return (
          <React.Fragment key={i}>
            {/* Total bar (background) */}
            <Rect x={x} y={totalY} width={barW} height={totalH} rx={2} fill="#e5e5e5" />
            {/* Completed bar (foreground) */}
            {compH > 0 && <Rect x={x} y={compY} width={barW} height={compH} rx={2} fill={perfColor(sem.pct)} />}
            {/* Pct label */}
            <Text
              style={{ fontSize: 6, color: LIGHT, textAlign: "center" }}
              x={x + barW / 2}
              y={totalY - 4}
            >
              {sem.pct}%
            </Text>
            {/* Week label */}
            <Text
              style={{ fontSize: 5.5, color: LIGHT }}
              x={x}
              y={H + 8}
            >
              {sem.label.replace("Sem ", "S")}
            </Text>
          </React.Fragment>
        );
      })}
      {/* Baseline */}
      <Line x1={0} y1={H} x2={W} y2={H} strokeWidth={0.5} stroke="#d0cdc8" />
    </Svg>
  );
}

function PageFooter({ left }: { left: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{left}</Text>
      <Text style={s.footerText}>Dirección General · Confidencial</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ─── PÁGINA 1: Resumen Ejecutivo ──────────────────────────────────────────────
function Pagina1({ data }: { data: TareasReporteData }) {
  const hasSemanas = data.semanas.length > 0;

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PageHeader
        title="Reporte de Rendimiento de Tareas"
        sub={data.mesLabel}
        rightMain={`${data.pctGeneral}% completado`}
        rightSub={`${data.totalMes} tareas en el período`}
      />

      {/* KPI Strip */}
      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>Total de Tareas</Text>
          <Text style={s.kpiValue}>{data.totalMes}</Text>
          <Text style={s.kpiSub}>{data.sinResponsable > 0 ? `${data.sinResponsable} sin responsable` : "Todas asignadas"}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>Completadas</Text>
          <Text style={[s.kpiValue, { color: GREEN }]}>{data.completadasMes}</Text>
          <Text style={s.kpiSub}>{data.enProgresoMes} en progreso</Text>
        </View>
        <View style={[s.kpiCard, { borderLeftColor: perfColor(data.pctGeneral) }]}>
          <Text style={s.kpiLabel}>Cumplimiento</Text>
          <Text style={[s.kpiValue, { color: perfColor(data.pctGeneral) }]}>{data.pctGeneral}%</Text>
          <Text style={s.kpiSub}>{data.pctGeneral >= 80 ? "Excelente rendimiento" : data.pctGeneral >= 50 ? "Rendimiento medio" : "Requiere atención"}</Text>
        </View>
        <View style={data.totalAtrasadas > 0 ? s.kpiCardAlert : s.kpiCard}>
          <Text style={s.kpiLabel}>Atrasadas</Text>
          <Text style={[s.kpiValue, { color: data.totalAtrasadas > 0 ? RED : GREEN }]}>{data.totalAtrasadas}</Text>
          <Text style={s.kpiSub}>{data.totalAtrasadas > 0 ? "Vencidas sin completar" : "Sin tareas vencidas"}</Text>
        </View>
        <View style={data.pendientesMes > 0 ? s.kpiCardWarning : s.kpiCard}>
          <Text style={s.kpiLabel}>Pendientes</Text>
          <Text style={[s.kpiValue, { color: AMBER }]}>{data.pendientesMes}</Text>
          <Text style={s.kpiSub}>Sin completar al cierre</Text>
        </View>
      </View>

      {/* Dos columnas: tabla colaboradores | prioridades + semanas */}
      <View style={s.cols2}>

        {/* Columna izquierda: Rendimiento por colaborador */}
        <View style={[s.col, { flex: 1.6 }]}>
          <SectionTitle label="Rendimiento por Colaborador" />
          <View style={s.tableWrap}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 1 }]}>Colaborador</Text>
              <Text style={[s.theadCell, { width: 55 }]}>Área</Text>
              <Text style={[s.theadCell, { width: 32, textAlign: "right" }]}>Total</Text>
              <Text style={[s.theadCell, { width: 38, textAlign: "right" }]}>Complet.</Text>
              <Text style={[s.theadCell, { width: 32, textAlign: "right" }]}>Pendient.</Text>
              <Text style={[s.theadCell, { width: 28, textAlign: "right" }]}>Atras.</Text>
              <Text style={[s.theadCell, { width: 30, textAlign: "right" }]}>%</Text>
              <Text style={[s.theadCell, { width: 72 }]}>  Progreso</Text>
            </View>
            {data.usuarios.map((u, i) => {
              const row = i % 2 === 0 ? s.trow : s.trowAlt;
              const pc = perfColor(u.pct);
              return (
                <View key={u.id} style={row}>
                  <Text style={[s.tcellB, { flex: 1 }]}>{u.name}</Text>
                  <Text style={[s.tcell, { width: 55 }]}>{AREA_LABEL[u.area ?? ""] ?? (u.area ?? "—")}</Text>
                  <Text style={[s.tcell, { width: 32, textAlign: "right" }]}>{u.total}</Text>
                  <Text style={[s.tcellGreen, { width: 38, textAlign: "right" }]}>{u.completadas}</Text>
                  <Text style={[s.tcell, { width: 32, textAlign: "right" }]}>{u.pendientes}</Text>
                  <Text style={[u.atrasadas > 0 ? s.tcellRed : s.tcell, { width: 28, textAlign: "right" }]}>{u.atrasadas > 0 ? u.atrasadas : "—"}</Text>
                  <Text style={[{ fontSize: 7.5, color: pc, fontFamily: "Helvetica-Bold", width: 30, textAlign: "right" }]}>{u.pct}%</Text>
                  <View style={{ width: 72, paddingLeft: 6, paddingTop: 3 }}>
                    <ProgressBarSvg pct={u.pct} width={65} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Columna derecha: Por prioridad + semanas */}
        <View style={[s.col, { flex: 1 }]}>

          {/* Por prioridad */}
          <SectionTitle label="Por Prioridad" />
          <View style={s.tableWrap}>
            {data.prioridades.filter(p => p.total > 0).map((p, i) => (
              <View key={p.prioridad} style={[i % 2 === 0 ? s.trow : s.trowAlt, { alignItems: "center" }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PRIO_COLOR[p.prioridad] ?? LIGHT, marginRight: 6, marginTop: 1 }} />
                <Text style={[s.tcellB, { flex: 1 }]}>{PRIO_LABEL[p.prioridad] ?? p.prioridad}</Text>
                <Text style={[s.tcell, { width: 28, textAlign: "right" }]}>{p.completadas}/{p.total}</Text>
                <Text style={[{ fontSize: 7.5, color: perfColor(p.pct), fontFamily: "Helvetica-Bold", width: 30, textAlign: "right" }]}>{p.pct}%</Text>
                <View style={{ width: 55, paddingLeft: 6, paddingTop: 3 }}>
                  <ProgressBarSvg pct={p.pct} width={48} />
                </View>
              </View>
            ))}
          </View>

          {/* Por área */}
          {data.areas.length > 0 && (
            <>
              <View style={{ marginTop: 12 }}>
                <SectionTitle label="Por Área" />
              </View>
              <View style={s.tableWrap}>
                {data.areas.filter(a => a.total > 0).map((a, i) => (
                  <View key={a.area} style={[i % 2 === 0 ? s.trow : s.trowAlt, { alignItems: "center" }]}>
                    <Text style={[s.tcell, { flex: 1 }]}>{AREA_LABEL[a.area] ?? a.area}</Text>
                    <Text style={[s.tcell, { width: 28, textAlign: "right" }]}>{a.completadas}/{a.total}</Text>
                    <Text style={[{ fontSize: 7.5, color: perfColor(a.pct), fontFamily: "Helvetica-Bold", width: 30, textAlign: "right" }]}>{a.pct}%</Text>
                    <View style={{ width: 55, paddingLeft: 6, paddingTop: 3 }}>
                      <ProgressBarSvg pct={a.pct} width={48} />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Tendencia semanal */}
          {hasSemanas && (
            <>
              <View style={{ marginTop: 12 }}>
                <SectionTitle label="Tendencia Semanal" />
              </View>
              <View style={{ paddingTop: 4, flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
                <WeekBarChart semanas={data.semanas} />
                <View style={{ flex: 1 }}>
                  {data.semanas.map((sem, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={[s.tcell, { fontSize: 7 }]}>{sem.label}</Text>
                      <Text style={[{ fontSize: 7, color: perfColor(sem.pct), fontFamily: "Helvetica-Bold" }]}>{sem.pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <PageFooter left="Rendimiento Mensual de Tareas" />
    </Page>
  );
}

// ─── PÁGINA 2: Tareas No Realizadas ──────────────────────────────────────────
function Pagina2({ data }: { data: TareasReporteData }) {
  const usuariosConPendientes = data.usuarios.filter(u => u.tareasPendientesDetalle.length > 0);
  const totalPendientes = data.pendientesMes + data.enProgresoMes;

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PageHeader
        title="Tareas No Realizadas al Cierre del Período"
        sub={data.mesLabel}
        rightMain={`${totalPendientes} tareas sin completar`}
        rightSub={data.totalAtrasadas > 0 ? `${data.totalAtrasadas} con vencimiento superado` : undefined}
      />

      <View style={s.cols2}>

        {/* Columna izquierda: Urgentes + Atrasadas */}
        <View style={s.col}>

          {/* Urgentes sin completar */}
          {data.urgentesIncompletas.length > 0 && (
            <>
              <SectionTitle label="🚨  Urgentes Sin Completar" />
              <View style={[s.tableWrap, { marginBottom: 14 }]}>
                <View style={[s.thead, { backgroundColor: "#7f1d1d" }]}>
                  <Text style={[s.theadCell, { flex: 1 }]}>Tarea</Text>
                  <Text style={[s.theadCell, { width: 70 }]}>Asignado a</Text>
                  <Text style={[s.theadCell, { width: 45 }]}>Estado</Text>
                  <Text style={[s.theadCell, { width: 40, textAlign: "right" }]}>Vence</Text>
                </View>
                {data.urgentesIncompletas.map((t, i) => (
                  <View key={t.id} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tcellB}>{t.titulo}</Text>
                      {t.proyecto && <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{t.proyecto}</Text>}
                    </View>
                    <Text style={[s.tcell, { width: 70 }]}>{t.asignadoA}</Text>
                    <Text style={[{ fontSize: 7.5, color: AMBER, width: 45 }]}>{t.estado === "EN_PROGRESO" ? "En progreso" : "Pendiente"}</Text>
                    <Text style={[s.tcellRed, { width: 40, textAlign: "right" }]}>{fmtFecha(t.vence)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Tareas atrasadas */}
          {data.tareasAtrasadasDetalle.length > 0 && (
            <>
              <SectionTitle label="⏰  Tareas con Vencimiento Superado" />
              <View style={s.tableWrap}>
                <View style={[s.thead, { backgroundColor: "#78350f" }]}>
                  <Text style={[s.theadCell, { flex: 1 }]}>Tarea</Text>
                  <Text style={[s.theadCell, { width: 65 }]}>Responsable</Text>
                  <Text style={[s.theadCell, { width: 42 }]}>Prioridad</Text>
                  <Text style={[s.theadCell, { width: 42, textAlign: "right" }]}>Venció</Text>
                </View>
                {data.tareasAtrasadasDetalle.slice(0, 16).map((t, i) => (
                  <View key={t.id} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tcellB}>{t.titulo}</Text>
                      {t.proyecto && <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{t.proyecto}</Text>}
                    </View>
                    <Text style={[s.tcell, { width: 65 }]}>{t.asignadoA}</Text>
                    <Text style={[{ fontSize: 7.5, color: PRIO_COLOR[t.prioridad] ?? LIGHT, width: 42 }]}>
                      {PRIO_LABEL[t.prioridad] ?? t.prioridad}
                    </Text>
                    <Text style={[s.tcellRed, { width: 42, textAlign: "right" }]}>{fmtFecha(t.vence)}</Text>
                  </View>
                ))}
                {data.tareasAtrasadasDetalle.length > 16 && (
                  <View style={[s.trow, { backgroundColor: CREAM }]}>
                    <Text style={[s.tcell, { flex: 1, fontFamily: "Helvetica-Oblique" }]}>
                      +{data.tareasAtrasadasDetalle.length - 16} tareas adicionales con vencimiento superado
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {data.urgentesIncompletas.length === 0 && data.tareasAtrasadasDetalle.length === 0 && (
            <View style={{ padding: 20, backgroundColor: CREAM, borderRadius: 4, alignItems: "center" }}>
              <Text style={[s.tcell, { color: GREEN, fontFamily: "Helvetica-Bold", fontSize: 10 }]}>✓</Text>
              <Text style={[s.tcellB, { marginTop: 4 }]}>Sin urgentes ni tareas vencidas</Text>
              <Text style={[s.tcell, { marginTop: 2 }]}>Excelente gestión en el período</Text>
            </View>
          )}
        </View>

        {/* Columna derecha: Pendientes por colaborador */}
        <View style={s.col}>
          {usuariosConPendientes.length > 0 && (
            <>
              <SectionTitle label="Pendientes por Colaborador" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {usuariosConPendientes.slice(0, 9).map(u => (
                  <View key={u.id} style={[s.userCard, {
                    width: "31%",
                    borderTopColor: perfColor(u.pct),
                  }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userCardName}>{u.name}</Text>
                        <Text style={s.userCardSub}>{u.completadas}/{u.total} completadas</Text>
                      </View>
                      <Text style={[{ fontSize: 13, fontFamily: "Helvetica-Bold", color: perfColor(u.pct) }]}>{u.pct}%</Text>
                    </View>
                    <ProgressBarSvg pct={u.pct} width={100} />
                    <View style={{ marginTop: 5 }}>
                      {u.tareasPendientesDetalle.slice(0, 5).map((t, j) => (
                        <View key={t.id} style={[s.userTaskRow, { borderTopWidth: j === 0 ? 0 : 0.5 }]}>
                          <View style={[s.userTaskDot, { backgroundColor: PRIO_COLOR[t.prioridad] ?? LIGHT }]} />
                          <Text style={s.userTaskText}>{t.titulo}</Text>
                          {t.vence && <Text style={s.userTaskFecha}>{fmtFecha(t.vence)}</Text>}
                        </View>
                      ))}
                      {u.tareasPendientesDetalle.length > 5 && (
                        <Text style={[s.userCardSub, { marginTop: 3 }]}>+{u.tareasPendientesDetalle.length - 5} más</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              {usuariosConPendientes.length > 9 && (
                <Text style={[s.tcell, { marginTop: 8, fontFamily: "Helvetica-Oblique" }]}>
                  +{usuariosConPendientes.length - 9} colaboradores adicionales con tareas pendientes
                </Text>
              )}
            </>
          )}

          {usuariosConPendientes.length === 0 && (
            <View style={{ padding: 20, backgroundColor: CREAM, borderRadius: 4, alignItems: "center" }}>
              <Text style={[s.tcell, { color: GREEN, fontFamily: "Helvetica-Bold", fontSize: 10 }]}>✓</Text>
              <Text style={[s.tcellB, { marginTop: 4 }]}>Todos los colaboradores al día</Text>
              <Text style={[s.tcell, { marginTop: 2 }]}>Sin tareas pendientes en el período</Text>
            </View>
          )}
        </View>
      </View>

      <PageFooter left="Tareas No Realizadas" />
    </Page>
  );
}

// ─── Documento ────────────────────────────────────────────────────────────────
export function TareasReportePDF({ data }: { data: TareasReporteData }) {
  const hasPage2 =
    data.urgentesIncompletas.length > 0 ||
    data.tareasAtrasadasDetalle.length > 0 ||
    data.usuarios.some(u => u.tareasPendientesDetalle.length > 0) ||
    data.pendientesMes > 0;

  return (
    <Document
      title={`Reporte de Tareas — ${data.mesLabel}`}
      author="Mainstage"
      subject="Rendimiento Mensual de Tareas · Dirección General"
    >
      <Pagina1 data={data} />
      {hasPage2 && <Pagina2 data={data} />}
    </Document>
  );
}
