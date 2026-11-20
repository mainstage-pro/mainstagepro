import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { DISCIPLINA_COLORS_PRINT } from "@/lib/disciplinaColors";
import { etiquetaDisciplina } from "@/lib/orden-equipos";

/**
 * Encabezado de sección por disciplina (Audio, Iluminación, Video…) en las
 * listas de equipo de los PDFs. Línea de color + nombre: se distingue de los
 * encabezados de categoría sin agregar peso a la hoja.
 */
export function BandaDisciplina({ disciplina, primera = false }: { disciplina: string | null; primera?: boolean }) {
  const color = (disciplina && DISCIPLINA_COLORS_PRINT[disciplina]) || "#4b5563";
  return (
    <View
      wrap={false}
      minPresenceAhead={60}
      style={{
        flexDirection: "row", alignItems: "center",
        marginTop: primera ? 2 : 10, marginBottom: 5,
        paddingBottom: 3, borderBottomWidth: 1.5, borderBottomColor: color, borderBottomStyle: "solid",
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 5 }} />
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color, textTransform: "uppercase", letterSpacing: 1.2 }}>
        {etiquetaDisciplina(disciplina)}
      </Text>
    </View>
  );
}

const JORNADA_LABEL: Record<string, string> = {
  MONTAJE: "Montaje", OPERACION: "Operación técnica", DESMONTAJE: "Desmontaje",
  TRANSPORTE: "Transporte", OTRO: "Otro",
};

/**
 * Separadores de la lista de personal: la jornada (montaje, operación,
 * desmontaje) al abrirla y, debajo, cada disciplina con su color.
 */
export function SeparadorPersonal({ participacion, disciplina, abreJornada, n }: {
  participacion: string; disciplina: string | null; abreJornada: boolean; n: number;
}) {
  const color = (disciplina && DISCIPLINA_COLORS_PRINT[disciplina]) || "#4b5563";
  return (
    <View wrap={false} minPresenceAhead={24}>
      {abreJornada && (
        <View style={{ backgroundColor: "#e9e9e9", paddingVertical: 3, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#8a6d2f", textTransform: "uppercase", letterSpacing: 1 }}>
            {JORNADA_LABEL[participacion] ?? participacion}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 2.5, paddingHorizontal: 6, paddingLeft: 10, backgroundColor: "#f6f6f6" }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, marginRight: 4 }} />
        <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color, textTransform: "uppercase", letterSpacing: 0.8 }}>
          {disciplina ? etiquetaDisciplina(disciplina) : "Sin disciplina"} · {n}
        </Text>
      </View>
    </View>
  );
}
