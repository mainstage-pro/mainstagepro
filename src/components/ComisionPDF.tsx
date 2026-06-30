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
const RED_LT = "#c0392b";
const BLUE_LT = "#2980b9";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // Header negro
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
  headerLeft: { flexDirection: "column" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: LG, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  docSub: { fontSize: 8, color: LG },
  // Barra dorada
  goldBar: { height: 3, backgroundColor: GOLD },
  // Aviso privado
  privateNote: {
    backgroundColor: CREAM,
    paddingVertical: 8,
    paddingHorizontal: 40,
    fontSize: 8,
    color: GRAY,
    textAlign: "center",
    letterSpacing: 0.4,
    fontFamily: "Helvetica-Oblique",
  },
  // Body
  body: { paddingHorizontal: 40, paddingTop: 20 },
  // Info cliente/evento
  infoRow: { flexDirection: "row", gap: 0, marginBottom: 16 },
  infoCol: { flex: 1 },
  infoColR: { flex: 1, paddingLeft: 20, borderLeft: "1 solid #e0ddd8" },
  infoLabel: { fontSize: 7, color: LG, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  infoValueLight: { fontSize: 9, color: GRAY, marginBottom: 8 },
  divisor: { height: 1, backgroundColor: "#e5e0d8", marginBottom: 16 },
  // Sección header
  secHeader: {
    backgroundColor: BLACK,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  secHeaderText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase" },
  secHeaderAmt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE },
  // Fila de línea
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: "1 solid #f0ece4",
  },
  lineRowAlt: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: "1 solid #f0ece4",
    backgroundColor: "#fafaf8",
  },
  lineDesc: { fontSize: 8.5, color: BLACK, flex: 3 },
  lineSub: { fontSize: 7, color: LG },
  lineAmt: { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold", textAlign: "right", flex: 1 },
  // Subtotal de sección
  sectionSubtotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#f2efe8",
    borderBottom: "1 solid #ddd8cc",
  },
  sectionSubtotalLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY },
  sectionSubtotalAmt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY },
  // Bloque de descuento
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: "1 solid #f0ece4",
  },
  discountLabel: { fontSize: 8, color: RED_LT },
  discountAmt: { fontSize: 8, color: RED_LT, fontFamily: "Helvetica-Bold" },
  // Bloque neto
  netoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: DARK,
  },
  netoLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE },
  netoAmt: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE },
  // Totales generales
  totalBlock: { marginTop: 4 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: "1 solid #f0ece4",
  },
  totalLabel: { fontSize: 8.5, color: GRAY },
  totalAmt: { fontSize: 8.5, color: GRAY, textAlign: "right" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: GOLD,
    marginTop: 2,
  },
  grandTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE },
  grandTotalAmt: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE },
  // Comisión
  comisionBlock: { marginTop: 16, backgroundColor: "#0a0a0a", borderRadius: 4 },
  comisionHeader: {
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  comisionHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" },
  comisionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottom: "1 solid #1e1e1e",
  },
  comisionRowLabel: { fontSize: 8.5, color: "#cccccc" },
  comisionRowAmt: { fontSize: 8.5, color: "#cccccc", fontFamily: "Helvetica-Bold" },
  comisionTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  comisionTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE },
  comisionTotalAmt: { fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE },
  // Reconocimiento / firma
  firmaBlock: { marginTop: 28, flexDirection: "row", justifyContent: "space-between", gap: 20 },
  firmaCol: { flex: 1, alignItems: "center" },
  firmaLine: { height: 1, backgroundColor: "#aaaaaa", width: "80%", marginBottom: 6 },
  firmaLabel: { fontSize: 7.5, color: LG, letterSpacing: 0.5 },
  // Disclaimer
  disclaimer: {
    marginTop: 24,
    padding: 10,
    backgroundColor: CREAM,
    borderRadius: 3,
  },
  disclaimerText: {
    fontSize: 7,
    color: GRAY,
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 1.5,
    fontFamily: "Helvetica-Oblique",
  },
  // Separador de sección (dorado)
  dividerGold: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 6,
  },
  dividerGoldLine: { flex: 1, height: 1, backgroundColor: "#e0ddd8" },
  dividerGoldText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5, textTransform: "uppercase", marginHorizontal: 6 },
  // Espaciado
  spacer: { height: 12 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: "#c0c0c0" },
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

// ─── Section header ───────────────────────────────────────────────────────────
function SecHeader({ label, total }: { label: string; total?: number }) {
  return (
    <View style={s.secHeader}>
      <Text style={s.secHeaderText}>{label}</Text>
      {total !== undefined && <Text style={s.secHeaderAmt}>{fmt(total)}</Text>}
    </View>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
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

type Props = {
  cotizacion: CotizacionData;
  logoSrc: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function ComisionPDF({ cotizacion: cot, logoSrc }: Props) {
  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  const lineasPropias      = cot.lineas.filter(l => l.tipo === "EQUIPO_PROPIO"    && !l.esIncluido);
  const lineasExternas     = cot.lineas.filter(l => l.tipo === "EQUIPO_EXTERNO"   && !l.esIncluido);
  const lineasAdicionales  = cot.lineas.filter(l => l.tipo === "OTRO"             && !l.esIncluido);
  const lineasOperacion    = cot.lineas.filter(l => l.tipo === "OPERACION_TECNICA"&& !l.esIncluido);
  const lineasTransporte   = cot.lineas.filter(l => l.tipo === "TRANSPORTE"       && !l.esIncluido);
  const lineasComidas      = cot.lineas.filter(l => l.tipo === "COMIDA"           && !l.esIncluido);
  const lineasHospedaje    = cot.lineas.filter(l => l.tipo === "HOSPEDAJE"        && !l.esIncluido);

  const bruto       = cot.subtotalEquiposBruto;
  const descPct     = cot.descuentoTotalPct * 100;
  const descMonto   = cot.montoDescuento;
  const neto        = cot.subtotalEquiposNeto;
  const comision    = neto * 0.10;

  const subtotalExt  = lineasExternas.reduce((s, l) => s + l.subtotal, 0);
  const subtotalAd   = lineasAdicionales.reduce((s, l) => s + l.subtotal, 0);
  const subtotalOp   = lineasOperacion.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalOperacion;
  const subtotalTr   = lineasTransporte.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalTransporte;
  const subtotalCo   = lineasComidas.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalComidas;
  const subtotalHo   = lineasHospedaje.reduce((s, l) => s + l.subtotal, 0) || cot.subtotalHospedaje;

  return (
    <Document title={`Acuerdo Comisión — ${cot.numeroCotizacion}`} author="Mainstage Pro">
      <Page size="LETTER" style={s.page}>

        {/* ── Header negro ── */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 120, height: 28, objectFit: "contain" }} />
              : <Text style={s.brand}>MAINSTAGE PRO</Text>
            }
            <Text style={s.tagline}>PRODUCCIÓN DE EVENTOS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>ACUERDO DE COMISIÓN</Text>
            <Text style={s.docSub}>Ref: {cot.numeroCotizacion}{cot.opcionLetra !== "A" ? ` · Op. ${cot.opcionLetra}` : ""}</Text>
            <Text style={[s.docSub, { marginTop: 2 }]}>{fechaDoc}</Text>
          </View>
        </View>

        {/* Barra dorada */}
        <View style={s.goldBar} fixed />

        {/* Aviso privado */}
        <View style={s.privateNote}>
          <Text>DOCUMENTO PRIVADO Y CONFIDENCIAL · Uso exclusivo entre las partes · Se prohíbe su difusión o compartición sin autorización expresa</Text>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Info cliente / evento */}
          <View style={[s.infoRow, { marginTop: 16 }]}>
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{cot.cliente.nombre}</Text>
              {cot.cliente.empresa && <Text style={s.infoValueLight}>{cot.cliente.empresa}</Text>}
            </View>
            <View style={s.infoColR}>
              {cot.nombreEvento && <>
                <Text style={s.infoLabel}>Evento</Text>
                <Text style={s.infoValue}>{cot.nombreEvento}</Text>
              </>}
              {cot.fechaEvento && <>
                <Text style={s.infoLabel}>Fecha</Text>
                <Text style={s.infoValueLight}>{fmtFecha(cot.fechaEvento)}</Text>
              </>}
              {cot.lugarEvento && <>
                <Text style={s.infoLabel}>Lugar</Text>
                <Text style={s.infoValueLight}>{cot.lugarEvento}</Text>
              </>}
            </View>
          </View>

          <View style={s.divisor} />

          {/* ── Equipos Mainstage (propios) ── */}
          <View style={[s.dividerGold]}>
            <View style={s.dividerGoldLine} />
            <Text style={s.dividerGoldText}>Desglose financiero de la cotización</Text>
            <View style={s.dividerGoldLine} />
          </View>

          <SecHeader label="Equipos Mainstage" total={bruto} />
          {lineasPropias.map((l, i) => (
            <View key={l.id} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt}>
              <View style={{ flex: 3 }}>
                <Text style={s.lineDesc}>{l.descripcion}{l.marca ? ` · ${l.marca}` : ""}</Text>
                <Text style={s.lineSub}>{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""} @ {fmt(l.precioUnitario)}</Text>
              </View>
              <Text style={s.lineAmt}>{fmt(l.subtotal)}</Text>
            </View>
          ))}
          {/* Subtotal bruto */}
          <View style={s.sectionSubtotal}>
            <Text style={s.sectionSubtotalLabel}>Subtotal equipos (bruto)</Text>
            <Text style={s.sectionSubtotalAmt}>{fmt(bruto)}</Text>
          </View>
          {/* Descuento */}
          {descMonto > 0 && (
            <View style={s.discountRow}>
              <Text style={s.discountLabel}>Descuento aplicado ({descPct.toFixed(1)}%)</Text>
              <Text style={s.discountAmt}>−{fmt(descMonto)}</Text>
            </View>
          )}
          {/* Neto */}
          <View style={s.netoRow}>
            <Text style={s.netoLabel}>Equipos netos (base de comisión)</Text>
            <Text style={s.netoAmt}>{fmt(neto)}</Text>
          </View>

          {/* Equipo externo */}
          {subtotalExt > 0 && <>
            <View style={s.spacer} />
            <SecHeader label="Equipo de proveedor externo" total={subtotalExt} />
            {lineasExternas.map((l, i) => (
              <View key={l.id} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt}>
                <View style={{ flex: 3 }}>
                  <Text style={s.lineDesc}>{l.descripcion}</Text>
                  <Text style={s.lineSub}>{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""}</Text>
                </View>
                <Text style={s.lineAmt}>{fmt(l.subtotal)}</Text>
              </View>
            ))}
          </>}

          {/* Conceptos adicionales */}
          {subtotalAd > 0 && <>
            <View style={s.spacer} />
            <SecHeader label="Conceptos adicionales" total={subtotalAd} />
            {lineasAdicionales.map((l, i) => (
              <View key={l.id} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt}>
                <View style={{ flex: 3 }}>
                  <Text style={s.lineDesc}>{l.descripcion}</Text>
                  <Text style={s.lineSub}>{l.cantidad} u × {l.dias} día{l.dias !== 1 ? "s" : ""} @ {fmt(l.precioUnitario)}</Text>
                </View>
                <Text style={s.lineAmt}>{fmt(l.subtotal)}</Text>
              </View>
            ))}
          </>}

          {/* Operación y viáticos */}
          {(subtotalOp + subtotalTr + subtotalCo + subtotalHo) > 0 && <>
            <View style={s.spacer} />
            <SecHeader label="Operación técnica y viáticos" total={subtotalOp + subtotalTr + subtotalCo + subtotalHo} />
            {subtotalOp > 0 && <View style={s.lineRow}><Text style={s.lineDesc}>Operación técnica</Text><Text style={s.lineAmt}>{fmt(subtotalOp)}</Text></View>}
            {subtotalTr > 0 && <View style={s.lineRowAlt}><Text style={s.lineDesc}>Transporte / flete</Text><Text style={s.lineAmt}>{fmt(subtotalTr)}</Text></View>}
            {subtotalCo > 0 && <View style={s.lineRow}><Text style={s.lineDesc}>Viáticos — comidas</Text><Text style={s.lineAmt}>{fmt(subtotalCo)}</Text></View>}
            {subtotalHo > 0 && <View style={s.lineRowAlt}><Text style={s.lineDesc}>Viáticos — hospedaje</Text><Text style={s.lineAmt}>{fmt(subtotalHo)}</Text></View>}
          </>}

          {/* Totales finales */}
          <View style={[s.spacer, { height: 16 }]} />
          <View style={s.divisor} />
          <View style={s.totalBlock}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total antes de IVA</Text>
              <Text style={s.totalAmt}>{fmt(cot.total)}</Text>
            </View>
            {cot.aplicaIva && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>IVA (16%)</Text>
                <Text style={s.totalAmt}>{fmt(cot.montoIva)}</Text>
              </View>
            )}
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Gran Total cotización</Text>
            <Text style={s.grandTotalAmt}>{fmt(cot.granTotal)}</Text>
          </View>

          {/* ── Cálculo de Comisión ── */}
          <View style={[s.dividerGold, { marginTop: 24 }]}>
            <View style={s.dividerGoldLine} />
            <Text style={s.dividerGoldText}>Cálculo de comisión</Text>
            <View style={s.dividerGoldLine} />
          </View>

          <View style={s.comisionBlock}>
            <View style={s.comisionHeader}>
              <Text style={s.comisionHeaderText}>Acuerdo de comisión por intermediación en venta</Text>
            </View>
            <View style={s.comisionRow}>
              <Text style={s.comisionRowLabel}>Base para comisión (equipos Mainstage netos)</Text>
              <Text style={s.comisionRowAmt}>{fmt(neto)}</Text>
            </View>
            <View style={s.comisionRow}>
              <Text style={s.comisionRowLabel}>Porcentaje de comisión pactado</Text>
              <Text style={s.comisionRowAmt}>10%</Text>
            </View>
            <View style={s.comisionTotal}>
              <Text style={s.comisionTotalLabel}>Monto de comisión</Text>
              <Text style={s.comisionTotalAmt}>{fmt(comision)}</Text>
            </View>
          </View>

          {/* Firmas */}
          <View style={s.firmaBlock}>
            <View style={s.firmaCol}>
              <View style={s.firmaLine} />
              <Text style={s.firmaLabel}>Representante Mainstage Pro</Text>
            </View>
            <View style={s.firmaCol}>
              <View style={s.firmaLine} />
              <Text style={s.firmaLabel}>Comisionista / Agente</Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={s.disclaimer}>
            <Text style={s.disclaimerText}>
              Este documento es estrictamente privado y confidencial entre las partes firmantes. Se prohíbe expresamente su difusión, copia o compartición con terceros, incluyendo al cliente final. El incumplimiento de esta cláusula puede resultar en la suspensión de cualquier relación comercial vigente o futura.
            </Text>
          </View>

        </View>

        {/* Footer fijo */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Documento privado y confidencial · {cot.numeroCotizacion}</Text>
          <Text style={s.footerGold}>MAINSTAGE PRO</Text>
        </View>

      </Page>
    </Document>
  );
}
