import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Cache on Vercel edge for 5 minutes, revalidate in background
export const revalidate = 300;

export async function GET() {
  const rows = await prisma.equipo.findMany({
    where: { activo: true, imagenUrl: { not: null } },
    select: { id: true, imagenUrl: true },
  });

  const map: Record<string, string> = {};
  for (const e of rows) {
    if (e.imagenUrl) map[e.id] = e.imagenUrl;
  }

  return NextResponse.json(map, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
