import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const WHITE = "#FFFFFF";
const GRAY  = "#4a4a4a";
const LIGHT = "#F7F5F0";
const MID   = "#E8E5DF";

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

  // Header
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
  brand:    { fontSize: 17, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline:  { fontSize: 7,  color: "#666666", letterSpacing: 1 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docRef:   { fontSize: 8,  color: "#888888" },
  docDate:  { fontSize: 7.5,color: "#666666", marginTop: 2 },

  body: { paddingHorizontal: 44, paddingTop: 26 },

  // Para
  paraLabel:  { fontSize: 7,  color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName:   { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa:{ fontSize: 8.5,color: GRAY, marginBottom: 14 },

  // Info box (proyecto / cotización)
  infoBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoLabel:{ fontSize: 7.5, color: "#888888" },
  infoValue:{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "62%", textAlign: "right" },

  // Concepto
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999999", letterSpacing: 1.5, marginBottom: 6 },
  conceptoBox:  { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 20 },
  conceptoText: { fontSize: 9, color: BLACK, lineHeight: 1.5 },

  // ── Resumen de cobros (3 filas prominentes) ──
  resumenBox:   { marginBottom: 18 },
  resumenRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: MID,
    backgroundColor: LIGHT,
  },
  resumenRowFirst: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  resumenLabel: { fontSize: 8.5, color: GRAY },
  resumenValue: { fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" },
  resumenAnticipoValue: { fontSize: 9, color: "#888888" },

  // Fila total (saldo)
  saldoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: BLACK,
    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
    marginTop: 1,
  },
  saldoLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  saldoValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GOLD },
  saldoZero:  { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#4ade80" },

  // Fecha de pago
  dueDateBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: GOLD + "12",
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
    borderLeftWidth: 3, borderLeftColor: GOLD,
    marginBottom: 16,
  },
  dueDateLabel: { fontSize: 7.5, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  dueDateValue: { fontSize: 9,   fontFamily: "Helvetica-Bold", color: BLACK },

  nota: { fontSize: 7, color: "#aaaaaa", fontStyle: "italic", lineHeight: 1.5 },

  // Footer
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
  monto: number;
  fechaCompromiso: string;
  granTotal: number | null;
  montoAnticipo: number | null;
  montoCobrado: number;
  cliente?: { nombre: string; empresa?: string | null; telefono?: string | null } | null;
  proyecto?: { nombre: string; numeroProyecto: string | number; fechaEvento?: string | null } | null;
  cotizacion?: { numeroCotizacion: string } | null;
}

export function NotaCobroPDF({ nota }: { nota: NotaCobroData }) {
  const gt       = nota.granTotal ?? nota.monto;
  const anticipo = nota.montoAnticipo ?? 0;
  const saldo    = Math.max(0, gt - anticipo);

  const clienteNombre  = nota.cliente?.nombre  ?? "Cliente";
  const clienteEmpresa = nota.cliente?.empresa ?? null;

  return (
    <Document>
      <Page size="A5" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>NOTA DE COBRO</Text>
            <Text style={s.docRef}>Ref. {nota.id.slice(-8).toUpperCase()}</Text>
            <Text style={s.docDate}>{fmtDate(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* Para */}
          <Text style={s.paraLabel}>PARA</Text>
          <Text style={s.paraName}>{clienteNombre}</Text>
          {clienteEmpresa
            ? <Text style={s.paraEmpresa}>{clienteEmpresa}</Text>
            : <View style={{ marginBottom: 14 }} />
          }

          {/* Proyecto / Cotización */}
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

          {/* Concepto */}
          <Text style={s.sectionLabel}>CONCEPTO</Text>
          <View style={s.conceptoBox}>
            <Text style={s.conceptoText}>{nota.concepto}</Text>
          </View>

          {/* ── Resumen de cobros ── */}
          <Text style={s.sectionLabel}>RESUMEN DE COBROS</Text>
          <View style={s.resumenBox}>

            {/* Fila 1: Total del servicio */}
            <View style={[s.resumenRow, s.resumenRowFirst]}>
              <Text style={s.resumenLabel}>Total del servicio</Text>
              <Text style={s.resumenValue}>{fmt(gt)}</Text>
            </View>

            {/* Fila 2: Anticipo (siempre visible, 0 si no hay) */}
            <View style={s.resumenRow}>
              <Text style={s.resumenLabel}>Anticipo recibido</Text>
              <Text style={anticipo > 0 ? s.resumenAnticipoValue : s.resumenValue}>
                {anticipo > 0 ? `− ${fmt(anticipo)}` : "—"}
              </Text>
            </View>

            {/* Fila 3: Saldo */}
            <View style={s.saldoRow}>
              <Text style={s.saldoLabel}>RESTA POR PAGAR</Text>
              <Text style={saldo === 0 ? s.saldoZero : s.saldoValue}>{fmt(saldo)}</Text>
            </View>

          </View>

          {/* Fecha de pago */}
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
