import { Music, Wine, Building2, Sparkles, type LucideIcon } from "lucide-react";

// Helpers PUROS de la galería pública, seguros para servidor y cliente (sin prisma).
// El servidor los usa para sembrar la primera pintura (SSR) y el cliente para render.

export type GaleriaFoto = { src: string; caption: string };
export type GaleriaCategoria = {
  id: string;
  label: string;
  sub: string;
  cover: string;
  fotos: GaleriaFoto[];
};

// Ícono por slug del tipo de evento (la BD manda el resto del contenido).
export function iconoPorSlug(slug: string): LucideIcon {
  if (slug.includes("music")) return Music;
  if (slug.includes("social")) return Wine;
  if (slug.includes("empres")) return Building2;
  return Sparkles;
}

// Normaliza slugs/ids a una familia estable ("musical" | "social" | "empresarial")
// para que la vista individual case sin importar variantes (musical/musicales).
export function familiaTipo(s: string): string {
  const x = s.toLowerCase();
  if (x.includes("music")) return "musical";
  if (x.includes("social")) return "social";
  if (x.includes("empres")) return "empresarial";
  return x;
}

type TipoRaw = {
  slug: string;
  nombre: string;
  subtitulo: string | null;
  fotos: { url: string; caption: string | null; orden: number }[];
};

// Mapea los tipos de evento (fuente maestra) a categorías de galería, en orden.
export function mapTiposToCategorias(tipos: TipoRaw[], soloSlug?: string): GaleriaCategoria[] {
  const cats: GaleriaCategoria[] = (tipos ?? [])
    .filter(t => (t.fotos?.length ?? 0) > 0)
    .map(t => {
      const fotos = [...t.fotos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      return {
        id: t.slug,
        label: t.nombre,
        sub: t.subtitulo || "",
        cover: fotos[0].url,
        fotos: fotos.map(f => ({ src: f.url, caption: f.caption || "" })),
      };
    });
  return soloSlug ? cats.filter(c => familiaTipo(c.id) === familiaTipo(soloSlug)) : cats;
}

// Slides del hero. Prioridad: slides configurados en /galeria-inicio. Si no hay,
// en la vista individual rota las fotos del propio tipo; en la combinada rota la
// portada de cada categoría (así el hero no "copia" la primera miniatura).
export function heroFromCategorias(
  categorias: GaleriaCategoria[],
  slides: GaleriaFoto[],
  soloSlug?: string,
): GaleriaFoto[] {
  if (soloSlug) return (categorias[0]?.fotos ?? []).slice(0, 6);
  if (slides.length) return slides;
  return categorias.map(c => ({ src: c.cover, caption: c.label })).slice(0, 6);
}
