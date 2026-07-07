export const DISCIPLINA_COLORS: Record<string, string> = {
  AUDIO:       '#3B82F6',
  ILUMINACION: '#F59E0B',
  VIDEO:       '#8B5CF6',
  RIGGING:     '#EF4444',
  STAGE:       '#10B981',
  DJ:          '#EC4899',
  STAFF_GENERAL: '#6B7280',
}

export const DISCIPLINA_LABELS: Record<string, string> = {
  AUDIO:       'Audio',
  ILUMINACION: 'Iluminación',
  VIDEO:       'Video',
  RIGGING:     'Rigging',
  STAGE:       'Stage',
  DJ:          'DJ',
  STAFF_GENERAL: 'Staff General',
}

export const DISCIPLINAS = ['AUDIO', 'ILUMINACION', 'VIDEO', 'RIGGING', 'STAGE', 'DJ', 'STAFF_GENERAL'] as const
export type Disciplina = typeof DISCIPLINAS[number]
