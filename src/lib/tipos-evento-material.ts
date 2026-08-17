// Material por tipo de evento (portadas y fotos) para las presentaciones.
// Módulo neutral: lo usan tanto el servidor (para sembrar la primera pintura)
// como el hook cliente, y por eso el mapeo vive aquí y no en ninguno de los dos.
export type MaterialTipoEvento = {
  slug: string;
  nombre: string;
  subtitulo: string;
  cover: string;
  fotos: { url: string; caption: string }[];
  destacadas: { url: string; caption: string }[];
};

type FotoInput = { url: string; caption: string | null; destacada: boolean };
type TipoInput = { slug: string; nombre: string; subtitulo: string | null; fotos: FotoInput[] };

// Las fotos llegan ya ordenadas (destacadas primero) desde ORDER_FOTOS_TIPO_EVENTO.
export function mapTiposMaterial(tipos: TipoInput[]): MaterialTipoEvento[] {
  return tipos
    .filter((t) => (t.fotos?.length ?? 0) > 0)
    .map((t) => ({
      slug: t.slug,
      nombre: t.nombre,
      subtitulo: t.subtitulo || "",
      cover: t.fotos[0].url,
      fotos: t.fotos.map((f) => ({ url: f.url, caption: f.caption || "" })),
      destacadas: t.fotos.filter((f) => f.destacada).map((f) => ({ url: f.url, caption: f.caption || "" })),
    }));
}
