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
  },
  totalFilaMonto: {
    fontSize: 8.5,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtMXN(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string | Date | null) {
  if (!s) return "—";
  const iso = s instanceof Date ? s.toISOString() : s;
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
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

function TablaEquipos({ lineas, notasSecciones }: { lineas: Linea[]; notasSecciones: Record<string, string> }) {
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
        <Text style={s.seccionNombre}>Equipo de Audio, Iluminación, Video y más</Text>
      </View>
      {/* Header tabla */}
      <View style={s.tablaHeader}>
        <View style={s.colImg} />
        <Text style={[s.tablaHeaderTexto, s.colMarca]}>MARCA / MODELO</Text>
        <Text style={[s.tablaHeaderTexto, s.colDesc]}>DESCRIPCIÓN</Text>
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
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1, textTransform: "uppercase" }}>{cat}</Text>
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
                  <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>INCLUYE</Text>
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
              <Text style={[s.cellIncluido, s.colPrecio, { textAlign: "right" }]}>INCLUYE</Text>
              <Text style={[s.cellIncluido, s.colSubtotal, { textAlign: "right" }]}>—</Text>
            </View>
          ))}
        </>
      )}

    </View>
  );
}

// Operación técnica: solo subtotal global (sin detallar quiénes ni cuántos técnicos)
function SubtotalOperacion({ lineas, incluirChofer }: { lineas: Linea[]; incluirChofer?: boolean }) {
  const opLineas = lineas.filter(l => l.tipo === "OPERACION_TECNICA");
  const subtotal = opLineas.reduce((s, l) => s + l.subtotal, 0) + (incluirChofer ? 500 : 0);
  if (subtotal === 0) return null;

  return (
    <View style={{ marginHorizontal: 40, marginTop: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTop: "1 solid #e0ddd8", borderBottom: "1 solid #e0ddd8" }}>
        <Text style={{ fontSize: 9, color: GRAY, fontFamily: "Helvetica-Bold" }}>Operación técnica</Text>
        <Text style={{ fontSize: 9, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// Servicio de DJ: sección separada con detalle de horas y tarifa
function SubtotalDJ({ lineas }: { lineas: Linea[] }) {
  const djLineas = lineas.filter(l => l.tipo === "DJ");
  if (djLineas.length === 0) return null;
  const subtotal = djLineas.reduce((s, l) => s + l.subtotal, 0);

  return (
    <View>
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>Servicio de DJ</Text>
      </View>
      <View style={s.tablaHeader}>
        <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>DESCRIPCIÓN</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>HORAS</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>TARIFA/HR</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>SUBTOTAL</Text>
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
        <Text style={{ fontSize: 8.5, color: GRAY, fontFamily: "Helvetica-Bold" }}>Total DJ: </Text>
        <Text style={{ fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" }}>{fmtMXN(subtotal)}</Text>
      </View>
    </View>
  );
}

// Conceptos adicionales (OTRO): misma estética que las demás secciones
function TablaAdicionales({ lineas }: { lineas: Linea[] }) {
  const otros = lineas.filter(l => l.tipo === "OTRO");
  if (otros.length === 0) return null;
  const subtotal = otros.reduce((s, l) => s + l.subtotal, 0);
  return (
    <View>
      {/* Título de sección — mismo estilo dorado */}
      <View style={s.seccionTitulo}>
        <View style={s.seccionLinea} />
        <Text style={s.seccionNombre}>Conceptos adicionales</Text>
      </View>
      {/* Header tabla */}
      <View style={s.tablaHeader}>
        <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>DESCRIPCIÓN</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>CANT</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1, textAlign: "center" }]}>DÍAS</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.2, textAlign: "right" }]}>P/U</Text>
        <Text style={[s.tablaHeaderTexto, { flex: 1.2, textAlign: "right" }]}>SUBTOTAL</Text>
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
        <Text style={{ fontSize: 8, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>Subtotal adicionales</Text>
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
    discRows.push({ label: `Descuento por volumen (${Math.round(c.descuentoVolumenPct * 100)}%)`, monto: montoVolumenPdf });
  if (montoB2bPdf > 0)
    discRows.push({ label: `Descuento B2B (${Math.round(c.descuentoB2bPct * 100)}%)`, monto: montoB2bPdf });

  // Manual (FamilyFriends = %, FijoMonto = $)
  const esManualMonto = c.descuentoManualEsMonto ?? false;
  const pctFF = c.descuentoFamilyFriendsPct ?? 0;
  const montoFijo = c.descuentoFijoMonto ?? 0;
  if (!esManualMonto && pctFF > 0) {
    const montoM = basePostB * pctFF;
    discRows.push({ label: `Descuento especial (${Math.round(pctFF * 100)}%)`, monto: montoM });
  }
  if (esManualMonto && montoFijo > 0) {
    discRows.push({ label: "Descuento especial", monto: montoFijo });
  }
  // Legacy
  if ((c.descuentoMultidiaPct ?? 0) > 0)
    discRows.push({ label: `Descuento multi-día (${Math.round(c.descuentoMultidiaPct * 100)}%)`, monto: sb * c.descuentoMultidiaPct });
  if ((c.descuentoEspecialPct ?? 0) > 0)
    discRows.push({ label: `Descuento especial (${Math.round(c.descuentoEspecialPct * 100)}%)${c.descuentoEspecialNota ? ` · ${c.descuentoEspecialNota}` : ""}`, monto: sb * c.descuentoEspecialPct });
  if ((c.descuentoPatrocinioPct ?? 0) > 0)
    discRows.push({ label: `Patrocinio (${Math.round(c.descuentoPatrocinioPct * 100)}%)${c.descuentoPatrocinioNota ? ` · ${c.descuentoPatrocinioNota}` : ""}`, monto: sb * c.descuentoPatrocinioPct });
  // Desc fijo legacy (sin flag ManualEsMonto)
  if (!esManualMonto && montoFijo > 0 && pctFF === 0)
    discRows.push({ label: "Descuento fijo", monto: montoFijo });
  // Trade
  try {
    const td = c.mainstageTradeData ? JSON.parse(c.mainstageTradeData) : {};
    if (td.nivelSeleccionado && td.pct && td.activo) {
      const NLBL: Record<number, string> = { 1: "Base", 2: "Estratégico", 3: "Premium" };
      discRows.push({ label: `Mainstage Trade · ${NLBL[td.nivelSeleccionado] ?? ""} (${td.pct}%)`, monto: Math.round(sb * (td.pct / 100) * 100) / 100, gold: true });
    }
  } catch { /* noop */ }
  // Fallback if no individual rows resolved
  if (discRows.length === 0 && tieneDescuento)
    discRows.push({ label: "Descuento", monto: c.montoDescuento });

  const vigenciaDate = new Date(c.createdAt);
  vigenciaDate.setDate(vigenciaDate.getDate() + c.vigenciaDias);

  const TERMINOS = [
    `Se solicita un anticipo del ${anticipoPct}% ($${anticipo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}) para reservar la fecha.`,
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
              ? <Image src={logoSrc} style={{ width: 150, alignSelf: "flex-start" }} />
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

        {/* ── CONCEPTOS ADICIONALES (OTRO) ── */}
        <TablaAdicionales lineas={c.lineas} />

        {/* ── OPERACIÓN TÉCNICA (subtotal global, sin desglose) ── */}
        <SubtotalOperacion lineas={c.lineas} incluirChofer={c.incluirChofer} />

        {/* ── SERVICIO DE DJ (sección propia con detalle de horas) ── */}
        <SubtotalDJ lineas={c.lineas} />

        {/* ── LOGÍSTICA (subtotal global, sin desglose) ── */}
        {c.tipoServicio !== "RENTA" && <SubtotalLogistica lineas={c.lineas} />}

        {/* ── TOTALES ── */}
        <View style={s.totalesBloque}>
          <View style={s.totalesTabla}>
            {(c.subtotalEquiposBruto + subtotalExternos + subtotalPaquetes) > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>Equipo de audio, iluminación y video</Text>
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
                <Text style={s.totalFilaDes}>Conceptos adicionales</Text>
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
                      <Text style={s.totalFilaDes}>Operación técnica</Text>
                      <Text style={s.totalFilaMonto}>{fmtMXN(opSinDJ)}</Text>
                    </View>
                  )}
                  {djSubtotal > 0 && (
                    <View style={s.totalFila}>
                      <Text style={s.totalFilaDes}>Servicio de DJ</Text>
                      <Text style={s.totalFilaMonto}>{fmtMXN(djSubtotal)}</Text>
                    </View>
                  )}
                </>
              );
            })()}
            {c.tipoServicio !== "RENTA" && (c.subtotalTransporte + c.subtotalComidas + c.subtotalHospedaje) > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>Transporte y viáticos</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.subtotalTransporte + c.subtotalComidas + c.subtotalHospedaje)}</Text>
              </View>
            )}
            {/* Total sin IVA — recuadro destacado */}
            <View style={{ borderTop: "1.5 solid " + GOLD, borderBottom: "1 solid #e0ddd8", flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 8, backgroundColor: "#FFFDF7" }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK }}>TOTAL SIN IVA</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK }}>{fmtMXN(c.total)}</Text>
            </View>
            {c.aplicaIva && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>IVA 16%</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(c.montoIva)}</Text>
              </View>
            )}
            {/* Gran Total */}
            <View style={s.totalGranTotal}>
              <Text style={s.totalGranLabel}>{c.aplicaIva ? "TOTAL CON IVA" : "GRAN TOTAL"}</Text>
              <Text style={s.totalGranMonto}>{fmtMXN(c.granTotal)}</Text>
            </View>
            {/* Nota IVA */}
            <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 }}>
              <Text style={{ fontSize: 7, color: LIGHT_GRAY, lineHeight: 1.5, fontFamily: "Helvetica-Oblique" }}>
                {c.aplicaIva
                  ? "* El IVA aplica únicamente en caso de requerir comprobante fiscal (factura). En pagos sin factura, el total a cubrir corresponde al subtotal sin IVA indicado arriba."
                  : "* En caso de requerir comprobante fiscal (factura), se añadirá el IVA correspondiente (16%) al total indicado. Cotizar con su vendedor."}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ANTICIPOS ── */}
        <View style={s.anticipo}>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>ANTICIPO ({anticipoPct}%)</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(anticipo)}</Text>
          </View>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>SALDO A LIQUIDAR ({liquidacionPct}%)</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(liquidacion)}</Text>
          </View>
        </View>

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

        {/* ── Sección Pago Anticipado (solo si está activo) ── */}
        {c.pagoAnticipadoActivo && c.subtotalEquiposNeto > 0 && (() => {
          const pctPA = 5; // Default — el texto ya incluye el % si se personalizó
          const ahorroPA = Math.round(c.subtotalEquiposNeto * pctPA / 100 * 100) / 100;
          const totalPA = c.granTotal - ahorroPA;
          const fechaLimite = c.pagoAnticipadoFecha
            ? new Date(c.pagoAnticipadoFecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
            : null;
          const textoPA = c.pagoAnticipadoTexto || `Si realizas el pago total del servicio${fechaLimite ? ` antes del ${fechaLimite}` : " antes de la fecha límite"}, aplicamos un descuento adicional del ${pctPA}% sobre equipos Mainstage.`;
          return (
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: "#B3985B", borderTopStyle: "solid" }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#B3985B", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
                Opción de pago anticipado
              </Text>
              <Text style={{ fontSize: 8.5, color: "#444", lineHeight: 1.5, marginBottom: 8 }}>
                {textoPA}
              </Text>
              <View style={{ backgroundColor: "#f9f5ee", borderRadius: 6, padding: 8, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 8.5, color: "#666" }}>Ahorro por pago anticipado ({pctPA}%)</Text>
                  <Text style={{ fontSize: 8.5, color: "#B3985B", fontFamily: "Helvetica-Bold" }}>-{fmtMXN(ahorroPA)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#ddd", borderTopStyle: "solid", paddingTop: 4 }}>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#222" }}>Total con pago anticipado</Text>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#222" }}>{fmtMXN(totalPA)}</Text>
                </View>
              </View>
            </View>
          );
        })()}

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

        {/* ── FIRMA ── */}
        <View style={s.firmaBloque}>
          <View style={s.firmaCol}>
            {/* Espacio para pegar la firma digital */}
            <View style={s.firmaEspacio} />
            {/* Línea dorada */}
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>Jose Mauricio Alejandro Hernández Vázquez Mellado</Text>
            <Text style={s.firmaCargo}>Director General · Mainstage Pro</Text>
          </View>
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
