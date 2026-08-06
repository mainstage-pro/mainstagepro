import { recurrenciaOcurreEnFecha, type RecurrenciaConfig } from '@/lib/recurrencia'

// ── Proyección de ocurrencias de tareas recurrentes ─────────────────────────────
// Fuente de verdad ÚNICA para expandir una tarea recurrente (una sola fila) en el
// rastro de ocurrencias por día. La usan tanto la Semana del equipo como el
// Rendimiento para que ambas vistas coincidan siempre en qué ocurrencia se cerró,
// cuál está pendiente y cuál está vencida.
//
// Convención de día-calendario: las tareas se guardan a medianoche UTC, así que el
// día de una fecha es su parte UTC (`toISOString().slice(0,10)`). "Hoy" se pasa como
// el día-calendario real del usuario en zona México. Comparar ambos como strings
// YYYY-MM-DD evita desfases de zona horaria.

export type OcurrenciaEstado = {
  dia: string
  completada: boolean
  vencida: boolean
  pendienteVigente: boolean
  estadoVerificacion: string | null
  noRealizada: boolean
}

export type TareaProyectable = {
  fecha: Date | null
  createdAt: Date | null
  estado: string
  recurrencia: string | null
  evidenciasHistorial: string | null
}

type HistEntry = {
  fechaOcurrencia?: string | null
  estadoVerificacion?: string | null
  noRealizada?: boolean
}

/** Día-calendario (YYYY-MM-DD) en UTC de un DateTime guardado a medianoche UTC. */
export function diaCalUTC(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Medianoche LOCAL del día: `recurrenciaOcurreEnFecha` lee getDay()/getDate() en
// hora local, así que se construye sin sufijo 'Z' para que el día coincida.
function fechaLocalDeDia(dia: string): Date {
  return new Date(`${dia}T00:00:00`)
}

/** Parsea el JSON de recurrencia; null si no es una config válida. */
export function parseRecurrencia(raw: string | null | undefined): RecurrenciaConfig | null {
  if (!raw) return null
  try {
    const cfg = JSON.parse(raw) as RecurrenciaConfig
    return cfg && cfg.tipo ? cfg : null
  } catch {
    return null
  }
}

/**
 * Expande una tarea recurrente en el estado de su ocurrencia para cada día de
 * `dias` (lista de YYYY-MM-DD). Reglas, en orden:
 *   · Día con entrada en `evidenciasHistorial` → COMPLETADA con su verificación /
 *     no-realizada (lo que de verdad pasó ese día).
 *   · Día == `fecha` viva → la ocurrencia actual (vencida si su día ya pasó).
 *   · Día del patrón ANTERIOR a la fecha viva sin historial → COMPLETADA: la fila
 *     ya avanzó más allá, así que esa ocurrencia se cerró (registros previos al
 *     historial). Se omiten días anteriores a la creación de la tarea.
 *   · Día del patrón POSTERIOR a la fecha viva → pendiente por venir.
 * Si la tarea no es recurrente devuelve [] (el llamador la trata como fecha única).
 */
export function proyectarOcurrencias(
  t: TareaProyectable,
  dias: string[],
  hoyStr: string,
): OcurrenciaEstado[] {
  const cfg = parseRecurrencia(t.recurrencia)
  if (!cfg) return []

  const setDias = new Set(dias)
  const histPorDia = new Map<string, HistEntry>()
  try {
    const parsed = t.evidenciasHistorial ? JSON.parse(t.evidenciasHistorial) : []
    if (Array.isArray(parsed)) {
      for (const raw of parsed as HistEntry[]) {
        const foc = typeof raw?.fechaOcurrencia === 'string' ? raw.fechaOcurrencia.slice(0, 10) : null
        if (foc && setDias.has(foc) && !histPorDia.has(foc)) histPorDia.set(foc, raw)
      }
    }
  } catch { /* historial corrupto → se ignora */ }

  const liveDia = t.fecha ? diaCalUTC(t.fecha) : null
  const creadoDia = t.createdAt ? diaCalUTC(t.createdAt) : null
  const out: OcurrenciaEstado[] = []

  for (const dia of dias) {
    const hist = histPorDia.get(dia)
    if (hist) {
      out.push({
        dia,
        completada: true,
        vencida: false,
        pendienteVigente: false,
        estadoVerificacion: hist.estadoVerificacion ?? null,
        noRealizada: hist.noRealizada ?? false,
      })
      continue
    }
    // La ocurrencia viva se muestra en su `fecha` aunque el patrón no la marque.
    if (dia === liveDia) {
      const completada = t.estado === 'COMPLETADA'
      const vencida = !completada && dia < hoyStr
      out.push({
        dia,
        completada,
        vencida,
        pendienteVigente: !completada && !vencida,
        estadoVerificacion: null,
        noRealizada: false,
      })
      continue
    }
    if (!recurrenciaOcurreEnFecha(cfg, fechaLocalDeDia(dia))) continue
    if (creadoDia && dia < creadoDia) continue
    if (liveDia && dia < liveDia) {
      out.push({
        dia,
        completada: true,
        vencida: false,
        pendienteVigente: false,
        estadoVerificacion: null,
        noRealizada: false,
      })
      continue
    }
    const vencida = t.estado !== 'COMPLETADA' && dia < hoyStr
    out.push({
      dia,
      completada: false,
      vencida,
      pendienteVigente: !vencida,
      estadoVerificacion: null,
      noRealizada: false,
    })
  }

  return out
}
