import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

// Lazy migration for new columns
let _briefColsReady = false;
async function ensureBriefCols() {
  if (_briefColsReady) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "briefToken" TEXT UNIQUE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "briefRecibidoEn" TIMESTAMP`);
  } catch { /* columns already exist */ }
  _briefColsReady = true;
}

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
