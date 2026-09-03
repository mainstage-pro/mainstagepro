import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, fmtMoney } from "@/components/pdf/ReporteBase";

export interface ReciboNominaTecnicoPDFData {
  tecnicoNombre: string;
  ciclo: string;
  desde: string;
  hasta: string;
  pagos: {
    proyectoNombre: string;
    clienteNombre: string;
    fechaEvento: string;
    rolNombre: string | null;
    jornada: string | null;
    monto: number;
    estadoPago: string;
  }[];
  total: number;
  todosPagados: boolean;
}

export function ReciboNominaTecnicoPDF({ data }: { data: ReciboNominaTecnicoPDFData }) {
  return (
    <ReporteLayout
      titulo="RECIBO DE HONORARIOS (INTERNO)"
      subtitulo={`Ciclo: ${fmtFecha(data.desde)} al ${fmtFecha(data.hasta)}`}
      footerLabel={`Mainstage Pro — Recibo · ${data.tecnicoNombre}`}
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>TÉCNICO FREELANCE</Text>
          <Text style={base.kpiValueDark}>{data.tecnicoNombre}</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>TOTAL DEL PERÍODO</Text>
          <Text style={base.kpiValue}>{fmtMoney(data.total)}</Text>
          <Text style={base.kpiSub}>{data.pagos.length} evento(s)</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>ESTADO DEL PAGO</Text>
          <Text style={[base.kpiValue, { color: data.todosPagados ? "#4ade80" : "#B3985B" }]}>
            {data.todosPagados ? "PAGADO" : "PENDIENTE"}
          </Text>
        </View>
      </View>

      <View style={base.seccion}>
        <View style={base.seccionHeader} wrap={false}>
          <Text style={base.seccionNombre}>DESGLOSE POR EVENTO</Text>
          <Text style={base.seccionCount}>{fmtMoney(data.total)}</Text>
        </View>
        <View style={base.table}>
          <View style={base.thead} fixed>
            <Text style={[base.th, { flex: 2.5 }]}>PROYECTO</Text>
            <Text style={[base.th, { flex: 2 }]}>ROL Y JORNADA</Text>
            <Text style={[base.th, { width: 60, textAlign: "right" }]}>ESTADO</Text>
            <Text style={[base.th, { width: 65, textAlign: "right" }]}>TARIFA</Text>
          </View>
          {data.pagos.map((p, i) => (
            <View key={i} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
              <View style={{ flex: 2.5, paddingRight: 4 }}>
                <Text style={base.tdStrong}>{p.proyectoNombre}</Text>
                <Text style={base.tdSub}>{p.clienteNombre} · {fmtFecha(p.fechaEvento)}</Text>
              </View>
              <View style={{ flex: 2, paddingRight: 4 }}>
                <Text style={base.td}>{p.rolNombre ?? "—"}</Text>
                <Text style={base.tdSub}>{p.jornada ?? "—"}</Text>
              </View>
              <Text style={[base.td, { width: 60, textAlign: "right", color: p.estadoPago === "PAGADO" ? "green" : "#B3985B" }]}>
                {p.estadoPago === "PAGADO" ? "Pagado" : "Pendiente"}
              </Text>
              <Text style={[base.tdStrong, { width: 65, textAlign: "right" }]}>{fmtMoney(p.monto)}</Text>
            </View>
          ))}
        </View>
        {data.pagos.length === 0 && (
          <Text style={base.vacio}>Sin eventos registrados en este ciclo.</Text>
        )}
      </View>
      
      <View style={{ marginTop: 24, padding: 12, backgroundColor: "#F7F5F0", borderRadius: 4 }}>
        <Text style={{ fontSize: 7, color: "#666", lineHeight: 1.4 }}>
          El presente documento es un comprobante interno de cálculo de honorarios correspondiente a los servicios prestados como freelance para Mainstage Pro durante el período especificado. Este documento no representa un comprobante fiscal.
        </Text>
      </View>

    </ReporteLayout>
  );
}
