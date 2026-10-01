import React from 'react'
import {
  Document, Page, View, Text, Image, Link, StyleSheet,
} from '@react-pdf/renderer'
import { fmt24to12 } from '@/lib/hora'

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
  tipo: string  // 'PROPIO' | 'EXTERNO'
  cantidad: number
  notas: string | null
  montaje?: string
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
  fechaMontaje: string | null
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
  cotizacionLineas: { id: string; tipo: string; descripcion: string; marca: string | null; cantidad: number; notas: string | null }[]
  logoSrc: string | null
  direccionVenue: string | null
  linkMaps: string | null
  indicacionesAcceso: string | null
  horaSalidaBodega: string | null
  puntoSalidaBodega: string | null
  choferNombre: string | null
  contactosEmergencia: string | null
  esRenta?: boolean
  modalidadEntrega?: string | null
}

// ── Styles ────────────────────────────────────────────────────────────────────

const GOLD   = '#9A7A3F'  // gold oscurecido para legibilidad en blanco
const WHITE  = '#ffffff'  // fondo de página
const LIGHT1 = '#f8f8f8'  // fondo de tarjetas
const LIGHT2 = '#f0f0f0'  // fondo accesorios / stats
const BORDER = '#e0e0e0'  // bordes
const INK1   = '#111111'  // texto principal
const INK5   = '#555555'  // texto secundario
const INK8   = '#888888'  // texto tenue

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, padding: 32, fontFamily: 'Helvetica' },
  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1.5, borderBottomColor: INK1, paddingBottom: 16 },
  logo:       { width: 90, height: 24, objectFit: 'contain' },
  headerRight:{ alignItems: 'flex-end' },
  headerTitle:{ fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  headerSub:  { fontSize: 14, color: INK1, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  headerDate: { fontSize: 8, color: INK5, marginTop: 3 },
  // Panel de datos del evento — una sola caja con columnas alineadas
  infoPanel:  { borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  infoRow:    { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, alignItems: 'stretch' },
  infoCell:   { paddingHorizontal: 9, paddingVertical: 7 },
  infoCellDiv:{ borderRightWidth: 0.5, borderRightColor: BORDER },
  infoLabel:  { fontSize: 6.5, color: INK8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2.5, fontFamily: 'Helvetica-Bold' },
  infoValue:  { fontSize: 9, color: INK1 },
  infoSub:    { fontSize: 7.5, color: INK5, marginTop: 2 },
  infoLink:   { fontSize: 7.5, color: GOLD, marginTop: 2, textDecoration: 'none' },
  resumenNum: { fontSize: 13, color: INK1, fontFamily: 'Helvetica-Bold' },
  // Section
  sectionHead:{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  sectionLine:{ flex: 1, height: 1, backgroundColor: BORDER },
  sectionTxt: { fontSize: 8, color: GOLD, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 10, fontFamily: 'Helvetica-Bold' },
  // Equipment card
  equipCard:  { backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 5, marginBottom: 8, overflow: 'hidden' },
  equipHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER },
  checkBox:   { width: 12, height: 12, borderWidth: 1.5, borderColor: INK5, borderRadius: 2, marginRight: 8 },
  equipName:  { fontSize: 10, color: INK1, flex: 1, fontFamily: 'Helvetica-Bold' },
  equipMeta:  { fontSize: 8, color: INK8 },
  // La cantidad va en negro: es el dato que se lee en bodega sobre papel impreso.
  badge:      { backgroundColor: LIGHT1, borderWidth: 1, borderColor: INK1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:   { fontSize: 8, color: INK1, fontFamily: 'Helvetica-Bold' },
  // Accesorios grid
  accGrid:    { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6, backgroundColor: LIGHT1 },
  accItem:    { flexDirection: 'row', alignItems: 'center', width: '48%', backgroundColor: LIGHT2, borderRadius: 3, padding: 5 },
  accCheck:   { width: 10, height: 10, borderWidth: 1, borderColor: INK5, borderRadius: 2, marginRight: 5 },
  accTxt:     { fontSize: 8, color: INK5, flex: 1 },
  accQty:     { fontSize: 7, color: INK1, marginLeft: 4, fontFamily: 'Helvetica-Bold' },
  // Categoria header
  catHead:    { backgroundColor: INK1, paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  catTxt:     { fontSize: 7, color: WHITE, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold' },
  // Notas
  notaRow:    { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: LIGHT1 },
  notaTxt:    { fontSize: 8, color: INK5, fontStyle: 'italic' },
  montajeRow: { paddingHorizontal: 10, paddingTop: 3, paddingBottom: 4 },
  montajeTxt: { fontSize: 7.5, color: GOLD },
  // Footer
  footer:     { marginTop: 32, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 20 },
  sigRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sigBlock:   { width: '45%' },
  sigLine:    { borderBottomWidth: 1, borderBottomColor: INK5, marginBottom: 5 },
  sigLabel:   { fontSize: 8, color: INK5 },
  footerInfo: { fontSize: 7, color: INK8, textAlign: 'center', marginTop: 14 },
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

function fmtFechaCorta(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
    })
  } catch { return iso }
}

/** Una celda del panel de datos. `peso` reparte el ancho de la fila. */
type InfoCelda = { label: string; value: string; sub?: string; link?: string; peso?: number }

function InfoRow({ celdas }: { celdas: InfoCelda[] }) {
  const total = celdas.reduce((a, c) => a + (c.peso ?? 1), 0)
  return (
    <View style={s.infoRow} wrap={false}>
      {celdas.map((c, i) => (
        <View
          key={c.label}
          style={[
            s.infoCell,
            { width: `${((c.peso ?? 1) / total) * 100}%` },
            i < celdas.length - 1 ? s.infoCellDiv : {},
          ]}
        >
          <Text style={s.infoLabel}>{c.label}</Text>
          <Text style={s.infoValue}>{c.value || '—'}</Text>
          {c.sub
            ? c.link
              ? <Link src={c.link} style={s.infoLink}>{c.sub}</Link>
              : <Text style={s.infoSub}>{c.sub}</Text>
            : null}
        </View>
      ))}
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

  const filasInfo: InfoCelda[][] = [[
    { label: 'Cliente', value: data.cliente?.empresa ?? data.cliente?.nombre ?? '—' },
    { label: 'Venue', value: data.lugarEvento ?? '—' },
    { label: 'Montaje', value: fmt24to12(data.horaMontaje) || '—', sub: fmtFechaCorta(data.fechaMontaje) || fmtFechaCorta(data.fechaEvento) || undefined },
    { label: 'Inicio evento', value: fmt24to12(data.horaInicio) || '—', sub: fmtFechaCorta(data.fechaEvento) || undefined },
  ]]

  const filaLogistica: InfoCelda[] = []
  if (data.direccionVenue || data.linkMaps) {
    filaLogistica.push({
      label: 'Dirección',
      value: data.direccionVenue ?? '—',
      sub: data.linkMaps?.replace(/^https?:\/\//, '') || undefined,
      link: data.linkMaps ?? undefined,
      peso: 2,
    })
  }
  if (data.horaSalidaBodega) {
    filaLogistica.push({
      label: data.puntoSalidaBodega ? `Salida de ${data.puntoSalidaBodega}` : 'Salida de bodega',
      value: fmt24to12(data.horaSalidaBodega) || '—',
    })
  }
  if (data.choferNombre) filaLogistica.push({ label: 'Chofer', value: data.choferNombre })
  if (filaLogistica.length) filasInfo.push(filaLogistica)

  const filaEncargados: InfoCelda[] = []
  if (data.encargadoCliente) {
    filaEncargados.push({
      label: 'Encargado cliente',
      value: `${data.encargadoCliente}${data.encargadoClienteContacto ? ` · ${data.encargadoClienteContacto}` : ''}`,
    })
  }
  if (data.encargadoLugar) {
    filaEncargados.push({
      label: 'Encargado del lugar',
      value: `${data.encargadoLugar}${data.encargadoLugarContacto ? ` · ${data.encargadoLugarContacto}` : ''}`,
    })
  }
  if (filaEncargados.length) filasInfo.push(filaEncargados)

  const resumen = [
    { label: 'Equipos', value: String(data.equipos.length) },
    { label: 'Piezas totales', value: String(totalEquipos) },
    { label: 'Accesorios', value: String(totalAccesorios) },
  ]

  return (
    <Document
      title={`Lista de Carga — ${data.nombre}`}
      author="Mainstage Pro"
      creator="Mainstage Pro"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header} fixed>
          {data.logoSrc
            ? <Image src={data.logoSrc} style={s.logo} />
            : <Text style={{ fontSize: 14, color: INK1, fontFamily: 'Helvetica-Bold' }}>MAINSTAGE</Text>
          }
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Lista de Carga</Text>
            <Text style={s.headerSub}>{data.nombre}</Text>
            {data.fechaEvento && (
              <Text style={s.headerDate}>{fmtFecha(data.fechaEvento)}</Text>
            )}
          </View>
        </View>

        {/* ── Nota de aplicabilidad (solo renta) ── */}
        {data.esRenta && (
          <View style={{ backgroundColor: LIGHT1, borderWidth: 1, borderColor: GOLD, borderRadius: 4, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Aplicabilidad de la lista de carga</Text>
            <Text style={{ fontSize: 9, color: INK1, lineHeight: 1.5 }}>
              {data.modalidadEntrega === 'ENTREGA_VENUE'
                ? 'Prepara este equipo en bodega. Mainstage lo entrega directamente en el venue del evento.'
                : data.modalidadEntrega === 'ENTREGA_BODEGA'
                  ? 'Prepara este equipo en bodega. Mainstage lo entrega en la bodega del cliente.'
                  : 'Prepara este equipo en bodega. Falta definir la modalidad de entrega: confirma si nosotros lo llevamos o si el cliente lo recoge.'}
            </Text>
          </View>
        )}

        {/* ── Datos del evento: un solo panel con las columnas alineadas ── */}
        <View style={s.infoPanel}>
          {filasInfo.map((fila, i) => <InfoRow key={i} celdas={fila} />)}
          <View style={[s.infoRow, { borderBottomWidth: 0, backgroundColor: LIGHT1 }]} wrap={false}>
            {resumen.map((r, i) => (
              <View key={r.label} style={[s.infoCell, { width: '33.3333%' }, i < resumen.length - 1 ? s.infoCellDiv : {}]}>
                <Text style={s.infoLabel}>{r.label}</Text>
                <Text style={s.resumenNum}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Indicaciones de acceso ── */}
        {data.indicacionesAcceso && (
          <View style={{ backgroundColor: LIGHT1, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontSize: 7, color: INK5, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Acceso al venue</Text>
            <Text style={{ fontSize: 9, color: INK1, lineHeight: 1.5 }}>{data.indicacionesAcceso}</Text>
          </View>
        )}

        {/* ── Contactos de emergencia ── */}
        {data.contactosEmergencia && (
          <View style={{ backgroundColor: '#fff8f0', borderWidth: 1, borderColor: '#f59e0b40', borderRadius: 4, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontSize: 7, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Contactos de emergencia</Text>
            <Text style={{ fontSize: 9, color: INK1, lineHeight: 1.5 }}>{data.contactosEmergencia}</Text>
          </View>
        )}

        {/* ── Equipos por categoría ── */}
        <SectionHeader title="Equipos" />

        {Array.from(categorias.entries()).map(([catNombre, equipos]) => (
          <View key={catNombre} style={{ marginBottom: 10 }}>
            {/* Categoría header — pegado al primer equipo */}
            <View style={s.catHead} wrap={false}>
              <Text style={s.catTxt}>{catNombre}</Text>
            </View>

            {equipos.map(eq => (
              <View key={eq.id} style={s.equipCard} wrap={false}>
                {/* Equipo header */}
                  <View style={s.equipHead}>
                  <View style={s.checkBox} />
                  {eq.equipo.imagenUrl && (
                    <Image src={eq.equipo.imagenUrl} style={{ width: 36, height: 36, marginRight: 6, objectFit: 'contain' }} />
                  )}
                  <Text style={s.equipName}>
                    {[eq.equipo.marca, eq.equipo.modelo].filter(Boolean).join(' ') || eq.equipo.descripcion}
                  </Text>
                  {([eq.equipo.marca, eq.equipo.modelo].filter(Boolean).join(' ') !== eq.equipo.descripcion) && (
                    <Text style={[s.equipMeta, { marginRight: 8, flex: 1 }]}>{eq.equipo.descripcion}</Text>
                  )}
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>×{eq.cantidad}</Text>
                  </View>
                  {eq.tipo === 'EXTERNO' && (
                    <View style={{ backgroundColor: '#b4530920', borderWidth: 0.5, borderColor: '#b45309', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 4 }}>
                      <Text style={{ fontSize: 6.5, color: '#b45309', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Externo</Text>
                    </View>
                  )}
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

                {/* Montaje capturado por el coordinador */}
                {eq.montaje ? (
                  <View style={s.montajeRow}>
                    <Text style={s.montajeTxt}>{eq.montaje}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}

        {/* ── Equipos adicionales (de cotización — sin inventario propio) ── */}
        {data.cotizacionLineas.length > 0 && (
          <>
            <SectionHeader title="Equipos adicionales" />
            <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
              {data.cotizacionLineas.map((l, i) => (
                <View
                  key={l.id}
                  wrap={false}
                  style={[
                    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7 },
                    i < data.cotizacionLineas.length - 1
                      ? { borderBottomWidth: 0.5, borderBottomColor: BORDER }
                      : {},
                    i % 2 === 1 ? { backgroundColor: LIGHT1 } : {},
                  ]}
                >
                  <View style={{ width: 12, height: 12, borderWidth: 1.5, borderColor: INK5, borderRadius: 2, marginRight: 8, flexShrink: 0 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: INK1 }}>
                      {l.descripcion}{l.marca ? ` — ${l.marca}` : ''}
                    </Text>
                    {l.notas ? <Text style={{ fontSize: 7.5, color: INK8, marginTop: 1 }}>{l.notas}</Text> : null}
                  </View>
                  <View style={[s.badge, { marginLeft: 8 }]}>
                    <Text style={s.badgeTxt}>×{l.cantidad}</Text>
                  </View>
                  <Text style={{ fontSize: 7, color: l.tipo === 'EQUIPO_EXTERNO' ? '#b45309' : INK8, marginLeft: 6, width: 44, textAlign: 'right' }}>
                    {l.tipo === 'EQUIPO_EXTERNO' ? 'Tercero' : 'Adicional'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Equipos adicionales (rider extra) ── */}
        {data.equiposRiderExtra.length > 0 && (
          <>
            <SectionHeader title="Equipos adicionales" />
            {data.equiposRiderExtra.map(eq => (
              <View key={eq.id} style={[s.equipCard, { marginBottom: 8 }]} wrap={false}>
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
          style={{ position: 'absolute', bottom: 16, right: 32, fontSize: 7, color: INK8 }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  )
}
