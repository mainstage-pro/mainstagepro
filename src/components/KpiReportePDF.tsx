import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#B3985B', paddingBottom: 12, marginBottom: 20 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111111' },
  subtitle: { fontSize: 9, color: '#555555', marginTop: 4 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#B3985B', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 8, color: '#444444', flex: 2 },
  value: { fontSize: 8, color: '#111111', fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' },
  meta: { fontSize: 8, color: '#888888', flex: 1, textAlign: 'right' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8f8f8', paddingVertical: 4, paddingHorizontal: 4, marginBottom: 2 },
  tableHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555555', textTransform: 'uppercase', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.3, borderBottomColor: '#eeeeee' },
  tableCell: { fontSize: 7.5, color: '#222222' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: '#dddddd', paddingTop: 6 },
  footerText: { fontSize: 7, color: '#aaaaaa', textAlign: 'center' },
  areaTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333333', marginTop: 8, marginBottom: 4 },
})

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}
function pct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toFixed(1)}%`
}

export interface KpiReporteData {
  periodoLabel: string
  desde: string
  hasta: string
  er: {
    ingresosDevengados: number | null
    costosDirectos: number | null
    costosFijos: number | null
    costosTotales: number | null
    utilidadBruta: number | null
    margenBruto: number | null
    utilidadNeta: number | null
    margenNeto: number | null
  } | null
  fc: {
    cobrosReales: number | null
    pagosReales: number | null
    flujoNeto: number | null
    cxcTotal: number | null
    cxcVencido: number | null
    cxpTotal: number | null
  } | null
  areas: Array<{
    nombre: string
    kpis: Array<{
      nombre: string
      meta: string
      valor: string | number | null
    }>
  }>
}

export function KpiReportePDF({ data }: { data: KpiReporteData }) {
  const fmtFecha = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
  const generado = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <Document title={`Reporte KPIs — ${data.periodoLabel}`} author="Mainstage Pro">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>MAINSTAGE PRO — REPORTE DE KPIs</Text>
          <Text style={styles.subtitle}>
            Período: {data.periodoLabel} | {fmtFecha(data.desde)} → {fmtFecha(data.hasta)}
          </Text>
          <Text style={styles.subtitle}>Generado: {generado}</Text>
        </View>

        {/* Estado de resultados */}
        {data.er && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado de Resultados</Text>
            {[
              { label: 'Ingresos devengados', value: fmt(data.er.ingresosDevengados), meta: 'Meta: $500,000' },
              { label: 'Costos directos', value: fmt(data.er.costosDirectos), meta: '' },
              { label: 'Costos fijos', value: fmt(data.er.costosFijos), meta: '' },
              { label: 'Costos totales', value: fmt(data.er.costosTotales), meta: '' },
              { label: 'Utilidad bruta', value: fmt(data.er.utilidadBruta), meta: `Margen: ${pct(data.er.margenBruto)}` },
              { label: 'Utilidad neta', value: fmt(data.er.utilidadNeta), meta: `Margen: ${pct(data.er.margenNeto)}` },
            ].map((r) => (
              <View key={r.label} style={styles.row}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
                {r.meta ? <Text style={styles.meta}>{r.meta}</Text> : <Text style={styles.meta} />}
              </View>
            ))}
          </View>
        )}

        {/* Flujo de caja */}
        {data.fc && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flujo de Caja</Text>
            {[
              { label: 'Cobros reales', value: fmt(data.fc.cobrosReales) },
              { label: 'Pagos reales', value: fmt(data.fc.pagosReales) },
              { label: 'Flujo neto', value: fmt(data.fc.flujoNeto) },
              { label: 'CxC vigentes', value: fmt(data.fc.cxcTotal) },
              { label: 'CxC vencidas', value: fmt(data.fc.cxcVencido) },
              { label: 'CxP vigentes', value: fmt(data.fc.cxpTotal) },
            ].map((r) => (
              <View key={r.label} style={styles.row}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
                <Text style={styles.meta} />
              </View>
            ))}
          </View>
        )}

        {/* KPIs por área */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KPIs por Área</Text>
          {data.areas.map((area) => (
            <View key={area.nombre} style={{ marginBottom: 8 }}>
              <Text style={styles.areaTitle}>{area.nombre.toUpperCase()}</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Indicador</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Meta</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Valor</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.5, textAlign: 'center' }]}>Estado</Text>
              </View>
              {area.kpis.map((kpi) => (
                <View key={kpi.nombre} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{kpi.nombre}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: '#888' }]}>{kpi.meta}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {kpi.valor != null ? String(kpi.valor) : '—'}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.5, textAlign: 'center' }]}>{'—'}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Mainstage Pro · Querétaro · mainstagepro.mx</Text>
        </View>

        {/* Page number */}
        <Text
          fixed
          style={{ position: 'absolute', bottom: 16, right: 40, fontSize: 7, color: '#aaaaaa' }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  )
}
