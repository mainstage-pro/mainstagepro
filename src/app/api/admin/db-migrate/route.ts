import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/db-migrate
 * Aplica columnas nuevas del schema de la reestructura de ventas.
 * Requiere rol ADMIN. Idempotente: usa IF NOT EXISTS.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results: string[] = [];

  const statements = [
    // Trato — confirmación operativa
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "confirmadaEn" TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "metodoConfirmacion" TEXT`,
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "notaConfirmacion" TEXT`,
    // Trato — cierre comercial real
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "montoFinal" DOUBLE PRECISION`,
    // Trato — formulario de descubrimiento
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "contactoDecisorNombre" TEXT`,
    `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "contactoDecisorCargo" TEXT`,
    // TratoApoyo — tabla de apoyo (muchos a muchos con users)
    `CREATE TABLE IF NOT EXISTS trato_apoyo (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "tratoId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT trato_apoyo_pkey PRIMARY KEY (id),
      CONSTRAINT trato_apoyo_trato_usuario_unique UNIQUE ("tratoId", "userId"),
      CONSTRAINT trato_apoyo_tratoId_fkey FOREIGN KEY ("tratoId") REFERENCES tratos(id) ON DELETE CASCADE,
      CONSTRAINT trato_apoyo_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id)
    )`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`✓ ${sql.substring(0, 60)}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(`✗ ${sql.substring(0, 60)}... → ${msg}`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
