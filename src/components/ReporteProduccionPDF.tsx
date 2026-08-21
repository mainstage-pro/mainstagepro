import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";
import { getEquipoDisplayName } from "@/lib/equipoNombre";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const DARK  = "#111111";
const GRAY  = "#4a4a4a";
const LIGHT = "#888888";
const WHITE = "#FFFFFF";
const GREEN = "#16a34a";
const RED   = "#dc2626";
const AMBER = "#d97706";
const BLUE  = "#2563eb";

const CREAM  = "#F7F5F0";
const CREAM2 = "#FFFBF2";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 9,
    color: DARK,
  },
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
  logo: { width: 110, marginBottom: 6 },
  brand:      { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline:    { fontSize: 7, color: LIGHT, letterSpacing: 1 },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 3, textAlign: "right" },
  headerSub:   { fontSize: 8, color: LIGHT, textAlign: "right" },
  headerRight: { alignItems: "flex-end" },

  goldBar:  { height: 3, backgroundColor: GOLD },
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

  body: { paddingHorizontal: 40, paddingTop: 16 },

  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 5,
    marginTop: 14,
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

  // KPI grid (Marketing style)
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: CREAM,
    borderLeft: "3 solid " + GOLD,
    padding: 10,
    borderRadius: 2,
  },
  kpiLabel: { fontSize: 7, color: LIGHT, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: DARK },
  kpiSub:   { fontSize: 7, color: LIGHT, marginTop: 2 },

  // Tabla (Marketing style)
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: BLACK, paddingVertical: 5, paddingHorizontal: 10 },
  tableHeaderText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: LIGHT, flex: 1, letterSpacing: 0.8, textTransform: "uppercase" },
  tableRow:     { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: "1 solid #f0ede8" },
  tableRowAlt:  { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: "1 solid #f0ede8", backgroundColor: CREAM },
  tableCell:    { fontSize: 7.5, color: GRAY, flex: 1 },
  tableCellB:   { fontSize: 7.5, color: DARK, fontFamily: "Helvetica-Bold", flex: 1 },
  tableCellSm:  { fontSize: 7, color: GRAY, flex: 0.7 },
  tableCellSub: { fontSize: 6.5, color: LIGHT, marginTop: 1 },

  // Pills (updated for light bg)
  pillGreen:  { backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  pillRed:    { backgroundColor: "#fee2e2", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  pillAmber:  { backgroundColor: "#fef3c7", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  pillGray:   { backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  pillText:   { fontSize: 6.5, fontFamily: "Helvetica-Bold" },

  // Notas / Análisis
  notaBox: {
    backgroundColor: CREAM2,
    borderLeft: "3 solid " + GOLD,
    borderRadius: 2,
    padding: 8,
    marginBottom: 6,
  },
  notaLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.8 },
  notaText:  { fontSize: 7.5, color: GRAY, lineHeight: 1.5 },

  // Footer (Marketing style — barra negra fija en la parte inferior)
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

  separator: { height: 1, backgroundColor: "#e0ddd8", marginVertical: 8 },
  emptyText: { fontSize: 8, color: LIGHT, fontFamily: "Helvetica-Oblique" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function fmtMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtPeso(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
}

// ─── Header + Footer compartidos (Marketing style) ───────────────────────────
function PdfHeader({ mesLabel, seccion }: { mesLabel: string; seccion: string }) {
  const gen = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.brand}>MAINSTAGE</Text>
          <Text style={s.tagline}>PRODUCCIÓN · DIRECCIÓN GENERAL</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>Reporte de Producción</Text>
          <Text style={s.headerSub}>{seccion}</Text>
          <Text style={[s.headerSub, { color: GOLD, marginTop: 4 }]}>{mesLabel}</Text>
        </View>
      </View>
      <View style={s.goldBar} />
      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>{mesLabel} · {seccion}</Text>
        <Text style={s.mesGen}>Generado el {gen}</Text>
      </View>
    </>
  );
}

function PdfFooter({ mes, seccion }: { mes: string; seccion: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Reporte de Producción · {seccion}</Text>
      <Text style={s.footerText}>{fmtMes(mes)} · Confidencial</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
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

// ─── TIPOS ───────────────────────────────────────────────────────────────────
export interface ReporteProduccionPDFData {
  mes: string;
  mesLabel: string;
  seccion: "checklist" | "equipos" | "inventario" | "vehiculos" | "proyectos";
  logoSrc: string | null;
  // por sección
  checklist?: {
    kpis: { semanasTotales: number; semanasCompletadas: number; semanasConAlertas: number };
    checklists: Array<{
      semana: string; estado: string;
      stats: { total: number; enBodega: number; enRenta: number; cumplimiento: number; extraviados: number; perdidos: number };
      alertas: Array<{ descripcion: string; estado: string; equipo: { descripcion: string; marca?: string | null; modelo?: string | null } | null }>;
      notas: string | null;
    }>;
    analisis?: string; propuesta?: string; comentarios?: string;
  };
  equipos?: {
    kpis: { totalRevisiones: number; equiposRevisados: number; equiposConFalla: number; equiposEnMantenimiento: number; totalCostoReparaciones: number };
    equiposPorEquipo: Array<{
      equipo: { descripcion: string; marca?: string | null; modelo?: string | null; categoria?: { nombre: string } | null };
      revisiones: Array<{ fecha: string; tipo: string; accionRealizada: string; costoReparacion?: number | null; comentarios?: string | null }>;
      costoTotal: number; tuvoBajaFalla: boolean;
    }>;
    analisis?: string; propuesta?: string; comentarios?: string;
  };
  inventario?: {
    kpis: { altas: number; bajas: number; delta: number };
    altas: Array<{ descripcion: string; marca?: string | null; modelo?: string | null; tipo: string; categoria?: { nombre: string } | null; createdAt?: string }>;
    bajas: Array<{ descripcion: string; marca?: string | null; modelo?: string | null; tipo: string; categoria?: { nombre: string } | null; fechaBaja?: string | null }>;
    estadoActual: Record<string, number>;
    analisis?: string; propuesta?: string; comentarios?: string;
  };
  vehiculos?: {
    totalRegistros: number; totalCosto: number;
    vehiculos: Array<{
      vehiculo: { nombre: string; marca?: string | null; modelo?: string | null; placas?: string | null };
      registros: Array<{ fecha: string; tipoRegistro: string; servicio: string; costo?: number | null; km?: number | null; prioridad: string; estatus: string }>;
      costoTotal: number;
    }>;
    analisis?: string; propuesta?: string; comentarios?: string;
  };
  proyectos?: {
    kpis: { total: number; renta: number; produccion: number; completados: number; promedioAvance: number; promedioCalificacion: number | null };
    lista: Array<{
      id: string;
      numeroProyecto: string; nombre: string; estado: string; tipoEvento: string; fechaEvento: string;
      avance: number; encargado?: { name: string } | null; zona: string;
      checklist: { total: number; completados: number; porcentaje: number };
      cierreFinanciero?: { granTotalEstimado?: number | null; totalCobrado?: number | null; utilidadReal?: number | null } | null;
      evaluacionInterna?: { promedioCalculado?: number | null } | null;
    }>;
    analisis?: string; propuesta?: string; comentarios?: string;
  };
}

// ─── SECCIONES PDF ────────────────────────────────────────────────────────────

function SeccionChecklistPDF({ data }: { data: NonNullable<ReporteProduccionPDFData["checklist"]> }) {
  return (
    <>
      {/* KPIs */}
      <SectionTitle label="Indicadores del mes" />
      <View style={s.kpiRow}>
        {[
          { label: "Semanas totales", value: data.kpis.semanasTotales },
          { label: "Completadas",     value: data.kpis.semanasCompletadas },
          { label: "Con alertas",     value: data.kpis.semanasConAlertas },
          { label: "Total faltantes", value: data.checklists.reduce((a, c) => a + c.alertas.length, 0) },
        ].map(k => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={s.kpiValue}>{k.value}</Text>
          </View>
        ))}
      </View>

      {/* Tabla de semanas */}
      <SectionTitle label="Detalle por semana" />
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { flex: 1.4 }]}>Semana</Text>
          <Text style={s.tableHeaderText}>Estado</Text>
          <Text style={s.tableHeaderText}>Cumpl.</Text>
          <Text style={s.tableHeaderText}>En bodega</Text>
          <Text style={s.tableHeaderText}>Faltantes</Text>
        </View>
        {data.checklists.map(cl => (
          <View key={cl.semana} style={s.tableRow}>
            <Text style={[s.tableCell, { flex: 1.4 }]}>{cl.semana}</Text>
            <Text style={s.tableCell}>{cl.estado.replace("_", " ")}</Text>
            <Text style={s.tableCell}>{cl.stats.cumplimiento}%</Text>
            <Text style={s.tableCell}>{cl.stats.enBodega}</Text>
            <Text style={s.tableCell}>{cl.alertas.length}</Text>
          </View>
        ))}
      </View>

      {/* Faltantes */}
      {data.checklists.some(c => c.alertas.length > 0) && (
        <>
          <SectionTitle label="Equipos faltantes" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 1.5 }]}>Semana</Text>
              <Text style={[s.tableHeaderText, { flex: 2 }]}>Equipo</Text>
              <Text style={s.tableHeaderText}>Estado</Text>
            </View>
            {data.checklists.flatMap(cl =>
              cl.alertas.map((a, i) => (
                <View key={`${cl.semana}-${i}`} style={s.tableRow}>
                  <Text style={[s.tableCell, { flex: 1.5 }]}>{cl.semana}</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={s.tableCell}>{a.equipo ? getEquipoDisplayName(a.equipo) : a.descripcion}</Text>
                    {a.equipo && (a.equipo.marca || a.equipo.modelo) && (
                      <Text style={s.tableCellSub}>{a.equipo.descripcion}</Text>
                    )}
                  </View>
                  <Text style={s.tableCell}>{a.estado}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Notas / análisis */}
      {data.analisis && (
        <View style={s.notaBox}>
          <Text style={s.notaLabel}>Análisis de cumplimiento</Text>
          <Text style={s.notaText}>{data.analisis}</Text>
        </View>
      )}
      {data.propuesta && (
        <View style={s.notaBox}>
          <Text style={s.notaLabel}>Propuestas de mejora</Text>
          <Text style={s.notaText}>{data.propuesta}</Text>
        </View>
      )}
      {data.comentarios && (
        <View style={s.notaBox}>
          <Text style={s.notaLabel}>Comentarios finales</Text>
          <Text style={s.notaText}>{data.comentarios}</Text>
        </View>
      )}
    </>
  );
}

function SeccionEquiposPDF({ data }: { data: NonNullable<ReporteProduccionPDFData["equipos"]> }) {
  const TIPO_COLOR: Record<string, string> = { PREVENTIVO: BLUE, CORRECTIVO: RED, ESTETICO: "#7c3aed", FUNCIONAL: AMBER };
  return (
    <>
      <SectionTitle label="Indicadores del mes" />
      <View style={s.kpiRow}>
        {[
          { label: "Revisiones del mes",  value: data.kpis.totalRevisiones },
          { label: "Equipos revisados",   value: data.kpis.equiposRevisados },
          { label: "Con falla",           value: data.kpis.equiposConFalla },
          { label: "En reparación",       value: data.kpis.equiposEnMantenimiento },
        ].map(k => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={s.kpiValue}>{k.value}</Text>
          </View>
        ))}
      </View>
      {data.kpis.totalCostoReparaciones > 0 && (
        <View style={[s.kpiCard, { marginBottom: 10 }]}>
          <Text style={s.kpiLabel}>Costo total de reparaciones</Text>
          <Text style={[s.kpiValue, { color: "#ea580c" }]}>{fmtPeso(data.kpis.totalCostoReparaciones)}</Text>
        </View>
      )}

      <SectionTitle label="Registro de revisiones" />
      {data.equiposPorEquipo.length === 0 ? (
        <Text style={s.emptyText}>No hay revisiones en este mes.</Text>
      ) : (
        data.equiposPorEquipo.map(({ equipo, revisiones, costoTotal, tuvoBajaFalla }) => (
          <View key={equipo.descripcion} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f9fafb", padding: 6, borderRadius: 3, marginBottom: 2 }}>
              <View>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: tuvoBajaFalla ? RED : BLACK }}>
                  {getEquipoDisplayName(equipo)}
                  {equipo.categoria ? `  [${equipo.categoria.nombre}]` : ""}
                </Text>
                {(equipo.marca || equipo.modelo) && (
                  <Text style={{ fontSize: 6.5, color: LIGHT, marginTop: 1 }}>{equipo.descripcion}</Text>
                )}
              </View>
              <Text style={{ fontSize: 7.5, color: costoTotal > 0 ? "#ea580c" : LIGHT }}>
                {revisiones.length} rev.{costoTotal > 0 ? `  ·  ${fmtPeso(costoTotal)}` : ""}
              </Text>
            </View>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.tableHeaderText}>Fecha</Text>
                <Text style={s.tableHeaderText}>Tipo</Text>
                <Text style={[s.tableHeaderText, { flex: 2 }]}>Acción realizada</Text>
                <Text style={s.tableHeaderText}>Costo</Text>
              </View>
              {revisiones.map((r, i) => (
                <View key={i} style={s.tableRow}>
                  <Text style={s.tableCell}>{fmtFecha(r.fecha)}</Text>
                  <Text style={[s.tableCell, { color: TIPO_COLOR[r.tipo] ?? GRAY }]}>{r.tipo}</Text>
                  <Text style={[s.tableCell, { flex: 2 }]}>{r.accionRealizada}</Text>
                  <Text style={s.tableCell}>{r.costoReparacion ? fmtPeso(r.costoReparacion) : "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      {data.analisis    && <View style={s.notaBox}><Text style={s.notaLabel}>Análisis de mantenimiento</Text><Text style={s.notaText}>{data.analisis}</Text></View>}
      {data.propuesta   && <View style={s.notaBox}><Text style={s.notaLabel}>Propuestas de mejora</Text><Text style={s.notaText}>{data.propuesta}</Text></View>}
      {data.comentarios && <View style={s.notaBox}><Text style={s.notaLabel}>Comentarios finales</Text><Text style={s.notaText}>{data.comentarios}</Text></View>}
    </>
  );
}

function SeccionInventarioPDF({ data }: { data: NonNullable<ReporteProduccionPDFData["inventario"]> }) {
  const totalGeneral = Object.values(data.estadoActual).reduce((a, v) => a + v, 0);
  return (
    <>
      <SectionTitle label="Indicadores del mes" />
      <View style={s.kpiRow}>
        {[
          { label: "Altas",      value: `+${data.kpis.altas}`,  color: GREEN },
          { label: "Bajas",      value: `-${data.kpis.bajas}`,  color: RED },
          { label: "Delta",      value: data.kpis.delta >= 0 ? `+${data.kpis.delta}` : String(data.kpis.delta), color: data.kpis.delta >= 0 ? GREEN : RED },
          { label: "Total activos", value: data.estadoActual["ACTIVO"] ?? 0, color: BLACK },
        ].map(k => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={[s.kpiValue, { color: k.color ?? BLACK }]}>{k.value}</Text>
          </View>
        ))}
      </View>

      {/* Estado actual */}
      <SectionTitle label="Estado actual del inventario" />
      <View style={[s.kpiRow, { marginBottom: 12 }]}>
        {Object.entries(data.estadoActual).map(([estado, qty]) => (
          <View key={estado} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{estado.replace(/_/g, " ")}</Text>
            <Text style={s.kpiValue}>{qty}</Text>
            <Text style={[s.kpiLabel, { marginTop: 2 }]}>{totalGeneral > 0 ? Math.round((qty / totalGeneral) * 100) : 0}%</Text>
          </View>
        ))}
      </View>

      {data.altas.length > 0 && (
        <>
          <SectionTitle label="Altas del mes ({data.altas.length})" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 2 }]}>Equipo</Text>
              <Text style={s.tableHeaderText}>Tipo</Text>
              <Text style={s.tableHeaderText}>Categoría</Text>
              <Text style={s.tableHeaderText}>Fecha</Text>
            </View>
            {data.altas.map((e, i) => (
              <View key={i} style={s.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={s.tableCell}>{getEquipoDisplayName(e)}</Text>
                  {(e.marca || e.modelo) && <Text style={s.tableCellSub}>{e.descripcion}</Text>}
                </View>
                <Text style={s.tableCell}>{e.tipo}</Text>
                <Text style={s.tableCell}>{e.categoria?.nombre ?? "—"}</Text>
                <Text style={s.tableCell}>{e.createdAt ? fmtFecha(e.createdAt) : "—"}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {data.bajas.length > 0 && (
        <>
          <SectionTitle label="Bajas del mes ({data.bajas.length})" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 2 }]}>Equipo</Text>
              <Text style={s.tableHeaderText}>Tipo</Text>
              <Text style={s.tableHeaderText}>Categoría</Text>
              <Text style={s.tableHeaderText}>Fecha baja</Text>
            </View>
            {data.bajas.map((e, i) => (
              <View key={i} style={s.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={s.tableCell}>{getEquipoDisplayName(e)}</Text>
                  {(e.marca || e.modelo) && <Text style={s.tableCellSub}>{e.descripcion}</Text>}
                </View>
                <Text style={s.tableCell}>{e.tipo}</Text>
                <Text style={s.tableCell}>{e.categoria?.nombre ?? "—"}</Text>
                <Text style={s.tableCell}>{e.fechaBaja ? fmtFecha(e.fechaBaja) : "—"}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {data.analisis    && <View style={s.notaBox}><Text style={s.notaLabel}>Análisis</Text><Text style={s.notaText}>{data.analisis}</Text></View>}
      {data.comentarios && <View style={s.notaBox}><Text style={s.notaLabel}>Comentarios finales</Text><Text style={s.notaText}>{data.comentarios}</Text></View>}
    </>
  );
}

function SeccionVehiculosPDF({ data }: { data: NonNullable<ReporteProduccionPDFData["vehiculos"]> }) {
  return (
    <>
      <SectionTitle label="Indicadores del mes" />
      <View style={s.kpiRow}>
        {[
          { label: "Total registros", value: data.totalRegistros },
          { label: "Vehículos",       value: data.vehiculos.length },
          { label: "Costo total",     value: fmtPeso(data.totalCosto) },
        ].map(k => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={[s.kpiValue, { fontSize: 11 }]}>{k.value}</Text>
          </View>
        ))}
      </View>

      {data.vehiculos.map(({ vehiculo, registros, costoTotal }) => (
        <View key={vehiculo.nombre} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f9fafb", padding: 6, borderRadius: 3, marginBottom: 2 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {vehiculo.marca ? `${vehiculo.marca} ` : ""}{vehiculo.modelo ? `${vehiculo.modelo} · ` : ""}{vehiculo.nombre}
              {vehiculo.placas ? `  [${vehiculo.placas}]` : ""}
            </Text>
            {costoTotal > 0 && <Text style={{ fontSize: 7.5, color: "#ea580c" }}>{fmtPeso(costoTotal)}</Text>}
          </View>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.tableHeaderText}>Fecha</Text>
              <Text style={s.tableHeaderText}>Tipo</Text>
              <Text style={[s.tableHeaderText, { flex: 2 }]}>Servicio</Text>
              <Text style={s.tableHeaderText}>Km</Text>
              <Text style={s.tableHeaderText}>Costo</Text>
              <Text style={s.tableHeaderText}>Estatus</Text>
            </View>
            {registros.map((r, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableCell}>{fmtFecha(r.fecha)}</Text>
                <Text style={s.tableCell}>{r.tipoRegistro}</Text>
                <Text style={[s.tableCell, { flex: 2 }]}>{r.servicio}</Text>
                <Text style={s.tableCell}>{r.km ? `${r.km.toLocaleString()} km` : "—"}</Text>
                <Text style={s.tableCell}>{r.costo ? fmtPeso(r.costo) : "—"}</Text>
                <Text style={s.tableCell}>{r.estatus}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {data.analisis    && <View style={s.notaBox}><Text style={s.notaLabel}>Análisis</Text><Text style={s.notaText}>{data.analisis}</Text></View>}
      {data.comentarios && <View style={s.notaBox}><Text style={s.notaLabel}>Comentarios finales</Text><Text style={s.notaText}>{data.comentarios}</Text></View>}
    </>
  );
}

function SeccionProyectosPDF({ data }: { data: NonNullable<ReporteProduccionPDFData["proyectos"]> }) {
  const ESTADO_COLOR: Record<string, string> = { COMPLETADO: GREEN, EN_PROGRESO: BLUE, CANCELADO: RED, PENDIENTE: AMBER };
  return (
    <>
      <SectionTitle label="Indicadores del mes" />
      <View style={s.kpiRow}>
        {[
          { label: "Total proyectos",   value: data.kpis.total },
          { label: "Completados",       value: data.kpis.completados },
          { label: "Promedio avance",   value: `${data.kpis.promedioAvance}%` },
          { label: "Promedio calif.",   value: data.kpis.promedioCalificacion ? `${data.kpis.promedioCalificacion.toFixed(1)}/5` : "—" },
        ].map(k => (
          <View key={k.label} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={s.kpiValue}>{k.value}</Text>
          </View>
        ))}
      </View>

      <SectionTitle label="Detalle de proyectos" />
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={s.tableHeaderText}>#</Text>
          <Text style={[s.tableHeaderText, { flex: 2 }]}>Nombre</Text>
          <Text style={s.tableHeaderText}>Fecha</Text>
          <Text style={s.tableHeaderText}>Estado</Text>
          <Text style={s.tableHeaderText}>Avance</Text>
          <Text style={s.tableHeaderText}>Encargado</Text>
        </View>
        {data.lista.map(p => (
          <View key={p.id} style={s.tableRow}>
            <Text style={s.tableCell}>{p.numeroProyecto}</Text>
            <Text style={[s.tableCell, { flex: 2 }]}>{p.nombre}</Text>
            <Text style={s.tableCell}>{fmtFecha(p.fechaEvento)}</Text>
            <Text style={[s.tableCell, { color: ESTADO_COLOR[p.estado] ?? GRAY }]}>{p.estado.replace(/_/g, " ")}</Text>
            <Text style={s.tableCell}>{p.avance}%</Text>
            <Text style={s.tableCell}>{p.encargado?.name ?? "—"}</Text>
          </View>
        ))}
      </View>

      {data.analisis    && <View style={s.notaBox}><Text style={s.notaLabel}>Análisis general</Text><Text style={s.notaText}>{data.analisis}</Text></View>}
      {data.propuesta   && <View style={s.notaBox}><Text style={s.notaLabel}>Propuestas de mejora</Text><Text style={s.notaText}>{data.propuesta}</Text></View>}
      {data.comentarios && <View style={s.notaBox}><Text style={s.notaLabel}>Comentarios finales</Text><Text style={s.notaText}>{data.comentarios}</Text></View>}
    </>
  );
}

// ─── DOCUMENTO PRINCIPAL ──────────────────────────────────────────────────────
const SECCION_LABELS: Record<string, string> = {
  checklist:  "Checklist Semanal",
  equipos:    "Mantenimiento de Equipos",
  inventario: "Altas y Bajas de Inventario",
  vehiculos:  "Vehículos",
  proyectos:  "Proyectos del Mes",
};

export function ReporteProduccionPDF({ data }: { data: ReporteProduccionPDFData }) {
  const seccionLabel = SECCION_LABELS[data.seccion] ?? data.seccion;
  return (
    <Document title={`Reporte Producción · ${seccionLabel} · ${data.mesLabel}`} author="Mainstage Pro">
      <Page size="A4" orientation="landscape" style={s.page}>
        <PdfHeader mesLabel={data.mesLabel} seccion={seccionLabel} />
        <View style={s.body}>
          {data.seccion === "checklist"  && data.checklist  && <SeccionChecklistPDF  data={data.checklist} />}
          {data.seccion === "equipos"    && data.equipos    && <SeccionEquiposPDF    data={data.equipos} />}
          {data.seccion === "inventario" && data.inventario && <SeccionInventarioPDF data={data.inventario} />}
          {data.seccion === "vehiculos"  && data.vehiculos  && <SeccionVehiculosPDF  data={data.vehiculos} />}
          {data.seccion === "proyectos"  && data.proyectos  && <SeccionProyectosPDF  data={data.proyectos} />}
        </View>
        <PdfFooter mes={data.mes} seccion={seccionLabel} />
      </Page>
    </Document>
  );
}
