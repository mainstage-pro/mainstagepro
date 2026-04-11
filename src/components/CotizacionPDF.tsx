import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

// Helvetica viene integrada en react-pdf, no requiere registro adicional

// ─── Paleta de colores ────────────────────────────────────────────────────────
const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const DARK = "#111111";
const GRAY = "#4a4a4a";
const LIGHT_GRAY = "#888888";
const WHITE = "#FFFFFF";
const BG_SECTION = "#F7F5F0"; // fondo crema muy suave para secciones

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // Header negro con oro
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 44,
    paddingBottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {
    flexDirection: "column",
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 7.5,
    color: "#888888",
    letterSpacing: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  numCotizacion: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 2,
  },
  fechaHeader: {
    fontSize: 7.5,
    color: "#888888",
  },
  // Barra dorada
  goldBar: {
    height: 3,
    backgroundColor: GOLD,
  },
  // Agradecimiento
  gracias: {
    backgroundColor: "#F7F5F0",
    paddingVertical: 10,
    paddingHorizontal: 40,
    fontSize: 8,
    color: GRAY,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Oblique",
  },
  // Info del cliente y evento
  infoBloque: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 0,
  },
  infoCol: {
    flex: 1,
  },
  infoColRight: {
    flex: 1,
    paddingLeft: 20,
    borderLeft: "1 solid #e0ddd8",
  },
  infoLabel: {
    fontSize: 7,
    color: LIGHT_GRAY,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  infoValueLight: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 8,
  },
  // Divisor
  divisor: {
    height: 1,
    backgroundColor: "#e0ddd8",
    marginHorizontal: 40,
    marginVertical: 4,
  },
  // Sección título
  seccionTitulo: {
    paddingHorizontal: 40,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seccionLinea: {
    height: 1.5,
    backgroundColor: GOLD,
    width: 20,
    marginRight: 6,
  },
  seccionNombre: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // Tabla
  tablaHeader: {
    flexDirection: "row",
    backgroundColor: BLACK,
    paddingVertical: 5,
    paddingHorizontal: 40,
  },
  tablaHeaderTexto: {
    fontSize: 7,
    color: "#888888",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  tablaFila: {
    flexDirection: "row",
    paddingVertical: 5.5,
    paddingHorizontal: 40,
    borderBottom: "1 solid #f0ede8",
  },
  tablaFilaAlt: {
    backgroundColor: BG_SECTION,
  },
  tablaIncluido: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 40,
    borderBottom: "1 solid #f5f3ef",
  },
  colDesc: { flex: 4 },
  colMarca: { flex: 2 },
  colCant: { flex: 1, textAlign: "center" },
  colDias: { flex: 1, textAlign: "center" },
  colPrecio: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },
  cellDesc: {
    fontSize: 8.5,
    color: BLACK,
  },
  cellMarca: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
  },
  cellNum: {
    fontSize: 8.5,
    color: GRAY,
    textAlign: "center",
  },
  cellPrecio: {
    fontSize: 8.5,
    color: GRAY,
    textAlign: "right",
  },
  cellSubtotal: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textAlign: "right",
  },
  cellIncluido: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
    fontFamily: "Helvetica-Oblique",
  },
  badgeNivel: {
    fontSize: 6.5,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginLeft: 4,
  },
  // Totales
  totalesBloque: {
    marginHorizontal: 40,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalesTabla: {
    width: 220,
    borderTop: "1.5 solid " + GOLD,
  },
  totalFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottom: "1 solid #f0ede8",
  },
  totalFilaDes: {
    fontSize: 8,
    color: GRAY,
  },
  totalFilaMonto: {
    fontSize: 8,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
  },
  totalFilaDescuento: {
    color: "#c0392b",
  },
  totalGranTotal: {
    backgroundColor: BLACK,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginTop: 2,
  },
  totalGranLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  totalGranMonto: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
  },
  // Bloque de anticipo
  anticipo: {
    marginHorizontal: 40,
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  anticipoItem: {
    flex: 1,
    backgroundColor: BG_SECTION,
    borderLeft: "2 solid " + GOLD,
    padding: 8,
  },
  anticipoLabel: {
    fontSize: 7,
    color: LIGHT_GRAY,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  anticipoMonto: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
  // Beneficio
  beneficioBloque: {
    marginHorizontal: 40,
    marginTop: 12,
    backgroundColor: "#FFFBF2",
    border: "1 solid " + GOLD,
    borderRadius: 4,
    padding: 12,
  },
  beneficioTitulo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 5,
  },
  beneficioTexto: {
    fontSize: 7.5,
    color: GRAY,
    lineHeight: 1.5,
  },
  // Nota del beneficio
  beneficioNota: {
    fontSize: 7,
    color: LIGHT_GRAY,
    fontFamily: "Helvetica-Oblique",
    marginTop: 4,
    lineHeight: 1.4,
  },
  // Datos de pago
  pagoBloque: {
    marginHorizontal: 40,
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  pagoCard: {
    flex: 1,
    backgroundColor: BLACK,
    padding: 12,
    borderRadius: 3,
  },
  pagoTitulo: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 8,
  },
  pagoFila: {
    flexDirection: "row",
    marginBottom: 3,
  },
  pagoLabel: {
    fontSize: 7,
    color: "#888",
    width: 80,
  },
  pagoValor: {
    fontSize: 7,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  // Términos
  terminosBloque: {
    marginHorizontal: 40,
    marginTop: 16,
    backgroundColor: BG_SECTION,
    padding: 12,
    borderRadius: 3,
  },
  terminosTitulo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 6,
  },
  terminoItem: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  terminoBullet: {
    width: 12,
    fontSize: 7.5,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  terminoTexto: {
    fontSize: 7.5,
    color: GRAY,
    flex: 1,
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    backgroundColor: BLACK,
    paddingVertical: 14,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  footerBrand: {
    fontSize: 9,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  footerContacto: {
    fontSize: 7.5,
    color: "#888",
    textAlign: "center",
  },
  footerVigencia: {
    fontSize: 7,
    color: "#666",
    textAlign: "right",
  },
  confidencial: {
    fontSize: 6.5,
    color: "#555",
    textAlign: "center",
    marginHorizontal: 40,
    marginTop: 8,
    fontFamily: "Helvetica-Oblique",
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtMXN(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string | Date | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

const TIPO_LINEA_SECTION: Record<string, string> = {
  EQUIPO_PROPIO: "equipo",
  EQUIPO_EXTERNO: "equipo",
  PAQUETE: "equipo",
  OPERACION_TECNICA: "operacion",
  DJ: "operacion",
  TRANSPORTE: "logistica",
  COMIDA: "logistica",
  HOSPEDAJE: "logistica",
};

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Linea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  nivel: string | null;
  jornada: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
}

interface CotizacionData {
  numeroCotizacion: string;
  version: number;
  nombreEvento: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: Date | null;
  lugarEvento: string | null;
  diasEquipo: number;
  diasOperacion: number;
  observaciones: string | null;
  notasSecciones: string | null;
  vigenciaDias: number;
  createdAt: Date;
  subtotalEquiposBruto: number;
  descuentoTotalPct: number;
  descuentoVolumenPct: number;
  descuentoB2bPct: number;
  descuentoMultidiaPct: number;
  descuentoPatrocinioPct: number;
  descuentoEspecialPct: number;
  montoDescuento: number;
  montoBeneficio: number;
  subtotalEquiposNeto: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  cliente: {
    nombre: string;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
    tipoCliente: string;
  };
  creadaPor: { name: string } | null;
  lineas: Linea[];
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function FilaEquipo({ l, i }: { l: Linea; i: number }) {
  return (
    <View style={[s.tablaFila, i % 2 === 1 ? s.tablaFilaAlt : {}]}>
      <Text style={[s.cellDesc, s.colDesc]}>{l.descripcion}</Text>
      <Text style={[s.cellMarca, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || "—"}</Text>
      <Text style={[s.cellNum, s.colCant]}>{l.cantidad}</Text>
      <Text style={[s.cellNum, s.colDias]}>{l.dias}</Text>
      <Text style={[s.cellPrecio, s.colPrecio]}>{fmtMXN(l.precioUnitario)}</Text>
      <Text style={[s.cellSubtotal, s.colSubtotal]}>{fmtMXN(l.subtotal)}</Text>
    </View>
  );
}

function TablaEquipos({ lineas, notasSecciones }: { lineas: Linea[]; notasSecciones: Record<string, string> }) {
  // Parse category from notas field (format: "cat:CategoryName" or "cat:CategoryName|rest")
  function getCat(l: Linea): string {
    if (!l.notas) return "General";
    const m = l.notas.match(/^cat:([^|]+)/);
    return m ? m[1].trim() : "General";
  }

  const propias = lineas.filter(l => l.tipo === "EQUIPO_PROPIO" && !l.esIncluido);
  const incluidas = lineas.filter(l => l.tipo === "EQUIPO_PROPIO" && l.esIncluido);
  const externas = lineas.filter(l => l.tipo === "EQUIPO_EXTERNO");

  if (propias.length + incluidas.length + externas.length === 0) return null;

  // Group propias by category, preserving insertion order
  const catMap: Map<string, Linea[]> = new Map();
  for (const l of propias) {
    const cat = getCat(l);
    if (!catMap.has(cat)) catMap.set(cat, []);
    catMap.get(cat)!.push(l);
  }
  const cats = Array.from(catMap.entries());
  const hasCats = cats.length > 1 || (cats.length === 1 && cats[0][0] !== "General");

  return (
    <View>
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>Equipo de Audio, Iluminación, Video y más</Text>
      </View>
      {/* Header tabla */}
      <View style={s.tablaHeader}>
        <Text style={[s.tablaHeaderTexto, s.colDesc]}>DESCRIPCIÓN</Text>
        <Text style={[s.tablaHeaderTexto, s.colMarca]}>MARCA / MODELO</Text>
        <Text style={[s.tablaHeaderTexto, s.colCant, { textAlign: "center" }]}>CANT</Text>
        <Text style={[s.tablaHeaderTexto, s.colDias, { textAlign: "center" }]}>DÍAS</Text>
        <Text style={[s.tablaHeaderTexto, s.colPrecio, { textAlign: "right" }]}>P/U</Text>
        <Text style={[s.tablaHeaderTexto, s.colSubtotal, { textAlign: "right" }]}>SUBTOTAL</Text>
      </View>

      {hasCats ? (
        // Grouped by category
        cats.map(([cat, lins]) => {
          const catSubtotal = lins.reduce((sum, l) => sum + l.subtotal, 0);
          const nota = notasSecciones[cat];
          // Incluidas that belong to this category
          const catIncluidas = incluidas.filter(l => getCat(l) === cat);
          return (
            <View key={cat}>
              {/* Category subheader */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F0EDE8", paddingVertical: 4, paddingHorizontal: 40, borderBottom: "1 solid #ddd9d4" }}>
                <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase" }}>{cat}</Text>
                <Text style={{ fontSize: 7, color: GRAY, fontFamily: "Helvetica-Bold" }}>{fmtMXN(catSubtotal)}</Text>
              </View>
              {lins.map((l, i) => <FilaEquipo key={l.id} l={l} i={i} />)}
              {catIncluidas.map((l) => (
                <View key={l.id} style={s.tablaIncluido}>
                  <Text style={[s.cellIncluido, s.colDesc]}>✓ {l.descripcion}</Text>
                  <Text style={[s.cellIncluido, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || ""}</Text>
                  <Text style={[s.cellIncluido, s.colCant, { textAlign: "center" }]}>{l.cantidad}</Text>
                  <Text style={[s.cellIncluido, s.colDias, { textAlign: "center" }]}>—</Text>
                  <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>INCLUYE</Text>
                  <Text style={[s.cellIncluido, s.colSubtotal, { textAlign: "right" }]}>—</Text>
                </View>
              ))}
              {nota ? (
                <View style={{ paddingHorizontal: 40, paddingVertical: 5, backgroundColor: "#FDFCFA", borderBottom: "1 solid #eeebe6" }}>
                  <Text style={{ fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Oblique", lineHeight: 1.4 }}>
                    Nota: {nota}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        // Flat list (no categories or single "General" category)
        <>
          {propias.map((l, i) => <FilaEquipo key={l.id} l={l} i={i} />)}
          {incluidas.map((l) => (
            <View key={l.id} style={s.tablaIncluido}>
              <Text style={[s.cellIncluido, s.colDesc]}>✓ {l.descripcion}</Text>
              <Text style={[s.cellIncluido, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || ""}</Text>
              <Text style={[s.cellIncluido, s.colCant, { textAlign: "center" }]}>{l.cantidad}</Text>
              <Text style={[s.cellIncluido, s.colDias, { textAlign: "center" }]}>—</Text>
              <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>INCLUYE</Text>
              <Text style={[s.cellIncluido, s.colSubtotal, { textAlign: "right" }]}>—</Text>
            </View>
          ))}
        </>
      )}

      {externas.length > 0 && (
        <>
          <View style={[s.seccionTitulo, { paddingTop: 8 }]}>
            <Text style={[s.seccionNombre, { color: GRAY, fontSize: 7 }]}>EQUIPOS ADICIONALES (TERCEROS)</Text>
          </View>
          {externas.map((l, i) => <FilaEquipo key={l.id} l={l} i={i} />)}
        </>
      )}
    </View>
  );
}

// Operación técnica: solo subtotal global (sin detallar quiénes ni cuántos técnicos)
function SubtotalOperacion({ lineas }: { lineas: Linea[] }) {
  const opLineas = lineas.filter(l => ["OPERACION_TECNICA", "DJ"].includes(l.tipo));
  if (opLineas.length === 0) return null;
  const subtotal = opLineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <View style={{ marginHorizontal: 40, marginTop: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTop: "1 solid #e0ddd8", borderBottom: "1 solid #e0ddd8" }}>
        <Text style={{ fontSize: 9, color: GRAY, fontFamily: "Helvetica-Bold" }}>Operación técnica</Text>
        <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// Logística: solo subtotal global (sin detallar comidas, gasolina, etc.)
function SubtotalLogistica({ lineas }: { lineas: Linea[] }) {
  const logLineas = lineas.filter(l => ["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo));
  if (logLineas.length === 0) return null;
  const subtotal = logLineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <View style={{ marginHorizontal: 40, marginTop: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottom: "1 solid #e0ddd8" }}>
        <Text style={{ fontSize: 9, color: GRAY, fontFamily: "Helvetica-Bold" }}>Transporte y viáticos</Text>
        <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// ─── Documento principal ─────────────────────────────────────────────────────
export function CotizacionPDF({ cotizacion: c, logoSrc }: { cotizacion: CotizacionData; logoSrc?: string | null }) {
  const anticipo = c.granTotal * 0.5;
  const liquidacion = c.granTotal * 0.5;
  const tieneDescuento = c.montoDescuento > 0;
  const vigenciaDate = new Date(c.createdAt);
  vigenciaDate.setDate(vigenciaDate.getDate() + c.vigenciaDias);

  const TERMINOS = [
    `Se solicita un mínimo del 50% de anticipo ($${anticipo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}) para reservar la fecha.`,
    `El saldo restante ($${liquidacion.toLocaleString("es-MX", { maximumFractionDigits: 0 })}) se debe liquidar como máximo 1 día antes del evento.`,
    `Esta cotización tiene una vigencia de ${c.vigenciaDias} días (vence el ${fmtDate(vigenciaDate)}).`,
    "El pago puede realizarse por transferencia o efectivo (coordinar entrega vía WhatsApp con el vendedor).",
    "En caso de no requerir factura y pago en efectivo, podemos aplicar el descuento del IVA.",
    "Cotización confidencial y exclusiva para el destinatario. Prohibida su difusión sin autorización de Mainstage Producciones.",
    "Cualquier duda, cambio o sugerencia hacerla por medio de WhatsApp: (446) 143 2565.",
  ];

  return (
    <Document
      title={`Cotización ${c.numeroCotizacion} — ${c.nombreEvento || c.cliente.nombre}`}
      author="Mainstage Producciones"
      subject="Propuesta de Servicios"
    >
      <Page size="LETTER" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 160, height: 40, objectFit: "contain" }} />
              : <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            }
            <Text style={s.tagline}>AUDIO · ILUMINACIÓN · VIDEO · PRODUCCIÓN TÉCNICA</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.numCotizacion}>{c.numeroCotizacion}{c.version > 1 ? ` v${c.version}` : ""}</Text>
            <Text style={s.fechaHeader}>Elaborada el {fmtDate(c.createdAt)}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        {/* ── Agradecimiento ── */}
        <Text style={s.gracias}>
          ¡Agradecemos la oportunidad de presentarte esta propuesta de nuestros servicios!
        </Text>

        {/* ── Info cliente / evento ── */}
        <View style={s.infoBloque}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Cliente</Text>
            <Text style={s.infoValue}>{c.cliente.nombre}</Text>
            {c.cliente.empresa && <>
              <Text style={s.infoLabel}>Empresa</Text>
              <Text style={s.infoValue}>{c.cliente.empresa}</Text>
            </>}
            <Text style={s.infoLabel}>Vendedor</Text>
            <Text style={s.infoValueLight}>{c.creadaPor?.name || "Mauricio Hernández"}</Text>
          </View>
          <View style={s.infoColRight}>
            <Text style={s.infoLabel}>Evento</Text>
            <Text style={s.infoValue}>{c.nombreEvento || "—"}</Text>
            <Text style={s.infoLabel}>Fecha del evento</Text>
            <Text style={s.infoValue}>{fmtDate(c.fechaEvento)}</Text>
            <Text style={s.infoLabel}>Lugar</Text>
            <Text style={s.infoValueLight}>{c.lugarEvento || "—"}</Text>
            {c.tipoEvento && <>
              <Text style={s.infoLabel}>Tipo de evento</Text>
              <Text style={s.infoValueLight}>{c.tipoEvento}</Text>
            </>}
          </View>
        </View>

        <View style={s.divisor} />

        {/* ── EQUIPOS ── */}
        <TablaEquipos lineas={c.lineas} notasSecciones={c.notasSecciones ? JSON.parse(c.notasSecciones) : {}} />

        {/* ── OPERACIÓN TÉCNICA (subtotal global, sin desglose) ── */}
        <SubtotalOperacion lineas={c.lineas} />

        {/* ── LOGÍSTICA (subtotal global, sin desglose) ── */}
        <SubtotalLogistica lineas={c.lineas} />

        {/* ── TOTALES ── */}
        <View style={s.totalesBloque}>
          <View style={s.totalesTabla}>
            {c.subtotalEquiposBruto > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>Equipo de audio, iluminación y video</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.subtotalEquiposBruto)}</Text>
              </View>
            )}
            {tieneDescuento && (
              <View style={s.totalFila}>
                <Text style={[s.totalFilaDes, s.totalFilaDescuento]}>Precio preferencial</Text>
                <Text style={[s.totalFilaMonto, s.totalFilaDescuento]}>-{fmtMXN(c.montoDescuento)}</Text>
              </View>
            )}
            {c.subtotalOperacion > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>Operación técnica</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.subtotalOperacion)}</Text>
              </View>
            )}
            {(c.subtotalTransporte + c.subtotalComidas + c.subtotalHospedaje) > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>Transporte y viáticos</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.subtotalTransporte + c.subtotalComidas + c.subtotalHospedaje)}</Text>
              </View>
            )}
            <View style={s.totalFila}>
              <Text style={[s.totalFilaDes, { fontFamily: "Helvetica-Bold", color: BLACK }]}>Total</Text>
              <Text style={s.totalFilaMonto}>{fmtMXN(c.total)}</Text>
            </View>
            {c.aplicaIva && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>IVA 16%</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.montoIva)}</Text>
              </View>
            )}
            <View style={s.totalGranTotal}>
              <Text style={s.totalGranLabel}>GRAN TOTAL</Text>
              <Text style={s.totalGranMonto}>{fmtMXN(c.granTotal)}</Text>
            </View>
          </View>
        </View>

        {/* ── ANTICIPOS ── */}
        <View style={s.anticipo}>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>ANTICIPO SUGERIDO (50%)</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(anticipo)}</Text>
          </View>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>SALDO A LIQUIDAR (50%)</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(liquidacion)}</Text>
          </View>
        </View>

        {/* ── BENEFICIO / DESCUENTO ── */}
        {tieneDescuento && (
          <View style={s.beneficioBloque}>
            <Text style={s.beneficioTitulo}>BENEFICIO / DESCUENTO: {fmtMXN(c.montoDescuento)}</Text>
            <Text style={s.beneficioTexto}>
              El beneficio podrá utilizarse como descuento automático en esta cotización o como saldo a favor para ampliar
              tu producción con más equipos o servicios en esta misma cotización.
            </Text>
            <Text style={s.beneficioNota}>
              La utilización del saldo como ampliación de servicios está sujeta a disponibilidad de equipo al momento de la confirmación.
              Favor de notificar al vendedor si se aplica el descuento o se utiliza el saldo a favor, a la brevedad.
            </Text>
          </View>
        )}

        {/* ── OBSERVACIONES ── */}
        {c.observaciones && (
          <View style={[s.beneficioBloque, { borderColor: "#ddd", backgroundColor: BG_SECTION }]}>
            <Text style={[s.beneficioTitulo, { color: GRAY }]}>OBSERVACIONES</Text>
            <Text style={s.beneficioTexto}>{c.observaciones}</Text>
          </View>
        )}

        {/* ── DATOS DE PAGO ── */}
        <View style={s.pagoBloque}>
          <View style={s.pagoCard}>
            <Text style={s.pagoTitulo}>TRANSFERENCIA CUENTA FISCAL</Text>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Razón Social</Text><Text style={s.pagoValor}>Escenario Principal Producciones</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>RFC</Text><Text style={s.pagoValor}>EPP2502068Q8</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Banco</Text><Text style={s.pagoValor}>Banorte</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>No. Cuenta</Text><Text style={s.pagoValor}>1313102977</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>CLABE</Text><Text style={s.pagoValor}>072 680 013131029777</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Tarjeta</Text><Text style={s.pagoValor}>4189 2810 0070 3307</Text></View>
          </View>
          <View style={s.pagoCard}>
            <Text style={s.pagoTitulo}>TRANSFERENCIA CUENTA NO FISCAL</Text>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Beneficiario</Text><Text style={s.pagoValor}>Jose Mauricio A. Hernández V.M.</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>RFC</Text><Text style={s.pagoValor}>HEVM9611179YA</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Banco</Text><Text style={s.pagoValor}>Banorte</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>No. Cuenta</Text><Text style={s.pagoValor}>1314637038</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>CLABE</Text><Text style={s.pagoValor}>072 680 013146370385</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Correo</Text><Text style={s.pagoValor}>mainstageqro@gmail.com</Text></View>
          </View>
        </View>

        {/* ── TÉRMINOS ── */}
        <View style={s.terminosBloque}>
          <Text style={s.terminosTitulo}>INFORMACIÓN IMPORTANTE</Text>
          {TERMINOS.map((t, i) => (
            <View key={i} style={s.terminoItem}>
              <Text style={s.terminoBullet}>•</Text>
              <Text style={s.terminoTexto}>{t}</Text>
            </View>
          ))}
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerContacto}>WhatsApp: (446) 143 2565  |  mainstageqro@gmail.com</Text>
          <Text style={s.footerVigencia}>Vigencia: {c.vigenciaDias} días</Text>
        </View>
        <Text style={s.confidencial}>
          Cotización confidencial y exclusiva para el destinatario. Prohibida su difusión sin autorización de Mainstage Producciones.
        </Text>

      </Page>
    </Document>
  );
}
