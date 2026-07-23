import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ReactPDF, { Document } from '@react-pdf/renderer'
import { RiderPDF } from '@/components/RiderPDF'
import { sembrarNotasEquiposProyecto } from '@/lib/notas-equipos'
import React from 'react'
import path from 'path'
import fs from 'fs'

export async function GET(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  // Auto-siembra notas de equipo desde la cotización antes de armar el rider.
  await sembrarNotasEquiposProyecto(id)

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: {
        select: { nombre: true, empresa: true, telefono: true, correo: true },
      },
      equipos: {
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              modelo: true,
              imagenUrl: true,
              categoria: { select: { nombre: true } },
            },
          },
          riderAccesorios: {
            orderBy: { orden: 'asc' },
          },
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

  if (!proyecto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Renta context: distinguir servicio de renta y su modalidad de entrega
  const tipoServicio = (proyecto as unknown as Record<string, unknown>).tipoServicio as string | null ?? null
  const esRenta = tipoServicio === 'RENTA'
  let modalidadEntrega: string | null = null
  try {
    const rawLog = (proyecto as unknown as Record<string, unknown>).logisticaRenta
    if (typeof rawLog === 'string' && rawLog) {
      const rd = JSON.parse(rawLog) as Record<string, string>
      modalidadEntrega = rd.entrega ?? rd.modalidadEntrega ?? null
    }
  } catch { /* ignore */ }

  // Parse equiposRiderExtra JSON field
  type EquipoRiderExtra = {
    id: string; descripcion: string; cantidad: number
    notas: string; completado: boolean
    accesorios?: { id: string; nombre: string; cantidad: number }[]
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

  // Resolve relative /public paths to base64 for @react-pdf/renderer (runs server-side, no browser context)
  function resolveImg(url: string | null | undefined): string | null {
    if (!url) return logoIconSrc  // fallback to Mainstage icon
    if (url.startsWith('data:')) return url  // already base64
    if (url.startsWith('/')) {
      const filePath = path.join(process.cwd(), 'public', url)
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).slice(1).toLowerCase()
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
      }
    }
    return logoIconSrc  // fallback if file not found
  }

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
      equipo: {
        descripcion: eq.equipo.descripcion,
        marca: eq.equipo.marca,
        modelo: (eq.equipo as unknown as Record<string, unknown>).modelo as string | null ?? null,
        imagenUrl: resolveImg((eq.equipo as unknown as Record<string, unknown>).imagenUrl as string | null),
        categoria: eq.equipo.categoria,
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
        // Skip if already in proyecto.equipos
        if ([...equiposKeys].some(k => k === key || k.includes(key) || key.includes(k))) return false
        // Skip if duplicate within equiposRiderExtra
        if (seenExtra.has(key)) return false
        seenExtra.add(key)
        return true
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
      return (proyecto.cotizacion?.lineas ?? [] as CotLinea[])
        .filter((l: CotLinea) => ['EQUIPO_EXTERNO', 'OTRO'].includes(l.tipo) && !!l.descripcion)
        .filter((l: CotLinea) => {
          // Skip if this line's equipo is already a ProyectoEquipo
          if (l.equipoId && equipoIdsEnProyecto.has(l.equipoId)) return false
          // Fallback: skip if description matches any equipo already shown
          const descNorm = l.descripcion.toLowerCase().replace(/\s+/g, ' ').trim()
          if ([...equiposDescNorm].some(k => k === descNorm || k.includes(descNorm) || descNorm.includes(k))) return false
          // Dedup within cotizacionLineas itself
          if (seenLineas.has(descNorm)) return false
          seenLineas.add(descNorm)
          return true
        }) as { id: string; tipo: string; descripcion: string; marca: string | null; cantidad: number; notas: string | null }[]
    })(),
    logoSrc,
    esRenta,
    modalidadEntrega,
  }

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(RiderPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  )

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const filename = `RiderCarga-${(proyecto as unknown as Record<string, unknown>).numeroProyecto ?? id}.pdf`

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}

