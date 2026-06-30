import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const DARK   = "#111111";
const GRAY   = "#4a4a4a";
const LG     = "#888888";
const WHITE  = "#FFFFFF";
const CREAM  = "#F7F5F0";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    // NO padding top — el header ocupa ese espacio solo en pág 1
    paddingTop: 0,
    paddingBottom: 52,  // espacio para footer fijo
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },

  // ── Header (solo página 1, NO fixed) ──
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "column" },
  brand:   { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: LG, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 3 },
  docSub:   { fontSize: 8, color: LG },

  // ── Barra dorada ──
  goldBar: { height: 3, backgroundColor: GOLD },

  // ── Aviso privado ──
  privateNote: {
    backgroundColor: CREAM,
    paddingVertical: 8,
    paddingHorizontal: 40,
    fontSize: 7.5,
    color: GRAY,
    textAlign: "center",
    letterSpacing: 0.4,
    fontFamily: "Helvetica-Oblique",
  },

  // ── Body ──
  body: { paddingHorizontal: 40, paddingTop: 18 },

  // ── Info cliente/evento ──
  infoRow:      { flexDirection: "row", marginBottom: 14 },
  infoCol:      { flex: 1 },
  infoColR:     { flex: 1, paddingLeft: 20, borderLeft: "1 solid #e0ddd8" },
  infoLabel:    { fontSize: 7, color: LG, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  infoValue:    { fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold", marginBottom: 7 },
  infoValueLt:  { fontSize: 9, color: GRAY, marginBottom: 7 },

  // ── Separadores ──
  divisor: { height: 1, backgroundColor: "#e5e0d8", marginBottom: 14 },
  dividerGold: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 6 },
  dividerGoldLine: { flex: 1, height: 1, backgroundColor: "#e0ddd8" },
  dividerGoldText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, textTransform: "uppercase", marginHorizontal: 6 },

  // ── Sección header negro ──
  secHeader: {
    backgroundColor: DARK,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  secHeaderText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase" },
  secHeaderAmt:  { fontSize: 8,   fontFamily: "Helvetica-Bold", color: WHITE },

  // ── Filas de línea ──
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottom: "1 solid #f0ece4",
  },
  lineRowAlt: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottom: "1 solid #f0ece4",
    backgroundColor: "#fafaf8",
  },
  lineLeft:  { flex: 3 },
  lineDesc:  { fontSize: 8.5, color: BLACK },
  lineSub:   { fontSize: 7,   color: LG },
  lineAmt:   { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold", textAlign: "right", flex: 1 },

  // ── Subtotal sección ──
  secSubtotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#f2efe8",
    borderBottom: "1 solid #ddd8cc",
  },
  secSubtotalLbl: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY },
  secSubtotalAmt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY },

  // ── Descuento ──
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: "1 solid #f0ece4",
  },
  discountLbl: { fontSize: 8, color: "#c0392b" },
  discountAmt: { fontSize: 8, color: "#c0392b", fontFamily: "Helvetica-Bold" },

  // ── Neto ──
  netoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: DARK,
  },
  netoLbl: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE },
  netoAmt: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE },

  // ── Totales finales ──
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: "1 solid #f0ece4",
  },
  totalLbl: { fontSize: 8.5, color: GRAY },
  totalAmt: { fontSize: 8.5, color: GRAY, textAlign: "right" },

  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: GOLD,
    marginTop: 2,
  },
  grandLbl: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE },
  grandAmt: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE },

  // ── Bloque comisión ──
  comHeader: {
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  comHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" },
  comRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottom: "1 solid #1e1e1e",
    backgroundColor: DARK,
  },
  comRowLbl: { fontSize: 8.5, color: "#cccccc" },
  comRowAmt: { fontSize: 8.5, color: "#cccccc", fontFamily: "Helvetica-Bold" },
  comTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: GOLD,
  },
  comTotalLbl: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE },
  comTotalAmt: { fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE },

  // ── Firmas ──
  firmaBlock: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  firmaCol:   { flex: 1, alignItems: "center" },
  firmaLine:  { height: 1, backgroundColor: "#aaaaaa", width: "75%", marginBottom: 5 },
  firmaLbl:   { fontSize: 7.5, color: LG, letterSpacing: 0.5 },

  // ── Disclaimer ──
  disclaimer: { marginTop: 18, padding: 10, backgroundColor: CREAM },
  disclaimerText: {
    fontSize: 7,
    color: GRAY,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 1.6,
    fontFamily: "Helvetica-Oblique",
  },

  // ── Espaciado ──
  spacer: { height: 10 },

  // ── Footer FIJO (solo este debe ser fixed) ──
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1 solid #e5e0d8",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
  footerGold: { fontSize: 7, color: GOLD, fontFamily: "Helvetica-Bold" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Linea = {
  id: string; tipo: string; descripcion: string; marca: string | null;
  cantidad: number; dias: number; precioUnitario: number; subtotal: number;
  esIncluido: boolean; notas: string | null;
};

type CotizacionData = {
  id: string;
  numeroCotizacion: string;
  opcionLetra: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  subtotalEquiposBruto: number;
  descuentoTotalPct: number;
  montoDescuento: number;
  subtotalEquiposNeto: number;
  subtotalTerceros: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  gastosProduccionActivo: boolean;
  gastosProduccionMonto: number;
  cliente: { nombre: string; empresa: string | null };
  lineas: Linea[];
};

type Props = { cotizacion: CotizacionData; logoSrc: string | null };

// ─── Section header helper ────────────────────────────────────────────────────
function SecHeader({ label, total }: { label: string; total?: number }) {
  return (
    <View style={s.secHeader}>
      <Text style={s.secHeaderText}>{label}</Text>
      {total !== undefined && <Text style={s.secHeaderAmt}>{fmt(total)}</Text>}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ComisionPDF({ cotizacion: cot, logoSrc }: Props) {
  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  const lineasPropias     = cot.lineas.filter(l => l.tipo === "EQUIPO_PROPIO"     && !l.esIncluido);
  const lineasExternas    = cot.lineas.filter(l => l.tipo === "EQUIPO_EXTERNO"    && !l.esIncluido);
  const lineasAdicionales = cot.lineas.filter(l => l.tipo === "OTRO"              && !l.esIncluido);
  const lineasOperacion   = cot.lineas.filter(l => l.tipo === "OPERACION_TECNICA" && !l.esIncluido);
  const lineasTransporte  = cot.lineas.filter(l => l.tipo === "TRANSPORTE"        && !l.esIncluido);
  const lineasComidas     = cot.lineas.filter(l => l.tipo === "COMIDA"            && !l.esIncluido);
  const lineasHospedaje   = cot.lineas.filter(l => l.tipo === "HOSPEDAJE"         && !l.esIncluido);

  const bruto     = cot.subtotalEquiposBruto;
  const descPct   = cot.descuentoTotalPct * 100;
  const descMonto = cot.montoDescuento;
  const neto      = cot.subtotalEquiposNeto;
  const comision  = neto * 0.10;

  const subtotalExt = lineasExternas.reduce((s, l) => s + l.subtotal, 0);
  const subtotalAd  = lineasAdicionales.reduce((s, l) => s + l.subtotal, 0);
  const subtotalOp  = lineasOperacion.reduce((s, l) => s + l.subtotal, 0)  || cot.subtotalOperacion;
  const subtotalTr  = lineasTransporte.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalTransporte;
  const subtotalCo  = lineasComidas.reduce((s, l) => s + l.subtotal, 0)    || cot.subtotalComidas;
  const subtotalHo  = lineasHospedaje.reduce((s, l) => s + l.subtotal, 0)  || cot.subtotalHospedaje;
  const subtotalViaticos = subtotalOp + subtotalTr + subtotalCo + subtotalHo;

  return (
    <Document title={`Acuerdo Comisión — ${cot.numeroCotizacion}`} author="Mainstage Pro">
      <Page size="LETTER" style={s.page}>

        {/* ── Header negro SOLO pág 1 (sin fixed) ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 130, height: 32, objectFit: "contain" }} />
              : <Text style={s.brand}>MAINSTAGE PRO</Text>
            }
            <Text style={s.tagline}>PRODUCCIÓN DE EVENTOS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>ACUERDO DE COMISIÓN</Text>
            <Text style={s.docSub}>
              Ref: {cot.numeroCotizacion}{cot.opcionLetra !== "A" ? ` · Op. ${cot.opcionLetra}` : ""}
            </Text>
            <Text style={[s.docSub, { marginTop: 2 }]}>{fechaDoc}</Text>
          </View>
        </View>

        {/* Barra dorada (sin fixed) */}
        <View style={s.goldBar} />

        {/* Aviso privado (sin fixed) */}
        <View style={s.privateNote}>
          <Text>
            DOCUMENTO PRIVADO Y CONFIDENCIAL · Uso exclusivo entre las partes · Se prohíbe su difusión o compartición
          </Text>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Info cliente / evento */}
          <View style={[s.infoRow, { marginTop: 14 }]}>
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{cot.cliente.nombre}</Text>
              {cot.cliente.empresa
                ? <Text style={s.infoValueLt}>{cot.cliente.empresa}</Text>
                : null}
            </View>
            <View style={s.infoColR}>
              {cot.nombreEvento ? <>
                <Text style={s.infoLabel}>Evento</Text>
                <Text style={s.infoValue}>{cot.nombreEvento}</Text>
              </> : null}
              {cot.fechaEvento ? <>
                <Text style={s.infoLabel}>Fecha</Text>
                <Text style={s.infoValueLt}>{fmtFecha(cot.fechaEvento)}</Text>
              </> : null}
              {cot.lugarEvento ? <>
                <Text style={s.infoLabel}>Lugar</Text>
                <Text style={s.infoValueLt}>{cot.lugarEvento}</Text>
              </> : null}
            </View>
          </View>

          <View style={s.divisor} />

          {/* ── Desglose financiero ── */}
          <View style={s.dividerGold}>
            <View style={s.dividerGoldLine} />
            <Text style={s.dividerGoldText}>Desglose financiero de la cotización</Text>
            <View style={s.dividerGoldLine} />
          </View>

          {/* Equipos Mainstage — wrap=false mantiene header pegado a sus filas */}
          <View wrap={false}>
            <SecHeader label="Equipos Mainstage" total={bruto} />
            {lineasPropias.map((l, i) => (
              <View key={l.id} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt}>
                <View style={s.lineLeft}>
                  <Text style={s.lineDesc}>{l.descripcion}{l.marca ? ` · ${l.marca}` : ""}</Text>
                  <Text style={s.lineSub}>{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""} @ {fmt(l.precioUnitario)}</Text>
                </View>
                <Text style={s.lineAmt}>{fmt(l.subtotal)}</Text>
              </View>
            ))}
            {/* Subtotal bruto */}
            <View style={s.secSubtotal}>
              <Text style={s.secSubtotalLbl}>Subtotal equipos (bruto)</Text>
              <Text style={s.secSubtotalAmt}>{fmt(bruto)}</Text>
            </View>
            {/* Descuento */}
            {descMonto > 0 ? (
              <View style={s.discountRow}>
                <Text style={s.discountLbl}>Descuento aplicado ({descPct.toFixed(1)}%)</Text>
                <Text style={s.discountAmt}>−{fmt(descMonto)}</Text>
              </View>
            ) : null}
            {/* Neto */}
            <View style={s.netoRow}>
              <Text style={s.netoLbl}>Equipos netos (base de comisión)</Text>
              <Text style={s.netoAmt}>{fmt(neto)}</Text>
            </View>
          </View>

          {/* Equipo externo */}
          {subtotalExt > 0 ? (
            <View wrap={false} style={{ marginTop: 14 }}>
              <SecHeader label="Equipo de proveedor externo" total={subtotalExt} />
              {lineasExternas.map((l, i) => (
                <View key={l.id} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt}>
                  <View style={s.lineLeft}>
                    <Text style={s.lineDesc}>{l.descripcion}</Text>
                    <Text style={s.lineSub}>{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""}</Text>
                  </View>
                  <Text style={s.lineAmt}>{fmt(l.subtotal)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Conceptos adicionales */}
          {subtotalAd > 0 ? (
            <View wrap={false} style={{ marginTop: 14 }}>
              <SecHeader label="Conceptos adicionales" total={subtotalAd} />
              {lineasAdicionales.map((l, i) => (
                <View key={l.id} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt}>
                  <View style={s.lineLeft}>
                    <Text style={s.lineDesc}>{l.descripcion}</Text>
                    <Text style={s.lineSub}>{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""} @ {fmt(l.precioUnitario)}</Text>
                  </View>
                  <Text style={s.lineAmt}>{fmt(l.subtotal)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Operación y viáticos */}
          {subtotalViaticos > 0 ? (
            <View wrap={false} style={{ marginTop: 14 }}>
              <SecHeader label="Operación técnica y viáticos" total={subtotalViaticos} />
              {subtotalOp > 0 ? <View style={s.lineRow}><Text style={s.lineDesc}>Operación técnica</Text><Text style={s.lineAmt}>{fmt(subtotalOp)}</Text></View> : null}
              {subtotalTr > 0 ? <View style={s.lineRowAlt}><Text style={s.lineDesc}>Transporte / flete</Text><Text style={s.lineAmt}>{fmt(subtotalTr)}</Text></View> : null}
              {subtotalCo > 0 ? <View style={s.lineRow}><Text style={s.lineDesc}>Viáticos — comidas</Text><Text style={s.lineAmt}>{fmt(subtotalCo)}</Text></View> : null}
              {subtotalHo > 0 ? <View style={s.lineRowAlt}><Text style={s.lineDesc}>Viáticos — hospedaje</Text><Text style={s.lineAmt}>{fmt(subtotalHo)}</Text></View> : null}
            </View>
          ) : null}

          {/* Totales finales — no cortar entre el divisor y el gran total */}
          <View wrap={false} style={{ marginTop: 16 }}>
            <View style={s.divisor} />
            {cot.total !== cot.granTotal ? (
              <View style={s.totalRow}>
                <Text style={s.totalLbl}>Total antes de IVA</Text>
                <Text style={s.totalAmt}>{fmt(cot.total)}</Text>
              </View>
            ) : null}
            {cot.aplicaIva ? (
              <View style={s.totalRow}>
                <Text style={s.totalLbl}>IVA (16%)</Text>
                <Text style={s.totalAmt}>{fmt(cot.montoIva)}</Text>
              </View>
            ) : null}
            <View style={s.grandRow}>
              <Text style={s.grandLbl}>Gran Total cotización</Text>
              <Text style={s.grandAmt}>{fmt(cot.granTotal)}</Text>
            </View>
          </View>

          {/* Bloque de comisión — no cortar */}
          <View wrap={false} style={{ marginTop: 20 }}>
            <View style={s.dividerGold}>
              <View style={s.dividerGoldLine} />
              <Text style={s.dividerGoldText}>Cálculo de comisión</Text>
              <View style={s.dividerGoldLine} />
            </View>
            <View style={s.comHeader}>
              <Text style={s.comHeaderText}>Acuerdo de comisión por intermediación en venta de servicios</Text>
            </View>
            <View style={s.comRow}>
              <Text style={s.comRowLbl}>Base para comisión (equipos Mainstage netos)</Text>
              <Text style={s.comRowAmt}>{fmt(neto)}</Text>
            </View>
            <View style={s.comRow}>
              <Text style={s.comRowLbl}>Porcentaje de comisión pactado</Text>
              <Text style={s.comRowAmt}>10%</Text>
            </View>
            <View style={s.comTotal}>
              <Text style={s.comTotalLbl}>Monto de comisión</Text>
              <Text style={s.comTotalAmt}>{fmt(comision)}</Text>
            </View>
          </View>

          {/* Firmas + disclaimer — no cortar */}
          <View wrap={false} style={{ marginTop: 4 }}>
            <View style={s.firmaBlock}>
              <View style={s.firmaCol}>
                <View style={s.firmaLine} />
                <Text style={s.firmaLbl}>Representante Mainstage Pro</Text>
              </View>
              <View style={s.firmaCol}>
                <View style={s.firmaLine} />
                <Text style={s.firmaLbl}>Comisionista / Agente</Text>
              </View>
            </View>
            <View style={s.disclaimer}>
              <Text style={s.disclaimerText}>
                Este documento es estrictamente privado y confidencial entre las partes firmantes. Se prohíbe expresamente
                su difusión, copia o compartición con terceros, incluyendo al cliente final. El incumplimiento de esta
                cláusula puede resultar en la suspensión de cualquier relación comercial vigente o futura.
              </Text>
            </View>
          </View>

        </View>

        {/* ── Footer FIJO (este sí debe ser fixed) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Documento privado y confidencial · {cot.numeroCotizacion}
          </Text>
          <Text style={s.footerGold}>MAINSTAGE PRO</Text>
        </View>

      </Page>
    </Document>
  );
}
