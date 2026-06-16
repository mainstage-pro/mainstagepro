import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
