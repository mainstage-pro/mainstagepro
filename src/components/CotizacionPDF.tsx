import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { SANS, MONO } from "@/components/pdf/fonts";

// ─── Paleta de colores (manual de marca v1) ──────────────────────────────────
const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const GRAY = "#55504A";
const LIGHT_GRAY = "#8C8C8C";
const WHITE = "#FFFFFF";
const PAPER = "#F6F4F0";      // blanco cálido — papel del documento
const BG_SECTION = "#EFEAE1"; // bandas y tarjetas sobre el papel
const LINE = "#E1DBD1";       // hairline

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: SANS,
    backgroundColor: PAPER,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // Encabezado sobre papel: logo negro a la izquierda, folio en mono a la derecha
  header: {
    paddingHorizontal: 40,
    paddingTop: 34,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "column",
    paddingTop: 2,
  },
  brand: {
    fontSize: 16,
    fontFamily: SANS,
    fontWeight: 800,
    color: BLACK,
    letterSpacing: 2,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 6,
    color: LIGHT_GRAY,
    letterSpacing: 1.6,
    marginTop: 7,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerEtiqueta: {
    fontSize: 6.5,
    fontFamily: SANS,
    fontWeight: 600,
    color: GOLD,
    letterSpacing: 2.2,
    marginBottom: 4,
  },
  numCotizacion: {
    fontSize: 12,
    fontFamily: MONO,
    fontWeight: 700,
    color: BLACK,
    marginBottom: 3,
  },
  fechaHeader: {
    fontSize: 7,
    fontFamily: MONO,
    color: LIGHT_GRAY,
  },
  // Línea dorada del encabezado
  goldBar: {
    height: 1,
    backgroundColor: GOLD,
    marginHorizontal: 40,
  },
  // Agradecimiento
  gracias: {
    paddingTop: 12,
    paddingHorizontal: 40,
    fontSize: 9,
    color: GRAY,
    lineHeight: 1.5,
  },
  // Imagen de referencia
  heroWrap: {
    marginHorizontal: 40,
    marginTop: 14,
  },
  heroImg: {
    width: "100%",
    height: 168,
    objectFit: "cover",
  },
  heroCaption: {
    fontSize: 6.5,
    color: LIGHT_GRAY,
    marginTop: 4,
    lineHeight: 1.4,
  },
  // Ficha del evento — tarjetas de dato
  fichaGrid: {
    paddingHorizontal: 40,
    paddingTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fichaCard: {
    width: "33.33%",
    paddingRight: 10,
    paddingBottom: 10,
  },
  fichaLabel: {
    fontSize: 6,
    color: LIGHT_GRAY,
    fontFamily: SANS,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  fichaValor: {
    fontSize: 9,
    color: BLACK,
    fontFamily: SANS,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  fichaValorLight: {
    fontSize: 8.5,
    color: GRAY,
    lineHeight: 1.35,
  },
  fichaValorMono: {
    fontSize: 8.5,
    color: BLACK,
    fontFamily: MONO,
    fontWeight: 500,
  },
  // Función/momento interno del evento (ej. Haldi, Sangeet, Ceremony) — destacado
  // para distinguir a simple vista cotizaciones de un mismo trato multi-evento.
  subEventoValor: {
    fontSize: 10,
    color: GOLD,
    fontFamily: SANS,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // Alcance — casillas marcadas por disciplina
  alcanceWrap: {
    marginHorizontal: 40,
    marginTop: 6,
    paddingTop: 12,
    borderTop: `1 solid ${LINE}`,
  },
  alcanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  alcanceItem: {
    width: "33.33%",
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 7,
    paddingRight: 8,
  },
  alcanceBox: {
    width: 12,
    height: 12,
    borderWidth: 0.8,
    borderColor: "#CFC7B8",
    borderStyle: "solid",
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  alcanceBoxOn: {
    borderColor: GOLD,
  },
  // El aspa se dibuja con dos barras giradas: el glifo × de Montserrat es
  // demasiado pequeño y la caja de 12pt recorta cualquier tamaño de texto mayor.
  alcanceAspa: {
    position: "absolute",
    width: 12,
    height: 1.2,
    backgroundColor: GOLD,
  },
  alcanceTexto: {
    fontSize: 7.5,
    fontFamily: SANS,
    fontWeight: 600,
    color: BLACK,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  alcanceTextoOff: {
    fontWeight: 400,
    color: "#ADA69A",
  },
  alcanceNota: {
    fontSize: 6.5,
    color: LIGHT_GRAY,
    marginTop: 1,
    lineHeight: 1.4,
  },
  // Divisor
  divisor: {
    height: 1,
    backgroundColor: LINE,
    marginHorizontal: 40,
    marginVertical: 4,
  },
  // Sección título
  seccionTitulo: {
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  seccionLinea: {
    height: 1.5,
    backgroundColor: GOLD,
    width: 16,
    marginRight: 7,
  },
  seccionNombre: {
    fontSize: 8,
    fontFamily: SANS,
    fontWeight: 700,
    color: BLACK,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  // Apartado del paquete comercial (solo si la cotización viene de un paquete)
  paqueteBloque: {
    marginHorizontal: 40,
    marginTop: 10,
    marginBottom: 2,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: BG_SECTION,
    borderLeft: `2 solid ${GOLD}`,
  },
  paqueteLabel: {
    fontSize: 6,
    fontFamily: SANS,
    fontWeight: 600,
    color: GOLD,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  paqueteNombre: {
    fontSize: 11,
    fontFamily: SANS,
    fontWeight: 700,
    color: BLACK,
  },
  paqueteResumen: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.45,
    marginTop: 3,
  },
  // Tabla — encabezado en hairline, sin banda negra
  tablaWrap: {
    marginHorizontal: 40,
  },
  tablaHeader: {
    flexDirection: "row",
    paddingBottom: 5,
    borderBottom: `1 solid ${BLACK}`,
  },
  tablaHeaderTexto: {
    fontSize: 6,
    color: BLACK,
    fontFamily: SANS,
    fontWeight: 700,
    letterSpacing: 1.1,
  },
  tablaFila: {
    flexDirection: "row",
    paddingVertical: 5.5,
    borderBottom: `1 solid ${LINE}`,
    alignItems: "center",
  },
  tablaIncluido: {
    flexDirection: "row",
    paddingVertical: 4.5,
    borderBottom: `1 solid ${LINE}`,
    alignItems: "center",
  },
  // Columna de etiqueta rotada al margen de cada categoría
  catGutter: {
    width: 16,
  },
  catLabelRot: {
    position: "absolute",
    fontSize: 6,
    fontFamily: SANS,
    fontWeight: 700,
    color: LIGHT_GRAY,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  catSubheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottom: `1 solid ${LINE}`,
  },
  catNombre: {
    fontSize: 7.5,
    fontFamily: SANS,
    fontWeight: 700,
    color: GOLD,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  catSubtotal: {
    fontSize: 7.5,
    fontFamily: MONO,
    fontWeight: 500,
    color: GRAY,
  },
  colImg: { width: 22, marginRight: 4 },
  colDesc: { flex: 3.5 },
  colMarca: { flex: 2 },
  colCant: { flex: 1, textAlign: "center" },
  colDias: { flex: 1, textAlign: "center" },
  colPrecio: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },
  cellDesc: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.35,
  },
  cellMarca: {
    fontSize: 8,
    color: BLACK,
    fontFamily: SANS,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  cellNum: {
    fontSize: 8,
    fontFamily: MONO,
    color: GRAY,
    textAlign: "center",
  },
  cellPrecio: {
    fontSize: 8,
    fontFamily: MONO,
    color: GRAY,
    textAlign: "right",
  },
  cellSubtotal: {
    fontSize: 8,
    fontFamily: MONO,
    fontWeight: 700,
    color: BLACK,
    textAlign: "right",
  },
  cellIncluido: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
  },
  badgeNivel: {
    fontSize: 6.5,
    color: GOLD,
    fontFamily: SANS,
    fontWeight: 700,
    marginLeft: 4,
  },
  // Totales
  totalesBloque: {
    marginHorizontal: 40,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalesTabla: {
    width: 232,
    borderTop: `1 solid ${GOLD}`,
  },
  totalFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4.5,
    borderBottom: `1 solid ${LINE}`,
  },
  totalFilaDes: {
    fontSize: 8,
    color: GRAY,
    flex: 1,
    paddingRight: 10,
  },
  totalFilaMonto: {
    fontSize: 8,
    color: BLACK,
    fontFamily: MONO,
    fontWeight: 500,
    flexShrink: 0,
    textAlign: "right",
  },
  totalFilaDescuento: {
    color: "#9E5B4A",
  },
  totalGranTotal: {
    backgroundColor: BLACK,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 3,
  },
  totalGranLabel: {
    fontSize: 8,
    fontFamily: SANS,
    fontWeight: 700,
    color: WHITE,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  totalGranMonto: {
    fontSize: 13,
    fontFamily: MONO,
    fontWeight: 700,
    color: GOLD,
  },
  // Bloque de anticipo
  anticipo: {
    marginHorizontal: 40,
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  anticipoItem: {
    flex: 1,
    backgroundColor: BG_SECTION,
    borderLeft: `2 solid ${GOLD}`,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  anticipoLabel: {
    fontSize: 6.5,
    color: LIGHT_GRAY,
    fontFamily: SANS,
    fontWeight: 600,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  anticipoMonto: {
    fontSize: 11,
    fontFamily: MONO,
    fontWeight: 700,
    color: BLACK,
  },
  // Beneficio
  beneficioBloque: {
    marginHorizontal: 40,
    marginTop: 14,
    backgroundColor: BG_SECTION,
    borderLeft: `2 solid ${GOLD}`,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  beneficioTitulo: {
    fontSize: 7,
    fontFamily: SANS,
    fontWeight: 700,
    color: GOLD,
    letterSpacing: 1.4,
    textTransform: "uppercase",
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
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  pagoTitulo: {
    fontSize: 6.5,
    fontFamily: SANS,
    fontWeight: 700,
    color: GOLD,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  pagoFila: {
    flexDirection: "row",
    marginBottom: 3.5,
  },
  pagoLabel: {
    fontSize: 7,
    color: "#8E877C",
    width: 74,
  },
  pagoValor: {
    fontSize: 7,
    color: "#F6F4F0",
    fontFamily: MONO,
    fontWeight: 500,
    flex: 1,
  },
  // Términos
  terminosBloque: {
    marginHorizontal: 40,
    marginTop: 18,
    borderTop: `1 solid ${LINE}`,
    paddingTop: 12,
  },
  terminosTitulo: {
    fontSize: 7,
    fontFamily: SANS,
    fontWeight: 700,
    color: BLACK,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  terminoItem: {
    flexDirection: "row",
    marginBottom: 4.5,
    alignItems: "flex-start",
  },
  terminoBullet: {
    width: 10,
    fontSize: 8,
    color: GOLD,
    fontFamily: SANS,
    fontWeight: 700,
  },
  terminoTexto: {
    fontSize: 7.5,
    color: GRAY,
    flex: 1,
    lineHeight: 1.45,
  },
  // Footer
  footer: {
    backgroundColor: BLACK,
    paddingVertical: 18,
    paddingHorizontal: 40,
    marginTop: 26,
  },
  footerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 9,
    color: WHITE,
    fontFamily: SANS,
    fontWeight: 700,
    letterSpacing: 2.4,
  },
  footerVigencia: {
    fontSize: 7,
    color: "#8E877C",
    fontFamily: MONO,
    textAlign: "right",
  },
  footerCta: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1 solid #2A2A2A",
    gap: 8,
  },
  footerCtaItem: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: "#514735",
    borderStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  footerCtaLabel: {
    fontSize: 5.5,
    color: GOLD,
    fontFamily: SANS,
    fontWeight: 600,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  footerCtaValor: {
    fontSize: 7,
    color: "#F6F4F0",
    fontFamily: MONO,
  },
  confidencial: {
    fontSize: 6.5,
    color: LIGHT_GRAY,
    textAlign: "center",
    marginHorizontal: 40,
    marginTop: 10,
    marginBottom: 18,
    lineHeight: 1.4,
  },
  // Firma
  firmaBloque: {
    marginHorizontal: 40,
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  firmaCol: {
    width: 210,
    alignItems: "center",
  },
  firmaEspacio: {
    height: 64,  // espacio para pegar la firma
  },
  firmaLinea: {
    height: 1,
    backgroundColor: GOLD,
    width: "100%",
    marginBottom: 6,
  },
  firmaNombre: {
    fontSize: 8,
    fontFamily: SANS,
    fontWeight: 700,
    color: BLACK,
    textAlign: "center",
    lineHeight: 1.3,
  },
  firmaCargo: {
    fontSize: 7,
    color: GRAY,
    textAlign: "center",
    marginTop: 3,
    letterSpacing: 0.4,
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
    etiquetaDocumento: "COTIZACIÓN",
    elaboradaEl: (f: string) => `Elaborada el ${f}`,
    imagenReferencia: "Imagen de referencia de un montaje Mainstage Pro. El alcance de tu evento es el que se detalla en esta cotización.",
    alcance: "Alcance del evento",
    alcanceNota: "Marcadas, las disciplinas incluidas en esta cotización.",
    disciplinas: {
      AUDIO: "Audio", ILUMINACION: "Iluminación", VIDEO: "Video",
      STAGE: "Escenario", RIGGING: "Rigging", ELECTRICIDAD: "Electricidad",
      DJ: "DJ", OPERACION: "Operación técnica", LOGISTICA: "Transporte",
    } as Record<string, string>,
    ctaWhatsapp: "WHATSAPP",
    ctaInstagram: "INSTAGRAM",
    ctaCorreo: "CORREO",
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
    etiquetaDocumento: "QUOTE",
    elaboradaEl: (f: string) => `Prepared on ${f}`,
    imagenReferencia: "Reference image of a Mainstage Pro setup. The scope of your event is the one detailed in this quote.",
    alcance: "Event scope",
    alcanceNota: "Checked items are the disciplines included in this quote.",
    disciplinas: {
      AUDIO: "Audio", ILUMINACION: "Lighting", VIDEO: "Video",
      STAGE: "Staging", RIGGING: "Rigging", ELECTRICIDAD: "Power",
      DJ: "DJ", OPERACION: "Technical crew", LOGISTICA: "Transportation",
    } as Record<string, string>,
    ctaWhatsapp: "WHATSAPP",
    ctaInstagram: "INSTAGRAM",
    ctaCorreo: "EMAIL",
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

/** Imagen de referencia del tipo de evento, bajo el encabezado. */
function ImagenReferencia({ src, idioma }: { src?: string | null; idioma: Idioma }) {
  if (!src) return null;
  return (
    <View style={s.heroWrap}>
      <Image src={src} style={s.heroImg} />
      <Text style={s.heroCaption}>{TXT[idioma].imagenReferencia}</Text>
    </View>
  );
}

/** Tarjeta de dato de la ficha del evento. */
function FichaDato({ label, valor, estilo }: { label: string; valor: string; estilo?: Style }) {
  return (
    <View style={s.fichaCard}>
      <Text style={s.fichaLabel}>{label}</Text>
      <Text style={estilo ? [s.fichaValor, estilo] : s.fichaValor}>{valor}</Text>
    </View>
  );
}

/**
 * Alcance del evento: casillas marcadas por disciplina. Se deriva de lo que ya
 * trae la cotización — no hay captura nueva. Las disciplinas sin partidas quedan
 * en gris para que el cliente vea qué más se puede sumar.
 */
const DISCIPLINAS_ALCANCE = [
  "AUDIO", "ILUMINACION", "VIDEO",
  "STAGE", "RIGGING", "ELECTRICIDAD",
  "DJ", "OPERACION", "LOGISTICA",
] as const;

function Alcance({ lineas, catDisciplina, idioma }: { lineas: Linea[]; catDisciplina: Record<string, string>; idioma: Idioma }) {
  const t = TXT[idioma];
  const activas = new Set<string>();

  for (const l of lineas) {
    if (l.tipo === "DJ") activas.add("DJ");
    if (l.tipo === "OPERACION_TECNICA") activas.add("OPERACION");
    if (["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo)) activas.add("LOGISTICA");
    if (["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE"].includes(l.tipo)) {
      const m = l.notas?.match(/^cat:([^|]+)/);
      const disc = m ? catDisciplina[m[1].trim()]?.toUpperCase() : null;
      // PRODUCCION y STAFF_GENERAL no tienen casilla propia: son operación.
      if (disc) activas.add(disc === "PRODUCCION" || disc === "STAFF_GENERAL" ? "OPERACION" : disc);
    }
  }

  if (activas.size === 0) return null;

  return (
    <View style={s.alcanceWrap}>
      <Text style={s.seccionNombre}>{t.alcance}</Text>
      <View style={s.alcanceGrid}>
        {DISCIPLINAS_ALCANCE.map((d) => {
          const on = activas.has(d);
          return (
            <View key={d} style={s.alcanceItem}>
              <View style={[s.alcanceBox, on ? s.alcanceBoxOn : {}]}>
                {on ? <>
                  <View style={[s.alcanceAspa, { transform: "rotate(45deg)" }]} />
                  <View style={[s.alcanceAspa, { transform: "rotate(-45deg)" }]} />
                </> : null}
              </View>
              <Text style={[s.alcanceTexto, on ? {} : s.alcanceTextoOff]}>{t.disciplinas[d]}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.alcanceNota}>{t.alcanceNota}</Text>
    </View>
  );
}

function FilaEquipo({ l }: { l: Linea }) {
  return (
    <View style={s.tablaFila}>
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
          <Text style={{ fontSize: 7, color: LIGHT_GRAY, marginTop: 1.5, lineHeight: 1.35 }}>
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

  const FilaIncluida = ({ l }: { l: Linea }) => (
    <View style={s.tablaIncluido}>
      <View style={s.colImg} />
      <Text style={[s.cellIncluido, s.colMarca]}>{[l.marca, l.modelo].filter(Boolean).join(" ") || ""}</Text>
      <Text style={[s.cellIncluido, s.colDesc]}>{l.descripcion}</Text>
      <Text style={[s.cellIncluido, s.colCant, { textAlign: "center" }]}>{l.cantidad}</Text>
      <Text style={[s.cellIncluido, s.colDias, { textAlign: "center" }]}>—</Text>
      <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>{t.incluye}</Text>
      <Text style={[s.cellIncluido, s.colSubtotal, { textAlign: "right" }]}>—</Text>
    </View>
  );

  return (
    <View>
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>{t.seccionEquipo}</Text>
      </View>
      <View style={s.tablaWrap}>
        {/* Header tabla — alineado con el contenido, dejando libre la columna
            del margen donde se rotan los nombres de categoría. */}
        <View style={{ flexDirection: "row" }}>
          {hasCats ? <View style={s.catGutter} /> : null}
          <View style={[s.tablaHeader, { flex: 1 }]}>
            <View style={s.colImg} />
            <Text style={[s.tablaHeaderTexto, s.colMarca]}>{t.colMarcaModelo}</Text>
            <Text style={[s.tablaHeaderTexto, s.colDesc]}>{t.colDescripcion}</Text>
            <Text style={[s.tablaHeaderTexto, s.colCant, { textAlign: "center" }]}>{t.colCant}</Text>
            <Text style={[s.tablaHeaderTexto, s.colDias, { textAlign: "center" }]}>{t.colDias}</Text>
            <Text style={[s.tablaHeaderTexto, s.colPrecio, { textAlign: "right" }]}>{t.colPU}</Text>
            <Text style={[s.tablaHeaderTexto, s.colSubtotal, { textAlign: "right" }]}>{t.colSubtotal}</Text>
          </View>
        </View>

        {hasCats ? (
          // Agrupado por categoría, con la etiqueta rotada en el margen izquierdo
          cats.map(([cat, lins]) => {
            const catSubtotal = lins.reduce((sum, l) => sum + l.subtotal, 0);
            const nota = notasSecciones[cat] ?? descCategorias[cat];
            const catIncluidas = incluidas.filter(l => getCat(l) === cat);
            const etiqueta = catLabels[cat] ?? cat;
            const alto = altoBloqueCategoria(lins, catIncluidas, nota);
            return (
              <View key={cat} style={{ flexDirection: "row" }} wrap={false}>
                <View style={s.catGutter}>
                  {/* Si el bloque es corto la etiqueta se partiría en varias líneas
                      y chocaría con la de la categoría vecina: mejor omitirla. */}
                  {etiqueta.length * 5.4 <= alto - 14 ? (
                    <Text
                      style={[s.catLabelRot, {
                        top: alto / 2 - 4,
                        left: -(alto - 14) / 2 + 8,
                        width: alto - 14,
                        transform: "rotate(-90deg)",
                      }]}
                    >
                      {etiqueta}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.catSubheader}>
                    <Text style={s.catNombre}>{etiqueta}</Text>
                    <Text style={s.catSubtotal}>{fmtMXN(catSubtotal)}</Text>
                  </View>
                  {nota ? (
                    <View style={{ paddingVertical: 5, borderBottom: `1 solid ${LINE}` }}>
                      <Text style={{ fontSize: 7.5, color: GRAY, lineHeight: 1.45 }}>{nota}</Text>
                    </View>
                  ) : null}
                  {lins.map((l) => <FilaEquipo key={l.id} l={l} />)}
                  {catIncluidas.map((l) => <FilaIncluida key={l.id} l={l} />)}
                </View>
              </View>
            );
          })
        ) : (
          // Lista plana (sin categorías o una sola categoría "General")
          <>
            {todasEquipo.map((l) => <FilaEquipo key={l.id} l={l} />)}
            {incluidas.map((l) => <FilaIncluida key={l.id} l={l} />)}
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Alto aproximado de un bloque de categoría, en puntos. Se usa para centrar la
 * etiqueta rotada del margen: react-pdf no expone la medida real del bloque, así
 * que se estima a partir del número de renglones y del largo de la nota.
 */
function altoBloqueCategoria(lineas: Linea[], incluidas: Linea[], nota?: string | null): number {
  const SUBHEADER = 20;
  const FILA = 20;
  const FILA_INCLUIDA = 17;
  const notaAlto = nota ? 11 + Math.ceil(nota.length / 95) * 11 : 0;
  const filas = lineas.reduce((acc, l) => acc + FILA + (getItemNota(l.notas) ? 10 : 0), 0);
  return SUBHEADER + notaAlto + filas + incluidas.length * FILA_INCLUIDA;
}

// Operación técnica: solo subtotal global (sin detallar quiénes ni cuántos técnicos)
function SubtotalOperacion({ lineas, incluirChofer, idioma }: { lineas: Linea[]; incluirChofer?: boolean; idioma: Idioma }) {
  const t = TXT[idioma];
  const opLineas = lineas.filter(l => l.tipo === "OPERACION_TECNICA");
  const subtotal = opLineas.reduce((s, l) => s + l.subtotal, 0) + (incluirChofer ? 500 : 0);
  if (subtotal === 0) return null;

  return (
    <View style={{ marginHorizontal: 40, marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTop: `1 solid ${LINE}`, borderBottom: `1 solid ${LINE}` }}>
        <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: SANS, fontWeight: 700 }}>{t.operacionTecnica}</Text>
        <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: MONO, fontWeight: 700 }}>{fmtMXN(subtotal)}</Text>
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
      <View style={s.tablaWrap}>
        <View style={s.tablaHeader}>
          <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>{t.colDescripcion}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>{t.colHoras}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>{t.colTarifaHr}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>{t.colSubtotal}</Text>
        </View>
        {djLineas.map((l, i) => (
          <View key={l.id} style={s.tablaFila}>
            <View style={{ flex: 3 }}>
              <Text style={s.cellDesc}>{l.descripcion}</Text>
              {getItemNota(l.notas) ? (
                <Text style={{ fontSize: 7, color: LIGHT_GRAY, marginTop: 1.5 }}>
                  {getItemNota(l.notas)}
                </Text>
              ) : null}
            </View>
            <Text style={[s.cellNum, { flex: 1, textAlign: "center" }]}>{l.cantidad}</Text>
            <Text style={[s.cellPrecio, { flex: 1.5, textAlign: "right" }]}>{fmtMXN(l.precioUnitario)}</Text>
            <Text style={[s.cellSubtotal, { flex: 1.5, textAlign: "right" }]}>{fmtMXN(l.subtotal)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingVertical: 6 }}>
          <Text style={{ fontSize: 8, color: GRAY, fontFamily: SANS, fontWeight: 700 }}>{t.totalDJ}</Text>
          <Text style={{ fontSize: 8, color: BLACK, fontFamily: MONO, fontWeight: 700 }}>{fmtMXN(subtotal)}</Text>
        </View>
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
      <View style={s.tablaWrap}>
        {/* Header tabla */}
        <View style={s.tablaHeader}>
          <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>{t.colDescripcion}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>{t.colCant}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>{t.colDias}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1.2, textAlign: "right" }]}>{t.colPU}</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1.2, textAlign: "right" }]}>{t.colSubtotal}</Text>
        </View>
        {otros.map((l) => (
          <View key={l.id} style={s.tablaFila}>
            <View style={{ flex: 3 }}>
              <Text style={{ fontSize: 8, color: BLACK }}>{l.descripcion}</Text>
              {getItemNota(l.notas) ? (
                <Text style={{ fontSize: 7, color: LIGHT_GRAY, marginTop: 1.5 }}>
                  {getItemNota(l.notas)}
                </Text>
              ) : null}
            </View>
            <Text style={[s.cellNum, { flex: 1 }]}>{l.cantidad}</Text>
            <Text style={[s.cellNum, { flex: 1 }]}>{l.dias}</Text>
            <Text style={[s.cellPrecio, { flex: 1.2 }]}>{l.precioUnitario > 0 ? fmtMXN(l.precioUnitario) : "—"}</Text>
            <Text style={[s.cellSubtotal, { flex: 1.2 }]}>{fmtMXN(l.subtotal)}</Text>
          </View>
        ))}
        {/* Subtotal fila */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
          <Text style={{ fontSize: 7, color: GRAY, fontFamily: SANS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>{t.subtotalAdicionales}</Text>
          <Text style={{ fontSize: 8, color: BLACK, fontFamily: MONO, fontWeight: 700 }}>{fmtMXN(subtotal)}</Text>
        </View>
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
    <View style={{ marginHorizontal: 40 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottom: `1 solid ${LINE}` }}>
        <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: SANS, fontWeight: 700 }}>{t.transporteViaticos}</Text>
        <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: MONO, fontWeight: 700 }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// ─── Documento principal ─────────────────────────────────────────────────────
export function CotizacionPDF({
  cotizacion: c,
  logoSrc,
  descCategorias = {},
  catLabels = {},
  idioma = "es",
  fotoReferenciaUrl = null,
  catDisciplina = {},
  alturaRollo = null,
}: {
  cotizacion: CotizacionData;
  logoSrc?: string | null;
  descCategorias?: Record<string, string>;
  catLabels?: Record<string, string>;
  idioma?: Idioma;
  /** Imagen de referencia del tipo de evento (base64). */
  fotoReferenciaUrl?: string | null;
  /** Categoría de equipo → disciplina, para marcar el alcance. */
  catDisciplina?: Record<string, string>;
  /** Alto en puntos de la página continua. Si es null, se pagina en carta. */
  alturaRollo?: number | null;
}) {
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
      {/* En rollo el encabezado ya trae su propio aire; en carta hace falta margen
          vertical para que el contenido no toque el filo en las hojas siguientes. */}
      <Page
        size={alturaRollo ? { width: 612, height: alturaRollo } : "LETTER"}
        style={alturaRollo ? s.page : [s.page, { paddingTop: 26, paddingBottom: 26 }]}
      >

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
            <Text style={s.headerEtiqueta}>{t.etiquetaDocumento}</Text>
            <Text style={s.numCotizacion}>{c.numeroCotizacion}{c.version > 1 ? ` v${c.version}` : ""}</Text>
            <Text style={s.fechaHeader}>{t.elaboradaEl(fmtDate(c.createdAt, idioma))}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        {/* ── Agradecimiento ── */}
        <Text style={s.gracias}>
          {t.gracias}
        </Text>

        {/* ── Imagen de referencia del tipo de evento ── */}
        <ImagenReferencia src={fotoReferenciaUrl} idioma={idioma} />

        {/* ── Ficha del cliente y del evento ── */}
        <View style={s.fichaGrid}>
          <FichaDato label={t.cliente} valor={c.cliente.nombre} />
          {c.cliente.empresa ? <FichaDato label={t.empresa} valor={c.cliente.empresa} /> : null}
          <FichaDato label={t.evento} valor={c.nombreEvento || "—"} />
          {c.nombreCotizacion ? <FichaDato label={t.funcionEvento} valor={c.nombreCotizacion} estilo={s.subEventoValor} /> : null}
          <FichaDato label={t.fechaEvento} valor={fmtDate(c.fechaEvento, idioma)} estilo={s.fichaValorMono} />
          {fmtHorario(c.horaInicioEvento, c.horaFinEvento)
            ? <FichaDato label={t.horario} valor={fmtHorario(c.horaInicioEvento, c.horaFinEvento)!} estilo={s.fichaValorMono} />
            : null}
          <FichaDato label={t.lugar} valor={c.lugarEvento || "—"} estilo={s.fichaValorLight} />
          {c.tipoEvento ? <FichaDato label={t.tipoEvento} valor={t.tipoEventoMap[c.tipoEvento] ?? c.tipoEvento} estilo={s.fichaValorLight} /> : null}
          <FichaDato label={t.vendedor} valor={c.creadaPor?.name || "Mauricio Hernández"} estilo={s.fichaValorLight} />
        </View>

        {/* ── Alcance del evento ── */}
        <Alcance lineas={c.lineas} catDisciplina={catDisciplina} idioma={idioma} />

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
                <Text style={[s.totalFilaDes, s.totalFilaDescuento, r.gold ? { color: GOLD } : {}]}>{r.label}</Text>
                <Text style={[s.totalFilaMonto, s.totalFilaDescuento, r.gold ? { color: GOLD } : {}]}>-{fmtMXN(r.monto)}</Text>
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
            <View style={{ borderTop: "1.5 solid " + GOLD, borderBottom: `1 solid ${LINE}`, flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 8, backgroundColor: WHITE }}>
              <Text style={{ fontSize: 9, fontFamily: SANS, fontWeight: 700, color: BLACK }}>{t.totalSinIva}</Text>
              <Text style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: BLACK }}>{fmtMXN(c.total)}</Text>
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
              <Text style={{ fontSize: 7, color: LIGHT_GRAY, lineHeight: 1.5, fontFamily: SANS, fontStyle: "italic" }}>
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
          <View style={[s.beneficioBloque, { borderColor: LINE, backgroundColor: BG_SECTION }]}>
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
            <View style={{ marginHorizontal: 40, marginTop: 16, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: GOLD, borderTopStyle: "solid" }}>
              <Text style={{ fontSize: 9, fontFamily: SANS, fontWeight: 700, color: GOLD, letterSpacing: 1.4, marginBottom: 6, textTransform: "uppercase" }}>
                {t.opcionPagoAnticipado}
              </Text>
              <Text style={{ fontSize: 8.5, color: GRAY, lineHeight: 1.5, marginBottom: 8 }}>
                {textoPA}
              </Text>
              <View style={{ backgroundColor: BG_SECTION, padding: 8, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 8.5, color: GRAY }}>{t.ahorroPagoAnticipado(pctPA)}</Text>
                  <Text style={{ fontSize: 8.5, color: GOLD, fontFamily: MONO, fontWeight: 700 }}>-{fmtMXN(ahorroPA)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: LINE, borderTopStyle: "solid", paddingTop: 4 }}>
                  <Text style={{ fontSize: 9, fontFamily: SANS, fontWeight: 700, color: BLACK }}>{t.totalPagoAnticipado}</Text>
                  <Text style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, color: BLACK }}>{fmtMXN(totalPA)}</Text>
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
          <View style={s.footerTop}>
            <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.footerVigencia}>{t.vigencia(c.vigenciaDias)}</Text>
          </View>
          <View style={s.footerCta}>
            <View style={s.footerCtaItem}>
              <Text style={s.footerCtaLabel}>{t.ctaWhatsapp}</Text>
              <Text style={s.footerCtaValor}>(446) 143 2565</Text>
            </View>
            <View style={s.footerCtaItem}>
              <Text style={s.footerCtaLabel}>{t.ctaInstagram}</Text>
              <Text style={s.footerCtaValor}>@mainstagepro.mx</Text>
            </View>
            <View style={s.footerCtaItem}>
              <Text style={s.footerCtaLabel}>{t.ctaCorreo}</Text>
              <Text style={s.footerCtaValor}>mainstageqro@gmail.com</Text>
            </View>
          </View>
        </View>
        <Text style={s.confidencial}>
          {t.confidencial}
        </Text>

      </Page>
    </Document>
  );
}
