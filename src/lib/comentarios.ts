// Comentarios/mensajes con @menciones y #referencias (modelos Comentario y
// Mensaje). Ninguna vive en tabla aparte — ambas viven como markup dentro del
// texto y se parsean al leer/guardar:
//   @menciones de usuario:  "@[Nombre](userId)"
//   #referencias a entidad: "#[Tipo: Nombre](TIPO:id)"  (p.ej. "#[Proyecto: Boda García](PROYECTO:abc123)")
// Así se puede taggear un proyecto/trato/cotización/cliente/equipo dentro de
// un comentario o un mensaje de chat, igual que se menciona a una persona.

export type EntidadComentario = "TRATO" | "PROYECTO" | "COTIZACION" | "CLIENTE" | "EQUIPO";

export const ENTIDAD_HREF: Record<EntidadComentario, (id: string) => string> = {
  TRATO: (id) => `/crm/tratos/${id}`,
  PROYECTO: (id) => `/proyectos/${id}`,
  COTIZACION: (id) => `/cotizaciones/${id}`,
  CLIENTE: (id) => `/crm/clientes/${id}`,
  EQUIPO: (id) => `/inventario/equipos/${id}`,
};

export const ENTIDAD_LABEL: Record<EntidadComentario, string> = {
  TRATO: "Trato",
  PROYECTO: "Proyecto",
  COTIZACION: "Cotización",
  CLIENTE: "Cliente",
  EQUIPO: "Equipo",
};

const MENCION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;
// "#[Proyecto: Boda García](PROYECTO:abc123)" → label="Proyecto: Boda García", tipo="PROYECTO", id="abc123"
const REFERENCIA_RE = /#\[([^\]]+)\]\((TRATO|PROYECTO|COTIZACION|CLIENTE|EQUIPO):([^)]+)\)/g;

/** IDs de usuario mencionados en el contenido (sin duplicados). */
export function extraerMenciones(contenido: string): string[] {
  const ids = new Set<string>();
  for (const m of contenido.matchAll(MENCION_RE)) ids.add(m[2]);
  return [...ids];
}

/** Entidades referenciadas con #tag en el contenido (sin duplicados). */
export function extraerReferencias(contenido: string): Array<{ tipo: EntidadComentario; id: string }> {
  const vistos = new Set<string>();
  const out: Array<{ tipo: EntidadComentario; id: string }> = [];
  for (const m of contenido.matchAll(REFERENCIA_RE)) {
    const tipo = m[2] as EntidadComentario;
    const id = m[3];
    const key = `${tipo}:${id}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    out.push({ tipo, id });
  }
  return out;
}

/** Convierte "@[Nombre](id)" → "@Nombre" y "#[Tipo: Nombre](TIPO:id)" → "#Nombre" para texto plano. */
export function mencionesATexto(contenido: string): string {
  return contenido
    .replace(MENCION_RE, "@$1")
    .replace(REFERENCIA_RE, (_m, label: string) => `#${label.replace(/^[^:]+:\s*/, "")}`);
}

export type Segmento =
  | { texto: string; tipo: "texto" }
  | { texto: string; tipo: "mencion"; userId: string }
  | { texto: string; tipo: "referencia"; entidadTipo: EntidadComentario; entidadId: string };

/** Divide el contenido en segmentos (texto / mención / referencia) para renderizar con estilo. */
export function segmentarContenido(contenido: string): Segmento[] {
  const matches: Array<{ inicio: number; fin: number; seg: Segmento }> = [];

  for (const m of contenido.matchAll(MENCION_RE)) {
    const inicio = m.index ?? 0;
    matches.push({ inicio, fin: inicio + m[0].length, seg: { texto: `@${m[1]}`, tipo: "mencion", userId: m[2] } });
  }
  for (const m of contenido.matchAll(REFERENCIA_RE)) {
    const inicio = m.index ?? 0;
    const nombre = m[1].replace(/^[^:]+:\s*/, "");
    matches.push({
      inicio, fin: inicio + m[0].length,
      seg: { texto: `#${nombre}`, tipo: "referencia", entidadTipo: m[2] as EntidadComentario, entidadId: m[3] },
    });
  }
  matches.sort((a, b) => a.inicio - b.inicio);

  const segmentos: Segmento[] = [];
  let ultimo = 0;
  for (const { inicio, fin, seg } of matches) {
    if (inicio < ultimo) continue; // solape — ignora el segundo match
    if (inicio > ultimo) segmentos.push({ texto: contenido.slice(ultimo, inicio), tipo: "texto" });
    segmentos.push(seg);
    ultimo = fin;
  }
  if (ultimo < contenido.length) segmentos.push({ texto: contenido.slice(ultimo), tipo: "texto" });
  return segmentos;
}
