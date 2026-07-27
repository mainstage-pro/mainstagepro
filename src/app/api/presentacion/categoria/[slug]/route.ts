import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresentacionCategoria, categoriasDeSlug } from "@/lib/presentacion-categorias";

export const dynamic = "force-dynamic";

// Extrae las URLs de fotos adicionales marcadas como EXTERNO (o legacy sin marca)
// de un equipo. Ignora deliberadamente `imagenUrl` (portada tipo stock).
function fotosExternas(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item): string | null => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.url === "string") {
          return item.uso === "INTERNO" ? null : item.url;
        }
        return null;
      })
      .filter((u): u is string => !!u);
  } catch {
    return [];
  }
}

/**
 * GET /api/presentacion/categoria/[slug]
 * Endpoint público (sin auth) para las presentaciones por categoría de equipo.
 * Devuelve los equipos activos de la macro-categoría agrupados, con sus fotos
 * adicionales de uso EXTERNO (nunca la portada stock).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = getPresentacionCategoria(slug);
  if (!cfg) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

  const nombres = categoriasDeSlug(slug);

  const equipos = await prisma.equipo.findMany({
    where: {
      activo: true,
      estado: "ACTIVO",
      categoria: { nombre: { in: nombres } },
    },
    select: {
      id: true,
      descripcion: true,
      marca: true,
      modelo: true,
      subcategoria: true,
      cantidadTotal: true,
      imagenUrl: true,
      imagenesUrls: true,
      categoria: { select: { nombre: true, orden: true } },
    },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  const items = equipos.map((e) => ({
    id: e.id,
    descripcion: e.descripcion,
    marca: e.marca,
    modelo: e.modelo,
    subcategoria: e.subcategoria,
    cantidad: e.cantidadTotal,
    categoria: e.categoria.nombre,
    cover: e.imagenUrl || null,
    fotos: fotosExternas(e.imagenesUrls),
  }));

  // Armar los grupos definidos en la config, en orden.
  const grupos = cfg.grupos.map((g) => ({
    label: g.label,
    rol: g.rol,
    descripcion: g.descripcion ?? null,
    equipos: items.filter((it) => g.categorias.includes(it.categoria)),
  }));

  // Pool de fotos EXTERNO para el hero/galería cinemática (dedup, tope 14).
  const heroFotos = Array.from(
    new Set(items.flatMap((it) => it.fotos))
  ).slice(0, 14);

  const totalEquipos = items.length;
  const totalUnidades = items.reduce((s, it) => s + (it.cantidad || 0), 0);
  const totalFotos = new Set(items.flatMap((it) => it.fotos)).size;
  const marcas = new Set(items.map((it) => it.marca).filter(Boolean)).size;

  return NextResponse.json({
    slug: cfg.slug,
    nombre: cfg.nombre,
    grupos,
    heroFotos,
    stats: { totalEquipos, totalUnidades, totalFotos, marcas },
  });
}
