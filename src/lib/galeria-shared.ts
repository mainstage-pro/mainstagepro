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

// Respaldo con las imágenes de /public. Solo aplica cuando la BD aún no tiene
// tipos con fotos (local o entorno recién sembrado); en producción manda la BD.
export const FALLBACK_CATEGORIAS: GaleriaCategoria[] = [
  {
    id: "musical",
    label: "Eventos Musicales",
    sub: "Conciertos · Festivales · DJ Sets · Shows en vivo",
    cover: "/images/presentacion/musicales/Musicales-076.jpg",
    fotos: [
      { src: "/images/presentacion/musicales/Musicales-016.jpg", caption: "Producción completa en vivo" },
      { src: "/images/presentacion/musicales/Musicales-037.jpg", caption: "Iluminación · Show en escenario" },
      { src: "/images/presentacion/musicales/Musicales-076.jpg", caption: "DJ Set · Equipo profesional" },
      { src: "/images/presentacion/musicales/MAGIC_ROOM_260307_GUANAJUATO_078.jpg", caption: "Festival · Guanajuato" },
      { src: "/images/presentacion/musicales/Musicales-055.jpg", caption: "Producción de luz · Efectos especiales" },
      { src: "/images/presentacion/musicales/Afrodise-59.jpg", caption: "Stage completo · Noche" },
      { src: "/images/presentacion/musicales/DSC07491.jpg", caption: "En vivo · Operación técnica" },
      { src: "/images/presentacion/musicales/Musicales-126.jpg", caption: "Show · Producción audiovisual" },
    ],
  },
  {
    id: "social",
    label: "Eventos Sociales",
    sub: "Bodas · XV Años · Celebraciones privadas",
    cover: "/images/presentacion/sociales/s-boda-elegante.jpg",
    fotos: [
      { src: "/images/presentacion/sociales/s-boda-elegante.jpg", caption: "Boda · Producción exterior elegante" },
      { src: "/images/presentacion/sociales/s-dj-salon.png", caption: "DJ · Ambiente de salón" },
      { src: "/images/presentacion/sociales/s-hacienda-iluminada.jpg", caption: "Hacienda · Iluminación dramática" },
      { src: "/images/presentacion/sociales/s-boda-colonial.jpg", caption: "Boda · Venue colonial" },
      { src: "/images/presentacion/sociales/s-piano-pista.jpg", caption: "Piano · Pista espejada" },
      { src: "/images/presentacion/sociales/s-hacienda-aerea.jpg", caption: "Vista aérea · Iluminación completa" },
    ],
  },
  {
    id: "empresarial",
    label: "Eventos Empresariales",
    sub: "Conferencias · Lanzamientos · Corporativos",
    cover: "/images/presentacion/empresariales/e-auditorio.jpg",
    fotos: [
      { src: "/images/presentacion/empresariales/e-auditorio.jpg", caption: "Auditorio · Producción completa" },
      { src: "/images/presentacion/empresariales/e-sala-pantallas.jpg", caption: "Sala · Conferencia profesional" },
      { src: "/images/presentacion/empresariales/e-carpa-led.jpg", caption: "Carpa · Pantalla LED exterior" },
      { src: "/images/presentacion/empresariales/e-networking.jpg", caption: "Networking · Ambiente corporativo" },
      { src: "/images/presentacion/empresariales/e-edificio-azul.jpg", caption: "Inauguración · Iluminación arquitectónica" },
      { src: "/images/presentacion/empresariales/e-proyeccion-mural.jpg", caption: "Proyección artística · Evento exclusivo" },
    ],
  },
];

// Devuelve las categorías con fotos; si vienen vacías usa el respaldo local.
export function categoriasConRespaldo(cats: GaleriaCategoria[], soloSlug?: string): GaleriaCategoria[] {
  const base = cats.length ? cats : FALLBACK_CATEGORIAS;
  return soloSlug ? base.filter(c => familiaTipo(c.id) === familiaTipo(soloSlug)) : base;
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

// Combina las fotos de todas las categorías intercalándolas (round-robin) para
// que ningún tipo de evento quede agrupado: musicales, sociales y empresariales
// aparecen mezclados. Orden estable (mismo resultado en servidor y cliente) para
// no romper la hidratación; el barajado aleatorio se hace en el cliente al montar.
export function mezclarFotosCategorias(categorias: GaleriaCategoria[]): GaleriaFoto[] {
  const listas = categorias.map(c => c.fotos);
  const maxLen = listas.reduce((m, l) => Math.max(m, l.length), 0);
  const out: GaleriaFoto[] = [];
  for (let i = 0; i < maxLen; i++) {
    for (const lista of listas) {
      if (i < lista.length) out.push(lista[i]);
    }
  }
  // Elimina duplicados por src (una misma foto podría vivir en dos categorías).
  const vistas = new Set<string>();
  return out.filter(f => (vistas.has(f.src) ? false : (vistas.add(f.src), true)));
}

// Baraja una copia del arreglo (Fisher-Yates). Solo para uso en el cliente:
// produce un orden distinto en cada render, incompatible con SSR/hidratación.
export function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
