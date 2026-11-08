// Helpers y tipos compartidos del módulo Formularios (reclutamiento).
// Mantiene fuera de rutas la lógica común: tipos, slug, acceso, parsers.
import { prisma } from "@/lib/prisma";

export type FormularioEstado = "BORRADOR" | "PUBLICADO" | "CERRADO";

export const TIPOS_PREGUNTA = [
  "texto_corto",
  "parrafo",
  "opcion_unica",
  "opcion_multiple",
  "si_no",
  "lista",
  "archivo_o_liga",
  "casilla",
] as const;
export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export interface CondicionMostrarSi {
  pregunta: string; // id o código
  valorEn: string[];
}
export type MostrarSi =
  | CondicionMostrarSi
  | { todas: CondicionMostrarSi[] }
  | null;

// Solo Administrador y Director tienen acceso al módulo (spec §8).
// En este repo eso mapea a role=ADMIN o area=DIRECCION.
type SessionLike = { role?: string | null; area?: string | null } | null;
export function puedeVerFormularios(s: SessionLike): boolean {
  if (!s) return false;
  return s.role === "ADMIN" || s.area === "DIRECCION";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "formulario";
}

export async function slugUnico(base: string, excluirId?: string): Promise<string> {
  const raiz = slugify(base);
  let slug = raiz;
  let i = 2;
  while (true) {
    const existente = await prisma.formulario.findUnique({ where: { slug } });
    if (!existente || existente.id === excluirId) return slug;
    slug = `${raiz}-${i++}`;
    if (i > 500) return `${raiz}-${Date.now()}`;
  }
}

export function parseJSON<T>(valor: string | null | undefined, fallback: T): T {
  if (!valor) return fallback;
  try {
    return JSON.parse(valor) as T;
  } catch {
    return fallback;
  }
}

// Serializa SIN la valoracion (lo que ve el candidato).
export function pregPublica(p: {
  id: string;
  orden: number;
  codigo: string | null;
  texto: string;
  ayuda: string | null;
  tipo: string;
  obligatoria: boolean;
  opciones: string | null;
  mostrarSi: string | null;
}) {
  return {
    id: p.id,
    orden: p.orden,
    codigo: p.codigo,
    texto: p.texto,
    ayuda: p.ayuda,
    tipo: p.tipo,
    obligatoria: p.obligatoria,
    opciones: parseJSON<string[]>(p.opciones, []),
    mostrarSi: parseJSON<MostrarSi>(p.mostrarSi, null),
  };
}

// Evalúa mostrarSi contra un mapa de respuestas { preguntaId: valor }.
// valor puede ser string o string[]; "incluye alguno de" para arrays.
export function seMuestra(cond: MostrarSi, respuestas: Record<string, unknown>): boolean {
  if (!cond) return true;
  if ("todas" in cond) {
    return cond.todas.every((c) => seMuestra(c, respuestas));
  }
  const v = respuestas[cond.pregunta];
  if (v == null) return false;
  if (Array.isArray(v)) return v.some((x) => cond.valorEn.includes(String(x)));
  return cond.valorEn.includes(String(v));
}
