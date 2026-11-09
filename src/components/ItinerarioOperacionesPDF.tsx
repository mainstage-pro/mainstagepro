import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFechaLarga } from "@/components/pdf/ReporteBase";
import { porDia, renglonesDeItinerario, type ItinerarioEvento } from "@/lib/itinerario-operaciones";

const TIPO_LABEL: Record<string, string> = { MONTAJE: "Montaje", EVENTO: "Evento", DESMONTAJE: "Desmontaje" };
const TIPO_COLOR: Record<string, string> = { MONTAJE: "#2563eb", EVENTO: "#B3985B", DESMONTAJE: "#7c3aed" };

function fechaLargaDia(fecha: string) {
  return fmtFechaLarga(`${fecha}T12:00:00.000Z`);
}

export interface ItinerarioPDFData {
  eventos: ItinerarioEvento[];
  inicio: string;
  fin: string;
}

export function ItinerarioOperacionesPDF({ data }: { data: ItinerarioPDFData }) {
  const dias = porDia(renglonesDeItinerario(data.eventos));

  return (
    <ReporteLayout
      titulo="ITINERARIO DE OPERACIONES"
      subtitulo={`${fechaLargaDia(data.inicio)} — ${fechaLargaDia(data.fin)}`}
      footerLabel="Mainstage Pro — Itinerario de operaciones"
    >
      {dias.map((d) => (
        <View key={d.fecha} style={base.seccion}>
          <View style={base.seccionHeader}>
            <Text style={base.seccionNombre}>{fechaLargaDia(d.fecha).toUpperCase()}</Text>
            <Text style={base.seccionCount}>
              {d.renglones.length} jornada{d.renglones.length === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={base.table}>
            <View style={base.thead} fixed>
              <Text style={[base.th, { width: 58 }]}>TIPO</Text>
              <Text style={[base.th, { flex: 2.6 }]}>EVENTO / CLIENTE</Text>
              <Text style={[base.th, { width: 82 }]}>HORARIO</Text>
              <Text style={[base.th, { flex: 1.2 }]}>RESPONSABLE</Text>
              <Text style={[base.th, { flex: 1.6 }]}>NOTAS</Text>
            </View>
            {d.renglones.map((r, i) => (
              <View
                key={`${r.proyectoId}-${r.tipo}-${i}`}
                style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt}
                wrap={false}
              >
                <Text style={[base.td, { width: 58, color: TIPO_COLOR[r.tipo] }]}>{TIPO_LABEL[r.tipo]}</Text>
                <View style={{ flex: 2.6, paddingRight: 4 }}>
                  <Text style={base.tdStrong}>
                    {r.nombre}
                    {r.diaLabel ? ` (${r.diaLabel})` : ""}
                  </Text>
                  <Text style={base.tdSub}>
                    {r.clienteNombre} · {r.numeroProyecto}
                  </Text>
                </View>
                <Text style={[base.td, { width: 82 }]}>
                  {r.horaInicio ?? "—"}
                  {r.horaFin ? ` – ${r.horaFin}` : ""}
                </Text>
                <Text style={[base.td, { flex: 1.2, paddingRight: 4 }]}>{r.responsable ?? "—"}</Text>
                <Text style={[base.td, { flex: 1.6 }]}>{r.notasOperativas || r.nota || "—"}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {dias.length === 0 && <Text style={base.vacio}>Sin operaciones agendadas en este período.</Text>}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
