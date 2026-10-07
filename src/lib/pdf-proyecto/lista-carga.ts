import { prisma } from '@/lib/prisma'
import { Document } from '@react-pdf/renderer'
import { RiderPDF } from '@/components/RiderPDF'
import { makePdfImageResolver } from '@/components/pdf/PdfShared'
import { sembrarNotasEquiposProyecto } from '@/lib/notas-equipos'
import { notaVisibleDeCotizacion, lineasAdicionalesDeCotizacion } from '@/lib/rider-cotizacion'
import { resumenMontaje } from '@/lib/montaje-reportes'
import { selloDeServicio } from '@/lib/servicios-trato'
import { bufferDePdf, type PdfProyecto } from './render'
import React from 'react'
import path from 'path'
import fs from 'fs'

export async function generarListaCarga(id: string): Promise<PdfProyecto | null> {
  // Auto-siembra notas de equipo desde la cotización antes de armar el rider.
  await sembrarNotasEquiposProyecto(id)

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: {
        select: { nombre: true, empresa: true, telefono: true, correo: true },
      },
      equipos: {
        // Lo que se quitó de la cotización no viaja en el documento de carga.
        where: { necesitaRevision: false },
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              modelo: true,
              imagenUrl: true,
              categoria: { select: { nombre: true, disciplina: true } },
            },
          },
          riderAccesorios: {
            orderBy: { orden: 'asc' },
          },
          posiciones: { orderBy: { orden: 'asc' } },
        },
        orderBy: { id: 'asc' },
      },
      cotizacion: {
        select: {
          numeroCotizacion: true,
          lineas: {
            select: { id: true, tipo: true, descripcion: true, marca: true, cantidad: true, notas: true, equipoId: true },
            orderBy: { id: 'asc' },
          },
        },
      },
    },
  })

  if (!proyecto) return null

  // Renta context: distinguir servicio de renta y su modalidad de entrega
  const tipoServicio = (proyecto as unknown as Record<string, unknown>).tipoServicio as string | null ?? null
  const esRenta = tipoServicio === 'RENTA'
  const logisticaRenta = (proyecto as unknown as Record<string, unknown>).logisticaRenta
  const rawLogistica = typeof logisticaRenta === 'string' ? logisticaRenta : null
  const selloServicio = selloDeServicio(tipoServicio, rawLogistica)
  let modalidadEntrega: string | null = null
  try {
    if (rawLogistica) {
      const rd = JSON.parse(rawLogistica) as Record<string, string>
      modalidadEntrega = rd.entrega ?? rd.modalidadEntrega ?? null
    }
  } catch { /* ignore */ }

  // Parse equiposRiderExtra JSON field
  type EquipoRiderExtra = {
    id: string; descripcion: string; cantidad: number
    notas: string; completado: boolean
    accesorios?: { id: string; nombre: string; cantidad: number }[]
    montaje?: string; proveedor?: string; cotLineaId?: string
  }
  let equiposRiderExtra: EquipoRiderExtra[] = []
  try {
    const raw = (proyecto as unknown as Record<string, unknown>).equiposRiderExtra
    if (typeof raw === 'string' && raw) equiposRiderExtra = JSON.parse(raw)
    else if (Array.isArray(raw)) equiposRiderExtra = raw as EquipoRiderExtra[]
  } catch { /* ignore */ }

  // Load logo as base64
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
    : null

  // Load icon fallback (used when equipment has no image)
  const iconPath = path.join(process.cwd(), 'public', 'logo-icon.png')
  const logoIconSrc = fs.existsSync(iconPath)
    ? `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`
    : null

  // Las imágenes de equipo viven en Vercel Blob o en /public; ambas se bajan a data URI
  // antes de llegar a react-pdf. Si no hay imagen se cae al ícono de Mainstage.
  const resolvePdfImg = makePdfImageResolver(path.join(process.cwd(), 'public'))
  const imagenPorEquipo = new Map<string, string | null>()
  await Promise.all(
    proyecto.equipos.map(async eq => {
      const src = (eq.equipo as unknown as Record<string, unknown>).imagenUrl as string | null
      imagenPorEquipo.set(eq.id, (await resolvePdfImg(src)) ?? logoIconSrc)
    })
  )

  // Serialize dates
  const data = {
    numeroProyecto: (proyecto as unknown as Record<string, unknown>).numeroProyecto as string ?? '',
    nombre: proyecto.nombre,
    fechaEvento: (proyecto.fechaEvento as Date | null)?.toISOString() ?? null,
    fechaMontaje: (proyecto as unknown as Record<string, unknown>).fechaMontaje instanceof Date
      ? ((proyecto as unknown as Record<string, unknown>).fechaMontaje as Date).toISOString()
      : null,
    lugarEvento: (proyecto as unknown as Record<string, unknown>).lugarEvento as string | null ?? null,
    horaInicio:  (proyecto as unknown as Record<string, unknown>).horaInicio as string | null ?? null,
    horaFin:     (proyecto as unknown as Record<string, unknown>).horaFin as string | null ?? null,
    horaMontaje: (proyecto as unknown as Record<string, unknown>).horaMontaje as string | null ?? null,
    horaDesmontaje: (proyecto as unknown as Record<string, unknown>).horaDesmontaje as string | null ?? null,
    direccionVenue: (proyecto as unknown as Record<string, unknown>).direccionVenue as string | null ?? null,
    linkMaps: (proyecto as unknown as Record<string, unknown>).linkMaps as string | null ?? null,
    indicacionesAcceso: (proyecto as unknown as Record<string, unknown>).indicacionesAcceso as string | null ?? null,
    horaSalidaBodega: (proyecto as unknown as Record<string, unknown>).horaSalidaBodega as string | null ?? null,
    puntoSalidaBodega: (proyecto as unknown as Record<string, unknown>).puntoSalidaBodega as string | null ?? null,
    choferNombre: (proyecto as unknown as Record<string, unknown>).choferNombre as string | null ?? null,
    contactosEmergencia: (proyecto as unknown as Record<string, unknown>).contactosEmergencia as string | null ?? null,
    encargadoCliente: (proyecto as unknown as Record<string, unknown>).encargadoCliente as string | null ?? null,
    encargadoClienteContacto: (proyecto as unknown as Record<string, unknown>).encargadoClienteContacto as string | null ?? null,
    encargadoLugar: (proyecto as unknown as Record<string, unknown>).encargadoLugar as string | null ?? null,
    encargadoLugarContacto: (proyecto as unknown as Record<string, unknown>).encargadoLugarContacto as string | null ?? null,
    cliente: proyecto.cliente
      ? {
          nombre: proyecto.cliente.nombre,
          empresa: (proyecto.cliente as unknown as Record<string, unknown>).empresa as string | null ?? null,
          telefono: proyecto.cliente.telefono,
        }
      : null,
    equipos: proyecto.equipos.map(eq => ({
      id: eq.id,
      tipo: (eq as unknown as Record<string, unknown>).tipo as string ?? 'PROPIO',
      cantidad: eq.cantidad,
      notas: (eq as unknown as Record<string, unknown>).notas as string | null ?? null,
      montaje: resumenMontaje(eq.posiciones, eq.equipo.categoria?.nombre, eq.equipo.categoria?.disciplina),
      equipo: {
        descripcion: eq.equipo.descripcion,
        marca: eq.equipo.marca,
        modelo: (eq.equipo as unknown as Record<string, unknown>).modelo as string | null ?? null,
        imagenUrl: imagenPorEquipo.get(eq.id) ?? logoIconSrc,
        categoria: eq.equipo.categoria ? { nombre: eq.equipo.categoria.nombre } : null,
      },
      riderAccesorios: eq.riderAccesorios.map(a => ({
        id: a.id,
        nombre: a.nombre,
        cantidad: a.cantidad,
        categoria: a.categoria,
        completado: a.completado,
      })),
    })),
    equiposRiderExtra: (() => {
      // Dedup equiposRiderExtra against proyecto.equipos (by normalized description)
      const equiposKeys = new Set(
        proyecto.equipos.flatMap(eq => {
          const keys: string[] = []
          const desc = eq.equipo.descripcion.toLowerCase().replace(/\s+/g, ' ').trim()
          const marca = (eq.equipo.marca ?? '').toLowerCase().trim()
          const modelo = ((eq.equipo as unknown as Record<string, unknown>).modelo as string | null ?? '').toLowerCase().trim()
          if (desc) keys.push(desc)
          if (marca && modelo) keys.push(`${marca} ${modelo}`)
          if (modelo) keys.push(modelo)
          return keys
        })
      )
      const seenExtra = new Set<string>()
      return equiposRiderExtra.filter(ex => {
        const key = ex.descripcion.toLowerCase().replace(/\s+/g, ' ').trim()
        // Skip if duplicate within equiposRiderExtra
        if (seenExtra.has(key)) return false
        seenExtra.add(key)
        // La fila sembrada desde la cotización es la buena: no se coteja contra nada.
        if (ex.cotLineaId) return true
        // Skip if already in proyecto.equipos
        return ![...equiposKeys].some(k => k === key || k.includes(key) || key.includes(k))
      })
    })(),
    cotizacionLineas: (() => {
      // Build a set of equipoIds already represented in proyecto.equipos
      const equipoIdsEnProyecto = new Set(
        proyecto.equipos.map(eq => eq.equipoId)
      )
      // Build a set of normalized descriptions from proyecto.equipos for fallback matching
      const equiposDescNorm = new Set(
        proyecto.equipos.flatMap(eq => {
          const keys: string[] = []
          const desc = eq.equipo.descripcion.toLowerCase().replace(/\s+/g, ' ').trim()
          const marca = (eq.equipo.marca ?? '').toLowerCase().trim()
          const modelo = ((eq.equipo as unknown as Record<string, unknown>).modelo as string | null ?? '').toLowerCase().trim()
          if (desc) keys.push(desc)
          if (marca && modelo) keys.push(`${marca} ${modelo}`)
          if (modelo) keys.push(modelo)
          return keys
        })
      )
      const seenLineas = new Set<string>()
      type CotLinea = { id: string; tipo: string; descripcion: string; marca: string | null; cantidad: number; notas: string | null; equipoId?: string | null }
      return lineasAdicionalesDeCotizacion({
        lineas: (proyecto.cotizacion?.lineas ?? []) as CotLinea[],
        equipoIdsEnRider: equipoIdsEnProyecto,
        cotLineaIdsSembrados: equiposRiderExtra.flatMap(ex => ex.cotLineaId ? [ex.cotLineaId] : []),
        hayInventario: proyecto.equipos.length > 0,
      })
        .filter((l: CotLinea) => {
          // Fallback: skip if description matches any equipo already shown
          const descNorm = l.descripcion.toLowerCase().replace(/\s+/g, ' ').trim()
          if ([...equiposDescNorm].some(k => k === descNorm || k.includes(descNorm) || descNorm.includes(k))) return false
          // Dedup within cotizacionLineas itself
          if (seenLineas.has(descNorm)) return false
          seenLineas.add(descNorm)
          return true
        })
        .map((l: CotLinea) => ({
          id: l.id,
          tipo: l.tipo,
          descripcion: l.descripcion,
          marca: l.marca,
          cantidad: l.cantidad,
          notas: notaVisibleDeCotizacion(l.notas),
        }))
    })(),
    logoSrc,
    esRenta,
    modalidadEntrega,
    selloServicio,
  }

  const buf = await bufferDePdf(
    React.createElement(RiderPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  )

  const numero = (proyecto as unknown as Record<string, unknown>).numeroProyecto ?? id
  return { buf, filename: `ListaCarga-${numero}.pdf` }
}
