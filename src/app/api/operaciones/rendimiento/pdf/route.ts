import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import ReactPDF from '@react-pdf/renderer'
import React from 'react'
import { RendimientoReportePDF, type RendimientoReporteData } from '@/components/RendimientoReportePDF'
import { computeRendimiento, rangoPreset, type PresetPeriodo } from '@/lib/rendimiento'

const PRESETS: PresetPeriodo[] = ['semana', 'semana-pasada', '4-semanas', 'mes']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const tipo = sp.get('tipo') === 'usuario' ? 'usuario' : 'general'
  const userId = sp.get('userId') || undefined

  let desde = sp.get('desde') || ''
  let hasta = sp.get('hasta') || ''
  if (!desde || !hasta) {
    const presetParam = sp.get('preset') as PresetPeriodo | null
    const preset = PRESETS.includes(presetParam as PresetPeriodo) ? (presetParam as PresetPeriodo) : 'semana'
    ;({ desde, hasta } = rangoPreset(preset))
  }

  const rend = await computeRendimiento({
    desde, hasta,
    soloUsuarioId: tipo === 'usuario' ? userId : undefined,
  })

  let data: RendimientoReporteData
  let filename: string
  if (tipo === 'usuario') {
    const usuario = rend.usuarios.find(u => u.id === userId)
    if (!usuario) return NextResponse.json({ error: 'Usuario sin tareas en el período' }, { status: 404 })
    data = {
      modo: 'usuario',
      periodoLabel: rend.periodo.label,
      resumen: rend.resumen,
      usuarios: rend.usuarios,
      fuentes: rend.fuentes,
      tendencia: rend.tendencia,
      verificacion: rend.verificacion,
      usuario,
    }
    filename = `Rendimiento-${usuario.name.replace(/\s+/g, '-')}-${desde}.pdf`
  } else {
    data = {
      modo: 'general',
      periodoLabel: rend.periodo.label,
      resumen: rend.resumen,
      usuarios: rend.usuarios,
      fuentes: rend.fuentes,
      tendencia: rend.tendencia,
      verificacion: rend.verificacion,
    }
    filename = `Rendimiento-Semanal-${desde}.pdf`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfStream = await ReactPDF.renderToStream(React.createElement(RendimientoReportePDF, { data }) as any)
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)))
    pdfStream.on('error', reject)
    pdfStream.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
