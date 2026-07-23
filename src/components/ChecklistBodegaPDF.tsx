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

  body: { paddingHorizontal: 36, paddingTop: 20 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 6.5, color: "#888888", letterSpacing: 0.8, marginBottom: 3 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLACK },
  kpiSub: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  kpiBoxGold: { flex: 1, backgroundColor: BLACK, borderRadius: 4, padding: 10 },
  kpiLabelGold: { fontSize: 6.5, color: GOLD, letterSpacing: 0.8, marginBottom: 3 },
  kpiValueGold: { fontSize: 16, fontFamily: "Helvetica-Bold", color: WHITE },
  kpiSubGold: { fontSize: 6.5, color: "#888888", marginTop: 1 },

  seccion: { marginBottom: 16 },
  seccionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seccionNombre: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.5, flex: 1 },
  seccionCount: { fontSize: 7, color: "#777777" },

  table: { borderRadius: 4, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: LIGHT, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: MID },
  thDot: { width: 14, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888" },
  thDesc: { flex: 3, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thEstado: { width: 70, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thCant: { width: 60, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6, textAlign: "center" },
  thNotas: { flex: 2, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },

  tbodyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID },
  tbodyRowAlt: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: "#FAFAF8" },
  tdDot: { width: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tdDesc: { flex: 3, fontSize: 7.5, color: BLACK },
  tdEstado: { width: 70, fontSize: 6.5 },
  tdCant: { width: 60, fontSize: 7.5, color: BLACK, textAlign: "center" },
  tdNotas: { flex: 2, fontSize: 6.5, color: GRAY },

  green:  { color: "#16a34a" },
  orange: { color: "#d97706" },
  red:    { color: "#dc2626" },
  gray:   { color: "#999999" },
  dotGreen:  { backgroundColor: "#16a34a" },
  dotOrange: { backgroundColor: "#d97706" },
  dotRed:    { backgroundColor: "#dc2626" },
  dotGray:   { backgroundColor: "#cccccc" },

  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 12 },

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
export interface ChecklistItemData {
  id: string;
  descripcion: string;
  categoria: string;
  estado: string;
  notas: string | null;
  cantidadEsperada: number | null;
  cantidadContada: number | null;
  color: "green" | "orange" | "red" | "gray";
}

export interface ChecklistBodegaPDFData {
  fechaLabel: string;
  creadoPor: string | null;
  estado: string;
  total: number;
  verdes: number;
  naranjas: number;
  rojos: number;
  pct: number;
  categorias: { nombre: string; items: ChecklistItemData[] }[];
  generadoEn: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
const ESTADO_LABEL: Record<string, string> = {
  EN_BODEGA: "En bodega",
  EN_RENTA_O_USO: "En renta/uso",
  EXTRAVIADO: "Extraviado",
  PERDIDO: "Perdido",
  PENDIENTE: "Pendiente",
};
function colorStyle(c: string) {
  if (c === "green") return s.green;
  if (c === "orange") return s.orange;
  if (c === "red") return s.red;
  return s.gray;
}
function dotStyle(c: string) {
  if (c === "green") return s.dotGreen;
  if (c === "orange") return s.dotOrange;
  if (c === "red") return s.dotRed;
  return s.dotGray;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function ChecklistBodegaPDF({ data }: { data: ChecklistBodegaPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>CHECKLIST SEMANAL DE BODEGA</Text>
            <Text style={s.docSub}>{data.fechaLabel}</Text>
          </View>
        </View>

        <View style={s.body}>

          <View style={s.kpiRow}>
            <View style={s.kpiBoxGold}>
              <Text style={s.kpiLabelGold}>AVANCE</Text>
              <Text style={s.kpiValueGold}>{data.pct}%</Text>
              <Text style={s.kpiSubGold}>{data.total} ítems · creado por {data.creadoPor ?? "—"}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>COMPLETOS</Text>
              <Text style={[s.kpiValue, s.green]}>{data.verdes}</Text>
              <Text style={s.kpiSub}>en bodega</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>EN RENTA</Text>
              <Text style={[s.kpiValue, s.orange]}>{data.naranjas}</Text>
              <Text style={s.kpiSub}>en uso o renta</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>FALTANTES</Text>
              <Text style={[s.kpiValue, s.red]}>{data.rojos}</Text>
              <Text style={s.kpiSub}>requieren atención</Text>
            </View>
          </View>

          {data.categorias.map(cat => (
            <View key={cat.nombre} style={s.seccion} wrap={false}>
              <View style={s.seccionHeader}>
                <Text style={s.seccionNombre}>{cat.nombre.toUpperCase()}</Text>
                <Text style={s.seccionCount}>{cat.items.length} ítem{cat.items.length !== 1 ? "s" : ""}</Text>
              </View>

              <View style={s.table}>
                <View style={s.thead}>
                  <Text style={s.thDot}> </Text>
                  <Text style={s.thDesc}>DESCRIPCIÓN</Text>
                  <Text style={s.thEstado}>ESTADO</Text>
                  <Text style={s.thCant}>CONT./ESP.</Text>
                  <Text style={s.thNotas}>NOTAS</Text>
                </View>
                {cat.items.map((it, i) => (
                  <View key={it.id} style={i % 2 === 0 ? s.tbodyRow : s.tbodyRowAlt}>
                    <View style={s.tdDot}><View style={[s.dot, dotStyle(it.color)]} /></View>
                    <Text style={s.tdDesc}>{it.descripcion}</Text>
                    <Text style={[s.tdEstado, colorStyle(it.color)]}>{ESTADO_LABEL[it.estado] ?? it.estado}</Text>
                    <Text style={s.tdCant}>
                      {it.cantidadContada ?? "—"} / {it.cantidadEsperada ?? "—"}
                    </Text>
                    <Text style={s.tdNotas}>{it.notas ?? ""}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {data.categorias.length === 0 && (
            <Text style={{ fontSize: 8, color: "#999999" }}>Sin ítems en este checklist.</Text>
          )}

          <View style={s.divider} />
          <Text style={{ fontSize: 7, color: "#aaaaaa", fontStyle: "italic" }}>
            Documento interno de uso exclusivo de Mainstage Pro. Generado el {fmtDateLong(data.generadoEn)}.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Checklist de bodega</Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
