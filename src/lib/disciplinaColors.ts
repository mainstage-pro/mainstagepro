export const DISCIPLINA_COLORS: Record<string, string> = {
  AUDIO:       '#3B82F6',
  ILUMINACION: '#F59E0B',
  VIDEO:       '#8B5CF6',
  RIGGING:     '#EF4444',
  STAGE:       '#10B981',
  STAFF_GENERAL: '#6B7280',
}

export const DISCIPLINA_LABELS: Record<string, string> = {
  AUDIO:       'Audio',
  ILUMINACION: 'Iluminaci\u00f3n',
  VIDEO:       'Video',
  RIGGING:     'Rigging',
  STAGE:       'Stage',
  STAFF_GENERAL: 'Staff General',
}

export const DISCIPLINAS = ['AUDIO', 'ILUMINACION', 'VIDEO', 'RIGGING', 'STAGE', 'STAFF_GENERAL'] as const
export type Disciplina = typeof DISCIPLINAS[number]
