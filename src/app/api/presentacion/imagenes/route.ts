import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseGaleria(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
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
