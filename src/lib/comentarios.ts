// Comentarios genéricos con @menciones (modelo Comentario). La mención vive
// en el texto como markup "@[Nombre](userId)"; no hay tabla de menciones
// aparte — se parsea al leer/guardar.

export type EntidadComentario = "TRATO" | "PROYECTO" | "COTIZACION" | "CLIENTE" | "EQUIPO";

export const ENTIDAD_HREF: Record<EntidadComentario, (id: string) => string> = {
  TRATO: (id) => `/crm/tratos/${id}`,
  PROYECTO: (id) => `/proyectos/${id}`,
  COTIZACION: (id) => `/cotizaciones/${id}`,
  CLIENTE: (id) => `/crm/clientes/${id}`,
  EQUIPO: (id) => `/inventario/equipos/${id}`,
};

const MENCION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** IDs de usuario mencionados en el contenido (sin duplicados). */
export function extraerMenciones(contenido: string): string[] {
  const ids = new Set<string>();
  for (const m of contenido.matchAll(MENCION_RE)) ids.add(m[2]);
  return [...ids];
}

/** Convierte el markup "@[Nombre](id)" a texto plano legible ("@Nombre"). */
export function mencionesATexto(contenido: string): string {
  return contenido.replace(MENCION_RE, "@$1");
}

/** Divide el contenido en segmentos de texto plano y menciones, para renderizar con estilo. */
export function segmentarContenido(contenido: string): Array<{ texto: string; mencion: boolean; userId?: string }> {
  const segmentos: Array<{ texto: string; mencion: boolean; userId?: string }> = [];
  let ultimo = 0;
  for (const m of contenido.matchAll(MENCION_RE)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) segmentos.push({ texto: contenido.slice(ultimo, inicio), mencion: false });
    segmentos.push({ texto: `@${m[1]}`, mencion: true, userId: m[2] });
    ultimo = inicio + m[0].length;
  }
  if (ultimo < contenido.length) segmentos.push({ texto: contenido.slice(ultimo), mencion: false });
  return segmentos;
}
