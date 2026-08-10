import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// La galería se guarda como JSON: array de strings (formato viejo) o de
// objetos { url, nombre, uso: "INTERNO" | "EXTERNO" } (formato actual, ver
// EquipoGaleria.tsx). En el catálogo público solo mostramos las EXTERNO
// (las INTERNO son fotos de montaje, uso interno).
function parseGaleria(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const urls: string[] = [];
    for (const item of arr) {
      if (typeof item === "string") {
        if (item.trim()) urls.push(item);
      } else if (item && typeof item === "object" && typeof item.url === "string" && item.url.trim()) {
        if (item.uso !== "INTERNO") urls.push(item.url);
      }
    }
    return urls;
  } catch {
    return [];
  }
}

export async function GET() {
  const rows = await prisma.equipo.findMany({
    where: { activo: true, imagenUrl: { not: null } },
    select: { id: true, imagenUrl: true, imagenesUrls: true },
  });

  const cover: Record<string, string> = {};
  const galeria: Record<string, string[]> = {};
  for (const e of rows) {
    if (e.imagenUrl) cover[e.id] = e.imagenUrl;
    const extras = parseGaleria(e.imagenesUrls);
    if (extras.length) galeria[e.id] = extras;
  }

  return NextResponse.json({ cover, galeria }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
