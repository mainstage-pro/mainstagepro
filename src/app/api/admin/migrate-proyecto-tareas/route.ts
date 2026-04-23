import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return NextResponse.json({ error: "No configurado" }, { status: 403 });

  const { secret } = await req.json().catch(() => ({}));
  const a = Buffer.from(secret ?? "");
  const b = Buffer.from(adminSecret);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const results: string[] = [];

  try {
    // Add proyectoEventoId column to tareas table (idempotent)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "tareas"
      ADD COLUMN IF NOT EXISTS "proyectoEventoId" TEXT
    `);
    results.push("✓ Columna proyectoEventoId agregada a tareas");

    // Add foreign key index for performance (idempotent)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "tareas_proyectoEventoId_idx"
      ON "tareas"("proyectoEventoId")
    `);
    results.push("✓ Índice tareas_proyectoEventoId_idx creado");

    // Add FK constraint if not exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'tareas_proyectoEventoId_fkey'
            AND table_name = 'tareas'
        ) THEN
          ALTER TABLE "tareas"
          ADD CONSTRAINT "tareas_proyectoEventoId_fkey"
          FOREIGN KEY ("proyectoEventoId")
          REFERENCES "proyectos"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    results.push("✓ FK constraint tareas → proyectos creada");

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), results }, { status: 500 });
  }
}
