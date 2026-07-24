import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { computeRendimiento, rangoPreset, type PresetPeriodo } from '@/lib/rendimiento'

const PRESETS: PresetPeriodo[] = ['semana', 'semana-pasada', '4-semanas', 'mes']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const desdeParam = sp.get('desde')
  const hastaParam = sp.get('hasta')
  const presetParam = sp.get('preset') as PresetPeriodo | null

  let desde: string, hasta: string
  if (desdeParam && hastaParam) {
    desde = desdeParam
    hasta = hastaParam
  } else {
    const preset = PRESETS.includes(presetParam as PresetPeriodo) ? (presetParam as PresetPeriodo) : 'semana'
    ;({ desde, hasta } = rangoPreset(preset))
  }

  const data = await computeRendimiento({ desde, hasta })
  return NextResponse.json({ ...data, currentUserId: session.id })
}
