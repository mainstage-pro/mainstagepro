import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { base, ReporteLayout, GOLD, BLACK, WHITE, GRAY, MID, LIGHT, DARK, fmtFechaLarga } from "@/components/pdf/ReporteBase";

// ─── Tipos de datos que recibe el PDF (ya parseados en la ruta) ────────────────
export interface EvalCriterio { subarea: string; responsabilidad: string; estandar: string; puntaje: number; nota?: string; evidencias?: string[] }
export interface EvalObjetivo { texto: string; resultado: string; comentario: string; evidencias?: string[] }
export interface EvalAcuerdo { texto: string; estado: string; nota: string }
export interface EvalAutoData { metricas?: Record<string, number>; comentarios?: Record<string, string>; logros?: string; retos?: string }

export interface EvaluacionEmpleadoPDFData {
  nombre: string;
  puesto: string;
  departamento: string;
  periodo: string;
  fecha: string;
  evaluador: string | null;
  estado: string;
  calificacionFinal: string | null;
  puntajeTotal: number | null;
  puntajeGeneral: number | null;
  puntajePuesto: number | null;
  metricas: Record<string, number>;
  competenciaNotas: Record<string, string>;
  aspectosPositivos: string | null;
  areasMejora: string | null;
  incidentesNota: string | null;
  observaciones: string | null;
  criterios: EvalCriterio[];
  objetivos: EvalObjetivo[];
  acuerdos: EvalAcuerdo[];
  autoData: EvalAutoData | null;
  firmada: boolean;
  firmadaNombre: string | null;
  firmadaEn: string | null;
}

const METRICAS: { key: string; label: string }[] = [
  { key: "puntualidad", label: "Puntualidad" },
  { key: "ordenLimpieza", label: "Orden y limpieza" },
  { key: "actitud", label: "Actitud" },
  { key: "comunicacion", label: "Comunicación" },
  { key: "resolucionProb", label: "Resolución de problemas" },
  { key: "propuestasMejora", label: "Propuestas de mejora" },
  { key: "calidadTrabajo", label: "Calidad del trabajo" },
  { key: "trabajoEquipo", label: "Trabajo en equipo" },
];

const CALIF_FINAL: Record<string, string> = {
  EXCEDE: "Excede expectativas",
  CUMPLE: "Cumple",
  EN_DESARROLLO: "En desarrollo",
  NO_CUMPLE: "No cumple",
};
const RESULTADO_OBJ: Record<string, string> = {
  PENDIENTE: "Pendiente", CUMPLIDO: "Cumplido", PARCIAL: "Parcial", NO_CUMPLIDO: "No cumplido",
};
const ESTADO_ACUERDO: Record<string, string> = {
  PENDIENTE: "Pendiente", CUMPLIDO: "Cumplido", PARCIAL: "Parcial", NO_CUMPLIDO: "No cumplido",
};

function scoreColor(s: number) {
  if (s >= 4) return "#16a34a";
  if (s >= 3) return "#d97706";
  if (s >= 2) return "#ea580c";
  if (s >= 1) return "#dc2626";
  return GRAY;
}
function scoreLabel(s: number) { return ["—", "Deficiente", "Regular", "Bueno", "Muy bueno", "Excelente"][s] ?? "—"; }

const s = StyleSheet.create({
  secTitle: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.6,
    backgroundColor: DARK, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  chipRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  chip: {
    fontSize: 6.5, fontFamily: "Helvetica-Bold", color: BLACK, backgroundColor: LIGHT,
    borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
  },
  metricRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 4,
    borderBottomWidth: 0.5, borderBottomColor: MID,
  },
  metricLabel: { fontSize: 8, color: BLACK, flex: 1 },
  dots: { flexDirection: "row", gap: 2, width: 96 },
  dot: { width: 15, height: 12, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  dotTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold" },
  metricTag: { width: 60, textAlign: "right", fontSize: 7 },
  itemBox: { marginBottom: 7, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: MID },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  itemTxt: { fontSize: 8, color: BLACK, flex: 1, lineHeight: 1.4 },
  itemSub: { fontSize: 7, color: GRAY, marginTop: 2 },
  itemNota: { fontSize: 7, color: GRAY, marginTop: 2, fontStyle: "italic" },
  badge: { fontSize: 6.5, fontFamily: "Helvetica-Bold", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  textBox: {
    backgroundColor: LIGHT, borderLeftWidth: 2, borderLeftColor: GOLD,
    padding: 8, borderRadius: 3, marginBottom: 8,
  },
  textBoxLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: GRAY, letterSpacing: 0.6, marginBottom: 3 },
  textBoxTxt: { fontSize: 8, color: BLACK, lineHeight: 1.5 },
  compareRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 3.5,
    borderBottomWidth: 0.5, borderBottomColor: MID,
  },
  compareLabel: { fontSize: 8, color: BLACK, flex: 1 },
  compareVal: { fontSize: 7.5, color: GRAY, width: 46, textAlign: "right" },
  firmaBox: {
    marginTop: 6, borderWidth: 0.8, borderColor: MID, borderRadius: 4, padding: 12,
    flexDirection: "row", justifyContent: "space-between",
  },
  firmaCol: { flex: 1, alignItems: "center" },
  firmaLinea: { borderTopWidth: 0.8, borderTopColor: "#888", width: "80%", marginTop: 26, paddingTop: 3 },
  firmaCargo: { fontSize: 6.5, color: GRAY, textAlign: "center" },
  firmaNombre: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "center" },
});

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <Text style={[s.badge, { color, backgroundColor: bg }]}>{label}</Text>;
}
function objBadge(estado: string) {
  const map: Record<string, { c: string; b: string }> = {
    CUMPLIDO: { c: "#16a34a", b: "#edf6f0" }, PARCIAL: { c: "#d97706", b: "#fffbeb" },
    NO_CUMPLIDO: { c: "#dc2626", b: "#fef2f2" }, PENDIENTE: { c: GRAY, b: LIGHT },
  };
  return map[estado] ?? map.PENDIENTE;
}

function MetricLine({ label, value, nota }: { label: string; value: number; nota?: string }) {
  return (
    <View wrap={false}>
      <View style={s.metricRow}>
        <Text style={s.metricLabel}>{label}</Text>
        <View style={s.dots}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= value && value > 0;
            return (
              <View key={n} style={[s.dot, { backgroundColor: on ? scoreColor(value) : "#ececec" }]}>
                <Text style={[s.dotTxt, { color: on ? WHITE : "#bbb" }]}>{n}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[s.metricTag, { color: value > 0 ? scoreColor(value) : GRAY }]}>{value > 0 ? scoreLabel(value) : "—"}</Text>
      </View>
      {nota ? <Text style={s.itemNota}>“{nota}”</Text> : null}
    </View>
  );
}

export function EvaluacionEmpleadoPDF({ data: d }: { data: EvaluacionEmpleadoPDFData }) {
  const completada = d.estado === "COMPLETADA";
  const califLabel = d.calificacionFinal ? CALIF_FINAL[d.calificacionFinal] ?? d.calificacionFinal : null;
  const hayTexto = d.aspectosPositivos || d.areasMejora || d.incidentesNota || d.observaciones;

  return (
    <ReporteLayout
      titulo="EVALUACIÓN DE DESEMPEÑO"
      subtitulo={d.periodo}
      footerLabel="Mainstage Pro — Evaluación de desempeño · Documento confidencial"
    >
      {/* KPIs de encabezado */}
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>COLABORADOR</Text>
          <Text style={[base.kpiValueDark, { fontSize: 11 }]}>{d.nombre}</Text>
          <Text style={base.kpiSubDark}>{d.puesto}{d.departamento ? ` · ${d.departamento}` : ""}</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>PUNTAJE TOTAL</Text>
          <Text style={[base.kpiValue, { color: d.puntajeTotal != null ? scoreColor(d.puntajeTotal) : BLACK }]}>
            {d.puntajeTotal != null ? d.puntajeTotal.toFixed(1) : "—"}
          </Text>
          <Text style={base.kpiSub}>de 5.0</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>CALIFICACIÓN</Text>
          <Text style={[base.kpiValue, { fontSize: 10 }]}>{califLabel ?? "—"}</Text>
          <Text style={base.kpiSub}>{completada ? "Completada" : "Borrador"}</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>FECHA</Text>
          <Text style={[base.kpiValue, { fontSize: 10 }]}>{fmtFechaLarga(d.fecha)}</Text>
          <Text style={base.kpiSub}>{d.evaluador ? `Eval.: ${d.evaluador}` : "—"}</Text>
        </View>
      </View>

      {/* Desglose de puntaje */}
      {d.puntajeTotal != null && (d.puntajeGeneral != null || d.puntajePuesto != null) && (
        <View style={[s.chipRow, { marginBottom: 14 }]}>
          {d.puntajeGeneral != null && <Text style={s.chip}>Competencias generales (40%): {d.puntajeGeneral.toFixed(1)}</Text>}
          {d.puntajePuesto != null && <Text style={s.chip}>Estándares del puesto (60%): {d.puntajePuesto.toFixed(1)}</Text>}
        </View>
      )}

      {/* Objetivos del período */}
      {d.objetivos.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.secTitle}>OBJETIVOS DEL PERÍODO</Text>
          {d.objetivos.map((o, i) => {
            const b = objBadge(o.resultado);
            return (
              <View key={i} style={s.itemBox} wrap={false}>
                <View style={s.itemHead}>
                  <Text style={s.itemTxt}>{o.texto}</Text>
                  <Badge label={RESULTADO_OBJ[o.resultado] ?? "Pendiente"} color={b.c} bg={b.b} />
                </View>
                {o.comentario ? <Text style={s.itemNota}>“{o.comentario}”</Text> : null}
                {(o.evidencias?.length ?? 0) > 0 ? <Text style={s.itemSub}>{o.evidencias!.length} prueba(s) adjunta(s)</Text> : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Estándares del puesto */}
      {d.criterios.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.secTitle}>ESTÁNDARES DEL PUESTO</Text>
          {d.criterios.map((c, i) => (
            <View key={i} style={s.itemBox} wrap={false}>
              {c.subarea ? <Text style={[s.itemSub, { textTransform: "uppercase", letterSpacing: 0.5 }]}>{c.subarea}</Text> : null}
              <MetricLine label={c.responsabilidad || c.estandar || "—"} value={c.puntaje} nota={c.nota} />
              {c.responsabilidad && c.estandar ? <Text style={s.itemSub}>{c.estandar}</Text> : null}
              {(c.evidencias?.length ?? 0) > 0 ? <Text style={s.itemSub}>{c.evidencias!.length} prueba(s) adjunta(s)</Text> : null}
            </View>
          ))}
        </View>
      )}

      {/* Competencias generales */}
      <View style={base.seccion}>
        <Text style={s.secTitle}>COMPETENCIAS GENERALES</Text>
        {METRICAS.map((m) => (
          <MetricLine key={m.key} label={m.label} value={d.metricas[m.key] ?? 0} nota={d.competenciaNotas[m.key]} />
        ))}
      </View>

      {/* Autoevaluación del colaborador (180°) */}
      {d.autoData && (
        <View style={base.seccion}>
          <Text style={s.secTitle}>AUTOEVALUACIÓN DEL COLABORADOR (180°)</Text>
          {METRICAS.filter((m) => (d.autoData!.metricas?.[m.key] ?? 0) > 0 || d.autoData!.comentarios?.[m.key]).map((m) => {
            const self = d.autoData!.metricas?.[m.key] ?? 0;
            const boss = d.metricas[m.key] ?? 0;
            const diff = self - boss;
            return (
              <View key={m.key} wrap={false}>
                <View style={s.compareRow}>
                  <Text style={s.compareLabel}>{m.label}</Text>
                  <Text style={[s.compareVal, { color: self > 0 ? scoreColor(self) : GRAY }]}>Él: {self || "—"}</Text>
                  <Text style={[s.compareVal, { color: boss > 0 ? scoreColor(boss) : GRAY }]}>Dir.: {boss || "—"}</Text>
                  <Text style={[s.compareVal, { width: 34, color: diff === 0 ? GRAY : diff > 0 ? "#ea580c" : "#2563eb" }]}>
                    {self > 0 && boss > 0 && diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : ""}
                  </Text>
                </View>
                {d.autoData!.comentarios?.[m.key] ? <Text style={s.itemNota}>“{d.autoData!.comentarios[m.key]}”</Text> : null}
              </View>
            );
          })}
          {d.autoData.logros ? (
            <View style={[s.textBox, { marginTop: 8 }]}>
              <Text style={s.textBoxLabel}>SUS LOGROS DEL PERÍODO</Text>
              <Text style={s.textBoxTxt}>{d.autoData.logros}</Text>
            </View>
          ) : null}
          {d.autoData.retos ? (
            <View style={s.textBox}>
              <Text style={s.textBoxLabel}>EN QUÉ QUIERE MEJORAR</Text>
              <Text style={s.textBoxTxt}>{d.autoData.retos}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Acuerdos y seguimiento */}
      {d.acuerdos.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.secTitle}>ACUERDOS Y SEGUIMIENTO</Text>
          {d.acuerdos.map((a, i) => {
            const b = objBadge(a.estado);
            return (
              <View key={i} style={s.itemBox} wrap={false}>
                <View style={s.itemHead}>
                  <Text style={s.itemTxt}>{a.texto}</Text>
                  <Badge label={ESTADO_ACUERDO[a.estado] ?? "Pendiente"} color={b.c} bg={b.b} />
                </View>
                {a.nota ? <Text style={s.itemSub}>{a.nota}</Text> : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Texto libre */}
      {hayTexto && (
        <View style={base.seccion}>
          <Text style={s.secTitle}>OBSERVACIONES</Text>
          {d.aspectosPositivos ? (
            <View style={[s.textBox, { borderLeftColor: "#16a34a" }]}>
              <Text style={[s.textBoxLabel, { color: "#16a34a" }]}>ASPECTOS POSITIVOS</Text>
              <Text style={s.textBoxTxt}>{d.aspectosPositivos}</Text>
            </View>
          ) : null}
          {d.areasMejora ? (
            <View style={[s.textBox, { borderLeftColor: "#ea580c" }]}>
              <Text style={[s.textBoxLabel, { color: "#ea580c" }]}>ÁREAS DE MEJORA</Text>
              <Text style={s.textBoxTxt}>{d.areasMejora}</Text>
            </View>
          ) : null}
          {d.incidentesNota ? (
            <View style={[s.textBox, { borderLeftColor: "#dc2626" }]}>
              <Text style={[s.textBoxLabel, { color: "#dc2626" }]}>INCIDENTES / NEGLIGENCIAS</Text>
              <Text style={s.textBoxTxt}>{d.incidentesNota}</Text>
            </View>
          ) : null}
          {d.observaciones ? (
            <View style={s.textBox}>
              <Text style={s.textBoxLabel}>OBSERVACIONES GENERALES</Text>
              <Text style={s.textBoxTxt}>{d.observaciones}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Firmas */}
      <View style={base.seccion} wrap={false}>
        <Text style={s.secTitle}>FIRMAS DE ENTERADO</Text>
        <View style={s.firmaBox}>
          <View style={s.firmaCol}>
            <View style={s.firmaLinea}>
              <Text style={s.firmaNombre}>{d.firmada ? (d.firmadaNombre ?? d.nombre) : d.nombre}</Text>
              <Text style={s.firmaCargo}>
                Colaborador{d.firmada && d.firmadaEn ? ` · Firmó ${fmtFechaLarga(d.firmadaEn)}` : " · Pendiente de firma"}
              </Text>
            </View>
          </View>
          <View style={s.firmaCol}>
            <View style={s.firmaLinea}>
              <Text style={s.firmaNombre}>{d.evaluador ?? "—"}</Text>
              <Text style={s.firmaCargo}>Evaluador · Dirección</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno y confidencial de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
