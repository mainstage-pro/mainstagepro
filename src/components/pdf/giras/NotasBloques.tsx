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
import { DORADO_TXT, g, Nota } from "./GiraDocBase";

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

/// Un color por tema (id de `TEMAS_SHOW`/`TEMAS_GIRA` en gira-evaluacion.ts),
/// para que "Montaje" y "Soundcheck" se distingan de reojo igual que el
/// setlist distingue audio de luces: un filete de color, nunca en la severidad
/// (esa ya tiene su propia paleta rojo/ámbar/gris y mezclarlas confundiría las
/// dos escalas). Si aparece un id nuevo que no está aquí, cae a gris sin tronar.
const TEMA_COLOR: Record<string, string> = {
  // Por show
  coordinacionLogistica: "#4b5563",
  tiemposProduccion: "#0e7490",
  montaje: "#047857",
  soundcheck: "#1d4ed8",
  show: "#6d28d9",
  desmontaje: "#1f2937",
  // Por gira
  coordinacionGeneral: "#4b5563",
  logisticaTransporte: "#0e7490",
  produccionTecnica: "#1d4ed8",
  equipoPersonal: "#6d28d9",
  administracionFinanzas: "#1f2937",
};

function colorDeTema(id: string): string {
  return TEMA_COLOR[id] ?? C.grisMedio;
}

/// Cuenta de bulto de un juego de temas: cuántos hallazgos trajeron y, de
/// esos, cuántos de severidad crítica. La usan tanto el documento de un show
/// como el de toda la gira para no repetir la misma cuenta de dos formas.
export function resumenTemas(temas: TemaPdf[]): { temas: number; hallazgos: number; criticos: number } {
  const hallazgos = temas.flatMap((t) => t.hallazgos);
  const criticos = hallazgos.filter((h) => h.severidad === "CRITICA").length;
  return { temas: temas.length, hallazgos: hallazgos.length, criticos };
}

const s = StyleSheet.create({
  // Mismo motivo que el encabezado de bloque de una tabla (chip de color +
  // mayúsculas en negrita): un tema es, visualmente, el mismo tipo de cosa
  // que un bloque del setlist — un grupo con nombre, no un párrafo más.
  temaHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  temaChip: { width: 8, height: 8, borderRadius: 2, marginRight: 7 },
  temaTitulo: {
    fontSize: 11, fontFamily: "Helvetica-Bold", color: C.negro,
    textTransform: "uppercase", letterSpacing: 0.8,
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
  // Falla no lleva filete: ya la anuncia el chip de severidad arriba. Solución
  // y propuesta sí, el mismo lenguaje que las columnas de disciplina en el
  // setlist: el color vive en el filete, no en la letra.
  colSolucion: { flex: 1, paddingRight: 10, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: C.verde, borderLeftStyle: "solid" },
  colPropuesta: { flex: 1, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: C.dorado, borderLeftStyle: "solid" },
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
        <View style={s.colSolucion}>
          <Text style={[s.colLabel, { color: C.verde }]}>Solución aplicada</Text>
          <Text style={s.colTxt}>{h.solucion || "—"}</Text>
        </View>
        <View style={s.colPropuesta}>
          <Text style={[s.colLabel, { color: DORADO_TXT }]}>Propuesta de mejora</Text>
          <Text style={s.colTxt}>{h.propuestaMejora || "—"}</Text>
        </View>
      </View>
    </View>
  );
}

export function TemaBloque({ tema }: { tema: TemaPdf }) {
  const [primero, ...resto] = tema.hallazgos;
  // `minPresenceAhead` por sí solo no basta: alcanza para reservarle aire al
  // título, pero una tarjeta de hallazgo no se puede partir (`wrap={false}`)
  // y si no entra completa igual brinca de página, dejando el título solo
  // arriba. La única garantía real es amarrar el título a su primer
  // hallazgo — o a su comentario, si no trae ninguno — en un solo bloque
  // que salta de página entero o no salta.
  return (
    <View style={g.seccion}>
      <View wrap={false}>
        <View style={s.temaHead}>
          <View style={[s.temaChip, { backgroundColor: colorDeTema(tema.id) }]} />
          <Text style={s.temaTitulo}>{tema.titulo}</Text>
        </View>
        {primero ? <HallazgoCard h={primero} /> : <Nota texto={tema.comentarios} />}
      </View>
      {resto.map((h, i) => (
        <HallazgoCard key={`${tema.id}-${i + 1}`} h={h} />
      ))}
      {primero ? <Nota label="Comentarios" texto={tema.comentarios} /> : null}
    </View>
  );
}
