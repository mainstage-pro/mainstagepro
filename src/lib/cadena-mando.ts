// src/lib/cadena-mando.ts
// Pure function — no DB calls
//
// Quién manda en el evento. Es el bloque que contesta las tres preguntas que en
// sitio se resuelven a gritos: a quién le hago caso, quién autoriza un cambio
// que cuesta dinero, y quién habla con el cliente.
//
// No inventa campos: sale del coordinador marcado en el personal, del encargado
// del proyecto y de los contactos del cliente y del venue que ya se capturan.
// La regla de cada eslabón es doctrina de la casa, pero se puede reescribir en
// el proyecto donde no aplique — un evento con productor del cliente en sitio
// no se manda igual que una boda.

/** Llave estable del eslabón. Sobrevive a que cambie el texto visible. */
export type ClaveMando = "SITIO" | "CAMBIOS" | "CLIENTE" | "VENUE";

export const CLAVES_MANDO: ClaveMando[] = ["SITIO", "CAMBIOS", "CLIENTE", "VENUE"];

/** Reglas reescritas para un proyecto. Lo que no venga aquí usa la de la casa. */
export type ReglasMando = Partial<Record<ClaveMando, string>>;

/**
 * Persona puesta a mano en un eslabón, por encima de lo que se deduce. Sirve
 * para que mande en sitio alguien que no está en el personal del evento, o que
 * autorice cambios un técnico o una persona de fuera.
 *
 * Se guarda como foto (nombre + teléfono) y no como referencia: el documento
 * debe salir igual aunque la persona se dé de baja después.
 */
export type OrigenOcupante = "USUARIO" | "TECNICO" | "LIBRE";
export type OcupanteMando = {
  origen: OrigenOcupante;
  /** id de User o de Tecnico; null cuando se escribió a mano. */
  refId: string | null;
  nombre: string;
  contacto: string | null;
};
/** Solo los eslabones de casa se reescriben así: cliente y venue ya son texto libre. */
export type ClaveOcupable = "SITIO" | "CAMBIOS";
export type OcupantesMando = Partial<Record<ClaveOcupable, OcupanteMando>>;

/** Llave dentro del mismo JSON de reglas: así no hace falta otra columna. */
const LLAVE_OCUPANTES = "ocupantes";

export type CadenaMandoInput = {
  /** Técnico marcado como coordinador en sitio. */
  coordinadorSitio: { nombre: string; celular: string | null; rol: string | null } | null;
  /** Coordinador interno del proyecto (User.name). */
  encargadoNombre: string | null;
  /** Su celular, del expediente de personal interno. En sitio se necesita igual. */
  encargadoContacto: string | null;
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
};

export type EslabonMando = {
  clave: ClaveMando;
  /** "Manda en sitio", "Autoriza cambios", … */
  rol: string;
  /** Nombre de la persona, o null si nadie lo ocupa todavía. */
  nombre: string | null;
  contacto: string | null;
  /** La regla en una línea: qué decide y qué no. */
  regla: string;
  /** true cuando la regla se reescribió en este proyecto. */
  reglaPropia: boolean;
  /** true cuando el hueco es grave y debe verse como alerta en el documento. */
  critico: boolean;
};

/** El título de cada eslabón. Fijo: es el vocabulario con el que se opera. */
export const ROL_MANDO: Record<ClaveMando, string> = {
  SITIO: "Manda en sitio",
  CAMBIOS: "Autoriza cambios",
  CLIENTE: "Habla con el cliente",
  VENUE: "Habla con el venue",
};

/** La regla por defecto de la casa, la que aplica si nadie la reescribe. */
export const REGLA_CASA: Record<ClaveMando, string> = {
  SITIO: "Decide los cambios de montaje. Ante una duda en el evento, se le pregunta a él.",
  CAMBIOS: "Todo lo que cueste dinero o cambie el alcance pasa por él antes de ejecutarse.",
  CLIENTE: "Solo el coordinador en sitio trata con él. Nadie del equipo le ofrece ni le promete nada.",
  VENUE: "Accesos, horarios y corriente se piden por el coordinador, no directamente.",
};

/**
 * Normaliza el JSON guardado en el proyecto. Lo que venga mal formado se
 * descarta en silencio: el documento debe salir aunque el campo esté sucio.
 */
export function parseReglasMando(valor: unknown): ReglasMando {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const out: ReglasMando = {};
  for (const clave of CLAVES_MANDO) {
    const v = (valor as Record<string, unknown>)[clave];
    if (typeof v === "string" && v.trim()) out[clave] = v.trim();
  }
  return out;
}

/** Lee las personas puestas a mano. Lo mal formado se descarta, igual que las reglas. */
export function parseOcupantesMando(valor: unknown): OcupantesMando {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const crudo = (valor as Record<string, unknown>)[LLAVE_OCUPANTES];
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return {};
  const out: OcupantesMando = {};
  for (const clave of ["SITIO", "CAMBIOS"] as const) {
    const o = (crudo as Record<string, unknown>)[clave] as Record<string, unknown> | undefined;
    if (!o || typeof o !== "object") continue;
    const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
    if (!nombre) continue;
    const origen: OrigenOcupante =
      o.origen === "USUARIO" || o.origen === "TECNICO" ? o.origen : "LIBRE";
    const contacto = typeof o.contacto === "string" && o.contacto.trim() ? o.contacto.trim() : null;
    const refId = origen !== "LIBRE" && typeof o.refId === "string" && o.refId ? o.refId : null;
    out[clave] = { origen, refId, nombre, contacto };
  }
  return out;
}

/** Junta reglas y ocupantes en el JSON que se guarda. null si no hay nada. */
export function serializarMando(reglas: ReglasMando, ocupantes: OcupantesMando): Record<string, unknown> | null {
  const out: Record<string, unknown> = { ...reglas };
  if (Object.keys(ocupantes).length) out[LLAVE_OCUPANTES] = ocupantes;
  return Object.keys(out).length ? out : null;
}

/**
 * Los cuatro eslabones, siempre en el mismo orden y siempre presentes: un hueco
 * visible ("Sin asignar") comunica más que omitir el renglón.
 */
export function cadenaDeMando(
  p: CadenaMandoInput,
  reglas: ReglasMando = {},
  manuales: OcupantesMando = {}
): EslabonMando[] {
  const coord = p.coordinadorSitio;
  const sitio = manuales.SITIO
    ? { nombre: manuales.SITIO.nombre, contacto: manuales.SITIO.contacto, critico: false }
    : { nombre: coord?.nombre ?? null, contacto: coord?.celular ?? null, critico: !coord };
  const cambios = manuales.CAMBIOS
    ? { nombre: manuales.CAMBIOS.nombre, contacto: manuales.CAMBIOS.contacto, critico: false }
    : { nombre: p.encargadoNombre, contacto: p.encargadoContacto, critico: !p.encargadoNombre };
  const ocupantes: Record<ClaveMando, { nombre: string | null; contacto: string | null; critico: boolean }> = {
    SITIO: sitio,
    CAMBIOS: cambios,
    CLIENTE: { nombre: p.encargadoCliente, contacto: p.encargadoClienteContacto, critico: false },
    VENUE: { nombre: p.encargadoLugar, contacto: p.encargadoLugarContacto, critico: false },
  };

  return CLAVES_MANDO.map((clave) => {
    const propia = reglas[clave];
    return {
      clave,
      rol: ROL_MANDO[clave],
      ...ocupantes[clave],
      regla: propia ?? REGLA_CASA[clave],
      reglaPropia: Boolean(propia),
    };
  });
}

/** Una línea suelta para encabezar documentos cortos. */
export function resumenMando(p: CadenaMandoInput, manuales: OcupantesMando = {}): string {
  const m = manuales.SITIO;
  if (m) return `Coordina en sitio: ${m.nombre}${m.contacto ? ` · ${m.contacto}` : ""}`;
  const coord = p.coordinadorSitio;
  if (!coord) return "Sin coordinador en sitio asignado";
  const tel = coord.celular ? ` · ${coord.celular}` : "";
  return `Coordina en sitio: ${coord.nombre}${tel}`;
}
