/**
 * Site plan: el plano del predio. Se dibuja encima de una foto satelital o del
 * plano del venue, y se guarda serializado en `SitePlan.contenido`.
 *
 * **Todas las coordenadas están en píxeles de la imagen de fondo**, con el origen
 * en su esquina superior izquierda — no en metros. La escala (`escalaMPorPx`) se
 * calibra aparte y solo sirve para *leer* áreas y distancias: así, recalibrar no
 * mueve ni deforma nada de lo ya trazado.
 */

export type Punto = { x: number; y: number };

export type TipoObjeto = "ZONA" | "CIRCULO" | "TRAZO" | "PIN" | "TEXTO";

/**
 * Cualquier cosa dibujada en el plano. Un solo tipo para todas las formas: la
 * lista de puntos cambia de significado según `tipo`, pero mover, seleccionar y
 * borrar funcionan igual para todo.
 */
export type ObjetoPlano = {
  id: string;
  capaId: string;
  tipo: TipoObjeto;
  etiqueta: string;
  /** Si falta, hereda el color de su capa. */
  color?: string;
  /**
   * ZONA: los vértices del polígono (≥3).
   * CIRCULO: [centro, un punto del borde].
   * TRAZO: la polilínea, punto por punto.
   * PIN y TEXTO: [ancla].
   */
  puntos: Punto[];
  /** ZONA y CIRCULO: opacidad del relleno, 0–1. */
  relleno?: number;
  /** TRAZO: grosor de la línea en píxeles de imagen. */
  grosor?: number;
  punteado?: boolean;
  /** TRAZO: dibuja punta de flecha en el último punto. */
  flecha?: boolean;
  /** PIN: llave del catálogo de iconos (`site-plan-iconos.ts`). */
  icono?: string;
  /** PIN: diámetro del disco. TEXTO: alto de la letra. Ambos en píxeles de imagen. */
  tamano?: number;
  /** Oculta el objeto sin borrarlo, independiente de su capa. */
  oculto?: boolean;
  notas?: string;
  /** Los datos duros del elemento: qué es, qué lleva, quién responde. */
  ficha?: FichaElemento;
};

/**
 * La ficha de un elemento del plano. Vive dentro del JSON del plano, junto al
 * objeto que describe: un plano se abre completo o no se abre, así que partirla
 * en tablas solo agregaría consultas sin dar nada a cambio.
 *
 * Todo es opcional a propósito. Un plano de las 11 de la noche antes del montaje
 * se dibuja con etiquetas y ya; la ficha se llena después, y el que falte no
 * puede impedir que el plano exista.
 */
export type FichaElemento = {
  /** Vocabulario cerrado: de él cuelgan los croquis por tipo y la leyenda. */
  tipoElemento?: string;
  /** Clave de plano (E-01, A-03). Es lo que cruza el dibujo con la leyenda. */
  clave?: string;
  estado?: EstadoElemento;
  /** Qué es y cómo va montado. */
  descripcion?: string;
  /** Qué lleva dentro: equipo, mobiliario, personal. */
  contiene?: string;

  // Medidas. El área sale del trazo; esto es lo que el trazo no puede saber.
  anchoLibreM?: number;
  alturaM?: number;
  /** Personas que admite el elemento. Se contrasta con el área trazada. */
  capacidad?: number;
  superficie?: Superficie;
  /** Capacidad de carga del terreno en kN/m². */
  cargaTerrenoKnM2?: number;

  // Quién responde. El nombre se guarda suelto para que la ficha sobreviva
  // aunque la persona se borre del crew o el proveedor cambie de razón social.
  responsableNombre?: string;
  responsableContacto?: string;
  /** Id de GiraCrew o ProyectoPersonal del que se copió el responsable. */
  responsableRef?: string;
  proveedorNombre?: string;
  /** Id de Proveedor o ProveedorEvento del que se copió. */
  proveedorRef?: string;

  // Ventanas de montaje y desmontaje, "HH:MM" como los bloques del show. No son
  // los horarios del evento: la carpa entra ocho horas antes de que abra puertas.
  montajeInicio?: string;
  montajeFin?: string;
  desmontajeInicio?: string;
  desmontajeFin?: string;

  // Eléctrico. Es lo que exige el croquis de Protección Civil.
  amperaje?: number;
  voltaje?: number;
  fases?: number;
  /** De qué tablero o planta cuelga. Cruza con la clave de ese elemento. */
  tableroClave?: string;
  /** Extintores que lleva el elemento. */
  extintores?: number;

  /** Líneas del rider del show que aterrizan aquí. */
  riderLineaIds?: string[];
};

/**
 * Lo que el show ya sabe y la ficha no debería volver a preguntar. Lo arma
 * `/api/site-planes/[id]/contexto` a partir del crew, el rider, los proveedores
 * y los bloques de horario.
 */
export type ContextoSitePlan = {
  responsables: OpcionContexto[];
  proveedores: OpcionContexto[];
  rider: { id: string; concepto: string; detalle: string | null; cantidad: number }[];
  ventanas: { id: string; titulo: string; tipo: string; inicio: string | null; fin: string | null }[];
  venue: {
    nombre: string;
    capacidadPersonas: number | null;
    voltajeDisponible: string | null;
    amperajeTotal: number | null;
    fases: string | null;
    puntoDescarga: string | null;
    notasTecnicas: string | null;
  } | null;
  aforoEsperado: number | null;
};

export type OpcionContexto = { id: string; nombre: string; detalle: string | null; contacto: string | null };

export const CONTEXTO_VACIO: ContextoSitePlan = {
  responsables: [],
  proveedores: [],
  rider: [],
  ventanas: [],
  venue: null,
  aforoEsperado: null,
};

export type EstadoElemento = "PROPUESTO" | "APROBADO" | "INSTALADO" | "RETIRADO";

export const ESTADOS_ELEMENTO: { clave: EstadoElemento; etiqueta: string; color: string }[] = [
  { clave: "PROPUESTO", etiqueta: "Propuesto", color: "#8a8a8a" },
  { clave: "APROBADO", etiqueta: "Aprobado", color: "#3B82F6" },
  { clave: "INSTALADO", etiqueta: "Instalado", color: "#34D399" },
  { clave: "RETIRADO", etiqueta: "Retirado", color: "#E8734A" },
];

export type Superficie = "ASFALTO" | "CONCRETO" | "PASTO" | "TIERRA" | "DUELA" | "ARENA" | "GRAVA";

export const SUPERFICIES: { clave: Superficie; etiqueta: string }[] = [
  { clave: "ASFALTO", etiqueta: "Asfalto" },
  { clave: "CONCRETO", etiqueta: "Concreto" },
  { clave: "PASTO", etiqueta: "Pasto" },
  { clave: "TIERRA", etiqueta: "Tierra" },
  { clave: "DUELA", etiqueta: "Duela" },
  { clave: "ARENA", etiqueta: "Arena" },
  { clave: "GRAVA", etiqueta: "Grava" },
];

/**
 * Vocabulario de elementos. Cerrado a propósito: si cada quien escribe el tipo a
 * mano, el croquis eléctrico y el plano de emergencia dejan de poder armarse
 * solos. `electrico` y `emergencia` marcan en qué documento entra el elemento.
 */
export type TipoElemento = {
  clave: string;
  etiqueta: string;
  grupo: string;
  /** Entra al croquis de instalación eléctrica de Protección Civil. */
  electrico?: boolean;
  /** Entra al plano de emergencia y evacuación. */
  emergencia?: boolean;
  /** Icono sugerido del catálogo de `site-plan-iconos.ts`. */
  icono?: string;
};

export const TIPOS_ELEMENTO: TipoElemento[] = [
  // Producción
  { clave: "ESCENARIO", etiqueta: "Escenario", grupo: "Producción", icono: "ESCENARIO" },
  { clave: "FOH", etiqueta: "FOH / cabina de control", grupo: "Producción", icono: "FOH" },
  { clave: "DELAY", etiqueta: "Torre de delay", grupo: "Producción", icono: "AUDIO" },
  { clave: "PANTALLA", etiqueta: "Pantalla", grupo: "Producción", icono: "PANTALLA" },
  { clave: "TORRE_ILUMINACION", etiqueta: "Torre de iluminación", grupo: "Producción", icono: "ILUMINACION" },
  { clave: "BODEGA", etiqueta: "Bodega / almacén", grupo: "Producción", icono: "BODEGA" },
  { clave: "CAMERINO", etiqueta: "Camerino", grupo: "Producción", icono: "CAMERINOS" },
  { clave: "OFICINA_PRODUCCION", etiqueta: "Oficina de producción", grupo: "Producción", icono: "PRODUCCION" },
  { clave: "PRENSA", etiqueta: "Área de prensa", grupo: "Producción", icono: "PRENSA" },

  // Eléctrico
  { clave: "PLANTA_LUZ", etiqueta: "Planta de luz / generador", grupo: "Eléctrico", electrico: true, icono: "PLANTA_LUZ" },
  { clave: "TABLERO", etiqueta: "Tablero / centro de carga", grupo: "Eléctrico", electrico: true, icono: "TABLERO" },
  { clave: "INTERRUPTOR", etiqueta: "Interruptor / switch", grupo: "Eléctrico", electrico: true, icono: "ENERGIA" },
  { clave: "ACOMETIDA", etiqueta: "Acometida / toma del venue", grupo: "Eléctrico", electrico: true, icono: "ENERGIA" },
  { clave: "TENDIDO", etiqueta: "Tendido de cable", grupo: "Eléctrico", electrico: true, icono: "CABLEADO" },

  // Seguridad y emergencia
  { clave: "EXTINTOR", etiqueta: "Extintor", grupo: "Seguridad", emergencia: true, electrico: true, icono: "EXTINTOR" },
  { clave: "RUTA_EVACUACION", etiqueta: "Ruta de evacuación", grupo: "Seguridad", emergencia: true, icono: "SALIDA_EMERGENCIA" },
  { clave: "SALIDA_EMERGENCIA", etiqueta: "Salida de emergencia", grupo: "Seguridad", emergencia: true, icono: "SALIDA_EMERGENCIA" },
  { clave: "PUNTO_REUNION", etiqueta: "Punto de reunión", grupo: "Seguridad", emergencia: true, icono: "PUNTO_ENCUENTRO" },
  { clave: "PRIMEROS_AUXILIOS", etiqueta: "Primeros auxilios", grupo: "Seguridad", emergencia: true, icono: "PRIMEROS_AUXILIOS" },
  { clave: "AMBULANCIA", etiqueta: "Ambulancia", grupo: "Seguridad", emergencia: true, icono: "AMBULANCIA" },
  { clave: "ACCESO_BOMBEROS", etiqueta: "Acceso de bomberos", grupo: "Seguridad", emergencia: true, icono: "BOMBEROS" },
  { clave: "PUESTO_SEGURIDAD", etiqueta: "Puesto de seguridad", grupo: "Seguridad", emergencia: true, icono: "SEGURIDAD" },
  { clave: "CERCO", etiqueta: "Cerco / valla perimetral", grupo: "Seguridad", icono: "VALLA" },

  // Público
  { clave: "ACCESO_PUBLICO", etiqueta: "Acceso de público", grupo: "Público", emergencia: true, icono: "ACCESO_PUBLICO" },
  { clave: "CONTROL_ACCESO", etiqueta: "Control de acceso / filtro", grupo: "Público", icono: "CONTROL_ACCESO" },
  { clave: "TAQUILLA", etiqueta: "Taquilla", grupo: "Público", icono: "TAQUILLA" },
  { clave: "AREA_PUBLICO", etiqueta: "Área de público", grupo: "Público", icono: "GRADA" },
  { clave: "VIP", etiqueta: "Zona VIP", grupo: "Público", icono: "VIP" },
  { clave: "SANITARIOS", etiqueta: "Sanitarios", grupo: "Público", icono: "BANOS" },
  { clave: "ALIMENTOS", etiqueta: "Alimentos y bebidas", grupo: "Público", icono: "COMIDA" },
  { clave: "STAND", etiqueta: "Stand / activación", grupo: "Público", icono: "STAND" },
  { clave: "CARPA", etiqueta: "Carpa", grupo: "Público", icono: "CARPA" },
  { clave: "GRADA", etiqueta: "Grada", grupo: "Público", icono: "GRADA" },

  // Circulación
  { clave: "ACCESO_VEHICULAR", etiqueta: "Acceso vehicular", grupo: "Circulación", icono: "ACCESO_VEHICULAR" },
  { clave: "CARGA_DESCARGA", etiqueta: "Carga y descarga", grupo: "Circulación", icono: "CARGA_DESCARGA" },
  { clave: "ESTACIONAMIENTO", etiqueta: "Estacionamiento", grupo: "Circulación", icono: "ESTACIONAMIENTO" },
  { clave: "RUTA_PEATONAL", etiqueta: "Ruta peatonal", grupo: "Circulación", icono: "RUTA_PEATONAL" },
  { clave: "RUTA_VEHICULAR", etiqueta: "Ruta vehicular", grupo: "Circulación", icono: "TRANSPORTE" },
  { clave: "BACKSTAGE", etiqueta: "Backstage / circulación interna", grupo: "Circulación", icono: "PRODUCCION" },
];

// ─── Variantes emitidas ──────────────────────────────────────────────────────

/**
 * Los planos que se emiten del mismo dibujo. Un plano que lo dice todo a la vez
 * no lo lee nadie: al de tránsito le sobra el rider y a Protección Civil le
 * sobra el backline. `soloElectrico` y `soloEmergencia` recortan además por el
 * tipo de elemento de la ficha, para los dos croquis que la autoridad pide.
 */
export type ClaveVariante =
  | "GENERAL"
  | "EMERGENCIA"
  | "ELECTRICO"
  | "VIALIDAD"
  | "FLUJO"
  | "PROVEEDORES"
  | "MONTAJE";

export const VARIANTES_CATALOGO: {
  clave: ClaveVariante;
  nombre: string;
  descripcion: string;
  soloElectrico?: boolean;
  soloEmergencia?: boolean;
}[] = [
  { clave: "GENERAL", nombre: "Site plan general", descripcion: "Todo el predio, para producción" },
  {
    clave: "EMERGENCIA",
    nombre: "Plano de emergencia y evacuación",
    descripcion: "Rutas, salidas, punto de reunión y acceso de bomberos",
    soloEmergencia: true,
  },
  {
    clave: "ELECTRICO",
    nombre: "Croquis de instalación eléctrica",
    descripcion: "Plantas, tableros, interruptores y extintores. Es el que pide Protección Civil",
    soloElectrico: true,
  },
  { clave: "VIALIDAD", nombre: "Plano de vialidad y accesos", descripcion: "Rutas de vehículos, carga y estacionamiento" },
  { clave: "FLUJO", nombre: "Plano de flujo de público", descripcion: "Accesos, filtros y circulación del público" },
  { clave: "PROVEEDORES", nombre: "Plano de proveedores", descripcion: "Dónde se instala cada tercero" },
  { clave: "MONTAJE", nombre: "Plano de montaje", descripcion: "Secuencia y ventanas de montaje" },
];

export type EstadoVariante = "BORRADOR" | "EMITIDO" | "APROBADO" | "AS_BUILT";

export const ESTADOS_VARIANTE: { clave: EstadoVariante; etiqueta: string; color: string }[] = [
  { clave: "BORRADOR", etiqueta: "Borrador", color: "#8a8a8a" },
  { clave: "EMITIDO", etiqueta: "Emitido", color: "#3B82F6" },
  { clave: "APROBADO", etiqueta: "Aprobado", color: "#34D399" },
  { clave: "AS_BUILT", etiqueta: "Como quedó", color: "#B3985B" },
];

export const MEDIOS_EMISION = ["CORREO", "WHATSAPP", "IMPRESO", "PORTAL"] as const;

/** La lista de capas que imprime una variante, o null si imprime todas. */
export function capasDeVariante(capasIds: string | null | undefined): string[] | null {
  if (!capasIds) return null;
  try {
    const d = JSON.parse(capasIds) as unknown;
    return Array.isArray(d) ? d.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

/**
 * Lo que entra a una variante: las capas elegidas y, si es croquis temático, solo
 * los elementos cuyo tipo pertenece a ese croquis. Un objeto oculto a mano sigue
 * oculto: esconderlo fue una decisión sobre el dibujo, no sobre el documento.
 */
export function objetosDeVariante(
  objetos: ObjetoPlano[],
  v: { capasIds?: string | null; soloElectrico?: boolean; soloEmergencia?: boolean },
): ObjetoPlano[] {
  const capas = capasDeVariante(v.capasIds);
  return objetos.filter(o => {
    if (o.oculto) return false;
    if (capas && !capas.includes(o.capaId)) return false;
    if (!v.soloElectrico && !v.soloEmergencia) return true;
    const t = tipoElementoDe(o.ficha?.tipoElemento);
    // El texto suelto rotula el croquis, así que se queda siempre.
    if (o.tipo === "TEXTO") return true;
    return !!((v.soloElectrico && t?.electrico) || (v.soloEmergencia && t?.emergencia));
  });
}

const TIPOS_POR_CLAVE = new Map(TIPOS_ELEMENTO.map(t => [t.clave, t]));

export function tipoElementoDe(clave: string | null | undefined): TipoElemento | null {
  return clave ? TIPOS_POR_CLAVE.get(clave) ?? null : null;
}

export const GRUPOS_TIPO_ELEMENTO = [...new Set(TIPOS_ELEMENTO.map(t => t.grupo))];

/**
 * Agrupa objetos para prenderlos y apagarlos juntos. Es la unidad de lectura del
 * plano: una capa por frente (accesos, servicios…), por proveedor o por área que
 * necesite verse sola.
 */
export type Capa = {
  id: string;
  nombre: string;
  color: string;
  visible: boolean;
  /** Bloqueada: se ve pero no se selecciona ni se mueve. */
  bloqueada: boolean;
};

export type ContenidoPlano = { capas: Capa[]; objetos: ObjetoPlano[] };

/** Lienzo cuando todavía no se sube imagen de fondo: se puede dibujar sin ella. */
export const LIENZO_SIN_FONDO = { ancho: 2400, alto: 1600 };

export const PALETA_COLORES = [
  "#E0B64B", "#E8734A", "#D9444F", "#C44BC4", "#7B5BE6",
  "#3B82F6", "#2DD4BF", "#34D399", "#A3E635", "#F5F5F5",
];

export const GROSOR_DEFAULT = 6;
export const TAMANO_PIN_DEFAULT = 44;
export const TAMANO_TEXTO_DEFAULT = 28;
export const RELLENO_DEFAULT = 0.3;

export function nuevoIdObjeto() {
  return `ob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function nuevoIdCapa() {
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Las capas con las que nace un plano. Son las que casi siempre se usan; el resto
 * se agregan a mano. Un plano nunca se queda sin capas, porque todo objeto
 * pertenece a una.
 */
export function capasIniciales(): Capa[] {
  return [
    { id: "cp_areas", nombre: "Áreas y zonas", color: "#E0B64B", visible: true, bloqueada: false },
    { id: "cp_accesos", nombre: "Accesos y rutas", color: "#3B82F6", visible: true, bloqueada: false },
    { id: "cp_servicios", nombre: "Servicios", color: "#2DD4BF", visible: true, bloqueada: false },
    { id: "cp_produccion", nombre: "Producción", color: "#C44BC4", visible: true, bloqueada: false },
    { id: "cp_seguridad", nombre: "Seguridad", color: "#D9444F", visible: true, bloqueada: false },
  ];
}

export const CONTENIDO_VACIO: ContenidoPlano = { capas: [], objetos: [] };

/**
 * Lee el JSON guardado sin confiar en él: un plano con un objeto corrupto se abre
 * igual, solo que sin ese objeto. Rellena capas faltantes para que nada quede
 * huérfano e invisible.
 */
export function parsearContenido(raw: string | null | undefined): ContenidoPlano {
  if (!raw) return { capas: capasIniciales(), objetos: [] };
  let d: Partial<ContenidoPlano>;
  try {
    d = JSON.parse(raw) as Partial<ContenidoPlano>;
  } catch {
    return { capas: capasIniciales(), objetos: [] };
  }

  const capas = Array.isArray(d.capas)
    ? d.capas.filter(c => c && typeof c.id === "string" && typeof c.nombre === "string")
    : [];

  const objetos = Array.isArray(d.objetos)
    ? d.objetos.filter(
        (o): o is ObjetoPlano =>
          !!o && typeof o.id === "string" && Array.isArray(o.puntos) && o.puntos.length > 0,
      )
    : [];

  const vistas = new Set(capas.map(c => c.id));
  for (const o of objetos) {
    if (vistas.has(o.capaId)) continue;
    vistas.add(o.capaId);
    capas.push({ id: o.capaId, nombre: "Sin capa", color: "#888888", visible: true, bloqueada: false });
  }

  return { capas: capas.length ? capas : capasIniciales(), objetos };
}

// ─── Geometría ───────────────────────────────────────────────────────────────

/** Área del polígono en píxeles², por la fórmula del cordón de zapato. */
export function areaPoligono(puntos: Punto[]): number {
  if (puntos.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % puntos.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function longitud(puntos: Punto[]): number {
  let s = 0;
  for (let i = 1; i < puntos.length; i++) s += Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y);
  return s;
}

export function radioDe(puntos: Punto[]): number {
  if (puntos.length < 2) return 0;
  return Math.hypot(puntos[1].x - puntos[0].x, puntos[1].y - puntos[0].y);
}

/** Los tres vértices de la punta de flecha al final de un trazo. */
export function puntaDeFlecha(o: ObjetoPlano): Punto[] | null {
  const n = o.puntos.length;
  if (n < 2) return null;
  const fin = o.puntos[n - 1];
  const prev = o.puntos[n - 2];
  const ang = Math.atan2(fin.y - prev.y, fin.x - prev.x);
  const largo = (o.grosor ?? GROSOR_DEFAULT) * 3.2;
  const abre = 0.42;
  return [
    fin,
    { x: fin.x - largo * Math.cos(ang - abre), y: fin.y - largo * Math.sin(ang - abre) },
    { x: fin.x - largo * Math.cos(ang + abre), y: fin.y - largo * Math.sin(ang + abre) },
  ];
}

export function caja(puntos: Punto[]) {
  const xs = puntos.map(p => p.x);
  const ys = puntos.map(p => p.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, ancho: Math.max(...xs) - x0, alto: Math.max(...ys) - y0 };
}

/**
 * Dónde va el rótulo. Para un polígono es su centroide real y no el centro de la
 * caja, porque en una forma de "L" el centro de la caja cae fuera de la figura y
 * el nombre termina rotulando a su vecina.
 */
export function anclaRotulo(o: ObjetoPlano): Punto {
  if (o.tipo === "ZONA" && o.puntos.length >= 3) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < o.puntos.length; i++) {
      const p = o.puntos[i];
      const q = o.puntos[(i + 1) % o.puntos.length];
      const f = p.x * q.y - q.x * p.y;
      a += f;
      cx += (p.x + q.x) * f;
      cy += (p.y + q.y) * f;
    }
    if (Math.abs(a) > 1e-6) return { x: cx / (3 * a), y: cy / (3 * a) };
  }
  if (o.tipo === "TRAZO") return o.puntos[Math.floor(o.puntos.length / 2)];
  const c = caja(o.puntos);
  return o.tipo === "CIRCULO" ? o.puntos[0] : { x: c.x + c.ancho / 2, y: c.y + c.alto / 2 };
}

function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = dx * dx + dy * dy;
  if (largo === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function dentroDelPoligono(p: Punto, puntos: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const a = puntos[i];
    const b = puntos[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

/**
 * Si el clic cae sobre el objeto. `tolerancia` va en píxeles de imagen y la calcula
 * el editor a partir del zoom, para que agarrar una línea fina siga siendo fácil
 * cuando el plano está alejado.
 */
export function golpea(o: ObjetoPlano, p: Punto, tolerancia: number): boolean {
  switch (o.tipo) {
    case "ZONA": {
      if (dentroDelPoligono(p, o.puntos)) return true;
      for (let i = 0; i < o.puntos.length; i++) {
        if (distanciaASegmento(p, o.puntos[i], o.puntos[(i + 1) % o.puntos.length]) <= tolerancia) return true;
      }
      return false;
    }
    case "CIRCULO":
      return Math.hypot(p.x - o.puntos[0].x, p.y - o.puntos[0].y) <= radioDe(o.puntos) + tolerancia;
    case "TRAZO": {
      const margen = Math.max(tolerancia, (o.grosor ?? GROSOR_DEFAULT) / 2);
      for (let i = 1; i < o.puntos.length; i++) {
        if (distanciaASegmento(p, o.puntos[i - 1], o.puntos[i]) <= margen) return true;
      }
      return false;
    }
    case "PIN": {
      const r = (o.tamano ?? TAMANO_PIN_DEFAULT) / 2;
      return Math.hypot(p.x - o.puntos[0].x, p.y - o.puntos[0].y) <= r + tolerancia;
    }
    case "TEXTO": {
      const alto = o.tamano ?? TAMANO_TEXTO_DEFAULT;
      const ancho = Math.max(1, o.etiqueta.length) * alto * 0.6;
      const a = o.puntos[0];
      return p.x >= a.x - tolerancia && p.x <= a.x + ancho + tolerancia && p.y >= a.y - alto && p.y <= a.y + tolerancia;
    }
  }
}

export function mover(o: ObjetoPlano, dx: number, dy: number): ObjetoPlano {
  return { ...o, puntos: o.puntos.map(p => ({ x: p.x + dx, y: p.y + dy })) };
}

// ─── Escala y medidas ────────────────────────────────────────────────────────

/**
 * Metros por píxel a partir de dos puntos de los que se conoce la distancia real.
 * Devuelve null si los puntos quedaron encimados: calibrar con una referencia de
 * dos píxeles amplifica cualquier error de pulso a decenas de metros.
 */
export function calcularEscala(a: Punto, b: Punto, metrosReales: number): number | null {
  const px = Math.hypot(b.x - a.x, b.y - a.y);
  if (px < 10 || !(metrosReales > 0)) return null;
  return metrosReales / px;
}

export function fmtMetros(px: number, escala: number | null | undefined): string | null {
  if (!escala) return null;
  const m = px * escala;
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(m < 10 ? 1 : 0)} m`;
}

export function fmtArea(px2: number, escala: number | null | undefined): string | null {
  if (!escala) return null;
  const m2 = px2 * escala * escala;
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${Math.round(m2).toLocaleString("es-MX")} m²`;
}

/** La medida que corresponde a cada forma: área si encierra algo, largo si no. */
export function medidaDe(o: ObjetoPlano, escala: number | null | undefined): string | null {
  switch (o.tipo) {
    case "ZONA":
      return fmtArea(areaPoligono(o.puntos), escala);
    case "CIRCULO":
      return fmtArea(Math.PI * radioDe(o.puntos) ** 2, escala);
    case "TRAZO":
      return fmtMetros(longitud(o.puntos), escala);
    default:
      return null;
  }
}

export function colorDe(o: ObjetoPlano, capas: Capa[]): string {
  return o.color ?? capas.find(c => c.id === o.capaId)?.color ?? "#B3985B";
}

export function esVisible(o: ObjetoPlano, capas: Capa[]): boolean {
  if (o.oculto) return false;
  const capa = capas.find(c => c.id === o.capaId);
  return capa ? capa.visible : true;
}

export const ETIQUETA_TIPO: Record<TipoObjeto, string> = {
  ZONA: "Área",
  CIRCULO: "Círculo",
  TRAZO: "Trazo",
  PIN: "Punto",
  TEXTO: "Texto",
};

// ─── Aforo, densidad y evacuación ────────────────────────────────────────────

/**
 * Personas que caben por metro cuadrado. Son los valores con los que se planea
 * un evento al aire libre: 2 p/m² para el cuerpo del público, 3 a 4 solo frente
 * al escenario y bajo vigilancia, y arriba de 4 la multitud deja de poder
 * moverse por sí sola. El que una zona dibujada aguante el aforo que se le
 * asignó es la verificación más barata que da el plano.
 */
export const DENSIDAD_PLANEACION = 2;
export const DENSIDAD_FRENTE_ESCENARIO = 4;

export type NivelDensidad = "HOLGADO" | "PLANEACION" | "DENSO" | "CRITICO";

export type LecturaDensidad = {
  personasPorM2: number;
  nivel: NivelDensidad;
  etiqueta: string;
  /** Personas que caben a densidad de planeación. */
  aforoSugerido: number;
};

/**
 * Contrasta el aforo declarado contra el área realmente trazada. Devuelve null
 * si falta la escala o el aforo: inventar una densidad sobre un plano sin
 * calibrar daría un número con aire de dato que no lo es.
 */
export function densidadDe(
  areaPx2: number,
  escala: number | null | undefined,
  personas: number | null | undefined,
): LecturaDensidad | null {
  if (!escala || !personas || personas <= 0) return null;
  const m2 = areaPx2 * escala * escala;
  if (m2 <= 0) return null;
  const d = personas / m2;
  const nivel: NivelDensidad =
    d <= 1 ? "HOLGADO" : d <= DENSIDAD_PLANEACION ? "PLANEACION" : d <= DENSIDAD_FRENTE_ESCENARIO ? "DENSO" : "CRITICO";
  const etiqueta = {
    HOLGADO: "Holgado",
    PLANEACION: "Dentro de planeación",
    DENSO: "Denso: solo frente a escenario",
    CRITICO: "Excede el límite seguro",
  }[nivel];
  return {
    personasPorM2: d,
    nivel,
    etiqueta,
    aforoSugerido: Math.floor(m2 * DENSIDAD_PLANEACION),
  };
}

/**
 * Personas que pasan por metro de ancho libre cada minuto. Son las tasas de
 * referencia del Green Guide; la de escalón es menor porque bajar un peldaño
 * marca el paso de toda la fila.
 */
export const FLUJO_PLANO_POR_M_MIN = 82;
export const FLUJO_ESCALON_POR_M_MIN = 66;
/** Minutos en los que un recinto debe quedar desalojado. */
export const MINUTOS_EVACUACION_META = 8;

/**
 * Minutos que tarda en desalojar un aforo por un ancho libre total dado. El
 * ancho libre se suma de todas las salidas: es ese número, y no el aforo del
 * venue, el que acaba fijando cuánta gente se puede meter.
 */
export function minutosEvacuacion(personas: number, anchoLibreTotalM: number, conEscalones = false): number | null {
  if (!(personas > 0) || !(anchoLibreTotalM > 0)) return null;
  return personas / (anchoLibreTotalM * (conEscalones ? FLUJO_ESCALON_POR_M_MIN : FLUJO_PLANO_POR_M_MIN));
}

/** Ancho libre total que exige un aforo para desalojar en la meta de minutos. */
export function anchoLibreRequerido(personas: number, conEscalones = false): number | null {
  if (!(personas > 0)) return null;
  const flujo = conEscalones ? FLUJO_ESCALON_POR_M_MIN : FLUJO_PLANO_POR_M_MIN;
  return personas / (flujo * MINUTOS_EVACUACION_META);
}

// ─── Lectura de fichas ───────────────────────────────────────────────────────

export function tieneFicha(o: ObjetoPlano): boolean {
  const f = o.ficha;
  if (!f) return false;
  return Object.values(f).some(v => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""));
}

/** La ventana de montaje en una línea, si hay algo que mostrar. */
export function ventanaTexto(inicio?: string, fin?: string): string | null {
  if (inicio && fin) return `${inicio}–${fin}`;
  return inicio ?? fin ?? null;
}

/** La carga eléctrica en una línea: "60 A · 220 V · 3F". */
export function electricoTexto(f: FichaElemento | undefined): string | null {
  if (!f) return null;
  const partes: string[] = [];
  if (f.amperaje) partes.push(`${f.amperaje} A`);
  if (f.voltaje) partes.push(`${f.voltaje} V`);
  if (f.fases) partes.push(`${f.fases}F`);
  return partes.length ? partes.join(" · ") : null;
}

/** Suma del amperaje declarado en las fichas: lo que se le pide a la planta. */
export function amperajeTotal(objetos: ObjetoPlano[]): number {
  return objetos.reduce((s, o) => s + (o.ficha?.amperaje ?? 0), 0);
}

/** Objetos que entran a un croquis temático, por el tipo de elemento de su ficha. */
export function objetosDeCroquis(objetos: ObjetoPlano[], llave: "electrico" | "emergencia"): ObjetoPlano[] {
  return objetos.filter(o => tipoElementoDe(o.ficha?.tipoElemento)?.[llave]);
}

/**
 * Asigna claves de plano (A-01, B-02…) a los objetos que no la traen, agrupando
 * por capa. La clave es lo que permite que el dibujo quede limpio y la
 * información viva en una tabla aparte.
 */
export function asignarClaves(objetos: ObjetoPlano[], capas: Capa[]): ObjetoPlano[] {
  const letras = new Map(capas.map((c, i) => [c.id, String.fromCharCode(65 + (i % 26))]));
  // Las claves puestas a mano se respetan y se numera alrededor de ellas: ya
  // están escritas en los planos que se imprimieron y se repartieron.
  const usadas = new Set(objetos.map(o => o.ficha?.clave).filter(Boolean) as string[]);
  const siguiente = new Map<string, number>();

  return objetos.map(o => {
    if (o.ficha?.clave) return o;
    const letra = letras.get(o.capaId) ?? "X";
    let n = siguiente.get(letra) ?? 1;
    let clave = `${letra}-${String(n).padStart(2, "0")}`;
    while (usadas.has(clave)) {
      n += 1;
      clave = `${letra}-${String(n).padStart(2, "0")}`;
    }
    usadas.add(clave);
    siguiente.set(letra, n + 1);
    return { ...o, ficha: { ...o.ficha, clave } };
  });
}
