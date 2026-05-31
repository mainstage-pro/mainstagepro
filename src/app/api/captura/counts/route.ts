import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/captura/counts — badges
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [captura, ideas, iniciativas] = await Promise.all([
    prisma.capturaRapida.count({ where: { clasificado: false } }),
    prisma.idea.count({ where: { estado: "activa" } }),
    prisma.iniciativa.count({ where: { estado: { in: ["planeando", "en_ejecucion"] } } }),
  ]);

  return NextResponse.json({ captura, ideas, iniciativas });
}
