import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, GRAY } from "@/components/pdf/ReporteBase";

export interface AsistenciaEmpleadoData {
  personalId: string;
  nombre: string;
  puesto: string | null;
  presente: number;
  falta: number;
  retardo: number;
  permiso: number;
  vacaciones: number;
  incapacidad: number;
  minutosRetardo: number;
  totalDias: number;
}

export interface AsistenciaPDFData {
  empleados: AsistenciaEmpleadoData[];
  periodoLabel: string;
  totalRegistros: number;
  totalPresentes: number;
  totalFaltas: number;
  totalRetardos: number;
}

export function AsistenciaPDF({ data }: { data: AsistenciaPDFData }) {
  return (
    <ReporteLayout
      titulo="REPORTE DE ASISTENCIA"
      subtitulo={data.periodoLabel}
      footerLabel="Mainstage Pro — Asistencia de personal"
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>REGISTROS</Text>
          <Text style={base.kpiValueDark}>{data.totalRegistros}</Text>
          <Text style={base.kpiSubDark}>días registrados</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>PRESENTES</Text>
          <Text style={base.kpiValue}>{data.totalPresentes}</Text>
          <Text style={base.kpiSub}>asistencias</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>FALTAS</Text>
          <Text style={base.kpiValue}>{data.totalFaltas}</Text>
          <Text style={base.kpiSub}>ausencias</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>RETARDOS</Text>
          <Text style={base.kpiValue}>{data.totalRetardos}</Text>
          <Text style={base.kpiSub}>llegadas tarde</Text>
        </View>
      </View>

      <View style={base.table}>
        <View style={base.thead} fixed>
          <Text style={[base.th, { flex: 3 }]}>EMPLEADO</Text>
          <Text style={[base.th, { width: 42, textAlign: "center" }]}>ASIST.</Text>
          <Text style={[base.th, { width: 42, textAlign: "center" }]}>FALTAS</Text>
          <Text style={[base.th, { width: 42, textAlign: "center" }]}>RETAR.</Text>
          <Text style={[base.th, { width: 42, textAlign: "center" }]}>PERM.</Text>
          <Text style={[base.th, { width: 42, textAlign: "center" }]}>VAC.</Text>
          <Text style={[base.th, { width: 42, textAlign: "center" }]}>INCAP.</Text>
          <Text style={[base.th, { width: 46, textAlign: "right" }]}>MIN. TARDE</Text>
        </View>
        {data.empleados.map((e, i) => (
          <View key={e.personalId} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
            <View style={{ flex: 3, paddingRight: 4 }}>
              <Text style={base.tdStrong}>{e.nombre}</Text>
              {e.puesto ? <Text style={base.tdSub}>{e.puesto}</Text> : null}
            </View>
            <Text style={[base.td, { width: 42, textAlign: "center", color: "#16a34a" }]}>{e.presente}</Text>
            <Text style={[base.td, { width: 42, textAlign: "center", color: e.falta > 0 ? "#dc2626" : GRAY }]}>{e.falta}</Text>
            <Text style={[base.td, { width: 42, textAlign: "center", color: e.retardo > 0 ? "#d97706" : GRAY }]}>{e.retardo}</Text>
            <Text style={[base.td, { width: 42, textAlign: "center" }]}>{e.permiso}</Text>
            <Text style={[base.td, { width: 42, textAlign: "center" }]}>{e.vacaciones}</Text>
            <Text style={[base.td, { width: 42, textAlign: "center" }]}>{e.incapacidad}</Text>
            <Text style={[base.td, { width: 46, textAlign: "right" }]}>{e.minutosRetardo || "—"}</Text>
          </View>
        ))}
      </View>

      {data.empleados.length === 0 && (
        <Text style={base.vacio}>Sin registros de asistencia para este período.</Text>
      )}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
