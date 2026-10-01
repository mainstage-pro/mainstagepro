/**
 * Zonas y configuraciones del layout.
 *
 * El rider ya dice, para cada posición de montaje, DÓNDE va (zona) y PARA QUÉ
 * sirve (función). Este módulo no inventa nada: agrupa esas posiciones en dos
 * niveles —zona y, dentro de ella, configuración— y les pone color, peso y carga
 * eléctrica para que el plano se pueda dibujar por áreas en vez de pieza por pieza.
 *
 * El nivel 1 (zona) es del evento: escenario, pista, FOH, backstage.
 * El nivel 2 (configuración) es de la disciplina: PA principal, sidefill, tótem,
 * pantalla lateral. Un mismo modelo puede aparecer en varias configuraciones.
 */

import { amperajeUnitario, voltajeEfectivo, type Carga, type Voltaje } from "@/lib/consumo-electrico";
import { TAMANO_RIDER } from "@/lib/layout-escenario";
import { labelConfiguracion, labelSoporte, labelZona, ordenZona, soporteEsRigging } from "@/lib/montaje-vocabulario";

export type PosicionDelRider = {
  id: string;
  cantidad: number;
  funcion: string | null;
  soporte: string | null;
  zona: string | null;
  alturaM: number | null;
  notas: string | null;
};

export type EquipoDelRider = {
  id: string;
  cantidad: number;
  notas: string | null;
  voltajeUso: string | null;
  equipo: {
    id: string;
    marca: string | null;
    modelo: string | null;
    descripcion: string;
    pesoKg: number | null;
    imagenUrl: string | null;
    huellaAnchoM: number | null;
    huellaLargoM: number | null;
    amperajeRequerido: number | null;
    amperajeRequerido220: number | null;
    voltajeRequerido: string | null;
    categoria: { nombre: string; disciplina: string | null } | null;
  };
  posiciones: PosicionDelRider[];
};

/** Equipo sin zona capturada. No se esconde: se agrupa aparte para que se note. */
export const SIN_ZONA = "SIN_ZONA";
/** Configuración sin capturar dentro de una zona. */
export const SIN_FUNCION = "SIN_FUNCION";

export type ItemDeZona = {
  /** Id de la posición, o `eq_<proyectoEquipoId>` si el equipo no tiene desglose. */
  clave: string;
  posicionId: string | null;
  proyectoEquipoId: string;
  equipoId: string;
  nombre: string;
  imagenUrl: string | null;
  cantidad: number;
  categoria: string | null;
  disciplina: string | null;
  funcion: string | null;
  soporte: string | null;
  soporteLabel: string;
  alturaM: number | null;
  notas: string | null;
  colgado: boolean;
  pesoUnitarioKg: number | null;
  pesoKg: number;
  amperajeUnitario: number | null;
  amperajeTotal: number;
  voltaje: Voltaje;
  huellaAnchoM: number;
  huellaLargoM: number;
};

export type Subzona = {
  clave: string;
  zonaId: string;
  funcion: string | null;
  disciplina: string | null;
  etiqueta: string;
  color: string;
  items: ItemDeZona[];
  carga: Carga;
  pesoKg: number;
  unidades: number;
};

export type ZonaAgrupada = {
  clave: string;
  zonaId: string;
  etiqueta: string;
  color: string;
  subzonas: Subzona[];
  carga: Carga;
  pesoKg: number;
  unidades: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Color
// ─────────────────────────────────────────────────────────────────────────────

const COLORES_ZONA: Record<string, string> = {
  ESCENARIO: "#B3985B",
  FRENTE_ESCENARIO: "#C9772F",
  LATERAL_IZQ: "#7C8CF8",
  LATERAL_DER: "#5FA8E0",
  FOH: "#E0557B",
  CABINA_DJ: "#A964D8",
  PISTA: "#2FAE95",
  SALON: "#6FA86B",
  BARRA: "#D08A3E",
  ACCESO: "#8E9BA8",
  BACKSTAGE: "#9B6B4A",
  EXTERIOR: "#4F9E6A",
  CEREMONIA: "#D197BE",
  ACOMETIDA: "#D2453F",
  STAGING: "#6B7280",
  [SIN_ZONA]: "#555555",
};

const COLORES_DISCIPLINA: Record<string, string> = {
  AUDIO: "#4C8DF6",
  ILUMINACION: "#E0A23C",
  VIDEO: "#A964D8",
  DJ: "#E0557B",
  RIGGING: "#8E9BA8",
  STAGE: "#9B6B4A",
  ELECTRICIDAD: "#D2453F",
  PRODUCCION: "#2FAE95",
};

/** Tono estable para lo que no está en la paleta (zonas agregadas a mano). */
function colorPorTexto(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 58%)`;
}

export function colorZona(zonaId: string): string {
  return COLORES_ZONA[zonaId] ?? colorPorTexto(zonaId);
}

export function colorDisciplina(disciplina?: string | null): string {
  if (!disciplina) return "#6B7280";
  return COLORES_DISCIPLINA[disciplina] ?? colorPorTexto(disciplina);
}

// ─────────────────────────────────────────────────────────────────────────────
// Agrupación
// ─────────────────────────────────────────────────────────────────────────────

function nombreCorto(e: EquipoDelRider): string {
  return [e.equipo.marca, e.equipo.modelo].filter(Boolean).join(" ") || e.equipo.descripcion;
}

const CARGA_CERO = (): Carga => ({ amperaje110: 0, amperaje220: 0, watts: 0, sinDato: 0 });

function acumular(destino: Carga, item: ItemDeZona): void {
  if (item.amperajeUnitario == null) {
    destino.sinDato += item.cantidad;
    return;
  }
  if (item.voltaje === "220") destino.amperaje220 += item.amperajeTotal;
  else destino.amperaje110 += item.amperajeTotal;
  destino.watts += item.amperajeTotal * Number(item.voltaje);
}

/** La configuración de una subzona, mezclando disciplina para no fundir dos "Respaldo" distintos. */
export function claveSubzona(zonaId: string, disciplina: string | null, funcion: string | null): string {
  return `${zonaId}::${disciplina ?? "GEN"}::${funcion ?? SIN_FUNCION}`;
}

function itemDe(e: EquipoDelRider, p: PosicionDelRider | null): ItemDeZona {
  const categoria = e.equipo.categoria?.nombre ?? null;
  const disciplina = e.equipo.categoria?.disciplina ?? null;
  const cantidad = p ? p.cantidad : e.cantidad;
  const unitario = amperajeUnitario(e.equipo, e.voltajeUso);
  return {
    clave: p ? p.id : `eq_${e.id}`,
    posicionId: p?.id ?? null,
    proyectoEquipoId: e.id,
    equipoId: e.equipo.id,
    nombre: nombreCorto(e),
    imagenUrl: e.equipo.imagenUrl,
    cantidad,
    categoria,
    disciplina,
    funcion: p?.funcion ?? null,
    soporte: p?.soporte ?? null,
    soporteLabel: p?.soporte ? labelSoporte(p.soporte, categoria, disciplina) : "",
    alturaM: p?.alturaM ?? null,
    // Sin desglose de montaje la nota del equipo es lo único que hay que leer.
    notas: p ? p.notas : e.notas,
    colgado: soporteEsRigging(p?.soporte, categoria, disciplina),
    pesoUnitarioKg: e.equipo.pesoKg,
    pesoKg: (e.equipo.pesoKg ?? 0) * cantidad,
    amperajeUnitario: unitario,
    amperajeTotal: (unitario ?? 0) * cantidad,
    voltaje: voltajeEfectivo(e.equipo, e.voltajeUso),
    huellaAnchoM: e.equipo.huellaAnchoM && e.equipo.huellaAnchoM > 0 ? e.equipo.huellaAnchoM : TAMANO_RIDER.anchoM,
    huellaLargoM: e.equipo.huellaLargoM && e.equipo.huellaLargoM > 0 ? e.equipo.huellaLargoM : TAMANO_RIDER.largoM,
  };
}

export function agruparPorZona(rider: EquipoDelRider[]): ZonaAgrupada[] {
  const zonas = new Map<string, ZonaAgrupada>();

  function subzonaDe(zonaId: string, item: ItemDeZona): Subzona {
    let zona = zonas.get(zonaId);
    if (!zona) {
      zona = {
        clave: zonaId,
        zonaId,
        etiqueta: zonaId === SIN_ZONA ? "Sin zona asignada" : labelZona(zonaId) || zonaId,
        color: colorZona(zonaId),
        subzonas: [],
        carga: CARGA_CERO(),
        pesoKg: 0,
        unidades: 0,
      };
      zonas.set(zonaId, zona);
    }
    const clave = claveSubzona(zonaId, item.disciplina, item.funcion);
    let sub = zona.subzonas.find(s => s.clave === clave);
    if (!sub) {
      sub = {
        clave,
        zonaId,
        funcion: item.funcion,
        disciplina: item.disciplina,
        etiqueta: item.funcion
          ? labelConfiguracion(item.funcion, item.categoria, item.disciplina) || item.funcion
          : "Sin configuración",
        color: colorDisciplina(item.disciplina),
        items: [],
        carga: CARGA_CERO(),
        pesoKg: 0,
        unidades: 0,
      };
      zona.subzonas.push(sub);
    }
    return sub;
  }

  for (const e of rider) {
    const posiciones: (PosicionDelRider | null)[] = e.posiciones.length > 0 ? e.posiciones : [null];
    for (const p of posiciones) {
      const item = itemDe(e, p);
      const zonaId = p?.zona || SIN_ZONA;
      const sub = subzonaDe(zonaId, item);
      const zona = zonas.get(zonaId)!;
      sub.items.push(item);
      sub.pesoKg += item.pesoKg;
      sub.unidades += item.cantidad;
      acumular(sub.carga, item);
      zona.pesoKg += item.pesoKg;
      zona.unidades += item.cantidad;
      acumular(zona.carga, item);
    }
  }

  const lista = [...zonas.values()];
  lista.sort((a, b) => {
    // "Sin zona" siempre al final: es pendiente por capturar, no una zona del evento.
    if (a.zonaId === SIN_ZONA) return 1;
    if (b.zonaId === SIN_ZONA) return -1;
    return ordenZona(a.zonaId) - ordenZona(b.zonaId);
  });
  for (const z of lista) z.subzonas.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  return lista;
}

export function sumarCargas(cargas: Carga[]): Carga {
  return cargas.reduce((acc, c) => ({
    amperaje110: acc.amperaje110 + c.amperaje110,
    amperaje220: acc.amperaje220 + c.amperaje220,
    watts: acc.watts + c.watts,
    sinDato: acc.sinDato + c.sinDato,
  }), CARGA_CERO());
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometría por omisión
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dónde cae cada zona la primera vez que se dibuja, en fracciones del plano.
 * Es solo un punto de partida razonable —el público está abajo, el escenario
 * arriba— y después se arrastra a mano.
 */
const UBICACION_ZONA: Record<string, [number, number, number, number]> = {
  BACKSTAGE: [0.03, 0.01, 0.22, 0.1],
  STAGING: [0.75, 0.01, 0.22, 0.1],
  ACOMETIDA: [0.75, 0.13, 0.22, 0.07],
  ESCENARIO: [0.22, 0.12, 0.56, 0.2],
  LATERAL_IZQ: [0.04, 0.14, 0.15, 0.18],
  LATERAL_DER: [0.81, 0.22, 0.15, 0.18],
  FRENTE_ESCENARIO: [0.22, 0.33, 0.56, 0.07],
  CABINA_DJ: [0.38, 0.42, 0.24, 0.1],
  PISTA: [0.27, 0.53, 0.46, 0.22],
  CEREMONIA: [0.04, 0.42, 0.2, 0.22],
  BARRA: [0.79, 0.53, 0.17, 0.17],
  SALON: [0.04, 0.77, 0.56, 0.16],
  FOH: [0.63, 0.77, 0.17, 0.1],
  ACCESO: [0.83, 0.77, 0.14, 0.1],
  EXTERIOR: [0.63, 0.89, 0.34, 0.09],
  [SIN_ZONA]: [0.04, 0.01, 0.18, 0.09],
};

export function geometriaZona(zonaId: string, anchoM: number, largoM: number, indice = 0) {
  const f = UBICACION_ZONA[zonaId];
  if (f) {
    return { x: f[0] * anchoM, y: f[1] * largoM, anchoM: f[2] * anchoM, largoM: f[3] * largoM };
  }
  // Zona agregada a mano: se apila en diagonal para que no tape a la anterior.
  const paso = (indice % 6) * 0.06;
  return { x: (0.3 + paso) * anchoM, y: (0.3 + paso) * largoM, anchoM: 0.18 * anchoM, largoM: 0.12 * largoM };
}

/**
 * Las subzonas se reparten en cuadrícula dentro de su zona. Si la zona no está
 * dibujada, caen en una franja libre para que igual se puedan acomodar.
 */
export function geometriaSubzona(
  indice: number,
  total: number,
  zona: { x: number; y: number; anchoM: number; largoM: number } | null,
  anchoM: number,
  largoM: number,
) {
  const caja = zona ?? { x: 0.05 * anchoM, y: 0.05 * largoM, anchoM: 0.35 * anchoM, largoM: 0.25 * largoM };
  const cols = Math.ceil(Math.sqrt(Math.max(1, total)));
  const filas = Math.ceil(Math.max(1, total) / cols);
  const margen = Math.min(caja.anchoM, caja.largoM) * 0.06;
  const ancho = (caja.anchoM - margen * (cols + 1)) / cols;
  const largo = (caja.largoM - margen * (filas + 1)) / filas;
  const col = indice % cols;
  const fila = Math.floor(indice / cols);
  return {
    x: caja.x + margen + col * (ancho + margen),
    y: caja.y + margen + fila * (largo + margen),
    anchoM: Math.max(0.4, ancho),
    largoM: Math.max(0.4, largo),
  };
}
