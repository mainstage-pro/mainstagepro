import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ReactPDF, { Document } from '@react-pdf/renderer'
import { PlanMontajePDF } from '@/components/PlanMontajePDF'
import {
  aplanarPosiciones,
  cargaElectricaPorZona,
  cargaElectricaTotal,
  ordenDeCarga,
  planPorDisciplina,
  resumenRigging,
} from '@/lib/montaje-reportes'
import React from 'react'
import path from 'path'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      numeroProyecto: true,
      nombre: true,
      fechaEvento: true,
      fechaMontaje: true,
      horaMontaje: true,
      lugarEvento: true,
      direccionVenue: true,
      encargado: { select: { name: true } },
      equipos: {
        select: {
          tipo: true,
          cantidad: true,
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              modelo: true,
              amperajeRequerido: true,
              voltajeRequerido: true,
              categoria: { select: { nombre: true, disciplina: true } },
            },
          },
          posiciones: { orderBy: { orden: 'asc' } },
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!proyecto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const filas = aplanarPosiciones(proyecto.equipos)
  const carga = cargaElectricaPorZona(filas)

  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
    : null

  const data = {
    numeroProyecto: proyecto.numeroProyecto,
    nombre: proyecto.nombre,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    fechaMontaje: proyecto.fechaMontaje?.toISOString() ?? null,
    horaMontaje: proyecto.horaMontaje,
    lugarEvento: proyecto.lugarEvento,
    direccionVenue: proyecto.direccionVenue,
    encargado: proyecto.encargado?.name ?? null,
    logoSrc,
    plan: planPorDisciplina(filas),
    carga,
    cargaTotal: cargaElectricaTotal(carga),
    rigging: resumenRigging(filas),
    ordenCarga: ordenDeCarga(proyecto.equipos),
  }

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(PlanMontajePDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  )

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    pdfStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    pdfStream.on('error', reject)
    pdfStream.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const filename = `PlanMontaje-${proyecto.numeroProyecto}.pdf`
  const isPreview = req.nextUrl?.searchParams?.get('preview') === '1'

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${isPreview ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
