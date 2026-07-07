import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Paleta (idéntica a ReporteMarketingPDF) ──────────────────────────────────
const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const DARK   = "#111111";
const GRAY   = "#4a4a4a";
const LIGHT  = "#888888";
const WHITE  = "#FFFFFF";
const CREAM  = "#F7F5F0";
const CREAM2 = "#FFFBF2";
const GREEN  = "#16a34a";
const RED    = "#dc2626";
const AMBER  = "#d97706";
const BLUE   = "#2563eb";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: WHITE, paddingTop: 36, paddingBottom: 52, paddingHorizontal: 0, fontSize: 9, color: DARK },
  header: { backgroundColor: BLACK, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 22, marginTop: -36, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand:   { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: LIGHT, letterSpacing: 1 },
  headerTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 3, textAlign: "right" },
  headerSub:   { fontSize: 8, color: LIGHT, textAlign: "right" },
  headerRight: { alignItems: "flex-end" },
  goldBar: { height: 3, backgroundColor: GOLD },
  mesStrip: { backgroundColor: CREAM, paddingHorizontal: 40, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: "1 solid #e0ddd8" },
  mesLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK },
  mesGen:   { fontSize: 8, color: LIGHT, fontFamily: "Helvetica-Oblique" },
  body: { paddingHorizontal: 40, paddingTop: 16 },
  sectionTitle: { flexDirection: "row", alignItems: "center", marginBottom: 8, paddingBottom: 5, marginTop: 14, borderBottom: "1 solid #e0ddd8" },
  sectionLine:  { height: 2, width: 18, backgroundColor: GOLD, marginRight: 7 },
  sectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, textTransform: "uppercase" },
  kpiRow:  { flexDirection: "row", gap: 8, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: CREAM, borderLeft: "3 solid " + GOLD, padding: 10, borderRadius: 2 },
  kpiLabel: { fontSize: 7, color: LIGHT, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: DARK },
  kpiSub:   { fontSize: 7, color: LIGHT, marginTop: 2 },
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: BLACK, paddingVertical: 5, paddingHorizontal: 10 },
  tableHeaderText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: LIGHT, flex: 1, letterSpacing: 0.8, textTransform: "uppercase" },
  tableRow:    { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: "1 solid #f0ede8" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: "1 solid #f0ede8", backgroundColor: CREAM },
  tableCell:   { fontSize: 7.5, color: GRAY, flex: 1 },
  tableCellB:  { fontSize: 7.5, color: DARK, fontFamily: "Helvetica-Bold", flex: 1 },
  tableCellR:  { fontSize: 7.5, color: GRAY, flex: 0.7, textAlign: "right" },
  tableCellRB: { fontSize: 7.5, color: DARK, fontFamily: "Helvetica-Bold", flex: 0.7, textAlign: "right" },
  notaBox:  { backgroundColor: CREAM2, borderLeft: "3 solid " + GOLD, borderRadius: 2, padding: 8, marginBottom: 6 },
  notaLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.8 },
  notaText:  { fontSize: 7.5, color: GRAY, lineHeight: 1.5 },
  saludBox: { flexDirection: "row", alignItems: "center", backgroundColor: CREAM, padding: 10, borderRadius: 2, marginBottom: 12, gap: 8 },
  saludDot: { width: 8, height: 8, borderRadius: 4 },
  barTrack: { height: 4, backgroundColor: "#e0ddd8", borderRadius: 2, marginTop: 3 },
  barFill:  { height: 4, borderRadius: 2 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 36, backgroundColor: BLACK, paddingHorizontal: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: LIGHT },
  separator: { height: 1, backgroundColor: "#e0ddd8", marginVertical: 8 },
});

export interface AdminReportePDFData {
  mes: string; mesLabel: string; tab: "balance" | "flujo" | "asistencias"; generadoEn: string;
  balance?: {
    totalActivos: number; totalPasivos: number; patrimonioNeto: number; flujoMes: number;
    salud: "SALUDABLE" | "ATENCION" | "CRITICO"; razonSocial: string;
    socios: { nombre: string; pctParticipacion: number | null }[];
    activos: { categoria: string; total: number; count: number }[];
    pasivos: { nombre: string; categoria: string; montoTotal: number; montoPagado: number }[];
    cuentas: { nombre: string; banco: string | null; posicion: number }[];
    cxc: number;
  };
  flujo?: {
    entradas: number; salidas: number; compromisos: number; flujoNeto: number;
    pctOperativo: number; pctEstructural: number;
    entradasPorCategoria: { nombre: string; total: number }[];
    salidasPorCategoria: { nombre: string; total: number }[];
    cuentas: { nombre: string; banco: string | null; posicion: number }[];
  };
  asistencias?: {
    diasHabiles: number; pctGeneral: number; totalPresentes: number; retardosFaltas: number;
    personal: { nombre: string; departamento: string; presentes: number; retardos: number; faltas: number; pct: number }[];
  };
  analisis?: { responsable: string; comentarios: string; propuestas: string[]; cierre: string };
}

const TAB_LABELS: Record<string, string> = { balance: "Balance General", flujo: "Flujo de Caja", asistencias: "Asistencias" };

function fmt(n: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n); }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

function PdfHeader({ mesLabel, tipo }: { mesLabel: string; tipo: string }) {
  return (
    <>
      <View style={s.header}>
        <View><Text style={s.brand}>MAINSTAGE</Text><Text style={s.tagline}>ADMINISTRACIÓN · ESCENARIO PRINCIPAL S.A. DE C.V.</Text></View>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>Reporte Administrativo</Text>
          <Text style={s.headerSub}>{tipo}</Text>
          <Text style={[s.headerSub, { color: GOLD, marginTop: 4 }]}>{mesLabel}</Text>
        </View>
      </View>
      <View style={s.goldBar} />
    </>
  );
}

function MesStrip({ mesLabel, gen }: { mesLabel: string; gen: string }) {
  return <View style={s.mesStrip}><Text style={s.mesLabel}>{mesLabel}</Text><Text style={s.mesGen}>Generado el {gen}</Text></View>;
}

function PdfFooter({ tab }: { tab: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Reporte Administrativo · {TAB_LABELS[tab] ?? tab}</Text>
      <Text style={s.footerText}>Mainstage Pro · Confidencial</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <View style={s.sectionTitle}><View style={s.sectionLine} /><Text style={s.sectionLabel}>{label}</Text></View>;
}

function KpiCard({ label, value, sub, color = DARK }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      {sub && <Text style={s.kpiSub}>{sub}</Text>}
    </View>
  );
}

function SectionBalance({ data }: { data: NonNullable<AdminReportePDFData["balance"]> }) {
  const saludColor = data.salud === "SALUDABLE" ? GREEN : data.salud === "ATENCION" ? AMBER : RED;
  const saludLabel = data.salud === "SALUDABLE" ? "Balance Saludable" : data.salud === "ATENCION" ? "Requiere Atención" : "Balance Crítico";
  return (
    <>
      <View style={s.kpiRow}>
        <KpiCard label="Total Activos" value={fmt(data.totalActivos)} sub={`${data.cuentas.length} cuentas`} color={BLUE} />
        <KpiCard label="Total Pasivos" value={fmt(data.totalPasivos)} sub={`${data.pasivos.length} deudas activas`} color={AMBER} />
        <KpiCard label="Patrimonio Neto" value={fmt(data.patrimonioNeto)} sub="Activos − Pasivos" color={data.patrimonioNeto >= 0 ? GREEN : RED} />
        <KpiCard label="Flujo del Mes" value={fmt(data.flujoMes)} color={data.flujoMes >= 0 ? GREEN : RED} />
      </View>
      <View style={s.saludBox}>
        <View style={[s.saludDot, { backgroundColor: saludColor }]} />
        <View>
          <Text style={[s.kpiLabel, { color: saludColor, fontSize: 9 }]}>{saludLabel}</Text>
          <Text style={[s.kpiSub]}>{data.razonSocial} · {data.socios.filter(s => s.pctParticipacion).map(s => `${s.nombre} ${s.pctParticipacion}%`).join(" · ")}</Text>
        </View>
      </View>
      <SectionTitle label="Estructura de Activos" />
      <View style={s.table}>
        <View style={s.tableHeader}><Text style={[s.tableHeaderText, { flex: 2 }]}>Categoría</Text><Text style={[s.tableHeaderText, { flex: 0.6 }]}>Activos</Text><Text style={[s.tableHeaderText, { textAlign: "right" }]}>Valor</Text></View>
        {data.activos.map((a, i) => (
          <View key={a.categoria} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCellB, { flex: 2 }]}>{a.categoria}</Text>
            <Text style={[s.tableCell, { flex: 0.6 }]}>{a.count}</Text>
            <Text style={[s.tableCellRB, { color: GOLD }]}>{fmt(a.total)}</Text>
          </View>
        ))}
      </View>
      {data.cxc > 0 && <View style={s.kpiRow}><KpiCard label="Cuentas por Cobrar Pendientes" value={fmt(data.cxc)} sub="Cartera vigente" color={AMBER} /></View>}
      <SectionTitle label="Pasivos Activos" />
      <View style={s.table}>
        <View style={s.tableHeader}><Text style={[s.tableHeaderText, { flex: 2 }]}>Deuda</Text><Text style={s.tableHeaderText}>Categoría</Text><Text style={[s.tableHeaderText, { textAlign: "right" }]}>Saldo</Text></View>
        {data.pasivos.map((p, i) => (
          <View key={`${p.nombre}-${i}`} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCellB, { flex: 2 }]}>{p.nombre}</Text>
            <Text style={s.tableCell}>{p.categoria}</Text>
            <Text style={[s.tableCellRB, { color: RED }]}>{fmt(p.montoTotal - p.montoPagado)}</Text>
          </View>
        ))}
      </View>
      <SectionTitle label="Posición Bancaria" />
      <View style={s.table}>
        <View style={s.tableHeader}><Text style={[s.tableHeaderText, { flex: 2 }]}>Cuenta</Text><Text style={s.tableHeaderText}>Banco</Text><Text style={[s.tableHeaderText, { textAlign: "right" }]}>Posición</Text></View>
        {data.cuentas.map((c, i) => (
          <View key={c.nombre} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCellB, { flex: 2 }]}>{c.nombre}</Text>
            <Text style={s.tableCell}>{c.banco ?? "—"}</Text>
            <Text style={[s.tableCellRB, { color: c.posicion >= 0 ? GREEN : RED }]}>{fmt(c.posicion)}</Text>
          </View>
        ))}
        <View style={[s.tableRow, { backgroundColor: CREAM2 }]}><Text style={[s.tableCellB, { flex: 2 }]}>POSICIÓN TOTAL</Text><Text style={s.tableCell} /><Text style={[s.tableCellRB, { color: GOLD }]}>{fmt(data.cuentas.reduce((sum, c) => sum + c.posicion, 0))}</Text></View>
      </View>
    </>
  );
}

function SectionFlujo({ data }: { data: NonNullable<AdminReportePDFData["flujo"]> }) {
  return (
    <>
      <View style={s.kpiRow}>
        <KpiCard label="Entradas Totales" value={fmt(data.entradas)} color={GREEN} />
        <KpiCard label="Salidas Operativas" value={fmt(data.salidas)} color={RED} />
        <KpiCard label="Compromisos Pasivos" value={fmt(data.compromisos)} color={AMBER} />
        <KpiCard label="Flujo Neto" value={fmt(data.flujoNeto)} color={data.flujoNeto >= 0 ? GREEN : RED} sub={data.flujoNeto >= 0 ? "Período positivo" : "Período negativo"} />
      </View>
      <SectionTitle label="Entradas por Categoría" />
      <View style={s.table}>
        <View style={s.tableHeader}><Text style={[s.tableHeaderText, { flex: 3 }]}>Categoría</Text><Text style={[s.tableHeaderText, { textAlign: "right" }]}>Monto</Text></View>
        {data.entradasPorCategoria.map((e, i) => (
          <View key={e.nombre} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCellB, { flex: 3 }]}>{e.nombre}</Text>
            <Text style={[s.tableCellRB, { color: GREEN }]}>{fmt(e.total)}</Text>
          </View>
        ))}
        <View style={[s.tableRow, { backgroundColor: CREAM2 }]}><Text style={[s.tableCellB, { flex: 3 }]}>TOTAL ENTRADAS</Text><Text style={[s.tableCellRB, { color: GOLD }]}>{fmt(data.entradas)}</Text></View>
      </View>
      <SectionTitle label="Salidas por Categoría" />
      <View style={s.table}>
        <View style={s.tableHeader}><Text style={[s.tableHeaderText, { flex: 3 }]}>Categoría</Text><Text style={[s.tableHeaderText, { textAlign: "right" }]}>Monto</Text></View>
        {data.salidasPorCategoria.map((e, i) => (
          <View key={e.nombre} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCellB, { flex: 3 }]}>{e.nombre}</Text>
            <Text style={[s.tableCellRB, { color: RED }]}>{fmt(e.total)}</Text>
          </View>
        ))}
        <View style={[s.tableRow, { backgroundColor: CREAM2 }]}><Text style={[s.tableCellB, { flex: 3 }]}>TOTAL SALIDAS</Text><Text style={[s.tableCellRB, { color: GOLD }]}>{fmt(data.salidas)}</Text></View>
      </View>
      <SectionTitle label="Posición Bancaria" />
      <View style={s.table}>
        <View style={s.tableHeader}><Text style={[s.tableHeaderText, { flex: 2 }]}>Cuenta</Text><Text style={s.tableHeaderText}>Banco</Text><Text style={[s.tableHeaderText, { textAlign: "right" }]}>Posición</Text></View>
        {data.cuentas.map((c, i) => (
          <View key={c.nombre} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCellB, { flex: 2 }]}>{c.nombre}</Text>
            <Text style={s.tableCell}>{c.banco ?? "—"}</Text>
            <Text style={[s.tableCellRB, { color: c.posicion >= 0 ? GREEN : RED }]}>{fmt(c.posicion)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function SectionAsistencias({ data }: { data: NonNullable<AdminReportePDFData["asistencias"]> }) {
  const pctColor = data.pctGeneral >= 90 ? GREEN : data.pctGeneral >= 75 ? AMBER : RED;
  return (
    <>
      <View style={s.kpiRow}>
        <KpiCard label="Días Hábiles" value={String(data.diasHabiles)} sub="Lunes a Viernes" />
        <KpiCard label="Asistencia General" value={fmtPct(data.pctGeneral)} sub="Promedio del equipo" color={pctColor} />
        <KpiCard label="Total Presentes" value={String(data.totalPresentes)} sub="Registros del mes" color={GREEN} />
        <KpiCard label="Retardos + Faltas" value={String(data.retardosFaltas)} color={data.retardosFaltas > 0 ? RED : GREEN} />
      </View>
      <SectionTitle label="Detalle por Colaborador" />
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { flex: 2 }]}>Colaborador</Text>
          <Text style={s.tableHeaderText}>Área</Text>
          <Text style={[s.tableHeaderText, { textAlign: "center" }]}>P</Text>
          <Text style={[s.tableHeaderText, { textAlign: "center" }]}>R</Text>
          <Text style={[s.tableHeaderText, { textAlign: "center" }]}>F</Text>
          <Text style={[s.tableHeaderText, { textAlign: "right" }]}>%</Text>
        </View>
        {data.personal.map((p, i) => {
          const barColor = p.pct >= 90 ? GREEN : p.pct >= 75 ? AMBER : RED;
          return (
            <View key={p.nombre} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.tableCellB, { flex: 2 }]}>{p.nombre}</Text>
              <Text style={s.tableCell}>{p.departamento}</Text>
              <Text style={[s.tableCell, { textAlign: "center", color: GREEN }]}>{p.presentes}</Text>
              <Text style={[s.tableCell, { textAlign: "center", color: AMBER }]}>{p.retardos}</Text>
              <Text style={[s.tableCell, { textAlign: "center", color: p.faltas > 0 ? RED : GRAY }]}>{p.faltas}</Text>
              <Text style={[s.tableCellRB, { color: barColor }]}>{fmtPct(p.pct)}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

export function AdminReportesPDF({ data }: { data: AdminReportePDFData }) {
  const gen = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const tipo = TAB_LABELS[data.tab] ?? data.tab;
  return (
    <Document title={`Reporte Administrativo · ${tipo} · ${data.mesLabel}`} author="Mainstage Pro">
      <Page size="A4" orientation="landscape" style={s.page}>
        <PdfHeader mesLabel={data.mesLabel} tipo={tipo} />
        <MesStrip mesLabel={data.mesLabel} gen={gen} />
        <View style={s.body}>
          {data.tab === "balance"     && data.balance     && <SectionBalance     data={data.balance} />}
          {data.tab === "flujo"       && data.flujo       && <SectionFlujo       data={data.flujo} />}
          {data.tab === "asistencias" && data.asistencias && <SectionAsistencias data={data.asistencias} />}
        </View>
        <PdfFooter tab={data.tab} />
      </Page>
      {data.analisis && (data.analisis.comentarios || data.analisis.cierre || data.analisis.propuestas.some(p => p)) && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <PdfHeader mesLabel={data.mesLabel} tipo={tipo} />
          <MesStrip mesLabel={data.mesLabel} gen={gen} />
          <View style={s.body}>
            <SectionTitle label="Análisis Ejecutivo" />
            {data.analisis.comentarios && <View style={s.notaBox}><Text style={s.notaLabel}>Análisis del Período</Text><Text style={s.notaText}>{data.analisis.comentarios}</Text></View>}
            {data.analisis.propuestas.filter(p => p).map((p, i) => (
              <View key={i} style={s.notaBox}><Text style={s.notaLabel}>Propuesta {i + 1}</Text><Text style={s.notaText}>{p}</Text></View>
            ))}
            {data.analisis.cierre && <View style={s.notaBox}><Text style={s.notaLabel}>Comentarios Finales</Text><Text style={s.notaText}>{data.analisis.cierre}</Text></View>}
            {data.analisis.responsable && <View style={[s.separator, { marginTop: 12 }]}><Text style={[s.kpiSub, { marginTop: 6 }]}>Elaborado por: {data.analisis.responsable}</Text></View>}
          </View>
          <PdfFooter tab={data.tab} />
        </Page>
      )}
    </Document>
  );
}
