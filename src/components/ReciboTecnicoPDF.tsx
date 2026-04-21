import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
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

  // Sección beneficiario
  beneficiarioBox: {
    backgroundColor: LIGHT,
    borderRadius: 4,
    padding: 14,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  beneficiarioLabel: { fontSize: 7, color: "#888888", marginBottom: 3, letterSpacing: 0.8 },
  beneficiarioNombre: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK },
  fechaLabel: { fontSize: 7, color: "#888888", textAlign: "right", marginBottom: 3 },
  fechaValue: { fontSize: 8, color: GRAY, textAlign: "right" },

  // Tabla conceptos
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLACK,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: MID,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: MID,
    backgroundColor: LIGHT,
  },
  colConcepto: { flex: 3 },
  colProyecto: { flex: 2 },
  colFecha: { flex: 1.5 },
  colMonto: { flex: 1.5, alignItems: "flex-end" },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.8 },
  tdText: { fontSize: 8, color: BLACK },
  tdSub: { fontSize: 7, color: GRAY, marginTop: 1 },
  tdMonto: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK },

  // Total
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BLACK,
    borderRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD },

  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 14 },

  // Firma
  firmaSection: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  firmaBox: { width: "42%" },
  firmaLine: { borderBottomWidth: 1, borderBottomColor: "#cccccc", marginBottom: 5 },
  firmaLabel: { fontSize: 7, color: "#888888", textAlign: "center" },

  nota: { fontSize: 7, color: "#aaaaaa", fontStyle: "italic", lineHeight: 1.5, marginTop: 16 },

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
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export interface ConceptoReciboTecnico {
  id: string;
  concepto: string;
  monto: number;
  fechaCompromiso: string;
  proyecto: { nombre: string; numeroProyecto: string } | null;
}

export interface ReciboTecnicoData {
  tecnicoNombre: string;
  tipoAcreedor?: string;
  conceptos: ConceptoReciboTecnico[];
  total: number;
  fechaEmision: string;
  refNum: string;
}

export function ReciboTecnicoPDF({ recibo }: { recibo: ReciboTecnicoData }) {
  const titulo = recibo.tipoAcreedor === "PROVEEDOR" ? "RECIBO DE PAGO" : "RECIBO DE HONORARIOS";
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{titulo}</Text>
            <Text style={s.docNum}>Ref. {recibo.refNum}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* Beneficiario + fecha */}
          <View style={s.beneficiarioBox}>
            <View>
              <Text style={s.beneficiarioLabel}>BENEFICIARIO</Text>
              <Text style={s.beneficiarioNombre}>{recibo.tecnicoNombre}</Text>
            </View>
            <View>
              <Text style={s.fechaLabel}>FECHA DE EMISIÓN</Text>
              <Text style={s.fechaValue}>{fmtDate(recibo.fechaEmision)}</Text>
            </View>
          </View>

          {/* Tabla de conceptos */}
          <View style={s.tableHeader}>
            <View style={s.colConcepto}><Text style={s.thText}>CONCEPTO</Text></View>
            <View style={s.colProyecto}><Text style={s.thText}>PROYECTO</Text></View>
            <View style={s.colFecha}><Text style={s.thText}>FECHA</Text></View>
            <View style={s.colMonto}><Text style={s.thText}>MONTO</Text></View>
          </View>

          {recibo.conceptos.map((c, i) => (
            <View key={c.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.colConcepto}>
                <Text style={s.tdText}>{c.concepto}</Text>
              </View>
              <View style={s.colProyecto}>
                {c.proyecto ? (
                  <>
                    <Text style={s.tdText}>{c.proyecto.nombre}</Text>
                    <Text style={s.tdSub}>#{c.proyecto.numeroProyecto}</Text>
                  </>
                ) : (
                  <Text style={[s.tdText, { color: GRAY }]}>—</Text>
                )}
              </View>
              <View style={s.colFecha}>
                <Text style={s.tdText}>{fmtDateShort(c.fechaCompromiso)}</Text>
              </View>
              <View style={s.colMonto}>
                <Text style={s.tdMonto}>{fmt(c.monto)}</Text>
              </View>
            </View>
          ))}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
            <Text style={s.totalValue}>{fmt(recibo.total)}</Text>
          </View>

          <View style={s.divider} />

          {/* Firmas */}
          <View style={s.firmaSection}>
            <View style={s.firmaBox}>
              <View style={s.firmaLine}><Text> </Text></View>
              <Text style={s.firmaLabel}>Firma del técnico — {recibo.tecnicoNombre}</Text>
            </View>
            <View style={s.firmaBox}>
              <View style={s.firmaLine}><Text> </Text></View>
              <Text style={s.firmaLabel}>Autorizado por — Mainstage Pro</Text>
            </View>
          </View>

          <Text style={s.nota}>
            Documento interno sin valor fiscal. Los honorarios aquí descritos corresponden a servicios prestados en las fechas indicadas.{"\n"}
            Para factura oficial, solicítela por separado. Ref: {recibo.refNum}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Recibo de Honorarios</Text>
          <Text style={s.footerText}>Emitido: {fmtDate(recibo.fechaEmision)}</Text>
        </View>
      </Page>
    </Document>
  );
}
