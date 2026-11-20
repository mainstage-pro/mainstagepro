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

/**
 * El mismo color de cada disciplina, oscurecido para papel: los tonos de
 * pantalla se lavan en una impresora láser y en blanco y negro se confunden.
 */
export const DISCIPLINA_COLORS_PRINT: Record<string, string> = {
  AUDIO:       '#1d4ed8',
  ILUMINACION: '#b45309',
  VIDEO:       '#6d28d9',
  STAGE:       '#047857',
  ELECTRICIDAD:'#0e7490',
  RIGGING:     '#b91c1c',
  DJ:          '#be185d',
  PRODUCCION:  '#4d7c0f',
  STAFF_GENERAL: '#4b5563',
}

/**
 * Palabras que delatan la disciplina cuando el puesto no trae una del catálogo
 * (rol escrito a mano en "Rol en el evento"). El orden importa: lo primero que
 * coincide gana, así "operador de video mapping" no cae en DJ ni en general.
 */
const PALABRAS_DISCIPLINA: [Disciplina, RegExp][] = [
  ['ELECTRICIDAD',/el[eé]ctric|planta de luz|energ|planta|generador|corriente/i],
  ['ILUMINACION', /ilumina|luces|\bluz\b|lighting|\bld\b|grandma|robotic|seguidor/i],
  ['VIDEO',       /video|v[ií]deo|pantalla|led wall|proyecci|c[aá]mara|vj\b|mapping|streaming|resolume/i],
  ['AUDIO',       /audio|sonido|\bfoh\b|monitores|microfon|\bpa\b|backline|\brf\b/i],
  ['RIGGING',     /rigg|motor|polipasto|truss|estructura/i],
  ['DJ',          /\bdj\b|deejay/i],
  ['PRODUCCION',  /producci|productor|coordina|stage manager|jefe de/i],
  ['STAGE',       /escenario|stage|tarima|carpinter|escenograf/i],
  ['STAFF_GENERAL', /staff|general|carga|cargador|ayudante|auxiliar|runner|chofer/i],
]

/**
 * La disciplina de un puesto: la del rol del catálogo si la tiene; si no, la
 * que se lea en los textos (nombre del rol, rol en el evento). `null` cuando no
 * hay manera de saberla — mejor sin color que con uno equivocado.
 */
export function disciplinaDePuesto(
  disciplinaCatalogo: string | null | undefined,
  ...textos: (string | null | undefined)[]
): Disciplina | null {
  if (disciplinaCatalogo && (DISCIPLINAS as readonly string[]).includes(disciplinaCatalogo)) {
    return disciplinaCatalogo as Disciplina
  }
  const texto = textos.filter(Boolean).join(' ')
  if (!texto.trim()) return null
  for (const [d, re] of PALABRAS_DISCIPLINA) if (re.test(texto)) return d
  return null
}
