import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, ReporteLayout, fmtFecha, fmtMoney } from "@/components/pdf/ReporteBase";

export interface CajaChicaMovData {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string | null;
  metodoPago: string | null;
  esIngreso: boolean;
  monto: number;
}

export interface CajaChicaPDFData {
  movimientos: CajaChicaMovData[];
  saldo: number;
  totalIngresos: number;
  totalEgresos: number;
  generadoEn: string;
}

export function CajaChicaPDF({ data }: { data: CajaChicaPDFData }) {
  return (
    <ReporteLayout
      titulo="REPORTE DE CAJA CHICA"
      subtitulo={`Generado ${fmtFecha(data.generadoEn)}`}
      footerLabel="Mainstage Pro — Caja chica"
    >
      <View style={base.kpiRow}>
        <View style={base.kpiBoxDark}>
          <Text style={base.kpiLabelDark}>SALDO ACTUAL</Text>
          <Text style={base.kpiValueDark}>{fmtMoney(data.saldo)}</Text>
          <Text style={base.kpiSubDark}>disponible</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>RECARGAS</Text>
          <Text style={[base.kpiValue, { color: "#16a34a" }]}>{fmtMoney(data.totalIngresos)}</Text>
          <Text style={base.kpiSub}>entradas</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>GASTOS</Text>
          <Text style={[base.kpiValue, { color: "#dc2626" }]}>{fmtMoney(data.totalEgresos)}</Text>
          <Text style={base.kpiSub}>salidas</Text>
        </View>
        <View style={base.kpiBox}>
          <Text style={base.kpiLabel}>MOVIMIENTOS</Text>
          <Text style={base.kpiValue}>{data.movimientos.length}</Text>
          <Text style={base.kpiSub}>registrados</Text>
        </View>
      </View>

      <View style={base.table}>
        <View style={base.thead} fixed>
          <Text style={[base.th, { width: 56 }]}>FECHA</Text>
          <Text style={[base.th, { flex: 3 }]}>CONCEPTO</Text>
          <Text style={[base.th, { flex: 1.4 }]}>CATEGORÍA</Text>
          <Text style={[base.th, { width: 56 }]}>MÉTODO</Text>
          <Text style={[base.th, { width: 66, textAlign: "right" }]}>MONTO</Text>
        </View>
        {data.movimientos.map((m, i) => (
          <View key={m.id} style={i % 2 === 0 ? base.tbodyRow : base.tbodyRowAlt} wrap={false}>
            <Text style={[base.td, { width: 56 }]}>{fmtFecha(m.fecha)}</Text>
            <Text style={[base.tdStrong, { flex: 3, paddingRight: 4 }]}>{m.concepto}</Text>
            <Text style={[base.td, { flex: 1.4, paddingRight: 4 }]}>{m.categoria ?? "—"}</Text>
            <Text style={[base.td, { width: 56, paddingRight: 4 }]}>{m.metodoPago ?? "—"}</Text>
            <Text style={[base.tdStrong, { width: 66, textAlign: "right", color: m.esIngreso ? "#16a34a" : "#dc2626" }]}>
              {m.esIngreso ? "+" : "−"}{fmtMoney(m.monto)}
            </Text>
          </View>
        ))}
      </View>

      {data.movimientos.length === 0 && (
        <Text style={base.vacio}>Sin movimientos de caja chica.</Text>
      )}

      <View style={base.divider} />
      <Text style={base.nota}>Documento interno de uso exclusivo de Mainstage Pro.</Text>
    </ReporteLayout>
  );
}
