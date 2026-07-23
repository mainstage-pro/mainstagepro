import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha } from "@/components/pdf/ReporteBase";

export interface AgendaEventoData {
  id: string;
  numeroProyecto: string;
  nombre: string;
  cliente: string;
  estado: string;
  tipoEvento: string;
  fechaEvento: string;
  horaInicio: string | null;
  lugar: string | null;
  encargado: string | null;
}

export interface AgendaEventosPDFData {
  eventos: AgendaEventoData[];
  periodoLabel: string;
  totalEventos: number;
  confirmados: number;
  enPlaneacion: number;
}

function estadoStyle(e: string) {
  if (e === "CONFIRMADO") return { color: "#16a34a" };
  if (e === "EN_CURSO") return { color: "#2563eb" };
  if (e === "COMPLETADO") return { color: "#4a4a4a" };
  return { color: "#d97706" };
}
function estadoLabel(e: string) {
  const map: Record<string, string> = {
    PLANEACION: "Planeación", CONFIRMADO: "Confirmado", EN_CURSO: "En curso", COMPLETADO: "Completado",
  };
  return map[e] ?? e;
}

export function AgendaEventosPDF({ data }: { data: AgendaEventosPDFData }) {
  return (
    <ReporteLayout
      titulo="AGENDA DE EVENTOS"
      subtitulo={data.periodoLabel}
      footerLabel="Mainstage Pro — Agenda de producción"
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>EVENTOS</Text>
          <Text style={base.kpiValueDark}>{data.totalEventos}</Text>
          <Text style={base.kpiSubDark}>en el período</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>CONFIRMADOS</Text>
          <Text style={base.kpiValue}>{data.confirmados}</Text>
          <Text style={base.kpiSub}>listos</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>EN PLANEACIÓN</Text>
          <Text style={base.kpiValue}>{data.enPlaneacion}</Text>
          <Text style={base.kpiSub}>por confirmar</Text>
        </View>
      </View>

      <View style={base.table}>
        <View style={base.thead} fixed>
          <Text style={[base.th, { width: 58 }]}>FECHA</Text>
          <Text style={[base.th, { flex: 2.8 }]}>EVENTO / CLIENTE</Text>
          <Text style={[base.th, { flex: 1.8 }]}>LUGAR</Text>
          <Text style={[base.th, { flex: 1.2 }]}>ENCARGADO</Text>
          <Text style={[base.th, { width: 58 }]}>ESTADO</Text>
        </View>
        {data.eventos.map((ev, i) => (
          <View key={ev.id} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
            <View style={{ width: 58 }}>
              <Text style={base.td}>{fmtFecha(ev.fechaEvento)}</Text>
              {ev.horaInicio ? <Text style={base.tdSub}>{ev.horaInicio}</Text> : null}
            </View>
            <View style={{ flex: 2.8, paddingRight: 4 }}>
              <Text style={base.tdStrong}>{ev.nombre}</Text>
              <Text style={base.tdSub}>{ev.cliente} · {ev.numeroProyecto}</Text>
            </View>
            <Text style={[base.td, { flex: 1.8, paddingRight: 4 }]}>{ev.lugar ?? "—"}</Text>
            <Text style={[base.td, { flex: 1.2, paddingRight: 4 }]}>{ev.encargado ?? "—"}</Text>
            <Text style={[base.td, { width: 58 }, estadoStyle(ev.estado)]}>{estadoLabel(ev.estado)}</Text>
          </View>
        ))}
      </View>

      {data.eventos.length === 0 && (
        <Text style={base.vacio}>Sin eventos agendados para este período.</Text>
      )}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
