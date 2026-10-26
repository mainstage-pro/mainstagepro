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

  body: { paddingHorizontal: 44, paddingTop: 22 },

  paraLabel:  { fontSize: 7, color: "#999999", letterSpacing: 1.2, marginBottom: 3 },
  paraName:   { fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 1 },
  paraEmpresa:{ fontSize: 8.5, color: GRAY },

  // Resumen (posición neta)
  resumenRow:  { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 8 },
  resumenCard: { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: 10 },
  resumenLabel:{ fontSize: 6.2, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.8, marginBottom: 4 },
  resumenValue:{ fontSize: 13, fontFamily: "Helvetica-Bold" },
  resumenSub:  { fontSize: 6.5, color: "#888888", marginTop: 3 },

  netoBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: BLACK, borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, marginTop: 2,
  },
  netoLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.4 },
  netoSub:   { fontSize: 6.5, color: "#999999", marginTop: 2 },
  netoValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },

  sectionLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1.3, marginBottom: 8 },
  sectionCount: { fontSize: 7, fontFamily: "Helvetica", color: "#999999" },

  table:     { borderRadius: 4, overflow: "hidden", marginBottom: 18 },
  th:        { flexDirection: "row", backgroundColor: DARK2, paddingHorizontal: 10, paddingVertical: 7 },
  thText:    { fontSize: 6.2, fontFamily: "Helvetica-Bold", color: "#aaaaaa", letterSpacing: 0.7 },
  tr:        { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: LIGHT },
  cConcepto: { flex: 2.8, paddingRight: 6 },
  cRef:      { flex: 1.4, paddingRight: 6 },
  cFecha:    { flex: 1.1, paddingRight: 4 },
  cMonto:    { flex: 1.1, textAlign: "right" },
  cAbonado:  { flex: 1.1, textAlign: "right" },
  cSaldo:    { flex: 1.2, textAlign: "right" },
  tdConcepto:{ fontSize: 7.8, color: BLACK },
  tdSub:     { fontSize: 6.3, color: "#888888", marginTop: 1 },
  tdText:    { fontSize: 7.2, color: GRAY },
  tdMonto:   { fontSize: 7.8, color: BLACK },
  tdAbonado: { fontSize: 7.3, color: "#666666" },
  tdSaldo:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK },
  totalRow:  { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#efece4" },
  totalLabel:{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.5 },
  totalValue:{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  badge:     { fontSize: 5.8, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, marginTop: 1 },

  empty:     { fontSize: 8, color: "#888888", fontStyle: "italic", marginBottom: 16 },

  // Cuentas bancarias
  cuentasWrap: { marginBottom: 14, marginTop: 4 },
  cuentasRow:  { flexDirection: "row", gap: 8 },
  cuentaCard:  { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  cuentaTitulo:{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, marginBottom: 6 },
  cuentaFila:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  cuentaLabel: { fontSize: 7, color: "#888888" },
  cuentaValor: { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLACK, maxWidth: "58%", textAlign: "right" },

  nota: { fontSize: 6.8, color: "#999999", fontStyle: "italic", lineHeight: 1.5, marginTop: 2 },
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
  PARCIALMENTE_COMPENSADO: "#7a5cb2",
  COMPENSADO: GREEN,
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
  pagado: number;             // montoCobrado/Pagado + montoCompensado
  abonado?: number;
  compensado?: number;
  estado: string;
}

export interface EstadoCuentaCompensacion {
  id: string;
  fecha: string;
  importeCompensado: number;
  estado: string;
  notas: string | null;
}

export interface EstadoCuentaData {
  logoSrc?: string | null;
  cliente: string;
  empresa: string | null;
  generadoEn: string;         // ISO
  porCobrar: EstadoCuentaLinea[];
  porPagar: EstadoCuentaLinea[];
  esRelacionMutua?: boolean;
  compensaciones?: EstadoCuentaCompensacion[];
}

function esPendiente(l: EstadoCuentaLinea): boolean {
  if (l.estado === "LIQUIDADO" || l.estado === "COMPENSADO" || l.estado === "CANCELADO" || l.estado === "ANULADO") {
    return false;
  }
  return Math.max(0, l.monto - l.pagado) > 0.01;
}

function Tabla({
  titulo,
  subtituloCount,
  lineas,
  tipo,
  emptyText,
}: {
  titulo: string;
  subtituloCount?: string;
  lineas: EstadoCuentaLinea[];
  tipo: "cobrar" | "pagar";
  emptyText?: string;
}) {
  const totalMonto = lineas.reduce((sum, l) => sum + l.monto, 0);
  const totalSaldo = lineas.reduce((sum, l) => sum + (esPendiente(l) ? Math.max(0, l.monto - l.pagado) : 0), 0);
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
        <Text style={s.sectionLabel}>{titulo}</Text>
        <Text style={s.sectionCount}>
          {subtituloCount ?? `${lineas.length} concepto${lineas.length !== 1 ? "s" : ""}`}
        </Text>
      </View>
      {lineas.length === 0 ? (
        <Text style={s.empty}>{emptyText ?? "Sin movimientos pendientes registrados."}</Text>
      ) : (
        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, s.cConcepto]}>CONCEPTO</Text>
            <Text style={[s.thText, s.cRef]}>REFERENCIA</Text>
            <Text style={[s.thText, s.cFecha]}>FECHA</Text>
            <Text style={[s.thText, s.cMonto]}>MONTO</Text>
            <Text style={[s.thText, s.cAbonado]}>ABONADO</Text>
            <Text style={[s.thText, s.cSaldo]}>SALDO</Text>
          </View>
          {lineas.map((l) => {
            const pendiente = esPendiente(l);
            const saldo = pendiente ? Math.max(0, l.monto - l.pagado) : 0;
            const cubierto = pendiente ? l.pagado : l.monto;
            return (
              <View key={l.id} style={s.tr} wrap={false}>
                <View style={s.cConcepto}>
                  <Text style={s.tdConcepto}>{l.concepto}</Text>
                  {l.detalle && <Text style={s.tdSub}>{l.detalle}</Text>}
                </View>
                <View style={s.cRef}>
                  <Text style={s.tdText}>{l.referencia ?? "—"}</Text>
                  <Text style={[s.badge, { color: ESTADO_COLOR[l.estado] ?? "#999999" }]}>
                    {l.estado === "PARCIALMENTE_COMPENSADO" ? "PARCIAL COMP." : l.estado}
                  </Text>
                </View>
                <Text style={[s.tdText, s.cFecha]}>{fmtDate(l.fecha)}</Text>
                <Text style={[s.tdMonto, s.cMonto]}>{fmt(l.monto)}</Text>
                <Text style={[s.tdAbonado, s.cAbonado]}>
                  {cubierto > 0 ? fmt(cubierto) : "—"}
                </Text>
                <Text
                  style={[
                    s.tdSaldo,
                    s.cSaldo,
                    { color: saldo === 0 ? GREEN : tipo === "cobrar" ? BLACK : RED },
                  ]}
                >
                  {fmt(saldo)}
                </Text>
              </View>
            );
          })}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>
              {tipo === "cobrar"
                ? "TOTAL SALDO POR COBRAR (A FAVOR DE MAINSTAGE)"
                : "TOTAL SALDO RENTAS MUTUAS POR PAGAR (EN CONTRA)"}
            </Text>
            <Text style={s.totalValue}>
              {totalSaldo > 0 ? fmt(totalSaldo) : `${fmt(0)} (Monto histórico: ${fmt(totalMonto)})`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function EstadoCuentaPDF({ data }: { data: EstadoCuentaData }) {
  const porCobrarPendientes = data.porCobrar.filter(esPendiente);
  const porPagarPendientes  = data.porPagar.filter(esPendiente);
  const porPagarHistoricas  = data.porPagar.filter((l) => !esPendiente(l));

  const saldoCobrar = porCobrarPendientes.reduce((sum, l) => sum + Math.max(0, l.monto - l.pagado), 0);
  const saldoPagar  = porPagarPendientes.reduce((sum, l) => sum + Math.max(0, l.monto - l.pagado), 0);
  const montoCompensable = Math.min(saldoCobrar, saldoPagar);
  const neto = saldoCobrar - saldoPagar;

  const tieneRelacionMutua =
    Boolean(data.esRelacionMutua) ||
    data.porPagar.length > 0 ||
    (data.compensaciones && data.compensaciones.length > 0);
  const logoSrc = data.logoSrc ?? null;

  // Si todas las rentas mutuas ya están liquidadas pero sí hubo rentas mutuas con esta empresa/cliente,
  // mostramos las más recientes para que quede constancia en su estado de cuenta.
  const mostrarPagarLineas =
    porPagarPendientes.length > 0 ? porPagarPendientes : porPagarHistoricas.slice(-8);

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

          {/* Resumen de saldos (Por cobrar / Rentas mutuas por pagar / Cruce o Balance) */}
          <View style={s.resumenRow}>
            <View style={s.resumenCard}>
              <Text style={s.resumenLabel}>SALDO A FAVOR (POR COBRAR)</Text>
              <Text style={[s.resumenValue, { color: saldoCobrar > 0 ? GOLD : GREEN }]}>{fmt(saldoCobrar)}</Text>
              <Text style={s.resumenSub}>
                {porCobrarPendientes.length} renta{porCobrarPendientes.length !== 1 ? "s" : ""} / servicio{porCobrarPendientes.length !== 1 ? "s" : ""} a cliente
              </Text>
            </View>
            <View style={s.resumenCard}>
              <Text style={s.resumenLabel}>SALDO EN CONTRA (RENTAS MUTUAS)</Text>
              <Text style={[s.resumenValue, { color: saldoPagar > 0 ? RED : GREEN }]}>{fmt(saldoPagar)}</Text>
              <Text style={s.resumenSub}>
                {porPagarPendientes.length > 0
                  ? `${porPagarPendientes.length} renta${porPagarPendientes.length !== 1 ? "s" : ""} mutua${porPagarPendientes.length !== 1 ? "s" : ""} por pagar`
                  : data.porPagar.length > 0
                    ? `${data.porPagar.length} renta${data.porPagar.length !== 1 ? "s" : ""} mutua${data.porPagar.length !== 1 ? "s" : ""} liquidada${data.porPagar.length !== 1 ? "s" : ""}`
                    : "Sin rentas mutuas pendientes"}
              </Text>
            </View>
            {montoCompensable > 0 && (
              <View style={s.resumenCard}>
                <Text style={s.resumenLabel}>COMPENSABLE (CRUCE MUTUO)</Text>
                <Text style={[s.resumenValue, { color: GOLD }]}>{fmt(montoCompensable)}</Text>
                <Text style={s.resumenSub}>Disponible para cruce de saldos</Text>
              </View>
            )}
          </View>

          {/* Posición neta (Saldo a favor o en contra) */}
          <View style={s.netoBox}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.netoLabel}>
                {neto > 0
                  ? "SALDO NETO A FAVOR DE MAINSTAGE (POR COBRAR)"
                  : neto < 0
                    ? `SALDO NETO EN CONTRA — A FAVOR DE ${data.cliente.toUpperCase()} (POR PAGAR)`
                    : "SALDO NETO EN CEROS (CUENTA AL CORRIENTE)"}
              </Text>
              <Text style={s.netoSub}>
                {neto > 0
                  ? saldoPagar > 0
                    ? `Diferencia a nuestro favor tras descontar ${fmt(saldoPagar)} de rentas mutuas`
                    : "Importe neto pendiente de cobro a favor de Mainstage Pro"
                  : neto < 0
                    ? saldoCobrar > 0
                      ? `Diferencia a favor de ${data.cliente} tras descontar ${fmt(saldoCobrar)} por cobrar`
                      : `Importe neto pendiente por pagar a ${data.cliente}`
                    : "Las cuentas por cobrar y rentas mutuas se encuentran liquidadas"}
              </Text>
            </View>
            <Text
              style={[
                s.netoValue,
                { color: neto > 0 ? GOLD : neto < 0 ? "#ef4444" : GREEN },
              ]}
            >
              {neto > 0 ? `+${fmt(neto)}` : neto < 0 ? `-${fmt(Math.abs(neto))}` : fmt(0)}
            </Text>
          </View>

          {/* Detalle por cobrar */}
          <Tabla
            titulo="CUENTAS POR COBRAR (RENTAS Y SERVICIOS AL CLIENTE)"
            lineas={porCobrarPendientes}
            tipo="cobrar"
            emptyText="Sin cuentas pendientes por cobrar."
          />

          {/* Detalle de rentas mutuas / por pagar */}
          {tieneRelacionMutua && (
            <Tabla
              titulo={
                porPagarPendientes.length > 0
                  ? "RENTAS MUTUAS / CUENTAS POR PAGAR (SERVICIOS COMO PROVEEDOR)"
                  : "RENTAS MUTUAS / CUENTAS POR PAGAR (HISTORIAL LIQUIDADO)"
              }
              subtituloCount={
                porPagarPendientes.length > 0
                  ? `${porPagarPendientes.length} pendiente${porPagarPendientes.length !== 1 ? "s" : ""}`
                  : `${mostrarPagarLineas.length} liquidada${mostrarPagarLineas.length !== 1 ? "s" : ""}`
              }
              lineas={mostrarPagarLineas}
              tipo="pagar"
              emptyText="Sin rentas mutuas pendientes por pagar."
            />
          )}

          {/* Historial de compensaciones si existen */}
          {data.compensaciones && data.compensaciones.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                <Text style={s.sectionLabel}>COMPENSACIONES APLICADAS (CRUCE DE RENTAS MUTUAS)</Text>
                <Text style={s.sectionCount}>{data.compensaciones.length} registro{data.compensaciones.length !== 1 ? "s" : ""}</Text>
              </View>
              <View style={s.table}>
                <View style={s.th}>
                  <Text style={[s.thText, { flex: 1.5 }]}>FECHA</Text>
                  <Text style={[s.thText, { flex: 3.5 }]}>NOTAS / DETALLE</Text>
                  <Text style={[s.thText, { flex: 1.5, textAlign: "right" }]}>IMPORTE COMPENSADO</Text>
                </View>
                {data.compensaciones.map((c) => (
                  <View key={c.id} style={s.tr} wrap={false}>
                    <Text style={[s.tdText, { flex: 1.5 }]}>{fmtDate(c.fecha)}</Text>
                    <Text style={[s.tdConcepto, { flex: 3.5 }]}>{c.notas || "Cruce de cuentas por cobrar y rentas mutuas"}</Text>
                    <Text style={[s.tdSaldo, { flex: 1.5, textAlign: "right", color: GREEN }]}>{fmt(c.importeCompensado)}</Text>
                  </View>
                ))}
              </View>
            </View>
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
