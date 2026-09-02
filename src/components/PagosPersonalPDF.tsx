import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, fmtMoney } from "@/components/pdf/ReporteBase";

export interface PagosPersonalPDFData {
  ciclo: string;
  desde: string;
  hasta: string;
  totalPresupuestado: number;
  totalAsignado: number;
  totalPendiente: number;
  totalPagado: number;
  proyectos: {
    id: string;
    nombre: string;
    cliente: string;
    fechaEvento: string;
    presupuestoOp: number;
    personal: {
      tecnicoNombre: string | null;
      rolNombre: string | null;
      jornada: string | null;
      tarifaAcordada: number | null;
      estadoPago: string;
    }[];
  }[];
  nomina: {
    tecnicoNombre: string;
    pagos: {
      proyectoNombre: string;
      monto: number;
      estadoPago: string;
    }[];
    total: number;
    todosPagados: boolean;
  }[];
}

export function PagosPersonalPDF({ data }: { data: PagosPersonalPDFData }) {
  return (
    <ReporteLayout
      titulo="REPORTE DE PAGOS A PERSONAL"
      subtitulo={`Ciclo: ${fmtFecha(data.desde)} al ${fmtFecha(data.hasta)}`}
      footerLabel={`Mainstage Pro — Pagos a Personal · Ciclo: ${data.ciclo}`}
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>PENDIENTE DE PAGO</Text>
          <Text style={base.kpiValueDark}>{fmtMoney(data.totalPendiente)}</Text>
          <Text style={base.kpiSubDark}>Nómina pendiente</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>PAGADO</Text>
          <Text style={base.kpiValue}>{fmtMoney(data.totalPagado)}</Text>
          <Text style={base.kpiSub}>Nómina pagada</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>TOTAL ASIGNADO</Text>
          <Text style={base.kpiValue}>{fmtMoney(data.totalAsignado)}</Text>
          <Text style={base.kpiSub}>Costo real</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>PRESUPUESTADO</Text>
          <Text style={base.kpiValue}>{fmtMoney(data.totalPresupuestado)}</Text>
          <Text style={base.kpiSub}>Cotizado</Text>
        </View>
      </View>

      <View style={base.seccion}>
        <View style={base.seccionHeader} wrap={false}>
          <Text style={base.seccionNombre}>NÓMINA DE LA SEMANA</Text>
          <Text style={base.seccionCount}>{data.nomina.length} técnicos</Text>
        </View>
        <View style={base.table}>
          <View style={base.thead} fixed>
            <Text style={[base.th, { flex: 2 }]}>TÉCNICO</Text>
            <Text style={[base.th, { flex: 3 }]}>PROYECTOS</Text>
            <Text style={[base.th, { width: 60, textAlign: "right" }]}>TOTAL</Text>
            <Text style={[base.th, { width: 60, textAlign: "right" }]}>ESTADO</Text>
          </View>
          {data.nomina.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
              <View style={{ flex: 2, paddingRight: 4 }}>
                <Text style={base.tdStrong}>{row.tecnicoNombre}</Text>
              </View>
              <View style={{ flex: 3, paddingRight: 4 }}>
                {row.pagos.map((p, j) => (
                  <View key={j} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={base.tdSub}>{p.proyectoNombre}</Text>
                    <Text style={base.tdSub}>{fmtMoney(p.monto)}</Text>
                  </View>
                ))}
              </View>
              <Text style={[base.tdStrong, { width: 60, textAlign: "right" }]}>{fmtMoney(row.total)}</Text>
              <Text style={[base.td, { width: 60, textAlign: "right", color: row.todosPagados ? "green" : "#B3985B" }]}>
                {row.todosPagados ? "Pagado" : "Pendiente"}
              </Text>
            </View>
          ))}
        </View>
        {data.nomina.length === 0 && (
          <Text style={base.vacio}>Sin técnicos asignados en este ciclo.</Text>
        )}
      </View>

      <View style={base.seccion}>
        <View style={base.seccionHeader} wrap={false}>
          <Text style={base.seccionNombre}>DESGLOSE POR PROYECTO</Text>
          <Text style={base.seccionCount}>{data.proyectos.length} proyectos</Text>
        </View>
        {data.proyectos.map((p, i) => {
          const totalPersonal = p.personal.reduce((s, pp) => s + (pp.tarifaAcordada ?? 0), 0);
          return (
            <View key={i} style={{ marginBottom: 12 }} wrap={false}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F7F5F0", padding: 6, borderBottomWidth: 1, borderBottomColor: "#E8E5DF" }}>
                <View>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{p.nombre}</Text>
                  <Text style={{ fontSize: 7, color: "#666", marginTop: 1 }}>{p.cliente} · {fmtFecha(p.fechaEvento)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 7, color: "#666" }}>Total: {fmtMoney(totalPersonal)}</Text>
                  <Text style={{ fontSize: 7, color: "#666", marginTop: 1 }}>Presupuesto: {fmtMoney(p.presupuestoOp)}</Text>
                </View>
              </View>
              <View style={base.table}>
                {p.personal.map((pp, j) => (
                  <View key={j} style={{ flexDirection: "row", padding: 4, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                    <Text style={{ flex: 2, fontSize: 7, color: pp.tecnicoNombre ? "#000" : "#999" }}>{pp.tecnicoNombre ?? "Sin asignar"}</Text>
                    <Text style={{ flex: 1.5, fontSize: 7, color: "#666" }}>{pp.rolNombre ?? "—"}</Text>
                    <Text style={{ width: 60, fontSize: 7, color: "#666" }}>{pp.jornada ?? "—"}</Text>
                    <Text style={{ width: 50, fontSize: 7, textAlign: "right" }}>{pp.tarifaAcordada != null ? fmtMoney(pp.tarifaAcordada) : "—"}</Text>
                  </View>
                ))}
                {p.personal.length === 0 && (
                  <View style={{ padding: 4 }}><Text style={{ fontSize: 7, color: "#999" }}>Sin personal registrado</Text></View>
                )}
              </View>
            </View>
          );
        })}
      </View>
      
    </ReporteLayout>
  );
}
