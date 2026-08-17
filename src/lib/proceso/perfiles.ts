// ─────────────────────────────────────────────────────────────────────────────
// Perfiles de prospecto (a quién le estamos hablando en prospección outbound).
//
// El perfil describe QUIÉN es el contacto (un DJ siempre es DJ), por eso vive en
// el Cliente (`Cliente.perfilProspecto`), no en el Trato. La prospección del trato
// lo lee de ahí para sugerir el mensaje inicial y el material principal.
//
// Cada perfil pertenece a una CATEGORÍA que coincide con el `tipoEvento` del trato
// (MUSICAL | SOCIAL | EMPRESARIAL | OTRO), de modo que al elegir perfil podemos alinear
// la categoría del evento automáticamente.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

// ── Categoría (coincide con tipoEvento) ──────────────────────────────────────
export const PERFIL_CATEGORIAS = ["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"] as const;
export type PerfilCategoria = (typeof PERFIL_CATEGORIAS)[number];

export const PERFIL_CATEGORIA_LABELS: Record<PerfilCategoria, string> = {
  MUSICAL: "Musicales",
  SOCIAL: "Sociales",
  EMPRESARIAL: "Empresariales",
  OTRO: "Otros eventos",
};

// ── Ids de material (coinciden con MaterialCompartir en PlanContactos.tsx) ────
export type MaterialId = "servicios" | "inventario" | "musical" | "social" | "empresarial" | "otro" | "galeria";

// ── Definición de un perfil ──────────────────────────────────────────────────
export type Perfil = {
  id: string;
  label: string;
  categoria: PerfilCategoria;
  // Material principal a compartir, en orden de prioridad.
  materiales: MaterialId[];
  // Mensaje de primer contacto (outbound). Centrado en la persona, no en nosotros.
  mensajeInicial: (nombre: string, empresa?: string | null) => string;
};

const emp = (empresa?: string | null) => (empresa && empresa.trim() ? empresa.trim() : "su equipo");

export const PERFILES: Perfil[] = [
  // ── Musicales ──────────────────────────────────────────────────────────────
  {
    id: "PROMOTOR", label: "Promotor", categoria: "MUSICAL",
    materiales: ["musical", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, te escribo de *Mainstage Pro*. Hemos estado viendo los eventos que produces y nos encanta el nivel y la energía que logras con tu público.\n\nNosotros hacemos producción de audio, iluminación y video para shows en vivo. ¿Te puedo enviar información de cómo podríamos apoyarte en tus próximos eventos?`,
  },
  {
    id: "DJ_MUSICAL", label: "DJ", categoria: "MUSICAL",
    materiales: ["musical", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, seguimos tu trabajo y nos encanta el ambiente que creas en cada set.\n\nEn *Mainstage Pro* hacemos audio, iluminación y video para presentaciones en vivo, y creemos que podríamos hacer que tus shows se vean y suenen aún más impresionantes. ¿Te comparto algo de información?`,
  },
  {
    id: "MUSICO", label: "Músico", categoria: "MUSICAL",
    materiales: ["musical", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, vimos tus presentaciones en redes y nos encanta tu propuesta.\n\nEn *Mainstage Pro* producimos audio, iluminación y video para conciertos en vivo y nos encantaría acompañarte en tus próximas fechas. ¿Te comparto un poco de lo que hacemos?`,
  },
  {
    id: "FORO_EVENTOS", label: "Foro de eventos", categoria: "MUSICAL",
    materiales: ["musical", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, hemos visto los eventos que reciben en su foro y se ven increíbles.\n\nEn *Mainstage Pro* nos especializamos en producción técnica (audio, iluminación y video) y nos encantaría ser su aliado técnico. ¿Les puedo enviar información?`,
  },
  {
    id: "EMPRESA_RENTA", label: "Empresa de renta", categoria: "MUSICAL",
    materiales: ["inventario", "servicios", "galeria"],
    mensajeInicial: (n) => `Hola ${n}, vimos su trabajo en redes y nos parece muy sólido.\n\nEn *Mainstage Pro* a veces complementamos equipo y producción para eventos grandes y creemos que podríamos colaborar. ¿Les comparto lo que manejamos?`,
  },

  // ── Sociales ───────────────────────────────────────────────────────────────
  {
    id: "WEDDING_PLANNER", label: "Wedding planner", categoria: "SOCIAL",
    materiales: ["social", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, seguimos las bodas que organizas y son preciosas, se nota el cuidado en cada detalle.\n\nEn *Mainstage Pro* hacemos audio, iluminación y video, y nos encantaría ser tu aliado técnico para que todo suene y se vea impecable. ¿Te comparto información?`,
  },
  {
    id: "SALON_EVENTOS", label: "Salón de eventos", categoria: "SOCIAL",
    materiales: ["social", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, vimos los eventos que se realizan en su salón y se ven espectaculares.\n\nEn *Mainstage Pro* hacemos producción de audio, iluminación y video y nos encantaría ser su proveedor técnico de confianza. ¿Les puedo enviar información?`,
  },
  {
    id: "DJ_SOCIAL", label: "DJ de eventos sociales", categoria: "SOCIAL",
    materiales: ["social", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, nos encanta el ambiente que logras en las fiestas que animas.\n\nEn *Mainstage Pro* complementamos con audio, iluminación y video de alto nivel para que tus eventos brillen aún más. ¿Te comparto lo que hacemos?`,
  },
  {
    id: "GRADUACIONES", label: "Graduaciones", categoria: "SOCIAL",
    materiales: ["social", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, vimos los eventos de graduación que organizan y se ven muy bien logrados.\n\nEn *Mainstage Pro* nos especializamos en audio, iluminación y video y nos encantaría apoyarlos en las próximas generaciones. ¿Les envío información?`,
  },

  // ── Empresariales ──────────────────────────────────────────────────────────
  {
    id: "EMPRESA", label: "Empresa", categoria: "EMPRESARIAL",
    materiales: ["empresarial", "galeria", "servicios"],
    mensajeInicial: (n, e) => `Hola ${n}, hemos visto los eventos y activaciones de ${emp(e)} y nos encanta cómo cuidan su imagen.\n\nEn *Mainstage Pro* producimos audio, iluminación y video para eventos corporativos y nos encantaría apoyarlos en su próximo evento. ¿Les comparto información?`,
  },
  {
    id: "DESARROLLADOR_INMOBILIARIO", label: "Desarrollador inmobiliario", categoria: "EMPRESARIAL",
    materiales: ["empresarial", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, seguimos los eventos de lanzamiento que realizan y se ven de gran nivel.\n\nEn *Mainstage Pro* hacemos producción técnica para presentaciones y experiencias de marca. ¿Les puedo enviar información de cómo podríamos colaborar?`,
  },
  {
    id: "ESCUELA", label: "Escuela", categoria: "EMPRESARIAL",
    materiales: ["social", "empresarial", "galeria"],
    mensajeInicial: (n) => `Hola ${n}, vimos los eventos y ceremonias que organizan y se nota el esfuerzo detrás.\n\nEn *Mainstage Pro* nos dedicamos a audio, iluminación y video y nos encantaría apoyarlos en graduaciones, festivales y ceremonias. ¿Les comparto información?`,
  },
  {
    id: "CONFERENCISTA", label: "Conferencista", categoria: "EMPRESARIAL",
    materiales: ["empresarial", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, seguimos tus conferencias y nos encanta el impacto que generas en el escenario.\n\nEn *Mainstage Pro* producimos audio, iluminación y video para que tus presentaciones se vivan al máximo. ¿Te comparto lo que hacemos?`,
  },

  // ── Otros eventos ──────────────────────────────────────────────────────────
  {
    id: "PROMOTOR_DEPORTIVO", label: "Promotor deportivo", categoria: "OTRO",
    materiales: ["otro", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, hemos seguido los eventos deportivos que organizas y se nota el trabajo detrás de cada uno.\n\nEn *Mainstage Pro* hacemos audio, iluminación y video para eventos masivos y nos encantaría que la narración y el ambiente se escuchen parejo en toda la sede. ¿Te comparto información?`,
  },
  {
    id: "CLUB_DEPORTIVO", label: "Club / equipo deportivo", categoria: "OTRO",
    materiales: ["otro", "galeria", "servicios"],
    mensajeInicial: (n, e) => `Hola ${n}, seguimos los partidos y eventos de ${emp(e)} y nos gusta mucho la experiencia que le dan a su afición.\n\nEn *Mainstage Pro* producimos audio, iluminación y video para eventos deportivos. ¿Les puedo enviar información de cómo podríamos apoyarlos?`,
  },
  {
    id: "PRODUCTOR_TEATRAL", label: "Productor teatral", categoria: "OTRO",
    materiales: ["otro", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, vimos las puestas en escena que produces y se ven muy cuidadas.\n\nEn *Mainstage Pro* hacemos diseño de iluminación, audio y video para teatro y artes escénicas, con cues programados escena por escena. ¿Te comparto lo que hacemos?`,
  },
  {
    id: "COMEDIANTE", label: "Comediante / Stand-up", categoria: "OTRO",
    materiales: ["otro", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, seguimos tus shows y nos encanta cómo conectas con el público.\n\nEn *Mainstage Pro* nos encargamos de que tu voz se entienda perfecto hasta la última fila, con la luz y el audio que el show necesita. ¿Te comparto información?`,
  },
  {
    id: "AGENCIA_RP", label: "Agencia de RP / comunicación", categoria: "OTRO",
    materiales: ["otro", "empresarial", "servicios"],
    mensajeInicial: (n, e) => `Hola ${n}, hemos visto los eventos y ruedas de prensa que maneja ${emp(e)} y se nota el cuidado en el mensaje.\n\nEn *Mainstage Pro* damos el respaldo técnico: audio limpio para medios, backdrop, transmisión y grabación. ¿Les comparto información?`,
  },
  {
    id: "INSTITUCION_CULTURAL", label: "Institución cultural / Gobierno", categoria: "OTRO",
    materiales: ["otro", "galeria", "servicios"],
    mensajeInicial: (n, e) => `Hola ${n}, seguimos la programación cultural de ${emp(e)} y nos parece muy valiosa.\n\nEn *Mainstage Pro* hacemos producción técnica para festivales, presentaciones escénicas y eventos en plaza pública. ¿Les puedo enviar información?`,
  },
  {
    id: "ORGANIZACION_RELIGIOSA", label: "Organización religiosa", categoria: "OTRO",
    materiales: ["otro", "galeria", "servicios"],
    mensajeInicial: (n) => `Hola ${n}, vimos los servicios y encuentros que organizan y se nota la convocatoria que tienen.\n\nEn *Mainstage Pro* hacemos audio, iluminación, proyección y transmisión para eventos religiosos. ¿Les comparto información?`,
  },
];

// ── Índices y helpers ────────────────────────────────────────────────────────
export const PERFIL_IDS = PERFILES.map((p) => p.id);
export const PERFIL_LABELS: Record<string, string> = Object.fromEntries(
  PERFILES.map((p) => [p.id, p.label]),
);

export function getPerfil(id: string | null | undefined): Perfil | null {
  if (!id) return null;
  return PERFILES.find((p) => p.id === id) ?? null;
}

export const perfilLabel = (id: string | null | undefined): string =>
  (id && PERFIL_LABELS[id]) || "—";

// Perfiles agrupados por categoría, en orden, para pintar el selector.
export const PERFILES_POR_CATEGORIA: { categoria: PerfilCategoria; label: string; perfiles: Perfil[] }[] =
  PERFIL_CATEGORIAS.map((categoria) => ({
    categoria,
    label: PERFIL_CATEGORIA_LABELS[categoria],
    perfiles: PERFILES.filter((p) => p.categoria === categoria),
  }));

export const zPerfilProspecto = z.enum(PERFIL_IDS as [string, ...string[]]);

// ── Perfiles personalizados (BD) ─────────────────────────────────────────────
// Cuando un contacto no encaja en ningún perfil base, se agrega uno propio bajo
// la misma categoría (= tipoEvento). Vive en la tabla `perfiles_prospecto`.
export type CustomPerfil = {
  id: string;
  label: string;
  categoria: PerfilCategoria;
  mensajeInicial: string | null; // plantilla con {nombre} / {empresa}; null = genérico
  materiales: MaterialId[] | null;
};

// Material principal por categoría (fallback para perfiles sin materiales propios).
export const MATERIALES_POR_CATEGORIA: Record<PerfilCategoria, MaterialId[]> = {
  MUSICAL: ["musical", "galeria", "servicios"],
  SOCIAL: ["social", "galeria", "servicios"],
  EMPRESARIAL: ["empresarial", "galeria", "servicios"],
  OTRO: ["otro", "galeria", "servicios"],
};

// Mensaje de primer contacto genérico por categoría (fallback).
const MENSAJE_GENERICO: Record<PerfilCategoria, (nombre: string, empresa?: string | null) => string> = {
  MUSICAL: (n) => `Hola ${n}, seguimos tu trabajo y nos encanta el nivel que logras con tu público.\n\nEn *Mainstage Pro* hacemos producción de audio, iluminación y video para shows en vivo y nos encantaría acompañarte en tus próximos eventos. ¿Te comparto información?`,
  SOCIAL: (n) => `Hola ${n}, nos encanta el cuidado y el ambiente de los eventos que realizas.\n\nEn *Mainstage Pro* hacemos audio, iluminación y video, y nos encantaría ser tu aliado técnico para que todo suene y se vea impecable. ¿Te comparto información?`,
  EMPRESARIAL: (n, e) => `Hola ${n}, hemos visto los eventos de ${emp(e)} y nos encanta cómo cuidan su imagen.\n\nEn *Mainstage Pro* producimos audio, iluminación y video para eventos corporativos y nos encantaría apoyarlos en su próximo evento. ¿Les comparto información?`,
  OTRO: (n, e) => `Hola ${n}, hemos visto los eventos que realiza ${emp(e)} y nos parecen muy bien logrados.\n\nEn *Mainstage Pro* hacemos audio, iluminación y video para todo tipo de evento: deportivos, teatro, comedia, culturales y ruedas de prensa. ¿Les comparto información?`,
};

const aplicarPlantilla = (tpl: string, nombre: string, empresa?: string | null) =>
  tpl.replace(/\{nombre\}/g, nombre).replace(/\{empresa\}/g, emp(empresa));

// Perfil ya resuelto (base o custom) listo para pintar mensaje y material.
export type ResolvedPerfil = {
  id: string;
  label: string;
  categoria: PerfilCategoria;
  materiales: MaterialId[];
  mensajeInicial: (nombre: string, empresa?: string | null) => string;
  esCustom: boolean;
};

// Resuelve un id de perfil contra los base y luego contra los custom de BD.
export function resolvePerfil(
  id: string | null | undefined,
  custom: CustomPerfil[] = [],
): ResolvedPerfil | null {
  if (!id) return null;
  const base = getPerfil(id);
  if (base) return { ...base, esCustom: false };
  const c = custom.find((p) => p.id === id);
  if (!c) return null;
  return {
    id: c.id,
    label: c.label,
    categoria: c.categoria,
    materiales: c.materiales && c.materiales.length > 0 ? c.materiales : MATERIALES_POR_CATEGORIA[c.categoria],
    mensajeInicial: c.mensajeInicial
      ? (n, e) => aplicarPlantilla(c.mensajeInicial as string, n, e)
      : MENSAJE_GENERICO[c.categoria],
    esCustom: true,
  };
}

// Etiqueta resolviendo también los custom (para tablas/badges).
export const resolvePerfilLabel = (id: string | null | undefined, custom: CustomPerfil[] = []): string =>
  resolvePerfil(id, custom)?.label ?? "—";

// ── Multi-perfil (hasta 3 por cliente) ───────────────────────────────────────
export const MAX_PERFILES = 3;

// Parsea el JSON array de perfiles del cliente. Tolera el formato viejo (single).
export function parsePerfiles(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
    } catch {
      return [];
    }
  }
  return [s]; // valor single legacy
}

// Serializa a JSON array (máx 3, sin duplicados). null si queda vacío.
export function serializePerfiles(ids: (string | null | undefined)[]): string | null {
  const clean = Array.from(new Set(ids.filter((x): x is string => Boolean(x && x.trim())))).slice(0, MAX_PERFILES);
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

// Resuelve una lista de ids a ResolvedPerfil[], descartando los que no existen.
export function resolvePerfiles(ids: string[], custom: CustomPerfil[] = []): ResolvedPerfil[] {
  return ids.map((id) => resolvePerfil(id, custom)).filter((p): p is ResolvedPerfil => p !== null);
}

// Base + custom agrupados por categoría, para pintar el selector.
export function perfilesPorCategoriaCon(custom: CustomPerfil[] = []) {
  return PERFIL_CATEGORIAS.map((categoria) => ({
    categoria,
    label: PERFIL_CATEGORIA_LABELS[categoria],
    perfiles: [
      ...PERFILES.filter((p) => p.categoria === categoria).map((p) => ({ id: p.id, label: p.label, esCustom: false })),
      ...custom.filter((p) => p.categoria === categoria).map((p) => ({ id: p.id, label: p.label, esCustom: true })),
    ],
  }));
}
