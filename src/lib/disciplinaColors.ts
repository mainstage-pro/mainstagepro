export const DISCIPLINA_COLORS: Record<string, string> = {
  AUDIO:       '#3B82F6',
  ILUMINACION: '#F59E0B',
  VIDEO:       '#8B5CF6',
  STAGE:       '#10B981',
  ELECTRICIDAD:'#22D3EE',
  RIGGING:     '#EF4444',
  DJ:          '#EC4899',
  PRODUCCION:  '#A3E635',
  STAFF_GENERAL: '#6B7280',
}

export const DISCIPLINA_LABELS: Record<string, string> = {
  AUDIO:       'Audio',
  ILUMINACION: 'Iluminación',
  VIDEO:       'Video',
  STAGE:       'Escenario',
  ELECTRICIDAD:'Electricidad',
  RIGGING:     'Rigging',
  DJ:          'DJ',
  PRODUCCION:  'Producción',
  STAFF_GENERAL: 'General',
}

export const DISCIPLINAS = ['AUDIO', 'ILUMINACION', 'VIDEO', 'STAGE', 'ELECTRICIDAD', 'RIGGING', 'DJ', 'PRODUCCION', 'STAFF_GENERAL'] as const
export type Disciplina = typeof DISCIPLINAS[number]
