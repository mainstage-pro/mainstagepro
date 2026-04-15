import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const WHITE = "#FFFFFF";
const GRAY = "#4a4a4a";
const LIGHT = "#F7F5F0";
const ALT = "#EEECE8";

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
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7.5, color: "#888888", letterSpacing: 1 },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  docSub: { fontSize: 9, color: "#aaaaaa" },
  body: { paddingHorizontal: 40, paddingTop: 24 },
  infoRow: { flexDirection: "row", marginBottom: 6 },
  infoLabel: { fontSize: 8, color: GRAY, width: 120 },
  infoValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, flex: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e0ddd6", marginVertical: 16 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  table: { width: "100%" },
  tableHeader: { flexDirection: "row", backgroundColor: BLACK, borderRadius: 2, marginBottom: 1 },
  tableHeaderCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, padding: 6 },
  tableRow: { flexDirection: "row", marginBottom: 1 },
  tableRowAlt: { flexDirection: "row", backgroundColor: ALT, marginBottom: 1 },
  cell: { fontSize: 8, color: BLACK, padding: 6, flexWrap: "wrap" },
  colArea: { width: "15%" },
  colProb: { width: "25%" },
  colCausa: { width: "25%" },
  colSol: { width: "35%" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e0ddd6",
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: "#aaaaaa" },
});

export interface ReporteItem {
  area: string;
  problema: string;
  causa: string;
  solucion: string;
}

interface Props {
  proyecto: {
    nombre: string;
    numeroProyecto: string | number;
    fechaEvento?: string | null;
    cliente?: { nombre: string; empresa?: string | null } | null;
  };
  items: ReporteItem[];
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export function ReportePostEventoPDF({ proyecto, items }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View>
            <Text style={s.docTitle}>REPORTE POST-EVENTO</Text>
            <Text style={s.docSub}>Mejoras y Acciones Correctivas</Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          {/* Info */}
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Proyecto:</Text>
            <Text style={s.infoValue}>
              #{proyecto.numeroProyecto} — {proyecto.nombre}
            </Text>
          </View>
          {proyecto.cliente && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Cliente:</Text>
              <Text style={s.infoValue}>
                {proyecto.cliente.nombre}
                {proyecto.cliente.empresa ? ` | ${proyecto.cliente.empresa}` : ""}
              </Text>
            </View>
          )}
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha del evento:</Text>
            <Text style={s.infoValue}>{fmt(proyecto.fechaEvento)}</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionTitle}>Áreas de mejora identificadas</Text>

          {items.length === 0 ? (
            <Text style={{ fontSize: 8, color: GRAY }}>Sin registros.</Text>
          ) : (
            <View style={s.table}>
              {/* Table header */}
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, s.colArea]}>Área</Text>
                <Text style={[s.tableHeaderCell, s.colProb]}>Problema</Text>
                <Text style={[s.tableHeaderCell, s.colCausa]}>Causa raíz</Text>
                <Text style={[s.tableHeaderCell, s.colSol]}>Solución / Acción</Text>
              </View>
              {items.map((item, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.cell, s.colArea]}>{item.area || "—"}</Text>
                  <Text style={[s.cell, s.colProb]}>{item.problema || "—"}</Text>
                  <Text style={[s.cell, s.colCausa]}>{item.causa || "—"}</Text>
                  <Text style={[s.cell, s.colSol]}>{item.solucion || "—"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Documento interno</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
