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
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // Header negro con oro
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 25,
    marginTop: -36,
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
    fontSize: 8,
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
    fontSize: 8,
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
    fontSize: 9,
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
    fontSize: 7.5,
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
  // Función/momento interno del evento (ej. Haldi, Sangeet, Ceremony) — destacado
  // para distinguir a simple vista cotizaciones de un mismo trato multi-evento.
  subEventoValor: {
    fontSize: 11,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // Apartado del paquete comercial (solo si la cotización viene de un paquete)
  paqueteBloque: {
    marginHorizontal: 40,
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0EDE8",
    borderLeft: `3 solid ${GOLD}`,
    borderRadius: 2,
  },
  paqueteLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  paqueteNombre: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
  paqueteResumen: {
    fontSize: 8,
    color: GRAY,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
    marginTop: 2,
  },
  // Tabla
  tablaHeader: {
    flexDirection: "row",
    backgroundColor: BLACK,
    paddingVertical: 5,
    paddingHorizontal: 40,
  },
  tablaHeaderTexto: {
    fontSize: 7.5,
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
  colImg: { width: 22, marginRight: 4 },
  colDesc: { flex: 3.5 },
  colMarca: { flex: 2 },
  colCant: { flex: 1, textAlign: "center" },
  colDias: { flex: 1, textAlign: "center" },
  colPrecio: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },
  cellDesc: {
    fontSize: 8.5,
    color: GRAY,
  },
  cellMarca: {
    fontSize: 8,
    color: BLACK,
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
    fontSize: 8,
    color: LIGHT_GRAY,
    fontFamily: "Helvetica-Oblique",
  },
  badgeNivel: {
    fontSize: 7,
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
    fontSize: 8.5,
    color: GRAY,
    flex: 1,
    paddingRight: 10,
  },
  totalFilaMonto: {
    fontSize: 8.5,
    color: BLACK,
    fontFamily: "Helvetica-Bold",
    flexShrink: 0,
    textAlign: "right",
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
    fontSize: 7.5,
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
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 5,
  },
  beneficioTexto: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },
  // Nota del beneficio
  beneficioNota: {
    fontSize: 7.5,
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
    fontSize: 7.5,
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
    fontSize: 7.5,
    color: "#888",
    width: 80,
  },
  pagoValor: {
    fontSize: 7.5,
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
    fontSize: 8.5,
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
    fontSize: 8,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  terminoTexto: {
    fontSize: 8,
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
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
  footerVigencia: {
    fontSize: 7.5,
    color: "#666",
    textAlign: "right",
  },
  confidencial: {
    fontSize: 7,
    color: "#555",
    textAlign: "center",
    marginHorizontal: 40,
    marginTop: 8,
    fontFamily: "Helvetica-Oblique",
  },
  // Firma
  firmaBloque: {
    marginHorizontal: 40,
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  firmaCol: {
    width: 200,
    alignItems: "center",
  },
  firmaEspacio: {
    height: 72,  // espacio para pegar la firma
  },
  firmaLinea: {
    height: 1.5,
    backgroundColor: GOLD,
    width: "100%",
    marginBottom: 5,
  },
  firmaNombre: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  firmaCargo: {
    fontSize: 7.5,
    color: GRAY,
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.2,
  },

});

// ─── Idioma ──────────────────────────────────────────────────────────────────
export type Idioma = "es" | "en";

// Textos fijos de la UI del documento. Los textos LIBRES (notas, observaciones,
// descripciones de equipo) NO viven aquí — se traducen vía IA en la ruta del PDF
// y llegan ya traducidos en los datos de la cotización.
const TXT = {
  es: {
    tagline: "AUDIO · ILUMINACIÓN · VIDEO · PRODUCCIÓN TÉCNICA",
    elaboradaEl: (f: string) => `Elaborada el ${f}`,
    gracias: "¡Agradecemos la oportunidad de presentarte esta propuesta de nuestros servicios!",
    cliente: "Cliente",
    empresa: "Empresa",
    vendedor: "Vendedor",
    evento: "Evento",
    funcionEvento: "Función del evento",
    fechaEvento: "Fecha del evento",
    lugar: "Lugar",
    horario: "Horario",
    tipoEvento: "Tipo de evento",
    paquete: "Paquete",
    seccionEquipo: "Equipo de Audio, Iluminación, Video y más",
    colMarcaModelo: "MARCA / MODELO",
    colDescripcion: "DESCRIPCIÓN",
    colCant: "CANT",
    colDias: "DÍAS",
    colPU: "P/U",
    colSubtotal: "SUBTOTAL",
    colHoras: "HORAS",
    colTarifaHr: "TARIFA/HR",
    incluye: "INCLUYE",
    operacionTecnica: "Operación técnica",
    servicioDJ: "Servicio de DJ",
    totalDJ: "Total DJ: ",
    conceptosAdicionales: "Conceptos adicionales",
    subtotalAdicionales: "Subtotal adicionales",
    transporteViaticos: "Transporte y viáticos",
    equipoAudioIlumVideo: "Equipo de audio, iluminación y video",
    totalSinIva: "TOTAL SIN IVA",
    iva16: "IVA 16%",
    totalConIva: "TOTAL CON IVA",
    granTotal: "GRAN TOTAL",
    notaIvaAplica: "* El IVA aplica únicamente en caso de requerir comprobante fiscal (factura). En pagos sin factura, el total a cubrir corresponde al subtotal sin IVA indicado arriba.",
    notaIvaNoAplica: "* En caso de requerir comprobante fiscal (factura), se añadirá el IVA correspondiente (16%) al total indicado. Cotizar con su vendedor.",
    anticipo: (p: number) => `ANTICIPO (${p}%)`,
    saldoLiquidar: (p: number) => `SALDO A LIQUIDAR (${p}%)`,
    observaciones: "OBSERVACIONES",
    pagoFiscal: "TRANSFERENCIA CUENTA FISCAL",
    pagoNoFiscal: "TRANSFERENCIA CUENTA NO FISCAL",
    razonSocial: "Razón Social",
    rfc: "RFC",
    banco: "Banco",
    noCuenta: "No. Cuenta",
    clabe: "CLABE",
    tarjeta: "Tarjeta",
    beneficiario: "Beneficiario",
    correo: "Correo",
    opcionPagoAnticipado: "Opción de pago anticipado",
    pagoAnticipadoDefault: (pct: number, fecha: string | null) =>
      `Si realizas el pago total del servicio${fecha ? ` antes del ${fecha}` : " antes de la fecha límite"}, aplicamos un descuento adicional del ${pct}% sobre equipos Mainstage.`,
    ahorroPagoAnticipado: (p: number) => `Ahorro por pago anticipado (${p}%)`,
    totalPagoAnticipado: "Total con pago anticipado",
    infoImportante: "INFORMACIÓN IMPORTANTE",
    firmaCargo: "Director General · Mainstage Pro",
    vigencia: (d: number) => `Vigencia: ${d} días`,
    confidencial: "Cotización confidencial y exclusiva para el destinatario. Prohibida su difusión sin autorización de Mainstage Producciones.",
    terminos: (a: number, aM: string, l: number, lM: string, vig: number, vigFecha: string) => [
      `Se solicita un anticipo del ${a}% (${aM}) para reservar la fecha.`,
      `El saldo restante (${lM}) se debe liquidar como máximo 1 día antes del evento.`,
      `Esta cotización tiene una vigencia de ${vig} días (vence el ${vigFecha}).`,
      "El pago puede realizarse por transferencia o efectivo (coordinar entrega vía WhatsApp con el vendedor).",
      "En caso de no requerir factura y pago en efectivo, podemos aplicar el descuento del IVA.",
      "Cotización confidencial y exclusiva para el destinatario. Prohibida su difusión sin autorización de Mainstage Producciones.",
      "Cualquier duda, cambio o sugerencia hacerla por medio de WhatsApp: (446) 143 2565.",
    ],
    tipoEventoMap: { MUSICAL: "MUSICAL", SOCIAL: "SOCIAL", EMPRESARIAL: "EMPRESARIAL", OTRO: "OTRO" } as Record<string, string>,
    nivelTrade: { 1: "Base", 2: "Estratégico", 3: "Premium" } as Record<number, string>,
    descVolumen: (p: number) => `Descuento por volumen (${p}%)`,
    descB2b: (p: number) => `Descuento B2B (${p}%)`,
    descEspecialPct: (p: number) => `Descuento especial (${p}%)`,
    descEspecial: "Descuento especial",
    descMultidia: (p: number) => `Descuento multi-día (${p}%)`,
    descEspecialLegacy: (p: number, nota?: string | null) => `Descuento especial (${p}%)${nota ? ` · ${nota}` : ""}`,
    patrocinio: (p: number, nota?: string | null) => `Patrocinio (${p}%)${nota ? ` · ${nota}` : ""}`,
    descFijo: "Descuento fijo",
    descGenerico: "Descuento",
  },
  en: {
    tagline: "AUDIO · LIGHTING · VIDEO · TECHNICAL PRODUCTION",
    elaboradaEl: (f: string) => `Prepared on ${f}`,
    gracias: "Thank you for the opportunity to present this proposal for our services!",
    cliente: "Client",
    empresa: "Company",
    vendedor: "Sales Rep",
    evento: "Event",
    funcionEvento: "Event Function",
    fechaEvento: "Event Date",
    lugar: "Venue",
    horario: "Schedule",
    tipoEvento: "Event Type",
    paquete: "Package",
    seccionEquipo: "Audio, Lighting, Video Equipment & More",
    colMarcaModelo: "BRAND / MODEL",
    colDescripcion: "DESCRIPTION",
    colCant: "QTY",
    colDias: "DAYS",
    colPU: "UNIT PRICE",
    colSubtotal: "SUBTOTAL",
    colHoras: "HOURS",
    colTarifaHr: "RATE/HR",
    incluye: "INCLUDED",
    operacionTecnica: "Technical Operations",
    servicioDJ: "DJ Service",
    totalDJ: "DJ Total: ",
    conceptosAdicionales: "Additional Items",
    subtotalAdicionales: "Additional items subtotal",
    transporteViaticos: "Transportation & Travel Expenses",
    equipoAudioIlumVideo: "Audio, lighting and video equipment",
    totalSinIva: "TOTAL EXCL. VAT",
    iva16: "VAT 16%",
    totalConIva: "TOTAL INCL. VAT",
    granTotal: "GRAND TOTAL",
    notaIvaAplica: "* VAT applies only if a tax invoice (factura) is required. For payments without an invoice, the amount due is the VAT-excluded subtotal shown above.",
    notaIvaNoAplica: "* If a tax invoice (factura) is required, the corresponding VAT (16%) will be added to the total shown. Please confirm with your sales rep.",
    anticipo: (p: number) => `DEPOSIT (${p}%)`,
    saldoLiquidar: (p: number) => `BALANCE DUE (${p}%)`,
    observaciones: "NOTES",
    pagoFiscal: "BANK TRANSFER — TAX ACCOUNT",
    pagoNoFiscal: "BANK TRANSFER — NON-TAX ACCOUNT",
    razonSocial: "Legal Name",
    rfc: "Tax ID (RFC)",
    banco: "Bank",
    noCuenta: "Account No.",
    clabe: "CLABE",
    tarjeta: "Card",
    beneficiario: "Beneficiary",
    correo: "Email",
    opcionPagoAnticipado: "Early Payment Option",
    pagoAnticipadoDefault: (pct: number, fecha: string | null) =>
      `If you pay for the service in full${fecha ? ` before ${fecha}` : " before the deadline"}, we apply an additional ${pct}% discount on Mainstage equipment.`,
    ahorroPagoAnticipado: (p: number) => `Early payment savings (${p}%)`,
    totalPagoAnticipado: "Total with early payment",
    infoImportante: "IMPORTANT INFORMATION",
    firmaCargo: "General Director · Mainstage Pro",
    vigencia: (d: number) => `Valid for: ${d} days`,
    confidencial: "This quote is confidential and exclusively for the recipient. Unauthorized distribution is prohibited.",
    terminos: (a: number, aM: string, l: number, lM: string, vig: number, vigFecha: string) => [
      `A ${a}% deposit (${aM}) is required to reserve the date.`,
      `The remaining balance (${lM}) must be paid no later than 1 day before the event.`,
      `This quote is valid for ${vig} days (expires on ${vigFecha}).`,
      "Payment can be made by bank transfer or cash (coordinate delivery via WhatsApp with your sales rep).",
      "If you do not require an invoice and pay in cash, we can apply the VAT discount.",
      "This quote is confidential and exclusively for the recipient. Unauthorized distribution is prohibited.",
      "For any questions, changes or suggestions, reach us via WhatsApp: (446) 143 2565.",
    ],
    tipoEventoMap: { MUSICAL: "MUSICAL", SOCIAL: "SOCIAL", EMPRESARIAL: "CORPORATE", OTRO: "OTHER" } as Record<string, string>,
    nivelTrade: { 1: "Base", 2: "Strategic", 3: "Premium" } as Record<number, string>,
    descVolumen: (p: number) => `Volume discount (${p}%)`,
    descB2b: (p: number) => `B2B discount (${p}%)`,
    descEspecialPct: (p: number) => `Special discount (${p}%)`,
    descEspecial: "Special discount",
    descMultidia: (p: number) => `Multi-day discount (${p}%)`,
    descEspecialLegacy: (p: number, nota?: string | null) => `Special discount (${p}%)${nota ? ` · ${nota}` : ""}`,
    patrocinio: (p: number, nota?: string | null) => `Sponsorship (${p}%)${nota ? ` · ${nota}` : ""}`,
    descFijo: "Fixed discount",
    descGenerico: "Discount",
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtMXN(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string | Date | null, idioma: Idioma = "es") {
  if (!s) return "—";
  const iso = s instanceof Date ? s.toISOString() : s;
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(idioma === "en" ? "en-US" : "es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

// Convierte "HH:MM" (24h, como se guarda en Trato/Cotización) a "h:mm AM/PM".
function fmtHora(h: string | null | undefined) {
  if (!h) return null;
  const [hh, mm] = h.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return h;
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
}

function fmtHorario(inicio: string | null | undefined, fin: string | null | undefined) {
  const i = fmtHora(inicio);
  const f = fmtHora(fin);
  if (i && f) return `${i} – ${f}`;
  return i || f || null;
}

const TIPO_LINEA_SECTION: Record<string, string> = {
  EQUIPO_PROPIO: "equipo",
  EQUIPO_EXTERNO: "equipo",
  PAQUETE: "equipo",
  OPERACION_TECNICA: "operacion",
  DJ: "dj",
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
  imagenUrl?: string | null;
}

interface CotizacionData {
  numeroCotizacion: string;
  version: number;
  nombreEvento: string | null;
  nombreCotizacion?: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: Date | null;
  lugarEvento: string | null;
  horaInicioEvento?: string | null;
  horaFinEvento?: string | null;
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
  descuentoPatrocinioNota: string | null;
  descuentoEspecialPct: number;
  descuentoEspecialNota?: string | null;
  descuentoFamilyFriendsPct: number;
  descuentoFijoMonto?: number;
  descuentoManualRazon?: string | null;
  descuentoManualEsMonto?: boolean;
  pagoAnticipadoActivo?: boolean;
  pagoAnticipadoFecha?: string | null;
  pagoAnticipadoTexto?: string | null;
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
  incluirChofer?: boolean;
  tradeCalificado?: boolean;
  mainstageTradeData?: string | null;
  planPagos?: string | null;
  // Presente solo cuando la cotización se desglosó de un paquete comercial.
  paqueteNombre?: string | null;
  paqueteResumen?: string | null;
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

// Extrae la nota visible del usuario del campo notas de una linea
// Formatos: "cat:Cat|nota:Texto", "nota:Texto", "cat:Cat" (sin nota), texto plano
function getItemNota(notas: string | null): string | null {
  if (!notas) return null;
  if (notas.includes("|nota:")) return notas.split("|nota:")[1]?.trim() || null;
  if (notas.startsWith("nota:")) return notas.slice(5).trim() || null;
  if (notas.startsWith("cat:")) return null; // solo categoría, sin nota
  return notas.trim() || null; // nota plana (legado)
}

function FilaEquipo({ l, i }: { l: Linea; i: number }) {
  return (
    <View style={[s.tablaFila, i % 2 === 1 ? s.tablaFilaAlt : {}]}>
      {/* Thumbnail */}
      <View style={[s.colImg, { justifyContent: "center", alignItems: "center" }]}>
        {l.imagenUrl ? (
          <Image src={l.imagenUrl} style={{ width: 18, height: 18, objectFit: "contain" }} />
        ) : null}
      </View>
      <Text style={[s.cellMarca, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || "—"}</Text>
      <View style={s.colDesc}>
        <Text style={s.cellDesc}>{l.descripcion}</Text>
        {getItemNota(l.notas) ? (
          <Text style={{ fontSize: 7, color: GRAY, fontFamily: "Helvetica-Oblique", marginTop: 1.5 }}>
            {getItemNota(l.notas)}
          </Text>
        ) : null}
      </View>
      <Text style={[s.cellNum, s.colCant]}>{l.cantidad}</Text>
      <Text style={[s.cellNum, s.colDias]}>{l.dias}</Text>
      <Text style={[s.cellPrecio, s.colPrecio]}>{fmtMXN(l.precioUnitario)}</Text>
      <Text style={[s.cellSubtotal, s.colSubtotal]}>{fmtMXN(l.subtotal)}</Text>
    </View>
  );
}

function TablaEquipos({ lineas, notasSecciones, descCategorias, catLabels, idioma }: { lineas: Linea[]; notasSecciones: Record<string, string>; descCategorias: Record<string, string>; catLabels: Record<string, string>; idioma: Idioma }) {
  const t = TXT[idioma];
  // Parse category from notas field (format: "cat:CategoryName" or "cat:CategoryName|rest")
  function getCat(l: Linea): string {
    if (!l.notas) return "General";
    const m = l.notas.match(/^cat:([^|]+)/);
    return m ? m[1].trim() : "General";
  }

  // Merge own + external equipment + products — client sees one unified list, grouped by category
  const todasEquipo = lineas.filter(l => (l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO" || l.tipo === "PAQUETE") && !l.esIncluido);
  const incluidas   = lineas.filter(l => l.tipo === "EQUIPO_PROPIO" && l.esIncluido);

  if (todasEquipo.length + incluidas.length === 0) return null;

  // Group all equipment by category, preserving insertion order
  const catMap: Map<string, Linea[]> = new Map();
  for (const l of todasEquipo) {
    const cat = getCat(l);
    if (!catMap.has(cat)) catMap.set(cat, []);
    catMap.get(cat)!.push(l);
  }
  const cats    = Array.from(catMap.entries());
  const hasCats = cats.length > 1 || (cats.length === 1 && cats[0][0] !== "General");

  return (
    <View>
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>{t.seccionEquipo}</Text>
      </View>
      {/* Header tabla */}
      <View style={s.tablaHeader}>
        <View style={s.colImg} />
        <Text style={[s.tablaHeaderTexto, s.colMarca]}>{t.colMarcaModelo}</Text>
        <Text style={[s.tablaHeaderTexto, s.colDesc]}>{t.colDescripcion}</Text>
        <Text style={[s.tablaHeaderTexto, s.colCant, { textAlign: "center" }]}>{t.colCant}</Text>
        <Text style={[s.tablaHeaderTexto, s.colDias, { textAlign: "center" }]}>{t.colDias}</Text>
        <Text style={[s.tablaHeaderTexto, s.colPrecio, { textAlign: "right" }]}>{t.colPU}</Text>
        <Text style={[s.tablaHeaderTexto, s.colSubtotal, { textAlign: "right" }]}>{t.colSubtotal}</Text>
      </View>

      {hasCats ? (
        // Grouped by category
        cats.map(([cat, lins]) => {
          const catSubtotal = lins.reduce((sum, l) => sum + l.subtotal, 0);
          const nota = notasSecciones[cat] ?? descCategorias[cat];
          // Incluidas that belong to this category
          const catIncluidas = incluidas.filter(l => getCat(l) === cat);
          return (
            <View key={cat}>
              {/* Category subheader */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F0EDE8", paddingVertical: 4, paddingHorizontal: 40, borderBottom: "1 solid #ddd9d4" }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase" }}>{catLabels[cat] ?? cat}</Text>
                <Text style={{ fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold" }}>{fmtMXN(catSubtotal)}</Text>
              </View>
              {nota ? (
                <View style={{ paddingHorizontal: 40, paddingVertical: 5, backgroundColor: "#FDFCFA", borderBottom: "1 solid #eeebe6" }}>
                  <Text style={{ fontSize: 8, color: GRAY, fontFamily: "Helvetica-Oblique", lineHeight: 1.4 }}>
                    {nota}
                  </Text>
                </View>
              ) : null}
              {lins.map((l, i) => <FilaEquipo key={l.id} l={l} i={i} />)}
              {catIncluidas.map((l) => (
                <View key={l.id} style={s.tablaIncluido}>
                  <View style={s.colImg} />
                  <Text style={[s.cellIncluido, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || ""}</Text>
                  <Text style={[s.cellIncluido, s.colDesc]}>✓ {l.descripcion}</Text>
                  <Text style={[s.cellIncluido, s.colCant, { textAlign: "center" }]}>{l.cantidad}</Text>
                  <Text style={[s.cellIncluido, s.colDias, { textAlign: "center" }]}>—</Text>
                  <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>{t.incluye}</Text>
                  <Text style={[s.cellIncluido, s.colSubtotal, { textAlign: "right" }]}>—</Text>
                </View>
              ))}
            </View>
          );
        })
      ) : (
        // Flat list (no categories or single "General" category)
        <>
          {todasEquipo.map((l, i) => <FilaEquipo key={l.id} l={l} i={i} />)}
          {incluidas.map((l) => (
            <View key={l.id} style={s.tablaIncluido}>
              <View style={s.colImg} />
              <Text style={[s.cellIncluido, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || ""}</Text>
              <Text style={[s.cellIncluido, s.colDesc]}>✓ {l.descripcion}</Text>
              <Text style={[s.cellIncluido, s.colCant, { textAlign: "center" }]}>{l.cantidad}</Text>
              <Text style={[s.cellIncluido, s.colDias, { textAlign: "center" }]}>—</Text>
              <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>{t.incluye}</Text>
              <Text style={[s.cellIncluido, s.colSubtotal, { textAlign: "right" }]}>—</Text>
            </View>
          ))}
        </>
      )}

    </View>
  );
}

// Operación técnica: solo subtotal global (sin detallar quiénes ni cuántos técnicos)
function SubtotalOperacion({ lineas, incluirChofer, idioma }: { lineas: Linea[]; incluirChofer?: boolean; idioma: Idioma }) {
  const t = TXT[idioma];
  const opLineas = lineas.filter(l => l.tipo === "OPERACION_TECNICA");
  const subtotal = opLineas.reduce((s, l) => s + l.subtotal, 0) + (incluirChofer ? 500 : 0);
  if (subtotal === 0) return null;

  return (
    <View style={{ marginHorizontal: 40, marginTop: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTop: "1 solid #e0ddd8", borderBottom: "1 solid #e0ddd8" }}>
        <Text style={{ fontSize: 9, color: GRAY, fontFamily: "Helvetica-Bold" }}>{t.operacionTecnica}</Text>
        <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// Servicio de DJ: sección separada con detalle de horas y tarifa
function SubtotalDJ({ lineas, idioma }: { lineas: Linea[]; idioma: Idioma }) {
  const t = TXT[idioma];
  const djLineas = lineas.filter(l => l.tipo === "DJ");
  if (djLineas.length === 0) return null;
  const subtotal = djLineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <View>
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>{t.servicioDJ}</Text>
      </View>
      <View style={s.tablaHeader}>
        <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>{t.colDescripcion}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>{t.colHoras}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>{t.colTarifaHr}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>{t.colSubtotal}</Text>
      </View>
      {djLineas.map((l, i) => (
        <View key={l.id} style={[s.tablaFila, i % 2 === 1 ? s.tablaFilaAlt : {}]}>
          <View style={{ flex: 3 }}>
            <Text style={s.cellDesc}>{l.descripcion}</Text>
            {getItemNota(l.notas) ? (
              <Text style={{ fontSize: 7, color: GRAY, fontFamily: "Helvetica-Oblique", marginTop: 1.5 }}>
                {getItemNota(l.notas)}
              </Text>
            ) : null}
          </View>
          <Text style={[s.cellNum, { flex: 1, textAlign: "center" }]}>{l.cantidad}</Text>
          <Text style={[s.cellPrecio, { flex: 1.5, textAlign: "right" }]}>{fmtMXN(l.precioUnitario)}</Text>
          <Text style={[s.cellSubtotal, { flex: 1.5, textAlign: "right" }]}>{fmtMXN(l.subtotal)}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 40, paddingVertical: 5, borderTop: "1 solid #e0ddd8" }}>
        <Text style={{ fontSize: 8.5, color: GRAY, fontFamily: "Helvetica-Bold" }}>{t.totalDJ}</Text>
        <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// Conceptos adicionales (OTRO): misma estética que las demás secciones
function TablaAdicionales({ lineas, idioma }: { lineas: Linea[]; idioma: Idioma }) {
  const t = TXT[idioma];
  const otros = lineas.filter(l => l.tipo === "OTRO");
  if (otros.length === 0) return null;
  const subtotal = otros.reduce((s, l) => s + l.subtotal, 0);
  return (
    <View>
      {/* Título de sección — mismo estilo dorado */}
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>{t.conceptosAdicionales}</Text>
      </View>
      {/* Header tabla */}
      <View style={s.tablaHeader}>
        <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>{t.colDescripcion}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>{t.colCant}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>{t.colDias}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.2, textAlign: "right" }]}>{t.colPU}</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.2, textAlign: "right" }]}>{t.colSubtotal}</Text>
      </View>
      {otros.map((l, i) => (
        <View key={l.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 40, borderBottom: "1 solid #eeebe6", backgroundColor: i % 2 === 0 ? "#FDFCFA" : "#FFFFFF" }}>
          <View style={{ flex: 3 }}>
            <Text style={{ fontSize: 9, color: BLACK }}>{l.descripcion}</Text>
            {getItemNota(l.notas) ? (
              <Text style={{ fontSize: 7, color: GRAY, fontFamily: "Helvetica-Oblique", marginTop: 1.5 }}>
                {getItemNota(l.notas)}
              </Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 9, color: GRAY, flex: 1, textAlign: "center" }}>{l.cantidad}</Text>
          <Text style={{ fontSize: 9, color: GRAY, flex: 1, textAlign: "center" }}>{l.dias}</Text>
          <Text style={{ fontSize: 9, color: GRAY, flex: 1.2, textAlign: "right" }}>{l.precioUnitario > 0 ? fmtMXN(l.precioUnitario) : "—"}</Text>
          <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold", flex: 1.2, textAlign: "right" }}>{fmtMXN(l.subtotal)}</Text>
        </View>
      ))}
      {/* Subtotal fila */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 40, backgroundColor: "#F5F2ED" }}>
        <Text style={{ fontSize: 8, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>{t.subtotalAdicionales}</Text>
        <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// Logística: solo subtotal global (sin detallar comidas, gasolina, etc.)
function SubtotalLogistica({ lineas, idioma }: { lineas: Linea[]; idioma: Idioma }) {
  const t = TXT[idioma];
  const logLineas = lineas.filter(l => ["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo));
  if (logLineas.length === 0) return null;
  const subtotal = logLineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <View style={{ marginHorizontal: 40, marginTop: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottom: "1 solid #e0ddd8" }}>
        <Text style={{ fontSize: 9, color: GRAY, fontFamily: "Helvetica-Bold" }}>{t.transporteViaticos}</Text>
        <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// ─── Documento principal ─────────────────────────────────────────────────────
export function CotizacionPDF({ cotizacion: c, logoSrc, descCategorias = {}, catLabels = {}, idioma = "es" }: { cotizacion: CotizacionData; logoSrc?: string | null; descCategorias?: Record<string, string>; catLabels?: Record<string, string>; idioma?: Idioma }) {
  const t = TXT[idioma];
  // Leer plan de pagos configurado; si no hay, usar 50/50 por defecto
  type PagoPlanItem = { concepto: string; porcentaje: number; monto?: number; tipoPago: string };
  let parsedPlan: { pagos?: PagoPlanItem[] } | null = null;
  try { parsedPlan = c.planPagos ? JSON.parse(c.planPagos) : null; } catch { /* noop */ }
  const pagosArr = parsedPlan?.pagos;
  const pagoAnticipo = pagosArr?.find(p => p.tipoPago === "ANTICIPO") ?? pagosArr?.[0];
  const pagoLiquidacion = pagosArr?.find(p => p.tipoPago === "LIQUIDACION") ?? (pagosArr && pagosArr.length > 1 ? pagosArr[pagosArr.length - 1] : undefined);

  const anticipo = pagoAnticipo
    ? (pagoAnticipo.monto && pagoAnticipo.monto > 0 ? pagoAnticipo.monto : Math.round(c.granTotal * pagoAnticipo.porcentaje / 100 * 100) / 100)
    : c.granTotal * 0.5;
  const liquidacion = pagoLiquidacion
    ? (pagoLiquidacion.monto && pagoLiquidacion.monto > 0 ? pagoLiquidacion.monto : Math.round(c.granTotal * pagoLiquidacion.porcentaje / 100 * 100) / 100)
    : c.granTotal * 0.5;
  const anticipoPct = pagoAnticipo ? Math.round(pagoAnticipo.porcentaje) : 50;
  const liquidacionPct = pagoLiquidacion ? Math.round(pagoLiquidacion.porcentaje) : 50;

  const tieneDescuento = c.montoDescuento > 0;

  // External equipment + products subtotals (both merged into the equipment table & its totals line)
  const subtotalExternos = c.lineas.filter(l => l.tipo === "EQUIPO_EXTERNO").reduce((s, l) => s + l.subtotal, 0);
  const subtotalPaquetes = c.lineas.filter(l => l.tipo === "PAQUETE").reduce((s, l) => s + l.subtotal, 0);

  // Build individual discount rows
  type DiscRow = { label: string; monto: number; gold?: boolean };
  const discRows: DiscRow[] = [];
  const sb = c.subtotalEquiposBruto;
  // Cascade: volumen primero, B2B sobre resultado, manual sobre resultado
  const montoVolumenPdf = (c.descuentoVolumenPct ?? 0) > 0 ? sb * c.descuentoVolumenPct : 0;
  const basePostV = sb - montoVolumenPdf;
  const montoB2bPdf = (c.descuentoB2bPct ?? 0) > 0 ? basePostV * c.descuentoB2bPct : 0;
  const basePostB = basePostV - montoB2bPdf;

  if (montoVolumenPdf > 0)
    discRows.push({ label: t.descVolumen(Math.round(c.descuentoVolumenPct * 100)), monto: montoVolumenPdf });
  if (montoB2bPdf > 0)
    discRows.push({ label: t.descB2b(Math.round(c.descuentoB2bPct * 100)), monto: montoB2bPdf });

  // Manual (FamilyFriends = %, FijoMonto = $)
  const esManualMonto = c.descuentoManualEsMonto ?? false;
  const pctFF = c.descuentoFamilyFriendsPct ?? 0;
  const montoFijo = c.descuentoFijoMonto ?? 0;
  if (!esManualMonto && pctFF > 0) {
    const montoM = basePostB * pctFF;
    discRows.push({ label: t.descEspecialPct(Math.round(pctFF * 100)), monto: montoM });
  }
  if (esManualMonto && montoFijo > 0) {
    discRows.push({ label: t.descEspecial, monto: montoFijo });
  }
  // Legacy
  if ((c.descuentoMultidiaPct ?? 0) > 0)
    discRows.push({ label: t.descMultidia(Math.round(c.descuentoMultidiaPct * 100)), monto: sb * c.descuentoMultidiaPct });
  if ((c.descuentoEspecialPct ?? 0) > 0)
    discRows.push({ label: t.descEspecialLegacy(Math.round(c.descuentoEspecialPct * 100), c.descuentoEspecialNota), monto: sb * c.descuentoEspecialPct });
  if ((c.descuentoPatrocinioPct ?? 0) > 0)
    discRows.push({ label: t.patrocinio(Math.round(c.descuentoPatrocinioPct * 100), c.descuentoPatrocinioNota), monto: sb * c.descuentoPatrocinioPct });
  // Desc fijo legacy (sin flag ManualEsMonto)
  if (!esManualMonto && montoFijo > 0 && pctFF === 0)
    discRows.push({ label: t.descFijo, monto: montoFijo });
  // Trade
  try {
    const td = c.mainstageTradeData ? JSON.parse(c.mainstageTradeData) : {};
    if (td.nivelSeleccionado && td.pct && td.activo) {
      discRows.push({ label: `Mainstage Trade · ${t.nivelTrade[td.nivelSeleccionado] ?? ""} (${td.pct}%)`, monto: Math.round(sb * (td.pct / 100) * 100) / 100, gold: true });
    }
  } catch { /* noop */ }
  // Fallback if no individual rows resolved
  if (discRows.length === 0 && tieneDescuento)
    discRows.push({ label: t.descGenerico, monto: c.montoDescuento });

  const vigenciaDate = new Date(c.createdAt);
  vigenciaDate.setDate(vigenciaDate.getDate() + c.vigenciaDias);

  const TERMINOS = t.terminos(
    anticipoPct,
    `$${anticipo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`,
    liquidacionPct,
    `$${liquidacion.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`,
    c.vigenciaDias,
    fmtDate(vigenciaDate, idioma)
  );

  return (
    <Document
      title={`${idioma === "en" ? "Quote" : "Cotización"} ${c.numeroCotizacion} — ${c.nombreEvento || c.cliente.nombre}`}
      author="Mainstage Producciones"
      subject={idioma === "en" ? "Service Proposal" : "Propuesta de Servicios"}
    >
      <Page size="LETTER" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 150, alignSelf: "flex-start" }} />
              : <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            }
            <Text style={s.tagline}>{t.tagline}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.numCotizacion}>{c.numeroCotizacion}{c.version > 1 ? ` v${c.version}` : ""}</Text>
            <Text style={s.fechaHeader}>{t.elaboradaEl(fmtDate(c.createdAt, idioma))}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        {/* ── Agradecimiento ── */}
        <Text style={s.gracias}>
          {t.gracias}
        </Text>

        {/* ── Info cliente / evento ── */}
        <View style={s.infoBloque}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>{t.cliente}</Text>
            <Text style={s.infoValue}>{c.cliente.nombre}</Text>
            {c.cliente.empresa && <>
              <Text style={s.infoLabel}>{t.empresa}</Text>
              <Text style={s.infoValue}>{c.cliente.empresa}</Text>
            </>}
            <Text style={s.infoLabel}>{t.vendedor}</Text>
            <Text style={s.infoValueLight}>{c.creadaPor?.name || "Mauricio Hernández"}</Text>
          </View>
          <View style={s.infoColRight}>
            {c.nombreCotizacion && <>
              <Text style={s.infoLabel}>{t.funcionEvento}</Text>
              <Text style={s.subEventoValor}>{c.nombreCotizacion}</Text>
            </>}
            <Text style={s.infoLabel}>{t.evento}</Text>
            <Text style={s.infoValue}>{c.nombreEvento || "—"}</Text>
            <Text style={s.infoLabel}>{t.fechaEvento}</Text>
            <Text style={s.infoValue}>{fmtDate(c.fechaEvento, idioma)}</Text>
            <Text style={s.infoLabel}>{t.lugar}</Text>
            <Text style={s.infoValueLight}>{c.lugarEvento || "—"}</Text>
            {fmtHorario(c.horaInicioEvento, c.horaFinEvento) && <>
              <Text style={s.infoLabel}>{t.horario}</Text>
              <Text style={s.infoValueLight}>{fmtHorario(c.horaInicioEvento, c.horaFinEvento)}</Text>
            </>}
            {c.tipoEvento && <>
              <Text style={s.infoLabel}>{t.tipoEvento}</Text>
              <Text style={s.infoValueLight}>{t.tipoEventoMap[c.tipoEvento] ?? c.tipoEvento}</Text>
            </>}
          </View>
        </View>

        <View style={s.divisor} />

        {/* ── PAQUETE (solo si la cotización se desglosó de un paquete comercial) ── */}
        {c.paqueteNombre ? (
          <View style={s.paqueteBloque}>
            <Text style={s.paqueteLabel}>{t.paquete}</Text>
            <Text style={s.paqueteNombre}>{c.paqueteNombre}</Text>
            {c.paqueteResumen ? <Text style={s.paqueteResumen}>{c.paqueteResumen}</Text> : null}
          </View>
        ) : null}

        {/* ── EQUIPOS ── */}
        <TablaEquipos lineas={c.lineas} notasSecciones={c.notasSecciones ? JSON.parse(c.notasSecciones) : {}} descCategorias={descCategorias} catLabels={catLabels} idioma={idioma} />

        {/* ── CONCEPTOS ADICIONALES (OTRO) ── */}
        <TablaAdicionales lineas={c.lineas} idioma={idioma} />

        {/* ── OPERACIÓN TÉCNICA (subtotal global, sin desglose) ── */}
        <SubtotalOperacion lineas={c.lineas} incluirChofer={c.incluirChofer} idioma={idioma} />

        {/* ── SERVICIO DE DJ (sección propia con detalle de horas) ── */}
        <SubtotalDJ lineas={c.lineas} idioma={idioma} />

        {/* ── LOGÍSTICA (subtotal global, sin desglose) ── */}
        <SubtotalLogistica lineas={c.lineas} idioma={idioma} />

        {/* ── TOTALES ── */}
        <View style={s.totalesBloque}>
          <View style={s.totalesTabla}>
            {(c.subtotalEquiposBruto + subtotalExternos + subtotalPaquetes) > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>{t.equipoAudioIlumVideo}</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.subtotalEquiposBruto + subtotalExternos + subtotalPaquetes)}</Text>
              </View>
            )}
            {discRows.map((r, i) => (
              <View key={i} style={s.totalFila}>
                <Text style={[s.totalFilaDes, s.totalFilaDescuento, r.gold ? { color: "#B3985B" } : {}]}>{r.label}</Text>
                <Text style={[s.totalFilaMonto, s.totalFilaDescuento, r.gold ? { color: "#B3985B" } : {}]}>-{fmtMXN(r.monto)}</Text>
              </View>
            ))}
            {c.lineas.filter(l => l.tipo === "OTRO").reduce((s, l) => s + l.subtotal, 0) > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>{t.conceptosAdicionales}</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.lineas.filter(l => l.tipo === "OTRO").reduce((s, l) => s + l.subtotal, 0))}</Text>
              </View>
            )}
            {(c.subtotalOperacion + (c.incluirChofer ? 500 : 0)) > 0 && (() => {
              // Separar DJ de operación técnica en los totales
              const djSubtotal = c.lineas.filter(l => l.tipo === "DJ").reduce((sum, l) => sum + l.subtotal, 0);
              const opSinDJ = c.subtotalOperacion - djSubtotal + (c.incluirChofer ? 500 : 0);
              return (
                <>
                  {opSinDJ > 0 && (
                    <View style={s.totalFila}>
                      <Text style={s.totalFilaDes}>{t.operacionTecnica}</Text>
                      <Text style={s.totalFilaMonto}>{fmtMXN(opSinDJ)}</Text>
                    </View>
                  )}
                  {djSubtotal > 0 && (
                    <View style={s.totalFila}>
                      <Text style={s.totalFilaDes}>{t.servicioDJ}</Text>
                      <Text style={s.totalFilaMonto}>{fmtMXN(djSubtotal)}</Text>
                    </View>
                  )}
                </>
              );
            })()}
            {(c.subtotalTransporte + c.subtotalComidas + c.subtotalHospedaje) > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>{t.transporteViaticos}</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.subtotalTransporte + c.subtotalComidas + c.subtotalHospedaje)}</Text>
              </View>
            )}
            {/* Total sin IVA — recuadro destacado */}
            <View style={{ borderTop: "1.5 solid " + GOLD, borderBottom: "1 solid #e0ddd8", flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 8, backgroundColor: "#FFFDF7" }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK }}>{t.totalSinIva}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK }}>{fmtMXN(c.total)}</Text>
            </View>
            {c.aplicaIva && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>{t.iva16}</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.montoIva)}</Text>
              </View>
            )}
            {/* Gran Total */}
            <View style={s.totalGranTotal}>
              <Text style={s.totalGranLabel}>{c.aplicaIva ? t.totalConIva : t.granTotal}</Text>
              <Text style={s.totalGranMonto}>{fmtMXN(c.granTotal)}</Text>
            </View>
            {/* Nota IVA */}
            <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 }}>
              <Text style={{ fontSize: 7, color: LIGHT_GRAY, lineHeight: 1.5, fontFamily: "Helvetica-Oblique" }}>
                {c.aplicaIva ? t.notaIvaAplica : t.notaIvaNoAplica}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ANTICIPOS ── */}
        <View style={s.anticipo}>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>{t.anticipo(anticipoPct)}</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(anticipo)}</Text>
          </View>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>{t.saldoLiquidar(liquidacionPct)}</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(liquidacion)}</Text>
          </View>
        </View>

        {/* ── OBSERVACIONES ── */}
        {c.observaciones && (
          <View style={[s.beneficioBloque, { borderColor: "#ddd", backgroundColor: BG_SECTION }]}>
            <Text style={[s.beneficioTitulo, { color: GRAY }]}>{t.observaciones}</Text>
            <Text style={s.beneficioTexto}>{c.observaciones}</Text>
          </View>
        )}

        {/* ── DATOS DE PAGO ── */}
        <View style={s.pagoBloque}>
          <View style={s.pagoCard}>
            <Text style={s.pagoTitulo}>{t.pagoFiscal}</Text>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.razonSocial}</Text><Text style={s.pagoValor}>Escenario Principal Producciones</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.rfc}</Text><Text style={s.pagoValor}>EPP2502068Q8</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.banco}</Text><Text style={s.pagoValor}>Banorte</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.noCuenta}</Text><Text style={s.pagoValor}>1313102977</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.clabe}</Text><Text style={s.pagoValor}>072 680 013131029777</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.tarjeta}</Text><Text style={s.pagoValor}>4189 2810 0070 3307</Text></View>
          </View>
          <View style={s.pagoCard}>
            <Text style={s.pagoTitulo}>{t.pagoNoFiscal}</Text>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.beneficiario}</Text><Text style={s.pagoValor}>Jose Mauricio A. Hernández V.M.</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.rfc}</Text><Text style={s.pagoValor}>HEVM9611179YA</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.banco}</Text><Text style={s.pagoValor}>Banorte</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.noCuenta}</Text><Text style={s.pagoValor}>1314637038</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.clabe}</Text><Text style={s.pagoValor}>072 680 013146370385</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>{t.correo}</Text><Text style={s.pagoValor}>mainstageqro@gmail.com</Text></View>
          </View>
        </View>

        {/* ── Sección Pago Anticipado (solo si está activo) ── */}
        {c.pagoAnticipadoActivo && c.subtotalEquiposNeto > 0 && (() => {
          const pctPA = 5; // Default — el texto ya incluye el % si se personalizó
          const ahorroPA = Math.round(c.subtotalEquiposNeto * pctPA / 100 * 100) / 100;
          const totalPA = c.granTotal - ahorroPA;
          const fechaLimite = c.pagoAnticipadoFecha
            ? new Date(c.pagoAnticipadoFecha + "T12:00:00").toLocaleDateString(idioma === "en" ? "en-US" : "es-MX", { day: "numeric", month: "long", year: "numeric" })
            : null;
          const textoPA = c.pagoAnticipadoTexto || t.pagoAnticipadoDefault(pctPA, fechaLimite);
          return (
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: "#B3985B", borderTopStyle: "solid" }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#B3985B", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
                {t.opcionPagoAnticipado}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#444", lineHeight: 1.5, marginBottom: 8 }}>
                {textoPA}
              </Text>
              <View style={{ backgroundColor: "#f9f5ee", borderRadius: 6, padding: 8, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 8.5, color: "#666" }}>{t.ahorroPagoAnticipado(pctPA)}</Text>
                  <Text style={{ fontSize: 8.5, color: "#B3985B", fontFamily: "Helvetica-Bold" }}>-{fmtMXN(ahorroPA)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#ddd", borderTopStyle: "solid", paddingTop: 4 }}>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#222" }}>{t.totalPagoAnticipado}</Text>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#222" }}>{fmtMXN(totalPA)}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* ── TÉRMINOS ── */}
        <View style={s.terminosBloque}>
          <Text style={s.terminosTitulo}>{t.infoImportante}</Text>
          {TERMINOS.map((term, i) => (
            <View key={i} style={s.terminoItem}>
              <Text style={s.terminoBullet}>•</Text>
              <Text style={s.terminoTexto}>{term}</Text>
            </View>
          ))}
        </View>

        {/* ── FIRMA ── */}
        <View style={s.firmaBloque}>
          <View style={s.firmaCol}>
            {/* Espacio para pegar la firma digital */}
            <View style={s.firmaEspacio} />
            {/* Línea dorada */}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>Jose Mauricio Alejandro Hernández Vázquez Mellado</Text>
            <Text style={s.firmaCargo}>{t.firmaCargo}</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerContacto}>WhatsApp: (446) 143 2565  |  mainstageqro@gmail.com</Text>
          <Text style={s.footerVigencia}>{t.vigencia(c.vigenciaDias)}</Text>
        </View>
        <Text style={s.confidencial}>
          {t.confidencial}
        </Text>

      </Page>
    </Document>
  );
}
