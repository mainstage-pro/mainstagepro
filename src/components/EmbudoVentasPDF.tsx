import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, fmtMoney } from "@/components/pdf/ReporteBase";

export interface EmbudoTratoData {
  id: string;
  nombreEvento: string;
  cliente: string;
  responsable: string | null;
  presupuesto: number | null;
  fechaEvento: string | null;
  proximaAccion: string | null;
}

export interface EmbudoEtapaData {
  etapa: string;
  label: string;
  count: number;
  valor: number;
  tratos: EmbudoTratoData[];
}

export interface EmbudoVentasPDFData {
  etapas: EmbudoEtapaData[];
  totalActivos: number;
  valorPipeline: number;
  generadoEn: string;
}

export function EmbudoVentasPDF({ data }: { data: EmbudoVentasPDFData }) {
  return (
    <ReporteLayout
      titulo="REPORTE DE EMBUDO DE VENTAS"
      subtitulo={`Generado ${fmtFecha(data.generadoEn)}`}
      footerLabel="Mainstage Pro — Embudo de ventas"
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>PIPELINE ACTIVO</Text>
          <Text style={base.kpiValueDark}>{fmtMoney(data.valorPipeline)}</Text>
          <Text style={base.kpiSubDark}>valor estimado</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>TRATOS ACTIVOS</Text>
          <Text style={base.kpiValue}>{data.totalActivos}</Text>
          <Text style={base.kpiSub}>en el embudo</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>ETAPAS</Text>
          <Text style={base.kpiValue}>{data.etapas.filter(e => e.count > 0).length}</Text>
          <Text style={base.kpiSub}>con actividad</Text>
        </View>
      </View>

      {data.etapas.map(et => (
        <View key={et.etapa} style={base.seccion}>
          <View style={base.seccionHeader} wrap={false}>
            <Text style={base.seccionNombre}>{et.label.toUpperCase()}</Text>
            <Text style={base.seccionCount}>{et.count} trato{et.count !== 1 ? "s" : ""} · {fmtMoney(et.valor)}</Text>
          </View>
          {et.tratos.length > 0 ? (
            <View style={base.table}>
              <View style={base.thead} fixed>
                <Text style={[base.th, { flex: 2.6 }]}>EVENTO / CLIENTE</Text>
                <Text style={[base.th, { flex: 1.6 }]}>RESPONSABLE</Text>
                <Text style={[base.th, { width: 56 }]}>EVENTO</Text>
                <Text style={[base.th, { width: 70, textAlign: "right" }]}>PRESUP.</Text>
              </View>
              {et.tratos.map((t, i) => (
                <View key={t.id} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
                  <View style={{ flex: 2.6, paddingRight: 4 }}>
                    <Text style={base.tdStrong}>{t.nombreEvento}</Text>
                    <Text style={base.tdSub}>{t.cliente}</Text>
                  </View>
                  <Text style={[base.td, { flex: 1.6, paddingRight: 4 }]}>{t.responsable ?? "—"}</Text>
                  <Text style={[base.td, { width: 56 }]}>{fmtFecha(t.fechaEvento)}</Text>
                  <Text style={[base.tdStrong, { width: 70, textAlign: "right" }]}>{t.presupuesto ? fmtMoney(t.presupuesto) : "—"}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[base.vacio, { paddingVertical: 6 }]}>Sin tratos en esta etapa.</Text>
          )}
        </View>
      ))}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
