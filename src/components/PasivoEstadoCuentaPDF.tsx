import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Colores de marca Mainstage Pro ──────────────────────────────────────────
const GOLD      = "#B3985B";
const BLACK     = "#0a0a0a";
const WHITE     = "#FFFFFF";
const GRAY      = "#4a4a4a";
const LIGHT     = "#F7F5F0";
const MID       = "#E8E5DF";
const DARK2     = "#1a1a1a";
const GREEN     = "#166534";
const GREEN_L   = "#dcfce7";
const GREEN_B   = "#86efac";
const AMBER     = "#92400e";
const AMBER_L   = "#fffbeb";
const AMBER_B   = "#fde68a";

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 0,
    fontSize: 8.5,
    color: BLACK,
  },
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 22,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: { width: 110, height: 28, objectFit: "contain", marginBottom: 4 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: "#777777", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docSub: { fontSize: 8, color: "#888888" },
  docFolio: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 2, letterSpacing: 0.5 },
  docDate: { fontSize: 7, color: "#777777", marginTop: 2 },

  body: { paddingHorizontal: 36, paddingTop: 18 },

  // Banner estado
  bannerLiquidado: {
    backgroundColor: GREEN_L,
    borderWidth: 1,
    borderColor: GREEN_B,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerPendiente: {
    backgroundColor: AMBER_L,
    borderWidth: 1,
    borderColor: AMBER_B,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GREEN },
  bannerTitleAmber: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: AMBER },
  bannerDesc: { fontSize: 7, color: GRAY, marginTop: 1 },
  badgeLiq: {
    backgroundColor: GREEN,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  badgeLiqText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.5 },

  // Grid info
  infoGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoCol: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  infoColTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, marginBottom: 6 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3.5 },
  infoLabel: { fontSize: 7, color: "#777777" },
  infoVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "60%", textAlign: "right" },

  // KPI cards
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 8, borderWidth: 0.5, borderColor: MID },
  kpiLabel: { fontSize: 6.5, color: "#777777", marginBottom: 3, letterSpacing: 0.5 },
  kpiVal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK },
  kpiSub: { fontSize: 6.5, color: "#888888", marginTop: 2 },

  // Barra de progreso
  progressWrap: { marginBottom: 14 },
  progressBar: { height: 5, backgroundColor: MID, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: GOLD, borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  progressText: { fontSize: 6.5, color: "#777777" },

  // Sección
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1.2, marginBottom: 6, marginTop: 4 },

  // Tabla cuotas
  tableWrap: { borderWidth: 1, borderColor: MID, borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  th: {
    flexDirection: "row",
    backgroundColor: DARK2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  thText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#aaaaaa", letterSpacing: 0.5 },
  tr: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: MID,
    alignItems: "center",
  },
  trAlt: { backgroundColor: LIGHT },
  trPaid: { backgroundColor: "#f0fdf4" },

  // Columnas tabla
  colNum: { width: 34 },
  colVenc: { width: 72 },
  colPago: { width: 76 },
  colMetodo: { flex: 1 },
  colMonto: { width: 68, textAlign: "right" },
  colSaldo: { width: 68, textAlign: "right" },
  colEstado: { width: 54, alignItems: "flex-end" },

  tdNum: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY },
  tdVenc: { fontSize: 7.5, color: BLACK },
  tdPago: { fontSize: 7, color: GRAY },
  tdMetodo: { fontSize: 7, color: GRAY },
  tdMonto: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right" },
  tdSaldo: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textAlign: "right" },

  badgeStatus: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    alignSelf: "flex-end",
  },
  badgeStatusPaid: { backgroundColor: GREEN_L },
  badgeStatusPend: { backgroundColor: AMBER_L },
  badgeStatusVenc: { backgroundColor: "#fee2e2" },
  badgeStatusText: { fontSize: 6.5, fontFamily: "Helvetica-Bold" },

  // Abonos bancarios
  abonosTable: { borderWidth: 1, borderColor: MID, borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  abonoTh: { flexDirection: "row", backgroundColor: DARK2, paddingHorizontal: 10, paddingVertical: 5 },
  abonoTr: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 0.5,
    borderTopColor: MID,
    backgroundColor: LIGHT,
    alignItems: "center",
  },

  // Constancia
  constanciaBox: {
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: MID,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  constanciaTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 3, letterSpacing: 0.5 },
  constanciaText: { fontSize: 7, color: GRAY, lineHeight: 1.4 },

  // Firmas
  firmasRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 12 },
  firmaBox: { width: "45%", alignItems: "center" },
  firmaLinea: { width: "100%", borderBottomWidth: 1, borderBottomColor: "#999999", marginBottom: 5 },
  firmaNombre: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "center" },
  firmaCargo: { fontSize: 6.5, color: GRAY, textAlign: "center", marginTop: 1 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: MID,
    paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: "#aaaaaa" },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.substring(0, 10) + "T12:00:00Z");
  return d.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateLong(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.substring(0, 10) + "T12:00:00Z");
  return d.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtMetodo(m: string | null | undefined, paid: boolean) {
  if (!m) return paid ? "Transferencia" : "Programada";
  const up = m.toUpperCase().trim();
  if (up === "TRANSFERENCIA") return "Transferencia";
  if (up === "EFECTIVO") return "Efectivo";
  if (up === "TARJETA") return "Tarjeta";
  if (up === "CHEQUE") return "Cheque";
  return m;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface PasivoCuotaPDF {
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  estado: string; // PENDIENTE | PAGADO | VENCIDO
  fechaPago?: string | null;
  metodoPago?: string | null;
  referencia?: string | null;
  saldoInsoluto: number;
}

export interface PasivoAbonoPDF {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  metodoPago: string;
}

export interface PasivoPDFData {
  id: string;
  nombre: string;
  categoria: string;
  estado: string;
  fechaAdquisicion: string;
  montoTotal: number;
  montoPagado: number;
  tasaInteres?: number | null;
  notas?: string | null;
  acreedorNombre: string;
  acreedorEmpresa?: string | null;
  acreedorRFC?: string | null;
  acreedorBanco?: string | null;
  acreedorClabe?: string | null;
  cuotas: PasivoCuotaPDF[];
  abonos: PasivoAbonoPDF[];
  generadoEn: string;
  logoSrc?: string | null;
}

// ── Componente ───────────────────────────────────────────────────────────────
export function PasivoEstadoCuentaPDF({ data }: { data: PasivoPDFData }) {
  const saldoPendiente = Math.max(0, data.montoTotal - data.montoPagado);
  const pct = data.montoTotal > 0 ? Math.min(100, (data.montoPagado / data.montoTotal) * 100) : 0;
  const esLiquidado = saldoPendiente === 0 || data.estado === "LIQUIDADO";
  const cuotasPagadas = data.cuotas.filter(c => c.estado === "PAGADO");
  const cuotasPendientes = data.cuotas.filter(c => c.estado !== "PAGADO");

  return (
    <Document title={`Estado de Cuenta — ${data.nombre}`} author="Mainstage Pro" creator="Mainstage Pro">
      <Page size="A4" style={s.page}>

        {/* ── Encabezado principal ── */}
        <View style={s.header} fixed>
          <View>
            {data.logoSrc ? (
              <Image src={data.logoSrc} style={s.logo} />
            ) : (
              <Text style={s.brand}>MAINSTAGE PRO</Text>
            )}
            <Text style={s.tagline}>PRODUCCIÓN AUDIOVISUAL Y EVENTOS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>ESTADO DE CUENTA Y CONTROL DE PAGOS</Text>
            <Text style={s.docSub}>Control de Pasivo y Amortizaciones</Text>
            <Text style={s.docFolio}>FOLIO: PAS-{data.id.slice(-6).toUpperCase()}</Text>
            <Text style={s.docDate}>Fecha de emisión: {fmtDateLong(data.generadoEn)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Banner de Estado ── */}
          {esLiquidado ? (
            <View style={s.bannerLiquidado}>
              <View>
                <Text style={s.bannerTitle}>✓ PASIVO TOTALMENTE LIQUIDADO (100% CUBIERTO)</Text>
                <Text style={s.bannerDesc}>
                  El compromiso financiero ha sido liquidado en su totalidad. No existe saldo deudor pendiente.
                </Text>
              </View>
              <View style={s.badgeLiq}>
                <Text style={s.badgeLiqText}>LIQUIDADO</Text>
              </View>
            </View>
          ) : (
            <View style={s.bannerPendiente}>
              <View>
                <Text style={s.bannerTitleAmber}>EN PROCESO DE AMORTIZACIÓN ({pct.toFixed(0)}% PAGADO)</Text>
                <Text style={s.bannerDesc}>
                  Saldo pendiente por amortizar: {fmt(saldoPendiente)} · {cuotasPendientes.length} cuotas pendientes
                </Text>
              </View>
              <View style={[s.badgeLiq, { backgroundColor: AMBER }]}>
                <Text style={s.badgeLiqText}>ACTIVO</Text>
              </View>
            </View>
          )}

          {/* ── Grid con partes y datos de la deuda ── */}
          <View style={s.infoGrid}>
            {/* Columna Acreedor */}
            <View style={s.infoCol}>
              <Text style={s.infoColTitle}>ACREEDOR / BENEFICIARIO</Text>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Nombre:</Text>
                <Text style={s.infoVal}>{data.acreedorNombre}</Text>
              </View>
              {data.acreedorEmpresa && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Empresa / Razón:</Text>
                  <Text style={s.infoVal}>{data.acreedorEmpresa}</Text>
                </View>
              )}
              {data.acreedorRFC && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>RFC:</Text>
                  <Text style={s.infoVal}>{data.acreedorRFC}</Text>
                </View>
              )}
              {data.acreedorBanco && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Banco:</Text>
                  <Text style={s.infoVal}>{data.acreedorBanco}</Text>
                </View>
              )}
              {data.acreedorClabe && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>CLABE:</Text>
                  <Text style={s.infoVal}>{data.acreedorClabe}</Text>
                </View>
              )}
            </View>

            {/* Columna Deuda */}
            <View style={s.infoCol}>
              <Text style={s.infoColTitle}>DATOS DEL COMPROMISO FINANCIERO</Text>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Concepto:</Text>
                <Text style={s.infoVal}>{data.nombre}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Categoría:</Text>
                <Text style={s.infoVal}>{data.categoria}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Fecha de Inicio:</Text>
                <Text style={s.infoVal}>{fmtDate(data.fechaAdquisicion)}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Tasa de Interés:</Text>
                <Text style={s.infoVal}>{data.tasaInteres ? `${data.tasaInteres}% anual` : "Sin intereses (0%)"}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Plazo:</Text>
                <Text style={s.infoVal}>{data.cuotas.length > 0 ? `${data.cuotas.length} cuotas pactadas` : "Pago único"}</Text>
              </View>
            </View>
          </View>

          {/* ── KPIs financieros ── */}
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>TOTAL CONVENIDO</Text>
              <Text style={s.kpiVal}>{fmt(data.montoTotal)}</Text>
              <Text style={s.kpiSub}>Monto total contratado</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>TOTAL PAGADO</Text>
              <Text style={[s.kpiVal, { color: GREEN }]}>{fmt(data.montoPagado)}</Text>
              <Text style={s.kpiSub}>{cuotasPagadas.length} de {data.cuotas.length} cuotas</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>SALDO INSOLUTO</Text>
              <Text style={[s.kpiVal, { color: saldoPendiente > 0 ? AMBER : GREEN }]}>
                {fmt(saldoPendiente)}
              </Text>
              <Text style={s.kpiSub}>{saldoPendiente === 0 ? "Completamente liquidado" : "Pendiente de pago"}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>% CUBIERTO</Text>
              <Text style={[s.kpiVal, { color: GOLD }]}>{pct.toFixed(0)}%</Text>
              <Text style={s.kpiSub}>Progreso de amortización</Text>
            </View>
          </View>

          {/* Barra de progreso */}
          <View style={s.progressWrap}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${pct}%` as unknown as number }]} />
            </View>
            <View style={s.progressLabels}>
              <Text style={s.progressText}>0%</Text>
              <Text style={s.progressText}>
                {cuotasPagadas.length} cuotas pagadas · {cuotasPendientes.length} pendientes
              </Text>
              <Text style={s.progressText}>100%</Text>
            </View>
          </View>

          {/* ── Tabla de cuotas / amortización ── */}
          {data.cuotas.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>CALENDARIO DE AMORTIZACIÓN Y CONTROL DE PAGOS</Text>
              <View style={s.tableWrap}>
                {/* Header tabla */}
                <View style={s.th}>
                  <Text style={[s.thText, s.colNum]}>#</Text>
                  <Text style={[s.thText, s.colVenc]}>Vencimiento</Text>
                  <Text style={[s.thText, s.colPago]}>Fecha Pago</Text>
                  <Text style={[s.thText, s.colMetodo]}>Método de Pago</Text>
                  <Text style={[s.thText, s.colMonto]}>Cuota</Text>
                  <Text style={[s.thText, s.colSaldo]}>Saldo Insoluto</Text>
                  <Text style={[s.thText, s.colEstado]}>Estado</Text>
                </View>

                {/* Filas */}
                {data.cuotas.map((c, i) => {
                  const paid = c.estado === "PAGADO";
                  return (
                    <View
                      key={c.numeroCuota}
                      wrap={false}
                      style={[
                        s.tr,
                        i % 2 === 1 ? s.trAlt : {},
                        paid ? s.trPaid : {},
                      ]}
                    >
                      <Text style={[s.tdNum, s.colNum]}>C{c.numeroCuota}</Text>
                      <Text style={[s.tdVenc, s.colVenc]}>{fmtDate(c.fechaVencimiento)}</Text>
                      <Text style={[s.tdPago, s.colPago]}>
                        {c.fechaPago ? fmtDate(c.fechaPago) : paid ? fmtDate(c.fechaVencimiento) : "—"}
                      </Text>
                      <Text style={[s.tdMetodo, s.colMetodo]}>
                        {fmtMetodo(c.metodoPago, paid)}
                      </Text>
                      <Text style={[s.tdMonto, s.colMonto, paid ? { color: GREEN } : {}]}>
                        {fmt(c.monto)}
                      </Text>
                      <Text style={[s.tdSaldo, s.colSaldo]}>
                        {fmt(c.saldoInsoluto)}
                      </Text>
                      <View style={s.colEstado}>
                        <View style={[
                          s.badgeStatus,
                          paid ? s.badgeStatusPaid : c.estado === "VENCIDO" ? s.badgeStatusVenc : s.badgeStatusPend,
                        ]}>
                          <Text style={[
                            s.badgeStatusText,
                            paid ? { color: GREEN } : c.estado === "VENCIDO" ? { color: "#991b1b" } : { color: AMBER },
                          ]}>
                            {paid ? "PAGADO" : c.estado}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Desglose de abonos registrados ── */}
          {data.abonos.length > 0 && (
            <View wrap={false}>
              <Text style={s.sectionLabel}>DETALLE DE TRANSFERENCIAS Y ABONOS APLICADOS</Text>
              <View style={s.abonosTable}>
                <View style={s.abonoTh}>
                  <Text style={[s.thText, { width: 85 }]}>Fecha</Text>
                  <Text style={[s.thText, { flex: 1 }]}>Concepto / Referencia</Text>
                  <Text style={[s.thText, { width: 120 }]}>Método de Pago</Text>
                  <Text style={[s.thText, { width: 90, textAlign: "right" }]}>Importe</Text>
                </View>
                {data.abonos.map((a) => (
                  <View key={a.id} style={s.abonoTr}>
                    <Text style={[s.tdPago, { width: 85 }]}>{fmtDate(a.fecha)}</Text>
                    <Text style={[s.tdVenc, { flex: 1 }]}>{a.concepto}</Text>
                    <Text style={[s.tdMetodo, { width: 120 }]}>{fmtMetodo(a.metodoPago, true)}</Text>
                    <Text style={[s.tdMonto, { width: 90, color: GREEN }]}>{fmt(a.monto)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Constancia formal de no adeudo (si está liquidado) ── */}
          {esLiquidado && (
            <View style={s.constanciaBox} wrap={false}>
              <Text style={s.constanciaTitle}>CONSTANCIA DE FINIQUITO Y NO ADEUDO</Text>
              <Text style={s.constanciaText}>
                Por medio del presente documento, MAINSTAGE PRODUCCIONES S.A. DE C.V. y {data.acreedorNombre} hacen constar
                que el financiamiento/pasivo amparado bajo el concepto «{data.nombre}» ha sido liquidado en su totalidad
                por un monto acumulado de {fmt(data.montoTotal)}, cubriendo el 100% de las {data.cuotas.length} cuotas pactadas.
                A la fecha de expedición de este documento, no existe saldo deudor, penalización ni interés pendiente de pago.
              </Text>
            </View>
          )}

          {/* ── Firmas de conformidad ── */}
          <View style={s.firmasRow} wrap={false}>
            <View style={s.firmaBox}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>MAINSTAGE PRODUCCIONES S.A. DE C.V.</Text>
              <Text style={s.firmaCargo}>Dirección de Administración y Tesorería</Text>
              <Text style={[s.firmaCargo, { fontSize: 6, color: "#888888" }]}>Deudor / Emisor</Text>
            </View>
            <View style={s.firmaBox}>
              <View style={s.firmaLinea} />
              <Text style={s.firmaNombre}>{data.acreedorNombre}</Text>
              <Text style={s.firmaCargo}>Acreedor / Beneficiario</Text>
              <Text style={[s.firmaCargo, { fontSize: 6, color: "#888888" }]}>Conformidad de Pagos Recibidos</Text>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro · Control Financiero de Pasivos</Text>
          <Text style={s.footerText}>{data.nombre}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
