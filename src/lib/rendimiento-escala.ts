// Escala de cumplimiento (KPI) — pura, sin dependencias de servidor.
// Segura de importar desde client components, PDF y lógica de servidor.
//
// Bandas (el número es el piso para ganar la etiqueta):
//   100      → Excelente
//   90–99    → Bueno
//   75–89    → Regular
//   < 75     → Crítico  (incluye el rango "bajísimo" ≤ 50)

export type BandaKey = 'excelente' | 'bueno' | 'regular' | 'critico'

export function bandaDe(pct: number): BandaKey {
  if (pct >= 100) return 'excelente'
  if (pct >= 90) return 'bueno'
  if (pct >= 75) return 'regular'
  return 'critico'
}

export const BANDA_LABEL: Record<BandaKey, string> = {
  excelente: 'Excelente',
  bueno: 'Bueno',
  regular: 'Regular',
  critico: 'Crítico',
}

// Hex para SVG / estilos inline (barras, PDF).
export const BANDA_HEX: Record<BandaKey, string> = {
  excelente: '#4ade80',
  bueno: '#a3e635',
  regular: '#B3985B',
  critico: '#f87171',
}

// Clases de texto Tailwind para la UI.
export const BANDA_TEXT_CLASS: Record<BandaKey, string> = {
  excelente: 'text-green-400',
  bueno: 'text-lime-400',
  regular: 'text-[#B3985B]',
  critico: 'text-red-400',
}

// Orden y umbral inferior de cada banda, para leyendas.
export const BANDA_ESCALA: { key: BandaKey; label: string; desde: number }[] = [
  { key: 'excelente', label: 'Excelente', desde: 100 },
  { key: 'bueno', label: 'Bueno', desde: 90 },
  { key: 'regular', label: 'Regular', desde: 75 },
  { key: 'critico', label: 'Crítico', desde: 0 },
]
