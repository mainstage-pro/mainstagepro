import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFechaLarga, GOLD, BLACK, GRAY, LIGHT, MID, WHITE } from "@/components/pdf/ReporteBase";
import {
  porDia,
  renglonesDeItinerario,
  mapaColoresEventos,
  type ItinerarioEvento,
  type ItinerarioRenglon,
} from "@/lib/itinerario-operaciones";
import { fmt24to12 } from "@/lib/hora";

function fechaLargaDia(fecha: string) {
  return fmtFechaLarga(`${fecha}T12:00:00.000Z`);
}

function horaDisplay(r: ItinerarioRenglon): string {
  if (!r.hora) return "Por definir";
  const ini = fmt24to12(r.hora) || r.hora;
  if (!r.horaFin) return ini;
  const fin = fmt24to12(r.horaFin) || r.horaFin;
  return `${ini} – ${fin}`;
}

const styles = StyleSheet.create({
  diaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: LIGHT,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 7,
  },
  diaTitulo: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.6 },
  diaCount: { fontSize: 7, color: GRAY },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6, paddingHorizontal: 2 },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  leyendaDot: { width: 6, height: 6, borderRadius: 3 },
  leyendaTexto: { fontSize: 6.5, color: GRAY },
  table: { borderRadius: 4, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: MID, paddingHorizontal: 10, paddingVertical: 5 },
  th: { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: "#666666", letterSpacing: 0.5 },
  eventoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderLeftWidth: 3,
  },
  eventoNombre: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },
  eventoMeta: { fontSize: 6.3, color: "#6b6b6b" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: WHITE,
  },
  td: { fontSize: 7.3, color: GRAY },
  tdStrong: { fontSize: 7.3, fontFamily: "Helvetica-Bold", color: BLACK },
  tdSub: { fontSize: 6, color: "#888888" },
  pendiente: { fontStyle: "italic", color: "#aaaaaa" },
});

export interface ItinerarioPDFData {
  eventos: ItinerarioEvento[];
  inicio: string;
  fin: string;
}

export function ItinerarioOperacionesPDF({ data }: { data: ItinerarioPDFData }) {
  const colores = mapaColoresEventos(data.eventos);
  const dias = porDia(renglonesDeItinerario(data.eventos));

  return (
    <ReporteLayout
      titulo="ITINERARIO DE OPERACIONES"
      subtitulo={`${fechaLargaDia(data.inicio)} — ${fechaLargaDia(data.fin)}`}
      footerLabel="Mainstage Pro — Itinerario de operaciones"
    >
      {dias.map((d) => {
        let proyectoAnterior: string | null = null;
        return (
          <View key={d.fecha} style={base.seccion}>
            <View style={styles.diaHeader}>
              <Text style={styles.diaTitulo}>{fechaLargaDia(d.fecha).toUpperCase()}</Text>
              <Text style={styles.diaCount}>
                {d.grupos.length} evento{d.grupos.length === 1 ? "" : "s"}
              </Text>
            </View>

            <View style={styles.leyenda}>
              {d.grupos.map((g) => (
                <View key={g.proyectoId} style={styles.leyendaItem}>
                  <View style={[styles.leyendaDot, { backgroundColor: colores[g.proyectoId].accent }]} />
                  <Text style={styles.leyendaTexto}>
                    {g.nombre} · {g.clienteNombre}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.table}>
              <View style={styles.thead} fixed>
                <Text style={[styles.th, { width: 78 }]}>HORA</Text>
                <Text style={[styles.th, { flex: 1.6 }]}>ACTIVIDAD</Text>
                <Text style={[styles.th, { flex: 1 }]}>RESPONSABLE</Text>
                <Text style={[styles.th, { flex: 1.9 }]}>NOTAS</Text>
              </View>
              {d.renglones.map((r, i) => {
                const mismoProyecto = proyectoAnterior === r.proyectoId;
                proyectoAnterior = r.proyectoId;
                const color = colores[r.proyectoId];
                return (
                  <React.Fragment key={`${r.proyectoId}-${r.etiqueta}-${i}`}>
                    {!mismoProyecto && (
                      <View
                        style={[
                          styles.eventoHeader,
                          { backgroundColor: color.bg, borderLeftColor: color.accent },
                        ]}
                        wrap={false}
                      >
                        <Text style={styles.eventoNombre}>{r.nombre}</Text>
                        <Text style={styles.eventoMeta}>
                          {r.clienteNombre} · {r.numeroProyecto}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[styles.row, { backgroundColor: color.bg, borderLeftColor: color.accent }]}
                      wrap={false}
                    >
                      <Text style={[styles.td, { width: 78 }, ...(r.pendiente ? [styles.pendiente] : [])]}>
                        {horaDisplay(r)}
                      </Text>
                      <View style={{ flex: 1.6, paddingRight: 4 }}>
                        <Text style={styles.tdStrong}>{r.etiqueta}</Text>
                        {r.diaLabel ? <Text style={styles.tdSub}>{r.diaLabel}</Text> : null}
                      </View>
                      <Text style={[styles.td, { flex: 1 }]}>{r.responsable ?? "—"}</Text>
                      <Text style={[styles.td, { flex: 1.9 }]}>{r.notasOperativas || r.nota || "—"}</Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        );
      })}

      {dias.length === 0 && <Text style={base.vacio}>Sin operaciones agendadas en este período.</Text>}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
