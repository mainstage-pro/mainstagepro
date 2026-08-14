import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, GOLD, BLACK, LIGHT } from "@/components/pdf/ReporteBase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ModuloPDFData {
  numero: number;
  titulo: string;
  area: string;
  subArea?: string | null;
  descripcion: string;
  publicoObjetivo?: string | null;
  prerrequisitos?: string[];
  objetivos: string[];
  puntos: string[];
  procedimiento?: string[];
  erroresComunes?: string[];
  checklistAplicacion?: string[];
  recursos?: string[];
  notas: string | null;
  duracion: number;
  impartidor: string;
  generadoEn: string;
}

export interface PreguntaPDF {
  pregunta: string;
  opciones: string[];
  correcta: number;
}

export interface EvaluacionPDFData {
  numero: number;
  titulo: string;
  area: string;
  minAprobar: number;
  preguntas: PreguntaPDF[];
  generadoEn: string;
}

// ─── Estilos propios ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  h2: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.5, marginBottom: 6 },
  para: { fontSize: 9, color: "#333333", lineHeight: 1.5, marginBottom: 4 },
  li: { flexDirection: "row", marginBottom: 5 },
  liBullet: { fontSize: 9, color: GOLD, width: 14 },
  liNum: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GOLD, width: 20 },
  liText: { fontSize: 9, color: "#222222", flex: 1, lineHeight: 1.45 },
  notaBox: { backgroundColor: LIGHT, borderLeftWidth: 3, borderLeftColor: GOLD, padding: 10, borderRadius: 3 },
  qBlock: { marginBottom: 12 },
  qText: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 4 },
  opt: { fontSize: 9, color: "#333333", marginBottom: 2, marginLeft: 12 },
  ansRow: { flexDirection: "row", flexWrap: "wrap" },
  ansChip: { fontSize: 9, color: BLACK, width: "20%", marginBottom: 4 },
  meta: { fontSize: 7.5, color: "#777777", marginTop: 2 },
});

function letra(i: number) {
  return String.fromCharCode(65 + i);
}

// ─── Módulo (ficha completa del tema) ─────────────────────────────────────────
export function CapacitacionModuloPDF({ data }: { data: ModuloPDFData }) {
  return (
    <ReporteLayout
      titulo="MÓDULO DE CAPACITACIÓN"
      subtitulo={`${data.area} · Generado ${fmtFecha(data.generadoEn)}`}
      footerLabel="Mainstage Pro — Capacitación interna"
    >
      <View style={base.seccion}>
        <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK }}>
          {String(data.numero).padStart(2, "0")}. {data.titulo}
        </Text>
        <Text style={s.meta}>
          {data.area}{data.subArea ? ` › ${data.subArea}` : ""} · {data.duracion} min · Impartidor: {data.impartidor}
        </Text>
      </View>

      {data.descripcion ? (
        <View style={base.seccion}>
          <Text style={s.h2}>DESCRIPCIÓN</Text>
          <Text style={s.para}>{data.descripcion}</Text>
        </View>
      ) : null}

      {data.publicoObjetivo?.trim() ? (
        <View style={base.seccion}>
          <Text style={s.h2}>PÚBLICO OBJETIVO</Text>
          <Text style={s.para}>{data.publicoObjetivo}</Text>
        </View>
      ) : null}

      {data.prerrequisitos && data.prerrequisitos.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>PRERREQUISITOS</Text>
          {data.prerrequisitos.map((p, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liBullet}>◆</Text>
              <Text style={s.liText}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {data.objetivos.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>OBJETIVOS DE APRENDIZAJE</Text>
          {data.objetivos.map((o, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liBullet}>◆</Text>
              <Text style={s.liText}>{o}</Text>
            </View>
          ))}
        </View>
      )}

      {data.puntos.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>DESARROLLO DEL TEMA</Text>
          {data.puntos.map((p, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liNum}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.liText}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {data.procedimiento && data.procedimiento.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>PROCEDIMIENTO PASO A PASO</Text>
          {data.procedimiento.map((p, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liNum}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.liText}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {data.erroresComunes && data.erroresComunes.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>ERRORES COMUNES</Text>
          {data.erroresComunes.map((p, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liBullet}>✕</Text>
              <Text style={s.liText}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {data.checklistAplicacion && data.checklistAplicacion.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>CHECKLIST DE APLICACIÓN</Text>
          {data.checklistAplicacion.map((p, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liBullet}>☐</Text>
              <Text style={s.liText}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {data.recursos && data.recursos.length > 0 && (
        <View style={base.seccion}>
          <Text style={s.h2}>RECURSOS Y ENLACES</Text>
          {data.recursos.map((p, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liBullet}>→</Text>
              <Text style={s.liText}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {data.notas?.trim() ? (
        <View style={base.seccion}>
          <Text style={s.h2}>NOTAS DEL INSTRUCTOR</Text>
          <View style={s.notaBox}>
            <Text style={s.para}>{data.notas}</Text>
          </View>
        </View>
      ) : null}
    </ReporteLayout>
  );
}

// ─── Evaluación (examen + hoja de respuestas) ─────────────────────────────────
export function EvaluacionCapacitacionPDF({ data }: { data: EvaluacionPDFData }) {
  return (
    <ReporteLayout
      titulo="EVALUACIÓN"
      subtitulo={`${data.titulo} · Mínimo para aprobar ${data.minAprobar}%`}
      footerLabel="Mainstage Pro — Evaluación de capacitación"
    >
      <View style={base.seccion}>
        <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK }}>
          Examen — {String(data.numero).padStart(2, "0")}. {data.titulo}
        </Text>
        <Text style={s.meta}>
          {data.preguntas.length} preguntas · Mínimo para aprobar: {data.minAprobar}% · Nombre: ______________________
        </Text>
      </View>

      {data.preguntas.map((q, i) => (
        <View key={i} style={s.qBlock} wrap={false}>
          <Text style={s.qText}>
            {i + 1}. {q.pregunta}
          </Text>
          {q.opciones.map((o, j) => (
            <Text key={j} style={s.opt}>
              {letra(j)}) {o}
            </Text>
          ))}
        </View>
      ))}

      <View style={base.divider} />

      <View style={base.seccion} break>
        <Text style={s.h2}>HOJA DE RESPUESTAS (uso del instructor)</Text>
        <View style={s.ansRow}>
          {data.preguntas.map((q, i) => (
            <Text key={i} style={s.ansChip}>
              {i + 1}. {letra(q.correcta)}
            </Text>
          ))}
        </View>
      </View>
    </ReporteLayout>
  );
}
