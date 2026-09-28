// src/lib/cadena-mando.ts
// Pure function — no DB calls
//
// Quién manda en el evento. Es el bloque que contesta las tres preguntas que en
// sitio se resuelven a gritos: a quién le hago caso, quién autoriza un cambio
// que cuesta dinero, y quién habla con el cliente.
//
// No inventa campos: sale del coordinador marcado en el personal, del encargado
// del proyecto y de los contactos del cliente y del venue que ya se capturan.

export type CadenaMandoInput = {
  /** Técnico marcado como coordinador en sitio. */
  coordinadorSitio: { nombre: string; celular: string | null; rol: string | null } | null;
  /** Coordinador interno del proyecto (User.name). */
  encargadoNombre: string | null;
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
};

export type EslabonMando = {
  /** "Manda en sitio", "Autoriza cambios", … */
  rol: string;
  /** Nombre de la persona, o null si nadie lo ocupa todavía. */
  nombre: string | null;
  contacto: string | null;
  /** La regla en una línea: qué decide y qué no. */
  regla: string;
  /** true cuando el hueco es grave y debe verse como alerta en el documento. */
  critico: boolean;
};

/**
 * Los cuatro eslabones, siempre en el mismo orden y siempre presentes: un hueco
 * visible ("Sin asignar") comunica más que omitir el renglón.
 */
export function cadenaDeMando(p: CadenaMandoInput): EslabonMando[] {
  const coord = p.coordinadorSitio;
  return [
    {
      rol: "Manda en sitio",
      nombre: coord?.nombre ?? null,
      contacto: coord?.celular ?? null,
      regla: "Decide los cambios de montaje. Ante una duda en el evento, se le pregunta a él.",
      critico: !coord,
    },
    {
      rol: "Autoriza cambios",
      nombre: p.encargadoNombre,
      contacto: null,
      regla: "Todo lo que cueste dinero o cambie el alcance pasa por él antes de ejecutarse.",
      critico: !p.encargadoNombre,
    },
    {
      rol: "Habla con el cliente",
      nombre: p.encargadoCliente,
      contacto: p.encargadoClienteContacto,
      regla: "Solo el coordinador en sitio trata con él. Nadie del equipo le ofrece ni le promete nada.",
      critico: false,
    },
    {
      rol: "Habla con el venue",
      nombre: p.encargadoLugar,
      contacto: p.encargadoLugarContacto,
      regla: "Accesos, horarios y corriente se piden por el coordinador, no directamente.",
      critico: false,
    },
  ];
}

/** Una línea suelta para encabezar documentos cortos. */
export function resumenMando(p: CadenaMandoInput): string {
  const coord = p.coordinadorSitio;
  if (!coord) return "Sin coordinador en sitio asignado";
  const tel = coord.celular ? ` · ${coord.celular}` : "";
  return `Coordina en sitio: ${coord.nombre}${tel}`;
}
