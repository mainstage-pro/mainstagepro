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

  vehName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BLACK },
  vehSub: { fontSize: 8, color: GRAY, marginTop: 2, marginBottom: 14 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 6.5, color: "#888888", letterSpacing: 0.8, marginBottom: 3 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK },
  kpiSub: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  kpiBoxGold: { flex: 1, backgroundColor: BLACK, borderRadius: 4, padding: 10 },
  kpiLabelGold: { fontSize: 6.5, color: GOLD, letterSpacing: 0.8, marginBottom: 3 },
  kpiValueGold: { fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE },
  kpiSubGold: { fontSize: 6.5, color: "#888888", marginTop: 1 },

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
  thFecha: { width: 58, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thServicio: { flex: 3, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thTipo: { width: 48, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6 },
  thKm: { width: 50, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6, textAlign: "right" },
  thCosto: { width: 55, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6, textAlign: "right" },
  thEstatus: { width: 52, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#888888", letterSpacing: 0.6, textAlign: "center" },

  tbodyRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID },
  tbodyRowAlt: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: "#FAFAF8" },
  tdFecha: { width: 58, fontSize: 7, color: GRAY },
  tdServicio: { flex: 3, fontSize: 7.5, color: BLACK },
  tdServicioSub: { fontSize: 6, color: "#999999", marginTop: 1 },
  tdTipo: { width: 48, fontSize: 6.5, color: GRAY },
  tdKm: { width: 50, fontSize: 7, color: GRAY, textAlign: "right" },
  tdCosto: { width: 55, fontSize: 7.5, color: "#B3985B", textAlign: "right" },
  tdEstatus: { width: 52, fontSize: 6.5, textAlign: "center" },

  ok: { color: "#16a34a" },
  proc: { color: "#2563eb" },
  pend: { color: "#d97706" },

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
export interface VehiculoMantData {
  id: string;
  fecha: string;
  km: number | null;
  tipoRegistro: string;
  servicio: string;
  aceite: string | null;
  anticongelante: string | null;
  estadoLlantas: string | null;
  proximoKm: number | null;
  proximaFecha: string | null;
  estatus: string;
  costo: number | null;
  comentarios: string | null;
}

export interface VehiculoPDFData {
  nombre: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placas: string | null;
  color: string | null;
  kilometraje: number | null;
  proximoServicioKm: number | null;
  proximoServicioFecha: string | null;
  notas: string | null;
  totalCosto: number;
  mantenimientos: VehiculoMantData[];
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
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtKm(n: number | null) {
  if (!n) return "—";
  return `${n.toLocaleString("es-MX")} km`;
}
const TIPO_LABEL: Record<string, string> = {
  SERVICIO: "Servicio", REPARACION: "Reparación", REVISION: "Revisión", ACCIDENTE: "Accidente", OTRO: "Otro",
};
function estatusStyle(e: string) {
  if (e === "COMPLETADO") return s.ok;
  if (e === "EN_PROCESO") return s.proc;
  return s.pend;
}
function estatusLabel(e: string) {
  if (e === "COMPLETADO") return "Compl.";
  if (e === "EN_PROCESO") return "Proceso";
  return "Pend.";
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function VehiculoPDF({ data }: { data: VehiculoPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <View>
            <Text style={s.brand}>MAINSTAGE PRO</Text>
            <Text style={s.tagline}>SOLUCIONES AUDIOVISUALES PROFESIONALES</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>BITÁCORA DE VEHÍCULO</Text>
            <Text style={s.docSub}>{fmtDateLong(data.generadoEn)}</Text>
          </View>
        </View>

        <View style={s.body}>

          <Text style={s.vehName}>{data.nombre}</Text>
          <Text style={s.vehSub}>
            {[data.marca, data.modelo, data.anio].filter(Boolean).join(" ")}
            {data.placas ? ` · Placas ${data.placas}` : ""}
            {data.color ? ` · ${data.color}` : ""}
          </Text>

          <View style={s.kpiRow}>
            <View style={s.kpiBoxGold}>
              <Text style={s.kpiLabelGold}>KM ACTUALES</Text>
              <Text style={s.kpiValueGold}>{fmtKm(data.kilometraje)}</Text>
              <Text style={s.kpiSubGold}>{data.mantenimientos.length} registros</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>PRÓX. SERVICIO (KM)</Text>
              <Text style={s.kpiValue}>{fmtKm(data.proximoServicioKm)}</Text>
              <Text style={s.kpiSub}>meta de kilometraje</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>PRÓX. SERVICIO (FECHA)</Text>
              <Text style={s.kpiValue}>{fmtDate(data.proximoServicioFecha)}</Text>
              <Text style={s.kpiSub}>fecha estimada</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>COSTO HISTÓRICO</Text>
              <Text style={s.kpiValue}>{fmtMoney(data.totalCosto)}</Text>
              <Text style={s.kpiSub}>acumulado</Text>
            </View>
          </View>

          {data.notas ? (
            <Text style={{ fontSize: 7.5, color: GRAY, marginBottom: 14, backgroundColor: LIGHT, padding: 8, borderRadius: 4 }}>
              {data.notas}
            </Text>
          ) : null}

          <View style={s.seccionHeader}>
            <Text style={s.seccionNombre}>BITÁCORA DE MANTENIMIENTO</Text>
            <Text style={s.seccionCount}>{data.mantenimientos.length} registro{data.mantenimientos.length !== 1 ? "s" : ""}</Text>
          </View>

          <View style={s.table}>
            <View style={s.thead}>
              <Text style={s.thFecha}>FECHA</Text>
              <Text style={s.thServicio}>SERVICIO / TRABAJO</Text>
              <Text style={s.thTipo}>TIPO</Text>
              <Text style={s.thKm}>KM</Text>
              <Text style={s.thCosto}>COSTO</Text>
              <Text style={s.thEstatus}>ESTATUS</Text>
            </View>
            {data.mantenimientos.map((m, i) => {
              const detalles = [
                m.aceite ? `Aceite: ${m.aceite}` : null,
                m.anticongelante ? `Anticong: ${m.anticongelante}` : null,
                m.estadoLlantas ? `Llantas: ${m.estadoLlantas}` : null,
                m.proximoKm ? `Próx: ${fmtKm(m.proximoKm)}` : null,
                m.proximaFecha ? `Próx: ${fmtDate(m.proximaFecha)}` : null,
                m.comentarios,
              ].filter(Boolean).join(" · ");
              return (
                <View key={m.id} style={i % 2 === 0 ? s.tbodyRow : s.tbodyRowAlt}>
                  <Text style={s.tdFecha}>{fmtDate(m.fecha)}</Text>
                  <View style={{ flex: 3 }}>
                    <Text style={s.tdServicio}>{m.servicio}</Text>
                    {detalles ? <Text style={s.tdServicioSub}>{detalles}</Text> : null}
                  </View>
                  <Text style={s.tdTipo}>{TIPO_LABEL[m.tipoRegistro] ?? m.tipoRegistro}</Text>
                  <Text style={s.tdKm}>{m.km ? m.km.toLocaleString("es-MX") : "—"}</Text>
                  <Text style={s.tdCosto}>{m.costo ? fmtMoney(m.costo) : "—"}</Text>
                  <Text style={[s.tdEstatus, estatusStyle(m.estatus)]}>{estatusLabel(m.estatus)}</Text>
                </View>
              );
            })}
          </View>

          {data.mantenimientos.length === 0 && (
            <Text style={{ fontSize: 8, color: "#999999", marginTop: 8 }}>Sin registros de mantenimiento.</Text>
          )}

          <View style={s.divider} />
          <Text style={{ fontSize: 7, color: "#aaaaaa", fontStyle: "italic" }}>
            Documento interno de uso exclusivo de Mainstage Pro.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mainstage Pro — Bitácora de vehículo</Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
