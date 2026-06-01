export const AREA_A_PROYECTO_TAREAS: Record<string, string> = {
  ADMINISTRACION: 'cmnw6n7fr0003zpkw3gyitiih',
  MARKETING:      'cmnw6ne550005zpkw8bslxmrh',
  PRODUCCION:     'cmnw6nnti0009zpkwpiukw8tu',
  VENTAS:         'cmnw6niv80007zpkwyoaqh4qy',
  DIRECCION:      'cmnw6n11o0001zpkwtc98avmf',
}

export const PARTICIPANTES_POR_AREA: Record<string, string[]> = {
  GLOBAL: [
    'cmnrpg62h0000zmizxpydetsm', // Mauricio
    'cmo7ikcc00000oqfsqwzys8g4', // Emiliano
    'cmo6mbjqy0001eruqem29tp7k', // Sebastián
    'cmnxjcynq0000aloaylskv8g6', // Carlos
    'cmo6m8jzj0000298l2oo20o1u', // Rodrigo
    'cmp3ew8mf0000v6xkmwrbuy5w', // Zaid
    'cmo6m98n80000eruqx1tk6er4', // Daniel
  ],
  ADMINISTRACION: ['cmnrpg62h0000zmizxpydetsm', 'cmo7ikcc00000oqfsqwzys8g4'],
  MARKETING:      ['cmnrpg62h0000zmizxpydetsm', 'cmo6mbjqy0001eruqem29tp7k'],
  PRODUCCION:     ['cmnrpg62h0000zmizxpydetsm', 'cmnxjcynq0000aloaylskv8g6', 'cmo6m8jzj0000298l2oo20o1u', 'cmp3ew8mf0000v6xkmwrbuy5w'],
  VENTAS:         ['cmnrpg62h0000zmizxpydetsm'],
  DIRECCION:      ['cmnrpg62h0000zmizxpydetsm', 'cmo6m98n80000eruqx1tk6er4'],
}

export const RESPONSABLE_POR_AREA: Record<string, string> = {
  ADMINISTRACION: 'cmo7ikcc00000oqfsqwzys8g4', // Emiliano
  MARKETING:      'cmo6mbjqy0001eruqem29tp7k', // Sebastián
  PRODUCCION:     'cmnxjcynq0000aloaylskv8g6', // Carlos
  VENTAS:         'cmnrpg62h0000zmizxpydetsm', // Mauricio
  DIRECCION:      'cmnrpg62h0000zmizxpydetsm', // Mauricio
}

export const SEMANA_JUNTAS_CONFIG = [
  { area: 'GLOBAL',         tipo: 'GLOBAL_SEMANAL', hora: '10:30', duracion: 30 },
  { area: 'ADMINISTRACION', tipo: 'AREA_SEMANAL',   hora: '11:00', duracion: 30 },
  { area: 'MARKETING',      tipo: 'AREA_SEMANAL',   hora: '11:30', duracion: 30 },
  { area: 'PRODUCCION',     tipo: 'AREA_SEMANAL',   hora: '12:00', duracion: 30 },
] as const
