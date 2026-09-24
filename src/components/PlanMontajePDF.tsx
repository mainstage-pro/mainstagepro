import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { DISCIPLINA_LABELS } from '@/lib/disciplinaColors'
import type { BloqueCarga, CargaZona, GrupoDisciplina, PuntoRigging } from '@/lib/montaje-reportes'

export type PlanMontajePDFData = {
  numeroProyecto: string
  nombre: string
  fechaEvento: string | null
  fechaMontaje: string | null
  horaMontaje: string | null
  lugarEvento: string | null
  direccionVenue: string | null
  encargado: string | null
  logoSrc: string | null
  plan: GrupoDisciplina[]
  carga: CargaZona[]
  cargaTotal: { amperaje110: number; amperaje220: number; total: number; sinDato: number }
  rigging: PuntoRigging[]
  ordenCarga: BloqueCarga[]
}

const GOLD = '#9A7A3F'
const WHITE = '#ffffff'
const LIGHT1 = '#f8f8f8'
const LIGHT2 = '#f0f0f0'
const BORDER = '#e0e0e0'
const INK1 = '#111111'
const INK5 = '#555555'
const INK8 = '#888888'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, padding: 32, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottomWidth: 1.5, borderBottomColor: INK1, paddingBottom: 14 },
  logo: { width: 90, height: 24, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  headerSub: { fontSize: 14, color: INK1, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  headerDate: { fontSize: 8, color: INK5, marginTop: 3 },

  gridRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 6 },
  gridCell: { backgroundColor: LIGHT1, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8, minWidth: 110, flex: 1 },
  gridLabel: { fontSize: 7, color: INK5, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  gridValue: { fontSize: 9, color: INK1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: BORDER },
  sectionTxt: { fontSize: 8, color: GOLD, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 10, fontFamily: 'Helvetica-Bold' },

  discHead: { backgroundColor: INK1, paddingHorizontal: 10, paddingVertical: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  discTxt: { fontSize: 8, color: WHITE, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold' },
  zonaHead: { backgroundColor: LIGHT2, paddingHorizontal: 10, paddingVertical: 3 },
  zonaTxt: { fontSize: 7.5, color: INK1, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Helvetica-Bold' },

  block: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  thRow: { flexDirection: 'row', backgroundColor: LIGHT1, paddingHorizontal: 10, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: BORDER },
  th: { fontSize: 6.5, color: INK8, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  check: { width: 9, height: 9, borderWidth: 1, borderColor: INK5, borderRadius: 2, marginRight: 6 },
  cQty: { width: 26, fontSize: 8.5, color: GOLD, fontFamily: 'Helvetica-Bold' },
  cName: { flex: 3, fontSize: 8.5, color: INK1 },
  cFunc: { flex: 2.4, fontSize: 8, color: INK1, fontFamily: 'Helvetica-Bold' },
  cSop: { flex: 2.4, fontSize: 8, color: INK5 },
  cAlt: { width: 34, fontSize: 8, color: INK5, textAlign: 'right' },
  nota: { fontSize: 7.5, color: INK8, fontStyle: 'italic', paddingHorizontal: 10, paddingBottom: 4, marginLeft: 41 },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  stat: { backgroundColor: LIGHT1, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 7, minWidth: 90, flex: 1 },
  statLabel: { fontSize: 6.5, color: INK5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, fontFamily: 'Helvetica-Bold' },
  statValue: { fontSize: 12, color: INK1, fontFamily: 'Helvetica-Bold' },
  statHint: { fontSize: 6.5, color: INK8, marginTop: 1 },

  aviso: { backgroundColor: LIGHT2, borderLeftWidth: 2, borderLeftColor: GOLD, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 8 },
  avisoTxt: { fontSize: 7.5, color: INK5 },

  vacio: { fontSize: 8, color: INK8, fontStyle: 'italic', paddingVertical: 6 },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14 },
  footerInfo: { fontSize: 7, color: INK8, textAlign: 'center' },
  pageNum: { position: 'absolute', bottom: 18, right: 32, fontSize: 7, color: INK8 },
})

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  } catch { return iso }
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={s.sectionLine} />
      <Text style={s.sectionTxt}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  )
}

function GridCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.gridCell}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridValue}>{value || '—'}</Text>
    </View>
  )
}

export function PlanMontajePDF({ data }: { data: PlanMontajePDFData }) {
  const { plan, carga, cargaTotal, rigging, ordenCarga } = data

  return (
    <Document title={`Plan de montaje ${data.numeroProyecto}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : <Text style={s.headerSub}>Mainstage Pro</Text>}
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Plan de montaje</Text>
            <Text style={s.headerSub}>{data.nombre}</Text>
            <Text style={s.headerDate}>{data.numeroProyecto} · {fmtFecha(data.fechaEvento)}</Text>
          </View>
        </View>

        <View style={s.gridRow}>
          <GridCell label="Venue" value={data.lugarEvento ?? ''} />
          <GridCell label="Montaje" value={`${fmtFecha(data.fechaMontaje)}${data.horaMontaje ? ` · ${data.horaMontaje}` : ''}`} />
          <GridCell label="Coordinador" value={data.encargado ?? ''} />
        </View>
        {data.direccionVenue ? (
          <View style={s.gridRow}>
            <GridCell label="Dirección" value={data.direccionVenue} />
          </View>
        ) : null}

        {/* ── Plan por disciplina y zona ── */}
        <SectionHeader title="Montaje por disciplina" />
        {plan.length === 0 ? (
          <Text style={s.vacio}>Todavía no se define el montaje de ningún equipo.</Text>
        ) : (
          plan.map((g) => (
            <View key={g.disciplina} style={s.block} wrap={false}>
              <View style={s.discHead}>
                <Text style={s.discTxt}>{DISCIPLINA_LABELS[g.disciplina] ?? g.disciplina}</Text>
              </View>
              {g.zonas.map((z) => (
                <View key={z.zona}>
                  <View style={s.zonaHead}>
                    <Text style={s.zonaTxt}>{z.zona}</Text>
                  </View>
                  <View style={s.thRow}>
                    <Text style={[s.th, { width: 15 }]}> </Text>
                    <Text style={[s.th, { width: 26 }]}>Cant</Text>
                    <Text style={[s.th, { flex: 3 }]}>Equipo</Text>
                    <Text style={[s.th, { flex: 2.4 }]}>Configuración</Text>
                    <Text style={[s.th, { flex: 2.4 }]}>Soporte</Text>
                    <Text style={[s.th, { width: 34, textAlign: 'right' }]}>Alt.</Text>
                  </View>
                  {z.posiciones.map((p, i) => (
                    <View key={`${p.nombre}-${i}`}>
                      <View style={s.row}>
                        <View style={s.check} />
                        <Text style={s.cQty}>{p.cantidad}</Text>
                        <Text style={s.cName}>{p.nombre}</Text>
                        <Text style={s.cFunc}>{p.configuracion || '—'}</Text>
                        <Text style={s.cSop}>{p.soporte || '—'}</Text>
                        <Text style={s.cAlt}>{p.alturaM != null ? `${p.alturaM} m` : ''}</Text>
                      </View>
                      {p.notas ? <Text style={s.nota}>{p.notas}</Text> : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* ── Página 2: requerimientos del venue y orden de carga ── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {data.logoSrc ? <Image src={data.logoSrc} style={s.logo} /> : <Text style={s.headerSub}>Mainstage Pro</Text>}
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Requerimientos y carga</Text>
            <Text style={s.headerSub}>{data.nombre}</Text>
            <Text style={s.headerDate}>{data.numeroProyecto}</Text>
          </View>
        </View>

        {/* ── Eléctrico ── */}
        <SectionHeader title="Requerimiento eléctrico por zona" />
        <View style={s.statRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>Total 110 V</Text>
            <Text style={s.statValue}>{cargaTotal.amperaje110.toFixed(1)} A</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Total 220 V</Text>
            <Text style={s.statValue}>{cargaTotal.amperaje220.toFixed(1)} A</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Carga total</Text>
            <Text style={s.statValue}>{cargaTotal.total.toFixed(1)} A</Text>
            <Text style={s.statHint}>sin factor de simultaneidad</Text>
          </View>
        </View>
        {cargaTotal.sinDato > 0 && (
          <View style={s.aviso}>
            <Text style={s.avisoTxt}>
              {cargaTotal.sinDato} pieza{cargaTotal.sinDato !== 1 ? 's' : ''} sin amperaje capturado en inventario: la carga real es mayor a la mostrada.
            </Text>
          </View>
        )}
        {carga.length === 0 ? (
          <Text style={s.vacio}>Sin datos eléctricos.</Text>
        ) : (
          <View style={s.block}>
            <View style={s.thRow}>
              <Text style={[s.th, { flex: 3 }]}>Zona</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>110 V</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>220 V</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Sin dato</Text>
            </View>
            {carga.map((z) => (
              <View key={z.zona} style={s.row}>
                <Text style={{ flex: 3, fontSize: 8.5, color: INK1 }}>{z.zona}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: INK5, textAlign: 'right' }}>{z.amperaje110.toFixed(1)} A</Text>
                <Text style={{ flex: 1, fontSize: 8, color: INK5, textAlign: 'right' }}>{z.amperaje220.toFixed(1)} A</Text>
                <Text style={{ flex: 1, fontSize: 8.5, color: INK1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{z.total.toFixed(1)} A</Text>
                <Text style={{ flex: 1, fontSize: 8, color: INK8, textAlign: 'right' }}>{z.sinDato || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Rigging ── */}
        <SectionHeader title="Rigging — puntos colgados" />
        {rigging.length === 0 ? (
          <Text style={s.vacio}>Este montaje no lleva equipo colgado.</Text>
        ) : (
          <View style={s.block}>
            <View style={s.thRow}>
              <Text style={[s.th, { width: 26 }]}>Cant</Text>
              <Text style={[s.th, { flex: 3 }]}>Equipo</Text>
              <Text style={[s.th, { flex: 2 }]}>Zona</Text>
              <Text style={[s.th, { flex: 2 }]}>Soporte</Text>
              <Text style={[s.th, { width: 40, textAlign: 'right' }]}>Altura</Text>
            </View>
            {rigging.map((r, i) => (
              <View key={`${r.nombre}-${i}`} style={s.row}>
                <Text style={s.cQty}>{r.cantidad}</Text>
                <Text style={{ flex: 3, fontSize: 8.5, color: INK1 }}>{r.nombre}</Text>
                <Text style={{ flex: 2, fontSize: 8, color: INK5 }}>{r.zona}</Text>
                <Text style={{ flex: 2, fontSize: 8, color: INK5 }}>{r.soporte}</Text>
                <Text style={{ width: 40, fontSize: 8.5, color: INK1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                  {r.alturaM != null ? `${r.alturaM} m` : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Orden de carga ── */}
        <SectionHeader title="Orden de carga" />
        <View style={s.aviso}>
          <Text style={s.avisoTxt}>
            El camión se carga en orden inverso al montaje: lo que se instala primero sube al final y baja primero.
          </Text>
        </View>
        {ordenCarga.map((b, bi) => (
          <View key={b.disciplina} style={s.block} wrap={false}>
            <View style={s.discHead}>
              <Text style={s.discTxt}>{bi + 1}. {DISCIPLINA_LABELS[b.disciplina] ?? b.disciplina}</Text>
            </View>
            {b.items.map((it, i) => (
              <View key={`${it.nombre}-${i}`} style={s.row}>
                <View style={s.check} />
                <Text style={s.cQty}>{it.cantidad}</Text>
                <Text style={{ flex: 4, fontSize: 8.5, color: INK1 }}>{it.nombre}</Text>
                <Text style={{ flex: 3, fontSize: 8, color: INK8 }}>{it.destinos}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.footer}>
          <Text style={s.footerInfo}>
            Mainstage Pro · Documento interno de producción · Generado el{' '}
            {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}
