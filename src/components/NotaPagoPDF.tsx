import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const WHITE = "#FFFFFF";
const GRAY  = "#4a4a4a";
const LIGHT = "#F7F5F0";
const MID   = "#E8E5DF";
const DARK2 = "#1a1a1a";

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
    paddingHorizontal: 44,
    paddingTop: 28,
    paddingBottom: 24,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo:     { width: 110, height: 28, objectFit: "contain", marginBottom: 4 },
  brand:    { fontSize: 17, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline:  { fontSize: 7,  color: "#666666", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docRef:   { fontSize: 8,  color: "#888888" },
  docDate:  { fontSize: 7.5,color: "#666666", marginTop: 2 },
  body:     { paddingHorizontal: 44, paddingTop: 26 },
  paraLabel:   { fontSize: 7,  color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName:    { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa: { fontSize: 8.5,color: GRAY, marginBottom: 14 },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999999", letterSpacing: 1.5, marginBottom: 8 },
  infoBox:  { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 16 },
  infoRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoLabel:{ fontSize: 7.5, color: "#888888" },
  infoValue:{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "62%", textAlign: "right" },
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
  conceptoText:  { fontSize: 8.5, color: BLACK, flex: 1, paddingRight: 12 },
  conceptoMonto: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  montoBox:   { marginBottom: 18 },
  montoTotal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: BLACK, borderRadius: 3,
  },
  montoLabel: { fontSize: 9,  fontFamily: "Helvetica-Bold", color: WHITE },
  montoValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GOLD },
  // Datos bancarios del acreedor
  bancosWrap:  { marginBottom: 18 },
  bancoCard:   { backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  bancoTitulo: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, marginBottom: 6 },
  bancoFila:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  bancoLabel:  { fontSize: 7.5, color: "#888888" },
  bancoValor:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "60%", textAlign: "right" },

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
  footer: {
    position: "absolute", bottom: 18, left: 44, right: 44,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: MID, paddingTop: 7,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export interface NotaPagoData {
  id: string;
  logoSrc?: string | null;
  concepto: string;
  monto: number;
  fechaCompromiso: string;
  fechaPagoReal?: string | null;
  estado: string;
  beneficiario: string;
  empresaBeneficiario?: string | null;
  banco?: string | null;
  cuentaBancaria?: string | null;
  clabe?: string | null;
  noTarjeta?: string | null;
  rfc?: string | null;
  proyecto?: { nombre: string; numeroProyecto: string | number; fechaEvento?: string | null } | null;
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  PARCIAL:   "Pago parcial",
  LIQUIDADO: "Liquidado",
  VENCIDO:   "Vencido",
};

export function NotaPagoPDF({ nota }: { nota: NotaPagoData }) {
  const logoSrc = nota.logoSrc ?? null;

  return (
    <Document>
      <Page size="A5" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            {logoSrc
              ? <Image src={logoSrc} style={s.logo} />
              : <Text style={s.brand}>MAINSTAGE PRO</Text>
            }
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>NOTA DE PAGO</Text>
            <Text style={s.docRef}>Ref. {nota.id.slice(-8).toUpperCase()}</Text>
            <Text style={s.docDate}>{fmtDate(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* Para */}
          <Text style={s.paraLabel}>PARA</Text>
          <Text style={s.paraName}>{nota.beneficiario}</Text>
          {nota.empresaBeneficiario
            ? <Text style={s.paraEmpresa}>{nota.empresaBeneficiario}</Text>
            : <View style={{ marginBottom: 14 }} />
          }

          {/* Proyecto */}
          {nota.proyecto && (
            <View style={s.infoBox}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Proyecto</Text>
                <Text style={s.infoValue}>#{nota.proyecto.numeroProyecto} — {nota.proyecto.nombre}</Text>
              </View>
              {nota.proyecto.fechaEvento && (
                <View style={[s.infoRow, { marginBottom: 0 }]}>
                  <Text style={s.infoLabel}>Fecha del evento</Text>
                  <Text style={s.infoValue}>{fmtDate(nota.proyecto.fechaEvento)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Concepto */}
          <Text style={s.sectionLabel}>CONCEPTO</Text>
          <View style={s.conceptoBox}>
            <View style={s.conceptoHeader}>
              <Text style={s.conceptoHeaderLabel}>DESCRIPCIÓN</Text>
              <Text style={s.conceptoHeaderLabel}>IMPORTE</Text>
            </View>
            <View style={s.conceptoRow}>
              <Text style={s.conceptoText}>{nota.concepto}</Text>
              <Text style={s.conceptoMonto}>{fmt(nota.monto)}</Text>
            </View>
          </View>

          {/* Total a pagar */}
          <Text style={s.sectionLabel}>TOTAL A PAGAR</Text>
          <View style={s.montoBox}>
            <View style={s.montoTotal}>
              <Text style={s.montoLabel}>MONTO TOTAL</Text>
              <Text style={s.montoValue}>{fmt(nota.monto)}</Text>
            </View>
          </View>

          {/* Fecha de pago */}
          <View style={s.dueDateBox}>
            <Text style={s.dueDateLabel}>
              {nota.estado === "LIQUIDADO" ? "FECHA DE PAGO REALIZADO" : "FECHA DE PAGO ACORDADA"}
            </Text>
            <Text style={s.dueDateValue}>
              {nota.estado === "LIQUIDADO" && nota.fechaPagoReal
                ? fmtDate(nota.fechaPagoReal)
                : fmtDate(nota.fechaCompromiso)}
            </Text>
          </View>

          {/* Estado */}
          <View style={[s.infoBox, { marginBottom: 16 }]}>
            <View style={[s.infoRow, { marginBottom: 0 }]}>
              <Text style={s.infoLabel}>Estado del pago</Text>
              <Text style={s.infoValue}>{ESTADO_LABEL[nota.estado] ?? nota.estado}</Text>
            </View>
          </View>



          <Text style={s.nota}>
            Documento interno sin valor fiscal. Para factura oficial, solicítela por separado.{"\n"}
            Mainstage Pro agradece la relación comercial.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Nota de Pago Interna</Text>
          <Text style={s.footerText}>{new Date().toLocaleDateString("es-MX")}</Text>
        </View>
      </Page>
    </Document>
  );
}
