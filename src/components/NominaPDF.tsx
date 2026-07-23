import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, fmtMoney } from "@/components/pdf/ReporteBase";

export interface NominaPagoData {
  id: string;
  nombre: string;
  puesto: string | null;
  concepto: string;
  periodo: string;
  monto: number;
  fechaPago: string | null;
  metodoPago: string | null;
  cuenta: string | null;
}

export interface NominaSeccionData {
  nombre: string;
  pagos: NominaPagoData[];
  total: number;
}

export interface NominaPDFData {
  secciones: NominaSeccionData[];
  totalPendiente: number;
  totalPagado: number;
  totalRegistros: number;
  generadoEn: string;
}

export function NominaPDF({ data }: { data: NominaPDFData }) {
  return (
    <ReporteLayout
      titulo="REPORTE DE NÓMINA"
      subtitulo={`Generado ${fmtFecha(data.generadoEn)}`}
      footerLabel="Mainstage Pro — Nómina de personal"
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>PENDIENTE</Text>
          <Text style={base.kpiValueDark}>{fmtMoney(data.totalPendiente)}</Text>
          <Text style={base.kpiSubDark}>por pagar</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>PAGADO</Text>
          <Text style={base.kpiValue}>{fmtMoney(data.totalPagado)}</Text>
          <Text style={base.kpiSub}>historial reciente</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>REGISTROS</Text>
          <Text style={base.kpiValue}>{data.totalRegistros}</Text>
          <Text style={base.kpiSub}>pagos de nómina</Text>
        </View>
      </View>

      {data.secciones.map(sec => (
        <View key={sec.nombre} style={base.seccion}>
          <View style={base.seccionHeader} wrap={false}>
            <Text style={base.seccionNombre}>{sec.nombre.toUpperCase()}</Text>
            <Text style={base.seccionCount}>{fmtMoney(sec.total)}</Text>
          </View>
          <View style={base.table}>
            <View style={base.thead} fixed>
              <Text style={[base.th, { flex: 2.6 }]}>EMPLEADO</Text>
              <Text style={[base.th, { flex: 2.4 }]}>CONCEPTO</Text>
              <Text style={[base.th, { width: 60 }]}>MÉTODO</Text>
              <Text style={[base.th, { width: 56 }]}>FECHA</Text>
              <Text style={[base.th, { width: 62, textAlign: "right" }]}>MONTO</Text>
            </View>
            {sec.pagos.map((p, i) => (
              <View key={p.id} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
                <View style={{ flex: 2.6, paddingRight: 4 }}>
                  <Text style={base.tdStrong}>{p.nombre}</Text>
                  {p.puesto ? <Text style={base.tdSub}>{p.puesto}</Text> : null}
                </View>
                <View style={{ flex: 2.4, paddingRight: 4 }}>
                  <Text style={base.td}>{p.concepto}</Text>
                  <Text style={base.tdSub}>{p.periodo}</Text>
                </View>
                <Text style={[base.td, { width: 60, paddingRight: 4 }]}>{p.metodoPago ?? "—"}</Text>
                <Text style={[base.td, { width: 56 }]}>{fmtFecha(p.fechaPago)}</Text>
                <Text style={[base.tdStrong, { width: 62, textAlign: "right" }]}>{fmtMoney(p.monto)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {data.secciones.length === 0 && (
        <Text style={base.vacio}>Sin registros de nómina.</Text>
      )}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
