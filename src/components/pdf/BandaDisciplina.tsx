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
