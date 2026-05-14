import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { invalidateConfigCache } from "@/lib/config";

// Lazy migration: add new columns to app_config if they don't exist
let _migrated = false;
async function ensureColumns() {
  if (_migrated) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE app_config ADD COLUMN IF NOT EXISTS "section" TEXT NOT NULL DEFAULT 'general'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE app_config ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT ''`);
  await prisma.$executeRawUnsafe(`ALTER TABLE app_config ADD COLUMN IF NOT EXISTS "description" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE app_config ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'text'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE app_config ADD COLUMN IF NOT EXISTS "defaultValue" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE app_config ADD COLUMN IF NOT EXISTS "orden" INTEGER NOT NULL DEFAULT 0`);
  _migrated = true;
}

// GET — devuelve todas las entradas agrupadas por sección
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureColumns();
  const rows = await prisma.appConfig.findMany({ orderBy: [{ section: "asc" }, { orden: "asc" }] });
  return NextResponse.json({ entries: rows });
}

// PATCH — actualiza una o varias entradas por key
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureColumns();
  const body = await req.json();
  const updates: { key: string; value: string }[] = Array.isArray(body) ? body : [body];

  for (const { key, value } of updates) {
    await prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  invalidateConfigCache();
  return NextResponse.json({ ok: true });
}

// PUT — seed completo (upsert de metadatos + valor default)
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureColumns();
  const { entries }: { entries: {
    key: string; value: string; section: string; label: string;
    description?: string; type: string; defaultValue?: string; orden: number;
  }[] } = await req.json();

  let upserted = 0;
  for (const e of entries) {
    await prisma.appConfig.upsert({
      where: { key: e.key },
      // On conflict: update metadata but preserve existing value
      update: { section: e.section, label: e.label, description: e.description ?? null, type: e.type, defaultValue: e.defaultValue ?? null, orden: e.orden },
      create: { key: e.key, value: e.value, section: e.section, label: e.label, description: e.description ?? null, type: e.type, defaultValue: e.defaultValue ?? null, orden: e.orden },
    });
    upserted++;
  }

  invalidateConfigCache();
  return NextResponse.json({ ok: true, upserted });
}
