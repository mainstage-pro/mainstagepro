import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: tratos.briefToken y
// briefRecibidoEn ya existen). No-op: ver nota en src/app/api/tratos/[id]/route.ts
// sobre por qué el ALTER TABLE incondicional es peligroso.
async function ensureBriefCols() {}

// POST — genera o regenera el token del brief
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await ensureBriefCols();

  const token = randomBytes(20).toString("hex");
  await prisma.$executeRawUnsafe(
    `UPDATE tratos SET "briefToken" = $1, "briefRecibidoEn" = NULL WHERE id = $2`,
    token,
    id
  );

  return NextResponse.json({ token });
}
