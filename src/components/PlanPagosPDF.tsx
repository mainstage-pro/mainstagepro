import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Brand colors ──────────────────────────────────────────────────────────────
const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const WHITE  = "#FFFFFF";
const GRAY   = "#4a4a4a";
const LIGHT  = "#F7F5F0";
const MID    = "#E8E5DF";
const DARK2  = "#1a1a1a";
const GREEN  = "#166534";
const GREEN_L = "#dcfce7";
const AMBER_L = "#fffbeb";
const AMBER   = "#92400e";

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // Header negro con logo y título
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 44,
    paddingTop: 28,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo:     { width: 110, height: 28, objectFit: "contain", marginBottom: 4 },
  brand:    { fontSize: 17, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline:  { fontSize: 7, color: "#666666", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docSub:   { fontSize: 8, color: "#888888" },
  docDate:  { fontSize: 7.5, color: "#666666", marginTop: 2 },

  body: { paddingHorizontal: 44, paddingTop: 26 },

  // Recipient block
  paraLabel:   { fontSize: 7, color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName:    { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa: { fontSize: 8.5, color: GRAY, marginBottom: 14 },

  // Info box
  infoBox:   { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 16 },
  infoRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoLabel: { fontSize: 7.5, color: "#888888" },
  infoValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "62%", textAlign: "right" },

  // Section label
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999999", letterSpacing: 1.5, marginBottom: 8, marginTop: 4 },

  // Table
  tableWrap:  { borderWidth: 1, borderColor: MID, borderRadius: 4, overflow: "hidden", marginBottom: 18 },
  tableHead:  {
    flexDirection: "row", backgroundColor: DARK2,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  tableRow:   { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: MID },
  tableRowAlt:{ backgroundColor: LIGHT },
  tablePaid:  { backgroundColor: GREEN_L },
  thNum:    { width: 28, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#888888" },
  thFecha:  { flex: 1, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#888888" },
  thMonto:  { width: 90, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#888888", textAlign: "right" },
  thEstado: { width: 60, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#888888", textAlign: "right" },
  tdNum:    { width: 28, fontSize: 8.5, color: GRAY },
  tdFecha:  { flex: 1, fontSize: 8.5, color: BLACK },
  tdMonto:  { width: 90, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right" },
  tdPendiente: { color: AMBER },
  tdPagado:    { color: GREEN },
  tdEstado: { width: 60, fontSize: 7.5, textAlign: "right" },

  // Progress bar
  progressWrap: { marginBottom: 18 },
  progressBar:  { height: 5, backgroundColor: MID, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: GOLD, borderRadius: 3 },

  // Summary totals
  montoBox:   { marginBottom: 18 },
  montoRow:   {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 14,
    borderTopWidth: 0.5, borderTopColor: MID,
  },
  montoLabel: { fontSize: 8.5, color: GRAY },
  montoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },
  montoTotal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: BLACK, borderRadius: 3, marginTop: 4,
  },
  montoTotalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE },
  montoTotalValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GOLD },

  // Abono detail sub-row
  abonoRow: {
    flexDirection: "row", paddingHorizontal: 20, paddingVertical: 4,
    backgroundColor: "#f0fdf4",
  },
  abonoLabel: { fontSize: 7, color: "#166534", flex: 1 },
  abonoValue: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#166534" },

  // Footer
  footer: {
    position: "absolute", bottom: 18, left: 44, right: 44,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: MID, paddingTop: 7,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", day: "2-digit", month: "long", year: "numeric",
  });
}
function fmtShort(iso: string) {
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CuotaPDFItem {
  numeroCuota: number;
  monto: number;
  fechaCompromiso: string;
  estado: string; // PENDIENTE | PAGADO
  abono?: {
    fecha: string;
    monto: number;
    metodoPago: string;
    notas?: string | null;
  } | null;
}

export interface PlanPagosPDFData {
  tipo: "cobro" | "pago";
  concepto: string;
  montoTotal: number;
  montoPagado: number;
  /** Nombre/empresa del cliente (cobro) o proveedor/técnico (pago) */
  contraparte: string;
  empresaContraparte?: string | null;
  proyecto?: { nombre: string; numeroProyecto: string } | null;
  cuotas: CuotaPDFItem[];
  generadoEn: string; // ISO date
  logoSrc?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PlanPagosPDF({ data }: { data: PlanPagosPDFData }) {
  const esCobro = data.tipo === "cobro";
  const titulo  = esCobro ? "Plan de Cobros" : "Plan de Pagos";
  const pct     = data.montoTotal > 0 ? Math.min(100, (data.montoPagado / data.montoTotal) * 100) : 0;
  const pendiente = data.montoTotal - data.montoPagado;
  const cuotasPagadas  = data.cuotas.filter(c => c.estado === "PAGADO");
  const cuotasPendientes = data.cuotas.filter(c => c.estado !== "PAGADO");

  return (
    <Document title={`${titulo} — ${data.concepto}`} author="Mainstage Pro" creator="Mainstage Pro">
      <Page size="A4" style={s.page}>

        {/* ── Header negro ── */}
        <View style={s.header} fixed>
          <View>
            {data.logoSrc
              ? <Image src={data.logoSrc} style={s.logo} />
              : <Text style={s.brand}>MAINSTAGE PRO</Text>
            }
            <Text style={s.tagline}>PRODUCCIÓN AUDIOVISUAL Y EVENTOS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{titulo}</Text>
            <Text style={s.docSub}>{data.cuotas.length} cuota{data.cuotas.length !== 1 ? "s" : ""}</Text>
            <Text style={s.docDate}>Generado: {fmtDate(data.generadoEn)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Contraparte ── */}
          <View style={{ marginBottom: 20 }}>
            <Text style={s.paraLabel}>{esCobro ? "CLIENTE / EMPRESA" : "BENEFICIARIO / PROVEEDOR"}</Text>
            <Text style={s.paraName}>{data.contraparte}</Text>
            {data.empresaContraparte && <Text style={s.paraEmpresa}>{data.empresaContraparte}</Text>}
          </View>

          {/* ── Info general ── */}
          <View style={s.infoBox}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Concepto</Text>
              <Text style={s.infoValue}>{data.concepto}</Text>
            </View>
            {data.proyecto && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Proyecto</Text>
                <Text style={s.infoValue}>{data.proyecto.numeroProyecto} · {data.proyecto.nombre}</Text>
              </View>
            )}
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Monto total</Text>
              <Text style={s.infoValue}>{fmt(data.montoTotal)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{esCobro ? "Cobrado" : "Pagado"}</Text>
              <Text style={[s.infoValue, { color: "#166534" }]}>{fmt(data.montoPagado)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Pendiente</Text>
              <Text style={[s.infoValue, { color: pendiente > 0 ? AMBER : "#166534" }]}>{fmt(pendiente)}</Text>
            </View>
          </View>

          {/* ── Barra de progreso ── */}
          <View style={s.progressWrap}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 7, color: "#888888" }}>Progreso</Text>
              <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK }}>{Math.round(pct)}%</Text>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${pct}%` as unknown as number }]} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 3 }}>
              <Text style={{ fontSize: 6.5, color: "#888888" }}>{cuotasPagadas.length} de {data.cuotas.length} cuotas {esCobro ? "cobradas" : "pagadas"}</Text>
              <Text style={{ fontSize: 6.5, color: "#888888" }}>{cuotasPendientes.length} pendiente{cuotasPendientes.length !== 1 ? "s" : ""}</Text>
            </View>
          </View>

          {/* ── Tabla de cuotas ── */}
          <Text style={s.sectionLabel}>DETALLE DE CUOTAS</Text>
          <View style={s.tableWrap}>
            {/* Head */}
            <View style={s.tableHead}>
              <Text style={s.thNum}>#</Text>
              <Text style={s.thFecha}>Fecha compromiso</Text>
              <Text style={s.thMonto}>Monto</Text>
              <Text style={s.thEstado}>Estado</Text>
            </View>

            {/* Rows */}
            {data.cuotas.map((cuota, i) => {
              const paid = cuota.estado === "PAGADO";
              return (
                <View key={i} wrap={false}>
                  <View style={[
                    s.tableRow,
                    i % 2 === 1 ? s.tableRowAlt : {},
                    paid ? s.tablePaid : {},
                  ]}>
                    <Text style={s.tdNum}>{cuota.numeroCuota}</Text>
                    <Text style={s.tdFecha}>{fmtShort(cuota.fechaCompromiso)}</Text>
                    <Text style={[s.tdMonto, paid ? s.tdPagado : s.tdPendiente]}>{fmt(cuota.monto)}</Text>
                    <View style={s.tdEstado}>
                      <View style={{
                        backgroundColor: paid ? "#dcfce7" : AMBER_L,
                        borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
                        alignSelf: "flex-end",
                      }}>
                        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: paid ? "#166534" : AMBER }}>
                          {paid ? (esCobro ? "Cobrado" : "Pagado") : "Pendiente"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {/* Abono detail si está pagado */}
                  {paid && cuota.abono && (
                    <View style={s.abonoRow}>
                      <Text style={s.abonoLabel}>
                        ✓ {esCobro ? "Cobrado" : "Pagado"} el {fmtShort(cuota.abono.fecha)} · {cuota.abono.metodoPago === "TRANSFERENCIA" ? "Transferencia" : cuota.abono.metodoPago === "EFECTIVO" ? "Efectivo" : cuota.abono.metodoPago}
                        {cuota.abono.notas ? ` · ${cuota.abono.notas}` : ""}
                      </Text>
                      <Text style={s.abonoValue}>{fmt(cuota.abono.monto)}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* ── Resumen de totales ── */}
          <View style={s.montoBox}>
            <Text style={s.sectionLabel}>RESUMEN</Text>
            <View style={{ borderWidth: 1, borderColor: MID, borderRadius: 4, overflow: "hidden" }}>
              {cuotasPagadas.length > 0 && (
                <View style={s.montoRow}>
                  <Text style={s.montoLabel}>{esCobro ? "Cobrado" : "Pagado"} ({cuotasPagadas.length} cuota{cuotasPagadas.length !== 1 ? "s" : ""})</Text>
                  <Text style={[s.montoValue, { color: "#166534" }]}>{fmt(data.montoPagado)}</Text>
                </View>
              )}
              {cuotasPendientes.length > 0 && (
                <View style={[s.montoRow, { borderTopWidth: cuotasPagadas.length > 0 ? 0.5 : 0 }]}>
                  <Text style={s.montoLabel}>Pendiente ({cuotasPendientes.length} cuota{cuotasPendientes.length !== 1 ? "s" : ""})</Text>
                  <Text style={[s.montoValue, { color: AMBER }]}>{fmt(pendiente)}</Text>
                </View>
              )}
            </View>
            <View style={s.montoTotal}>
              <Text style={s.montoTotalLabel}>TOTAL</Text>
              <Text style={s.montoTotalValue}>{fmt(data.montoTotal)}</Text>
            </View>
          </View>

          {/* ── Nota de pie ── */}
          <Text style={{ fontSize: 7, color: "#aaaaaa", fontStyle: "italic", lineHeight: 1.5 }}>
            Este documento es un resumen interno del {titulo.toLowerCase()} generado por Mainstage Pro.
            {pendiente > 0
              ? ` Quedan ${cuotasPendientes.length} cuota${cuotasPendientes.length !== 1 ? "s" : ""} por ${esCobro ? "cobrar" : "pagar"} por un total de ${fmt(pendiente)}.`
              : " La cuenta está completamente liquidada."
            }
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro · {titulo}</Text>
          <Text style={s.footerText}>{data.concepto}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
