/**
 * Vocabulario de montaje: función, soporte y zona para cada posición de equipo
 * dentro de un proyecto de evento.
 *
 * Cada equipo cotizado se parte en una o más POSICIONES. Una posición responde
 * tres preguntas: para qué sirve (función), cómo se sostiene (soporte) y dónde
 * va (zona). Con eso se derivan el plan de montaje, la carga eléctrica por zona,
 * el resumen de rigging y el orden de carga.
 *
 * El perfil se resuelve por nombre de categoría; si la categoría no está
 * mapeada cae al perfil de su disciplina, y en última instancia a uno genérico.
 */

export type OpcionMontaje = {
  id: string;
  label: string;
  /** Pide altura de montaje en metros (cuelgues, torres, truss). */
  altura?: boolean;
  /** Cuenta como punto de rigging en el resumen de estructura. */
  rigging?: boolean;
};

export type PerfilMontaje = {
  funciones: OpcionMontaje[];
  soportes: OpcionMontaje[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Zonas — universales, aplican a cualquier equipo de cualquier disciplina
// ─────────────────────────────────────────────────────────────────────────────

export const ZONAS: OpcionMontaje[] = [
  { id: "ESCENARIO", label: "Escenario" },
  { id: "FRENTE_ESCENARIO", label: "Frente de escenario" },
  { id: "LATERAL_IZQ", label: "Lateral izquierdo" },
  { id: "LATERAL_DER", label: "Lateral derecho" },
  { id: "FOH", label: "FOH / control" },
  { id: "CABINA_DJ", label: "Cabina DJ" },
  { id: "PISTA", label: "Pista de baile" },
  { id: "SALON", label: "Salón / mesas" },
  { id: "BARRA", label: "Barra" },
  { id: "ACCESO", label: "Acceso / recepción" },
  { id: "BACKSTAGE", label: "Backstage / camerinos" },
  { id: "EXTERIOR", label: "Exterior / jardín" },
  { id: "CEREMONIA", label: "Área de ceremonia" },
  { id: "ACOMETIDA", label: "Acometida / planta" },
  { id: "STAGING", label: "Staging / bodega en sitio" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Soportes reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  piso: { id: "PISO", label: "Piso" },
  tripie: { id: "TRIPIE", label: "Tripié" },
  posteSub: { id: "POSTE_SUB", label: "Poste sobre subgrave" },
  tarima: { id: "TARIMA", label: "Sobre tarima / riser" },
  totem: { id: "TOTEM", label: "Torre / tótem", altura: true },
  trussTerrena: { id: "TRUSS_TERRENA", label: "Truss terrena", altura: true },
  trussVolada: { id: "TRUSS_VOLADA", label: "Truss volada", altura: true, rigging: true },
  colgadoMotor: { id: "COLGADO_MOTOR", label: "Colgado con motor / polipasto", altura: true, rigging: true },
  arrayVolado: { id: "ARRAY_VOLADO", label: "Array volado", altura: true, rigging: true },
  arrayApilado: { id: "ARRAY_APILADO", label: "Array apilado (stack)" },
  mesa: { id: "MESA", label: "Mesa" },
  rack: { id: "RACK", label: "Rack / case" },
  pared: { id: "PARED", label: "Anclado a pared" },
  techoVenue: { id: "TECHO_VENUE", label: "Techo del venue", altura: true, rigging: true },
  groundSupport: { id: "GROUND_SUPPORT", label: "Ground support", altura: true },
  estructura: { id: "ESTRUCTURA", label: "Sobre escenografía / estructura" },
} satisfies Record<string, OpcionMontaje>;

// ─────────────────────────────────────────────────────────────────────────────
// Perfiles por categoría (nombres exactos del catálogo)
// ─────────────────────────────────────────────────────────────────────────────

const PERFILES_POR_CATEGORIA: Record<string, PerfilMontaje> = {
  // ── AUDIO ────────────────────────────────────────────────────────────────
  "Equipo de Audio": {
    funciones: [
      { id: "PA_PRINCIPAL", label: "PA principal (house)" },
      { id: "PA_REFUERZO", label: "Refuerzo / delay" },
      { id: "FRONT_FILL", label: "Front fill" },
      { id: "SUBGRAVE", label: "Subgrave" },
      { id: "MONITOR_PISO", label: "Monitor de piso (wedge)" },
      { id: "SIDEFILL", label: "Sidefill" },
      { id: "MONITOR_DJ", label: "Monitoreo de cabina DJ" },
      { id: "AMBIENTACION", label: "Ambientación / zona secundaria" },
      { id: "AUDIO_CEREMONIA", label: "Audio de ceremonia" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [S.piso, S.tripie, S.posteSub, S.tarima, S.totem, S.trussVolada, S.arrayVolado, S.arrayApilado, S.colgadoMotor, S.pared],
  },
  "Consolas de Audio": {
    funciones: [
      { id: "CONSOLA_FOH", label: "Consola FOH (casa)" },
      { id: "CONSOLA_MONITORES", label: "Consola de monitores" },
      { id: "STAGEBOX", label: "Stagebox / snake digital" },
      { id: "SUBMEZCLA", label: "Submezcla" },
      { id: "MESA_CONTROL", label: "Mesa de control" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [S.mesa, S.rack, S.tarima, S.piso],
  },
  "Sistemas de Microfonía": {
    funciones: [
      { id: "VOZ_PRINCIPAL", label: "Voz principal" },
      { id: "VOZ_APOYO", label: "Voz de apoyo / coros" },
      { id: "MC_PRESENTADOR", label: "MC / presentador" },
      { id: "CEREMONIA", label: "Ceremonia / oficiante" },
      { id: "INSTRUMENTO", label: "Instrumento" },
      { id: "BATERIA", label: "Batería (bombo/tarola/overhead)" },
      { id: "AMBIENTE", label: "Ambiente / audiencia" },
      { id: "DI_LINEA", label: "DI / línea" },
      { id: "RECEPTOR", label: "Receptor / antena" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [
      { id: "PEDESTAL_RECTO", label: "Pedestal recto" },
      { id: "PEDESTAL_BOOM", label: "Pedestal con boom" },
      { id: "PEDESTAL_CORTO", label: "Pedestal corto" },
      { id: "PINZA", label: "Pinza a instrumento" },
      { id: "MANO", label: "De mano (inalámbrico)" },
      { id: "SOLAPA_DIADEMA", label: "Solapa / diadema" },
      { id: "ATRIL", label: "Atril / pódium" },
      S.piso,
      S.rack,
      S.mesa,
    ],
  },
  "Monitoreo In-Ear": {
    funciones: [
      { id: "IEM_MUSICO", label: "IEM músico / artista" },
      { id: "IEM_STAFF", label: "IEM staff / coordinación" },
      { id: "TRANSMISOR", label: "Transmisor / antena" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [S.rack, { id: "CINTO", label: "Cinto del músico (bodypack)" }, S.mesa, S.tarima],
  },

  // ── DJ ───────────────────────────────────────────────────────────────────
  "Consolas/Equipo para DJ": {
    funciones: [
      { id: "DJ_PRINCIPAL", label: "Setup DJ principal" },
      { id: "DJ_SECUNDARIO", label: "Setup DJ secundario / B2B" },
      { id: "EFECTOS", label: "Efectos / controlador extra" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [
      { id: "BOOTH", label: "Dentro del booth" },
      { id: "MESA_DJ", label: "Mesa / table top" },
      S.tarima,
      S.rack,
    ],
  },
  "DJ Booths": {
    funciones: [
      { id: "BOOTH_PRINCIPAL", label: "Booth principal" },
      { id: "BOOTH_SECUNDARIO", label: "Booth secundario" },
      { id: "PODIO", label: "Podio / plataforma" },
      { id: "FRONT_DECORATIVO", label: "Front decorativo" },
    ],
    soportes: [S.piso, S.tarima, S.estructura],
  },

  // ── ILUMINACIÓN ──────────────────────────────────────────────────────────
  "Equipo de Iluminación": {
    funciones: [
      { id: "FRONT_WASH", label: "Front / luz frontal (cara)" },
      { id: "BACKLIGHT", label: "Contraluz" },
      { id: "WASH_ESCENARIO", label: "Wash de escenario" },
      { id: "WASH_SALON", label: "Wash de salón / ambientación" },
      { id: "SPOT_GOBOS", label: "Spot / gobos" },
      { id: "BEAM_AEREO", label: "Beam / efecto aéreo" },
      { id: "BLINDER_ESTROBO", label: "Blinder / estrobo" },
      { id: "PIXEL_DECORATIVO", label: "Pixel / tubo decorativo" },
      { id: "UPLIGHT", label: "Uplight / arquitectural" },
      { id: "PINSPOT_MESAS", label: "Pinspot a mesas / centros" },
      { id: "LASER", label: "Láser" },
      { id: "ATMOSFERA", label: "Atmósfera (humo / haze)" },
      { id: "LUZ_SERVICIO", label: "Luz de servicio / trabajo" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [
      S.piso,
      { id: "BASE_PISO", label: "Base de piso" },
      S.tripie,
      S.totem,
      S.trussTerrena,
      S.trussVolada,
      S.colgadoMotor,
      S.techoVenue,
      S.pared,
      S.estructura,
      { id: "MESA_CENTRO", label: "Sobre mesa / centro" },
      S.tarima,
    ],
  },
  "Consolas de Iluminación": {
    funciones: [
      { id: "CONSOLA_PRINCIPAL", label: "Consola principal" },
      { id: "CONSOLA_RESPALDO", label: "Consola de respaldo" },
      { id: "NODO_DMX", label: "Nodo DMX / Art-Net" },
      { id: "SPLITTER_DMX", label: "Splitter DMX" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [S.mesa, S.rack, S.tarima, S.piso, S.trussTerrena],
  },
  "Efectos especiales": {
    funciones: [
      { id: "MOMENTO_CLAVE", label: "Momento clave (entrada, vals, brindis)" },
      { id: "EFECTO_AMBIENTE", label: "Efecto de ambiente" },
      { id: "EFECTO_CIERRE", label: "Cierre / gran final" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [S.piso, S.tarima, S.trussTerrena, S.trussVolada, S.estructura],
  },

  // ── VIDEO ────────────────────────────────────────────────────────────────
  "Pantalla / Video": {
    funciones: [
      { id: "PANTALLA_PRINCIPAL", label: "Pantalla principal" },
      { id: "PANTALLA_LATERAL", label: "Pantalla lateral / refuerzo" },
      { id: "CONFIDENCE", label: "Confidence / retorno de presentador" },
      { id: "PROYECCION_AMBIENTE", label: "Proyección ambiental" },
      { id: "SWITCHER", label: "Switcher / control de video" },
      { id: "CAMARA", label: "Cámara" },
      { id: "FUENTE", label: "Fuente de contenido (laptop / player)" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [S.trussVolada, S.groundSupport, S.tripie, S.piso, S.tarima, S.pared, S.mesa, S.rack, S.estructura],
  },

  // ── RIGGING ──────────────────────────────────────────────────────────────
  "Rigging y Estructuras": {
    funciones: [
      { id: "TRUSS_FRONTAL", label: "Truss frontal" },
      { id: "TRUSS_TRASERA", label: "Truss trasera" },
      { id: "TRUSS_LATERAL", label: "Truss lateral" },
      { id: "TORRE", label: "Torre / tótem" },
      { id: "GROUND_SUPPORT", label: "Ground support" },
      { id: "PUNTO_CUELGUE", label: "Punto de cuelgue (motor / polipasto)" },
      { id: "SOPORTE_PANTALLA", label: "Soporte de pantalla" },
      { id: "CARPA_TECHO", label: "Carpa / techo" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [
      S.piso,
      { id: "BASE_LASTRE", label: "Base con lastre / contrapeso" },
      S.groundSupport,
      { id: "ANCLAJE_TECHO", label: "Anclaje a techo", altura: true, rigging: true },
      { id: "MOTOR", label: "Motor / polipasto", altura: true, rigging: true },
      { id: "TENSORES", label: "Tensores / vientos" },
    ],
  },

  // ── STAGE ────────────────────────────────────────────────────────────────
  Entarimado: {
    funciones: [
      { id: "ESCENARIO_PRINCIPAL", label: "Escenario principal" },
      { id: "PLATAFORMA_DJ", label: "Plataforma de DJ" },
      { id: "RISER_BATERIA", label: "Riser de batería / banda" },
      { id: "PASARELA", label: "Pasarela" },
      { id: "TARIMA_SERVICIO", label: "Tarima de servicio / FOH" },
      { id: "RAMPA_ESCALON", label: "Rampa / escalón de acceso" },
    ],
    soportes: [
      { id: "PISO_NIVELADO", label: "Piso nivelado" },
      { id: "PATAS_REGULABLES", label: "Patas regulables" },
      { id: "SOBRE_PASTO", label: "Sobre pasto / tierra" },
      { id: "SOBRE_CONCRETO", label: "Sobre concreto" },
      { id: "SOBRE_ALFOMBRA", label: "Sobre alfombra / duela" },
    ],
  },
  "Pistas de baile": {
    funciones: [
      { id: "PISTA_PRINCIPAL", label: "Pista principal" },
      { id: "PISTA_SECUNDARIA", label: "Pista secundaria" },
      { id: "PASILLO", label: "Pasillo / camino" },
    ],
    soportes: [
      { id: "PISO_NIVELADO", label: "Piso nivelado" },
      { id: "SOBRE_PASTO", label: "Sobre pasto / tierra" },
      { id: "SOBRE_CONCRETO", label: "Sobre concreto" },
      { id: "SOBRE_ALFOMBRA", label: "Sobre alfombra / duela" },
      S.tarima,
    ],
  },
  "Mamparas decorativas": {
    funciones: [
      { id: "FONDO_ESCENARIO", label: "Fondo de escenario / backdrop" },
      { id: "FRENTE_DJ", label: "Frente de cabina DJ" },
      { id: "DIVISION", label: "División de área" },
      { id: "FOTOS", label: "Muro de fotos" },
      { id: "SEÑALIZACION", label: "Señalización / branding" },
    ],
    soportes: [S.piso, { id: "BASE_LASTRE", label: "Base con lastre" }, S.estructura, S.pared, S.trussTerrena],
  },
  "Escenografía": {
    funciones: [
      { id: "FONDO_ESCENARIO", label: "Fondo de escenario / backdrop" },
      { id: "AMBIENTACION_ESC", label: "Ambientación" },
      { id: "BRANDING", label: "Branding / impresión" },
      { id: "DIVISION", label: "División de área" },
    ],
    soportes: [S.piso, { id: "BASE_LASTRE", label: "Base con lastre" }, S.estructura, S.pared, S.trussTerrena],
  },
  "Toldos y lonas": {
    funciones: [
      { id: "CUBIERTA_ESCENARIO", label: "Cubierta de escenario" },
      { id: "CUBIERTA_INVITADOS", label: "Cubierta de invitados" },
      { id: "CUBIERTA_CONTROL", label: "Cubierta de FOH / control" },
      { id: "CUBIERTA_SERVICIO", label: "Cubierta de servicio / staging" },
    ],
    soportes: [
      S.piso,
      { id: "BASE_LASTRE", label: "Base con lastre" },
      { id: "ESTACAS", label: "Estacas / anclaje a piso" },
      S.estructura,
    ],
  },

  // ── ELECTRICIDAD ─────────────────────────────────────────────────────────
  "Corriente Eléctrica": {
    funciones: [
      { id: "ACOMETIDA", label: "Acometida / alimentación principal" },
      { id: "PLANTA", label: "Planta de luz / generador" },
      { id: "DISTRIBUCION", label: "Distribución / tablero" },
      { id: "RAMAL_AUDIO", label: "Ramal de audio" },
      { id: "RAMAL_ILUMINACION", label: "Ramal de iluminación" },
      { id: "RAMAL_VIDEO", label: "Ramal de video" },
      { id: "RAMAL_SERVICIOS", label: "Ramal de servicios / terceros" },
      { id: "EXTENSION", label: "Extensión general" },
      { id: "RESPALDO", label: "Respaldo (no se monta)" },
    ],
    soportes: [
      { id: "PISO_CANALETA", label: "Piso con canaleta / tapete" },
      { id: "PISO_LIBRE", label: "Piso libre" },
      { id: "AEREO", label: "Tendido aéreo", altura: true },
      S.rack,
      S.tarima,
      { id: "MURO_TABLERO", label: "Muro / tablero del venue" },
    ],
  },

  // ── SIN DISCIPLINA ───────────────────────────────────────────────────────
  Vehículos: {
    funciones: [
      { id: "TRANSPORTE_EQUIPO", label: "Transporte de equipo" },
      { id: "TRANSPORTE_PERSONAL", label: "Transporte de personal" },
      { id: "APOYO_SITIO", label: "Apoyo en sitio" },
    ],
    soportes: [{ id: "ESTACIONAMIENTO", label: "Estacionamiento / maniobras" }, { id: "CARGA", label: "Zona de carga" }],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Perfiles por disciplina (fallback cuando la categoría no está mapeada)
// ─────────────────────────────────────────────────────────────────────────────

const PERFILES_POR_DISCIPLINA: Record<string, PerfilMontaje> = {
  AUDIO: PERFILES_POR_CATEGORIA["Equipo de Audio"],
  DJ: PERFILES_POR_CATEGORIA["Consolas/Equipo para DJ"],
  ILUMINACION: PERFILES_POR_CATEGORIA["Equipo de Iluminación"],
  VIDEO: PERFILES_POR_CATEGORIA["Pantalla / Video"],
  RIGGING: PERFILES_POR_CATEGORIA["Rigging y Estructuras"],
  STAGE: PERFILES_POR_CATEGORIA["Entarimado"],
  ELECTRICIDAD: PERFILES_POR_CATEGORIA["Corriente Eléctrica"],
};

const PERFIL_GENERICO: PerfilMontaje = {
  funciones: [
    { id: "PRINCIPAL", label: "Uso principal" },
    { id: "APOYO", label: "Apoyo / complemento" },
    { id: "DECORATIVO", label: "Decorativo" },
    { id: "SERVICIO", label: "Servicio / staff" },
    { id: "RESPALDO", label: "Respaldo (no se monta)" },
  ],
  soportes: [S.piso, S.mesa, S.tarima, S.rack, S.tripie, S.totem, S.trussTerrena, S.trussVolada, S.pared, S.estructura],
};

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

export function getPerfilMontaje(categoria?: string | null, disciplina?: string | null): PerfilMontaje {
  if (categoria && PERFILES_POR_CATEGORIA[categoria]) return PERFILES_POR_CATEGORIA[categoria];
  if (disciplina && PERFILES_POR_DISCIPLINA[disciplina]) return PERFILES_POR_DISCIPLINA[disciplina];
  return PERFIL_GENERICO;
}

function buscar(opciones: OpcionMontaje[], id?: string | null): OpcionMontaje | null {
  if (!id) return null;
  return opciones.find((o) => o.id === id) ?? null;
}

export function labelFuncion(id: string | null | undefined, categoria?: string | null, disciplina?: string | null): string {
  if (!id) return "";
  return buscar(getPerfilMontaje(categoria, disciplina).funciones, id)?.label ?? id;
}

export function labelSoporte(id: string | null | undefined, categoria?: string | null, disciplina?: string | null): string {
  if (!id) return "";
  return buscar(getPerfilMontaje(categoria, disciplina).soportes, id)?.label ?? id;
}

export function labelZona(id: string | null | undefined): string {
  if (!id) return "";
  return ZONAS.find((z) => z.id === id)?.label ?? id;
}

export function getSoporte(id: string | null | undefined, categoria?: string | null, disciplina?: string | null): OpcionMontaje | null {
  return buscar(getPerfilMontaje(categoria, disciplina).soportes, id);
}

/** Un soporte que cuelga de estructura: alimenta el resumen de rigging. */
export function soporteEsRigging(id: string | null | undefined, categoria?: string | null, disciplina?: string | null): boolean {
  return getSoporte(id, categoria, disciplina)?.rigging === true;
}

/** Un soporte que pide altura de montaje en metros. */
export function soportePideAltura(id: string | null | undefined, categoria?: string | null, disciplina?: string | null): boolean {
  return getSoporte(id, categoria, disciplina)?.altura === true;
}

/** Orden en que se presentan las disciplinas en planes y PDFs (orden de montaje real). */
export const ORDEN_DISCIPLINAS = [
  "RIGGING",
  "STAGE",
  "ELECTRICIDAD",
  "AUDIO",
  "ILUMINACION",
  "VIDEO",
  "DJ",
  "PRODUCCION",
  "STAFF_GENERAL",
];

export function ordenDisciplina(disciplina?: string | null): number {
  const i = ORDEN_DISCIPLINAS.indexOf(disciplina ?? "");
  return i === -1 ? ORDEN_DISCIPLINAS.length : i;
}

export function ordenZona(zona?: string | null): number {
  const i = ZONAS.findIndex((z) => z.id === zona);
  return i === -1 ? ZONAS.length : i;
}
