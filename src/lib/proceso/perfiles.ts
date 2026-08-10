// ─────────────────────────────────────────────────────────────────────────────
// Perfiles de prospecto (a quién le estamos hablando en prospección outbound).
//
// El perfil describe QUIÉN es el contacto (un DJ siempre es DJ), por eso vive en
// el Cliente (`Cliente.perfilProspecto`), no en el Trato. La prospección del trato
// lo lee de ahí para sugerir el mensaje inicial y el material principal.
//
// Cada perfil pertenece a una CATEGORÍA que coincide con el `tipoEvento` del trato
// (MUSICAL | SOCIAL | EMPRESARIAL), de modo que al elegir perfil podemos alinear
// la categoría del evento automáticamente.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

// ── Categoría (coincide con tipoEvento) ──────────────────────────────────────
export const PERFIL_CATEGORIAS = ["MUSICAL", "SOCIAL", "EMPRESARIAL"] as const;
export type PerfilCategoria = (typeof PERFIL_CATEGORIAS)[number];

export const PERFIL_CATEGORIA_LABELS: Record<PerfilCategoria, string> = {
  MUSICAL: "Musicales",
  SOCIAL: "Sociales",
  EMPRESARIAL: "Empresariales",
};

// ── Ids de material (coinciden con MaterialCompartir en PlanContactos.tsx) ────
export type MaterialId = "servicios" | "inventario" | "musical" | "social" | "empresarial" | "galeria";

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
