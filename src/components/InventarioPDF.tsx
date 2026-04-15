import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const GOLD  = "#B3985B";
const BLACK = "#0a0a0a";
const WHITE = "#FFFFFF";
const GRAY  = "#4a4a4a";
const LIGHT = "#F7F5F0";
const MID   = "#E8E5DF";
const DARK  = "#111111";

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
  tagline: { fontSize: 6.5, color: "#777777", letterSpacing: 1, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  docSub: { fontSize: 7, color: "#999999" },

  // ── Cuerpo ──
  body: { paddingHorizontal: 36, paddingTop: 20 },

  // ── Resumen KPIs ──
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 6.5, color: "#888888", letterSpacing: 0.8, marginBottom: 3 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLACK },
  kpiSub: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  kpiBoxGold: { flex: 1, backgroundColor: BLACK, borderRadius: 4, padding: 10 },
  kpiLabelGold: { fontSize: 6.5, color: GOLD, letterSpacing: 0.8, marginBottom: 3 },
  kpiValueGold: { fontSize: 16, fontFamily: "Helvetica-Bold", color: WHITE },
  kpiSubGold: { fontSize: 6.5, color: "#888888", marginTop: 1 },

  // ── Sección por categoría ──
  seccion: { marginBottom: 16 },
  seccionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 0,
  },
  seccionNombre: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.5, flex: 1 },
  seccionCount: { fontSize: 7, color: "#777777" },

  // ── Tabla ──
  table: { borderRadius: 4, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: LIGHT, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: MID },
  thDescripcion: { flex: 3, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thMarca: { flex: 1.5, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thModelo: { flex: 1.5, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thCantidad: { width: 40, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6, textAlign: "center" },
  thEstado: { width: 60, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6, textAlign: "center" },

  tbodyRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID },
  tbodyRowAlt: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: "#FAFAF8" },
  tdDescripcion: { flex: 3, fontSize: 7.5, color: BLACK },
  tdMarca: { flex: 1.5, fontSize: 7.5, color: GRAY },
  tdModelo: { flex: 1.5, fontSize: 7.5, color: GRAY },
  tdCantidad: { width: 40, fontSize: 7.5, color: BLACK, fontFamily: "Helvetica-Bold", textAlign: "center" },
  tdEstado: { width: 60, fontSize: 6.5, textAlign: "center" },
  estadoActivo: { color: "#16a34a" },
  estadoMant: { color: "#d97706" },
  estadoBaja: { color: "#dc2626" },

  // ── Divider ──
  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 12 },

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
  footerText: { fontSize: 6.5, color: "#aaaaaa" },
  pageNum: { fontSize: 6.5, color: "#aaaaaa" },
});

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface InventarioEquipoData {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidadTotal: number;
  estado: string;
  notas: string | null;
  categoria: { nombre: string; orden: number };
}

export interface InventarioPDFData {
  categorias: {
    nombre: string;
    orden: number;
    equipos: InventarioEquipoData[];
  }[];
  totalEquipos: number;
  totalUnidades: number;
  generadoEn: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function estadoLabel(e: string) {
  if (e === "ACTIVO") return "Activo";
  if (e === "EN_MANTENIMIENTO") return "Mant.";
  if (e === "DADO_DE_BAJA") return "Baja";
  return e;
}
function estadoStyle(e: string) {
  if (e === "ACTIVO") return s.estadoActivo;
  if (e === "EN_MANTENIMIENTO") return s.estadoMant;
  return s.estadoBaja;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function InventarioPDF({ data }: { data: InventarioPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>INVENTARIO DE EQUIPOS</Text>
            <Text style={s.docSub}>Equipos propios · {fmtDate(data.generadoEn)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── KPIs ── */}
          <View style={s.kpiRow}>
            <View style={s.kpiBoxGold}>
              <Text style={s.kpiLabelGold}>TOTAL DE EQUIPOS</Text>
              <Text style={s.kpiValueGold}>{data.totalEquipos}</Text>
              <Text style={s.kpiSubGold}>referencias distintas</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>UNIDADES TOTALES</Text>
              <Text style={s.kpiValue}>{data.totalUnidades}</Text>
              <Text style={s.kpiSub}>piezas en inventario</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>CATEGORÍAS</Text>
              <Text style={s.kpiValue}>{data.categorias.length}</Text>
              <Text style={s.kpiSub}>familias de equipo</Text>
            </View>
          </View>

          {/* ── Catálogo por categoría ── */}
          {data.categorias.map(cat => (
            <View key={cat.nombre} style={s.seccion} wrap={false}>
              {/* Encabezado de categoría */}
              <View style={s.seccionHeader}>
                <Text style={s.seccionNombre}>{cat.nombre.toUpperCase()}</Text>
                <Text style={s.seccionCount}>{cat.equipos.length} equipo{cat.equipos.length !== 1 ? "s" : ""} · {cat.equipos.reduce((s, e) => s + e.cantidadTotal, 0)} unidades</Text>
              </View>

              {/* Tabla */}
              <View style={s.table}>
                {/* Encabezado */}
                <View style={s.thead}>
                  <Text style={s.thDescripcion}>DESCRIPCIÓN</Text>
                  <Text style={s.thMarca}>MARCA</Text>
                  <Text style={s.thModelo}>MODELO</Text>
                  <Text style={s.thCantidad}>CANT.</Text>
                  <Text style={s.thEstado}>ESTADO</Text>
                </View>
                {/* Filas */}
                {cat.equipos.map((eq, i) => (
                  <View key={eq.id} style={i % 2 === 0 ? s.tbodyRow : s.tbodyRowAlt}>
                    <Text style={s.tdDescripcion}>{eq.descripcion}</Text>
                    <Text style={s.tdMarca}>{eq.marca ?? "—"}</Text>
                    <Text style={s.tdModelo}>{eq.modelo ?? "—"}</Text>
                    <Text style={s.tdCantidad}>{eq.cantidadTotal}</Text>
                    <Text style={[s.tdEstado, estadoStyle(eq.estado)]}>{estadoLabel(eq.estado)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={s.divider} />
          <Text style={{ fontSize: 7, color: "#aaaaaa", fontStyle: "italic" }}>
            Documento interno de uso exclusivo de Mainstage Pro. Solo incluye equipos propios activos.
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Inventario interno</Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
