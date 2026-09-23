/**
 * Variaciones de contenido: un mismo TipoContenido puede tener N piezas distintas
 * que rotan en un ciclo de semanas (ej. Inventario = 8 semanas × 2 publicaciones).
 *
 * La variación de un slot se deduce de la fecha, no se guarda a mano:
 *   semana   = posición de la semana dentro del ciclo, contada desde `cicloInicio`
 *   posición = orden del día dentro de los días de publicación del tipo
 *              (ej. "LUNES, MIÉRCOLES" → lunes=1, miércoles=2)
 */

/** Relaciones que toda vista de publicaciones necesita para resolver su variación. */
export const PUBLICACION_INCLUDE = {
  tipo: {
    select: {
      id: true, nombre: true, formato: true, enFeedIG: true,
      enFacebook: true, enInstagram: true, enTiktok: true, enYoutube: true,
      diaSemana: true, cicloSemanas: true, cicloInicio: true,
    },
  },
  variacion: {
    select: { id: true, codigo: true, nombre: true, semana: true, posicion: true },
  },
} as const;

export const DIA_MAP: Record<string, number> = {
  DOMINGO: 0, LUNES: 1, MARTES: 2,
  "MIÉRCOLES": 3, MIERCOLES: 3,
  JUEVES: 4, VIERNES: 5,
  "SÁBADO": 6, SABADO: 6,
};

export const DIA_NOMBRE = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const MS_DIA = 86_400_000;
const MS_SEMANA = 7 * MS_DIA;

/** Normaliza cualquier fecha a su parte de calendario "YYYY-MM-DD". */
export function fechaISO(f: Date | string): string {
  if (typeof f === "string") return f.slice(0, 10);
  return f.toISOString().slice(0, 10);
}

/** Mediodía UTC del día: inmune a corrimientos de zona horaria. */
function alMediodia(iso: string): Date {
  return new Date(`${fechaISO(iso)}T12:00:00.000Z`);
}

export function diaSemanaDe(f: Date | string): number {
  return alMediodia(fechaISO(f)).getUTCDay();
}

/** Días de publicación del tipo, en orden lunes → domingo. */
export function diasDelTipo(diaSemana: string | null): number[] {
  if (!diaSemana) return [];
  const dias = diaSemana
    .split(",")
    .map(d => DIA_MAP[d.trim().toUpperCase()])
    .filter((d): d is number => d !== undefined);
  const ordenLunesPrimero = (d: number) => (d + 6) % 7;
  return [...new Set(dias)].sort((a, b) => ordenLunesPrimero(a) - ordenLunesPrimero(b));
}

/** Timestamp del lunes de la semana a la que pertenece la fecha. */
function lunesDe(f: Date | string): number {
  const d = alMediodia(fechaISO(f));
  const offset = (d.getUTCDay() + 6) % 7;
  return d.getTime() - offset * MS_DIA;
}

/** Semana del ciclo (1..cicloSemanas) a la que cae la fecha. */
export function semanaDelCiclo(
  f: Date | string,
  cicloInicio: Date | string | null,
  cicloSemanas: number,
): number {
  if (!cicloSemanas || cicloSemanas <= 1) return 1;
  // Sin ancla explícita: el lunes 2026-01-05 sirve de origen estable.
  const base = lunesDe(cicloInicio ?? "2026-01-05");
  const semanas = Math.floor((lunesDe(f) - base) / MS_SEMANA);
  return (((semanas % cicloSemanas) + cicloSemanas) % cicloSemanas) + 1;
}

/** Posición (1..N) del slot dentro de su semana, según los días del tipo. */
export function posicionEnSemana(f: Date | string, diaSemana: string | null): number {
  const dias = diasDelTipo(diaSemana);
  if (dias.length <= 1) return 1;
  const idx = dias.indexOf(diaSemanaDe(f));
  return idx === -1 ? 1 : idx + 1;
}

export interface TipoCiclo {
  diaSemana: string | null;
  cicloSemanas: number | null;
  cicloInicio: Date | string | null;
}

export interface SlotVariacion {
  semana: number;
  posicion: number;
}

/** Coordenada (semana, posición) que le toca a una fecha dentro del ciclo del tipo. */
export function slotDe(f: Date | string, tipo: TipoCiclo): SlotVariacion {
  const ciclo = tipo.cicloSemanas && tipo.cicloSemanas > 0 ? tipo.cicloSemanas : 1;
  return {
    semana: semanaDelCiclo(f, tipo.cicloInicio, ciclo),
    posicion: posicionEnSemana(f, tipo.diaSemana),
  };
}

/** Variación que corresponde a una fecha, o null si ese slot no tiene pieza definida. */
export function resolverVariacion<V extends SlotVariacion>(
  f: Date | string,
  tipo: TipoCiclo,
  variaciones: V[],
): V | null {
  if (variaciones.length === 0) return null;
  const { semana, posicion } = slotDe(f, tipo);
  return variaciones.find(v => v.semana === semana && v.posicion === posicion) ?? null;
}

/** Prefijo corto y estable a partir del nombre del tipo: "Inventario Mainstage" → "INV". */
export function prefijoDe(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z ]/g, "")
    .trim();
  const palabra = limpio.split(/\s+/)[0] ?? "";
  return (palabra.slice(0, 3) || "VAR").toUpperCase();
}

/** Código sugerido para una variación: INV-S3-P2 */
export function codigoSugerido(nombreTipo: string, semana: number, posicion: number): string {
  return `${prefijoDe(nombreTipo)}-S${semana}-P${posicion}`;
}

/** Etiqueta legible del slot: "Semana 3 · Miércoles" */
export function etiquetaSlot(tipo: TipoCiclo, semana: number, posicion: number): string {
  const dias = diasDelTipo(tipo.diaSemana);
  const dia = dias[posicion - 1];
  const ciclo = tipo.cicloSemanas && tipo.cicloSemanas > 0 ? tipo.cicloSemanas : 1;
  const partes: string[] = [];
  if (ciclo > 1) partes.push(`Semana ${semana}`);
  partes.push(dia !== undefined ? DIA_NOMBRE[dia] : `Publicación ${posicion}`);
  return partes.join(" · ");
}

/** Todas las fechas del mes que caen en un día de la semana dado. */
function ocurrenciasDe(year: number, month: number, weekday: number): string[] {
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const fechas: string[] = [];
  for (let d = 1; d <= total; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (diaSemanaDe(iso) === weekday) fechas.push(iso);
  }
  return fechas;
}

/** n elementos repartidos uniformemente sobre arr. */
function repartirUniforme(arr: string[], n: number): string[] {
  if (n <= 0) return [];
  if (n >= arr.length) return [...arr];
  if (n === 1) return [arr[Math.floor(arr.length / 2)]];
  return Array.from({ length: n }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (n - 1))]);
}

/**
 * Fechas ("YYYY-MM-DD") que le tocan a un tipo en un mes.
 * - diaSemana + semanaDelMes: esa ocurrencia exacta (ej. 1er lunes).
 * - diaSemana solo: prioriza esos días; si no alcanzan, rellena repartiendo el resto.
 * - sin diaSemana: reparte uniformemente sobre el mes.
 */
export function generarFechasDelMes(
  year: number,
  month: number,
  tipo: { cantMes: number | null; diaSemana: string | null; semanaDelMes: number | null },
): string[] {
  const cant = tipo.cantMes ?? 0;
  if (cant <= 0) return [];

  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const todos = Array.from({ length: total }, (_, i) =>
    `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);

  const dias = diasDelTipo(tipo.diaSemana);

  if (dias.length > 0 && tipo.semanaDelMes) {
    return dias
      .map(wd => ocurrenciasDe(year, month, wd)[tipo.semanaDelMes! - 1])
      .filter((f): f is string => Boolean(f))
      .sort();
  }

  if (dias.length > 0) {
    const preferidos = dias.flatMap(wd => ocurrenciasDe(year, month, wd)).sort();
    if (preferidos.length >= cant) return repartirUniforme(preferidos, cant);

    const usados = new Set(preferidos);
    const resto = todos.filter(f => !usados.has(f));
    return [...preferidos, ...repartirUniforme(resto, cant - preferidos.length)].sort();
  }

  return repartirUniforme(todos, cant);
}

/**
 * Rejilla completa de slots del ciclo de un tipo: cicloSemanas × (nº de días de publicación).
 * Es la base para generar las variaciones de golpe.
 */
export function slotsDelCiclo(tipo: TipoCiclo): SlotVariacion[] {
  const ciclo = tipo.cicloSemanas && tipo.cicloSemanas > 0 ? tipo.cicloSemanas : 1;
  const porSemana = Math.max(diasDelTipo(tipo.diaSemana).length, 1);
  const slots: SlotVariacion[] = [];
  for (let s = 1; s <= ciclo; s++) {
    for (let p = 1; p <= porSemana; p++) slots.push({ semana: s, posicion: p });
  }
  return slots;
}
