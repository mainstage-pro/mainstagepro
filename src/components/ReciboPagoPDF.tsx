import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const WHITE  = "#FFFFFF";
const GRAY   = "#4a4a4a";
const LIGHT  = "#F7F5F0";
const MID    = "#E8E5DF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 24,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: "#666666", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docNum: { fontSize: 8, color: "#888888" },
  
  body: { paddingHorizontal: 40, paddingTop: 26 },

  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3, marginBottom: 16 },
  badgeAnticipo: { backgroundColor: "#dbeafe" },
  badgeLiquidacion: { backgroundColor: "#dcfce7" },
  badgeText: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1, color: BLACK },

  amountSection: { marginBottom: 18 },
  amountLabel: { fontSize: 7, color: "#888888", letterSpacing: 1.5, marginBottom: 4 },
  amount: { fontSize: 28, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: -0.5 },
  amountSub: { fontSize: 8, color: "#4ade80", fontFamily: "Helvetica-Bold", marginTop: 4, letterSpacing: 1 },
  amountSubPend: { color: GOLD },

  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 16 },

  infoBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  infoLabel: { fontSize: 7.5, color: "#888888" },
  infoValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "65%", textAlign: "right" },

  balanceBox: { marginBottom: 18 },
  balanceTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 1.5, marginBottom: 8 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: MID },
  balanceLabel: { fontSize: 8, color: GRAY },
  balanceValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
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
  fechaCobroReal?: string | null;
  estado: string;
  granTotal?: number | null;
  montoAnticipo?: number | null;
  cuentaDestino?: { nombre: string; banco?: string | null } | null;
  proyecto?: { nombre: string; numeroProyecto: string | number; fechaEvento?: string | null } | null;
  cliente?: { nombre: string; empresa?: string | null } | null;
  cotizacion?: { numeroCotizacion: string } | null;
}

export function ReciboPagoPDF({ recibo }: { recibo: ReciboData }) {
  const isAnticipo = recibo.tipoPago === "ANTICIPO";
  const isLiquidacion = recibo.tipoPago === "LIQUIDACION";
  const granTotal = recibo.granTotal ?? 0;
  const saldoRestante = granTotal > 0 ? Math.max(0, granTotal - recibo.monto) : null;

  const isLiquidado = recibo.estado === "LIQUIDADO" || recibo.estado === "PARCIAL";
  const estadoLabel =
    recibo.estado === "LIQUIDADO" ? "PAGADO" :
    recibo.estado === "PARCIAL" ? "PAGO PARCIAL" :
    "PENDIENTE DE COBRO";
    
  let paymentMethod = "";
  if (isLiquidado && recibo.cuentaDestino) {
    const isEfectivo = recibo.cuentaDestino.banco?.toLowerCase().includes("efectivo") || recibo.cuentaDestino.banco?.toLowerCase().includes("caja") || recibo.cuentaDestino.nombre.toLowerCase().includes("caja");
    paymentMethod = isEfectivo ? "Efectivo" : `Transferencia (${recibo.cuentaDestino.banco || recibo.cuentaDestino.nombre})`;
  }

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
            <Text style={[s.amountSub, recibo.estado === 'PENDIENTE' ? s.amountSubPend : {}]}>{estadoLabel}</Text>
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
            {recibo.fechaCobroReal && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Fecha de pago</Text>
                <Text style={s.infoValue}>{fmtDate(recibo.fechaCobroReal)}</Text>
              </View>
            )}
            {paymentMethod && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Método de pago</Text>
                <Text style={s.infoValue}>{paymentMethod}</Text>
              </View>
            )}
            <View style={[s.infoRow, { marginBottom: 0 }]}>
              <Text style={s.infoLabel}>{recibo.fechaCobroReal ? "Fecha compromiso orig." : "Fecha compromiso"}</Text>
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
