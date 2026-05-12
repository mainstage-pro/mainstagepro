import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const WHITE  = "#FFFFFF";
const GRAY   = "#4a4a4a";
const LIGHT  = "#F7F5F0";
const MID    = "#E8E5DF";
const DARK2  = "#1a1a1a";

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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 44,
    paddingTop: 28,
    paddingBottom: 24,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 17, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: "#666666", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docRef: { fontSize: 8, color: "#888888" },
  docDate: { fontSize: 7.5, color: "#666666", marginTop: 2 },

  body: { paddingHorizontal: 44, paddingTop: 26 },

  // ── Para section ─────────────────────────────────────────────────────────────
  paraLabel: { fontSize: 7, color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa: { fontSize: 8.5, color: GRAY, marginBottom: 14 },

  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 16 },
  dividerGold: { borderBottomWidth: 1, borderBottomColor: GOLD + "40", marginVertical: 16 },

  // ── Concepto box ─────────────────────────────────────────────────────────────
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999999", letterSpacing: 1.5, marginBottom: 8 },

  conceptoBox: { backgroundColor: LIGHT, borderRadius: 4, overflow: "hidden", marginBottom: 18 },
  conceptoHeader: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: DARK2, borderRadius: 4,
  },
  conceptoHeaderLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 1 },
  conceptoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 14, paddingVertical: 10,
  },
  conceptoText: { fontSize: 8.5, color: BLACK, flex: 1, paddingRight: 12 },
  conceptoMonto: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },

  // ── Balance table ─────────────────────────────────────────────────────────────
  balanceBox: { marginBottom: 18 },
  balanceTable: { backgroundColor: LIGHT, borderRadius: 4, overflow: "hidden" },
  balanceRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 7, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: MID,
  },
  balanceLabel: { fontSize: 8, color: GRAY },
  balanceValue: { fontSize: 8, color: BLACK },
  balancePaid: { fontSize: 8, color: "#888888" },

  balanceTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: BLACK, borderRadius: 3,
    marginTop: 1,
  },
  balanceTotalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE },
  balanceTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD },
  balanceTotalZero: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#4ade80" },

  // ── Due date box ─────────────────────────────────────────────────────────────
  dueDateBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: GOLD + "12",
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
    borderLeftWidth: 3, borderLeftColor: GOLD,
    marginBottom: 16,
  },
  dueDateLabel: { fontSize: 7.5, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  dueDateValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  // ── Info row ─────────────────────────────────────────────────────────────────
  infoBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoLabel: { fontSize: 7.5, color: "#888888" },
  infoValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "62%", textAlign: "right" },

  nota: { fontSize: 7, color: "#aaaaaa", fontStyle: "italic", lineHeight: 1.5 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18, left: 44, right: 44,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: MID,
    paddingTop: 7,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export interface NotaCobroData {
  id: string;
  concepto: string;
  tipoPago: string;
  monto: number;               // monto de esta CxC
  fechaCompromiso: string;
  granTotal: number | null;    // total del proyecto/cotización
  montoAnticipo: number | null; // anticipo ya registrado (puede no estar pagado aún)
  montoCobrado: number;        // lo ya cobrado en todo el proyecto
  cliente?: { nombre: string; empresa?: string | null; telefono?: string | null } | null;
  proyecto?: { nombre: string; numeroProyecto: string | number; fechaEvento?: string | null } | null;
  cotizacion?: { numeroCotizacion: string } | null;
}

export function NotaCobroPDF({ nota }: { nota: NotaCobroData }) {
  const gt       = nota.granTotal ?? nota.monto;
  const anticipo = nota.montoAnticipo ?? 0;
  const saldo    = Math.max(0, gt - anticipo);
  const isLiquidacion = nota.tipoPago === "LIQUIDACION";

  const clienteNombre = nota.cliente?.nombre ?? "Cliente";
  const clienteEmpresa = nota.cliente?.empresa ?? null;

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
            <Text style={s.docTitle}>NOTA DE COBRO</Text>
            <Text style={s.docRef}>Ref. {nota.id.slice(-8).toUpperCase()}</Text>
            <Text style={s.docDate}>{fmtDate(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Para ── */}
          <Text style={s.paraLabel}>PARA</Text>
          <Text style={s.paraName}>{clienteNombre}</Text>
          {clienteEmpresa && <Text style={s.paraEmpresa}>{clienteEmpresa}</Text>}
          {!clienteEmpresa && <View style={{ marginBottom: 14 }} />}

          {/* ── Proyecto / Cotización info ── */}
          {(nota.proyecto || nota.cotizacion) && (
            <View style={s.infoBox}>
              {nota.proyecto && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Proyecto</Text>
                  <Text style={s.infoValue}>#{nota.proyecto.numeroProyecto} — {nota.proyecto.nombre}</Text>
                </View>
              )}
              {nota.proyecto?.fechaEvento && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Fecha del evento</Text>
                  <Text style={s.infoValue}>{fmtDate(nota.proyecto.fechaEvento)}</Text>
                </View>
              )}
              {nota.cotizacion && (
                <View style={[s.infoRow, { marginBottom: 0 }]}>
                  <Text style={s.infoLabel}>Cotización</Text>
                  <Text style={s.infoValue}>{nota.cotizacion.numeroCotizacion}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Concepto / Servicio ── */}
          <Text style={s.sectionLabel}>DETALLE DEL SERVICIO</Text>
          <View style={s.conceptoBox}>
            <View style={s.conceptoHeader}>
              <Text style={s.conceptoHeaderLabel}>CONCEPTO</Text>
              <Text style={s.conceptoHeaderLabel}>IMPORTE</Text>
            </View>
            <View style={s.conceptoRow}>
              <Text style={s.conceptoText}>{nota.concepto}</Text>
              <Text style={s.conceptoMonto}>{fmt(gt)}</Text>
            </View>
          </View>

          {/* ── Balance de pagos ── */}
          <Text style={s.sectionLabel}>RESUMEN DE COBROS</Text>
          <View style={s.balanceBox}>
            <View style={s.balanceTable}>
              <View style={s.balanceRow}>
                <Text style={s.balanceLabel}>Total del servicio</Text>
                <Text style={s.balanceValue}>{fmt(gt)}</Text>
              </View>
              {anticipo > 0 && (
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Anticipo recibido</Text>
                  <Text style={s.balancePaid}>− {fmt(anticipo)}</Text>
                </View>
              )}
            </View>
            <View style={s.balanceTotalRow}>
              <Text style={s.balanceTotalLabel}>
                {isLiquidacion ? "LIQUIDACIÓN PENDIENTE" : "SALDO POR LIQUIDAR"}
              </Text>
              <Text style={saldo === 0 ? s.balanceTotalZero : s.balanceTotalValue}>
                {fmt(saldo)}
              </Text>
            </View>
          </View>

          {/* ── Fecha compromiso ── */}
          <View style={s.dueDateBox}>
            <Text style={s.dueDateLabel}>FECHA DE PAGO ACORDADA</Text>
            <Text style={s.dueDateValue}>{fmtDate(nota.fechaCompromiso)}</Text>
          </View>

          <Text style={s.nota}>
            Documento interno sin valor fiscal. Para factura oficial, solicítela por separado.{"\n"}
            Mainstage Pro agradece su preferencia y confianza.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Nota de Cobro Interna</Text>
          <Text style={s.footerText}>{new Date().toLocaleDateString("es-MX")}</Text>
        </View>
      </Page>
    </Document>
  );
}
