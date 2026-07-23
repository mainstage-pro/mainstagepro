import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Paleta Mainstage Pro ─────────────────────────────────────────────────────
export const GOLD  = "#B3985B";
export const BLACK = "#0a0a0a";
export const WHITE = "#FFFFFF";
export const GRAY  = "#4a4a4a";
export const LIGHT = "#F7F5F0";
export const MID   = "#E8E5DF";
export const DARK  = "#111111";

// ─── Estilos base compartidos ─────────────────────────────────────────────────
export const base = StyleSheet.create({
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

  // KPIs
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 6.5, color: "#888888", letterSpacing: 0.8, marginBottom: 3 },
  kpiValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BLACK },
  kpiSub: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  kpiBoxDark: { flex: 1, backgroundColor: BLACK, borderRadius: 4, padding: 10 },
  kpiLabelDark: { fontSize: 6.5, color: GOLD, letterSpacing: 0.8, marginBottom: 3 },
  kpiValueDark: { fontSize: 15, fontFamily: "Helvetica-Bold", color: WHITE },
  kpiSubDark: { fontSize: 6.5, color: "#888888", marginTop: 1 },

  // Secciones (NO usar wrap={false} aquí, se encima si excede la página)
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

  // Tablas
  table: { borderRadius: 4, overflow: "hidden" },
  thead: {
    flexDirection: "row",
    backgroundColor: LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: MID,
  },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  tbodyRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: MID,
  },
  tbodyRowAlt: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: MID,
    backgroundColor: "#FAFAF8",
  },
  td: { fontSize: 7.5, color: GRAY },
  tdStrong: { fontSize: 7.5, color: BLACK },
  tdSub: { fontSize: 6, color: "#999999" },

  divider: { borderBottomWidth: 1, borderBottomColor: MID, marginVertical: 12 },
  nota: { fontSize: 7, color: "#aaaaaa", fontStyle: "italic" },
  vacio: { fontSize: 8, color: "#999999" },

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}
export function fmtFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
export function fmtMoney(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Layout con logo + header + footer ────────────────────────────────────────
export function ReporteLayout({
  titulo,
  subtitulo,
  footerLabel,
  children,
}: {
  titulo: string;
  subtitulo: string;
  footerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Document>
      <Page size="A4" style={base.page}>
        <View style={base.header}>
          <View>
            <Text style={base.brand}>MAINSTAGE PRO</Text>
            <Text style={base.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={base.headerRight}>
            <Text style={base.docTitle}>{titulo}</Text>
            <Text style={base.docSub}>{subtitulo}</Text>
          </View>
        </View>

        <View style={base.body}>{children}</View>

        <View style={base.footer} fixed>
          <Text style={base.footerText}>{footerLabel}</Text>
          <Text
            style={base.pageNum}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
