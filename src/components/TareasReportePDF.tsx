import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const BLACK   = "#0a0a0a";
const WHITE   = "#FFFFFF";
const GOLD    = "#B3985B";
const GRAY1   = "#111111";
const GRAY2   = "#333333";
const GRAY3   = "#555555";
const GRAY4   = "#888888";
const GRAY5   = "#cccccc";
const GREEN   = "#16a34a";
const GREEN_LT= "#dcfce7";
const RED     = "#dc2626";
const RED_LT  = "#fee2e2";
const AMBER   = "#d97706";
const AMBER_LT= "#fef3c7";
const BLUE    = "#2563eb";
const BLUE_LT = "#dbeafe";
const VIOLET  = "#7c3aed";
const VIOLET_LT = "#ede9fe";
const CREAM   = "#FAFAF8";
const GRAY_LT = "#f5f5f5";

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
const getMesLabel = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
};

const PRIO_COLOR: Record<string, string> = {
  URGENTE: RED, ALTA: AMBER, MEDIA: GOLD, BAJA: GRAY3,
};
const PRIO_LABEL: Record<string, string> = {
  URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
};
const ESTADO_COLOR: Record<string, string> = {
  COMPLETADA:  GREEN, EN_PROGRESO: BLUE, PENDIENTE: GRAY3, CANCELADA: RED,
};
const ESTADO_LABEL: Record<string, string> = {
  COMPLETADA: "Completada", EN_PROGRESO: "En progreso", PENDIENTE: "Pendiente", CANCELADA: "Cancelada",
};
const AREA_LABEL: Record<string, string> = {
  VENTAS: "Ventas", ADMINISTRACION: "Administración", PRODUCCION: "Producción",
  MARKETING: "Marketing", RRHH: "RRHH", GENERAL: "General", DIRECCION: "Dirección",
};

function fmtFecha(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function perfColor(pct: number): string {
  return pct >= 80 ? GREEN : pct >= 50 ? AMBER : RED;
}

function perfBg(pct: number): string {
  return pct >= 80 ? GREEN_LT : pct >= 50 ? AMBER_LT : RED_LT;
}

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
  header: {
    backgroundColor: BLACK,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerBrand: { fontSize: 11, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  headerTitle: { fontSize: 18, color: WHITE, fontFamily: "Helvetica-Bold", marginTop: 3 },
  headerSub:   { fontSize: 8, color: GRAY4, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerMes:   { fontSize: 20, color: GOLD, fontFamily: "Helvetica-Bold" },

  body:       { paddingHorizontal: 36, paddingTop: 22 },
  cols2:      { flexDirection: "row", gap: 14, marginBottom: 16 },
  col:        { flex: 1 },
  mb4:        { marginBottom: 4 },
  mb8:        { marginBottom: 8 },
  mb12:       { marginBottom: 12 },
  mb16:       { marginBottom: 16 },

  sectionTitle: {
    fontSize: 7.5, color: GOLD, fontFamily: "Helvetica-Bold",
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 8, borderBottomWidth: 1, borderBottomColor: GOLD, paddingBottom: 4,
  },

  // KPI strip
  kpiStrip: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiCard: {
    flex: 1, backgroundColor: CREAM, borderRadius: 6,
    padding: 10, borderWidth: 1, borderColor: GRAY5,
  },
  kpiLabel:  { fontSize: 6.5, color: GRAY3, letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" },
  kpiValue:  { fontSize: 16, color: BLACK, fontFamily: "Helvetica-Bold" },
  kpiGold:   { fontSize: 16, color: GOLD,  fontFamily: "Helvetica-Bold" },
  kpiSub:    { fontSize: 6.5, color: GRAY4, marginTop: 3 },

  // Table
  tableHeader: {
    flexDirection: "row", backgroundColor: BLACK,
    paddingHorizontal: 8, paddingVertical: 5,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  tableHeaderCell: { fontSize: 6.5, color: GRAY4, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row", paddingHorizontal: 8, paddingVertical: 4.5,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  tableRowAlt: {
    flexDirection: "row", paddingHorizontal: 8, paddingVertical: 4.5,
    backgroundColor: CREAM, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  tableTotal: {
    flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: GRAY_LT, borderTopWidth: 1.5, borderTopColor: GRAY2,
    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  cell:      { fontSize: 7.5, color: BLACK },
  cellGray:  { fontSize: 7.5, color: GRAY3 },
  cellBold:  { fontSize: 7.5, color: BLACK, fontFamily: "Helvetica-Bold" },
  cellGold:  { fontSize: 7.5, color: GOLD,  fontFamily: "Helvetica-Bold" },
  cellGreen: { fontSize: 7.5, color: GREEN, fontFamily: "Helvetica-Bold" },
  cellRed:   { fontSize: 7.5, color: RED,   fontFamily: "Helvetica-Bold" },
  cellAmber: { fontSize: 7.5, color: AMBER, fontFamily: "Helvetica-Bold" },

  // Waterfall
  waterfallRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 6 },
  waterfallLabel: { fontSize: 7, color: GRAY2, width: 100 },
  waterfallValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", width: 32, textAlign: "right" },
  barTrack: { height: 5, backgroundColor: "#e5e5e5", borderRadius: 3, flex: 1 },
  barFill:  { height: 5, borderRadius: 3 },

  // Badge
  badge: {
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5,
    fontSize: 6.5, fontFamily: "Helvetica-Bold",
  },

  // Footer
  footer: {
    position: "absolute", bottom: 20, left: 36, right: 36,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 0.5, borderTopColor: GRAY5, paddingTop: 6,
  },
  footerText: { fontSize: 6, color: GRAY4 },

  // Alert
  alertBox: {
    flexDirection: "row", gap: 8, padding: 8, borderRadius: 5,
    borderWidth: 1, marginBottom: 10, alignItems: "flex-start",
  },
  alertIcon: { fontSize: 10, width: 14 },
  alertText: { fontSize: 7, flex: 1, lineHeight: 1.5 },
});

// ─── Página 1: Resumen Ejecutivo ──────────────────────────────────────────────
function Pagina1({ data }: { data: TareasReporteData }) {
  const maxSem = Math.max(...data.semanas.map((s) => s.total), 1);

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerBrand}>MAINSTAGE</Text>
          <Text style={s.headerTitle}>Reporte de Tareas</Text>
          <Text style={s.headerSub}>Rendimiento del Equipo · Dirección General</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerMes}>{data.mesLabel}</Text>
          <Text style={{ fontSize: 7, color: GRAY4, marginTop: 3 }}>
            {data.totalMes} tareas en el período
          </Text>
        </View>
      </View>

      <View style={s.body}>
        {/* KPI Strip */}
        <View style={s.kpiStrip}>
          <View style={[s.kpiCard, { borderColor: pct_color_border(data.pctGeneral) }]}>
            <Text style={s.kpiLabel}>Cumplimiento General</Text>
            <Text style={[s.kpiGold, { color: perfColor(data.pctGeneral) }]}>{data.pctGeneral}%</Text>
            <Text style={s.kpiSub}>{data.completadasMes} de {data.totalMes} tareas</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Completadas</Text>
            <Text style={[s.kpiValue, { color: GREEN }]}>{data.completadasMes}</Text>
            <Text style={s.kpiSub}>En el período</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>En Progreso</Text>
            <Text style={[s.kpiValue, { color: BLUE }]}>{data.enProgresoMes}</Text>
            <Text style={s.kpiSub}>Actualmente activas</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Pendientes</Text>
            <Text style={[s.kpiValue, { color: GRAY3 }]}>{data.pendientesMes}</Text>
            <Text style={s.kpiSub}>Sin iniciar</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: data.totalAtrasadas > 0 ? "#f87171" : GRAY5 }]}>
            <Text style={s.kpiLabel}>Atrasadas</Text>
            <Text style={[s.kpiValue, { color: data.totalAtrasadas > 0 ? RED : GRAY3 }]}>{data.totalAtrasadas}</Text>
            <Text style={s.kpiSub}>Vencidas sin completar</Text>
          </View>
        </View>

        <View style={s.cols2}>
          {/* Col 1: Tendencia semanal */}
          <View style={[s.col, { flex: 1 }]}>
            <Text style={s.sectionTitle}>Tendencia Semanal</Text>

            {data.semanas.map((sem, i) => (
              <View key={i} style={s.waterfallRow}>
                <Text style={[s.waterfallLabel, { width: 90 }]}>{sem.label}</Text>
                <Text style={[s.waterfallValue, { color: perfColor(sem.pct), width: 28 }]}>
                  {sem.pct}%
                </Text>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, {
                      width: sem.total > 0 ? `${(sem.completadas / Math.max(...data.semanas.map(s => s.total), 1)) * 100}%` : 0,
                      backgroundColor: perfColor(sem.pct),
                    }]} />
                  </View>
                </View>
                <Text style={[s.cellGray, { width: 40, textAlign: "right", fontSize: 6.5 }]}>
                  {sem.completadas}/{sem.total}
                </Text>
              </View>
            ))}

            {/* Por prioridad */}
            <View style={{ marginTop: 12 }}>
              <Text style={s.sectionTitle}>Por Prioridad</Text>
              {data.prioridades.map((p) => (
                <View key={p.prioridad} style={s.waterfallRow}>
                  <Text style={[s.waterfallLabel, { width: 60, color: PRIO_COLOR[p.prioridad] ?? GRAY3, fontFamily: "Helvetica-Bold" }]}>
                    {PRIO_LABEL[p.prioridad] ?? p.prioridad}
                  </Text>
                  <Text style={[s.waterfallValue, { color: perfColor(p.pct) }]}>{p.pct}%</Text>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, {
                        width: `${p.pct}%`,
                        backgroundColor: PRIO_COLOR[p.prioridad] ?? GRAY3,
                      }]} />
                    </View>
                  </View>
                  <Text style={[s.cellGray, { width: 40, textAlign: "right", fontSize: 6.5 }]}>
                    {p.completadas}/{p.total}
                  </Text>
                </View>
              ))}
            </View>

            {/* Por área */}
            <View style={{ marginTop: 12 }}>
              <Text style={s.sectionTitle}>Por Área</Text>
              {data.areas.slice(0, 8).map((a) => (
                <View key={a.area} style={s.waterfallRow}>
                  <Text style={[s.waterfallLabel, { width: 90 }]}>{AREA_LABEL[a.area] ?? a.area}</Text>
                  <Text style={[s.waterfallValue, { color: perfColor(a.pct) }]}>{a.pct}%</Text>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${a.pct}%`, backgroundColor: perfColor(a.pct) }]} />
                    </View>
                  </View>
                  <Text style={[s.cellGray, { width: 40, textAlign: "right", fontSize: 6.5 }]}>
                    {a.completadas}/{a.total}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Col 2: Rendimiento por persona */}
          <View style={[s.col, { flex: 1.3 }]}>
            <Text style={s.sectionTitle}>Rendimiento por Persona</Text>

            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 1.4 }]}>Colaborador</Text>
              <Text style={[s.tableHeaderCell, { width: 35, textAlign: "right" }]}>Total</Text>
              <Text style={[s.tableHeaderCell, { width: 35, textAlign: "right" }]}>Comp.</Text>
              <Text style={[s.tableHeaderCell, { width: 35, textAlign: "right" }]}>Pend.</Text>
              <Text style={[s.tableHeaderCell, { width: 35, textAlign: "right" }]}>Atras.</Text>
              <Text style={[s.tableHeaderCell, { width: 40, textAlign: "right" }]}>%</Text>
            </View>

            {data.usuarios.slice(0, 15).map((u, i) => (
              <View key={u.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <View style={{ flex: 1.4 }}>
                  <Text style={s.cellBold}>{u.name}</Text>
                  <Text style={[s.cellGray, { fontSize: 6.5 }]}>{AREA_LABEL[u.area ?? ""] ?? u.area}</Text>
                </View>
                <Text style={[s.cell, { width: 35, textAlign: "right" }]}>{u.total}</Text>
                <Text style={[s.cellGreen, { width: 35, textAlign: "right" }]}>{u.completadas}</Text>
                <Text style={[s.cellGray, { width: 35, textAlign: "right" }]}>{u.pendientes + u.enProgreso}</Text>
                <Text style={[u.atrasadas > 0 ? s.cellRed : s.cellGray, { width: 35, textAlign: "right" }]}>
                  {u.atrasadas > 0 ? u.atrasadas : "—"}
                </Text>
                <Text style={[s.cellBold, { width: 40, textAlign: "right", color: perfColor(u.pct) }]}>
                  {u.pct}%
                </Text>
              </View>
            ))}

            <View style={s.tableTotal}>
              <Text style={[s.cellBold, { flex: 1.4 }]}>TOTALES</Text>
              <Text style={[s.cellBold, { width: 35, textAlign: "right" }]}>{data.totalMes}</Text>
              <Text style={[s.cellGreen, { width: 35, textAlign: "right" }]}>{data.completadasMes}</Text>
              <Text style={[s.cellGray, { width: 35, textAlign: "right" }]}>{data.pendientesMes + data.enProgresoMes}</Text>
              <Text style={[data.totalAtrasadas > 0 ? s.cellRed : s.cellGray, { width: 35, textAlign: "right" }]}>
                {data.totalAtrasadas}
              </Text>
              <Text style={[s.cellGold, { width: 40, textAlign: "right" }]}>{data.pctGeneral}%</Text>
            </View>

            {/* Alertas */}
            {data.totalAtrasadas > 0 && (
              <View style={[s.alertBox, { backgroundColor: RED_LT, borderColor: "#fca5a5", marginTop: 8 }]}>
                <Text style={[s.alertIcon, { color: RED }]}>⚠</Text>
                <Text style={[s.alertText, { color: "#991b1b" }]}>
                  {data.totalAtrasadas} tarea{data.totalAtrasadas !== 1 ? "s" : ""} vencida{data.totalAtrasadas !== 1 ? "s" : ""} sin completar. Requiere atención inmediata de dirección.
                </Text>
              </View>
            )}
            {data.sinResponsable > 0 && (
              <View style={[s.alertBox, { backgroundColor: AMBER_LT, borderColor: "#fcd34d" }]}>
                <Text style={[s.alertIcon, { color: AMBER }]}>ℹ</Text>
                <Text style={[s.alertText, { color: "#92400e" }]}>
                  {data.sinResponsable} tarea{data.sinResponsable !== 1 ? "s" : ""} sin responsable asignado. Se excluyen del cálculo de rendimiento.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>Reporte de Tareas · Dirección General</Text>
        <Text style={s.footerText}>{data.mesLabel} · Confidencial</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Página 2: Detalle por colaborador + Urgentes incompletas ─────────────────
function Pagina2({ data }: { data: TareasReporteData }) {
  const usuariosConPendientes = data.usuarios.filter(
    (u) => u.tareasPendientesDetalle.length > 0 || u.atrasadas > 0
  );

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.headerBrand}>MAINSTAGE</Text>
          <Text style={s.headerTitle}>Tareas Pendientes por Colaborador</Text>
          <Text style={s.headerSub}>{data.mesLabel} · Dirección General</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={[s.headerMes, { fontSize: 14 }]}>
            {data.pendientesMes + data.enProgresoMes} pendientes
          </Text>
        </View>
      </View>

      <View style={s.body}>
        <View style={s.cols2}>
          {/* Urgentes incompletas */}
          {data.urgentesIncompletas.length > 0 && (
            <View style={s.col}>
              <Text style={[s.sectionTitle, { color: RED }]}>🚨 Urgentes Sin Completar</Text>

              <View style={[s.tableHeader, { backgroundColor: "#7f1d1d" }]}>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Tarea</Text>
                <Text style={[s.tableHeaderCell, { width: 70 }]}>Asignado a</Text>
                <Text style={[s.tableHeaderCell, { width: 45, textAlign: "right" }]}>Estado</Text>
                <Text style={[s.tableHeaderCell, { width: 40, textAlign: "right" }]}>Vence</Text>
              </View>

              {data.urgentesIncompletas.map((t, i) => (
                <View key={t.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cellBold}>{t.titulo}</Text>
                    {t.proyecto && <Text style={[s.cellGray, { fontSize: 6.5 }]}>{t.proyecto}</Text>}
                  </View>
                  <Text style={[s.cellGray, { width: 70 }]}>{t.asignadoA}</Text>
                  <Text style={[s.cell, { width: 45, textAlign: "right", color: ESTADO_COLOR[t.estado] ?? GRAY3 }]}>
                    {ESTADO_LABEL[t.estado] ?? t.estado}
                  </Text>
                  <Text style={[s.cell, { width: 40, textAlign: "right", color: t.vence ? RED : GRAY3 }]}>
                    {fmtFecha(t.vence)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Atrasadas */}
          {data.tareasAtrasadasDetalle.length > 0 && (
            <View style={s.col}>
              <Text style={[s.sectionTitle, { color: AMBER }]}>⏰ Tareas Atrasadas</Text>

              <View style={[s.tableHeader, { backgroundColor: "#78350f" }]}>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Tarea</Text>
                <Text style={[s.tableHeaderCell, { width: 60 }]}>Responsable</Text>
                <Text style={[s.tableHeaderCell, { width: 40 }]}>Prioridad</Text>
                <Text style={[s.tableHeaderCell, { width: 40, textAlign: "right" }]}>Venció</Text>
              </View>

              {data.tareasAtrasadasDetalle.slice(0, 14).map((t, i) => (
                <View key={t.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cellBold}>{t.titulo}</Text>
                    {t.proyecto && <Text style={[s.cellGray, { fontSize: 6.5 }]}>{t.proyecto}</Text>}
                  </View>
                  <Text style={[s.cellGray, { width: 60 }]}>{t.asignadoA}</Text>
                  <Text style={[s.cell, { width: 40, color: PRIO_COLOR[t.prioridad] ?? GRAY3 }]}>
                    {PRIO_LABEL[t.prioridad] ?? t.prioridad}
                  </Text>
                  <Text style={[s.cellRed, { width: 40, textAlign: "right" }]}>{fmtFecha(t.vence)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Pendientes por colaborador */}
        {usuariosConPendientes.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Pendientes por Colaborador</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {usuariosConPendientes.slice(0, 8).map((u) => (
                <View key={u.id} style={{
                  width: "31%", backgroundColor: CREAM, borderRadius: 6,
                  padding: 8, borderWidth: 1, borderColor: GRAY5,
                  borderTopWidth: 2, borderTopColor: perfColor(u.pct),
                }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cellBold, { fontSize: 8 }]}>{u.name}</Text>
                      <Text style={[s.cellGray, { fontSize: 6.5 }]}>{u.completadas}/{u.total} · {u.pct}%</Text>
                    </View>
                    <Text style={[s.cellBold, { color: perfColor(u.pct), fontSize: 12 }]}>{u.pct}%</Text>
                  </View>
                  {u.tareasPendientesDetalle.slice(0, 4).map((t, j) => (
                    <View key={t.id} style={{
                      flexDirection: "row", alignItems: "flex-start", gap: 3,
                      paddingVertical: 2, borderTopWidth: j === 0 ? 0.5 : 0, borderTopColor: GRAY5,
                    }}>
                      <View style={{
                        width: 5, height: 5, borderRadius: 3,
                        backgroundColor: PRIO_COLOR[t.prioridad] ?? GRAY3,
                        marginTop: 2,
                      }} />
                      <Text style={[s.cellGray, { flex: 1, fontSize: 6.5, lineHeight: 1.4 }]}>
                        {t.titulo}
                      </Text>
                      {t.vence && (
                        <Text style={[{ fontSize: 6, color: GRAY4, marginTop: 1 }]}>{fmtFecha(t.vence)}</Text>
                      )}
                    </View>
                  ))}
                  {u.tareasPendientesDetalle.length > 4 && (
                    <Text style={[s.cellGray, { fontSize: 6, marginTop: 3 }]}>
                      +{u.tareasPendientesDetalle.length - 4} más
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>Reporte de Tareas · Pendientes por Colaborador</Text>
        <Text style={s.footerText}>{data.mesLabel} · Confidencial</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Helpers internos ─────────────────────────────────────────────────────────
function pct_color_border(pct: number): string {
  return pct >= 80 ? "#86efac" : pct >= 50 ? "#fcd34d" : "#fca5a5";
}

// ─── Documento ────────────────────────────────────────────────────────────────
export function TareasReportePDF({ data }: { data: TareasReporteData }) {
  return (
    <Document
      title={`Reporte de Tareas — ${data.mesLabel}`}
      author="Mainstage"
      subject="Reporte Mensual de Tareas · Dirección General"
    >
      <Pagina1 data={data} />
      {(data.urgentesIncompletas.length > 0 || data.tareasAtrasadasDetalle.length > 0 || data.usuarios.some(u => u.tareasPendientesDetalle.length > 0)) && (
        <Pagina2 data={data} />
      )}
    </Document>
  );
}
