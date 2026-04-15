import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const DARK = "#111111";
const WHITE = "#FFFFFF";
const GRAY = "#4a4a4a";
const LIGHT = "#F7F5F0";
const MID = "#E8E5DF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
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
  brand: { fontSize: 17, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 2 },
  tagline: { fontSize: 7, color: "#777777", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  docNum: { fontSize: 8, color: "#999999" },
  body: { paddingHorizontal: 40, paddingTop: 24 },

  // Badge tipo pago
  badge: {
    borderRadius: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  badgeAnticipo: { backgroundColor: GOLD },
  badgeLiquidacion: { backgroundColor: "#2d6a4f" },
  badgeText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1.5 },

  // Monto grande
  amountSection: { marginBottom: 18 },
  amountLabel: { fontSize: 8, color: "#999999", letterSpacing: 1, marginBottom: 4 },
  amount: { fontSize: 30, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 2 },
  amountSub: { fontSize: 8, color: GRAY },

  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 14 },

  // Info box
  infoBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 14, marginBottom: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  infoLabel: { fontSize: 7.5, color: "#888888" },
  infoValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "65%", textAlign: "right" },

  // Balance table
  balanceBox: { borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  balanceTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 1, marginBottom: 8 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: MID },
  balanceRowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 12 },
  balanceLabel: { fontSize: 8, color: GRAY },
  balanceValue: { fontSize: 8, color: BLACK },
  balanceTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: BLACK, borderRadius: 3 },
  balanceTotalLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE },
  balanceTotalValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  balanceTotalZero: { color: "#4ade80" },
  balanceTotalPending: { color: GOLD },
  balanceTable: { backgroundColor: LIGHT, borderRadius: 4, overflow: "hidden" },

  // Thank you
  thankYouBox: {
    backgroundColor: "#0a1a11",
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#2d6a4f",
  },
  thankYouTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#4ade80", marginBottom: 4 },
  thankYouText: { fontSize: 8, color: "#9ca3af", lineHeight: 1.5 },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: MID,
    paddingTop: 7,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
  nota: { fontSize: 7, color: "#aaaaaa", fontStyle: "italic", lineHeight: 1.5 },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export interface ReciboData {
  id: string;
  concepto: string;
  tipoPago: string;
  monto: number;
  fechaCompromiso: string;
  estado: string;
  granTotal?: number | null;
  montoAnticipo?: number | null;
  proyecto?: { nombre: string; numeroProyecto: string | number; fechaEvento?: string | null } | null;
  cliente?: { nombre: string; empresa?: string | null } | null;
  cotizacion?: { numeroCotizacion: string } | null;
}

export function ReciboPagoPDF({ recibo }: { recibo: ReciboData }) {
  const isAnticipo = recibo.tipoPago === "ANTICIPO";
  const isLiquidacion = recibo.tipoPago === "LIQUIDACION";
  const granTotal = recibo.granTotal ?? 0;
  const saldoRestante = granTotal > 0 ? Math.max(0, granTotal - recibo.monto) : null;

  const estadoLabel =
    recibo.estado === "LIQUIDADO" ? "PAGADO" :
    recibo.estado === "PARCIAL" ? "PAGO PARCIAL" :
    "PENDIENTE DE COBRO";

  return (
    <Document>
      <Page size="A5" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>RECIBO DE PAGO</Text>
            <Text style={s.docNum}>Ref. {recibo.id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Badge tipo ── */}
          <View style={[s.badge, isLiquidacion ? s.badgeLiquidacion : s.badgeAnticipo]}>
            <Text style={s.badgeText}>
              {isAnticipo ? "ANTICIPO" : isLiquidacion ? "LIQUIDACIÓN" : "PAGO"}
            </Text>
          </View>

          {/* ── Monto destacado ── */}
          <View style={s.amountSection}>
            <Text style={s.amountLabel}>
              {isAnticipo ? "MONTO DEL ANTICIPO" : isLiquidacion ? "MONTO DE LIQUIDACIÓN" : "MONTO"}
            </Text>
            <Text style={s.amount}>{fmt(recibo.monto)}</Text>
            <Text style={s.amountSub}>{estadoLabel}</Text>
          </View>

          <View style={s.divider} />

          {/* ── Info cliente / proyecto ── */}
          <View style={s.infoBox}>
            {recibo.cliente && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Cliente</Text>
                <Text style={s.infoValue}>
                  {recibo.cliente.nombre}{recibo.cliente.empresa ? ` · ${recibo.cliente.empresa}` : ""}
                </Text>
              </View>
            )}
            {recibo.proyecto && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Proyecto</Text>
                <Text style={s.infoValue}>#{recibo.proyecto.numeroProyecto} — {recibo.proyecto.nombre}</Text>
              </View>
            )}
            {recibo.cotizacion && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Cotización</Text>
                <Text style={s.infoValue}>{recibo.cotizacion.numeroCotizacion}</Text>
              </View>
            )}
            <View style={[s.infoRow, { marginBottom: 0 }]}>
              <Text style={s.infoLabel}>Fecha compromiso</Text>
              <Text style={s.infoValue}>{fmtDate(recibo.fechaCompromiso)}</Text>
            </View>
          </View>

          {/* ── Tabla de balance (ANTICIPO) ── */}
          {isAnticipo && granTotal > 0 && (
            <View style={s.balanceBox}>
              <Text style={s.balanceTitle}>RESUMEN DE PAGOS</Text>
              <View style={s.balanceTable}>
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Total del proyecto</Text>
                  <Text style={s.balanceValue}>{fmt(granTotal)}</Text>
                </View>
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Este anticipo</Text>
                  <Text style={[s.balanceValue, { color: GOLD, fontFamily: "Helvetica-Bold" }]}>− {fmt(recibo.monto)}</Text>
                </View>
                <View style={s.balanceTotalRow}>
                  <Text style={s.balanceTotalLabel}>Saldo restante por pagar</Text>
                  <Text style={[s.balanceTotalValue, s.balanceTotalPending]}>{fmt(saldoRestante ?? 0)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Tabla de balance (LIQUIDACIÓN) ── */}
          {isLiquidacion && granTotal > 0 && (
            <View style={s.balanceBox}>
              <Text style={s.balanceTitle}>RESUMEN DE PAGOS</Text>
              <View style={s.balanceTable}>
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Total del proyecto</Text>
                  <Text style={s.balanceValue}>{fmt(granTotal)}</Text>
                </View>
                {recibo.montoAnticipo && recibo.montoAnticipo > 0 && (
                  <View style={s.balanceRow}>
                    <Text style={s.balanceLabel}>Anticipo previo</Text>
                    <Text style={[s.balanceValue, { color: "#888888" }]}>− {fmt(recibo.montoAnticipo)}</Text>
                  </View>
                )}
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Esta liquidación</Text>
                  <Text style={[s.balanceValue, { color: GOLD, fontFamily: "Helvetica-Bold" }]}>− {fmt(recibo.monto)}</Text>
                </View>
                <View style={s.balanceTotalRow}>
                  <Text style={s.balanceTotalLabel}>Saldo restante</Text>
                  <Text style={[s.balanceTotalValue, s.balanceTotalZero]}>$0.00</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Mensaje de agradecimiento (LIQUIDACIÓN) ── */}
          {isLiquidacion && (
            <View style={s.thankYouBox}>
              <Text style={s.thankYouTitle}>¡Gracias por su pago!</Text>
              <Text style={s.thankYouText}>
                Su cuenta ha quedado liquidada en su totalidad.{"\n"}
                Ha sido un placer trabajar con usted. Esperamos volver a colaborar pronto.{"\n"}
                — Equipo Mainstage Pro
              </Text>
            </View>
          )}

          <Text style={s.nota}>
            Documento interno sin valor fiscal. Para factura oficial, solicítela por separado.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Recibo interno</Text>
          <Text style={s.footerText}>{new Date().toLocaleDateString("es-MX")}</Text>
        </View>
      </Page>
    </Document>
  );
}
