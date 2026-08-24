import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const WHITE = "#FFFFFF";
const GRAY  = "#4a4a4a";
const LIGHT = "#F7F5F0";
const MID   = "#E8E5DF";
const DARK2 = "#1a1a1a";
const GREEN = "#1f7a4d";
const RED   = "#b23b3b";

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
  logo:    { width: 120, height: 30, objectFit: "contain", marginBottom: 4 },
  brand:   { fontSize: 17, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: "#666666", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2, letterSpacing: 0.5 },
  docRef:   { fontSize: 8, color: "#888888" },
  docDate:  { fontSize: 7.5, color: "#666666", marginTop: 2 },

  body: { paddingHorizontal: 44, paddingTop: 24 },

  paraLabel:  { fontSize: 7, color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName:   { fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa:{ fontSize: 8.5, color: GRAY },

  // Resumen (posición neta)
  resumenRow:  { flexDirection: "row", gap: 10, marginTop: 18, marginBottom: 8 },
  resumenCard: { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: 12 },
  resumenLabel:{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#999999", letterSpacing: 1, marginBottom: 5 },
  resumenValue:{ fontSize: 14, fontFamily: "Helvetica-Bold" },
  resumenSub:  { fontSize: 6.5, color: "#999999", marginTop: 3 },

  netoBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: BLACK, borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 13, marginBottom: 22, marginTop: 2,
  },
  netoLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE },
  netoSub:   { fontSize: 6.5, color: "#888888", marginTop: 2 },
  netoValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD },

  sectionLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1.5, marginBottom: 8 },
  sectionCount: { fontSize: 7, fontFamily: "Helvetica", color: "#999999" },

  table:     { borderRadius: 4, overflow: "hidden", marginBottom: 20 },
  th:        { flexDirection: "row", backgroundColor: DARK2, paddingHorizontal: 12, paddingVertical: 7 },
  thText:    { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#aaaaaa", letterSpacing: 0.8 },
  tr:        { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: LIGHT },
  cConcepto: { flex: 3, paddingRight: 8 },
  cRef:      { flex: 1.6, paddingRight: 6 },
  cFecha:    { flex: 1.3, paddingRight: 6 },
  cMonto:    { flex: 1.3, textAlign: "right" },
  cSaldo:    { flex: 1.3, textAlign: "right" },
  tdConcepto:{ fontSize: 8, color: BLACK },
  tdSub:     { fontSize: 6.5, color: "#999999", marginTop: 1 },
  tdText:    { fontSize: 7.5, color: GRAY },
  tdMonto:   { fontSize: 8, color: BLACK },
  tdSaldo:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK },
  totalRow:  { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#efece4" },
  totalLabel:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.5 },
  totalValue:{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  badge:     { fontSize: 6, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },

  empty:     { fontSize: 8, color: "#aaaaaa", fontStyle: "italic", marginBottom: 20 },

  // Cuentas bancarias
  cuentasWrap: { marginBottom: 16, marginTop: 4 },
  cuentasRow:  { flexDirection: "row", gap: 8 },
  cuentaCard:  { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  cuentaTitulo:{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, marginBottom: 6 },
  cuentaFila:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  cuentaLabel: { fontSize: 7, color: "#888888" },
  cuentaValor: { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "58%", textAlign: "right" },

  nota: { fontSize: 7, color: "#aaaaaa", fontStyle: "italic", lineHeight: 1.5, marginTop: 4 },
  footer: {
    position: "absolute", bottom: 18, left: 44, right: 44,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: MID, paddingTop: 7,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "#9a7d33",
  PARCIAL:   "#7a5cb2",
  LIQUIDADO: GREEN,
  VENCIDO:   RED,
};

export interface EstadoCuentaLinea {
  id: string;
  concepto: string;
  referencia: string | null;  // cotización o proyecto
  detalle: string | null;     // nombre del proyecto/acreedor
  fecha: string;              // ISO
  monto: number;
  pagado: number;
  estado: string;
}

export interface EstadoCuentaData {
  logoSrc?: string | null;
  cliente: string;
  empresa: string | null;
  generadoEn: string;         // ISO
  porCobrar: EstadoCuentaLinea[];
  porPagar: EstadoCuentaLinea[];
}

function Tabla({ titulo, lineas, tipo }: { titulo: string; lineas: EstadoCuentaLinea[]; tipo: "cobrar" | "pagar" }) {
  const totalSaldo = lineas.reduce((sum, l) => sum + Math.max(0, l.monto - l.pagado), 0);
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
        <Text style={s.sectionLabel}>{titulo}</Text>
        <Text style={s.sectionCount}>{lineas.length} concepto{lineas.length !== 1 ? "s" : ""}</Text>
      </View>
      {lineas.length === 0 ? (
        <Text style={s.empty}>Sin movimientos registrados.</Text>
      ) : (
        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, s.cConcepto]}>CONCEPTO</Text>
            <Text style={[s.thText, s.cRef]}>REFERENCIA</Text>
            <Text style={[s.thText, s.cFecha]}>COMPROMISO</Text>
            <Text style={[s.thText, s.cMonto]}>MONTO</Text>
            <Text style={[s.thText, s.cSaldo]}>SALDO</Text>
          </View>
          {lineas.map((l) => {
            const saldo = Math.max(0, l.monto - l.pagado);
            return (
              <View key={l.id} style={s.tr}>
                <View style={s.cConcepto}>
                  <Text style={s.tdConcepto}>{l.concepto}</Text>
                  {l.detalle && <Text style={s.tdSub}>{l.detalle}</Text>}
                </View>
                <View style={s.cRef}>
                  <Text style={s.tdText}>{l.referencia ?? "—"}</Text>
                  <Text style={[s.badge, { color: ESTADO_COLOR[l.estado] ?? "#999999" }]}>{l.estado}</Text>
                </View>
                <Text style={[s.tdText, s.cFecha]}>{fmtDate(l.fecha)}</Text>
                <Text style={[s.tdMonto, s.cMonto]}>{fmt(l.monto)}</Text>
                <Text style={[s.tdSaldo, s.cSaldo, { color: saldo === 0 ? GREEN : (tipo === "cobrar" ? BLACK : RED) }]}>
                  {fmt(saldo)}
                </Text>
              </View>
            );
          })}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{tipo === "cobrar" ? "TOTAL POR COBRAR" : "TOTAL POR PAGAR"}</Text>
            <Text style={s.totalValue}>{fmt(totalSaldo)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function EstadoCuentaPDF({ data }: { data: EstadoCuentaData }) {
  const porCobrar = data.porCobrar.filter(l => l.estado !== "LIQUIDADO");
  const porPagar  = data.porPagar.filter(l => l.estado !== "LIQUIDADO");

  const saldoCobrar = porCobrar.reduce((sum, l) => sum + Math.max(0, l.monto - l.pagado), 0);
  const saldoPagar  = porPagar.reduce((sum, l) => sum + Math.max(0, l.monto - l.pagado), 0);
  const neto = saldoCobrar - saldoPagar;
  const tieneProveedor = porPagar.length > 0;
  const logoSrc = data.logoSrc ?? null;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            {logoSrc
              ? <Image src={logoSrc} style={s.logo} />
              : <Text style={s.brand}>MAINSTAGE PRO</Text>}
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>ESTADO DE CUENTA</Text>
            <Text style={s.docRef}>{data.cliente}</Text>
            <Text style={s.docDate}>Emitido {fmtDate(data.generadoEn)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* Para */}
          <Text style={s.paraLabel}>ESTADO DE CUENTA DE</Text>
          <Text style={s.paraName}>{data.cliente}</Text>
          {data.empresa && <Text style={s.paraEmpresa}>{data.empresa}</Text>}

          {/* Resumen de saldos */}
          <View style={s.resumenRow}>
            <View style={s.resumenCard}>
              <Text style={s.resumenLabel}>POR COBRAR</Text>
              <Text style={[s.resumenValue, { color: saldoCobrar > 0 ? GOLD : GREEN }]}>{fmt(saldoCobrar)}</Text>
              <Text style={s.resumenSub}>{porCobrar.length} concepto{porCobrar.length !== 1 ? "s" : ""}</Text>
            </View>
            {tieneProveedor && (
              <View style={s.resumenCard}>
                <Text style={s.resumenLabel}>POR PAGAR</Text>
                <Text style={[s.resumenValue, { color: saldoPagar > 0 ? RED : GREEN }]}>{fmt(saldoPagar)}</Text>
                <Text style={s.resumenSub}>{porPagar.length} concepto{porPagar.length !== 1 ? "s" : ""}</Text>
              </View>
            )}
          </View>

          {/* Posición neta (solo si hay relación mutua) */}
          {tieneProveedor && (
            <View style={s.netoBox}>
              <View>
                <Text style={s.netoLabel}>{neto >= 0 ? "BALANCE NETO A NUESTRO FAVOR" : "BALANCE NETO A SU FAVOR"}</Text>
                <Text style={s.netoSub}>Diferencia entre las cuentas por cobrar y por pagar</Text>
              </View>
              <Text style={s.netoValue}>{fmt(Math.abs(neto))}</Text>
            </View>
          )}

          {/* Detalle por cobrar */}
          <Tabla titulo="CUENTAS POR COBRAR" lineas={porCobrar} tipo="cobrar" />

          {/* Detalle por pagar */}
          {tieneProveedor && (
            <Tabla titulo="CUENTAS POR PAGAR" lineas={porPagar} tipo="pagar" />
          )}

          {/* Cuentas bancarias */}
          <Text style={s.sectionLabel}>DATOS PARA TRANSFERENCIA</Text>
          <View style={s.cuentasWrap}>
            <View style={s.cuentasRow}>
              <View style={s.cuentaCard}>
                <Text style={s.cuentaTitulo}>CUENTA FISCAL</Text>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Razón Social</Text><Text style={s.cuentaValor}>Escenario Principal Producciones</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>RFC</Text><Text style={s.cuentaValor}>EPP2502068Q8</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Banco</Text><Text style={s.cuentaValor}>Banorte</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>No. Cuenta</Text><Text style={s.cuentaValor}>1313102977</Text></View>
                <View style={[s.cuentaFila, { marginBottom: 0 }]}><Text style={s.cuentaLabel}>CLABE</Text><Text style={s.cuentaValor}>072 680 013131029777</Text></View>
              </View>
              <View style={s.cuentaCard}>
                <Text style={s.cuentaTitulo}>CUENTA NO FISCAL</Text>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Beneficiario</Text><Text style={s.cuentaValor}>Jose Mauricio A. Hernández V.M.</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Banco</Text><Text style={s.cuentaValor}>Banorte</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>No. Cuenta</Text><Text style={s.cuentaValor}>1314637038</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>CLABE</Text><Text style={s.cuentaValor}>072 680 013146370385</Text></View>
                <View style={[s.cuentaFila, { marginBottom: 0 }]}><Text style={s.cuentaLabel}>Correo</Text><Text style={s.cuentaValor}>mainstageqro@gmail.com</Text></View>
              </View>
            </View>
          </View>

          <Text style={s.nota}>
            Documento informativo sin valor fiscal. Los saldos reflejan la información registrada al {fmtDate(data.generadoEn)}.{"\n"}
            Para cualquier aclaración sobre este estado de cuenta, contáctenos. Mainstage Pro agradece su confianza.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Estado de Cuenta</Text>
          <Text style={s.footerText}>{new Date().toLocaleDateString("es-MX")}</Text>
        </View>
      </Page>
    </Document>
  );
}
