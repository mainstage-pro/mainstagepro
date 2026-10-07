import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const DARK  = "#111111";
const WHITE = "#FFFFFF";
const GRAY  = "#4a4a4a";
const LIGHT = "#F7F5F0";
const MID   = "#E8E5DF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 8,
    color: BLACK,
  },

  // ── Header ──
  header: {
    backgroundColor: BLACK,
    paddingHorizontal: 36,
    paddingTop: 26,
    paddingBottom: 20,
    marginTop: -36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2 },
  tagline: { fontSize: 6.5, color: "#777777", letterSpacing: 1, marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 0.5 },
  docSub: { fontSize: 7, color: "#999999", marginTop: 3 },
  goldBar: { height: 3, backgroundColor: GOLD },

  // ── Cuerpo ──
  body: { paddingHorizontal: 36, paddingTop: 20 },

  // ── KPIs ──
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  kpiBoxDark: { flex: 1, backgroundColor: BLACK, borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 6, color: "#888888", letterSpacing: 0.8, marginBottom: 3 },
  kpiLabelDark: { fontSize: 6, color: GOLD, letterSpacing: 0.8, marginBottom: 3 },
  kpiValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BLACK },
  kpiValueDark: { fontSize: 15, fontFamily: "Helvetica-Bold", color: WHITE },
  kpiSub: { fontSize: 6, color: GRAY, marginTop: 1 },
  kpiSubDark: { fontSize: 6, color: "#888888", marginTop: 1 },

  // ── Título de bloque (Equipos / Accesorios) ──
  bloqueTitulo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: GOLD,
    paddingBottom: 4,
    marginBottom: 12,
    marginTop: 4,
  },
  bloqueNombre: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1.4 },
  bloqueMeta: { fontSize: 7, color: "#999999" },

  // ── Sección por categoría ──
  seccion: { marginBottom: 14 },
  seccionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seccionNombre: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.5, flex: 1 },
  seccionCount: { fontSize: 6.5, color: "#777777" },

  // ── Tabla ──
  thead: {
    flexDirection: "row",
    backgroundColor: LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: MID,
  },
  th: { fontSize: 6, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  row:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: MID },
  rowAlt: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: "#FAFAF8" },

  // Columnas
  cNombre:  { flex: 1, paddingRight: 8 },
  cCant:    { width: 34, textAlign: "center" },
  cCosto:   { width: 62, textAlign: "right" },
  cPrecio:  { width: 74, textAlign: "right" },
  cMargen:  { width: 44, textAlign: "right" },

  tdNombre: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK },
  tdSub:    { fontSize: 6, color: "#909090", marginTop: 1 },
  tdCant:   { fontSize: 7.5, color: GRAY },
  tdCosto:  { fontSize: 7, color: "#8a8a8a" },
  tdPrecio: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: GOLD },
  tdVacio:  { fontSize: 7, color: "#c0c0c0", fontFamily: "Helvetica-Oblique" },
  tdMargen: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  margenAlto:  { color: "#16a34a" },
  margenMedio: { color: "#d97706" },
  margenBajo:  { color: "#dc2626" },

  tag: { fontSize: 5.5, color: "#a0a0a0", letterSpacing: 0.5 },

  // ── Cierre ──
  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginTop: 14, marginBottom: 10 },
  nota: { fontSize: 6.5, color: "#999999", lineHeight: 1.5 },
  notaInterna: { fontSize: 6.5, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginTop: 5 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: MID,
    paddingTop: 6,
  },
  footerText: { fontSize: 6, color: "#aaaaaa" },
});

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface ListaPreciosItem {
  id: string;
  nombre: string;
  subtitulo: string | null;
  cantidad: number | null;
  precioRenta: number;
  costo: number | null;
  noCotizable?: boolean;
}

export interface ListaPreciosGrupo {
  nombre: string;
  items: ListaPreciosItem[];
}

export interface ListaPreciosPDFData {
  origenLabel: string;
  origenDetalle: string;
  equipos: ListaPreciosGrupo[];
  accesorios: ListaPreciosGrupo[];
  totalEquipos: number;
  totalUnidades: number;
  totalAccesorios: number;
  sinPrecio: number;
  incluyeCostos: boolean;
  generadoEn: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmx = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function margenStyle(m: number) {
  if (m >= 40) return s.margenAlto;
  if (m >= 20) return s.margenMedio;
  return s.margenBajo;
}

// ─── Tabla de una categoría ──────────────────────────────────────────────────
function Categoria({
  grupo, incluyeCostos, etiquetaNombre,
}: { grupo: ListaPreciosGrupo; incluyeCostos: boolean; etiquetaNombre: string }) {
  const unidades = grupo.items.reduce((t, i) => t + (i.cantidad ?? 0), 0);

  const thead = (
    <View style={s.thead}>
      <Text style={[s.th, s.cNombre]}>{etiquetaNombre}</Text>
      <Text style={[s.th, s.cCant]}>CANT.</Text>
      {incluyeCostos && <Text style={[s.th, s.cCosto]}>COSTO</Text>}
      <Text style={[s.th, s.cPrecio]}>PRECIO DE RENTA</Text>
      {incluyeCostos && <Text style={[s.th, s.cMargen]}>MARGEN</Text>}
    </View>
  );

  const fila = (item: ListaPreciosItem, i: number) => {
    const margen = item.costo != null && item.costo > 0 && item.precioRenta > 0
      ? ((item.precioRenta - item.costo) / item.precioRenta) * 100
      : null;
    return (
      <View key={item.id} style={i % 2 === 0 ? s.row : s.rowAlt}>
        <View style={s.cNombre}>
          <Text style={s.tdNombre}>{item.nombre}</Text>
          {(item.subtitulo || item.noCotizable) && (
            <Text style={s.tdSub}>
              {item.subtitulo}
              {item.subtitulo && item.noCotizable ? "  ·  " : ""}
              {item.noCotizable ? "NO COTIZABLE" : ""}
            </Text>
          )}
        </View>
        <Text style={[s.tdCant, s.cCant]}>{item.cantidad ?? "—"}</Text>
        {incluyeCostos && (
          <Text style={[s.tdCosto, s.cCosto]}>{item.costo != null ? fmx(item.costo) : "—"}</Text>
        )}
        <View style={s.cPrecio}>
          {item.precioRenta > 0
            ? <Text style={s.tdPrecio}>{fmx(item.precioRenta)}</Text>
            : <Text style={s.tdVacio}>sin precio</Text>}
        </View>
        {incluyeCostos && (
          <Text style={[s.tdMargen, s.cMargen, margen != null ? margenStyle(margen) : { color: "#c0c0c0" }]}>
            {margen != null ? `${margen.toFixed(0)}%` : "—"}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={s.seccion}>
      {/* El encabezado de categoría, el thead y la primera fila viajan juntos
          para que un salto de página nunca deje el título huérfano. */}
      <View wrap={false}>
        <View style={s.seccionHeader}>
          <Text style={s.seccionNombre}>{grupo.nombre.toUpperCase()}</Text>
          <Text style={s.seccionCount}>
            {grupo.items.length} referencia{grupo.items.length !== 1 ? "s" : ""}
            {unidades > 0 ? ` · ${unidades} unidades` : ""}
          </Text>
        </View>
        {thead}
        {grupo.items[0] && fila(grupo.items[0], 0)}
      </View>
      {grupo.items.slice(1).map((item, i) => fila(item, i + 1))}
    </View>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function ListaPreciosPDF({ data, logoSrc }: { data: ListaPreciosPDFData; logoSrc?: string | null }) {
  const categorias = new Set([
    ...data.equipos.map(g => g.nombre),
    ...data.accesorios.map(g => g.nombre),
  ]).size;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 128 }} />
              : <Text style={s.brand}>MAINSTAGE PRO</Text>}
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>LISTA DE PRECIOS DE RENTA</Text>
            <Text style={s.docSub}>{data.origenLabel} · {fmtDate(data.generadoEn)}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <View style={s.body}>

          {/* ── KPIs ── */}
          <View style={s.kpiRow}>
            <View style={s.kpiBoxDark}>
              <Text style={s.kpiLabelDark}>EQUIPOS</Text>
              <Text style={s.kpiValueDark}>{data.totalEquipos}</Text>
              <Text style={s.kpiSubDark}>referencias</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>UNIDADES</Text>
              <Text style={s.kpiValue}>{data.totalUnidades}</Text>
              <Text style={s.kpiSub}>piezas disponibles</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>ACCESORIOS</Text>
              <Text style={s.kpiValue}>{data.totalAccesorios}</Text>
              <Text style={s.kpiSub}>referencias</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>CATEGORÍAS</Text>
              <Text style={s.kpiValue}>{categorias}</Text>
              <Text style={s.kpiSub}>familias de equipo</Text>
            </View>
          </View>

          {/* ── Equipos ── */}
          {data.equipos.length > 0 && (
            <>
              <View style={s.bloqueTitulo}>
                <Text style={s.bloqueNombre}>EQUIPOS</Text>
                <Text style={s.bloqueMeta}>{data.origenDetalle}</Text>
              </View>
              {data.equipos.map(g => (
                <Categoria key={`eq-${g.nombre}`} grupo={g} incluyeCostos={data.incluyeCostos} etiquetaNombre="EQUIPO" />
              ))}
            </>
          )}

          {/* ── Accesorios ── */}
          {data.accesorios.length > 0 && (
            <>
              <View style={s.bloqueTitulo} wrap={false}>
                <Text style={s.bloqueNombre}>ACCESORIOS</Text>
                <Text style={s.bloqueMeta}>{data.totalAccesorios} referencias del catálogo cotizable</Text>
              </View>
              {data.accesorios.map(g => (
                <Categoria key={`acc-${g.nombre}`} grupo={g} incluyeCostos={false} etiquetaNombre="ACCESORIO" />
              ))}
            </>
          )}

          {data.equipos.length === 0 && data.accesorios.length === 0 && (
            <Text style={s.nota}>No hay referencias con este origen.</Text>
          )}

          <View style={s.divider} />
          <Text style={s.nota}>
            Precio unitario de renta por evento, en pesos mexicanos (MXN) y sin IVA — el mismo que se usa al cotizar.
            {data.sinPrecio > 0
              ? ` ${data.sinPrecio} referencia${data.sinPrecio !== 1 ? "s" : ""} aún sin precio asignado; entra${data.sinPrecio !== 1 ? "n" : ""} en $0 al cotizar.`
              : ""}
          </Text>
          {data.incluyeCostos && (
            <Text style={s.notaInterna}>
              DOCUMENTO INTERNO — incluye costo de proveedor y margen. No compartir con clientes.
            </Text>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Lista de precios de renta · {data.origenLabel}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
