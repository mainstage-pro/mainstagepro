import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ReactPDF, { Document } from '@react-pdf/renderer'
import { RiderPDF } from '@/components/RiderPDF'
import React from 'react'
import path from 'path'
import fs from 'fs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

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
    },
  })

  if (!proyecto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

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
    lugarEvento: (proyecto as unknown as Record<string, unknown>).lugarEvento as string | null ?? null,
    horaInicio:  (proyecto as unknown as Record<string, unknown>).horaInicio as string | null ?? null,
    horaFin:     (proyecto as unknown as Record<string, unknown>).horaFin as string | null ?? null,
    horaMontaje: (proyecto as unknown as Record<string, unknown>).horaMontaje as string | null ?? null,
    horaDesmontaje: (proyecto as unknown as Record<string, unknown>).horaDesmontaje as string | null ?? null,
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
    equiposRiderExtra,
    logoSrc,
  }

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(RiderPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  )

  const chunks: Uint8Array[] = []
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const pdfBuffer = Buffer.concat(chunks)

  const filename = `RiderCarga-${(proyecto as unknown as Record<string, unknown>).numeroProyecto ?? id}.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
