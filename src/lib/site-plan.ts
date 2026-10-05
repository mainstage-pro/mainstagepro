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
};

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
