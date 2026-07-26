import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, fmtMoney } from "@/components/pdf/ReporteBase";

export interface CuentaReporteRow {
  id: string;
  fechaCompromiso: string;
  entidad: string;
  concepto: string;
  proyecto: string | null;
  monto: number;
  pagado: number;
  saldo: number;
  estado: string;
  vencida: boolean;
}

export interface CuentasReportePDFData {
  tipo: "cobrar" | "pagar";
  rows: CuentaReporteRow[];
  totalPendiente: number;
  totalVencido: number;
  totalCubierto: number;
  generadoEn: string;
}

export function CuentasReportePDF({ data }: { data: CuentasReportePDFData }) {
  const esCobrar = data.tipo === "cobrar";
  const titulo = esCobrar ? "CUENTAS POR COBRAR" : "CUENTAS POR PAGAR";
  const entidadLabel = esCobrar ? "CLIENTE" : "ACREEDOR";
  const cubiertoLabel = esCobrar ? "COBRADO" : "PAGADO";

  return (
    <ReporteLayout
      titulo={titulo}
      subtitulo={`Al ${fmtFecha(data.generadoEn)}`}
      footerLabel={`Mainstage Pro — ${esCobrar ? "Cuentas por cobrar" : "Cuentas por pagar"}`}
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>TOTAL PENDIENTE</Text>
          <Text style={base.kpiValueDark}>{fmtMoney(data.totalPendiente)}</Text>
          <Text style={base.kpiSubDark}>{esCobrar ? "por cobrar" : "por pagar"}</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>VENCIDO</Text>
          <Text style={[base.kpiValue, { color: "#dc2626" }]}>{fmtMoney(data.totalVencido)}</Text>
          <Text style={base.kpiSub}>fecha pasada</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>{cubiertoLabel}</Text>
          <Text style={[base.kpiValue, { color: "#16a34a" }]}>{fmtMoney(data.totalCubierto)}</Text>
          <Text style={base.kpiSub}>abonado</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>CUENTAS</Text>
          <Text style={base.kpiValue}>{data.rows.length}</Text>
          <Text style={base.kpiSub}>pendientes</Text>
        </View>
      </View>

      <View style={base.table}>
        <View style={base.thead} fixed>
          <Text style={[base.th, { width: 48 }]}>VENCE</Text>
          <Text style={[base.th, { flex: 2 }]}>{entidadLabel}</Text>
          <Text style={[base.th, { flex: 2.4 }]}>CONCEPTO</Text>
          <Text style={[base.th, { width: 60, textAlign: "right" }]}>MONTO</Text>
          <Text style={[base.th, { width: 60, textAlign: "right" }]}>{cubiertoLabel}</Text>
          <Text style={[base.th, { width: 62, textAlign: "right" }]}>SALDO</Text>
        </View>
        {data.rows.map((r, i) => (
          <View key={r.id} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
            <Text style={[base.td, { width: 48, color: r.vencida ? "#dc2626" : undefined }]}>{fmtFecha(r.fechaCompromiso)}</Text>
            <View style={{ flex: 2, paddingRight: 4 }}>
              <Text style={base.tdStrong}>{r.entidad}</Text>
              {r.proyecto && <Text style={base.tdSub}>{r.proyecto}</Text>}
            </View>
            <Text style={[base.td, { flex: 2.4, paddingRight: 4 }]}>{r.concepto}</Text>
            <Text style={[base.td, { width: 60, textAlign: "right" }]}>{fmtMoney(r.monto)}</Text>
            <Text style={[base.td, { width: 60, textAlign: "right", color: r.pagado > 0 ? "#16a34a" : undefined }]}>{r.pagado > 0 ? fmtMoney(r.pagado) : "—"}</Text>
            <Text style={[base.tdStrong, { width: 62, textAlign: "right" }]}>{fmtMoney(r.saldo)}</Text>
          </View>
        ))}
      </View>

      {data.rows.length === 0 && (
        <Text style={base.vacio}>Sin cuentas {esCobrar ? "por cobrar" : "por pagar"} pendientes.</Text>
      )}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro. Saldos vigentes a la fecha de generación.</Text>
    </ReporteLayout>
  );
}
