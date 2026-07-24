import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Svg, Rect, Line,
} from '@react-pdf/renderer'

// ─── Paleta (misma que TareasReportePDF) ──────────────────────────────────────
const GOLD = '#B3985B'
const BLACK = '#0a0a0a'
const DARK = '#111111'
const GRAY = '#4a4a4a'
const LIGHT = '#888888'
const WHITE = '#FFFFFF'
const CREAM = '#F7F5F0'
const GREEN = '#16a34a'
const RED = '#dc2626'
const AMBER = '#d97706'

// ─── Tipos (autónomos, espejo de src/lib/rendimiento) ─────────────────────────
type FuenteKey = 'EVENTO' | 'EMPRESA' | 'TRATO' | 'NORMAL'

interface Verificacion { requieren: number; verificadas: number; rechazadas: number; pendientes: number }

interface RendResumen {
  total: number; completadas: number; aTiempo: number; tarde: number
  vencidas: number; pendientesVigentes: number
  pctEjecucion: number; pctPuntualidad: number; cumplimiento: number
  atrasoPromedio: number; sinFecha: number; sinResponsable: number
}
interface RendTareaDetalle {
  id: string; titulo: string; prioridad: string; fuente: FuenteKey
  contexto: string | null; fechaCompromiso: string | null
  estado: string; diasAtraso: number; verificacion: string
}
interface RendUsuario {
  id: string; name: string; area: string | null
  total: number; completadas: number; aTiempo: number; tarde: number
  vencidas: number; pendientesVigentes: number
  pctEjecucion: number; pctPuntualidad: number; cumplimiento: number
  atrasoPromedio: number
  porFuente: Record<FuenteKey, { total: number; completadas: number }>
  verificacion: Verificacion
  criticas: RendTareaDetalle[]
  pendientes: RendTareaDetalle[]
}
interface RendFuente {
  fuente: FuenteKey; label: string; total: number; completadas: number
  aTiempo: number; vencidas: number; cumplimiento: number
}
interface RendSemana {
  semana: string; label: string; total: number; completadas: number
  aTiempo: number; pctEjecucion: number; cumplimiento: number
}

export interface RendimientoReporteData {
  modo: 'general' | 'usuario'
  periodoLabel: string
  resumen: RendResumen
  usuarios: RendUsuario[]
  fuentes: RendFuente[]
  tendencia: RendSemana[]
  verificacion: Verificacion
  usuario?: RendUsuario
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AREA_LABEL: Record<string, string> = {
  VENTAS: 'Ventas', ADMINISTRACION: 'Administración', PRODUCCION: 'Producción',
  MARKETING: 'Marketing', RRHH: 'RRHH', GENERAL: 'General', DIRECCION: 'Dirección',
}
const PRIO_COLOR: Record<string, string> = { URGENTE: RED, ALTA: AMBER, MEDIA: GOLD, BAJA: LIGHT }
const FUENTE_LABEL: Record<FuenteKey, string> = {
  EVENTO: 'Evento', EMPRESA: 'Empresa', TRATO: 'Trato', NORMAL: 'Tarea',
}
function perfColor(pct: number): string { return pct >= 80 ? GREEN : pct >= 50 ? AMBER : RED }
function fmtFecha(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: WHITE, paddingTop: 36, paddingBottom: 52, fontSize: 9, color: DARK },
  header: { backgroundColor: BLACK, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 22, marginTop: -36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 7, color: LIGHT, letterSpacing: 1 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: WHITE, marginBottom: 3, textAlign: 'right' },
  headerSub: { fontSize: 8, color: LIGHT, textAlign: 'right' },
  goldBar: { height: 3, backgroundColor: GOLD },
  mesStrip: { backgroundColor: CREAM, paddingHorizontal: 40, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1 solid #e0ddd8' },
  mesLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK },
  mesGen: { fontSize: 8, color: LIGHT, fontFamily: 'Helvetica-Oblique' },
  section: { paddingHorizontal: 40, marginTop: 16 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 5, borderBottom: '1 solid #e0ddd8' },
  sectionLine: { height: 2, width: 18, backgroundColor: GOLD, marginRight: 7 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14, paddingHorizontal: 40, marginTop: 14 },
  kpiCard: { flex: 1, backgroundColor: CREAM, borderLeft: '3 solid ' + GOLD, padding: 10, borderRadius: 2 },
  kpiLabel: { fontSize: 7, color: LIGHT, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: DARK },
  kpiSub: { fontSize: 7, color: LIGHT, marginTop: 2 },
  cols2: { flexDirection: 'row', paddingHorizontal: 40, gap: 16, marginTop: 4 },
  col: { flex: 1 },
  tableWrap: { marginTop: 4 },
  thead: { flexDirection: 'row', backgroundColor: BLACK, paddingVertical: 5, paddingHorizontal: 10 },
  theadCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: LIGHT, letterSpacing: 0.8, textTransform: 'uppercase' },
  trow: { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: '1 solid #f0ede8', alignItems: 'center' },
  trowAlt: { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 10, borderBottom: '1 solid #f0ede8', backgroundColor: CREAM, alignItems: 'center' },
  tcell: { fontSize: 7.5, color: GRAY },
  tcellB: { fontSize: 7.5, color: DARK, fontFamily: 'Helvetica-Bold' },
  tcellGreen: { fontSize: 7.5, color: GREEN, fontFamily: 'Helvetica-Bold' },
  tcellRed: { fontSize: 7.5, color: RED, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, backgroundColor: BLACK, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: LIGHT },
})

// ─── Reutilizables ──────────────────────────────────────────────────────────────
function SectionTitle({ label }: { label: string }) {
  return (
    <View style={s.sectionTitle}>
      <View style={s.sectionLine} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  )
}
function PageHeader({ title, sub }: { title: string; sub: string }) {
  const gen = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>MAINSTAGE</Text>
          <Text style={s.tagline}>PRODUCCIÓN · DIRECCIÓN GENERAL</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>{title}</Text>
          <Text style={s.headerSub}>{sub}</Text>
        </View>
      </View>
      <View style={s.goldBar} />
      <View style={s.mesStrip}>
        <Text style={s.mesLabel}>{sub}</Text>
        <Text style={s.mesGen}>Generado el {gen}</Text>
      </View>
    </>
  )
}
function ProgressBarSvg({ pct, width = 100 }: { pct: number; width?: number }) {
  const fill = Math.max(0, Math.min(100, pct))
  const fillW = (fill / 100) * width
  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} rx={3} fill="#e5e5e5" />
      {fillW > 0 && <Rect x={0} y={0} width={fillW} height={6} rx={3} fill={perfColor(pct)} />}
    </Svg>
  )
}
function TrendChart({ tendencia }: { tendencia: RendSemana[] }) {
  const W = 200, H = 60
  const n = tendencia.length
  const barW = n > 0 ? Math.floor((W - (n - 1) * 4) / n) : 20
  return (
    <Svg width={W} height={H + 16}>
      {tendencia.map((t, i) => {
        const x = i * (barW + 4)
        const h = Math.max(2, Math.round((t.cumplimiento / 100) * H))
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={0} width={barW} height={H} rx={2} fill="#eee" />
            <Rect x={x} y={H - h} width={barW} height={h} rx={2} fill={perfColor(t.cumplimiento)} />
            <Text style={{ fontSize: 5, color: LIGHT }} x={x} y={H + 10}>{t.label.split(' ')[0]}</Text>
          </React.Fragment>
        )
      })}
      <Line x1={0} y1={H} x2={W} y2={H} strokeWidth={0.5} stroke="#d0cdc8" />
    </Svg>
  )
}
function PageFooter({ left }: { left: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{left}</Text>
      <Text style={s.footerText}>Dirección General · Confidencial</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <View style={[s.kpiCard, color ? { borderLeftColor: color } : {}]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, color ? { color } : {}]}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  )
}

// ─── REPORTE GENERAL (equipo) ─────────────────────────────────────────────────
function ReporteGeneral({ data }: { data: RendimientoReporteData }) {
  const r = data.resumen
  const v = data.verificacion
  const criticasEquipo = data.usuarios
    .flatMap(u => u.criticas.map(c => ({ ...c, responsable: u.name })))
    .sort((a, b) => b.diasAtraso - a.diasAtraso)
    .slice(0, 22)

  return (
    <>
      <Page size="A4" orientation="landscape" style={s.page}>
        <PageHeader title="Reporte semanal de rendimiento" sub={data.periodoLabel} />

        <View style={s.kpiRow}>
          <KpiCard label="Cumplimiento" value={`${r.cumplimiento}%`} color={perfColor(r.cumplimiento)} sub="A tiempo del total comprometido" />
          <KpiCard label="Ejecución" value={`${r.pctEjecucion}%`} color={perfColor(r.pctEjecucion)} sub={`${r.completadas}/${r.total} completadas`} />
          <KpiCard label="Puntualidad" value={`${r.pctPuntualidad}%`} color={perfColor(r.pctPuntualidad)} sub={`${r.tarde} tarde`} />
          <KpiCard label="Vencidas" value={`${r.vencidas}`} color={r.vencidas > 0 ? RED : GREEN} sub="Sin completar y vencidas" />
          <KpiCard label="En curso" value={`${r.pendientesVigentes}`} color={AMBER} sub="Pendientes vigentes" />
        </View>

        <View style={s.cols2}>
          <View style={[s.col, { flex: 1.7 }]}>
            <SectionTitle label="Eficiencia por responsable" />
            <View style={s.tableWrap}>
              <View style={s.thead}>
                <Text style={[s.theadCell, { flex: 1 }]}>Colaborador</Text>
                <Text style={[s.theadCell, { width: 50 }]}>Área</Text>
                <Text style={[s.theadCell, { width: 30, textAlign: 'right' }]}>Comp.</Text>
                <Text style={[s.theadCell, { width: 34, textAlign: 'right' }]}>A tpo.</Text>
                <Text style={[s.theadCell, { width: 28, textAlign: 'right' }]}>Tarde</Text>
                <Text style={[s.theadCell, { width: 30, textAlign: 'right' }]}>Venc.</Text>
                <Text style={[s.theadCell, { width: 34, textAlign: 'right' }]}>Cumpl.</Text>
                <Text style={[s.theadCell, { width: 70 }]}>  Progreso</Text>
              </View>
              {data.usuarios.map((u, i) => (
                <View key={u.id} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                  <Text style={[s.tcellB, { flex: 1 }]}>{u.name}</Text>
                  <Text style={[s.tcell, { width: 50 }]}>{AREA_LABEL[u.area ?? ''] ?? (u.area ?? '—')}</Text>
                  <Text style={[s.tcell, { width: 30, textAlign: 'right' }]}>{u.completadas}/{u.total}</Text>
                  <Text style={[s.tcellGreen, { width: 34, textAlign: 'right' }]}>{u.aTiempo}</Text>
                  <Text style={[u.tarde > 0 ? s.tcellRed : s.tcell, { width: 28, textAlign: 'right' }]}>{u.tarde || '—'}</Text>
                  <Text style={[u.vencidas > 0 ? s.tcellRed : s.tcell, { width: 30, textAlign: 'right' }]}>{u.vencidas || '—'}</Text>
                  <Text style={[{ fontSize: 7.5, color: perfColor(u.cumplimiento), fontFamily: 'Helvetica-Bold', width: 34, textAlign: 'right' }]}>{u.cumplimiento}%</Text>
                  <View style={{ width: 70, paddingLeft: 6 }}><ProgressBarSvg pct={u.cumplimiento} width={62} /></View>
                </View>
              ))}
              {data.usuarios.length === 0 && (
                <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>Sin tareas comprometidas en el período.</Text></View>
              )}
            </View>
          </View>

          <View style={[s.col, { flex: 1 }]}>
            <SectionTitle label="Por fuente" />
            <View style={s.tableWrap}>
              {data.fuentes.map((f, i) => (
                <View key={f.fuente} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                  <Text style={[s.tcellB, { flex: 1 }]}>{f.label}</Text>
                  <Text style={[s.tcell, { width: 34, textAlign: 'right' }]}>{f.completadas}/{f.total}</Text>
                  <Text style={[f.vencidas > 0 ? s.tcellRed : s.tcell, { width: 40, textAlign: 'right' }]}>{f.vencidas} venc.</Text>
                  <Text style={[{ fontSize: 7.5, color: perfColor(f.cumplimiento), fontFamily: 'Helvetica-Bold', width: 30, textAlign: 'right' }]}>{f.cumplimiento}%</Text>
                </View>
              ))}
              {data.fuentes.length === 0 && <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>—</Text></View>}
            </View>

            <View style={{ marginTop: 12 }}><SectionTitle label="Tendencia (cumplimiento 8 sem.)" /></View>
            <View style={{ paddingTop: 4 }}><TrendChart tendencia={data.tendencia} /></View>

            <View style={{ marginTop: 12 }}><SectionTitle label="Verificación de evidencia" /></View>
            <View style={s.tableWrap}>
              <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>Requieren evidencia</Text><Text style={s.tcellB}>{v.requieren}</Text></View>
              <View style={s.trowAlt}><Text style={[s.tcell, { flex: 1 }]}>Verificadas</Text><Text style={s.tcellGreen}>{v.verificadas}</Text></View>
              <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>Pendientes de verificar</Text><Text style={[s.tcell, { color: AMBER }]}>{v.pendientes}</Text></View>
              <View style={s.trowAlt}><Text style={[s.tcell, { flex: 1 }]}>Rechazadas</Text><Text style={s.tcellRed}>{v.rechazadas}</Text></View>
            </View>
          </View>
        </View>

        <PageFooter left="Rendimiento semanal · Equipo" />
      </Page>

      {criticasEquipo.length > 0 && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <PageHeader title="Focos rojos — vencidas y entregadas tarde" sub={data.periodoLabel} />
          <View style={s.section}>
            <SectionTitle label="Tareas críticas del período" />
            <View style={s.tableWrap}>
              <View style={s.thead}>
                <Text style={[s.theadCell, { flex: 1 }]}>Tarea</Text>
                <Text style={[s.theadCell, { width: 90 }]}>Responsable</Text>
                <Text style={[s.theadCell, { width: 55 }]}>Fuente</Text>
                <Text style={[s.theadCell, { width: 45 }]}>Compromiso</Text>
                <Text style={[s.theadCell, { width: 50 }]}>Estado</Text>
                <Text style={[s.theadCell, { width: 45, textAlign: 'right' }]}>Atraso</Text>
              </View>
              {criticasEquipo.map((t, i) => (
                <View key={t.id} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tcellB}>{t.titulo}</Text>
                    {t.contexto ? <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{t.contexto}</Text> : null}
                  </View>
                  <Text style={[s.tcell, { width: 90 }]}>{t.responsable}</Text>
                  <Text style={[{ fontSize: 7, color: PRIO_COLOR[t.prioridad] ?? LIGHT, width: 55 }]}>{FUENTE_LABEL[t.fuente]}</Text>
                  <Text style={[s.tcell, { width: 45 }]}>{fmtFecha(t.fechaCompromiso)}</Text>
                  <Text style={[{ fontSize: 7, width: 50, color: t.estado === 'COMPLETADA' ? AMBER : RED }]}>{t.estado === 'COMPLETADA' ? 'Tarde' : 'Vencida'}</Text>
                  <Text style={[s.tcellRed, { width: 45, textAlign: 'right' }]}>{t.diasAtraso}d</Text>
                </View>
              ))}
            </View>
          </View>
          <PageFooter left="Focos rojos" />
        </Page>
      )}
    </>
  )
}

// ─── REPORTE POR USUARIO ───────────────────────────────────────────────────────
function ReporteUsuario({ data }: { data: RendimientoReporteData }) {
  const u = data.usuario!
  const fuentes = (Object.keys(u.porFuente) as FuenteKey[])
    .map(k => ({ k, ...u.porFuente[k] }))
    .filter(f => f.total > 0)

  return (
    <Page size="A4" style={s.page}>
      <PageHeader title={`Rendimiento — ${u.name}`} sub={data.periodoLabel} />

      <View style={s.kpiRow}>
        <KpiCard label="Cumplimiento" value={`${u.cumplimiento}%`} color={perfColor(u.cumplimiento)} sub={`${u.aTiempo}/${u.total} a tiempo`} />
        <KpiCard label="Ejecución" value={`${u.pctEjecucion}%`} color={perfColor(u.pctEjecucion)} sub={`${u.completadas}/${u.total}`} />
        <KpiCard label="Puntualidad" value={`${u.pctPuntualidad}%`} color={perfColor(u.pctPuntualidad)} sub={`${u.tarde} tarde`} />
      </View>
      <View style={[s.kpiRow, { marginTop: 0 }]}>
        <KpiCard label="Vencidas" value={`${u.vencidas}`} color={u.vencidas > 0 ? RED : GREEN} sub="Sin completar" />
        <KpiCard label="En curso" value={`${u.pendientesVigentes}`} color={AMBER} sub="Pendientes vigentes" />
        <KpiCard label="Atraso prom." value={`${u.atrasoPromedio}d`} sub="Días de atraso medio" />
      </View>

      <View style={s.cols2}>
        <View style={s.col}>
          <SectionTitle label="Por fuente" />
          <View style={s.tableWrap}>
            {fuentes.map((f, i) => (
              <View key={f.k} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                <Text style={[s.tcellB, { flex: 1 }]}>{({ EVENTO: 'Proyectos de evento', EMPRESA: 'Proyectos de empresa', TRATO: 'Tratos', NORMAL: 'Tareas' } as Record<FuenteKey, string>)[f.k]}</Text>
                <Text style={[s.tcell, { width: 50, textAlign: 'right' }]}>{f.completadas}/{f.total}</Text>
              </View>
            ))}
            {fuentes.length === 0 && <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>Sin tareas.</Text></View>}
          </View>

          <View style={{ marginTop: 12 }}><SectionTitle label="Tendencia (8 semanas)" /></View>
          <View style={{ paddingTop: 4 }}><TrendChart tendencia={data.tendencia} /></View>

          <View style={{ marginTop: 12 }}><SectionTitle label="Verificación" /></View>
          <View style={s.tableWrap}>
            <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>Requieren evidencia</Text><Text style={s.tcellB}>{u.verificacion.requieren}</Text></View>
            <View style={s.trowAlt}><Text style={[s.tcell, { flex: 1 }]}>Verificadas</Text><Text style={s.tcellGreen}>{u.verificacion.verificadas}</Text></View>
            <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>Pendientes</Text><Text style={[s.tcell, { color: AMBER }]}>{u.verificacion.pendientes}</Text></View>
            <View style={s.trowAlt}><Text style={[s.tcell, { flex: 1 }]}>Rechazadas</Text><Text style={s.tcellRed}>{u.verificacion.rechazadas}</Text></View>
          </View>
        </View>

        <View style={s.col}>
          <SectionTitle label="Vencidas y entregadas tarde" />
          <View style={s.tableWrap}>
            {u.criticas.length === 0 && <View style={s.trow}><Text style={[s.tcell, { flex: 1, color: GREEN }]}>Sin vencidas ni entregas tarde. ✓</Text></View>}
            {u.criticas.map((t, i) => (
              <View key={t.id} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tcellB}>{t.titulo}</Text>
                  {t.contexto ? <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{FUENTE_LABEL[t.fuente]} · {t.contexto}</Text> : null}
                </View>
                <Text style={[{ fontSize: 7, width: 45, color: t.estado === 'COMPLETADA' ? AMBER : RED }]}>{t.estado === 'COMPLETADA' ? 'Tarde' : 'Vencida'}</Text>
                <Text style={[s.tcellRed, { width: 32, textAlign: 'right' }]}>{t.diasAtraso}d</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 12 }}><SectionTitle label="Pendientes vigentes" /></View>
          <View style={s.tableWrap}>
            {u.pendientes.length === 0 && <View style={s.trow}><Text style={[s.tcell, { flex: 1 }]}>—</Text></View>}
            {u.pendientes.map((t, i) => (
              <View key={t.id} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tcellB}>{t.titulo}</Text>
                  {t.contexto ? <Text style={[s.tcell, { fontSize: 6.5, color: LIGHT }]}>{FUENTE_LABEL[t.fuente]} · {t.contexto}</Text> : null}
                </View>
                <Text style={[s.tcell, { width: 40, textAlign: 'right' }]}>{fmtFecha(t.fechaCompromiso)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <PageFooter left={`Rendimiento individual · ${u.name}`} />
    </Page>
  )
}

// ─── Documento ───────────────────────────────────────────────────────────────
export function RendimientoReportePDF({ data }: { data: RendimientoReporteData }) {
  return (
    <Document
      title={data.modo === 'usuario' ? `Rendimiento — ${data.usuario?.name}` : 'Reporte semanal de rendimiento'}
      author="Mainstage"
      subject="Rendimiento operativo · Dirección General"
    >
      {data.modo === 'usuario' ? <ReporteUsuario data={data} /> : <ReporteGeneral data={data} />}
    </Document>
  )
}
