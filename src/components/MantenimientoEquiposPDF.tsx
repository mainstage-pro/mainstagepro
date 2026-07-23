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
  thFecha: { width: 62, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thEquipo: { flex: 2.6, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thTipo: { width: 52, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thAccion: { flex: 3, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thProximo: { width: 62, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },

  tbodyRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID },
  tbodyRowAlt: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: "#FAFAF8" },
  tdFecha: { width: 62, fontSize: 7.5, color: GRAY },
  tdEquipoCol: { flex: 2.6, paddingRight: 4 },
  tdEquipo: { fontSize: 7.5, color: BLACK },
  tdEquipoSub: { fontSize: 6, color: "#999999" },
  tdTipo: { width: 52, fontSize: 6.5, paddingRight: 4 },
  tdAccion: { flex: 3, fontSize: 7.5, color: GRAY, paddingRight: 4 },
  tdProximo: { width: 62, fontSize: 7, color: GRAY },

  tipoPrev: { color: "#16a34a" },
  tipoCorr: { color: "#dc2626" },
  tipoEst: { color: "#2563eb" },
  tipoFunc: { color: "#d97706" },

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
export interface MantenimientoRegistroData {
  id: string;
  fecha: string;
  tipo: string;
  accionRealizada: string;
  comentarios: string | null;
  proximoMantenimiento: string | null;
  equipoDescripcion: string;
  equipoMarca: string | null;
  equipoModelo: string | null;
  unidadCodigo: string | null;
}

export interface MantenimientoCategoriaData {
  nombre: string;
  registros: MantenimientoRegistroData[];
}

export interface MantenimientoEquiposPDFData {
  categorias: MantenimientoCategoriaData[];
  totalRegistros: number;
  totalEquipos: number;
  diaLabel?: string | null;
  generadoEn: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}
function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
function tipoLabel(t: string) {
  if (t === "PREVENTIVO") return "Prev.";
  if (t === "CORRECTIVO") return "Corr.";
  if (t === "ESTETICO") return "Estét.";
  if (t === "FUNCIONAL") return "Func.";
  return t;
}
function tipoStyle(t: string) {
  if (t === "PREVENTIVO") return s.tipoPrev;
  if (t === "CORRECTIVO") return s.tipoCorr;
  if (t === "ESTETICO") return s.tipoEst;
  return s.tipoFunc;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function MantenimientoEquiposPDF({ data }: { data: MantenimientoEquiposPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>MANTENIMIENTO DE EQUIPOS</Text>
            <Text style={s.docSub}>
              {data.diaLabel ? `Registros del ${data.diaLabel}` : `Bitácora · ${fmtDateLong(data.generadoEn)}`}
            </Text>
          </View>
        </View>

        <View style={s.body}>

          <View style={s.kpiRow}>
            <View style={s.kpiBoxGold}>
              <Text style={s.kpiLabelGold}>REGISTROS</Text>
              <Text style={s.kpiValueGold}>{data.totalRegistros}</Text>
              <Text style={s.kpiSubGold}>acciones de mantenimiento</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>EQUIPOS CON HISTORIAL</Text>
              <Text style={s.kpiValue}>{data.totalEquipos}</Text>
              <Text style={s.kpiSub}>referencias atendidas</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>CATEGORÍAS</Text>
              <Text style={s.kpiValue}>{data.categorias.length}</Text>
              <Text style={s.kpiSub}>familias de equipo</Text>
            </View>
          </View>

          {data.categorias.map(cat => (
            <View key={cat.nombre} style={s.seccion}>
              <View style={s.seccionHeader} wrap={false}>
                <Text style={s.seccionNombre}>{cat.nombre.toUpperCase()}</Text>
                <Text style={s.seccionCount}>{cat.registros.length} registro{cat.registros.length !== 1 ? "s" : ""}</Text>
              </View>

              <View style={s.table}>
                <View style={s.thead} fixed>
                  <Text style={s.thFecha}>FECHA</Text>
                  <Text style={s.thEquipo}>EQUIPO</Text>
                  <Text style={s.thTipo}>TIPO</Text>
                  <Text style={s.thAccion}>ACCIÓN REALIZADA</Text>
                  <Text style={s.thProximo}>PRÓXIMO</Text>
                </View>
                {cat.registros.map((r, i) => (
                  <View key={r.id} style={i % 2 === 0 ? s.tbodyRow : s.tbodyRowAlt} wrap={false}>
                    <Text style={s.tdFecha}>{fmtDate(r.fecha)}</Text>
                    <View style={s.tdEquipoCol}>
                      <Text style={s.tdEquipo}>{r.equipoDescripcion}</Text>
                      <Text style={s.tdEquipoSub}>
                        {[r.equipoMarca, r.equipoModelo].filter(Boolean).join(" ")}
                        {r.unidadCodigo ? ` · U: ${r.unidadCodigo}` : ""}
                      </Text>
                    </View>
                    <Text style={[s.tdTipo, tipoStyle(r.tipo)]}>{tipoLabel(r.tipo)}</Text>
                    <Text style={s.tdAccion}>
                      {r.accionRealizada}
                      {r.comentarios ? ` — ${r.comentarios}` : ""}
                    </Text>
                    <Text style={s.tdProximo}>{fmtDate(r.proximoMantenimiento)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {data.categorias.length === 0 && (
            <Text style={{ fontSize: 8, color: "#999999" }}>Sin registros de mantenimiento.</Text>
          )}

          <View style={s.divider} />
          <Text style={{ fontSize: 7, color: "#aaaaaa", fontStyle: "italic" }}>
            Documento interno de uso exclusivo de Mainstage Pro.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Mantenimiento de equipos</Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
