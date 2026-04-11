import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

// ─── Paleta (idéntica a CotizacionPDF) ───────────────────────────────────────
const GOLD   = "#B3985B";
const BLACK  = "#0a0a0a";
const GRAY   = "#4a4a4a";
const LIGHT  = "#888888";
const WHITE  = "#FFFFFF";
const CREAM  = "#F7F5F0";
const BORDER = "#e0ddd8";

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 90,
    paddingHorizontal: 0,
    fontSize: 9,
    color: BLACK,
  },
  // ── Header ──────────────────────────────────────────────────────────────────
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
  brand: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 7.5,
    color: LIGHT,
    letterSpacing: 1,
  },
  headerRight: { alignItems: "flex-end" },
  docTipo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    marginBottom: 2,
    letterSpacing: 1,
  },
  docNum: {
    fontSize: 8.5,
    color: LIGHT,
  },
  goldBar: {
    height: 3,
    backgroundColor: GOLD,
  },
  // ── Subtítulo centrado ───────────────────────────────────────────────────────
  subtitulo: {
    backgroundColor: CREAM,
    paddingVertical: 9,
    paddingHorizontal: 40,
    fontSize: 8.5,
    color: GRAY,
    textAlign: "center",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Oblique",
  },
  // ── Bloque de partes ─────────────────────────────────────────────────────────
  partesBloque: {
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    gap: 0,
  },
  parteCol: { flex: 1 },
  parteColRight: {
    flex: 1,
    paddingLeft: 20,
    borderLeft: `1 solid ${BORDER}`,
  },
  parteLabel: {
    fontSize: 7.5,
    color: LIGHT,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  parteValor: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 4,
  },
  parteDetalle: {
    fontSize: 8.5,
    color: GRAY,
    marginBottom: 2,
  },
  // ── Divisor ──────────────────────────────────────────────────────────────────
  div: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 40,
    marginVertical: 4,
  },
  // ── Sección título ───────────────────────────────────────────────────────────
  secHead: {
    paddingHorizontal: 40,
    paddingTop: 12,
    paddingBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  secLinea: {
    height: 1.5,
    backgroundColor: GOLD,
    width: 18,
    marginRight: 6,
  },
  secTitulo: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // ── Cuerpo de sección ────────────────────────────────────────────────────────
  secBody: {
    paddingHorizontal: 40,
    paddingBottom: 6,
  },
  // ── Tabla de datos del evento ────────────────────────────────────────────────
  datoFila: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottom: `1 solid ${CREAM}`,
  },
  datoLabel: {
    width: 130,
    fontSize: 8,
    color: LIGHT,
  },
  datoValor: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
  // ── Tabla de servicios ───────────────────────────────────────────────────────
  tablaGrupo: {
    marginTop: 6,
  },
  tablaGrupoHead: {
    flexDirection: "row",
    backgroundColor: BLACK,
    paddingVertical: 4,
    paddingHorizontal: 40,
  },
  tablaGrupoLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    letterSpacing: 0.8,
  },
  tablaFila: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 40,
    borderBottom: `1 solid ${CREAM}`,
  },
  tablaFilaAlt: { backgroundColor: CREAM },
  colDesc:  { flex: 4 },
  colCant:  { flex: 1, textAlign: "center" },
  colDias:  { flex: 1, textAlign: "center" },
  colSub:   { flex: 1.8, textAlign: "right" },
  cellDesc: { fontSize: 8.5, color: BLACK },
  cellSub:  { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold", textAlign: "right" },
  cellNum:  { fontSize: 8.5, color: GRAY, textAlign: "center" },
  cellMarca:{ fontSize: 7.5, color: LIGHT },
  // ── Resumen de precios ───────────────────────────────────────────────────────
  resumenBloque: {
    marginHorizontal: 40,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  resumenTabla: {
    width: 220,
    borderTop: `1.5 solid ${GOLD}`,
  },
  resFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottom: `1 solid ${CREAM}`,
  },
  resLabel: { fontSize: 8.5, color: GRAY },
  resMonto: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: BLACK },
  resDescuento: { color: "#c0392b" },
  resTotalBloque: {
    backgroundColor: BLACK,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 9,
    marginTop: 2,
  },
  resTotalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  resTotalMonto: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD },
  // ── Bloque anticipo / saldo ──────────────────────────────────────────────────
  pagoBloque: {
    marginHorizontal: 40,
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  pagoItem: {
    flex: 1,
    backgroundColor: CREAM,
    borderLeft: `2.5 solid ${GOLD}`,
    padding: 9,
  },
  pagoLabel: {
    fontSize: 7.5,
    color: LIGHT,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  pagoMonto: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 2,
  },
  pagoFecha: {
    fontSize: 8,
    color: GRAY,
  },
  // ── Cláusulas / Artículos ────────────────────────────────────────────────────
  clausulaBloque: {
    paddingHorizontal: 40,
    paddingBottom: 4,
  },
  clausulaItem: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  clausulaNum: {
    width: 16,
    fontSize: 8,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  clausulaTexto: {
    flex: 1,
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },
  clausulaBold: {
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
  // ── Firmas ───────────────────────────────────────────────────────────────────
  firmasBloque: {
    marginHorizontal: 40,
    marginTop: 20,
    flexDirection: "row",
    gap: 30,
  },
  firmaCol: {
    flex: 1,
    alignItems: "center",
  },
  firmaRol: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: LIGHT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 30,
  },
  firmaLinea: {
    width: "100%",
    borderBottom: `1 solid ${GRAY}`,
    marginBottom: 5,
  },
  firmaNombre: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },
  firmaDetalle: {
    fontSize: 7.5,
    color: LIGHT,
    marginTop: 2,
  },
  firmaFecha: {
    width: "100%",
    borderBottom: `1 solid ${BORDER}`,
    marginTop: 14,
    marginBottom: 4,
  },
  firmaFechaLabel: {
    fontSize: 7.5,
    color: LIGHT,
    alignSelf: "flex-start",
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BLACK,
    paddingVertical: 13,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 9,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  footerCenter: {
    fontSize: 7.5,
    color: LIGHT,
    textAlign: "center",
  },
  footerRight: {
    fontSize: 7.5,
    color: "#666",
    textAlign: "right",
  },
  confidencial: {
    position: "absolute",
    bottom: 46,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#555",
    textAlign: "center",
    fontFamily: "Helvetica-Oblique",
  },
  // ── Nota de alerta ───────────────────────────────────────────────────────────
  nota: {
    marginHorizontal: 40,
    marginTop: 10,
    backgroundColor: "#FFFBF2",
    border: `1 solid ${GOLD}`,
    borderRadius: 3,
    padding: 9,
  },
  notaTitulo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  notaTexto: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMXN(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "_______________";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateShort(s: string | null | undefined) {
  if (!s) return "_______________";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const TIPO_SERVICIO: Record<string, string> = {
  RENTA: "Renta de Equipo",
  PRODUCCION_TECNICA: "Producción Técnica Integral",
  DIRECCION_TECNICA: "Dirección Técnica",
  MULTISERVICIO: "Paquete Multiservicio",
};
const GRUPO_LINEA: Record<string, string> = {
  EQUIPO_PROPIO: "Equipo de Renta",
  EQUIPO_EXTERNO: "Equipo Externo / Subrentado",
  PAQUETE: "Paquetes",
  OPERACION_TECNICA: "Personal Técnico y Operación",
  TRANSPORTE: "Transporte y Logística",
  HOSPEDAJE: "Hospedaje",
  COMIDA: "Alimentación",
  DJ: "Servicios de DJ",
  OTRO: "Servicios Adicionales",
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ContratoData {
  logoSrc?: string | null;
  trato: {
    id: string;
    nombreEvento: string | null;
    tipoEvento: string;
    tipoServicio: string | null;
    fechaEventoEstimada: string | null;
    lugarEstimado: string | null;
    asistentesEstimados: number | null;
    duracionEvento: string | null;
    cliente: {
      nombre: string;
      empresa: string | null;
      telefono: string | null;
      correo: string | null;
    };
    responsable: { name: string } | null;
  };
  cotizacion: {
    numeroCotizacion: string;
    granTotal: number;
    aplicaIva: boolean;
    montoIva: number;
    descuentoTotalPct: number;
    montoDescuento: number;
    subtotalEquiposNeto: number;
    subtotalOperacion: number;
    subtotalTransporte: number;
    subtotalHospedaje: number;
    subtotalComidas: number;
    lineas: Array<{
      id: string;
      tipo: string;
      descripcion: string;
      marca: string | null;
      modelo: string | null;
      cantidad: number;
      dias: number;
      precioUnitario: number;
      subtotal: number;
      esIncluido: boolean;
      notas: string | null;
    }>;
    cuentasCobrar: Array<{
      tipoPago: string;
      monto: number;
      fechaCompromiso: string;
    }>;
  } | null;
  appUrl?: string;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function SeccionTitulo({ num, titulo }: { num: string; titulo: string }) {
  return (
    <View style={s.secHead}>
      <View style={s.secLinea} />
      <Text style={s.secTitulo}>{num}. {titulo}</Text>
    </View>
  );
}

function Clausula({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <View style={s.clausulaItem}>
      <Text style={s.clausulaNum}>{num}.</Text>
      <Text style={s.clausulaTexto}>{children}</Text>
    </View>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.datoFila}>
      <Text style={s.datoLabel}>{label}</Text>
      <Text style={s.datoValor}>{value}</Text>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ContratoPDF({ trato, cotizacion, appUrl = "", logoSrc }: ContratoData) {
  const hoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const anticipo = cotizacion?.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
  const liquidacion = cotizacion?.cuentasCobrar.find(c => c.tipoPago === "LIQUIDACION");
  const granTotal = cotizacion?.granTotal ?? 0;
  const montoAnticipo = anticipo?.monto ?? 0;
  const montoSaldo = liquidacion?.monto ?? (granTotal - montoAnticipo);

  // 1 día antes del evento
  const fechaLimiteSaldo = trato.fechaEventoEstimada
    ? new Date(new Date(trato.fechaEventoEstimada).getTime() - 86400000).toISOString()
    : null;

  // Tipos que se muestran como subtotal global (sin detallar líneas)
  const TIPOS_OPERACION = ["OPERACION_TECNICA", "DJ"];
  const TIPOS_LOGISTICA = ["TRANSPORTE", "COMIDA", "HOSPEDAJE"];
  const TIPOS_GLOBALES = [...TIPOS_OPERACION, ...TIPOS_LOGISTICA];

  // Agrupar líneas de equipo por categoría (excluir incluidos y tipos globales)
  type Linea = NonNullable<typeof cotizacion>["lineas"][number];
  const grupos: Record<string, Linea[]> = {};
  const incluidos: Linea[] = [];
  if (cotizacion) {
    for (const l of cotizacion.lineas) {
      if (l.esIncluido) { incluidos.push(l); continue; }
      if (TIPOS_GLOBALES.includes(l.tipo)) continue; // se muestran como subtotal
      const g = GRUPO_LINEA[l.tipo] ?? "Servicios Adicionales";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(l);
    }
  }

  // Subtotales globales
  const lineasAll = cotizacion?.lineas ?? [];
  const subtotalOperacion = lineasAll
    .filter(l => TIPOS_OPERACION.includes(l.tipo) && !l.esIncluido)
    .reduce((sum, l) => sum + l.subtotal, 0);
  const subtotalLogistica = lineasAll
    .filter(l => TIPOS_LOGISTICA.includes(l.tipo) && !l.esIncluido)
    .reduce((sum, l) => sum + l.subtotal, 0);

  const linkCot = cotizacion ? `${appUrl}/cotizaciones/${cotizacion.numeroCotizacion}` : "";

  return (
    <Document
      title={`Contrato — ${trato.nombreEvento || trato.cliente.nombre}`}
      author="Mainstage Producciones"
    >
      {/* ═══════════════════════ PÁGINA 1 ═══════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Header negro */}
        <View style={s.header}>
          <View>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 150, alignSelf: "flex-start" }} />
              : <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            }
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTipo}>CONTRATO DE SERVICIOS</Text>
            {cotizacion && <Text style={s.docNum}>Cotización ref. {cotizacion.numeroCotizacion}</Text>}
            <Text style={s.docNum}>{hoy}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        {/* Subtítulo */}
        <Text style={s.subtitulo}>
          Contrato de Servicios de Producción Técnica
        </Text>

        {/* Bloque de partes */}
        <View style={s.partesBloque}>
          <View style={s.parteCol}>
            <Text style={s.parteLabel}>El Proveedor</Text>
            <Text style={s.parteValor}>MAINSTAGE PRODUCCIONES</Text>
            <Text style={s.parteDetalle}>Producción técnica y renta de equipo</Text>
          </View>
          <View style={s.parteColRight}>
            <Text style={s.parteLabel}>El Cliente</Text>
            <Text style={s.parteValor}>{trato.cliente.nombre.toUpperCase()}</Text>
            {trato.cliente.empresa && (
              <Text style={s.parteDetalle}>{trato.cliente.empresa}</Text>
            )}
            {trato.cliente.telefono && (
              <Text style={s.parteDetalle}>Tel: {trato.cliente.telefono}</Text>
            )}
            {trato.cliente.correo && (
              <Text style={s.parteDetalle}>{trato.cliente.correo}</Text>
            )}
          </View>
        </View>
        <View style={s.div} />

        {/* ── 1. OBJETO Y DATOS DEL EVENTO ── */}
        <SeccionTitulo num="1" titulo="Objeto y Datos del Evento" />
        <View style={s.secBody}>
          <Text style={{ ...s.clausulaTexto, marginBottom: 8 }}>
            EL PROVEEDOR prestará servicios de{" "}
            <Text style={s.clausulaBold}>
              {TIPO_SERVICIO[trato.tipoServicio ?? ""] || "producción técnica y/o renta de equipo"}
            </Text>{" "}
            para el evento descrito a continuación. La cotización aprobada{cotizacion ? ` (${cotizacion.numeroCotizacion})` : ""} forma parte integral de este contrato.
          </Text>
          <Dato label="Nombre del evento" value={trato.nombreEvento || "—"} />
          <Dato label="Tipo de evento"     value={trato.tipoEvento} />
          <Dato label="Fecha del evento"   value={fmtDate(trato.fechaEventoEstimada)} />
          <Dato label="Lugar"              value={trato.lugarEstimado || "A confirmar"} />
          {trato.asistentesEstimados ? (
            <Dato label="Asistentes estimados" value={trato.asistentesEstimados.toLocaleString()} />
          ) : null}
          {trato.duracionEvento ? (
            <Dato label="Duración del servicio" value={trato.duracionEvento} />
          ) : null}
          {cotizacion && (
            <Dato label="Ref. cotización" value={cotizacion.numeroCotizacion} />
          )}
        </View>

        {/* Tabla de servicios contratados */}
        {(Object.keys(grupos).length > 0 || subtotalOperacion > 0 || subtotalLogistica > 0) && (
          <View style={{ marginTop: 6 }}>
            <View style={{ paddingHorizontal: 40, marginBottom: 4 }}>
              <Text style={{ fontSize: 7.5, color: GRAY, fontFamily: "Helvetica-Bold" }}>
                Alcance de servicios contratados:
              </Text>
            </View>
            {Object.entries(grupos).map(([grupo, lineas]) => (
              <View key={grupo} style={s.tablaGrupo}>
                <View style={s.tablaGrupoHead}>
                  <Text style={[s.tablaGrupoLabel, s.colDesc]}>{grupo.toUpperCase()}</Text>
                  <Text style={[s.tablaGrupoLabel, s.colCant]}>CANT.</Text>
                  <Text style={[s.tablaGrupoLabel, s.colDias]}>DÍAS</Text>
                  <Text style={[s.tablaGrupoLabel, s.colSub]}>SUBTOTAL</Text>
                </View>
                {lineas.map((l, i) => (
                  <View key={l.id} style={[s.tablaFila, i % 2 === 1 ? s.tablaFilaAlt : {}]}>
                    <View style={s.colDesc}>
                      <Text style={s.cellDesc}>{l.descripcion}</Text>
                      {(l.marca || l.modelo) && (
                        <Text style={s.cellMarca}>{[l.marca, l.modelo].filter(Boolean).join(" ")}</Text>
                      )}
                      {l.notas && <Text style={s.cellMarca}>{l.notas}</Text>}
                    </View>
                    <Text style={[s.cellNum, s.colCant]}>{l.cantidad}</Text>
                    <Text style={[s.cellNum, s.colDias]}>{l.dias}</Text>
                    <Text style={[s.cellSub, s.colSub]}>{fmtMXN(l.subtotal)}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Operación técnica: subtotal global */}
            {subtotalOperacion > 0 && (
              <View style={{ marginHorizontal: 40, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderTop: `1 solid ${BORDER}`, borderBottom: `1 solid ${BORDER}` }}>
                  <Text style={{ fontSize: 8.5, color: GRAY, fontFamily: "Helvetica-Bold" }}>Operación técnica</Text>
                  <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotalOperacion)}</Text>
                </View>
              </View>
            )}

            {/* Logística: subtotal global */}
            {subtotalLogistica > 0 && (
              <View style={{ marginHorizontal: 40, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottom: `1 solid ${BORDER}` }}>
                  <Text style={{ fontSize: 8.5, color: GRAY, fontFamily: "Helvetica-Bold" }}>Transporte y viáticos</Text>
                  <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotalLogistica)}</Text>
                </View>
              </View>
            )}

            {incluidos.length > 0 && (
              <View style={{ paddingHorizontal: 40, paddingTop: 8 }}>
                <Text style={{ fontSize: 7, color: LIGHT, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 3 }}>
                  INCLUIDO SIN COSTO ADICIONAL
                </Text>
                {incluidos.map(l => (
                  <Text key={l.id} style={{ fontSize: 7.5, color: GRAY, marginBottom: 2 }}>
                    · {l.descripcion}
                  </Text>
                ))}
              </View>
            )}

            {/* Resumen financiero */}
            <View style={s.resumenBloque}>
              <View style={s.resumenTabla}>
                {cotizacion!.descuentoTotalPct > 0 && (
                  <View style={s.resFila}>
                    <Text style={s.resLabel}>Descuento ({cotizacion!.descuentoTotalPct.toFixed(1)}%)</Text>
                    <Text style={{ ...s.resMonto, ...s.resDescuento }}>−{fmtMXN(cotizacion!.montoDescuento)}</Text>
                  </View>
                )}
                {cotizacion!.subtotalTransporte > 0 && (
                  <View style={s.resFila}>
                    <Text style={s.resLabel}>Transporte</Text>
                    <Text style={s.resMonto}>{fmtMXN(cotizacion!.subtotalTransporte)}</Text>
                  </View>
                )}
                {cotizacion!.subtotalHospedaje > 0 && (
                  <View style={s.resFila}>
                    <Text style={s.resLabel}>Hospedaje</Text>
                    <Text style={s.resMonto}>{fmtMXN(cotizacion!.subtotalHospedaje)}</Text>
                  </View>
                )}
                {cotizacion!.subtotalComidas > 0 && (
                  <View style={s.resFila}>
                    <Text style={s.resLabel}>Alimentación</Text>
                    <Text style={s.resMonto}>{fmtMXN(cotizacion!.subtotalComidas)}</Text>
                  </View>
                )}
                {cotizacion!.aplicaIva && (
                  <View style={s.resFila}>
                    <Text style={s.resLabel}>IVA (16%)</Text>
                    <Text style={s.resMonto}>{fmtMXN(cotizacion!.montoIva)}</Text>
                  </View>
                )}
                <View style={s.resTotalBloque}>
                  <Text style={s.resTotalLabel}>TOTAL DEL SERVICIO</Text>
                  <Text style={s.resTotalMonto}>{fmtMXN(granTotal)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Footer pág 1 */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerCenter}>Producción técnica profesional · Audio · Iluminación · Video</Text>
          <Text style={s.footerRight}>Página 1</Text>
        </View>
      </Page>

      {/* ═══════════════════════ PÁGINA 2 ═══════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 150, alignSelf: "flex-start" }} />
              : <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>
            }
            <Text style={s.tagline}>PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTipo}>CONTRATO — CONDICIONES</Text>
            {cotizacion && <Text style={s.docNum}>Ref. {cotizacion.numeroCotizacion}</Text>}
          </View>
        </View>
        <View style={s.goldBar} />

        {/* ── 2. PRECIO, ANTICIPO, SALDO ── */}
        <SeccionTitulo num="2" titulo="Precio, Anticipo, Saldo y Cancelaciones" />

        {/* Bloque anticipo / saldo */}
        <View style={s.pagoBloque}>
          <View style={s.pagoItem}>
            <Text style={s.pagoLabel}>MONTO TOTAL</Text>
            <Text style={s.pagoMonto}>{fmtMXN(granTotal)}</Text>
          </View>
          <View style={s.pagoItem}>
            <Text style={s.pagoLabel}>ANTICIPO</Text>
            <Text style={s.pagoMonto}>{montoAnticipo > 0 ? fmtMXN(montoAnticipo) : "A definir"}</Text>
            {anticipo?.fechaCompromiso && (
              <Text style={s.pagoFecha}>Fecha límite: {fmtDateShort(anticipo.fechaCompromiso)}</Text>
            )}
          </View>
          <View style={s.pagoItem}>
            <Text style={s.pagoLabel}>SALDO RESTANTE</Text>
            <Text style={s.pagoMonto}>{montoSaldo > 0 ? fmtMXN(montoSaldo) : "—"}</Text>
            <Text style={s.pagoFecha}>
              Fecha límite: {fechaLimiteSaldo ? fmtDateShort(fechaLimiteSaldo) : "1 día antes del evento"}
            </Text>
          </View>
        </View>

        <View style={s.clausulaBloque}>
          <View style={{ height: 8 }} />
          <Clausula num="2.1">Sin pago de anticipo, la fecha no se considera reservada ni el equipo apartado.</Clausula>
          <Clausula num="2.2">Si el saldo no se cubre en la fecha límite, EL PROVEEDOR no estará obligado a montar ni prestar el servicio, considerándose cancelado sin devolución de cantidades pagadas.</Clausula>
          <Clausula num="2.3">En caso de cancelación por parte de EL CLIENTE, el anticipo no es reembolsable y se aplica como gasto de reservación y disponibilidad.</Clausula>
          <Clausula num="2.4">Para posponer la fecha se requiere aviso con mínimo <Text style={s.clausulaBold}>14 días naturales</Text> de anticipación. La nueva fecha queda sujeta a disponibilidad y deberá realizarse en los <Text style={s.clausulaBold}>12 meses</Text> siguientes; de lo contrario se considera cancelación sin devolución.</Clausula>
          <Clausula num="2.5">Cualquier cambio de domicilio o horario está sujeto a aprobación de EL PROVEEDOR y puede generar cargos adicionales sin garantizar la misma disponibilidad.</Clausula>
        </View>
        <View style={s.div} />

        {/* ── 3. ALCANCE Y CAMBIOS ── */}
        <SeccionTitulo num="3" titulo="Alcance del Servicio y Cambios" />
        <View style={s.clausulaBloque}>
          <Clausula num="3.1">EL PROVEEDOR prestará el servicio con el equipo, personal y horarios de la cotización aprobada que forma parte integral de este contrato.</Clausula>
          <Clausula num="3.2">Servicios adicionales, modificaciones u horas extra deben solicitarse <Text style={s.clausulaBold}>por escrito</Text> con mínimo <Text style={s.clausulaBold}>3 días naturales</Text> de anticipación, sujetos a disponibilidad y costo extra.</Clausula>
          <Clausula num="3.3">Ajustes de horario de montaje o del evento deben comunicarse con al menos <Text style={s.clausulaBold}>5 días naturales</Text> de anticipación.</Clausula>
          <Clausula num="3.4">En caso de indisponibilidad por fuerza mayor, EL PROVEEDOR podrá sustituir equipo por uno de características iguales o superiores, notificando oportunamente.</Clausula>
          <Clausula num="3.5">Cualquier modificación sustancial al alcance deberá formalizarse mediante adenda escrita y firmada por ambas partes.</Clausula>
        </View>
        <View style={s.div} />

        {/* ── 4. SEGURIDAD, ENERGÍA Y CLIMA ── */}
        <SeccionTitulo num="4" titulo="Seguridad, Operación Técnica, Energía y Clima" />
        <View style={s.clausulaBloque}>
          <Clausula num="4.1">EL PROVEEDOR tiene la <Text style={s.clausulaBold}>decisión técnica final</Text> sobre: (i) ubicación del equipo; (ii) forma de montaje, estructuras y alturas; y (iii) trazo de cableado y zonas restringidas al público.</Clausula>
          <Clausula num="4.2">Nadie ajeno al personal de EL PROVEEDOR podrá manipular, mover o cambiar el equipo sin autorización previa y por escrito.</Clausula>
          <Clausula num="4.3">EL CLIENTE garantiza suministro eléctrico suficiente conforme a los requerimientos técnicos. Cualquier falla del venue o tercero será responsabilidad de estos. Si las condiciones eléctricas no son seguras, EL PROVEEDOR podrá no conectarse sin penalización.</Clausula>
          <Clausula num="4.4">Ante lluvia, vientos fuertes u otras condiciones adversas, EL PROVEEDOR podrá suspender o retirar el servicio privilegiando la seguridad, sin obligación de bonificación.</Clausula>
          <Clausula num="4.5">EL CLIENTE es responsable de obtener permisos, licencias y autorizaciones del evento ante autoridades locales.</Clausula>
        </View>
        <View style={s.div} />

        {/* ── 5. DAÑOS Y NO BONIFICACIONES ── */}
        <SeccionTitulo num="5" titulo="Daños al Equipo y No Bonificaciones" />
        <View style={s.clausulaBloque}>
          <Clausula num="5.1">EL CLIENTE responde por daños al equipo causados por: descargas eléctricas ajenas a EL PROVEEDOR; golpes o manipulación no autorizada; exposición a lluvia, alimentos o bebidas; extravío o robo por personas ajenas al personal operativo. EL CLIENTE cubrirá costo de reparación o reposición a valor comercial.</Clausula>
          <Clausula num="5.2">No habrá bonificación de tiempo ni dinero por: (i) cortes o fallas eléctricas ajenas a EL PROVEEDOR; (ii) terminación anticipada del servicio a solicitud de EL CLIENTE; (iii) condiciones del venue que impidan el desarrollo normal.</Clausula>
          <Clausula num="5.3">La responsabilidad total de EL PROVEEDOR no excederá el monto total del servicio contratado.</Clausula>
        </View>
        <View style={s.div} />

        {/* ── 6. RETRASOS ── */}
        <SeccionTitulo num="6" titulo="Retrasos Imputables a Mainstage Producciones" />
        <View style={s.clausulaBloque}>
          <Text style={{ ...s.clausulaTexto, paddingLeft: 0 }}>
            En caso de retraso imputable únicamente a EL PROVEEDOR, este compensará cumpliendo las horas pactadas siempre que lo permitan las políticas del venue y las condiciones de seguridad, sin otro tipo de penalización económica.
          </Text>
        </View>
        <View style={s.div} />

        {/* ── 7–10. Cláusulas adicionales ── */}
        <SeccionTitulo num="7" titulo="Comunicación Oficial y Modificaciones" />
        <View style={s.clausulaBloque}>
          <Clausula num="7.1">Las comunicaciones oficiales se realizarán por escrito vía correo electrónico o WhatsApp. Los acuerdos verbales deben confirmarse por escrito para tener validez.</Clausula>
          <Clausula num="7.2">EL CLIENTE autoriza a EL PROVEEDOR a conservar sus datos de contacto conforme a la LFPDPPP.</Clausula>
        </View>

        <SeccionTitulo num="8" titulo="Fotografía y Medios" />
        <View style={s.clausulaBloque}>
          <Text style={s.clausulaTexto}>
            EL PROVEEDOR se reserva el derecho de documentar fotográfica y audiovisualmente el montaje y evento para portafolio y promoción institucional. Si EL CLIENTE desea restringir este derecho, deberá notificarlo por escrito antes de la firma del contrato.
          </Text>
        </View>

        <SeccionTitulo num="9" titulo="Caso Fortuito y Fuerza Mayor" />
        <View style={s.clausulaBloque}>
          <Text style={s.clausulaTexto}>
            Ninguna parte será responsable por incumplimiento derivado de desastres naturales, actos de autoridad, pandemia, huelgas o cualquier evento fuera del control razonable de las partes. Ambas acordarán de buena fe una solución que minimice perjuicios.
          </Text>
        </View>

        <SeccionTitulo num="10" titulo="Jurisdicción y Ley Aplicable" />
        <View style={s.clausulaBloque}>
          <Text style={s.clausulaTexto}>
            El presente contrato se rige por las leyes de los Estados Unidos Mexicanos. Las partes se someten a los tribunales competentes de la ciudad donde tenga lugar el evento o, en su defecto, a los de la Ciudad de Querétaro, renunciando a cualquier otro fuero.
          </Text>
        </View>
        <View style={s.div} />

        {/* ── 11. ACEPTACIÓN Y FIRMAS ── */}
        <SeccionTitulo num="11" titulo="Aceptación" />
        <View style={s.secBody}>
          <Text style={{ ...s.clausulaTexto, marginBottom: 4 }}>
            Leído el presente contrato, las partes manifiestan su conformidad y lo aceptan como documento legalmente vinculante, firmándolo en{" "}
            <Text style={s.clausulaBold}>{trato.lugarEstimado || "_______________"}</Text>, el día{" "}
            <Text style={s.clausulaBold}>{hoy}</Text>.
          </Text>
        </View>

        {/* Firmas */}
        <View style={s.firmasBloque}>
          {/* Cliente */}
          <View style={s.firmaCol}>
            <Text style={s.firmaRol}>El Cliente</Text>
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>{trato.cliente.nombre}</Text>
            {trato.cliente.empresa && (
              <Text style={s.firmaDetalle}>{trato.cliente.empresa}</Text>
            )}
            <View style={s.firmaFecha} />
            <Text style={s.firmaFechaLabel}>Lugar y fecha</Text>
          </View>

          {/* Proveedor */}
          <View style={s.firmaCol}>
            <Text style={s.firmaRol}>El Proveedor</Text>
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>MAINSTAGE PRODUCCIONES</Text>
            {trato.responsable && (
              <Text style={s.firmaDetalle}>{trato.responsable.name}</Text>
            )}
            <View style={s.firmaFecha} />
            <Text style={s.firmaFechaLabel}>Lugar y fecha</Text>
          </View>
        </View>

        {/* Nota vigencia */}
        <View style={s.nota}>
          <Text style={s.notaTitulo}>NOTA IMPORTANTE</Text>
          <Text style={s.notaTexto}>
            Este contrato es válido únicamente con la firma autógrafa de ambas partes y el pago del anticipo correspondiente. La cotización de referencia ({cotizacion?.numeroCotizacion ?? "—"}) forma parte integral del mismo.
            {linkCot ? `  Consulta en línea: ${linkCot}` : ""}
          </Text>
        </View>

        {/* Footer pág 2 */}
        <Text style={s.confidencial}>
          Documento confidencial generado por Mainstage Pro · Uso exclusivo de las partes firmantes
        </Text>
        <View style={s.footer}>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerCenter}>Producción técnica profesional · Audio · Iluminación · Video</Text>
          <Text style={s.footerRight}>Página 2</Text>
        </View>
      </Page>
    </Document>
  );
}
