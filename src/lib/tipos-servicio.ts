import { prisma } from "@/lib/prisma";
import type { GaleriaFoto } from "@/lib/galeria-shared";

// Material (portada + fotos) de un tipo de servicio para su presentación pública.
// Espeja a src/lib/tipos-evento.ts. Se sirve por SSR desde la página del servicio
// para sembrar la primera pintura y evitar el parpadeo/cambio de portada.
//
// - portada: primera foto por `orden` (la marcada como portada en el catálogo).
// - fotos:   todas, en el orden del catálogo (orden asc), listas para la galería.
export async function getServicioMaterial(slug: string): Promise<{
  id: string;
  portada: string | null;
  fotos: GaleriaFoto[];
} | null> {
  const tipo = await prisma.tipoServicio.findUnique({
    where: { slug },
    select: {
      id: true,
      fotos: {
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        select: { url: true, caption: true },
      },
    },
  });
  if (!tipo) return null;
  const fotos: GaleriaFoto[] = tipo.fotos.map((f) => ({ src: f.url, caption: f.caption || "" }));
  return { id: tipo.id, portada: fotos[0]?.src ?? null, fotos };
}
