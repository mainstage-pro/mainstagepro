/**
 * CronologiaEvento.tsx — Bloques de cronología/logística compartidos por todos los PDFs.
 * Renderiza los bloques que produce construirCronologia() con un estilo neutro (dorado/gris)
 * que se ve bien sobre fondo blanco en cualquier documento. Cada documento añade su propio
 * encabezado de sección antes de este componente.
 */
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { C } from "./PdfShared";
import type { BloqueCronologia } from "@/lib/cronologia-evento";

const s = StyleSheet.create({
  bloque: {
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: C.grisLinea,
    borderStyle: "solid",
    borderRadius: 3,
  },
  bloqueHd: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.grisFondo,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisLinea,
    borderBottomStyle: "solid",
  },
  bloqueTitulo: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.negro,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bloqueFecha: { fontSize: 7, color: C.grisMedio, textTransform: "capitalize" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
  },
  rowLast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  hora: { width: 54, fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.dorado },
  label: { flex: 1, fontSize: 8, color: C.negro },
  nota: { fontSize: 7, color: C.grisMedio, maxWidth: 170, textAlign: "right" },
});

export function CronologiaEvento({ bloques }: { bloques: BloqueCronologia[] }) {
  if (!bloques.length) return null;
  return (
    <View>
      {bloques.map((b, bi) => (
        <View key={bi} style={s.bloque} wrap={false}>
          <View style={s.bloqueHd}>
            <Text style={s.bloqueTitulo}>{b.titulo}</Text>
            {b.subtitulo ? <Text style={s.bloqueFecha}>{b.subtitulo}</Text> : null}
          </View>
          {b.items.map((it, ii) => (
            <View key={ii} style={ii < b.items.length - 1 ? s.row : s.rowLast}>
              <Text style={s.hora}>{it.hora}</Text>
              <Text style={s.label}>{it.label}</Text>
              {it.nota ? <Text style={s.nota}>{it.nota}</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
