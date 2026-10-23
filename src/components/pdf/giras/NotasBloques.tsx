/**
 * NotasBloques.tsx — las piezas que comparten el PDF de notas de un show y el
 * de la gira completa: la tarjeta de un hallazgo (falla + solución aplicada +
 * propuesta de mejora, con su color de severidad) y el bloque de un tema (sus
 * hallazgos más el comentario abierto). Separado de los documentos que las
 * usan porque el de la gira repite el mismo bloque una vez por show y otra
 * vez por tema general.
 */
import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { C } from "../PdfShared";
import { g, Nota } from "./GiraDocBase";

export type SeveridadPdf = "MENOR" | "IMPORTANTE" | "CRITICA";

export interface HallazgoPdf {
  severidad: SeveridadPdf;
  falla: string;
  solucion: string;
  propuestaMejora: string;
}

export interface TemaPdf {
  id: string;
  titulo: string;
  hallazgos: HallazgoPdf[];
  comentarios: string | null;
}

const SEVERIDAD_LABEL: Record<SeveridadPdf, string> = {
  MENOR: "Menor",
  IMPORTANTE: "Importante",
  CRITICA: "Crítica",
};

const SEVERIDAD_COLOR: Record<SeveridadPdf, { borde: string; fondo: string; texto: string }> = {
  MENOR: { borde: C.grisLinea, fondo: C.grisFondo, texto: C.grisMedio },
  IMPORTANTE: { borde: C.amarillo, fondo: C.amarilloFondo, texto: C.amarillo },
  CRITICA: { borde: C.rojo, fondo: C.rojoFondo, texto: C.rojo },
};

const s = StyleSheet.create({
  temaTitulo: {
    fontSize: 10, fontFamily: "Helvetica-Bold", color: C.negro,
    marginBottom: 7,
  },
  card: {
    borderWidth: 0.75, borderColor: C.grisLinea, borderStyle: "solid",
    borderRadius: 3, marginBottom: 7,
  },
  cardHead: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5,
    borderBottomWidth: 0.75, borderBottomColor: C.grisLinea, borderBottomStyle: "solid",
  },
  chip: {
    fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 8, borderWidth: 0.75, borderStyle: "solid",
  },
  cardBody: { flexDirection: "row", paddingHorizontal: 9, paddingVertical: 8 },
  col: { flex: 1, paddingRight: 10 },
  colLabel: { fontSize: 7, color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2.5 },
  colTxt: { fontSize: 9.3, color: C.negro, lineHeight: 1.42 },
});

function HallazgoCard({ h }: { h: HallazgoPdf }) {
  const sev = SEVERIDAD_COLOR[h.severidad];
  return (
    <View style={s.card} wrap={false}>
      <View style={[s.cardHead, { backgroundColor: sev.fondo }]}>
        <Text style={[s.chip, { color: sev.texto, borderColor: sev.borde, backgroundColor: C.blanco }]}>
          {SEVERIDAD_LABEL[h.severidad]}
        </Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.col}>
          <Text style={s.colLabel}>Falla / situación</Text>
          <Text style={s.colTxt}>{h.falla || "—"}</Text>
        </View>
        <View style={s.col}>
          <Text style={s.colLabel}>Solución aplicada</Text>
          <Text style={s.colTxt}>{h.solucion || "—"}</Text>
        </View>
        <View style={[s.col, { paddingRight: 0 }]}>
          <Text style={s.colLabel}>Propuesta de mejora</Text>
          <Text style={s.colTxt}>{h.propuestaMejora || "—"}</Text>
        </View>
      </View>
    </View>
  );
}

export function TemaBloque({ tema }: { tema: TemaPdf }) {
  return (
    <View style={g.seccion}>
      <Text style={s.temaTitulo}>{tema.titulo}</Text>
      {tema.hallazgos.map((h, i) => (
        <HallazgoCard key={`${tema.id}-${i}`} h={h} />
      ))}
      <Nota label={tema.hallazgos.length > 0 ? "Comentarios" : null} texto={tema.comentarios} />
    </View>
  );
}
