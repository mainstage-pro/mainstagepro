import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

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
  paraLabel:  { fontSize: 7,  color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName:   { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa:{ fontSize: 8.5,color: GRAY, marginBottom: 14 },
  divider:    { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 16 },
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
  conceptoText:  { fontSize: 8.5, color: BLACK, flex: 1, paddingRight: 12 },
  conceptoMonto: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  balanceBox:   { marginBottom: 18 },
  balanceTable: { backgroundColor: LIGHT, borderRadius: 4, overflow: "hidden" },
  balanceRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 9, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: MID,
  },
  balanceLabel: { fontSize: 8.5, color: GRAY },
  balanceValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  balancePaid:  { fontSize: 8.5, color: "#888888" },
  balanceTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: BLACK, borderRadius: 3,
    marginTop: 2,
  },
  balanceTotalLabel: { fontSize: 9,  fontFamily: "Helvetica-Bold", color: WHITE },
  balanceTotalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GOLD },
  balanceTotalZero:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#4ade80" },
  dueDateBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: GOLD + "12",
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
    borderLeftWidth: 3, borderLeftColor: GOLD,
    marginBottom: 16,
  },
  dueDateLabel: { fontSize: 7.5, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  dueDateValue: { fontSize: 9,   fontFamily: "Helvetica-Bold", color: BLACK },
  infoBox:  { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 16 },
  infoRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoLabel:{ fontSize: 7.5, color: "#888888" },
  infoValue:{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "62%", textAlign: "right" },
  // Cuentas bancarias
  cuentasWrap:  { marginBottom: 18 },
  cuentasRow:   { flexDirection: "row", gap: 8 },
  cuentaCard:   { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  cuentaTitulo: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, marginBottom: 6 },
  cuentaFila:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  cuentaLabel:  { fontSize: 7, color: "#888888" },
  cuentaValor:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "58%", textAlign: "right" },

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

export interface NotaCobroData {
  logoSrc?: string | null;
  id: string;
  concepto: string;
  tipoPago: string;
  monto: number;
  montoOriginal?: number | null;
  fechaCompromiso: string;
  granTotal: number | null;
  montoAnticipo: number | null;
  montoCobrado: number;
  cliente?: { nombre: string; empresa?: string | null; telefono?: string | null } | null;
  proyecto?: { nombre: string; numeroProyecto: string | number; fechaEvento?: string | null } | null;
  cotizacion?: { numeroCotizacion: string } | null;
}

export function NotaCobroPDF({ nota }: { nota: NotaCobroData }) {
  const baseGt   = nota.granTotal ?? (nota.montoOriginal ?? nota.monto);
  const ajuste   = (nota.montoOriginal != null) ? nota.monto - nota.montoOriginal : 0;
  const gt       = baseGt + ajuste;
  const anticipo = nota.montoAnticipo ?? 0;
  const saldo    = Math.max(0, gt - anticipo);

  const clienteNombre  = nota.cliente?.nombre  ?? "Cliente";
  const clienteEmpresa = nota.cliente?.empresa ?? null;
  const logoSrc        = nota.logoSrc ?? null;

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
            <View style={s.conceptoHeader}>
              <Text style={s.conceptoHeaderLabel}>DESCRIPCIÓN</Text>
              <Text style={s.conceptoHeaderLabel}>TOTAL SERVICIO</Text>
            </View>
            <View style={s.conceptoRow}>
              <Text style={s.conceptoText}>{nota.concepto}</Text>
              <Text style={s.conceptoMonto}>{fmt(gt)}</Text>
            </View>
          </View>

          {/* Resumen de cobros */}
          <Text style={s.sectionLabel}>RESUMEN DE COBROS</Text>
          <View style={s.balanceBox}>
            <View style={s.balanceTable}>
              <View style={s.balanceRow}>
                <Text style={s.balanceLabel}>Total del servicio</Text>
                <Text style={s.balanceValue}>{fmt(gt)}</Text>
              </View>
              <View style={[s.balanceRow, { borderBottomWidth: 0 }]}>
                <Text style={s.balanceLabel}>Anticipo recibido</Text>
                <Text style={anticipo > 0 ? s.balancePaid : s.balanceValue}>
                  {anticipo > 0 ? `- ${fmt(anticipo)}` : "Sin anticipo"}
                </Text>
              </View>
            </View>
            <View style={s.balanceTotalRow}>
              <Text style={s.balanceTotalLabel}>RESTA POR PAGAR</Text>
              <Text style={saldo === 0 ? s.balanceTotalZero : s.balanceTotalValue}>
                {fmt(saldo)}
              </Text>
            </View>
          </View>

          {/* Fecha de pago */}
          <View style={s.dueDateBox}>
            <Text style={s.dueDateLabel}>FECHA DE PAGO ACORDADA</Text>
            <Text style={s.dueDateValue}>{fmtDate(nota.fechaCompromiso)}</Text>
          </View>

          {/* Cuentas bancarias para el pago */}
          <Text style={s.sectionLabel}>DATOS PARA TRANSFERENCIA</Text>
          <View style={s.cuentasWrap}>
            <View style={s.cuentasRow}>
              <View style={s.cuentaCard}>
                <Text style={s.cuentaTitulo}>CUENTA FISCAL</Text>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Razón Social</Text><Text style={s.cuentaValor}>Escenario Principal Producciones</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>RFC</Text><Text style={s.cuentaValor}>EPP2502068Q8</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Banco</Text><Text style={s.cuentaValor}>Banorte</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>No. Cuenta</Text><Text style={s.cuentaValor}>1313102977</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>CLABE</Text><Text style={s.cuentaValor}>072 680 013131029777</Text></View>
                <View style={[s.cuentaFila, { marginBottom: 0 }]}><Text style={s.cuentaLabel}>Tarjeta</Text><Text style={s.cuentaValor}>4189 2810 0070 3307</Text></View>
              </View>
              <View style={s.cuentaCard}>
                <Text style={s.cuentaTitulo}>CUENTA NO FISCAL</Text>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Beneficiario</Text><Text style={s.cuentaValor}>Jose Mauricio A. Hernández V.M.</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>RFC</Text><Text style={s.cuentaValor}>HEVM9611179YA</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>Banco</Text><Text style={s.cuentaValor}>Banorte</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>No. Cuenta</Text><Text style={s.cuentaValor}>1314637038</Text></View>
                <View style={s.cuentaFila}><Text style={s.cuentaLabel}>CLABE</Text><Text style={s.cuentaValor}>072 680 013146370385</Text></View>
                <View style={[s.cuentaFila, { marginBottom: 0 }]}><Text style={s.cuentaLabel}>Correo</Text><Text style={s.cuentaValor}>mainstageqro@gmail.com</Text></View>
              </View>
            </View>
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
