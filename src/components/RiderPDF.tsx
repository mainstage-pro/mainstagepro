import React from 'react'
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────────

type RiderAccesorioData = {
  id: string
  nombre: string
  cantidad: number
  categoria: string | null
  completado: boolean
}

type ProyectoEquipoData = {
  id: string
  cantidad: number
  notas: string | null
  equipo: {
    descripcion: string
    marca: string | null
    modelo: string | null
    imagenUrl: string | null
    categoria: { nombre: string } | null
  }
  riderAccesorios: RiderAccesorioData[]
}

type EquipoRiderExtra = {
  id: string
  descripcion: string
  cantidad: number
  notas: string
  completado: boolean
  accesorios?: { id: string; nombre: string; cantidad: number }[]
}

export type RiderPDFData = {
  numeroProyecto: string
  nombre: string
  fechaEvento: string | null
  lugarEvento: string | null
  horaInicio: string | null
  horaFin: string | null
  horaMontaje: string | null
  horaDesmontaje: string | null
  encargadoCliente: string | null
  encargadoClienteContacto: string | null
  encargadoLugar: string | null
  encargadoLugarContacto: string | null
  cliente: { nombre: string; empresa: string | null; telefono: string | null } | null
  equipos: ProyectoEquipoData[]
  equiposRiderExtra: EquipoRiderExtra[]
  logoSrc: string | null
}

// ── Styles ────────────────────────────────────────────────────────────────────

const GOLD   = '#B3985B'
const BLACK  = '#0a0a0a'
const DARK   = '#111111'
const GRAY1  = '#1a1a1a'
const GRAY5  = '#555555'
const GRAY7  = '#777777'
const WHITE  = '#ffffff'

const s = StyleSheet.create({
  page: { backgroundColor: BLACK, padding: 32, fontFamily: 'Helvetica' },
  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: GRAY1, paddingBottom: 16 },
  logo:       { width: 90, height: 24, objectFit: 'contain' },
  headerRight:{ alignItems: 'flex-end' },
  headerTitle:{ fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  headerSub:  { fontSize: 14, color: WHITE, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  headerDate: { fontSize: 8, color: GRAY7, marginTop: 3 },
  // Event grid
  gridRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 6 },
  gridCell:   { backgroundColor: DARK, borderWidth: 1, borderColor: GRAY1, borderRadius: 4, padding: 8, minWidth: 120, flex: 1 },
  gridLabel:  { fontSize: 7, color: GRAY5, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  gridValue:  { fontSize: 9, color: WHITE },
  // Section
  sectionHead:{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  sectionLine:{ flex: 1, height: 1, backgroundColor: GRAY1 },
  sectionTxt: { fontSize: 8, color: GOLD, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 10, fontFamily: 'Helvetica-Bold' },
  // Equipment card
  equipCard:  { backgroundColor: DARK, borderWidth: 1, borderColor: GRAY1, borderRadius: 5, marginBottom: 8, overflow: 'hidden' },
  equipHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: GRAY1 },
  checkBox:   { width: 12, height: 12, borderWidth: 1, borderColor: GRAY5, borderRadius: 2, marginRight: 8 },
  equipName:  { fontSize: 10, color: WHITE, flex: 1, fontFamily: 'Helvetica-Bold' },
  equipMeta:  { fontSize: 8, color: GRAY7 },
  badge:      { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: GOLD, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:   { fontSize: 8, color: GOLD, fontFamily: 'Helvetica-Bold' },
  // Accesorios grid
  accGrid:    { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6 },
  accItem:    { flexDirection: 'row', alignItems: 'center', width: '48%', backgroundColor: '#0d0d0d', borderRadius: 3, padding: 5 },
  accCheck:   { width: 10, height: 10, borderWidth: 1, borderColor: GRAY5, borderRadius: 2, marginRight: 5 },
  accTxt:     { fontSize: 8, color: GRAY7, flex: 1 },
  accQty:     { fontSize: 7, color: GOLD, marginLeft: 4 },
  // Categoria header
  catHead:    { backgroundColor: '#0d0d0d', paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: GRAY1 },
  catTxt:     { fontSize: 7, color: GRAY5, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold' },
  // Notas
  notaRow:    { paddingHorizontal: 10, paddingVertical: 5 },
  notaTxt:    { fontSize: 8, color: GRAY7, fontStyle: 'italic' },
  // Footer
  footer:     { marginTop: 32, borderTopWidth: 1, borderTopColor: GRAY1, paddingTop: 20 },
  sigRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sigBlock:   { width: '45%' },
  sigLine:    { borderBottomWidth: 1, borderBottomColor: GRAY5, marginBottom: 5 },
  sigLabel:   { fontSize: 8, color: GRAY5 },
  footerInfo: { fontSize: 7, color: GRAY5, textAlign: 'center', marginTop: 14 },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return iso }
}

function GridCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.gridCell}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridValue}>{value || '—'}</Text>
    </View>
  )
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

// ── Main PDF Component ────────────────────────────────────────────────────────

export function RiderPDF({ data }: { data: RiderPDFData }) {
  // Group equipos by category
  const categorias = new Map<string, ProyectoEquipoData[]>()
  for (const eq of data.equipos) {
    const cat = eq.equipo.categoria?.nombre ?? 'Sin categoría'
    if (!categorias.has(cat)) categorias.set(cat, [])
    categorias.get(cat)!.push(eq)
  }

  const totalEquipos = data.equipos.reduce((s, e) => s + e.cantidad, 0)
  const totalAccesorios = data.equipos.reduce((s, e) => s + e.riderAccesorios.length, 0)

  return (
    <Document
      title={`Rider de Carga — ${data.nombre}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header} fixed>
          {data.logoSrc
            ? <Image src={data.logoSrc} style={s.logo} />
            : <Text style={{ fontSize: 14, color: GOLD, fontFamily: 'Helvetica-Bold' }}>MAINSTAGE</Text>
          }
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Rider de Carga</Text>
            <Text style={s.headerSub}>{data.nombre}</Text>
            {data.fechaEvento && (
              <Text style={s.headerDate}>{fmtFecha(data.fechaEvento)}</Text>
            )}
          </View>
        </View>

        {/* ── Datos del evento ── */}
        <View style={s.gridRow}>
          <GridCell label="Cliente" value={data.cliente?.empresa ?? data.cliente?.nombre ?? '—'} />
          <GridCell label="Venue" value={data.lugarEvento ?? '—'} />
          {data.horaInicio && <GridCell label="Hora inicio" value={data.horaInicio} />}
          {data.horaMontaje && <GridCell label="Hora montaje" value={data.horaMontaje} />}
        </View>

        {(data.encargadoCliente || data.encargadoLugar) && (
          <View style={[s.gridRow, { marginBottom: 12 }]}>
            {data.encargadoCliente && (
              <GridCell label="Encargado cliente" value={`${data.encargadoCliente}${data.encargadoClienteContacto ? ` · ${data.encargadoClienteContacto}` : ''}`} />
            )}
            {data.encargadoLugar && (
              <GridCell label="Encargado lugar" value={`${data.encargadoLugar}${data.encargadoLugarContacto ? ` · ${data.encargadoLugarContacto}` : ''}`} />
            )}
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Equipos', value: String(data.equipos.length) },
            { label: 'Piezas totales', value: String(totalEquipos) },
            { label: 'Accesorios', value: String(totalAccesorios) },
          ].map(s2 => (
            <View key={s2.label} style={{ flex: 1, backgroundColor: '#0d0d0d', borderRadius: 4, padding: 8, borderWidth: 1, borderColor: GRAY1 }}>
              <Text style={{ fontSize: 7, color: GRAY5, marginBottom: 2 }}>{s2.label}</Text>
              <Text style={{ fontSize: 14, color: GOLD, fontFamily: 'Helvetica-Bold' }}>{s2.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Equipos por categoría ── */}
        <SectionHeader title="Equipos" />

        {Array.from(categorias.entries()).map(([catNombre, equipos]) => (
          <View key={catNombre} style={{ marginBottom: 10 }}>
            {/* Categoría header */}
            <View style={s.catHead}>
              <Text style={s.catTxt}>{catNombre}</Text>
            </View>

            {equipos.map(eq => (
              <View key={eq.id} style={s.equipCard}>
                {/* Equipo header */}
                <View style={s.equipHead}>
                  <View style={s.checkBox} />
                  {eq.equipo.imagenUrl ? (
                    <Image src={eq.equipo.imagenUrl} style={{ width: 32, height: 32, marginRight: 6, objectFit: 'contain' }} />
                  ) : null}
                  <Text style={s.equipName}>
                    {[eq.equipo.marca, eq.equipo.modelo].filter(Boolean).join(' ') || eq.equipo.descripcion}
                  </Text>
                  {([eq.equipo.marca, eq.equipo.modelo].filter(Boolean).join(' ') !== eq.equipo.descripcion) && (
                    <Text style={[s.equipMeta, { marginRight: 8, flex: 1 }]}>{eq.equipo.descripcion}</Text>
                  )}
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>×{eq.cantidad}</Text>
                  </View>
                </View>

                {/* Notas del equipo */}
                {eq.notas && (
                  <View style={s.notaRow}>
                    <Text style={s.notaTxt}>Nota: {eq.notas}</Text>
                  </View>
                )}

                {/* Accesorios */}
                {eq.riderAccesorios.length > 0 && (
                  <View style={s.accGrid}>
                    {eq.riderAccesorios.map(acc => (
                      <View key={acc.id} style={s.accItem}>
                        <View style={s.accCheck} />
                        <Text style={s.accTxt}>{acc.nombre}</Text>
                        {acc.cantidad > 1 && (
                          <Text style={s.accQty}>×{acc.cantidad}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* ── Equipos adicionales (rider extra) ── */}
        {data.equiposRiderExtra.length > 0 && (
          <>
            <SectionHeader title="Equipos adicionales" />
            {data.equiposRiderExtra.map(eq => (
              <View key={eq.id} style={[s.equipCard, { marginBottom: 8 }]}>
                <View style={s.equipHead}>
                  <View style={s.checkBox} />
                  <Text style={s.equipName}>{eq.descripcion}</Text>
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>×{eq.cantidad}</Text>
                  </View>
                </View>
                {eq.notas && (
                  <View style={s.notaRow}>
                    <Text style={s.notaTxt}>{eq.notas}</Text>
                  </View>
                )}
                {(eq.accesorios ?? []).length > 0 && (
                  <View style={s.accGrid}>
                    {(eq.accesorios ?? []).map(acc => (
                      <View key={acc.id} style={s.accItem}>
                        <View style={s.accCheck} />
                        <Text style={s.accTxt}>{acc.nombre}</Text>
                        {acc.cantidad > 1 && <Text style={s.accQty}>×{acc.cantidad}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.sigRow}>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Responsable de producción</Text>
            </View>
            <View style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Encargado de carga</Text>
            </View>
          </View>
          <Text style={s.footerInfo}>
            {data.nombre} · Proyecto {data.numeroProyecto} · Mainstage Pro
          </Text>
        </View>

        {/* Page number */}
        <Text
          fixed
          style={{ position: 'absolute', bottom: 16, right: 32, fontSize: 7, color: GRAY5 }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  )
}
