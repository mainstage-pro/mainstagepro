import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { invalidateConfigCache } from "@/lib/config";

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: section, label,
// description, type, defaultValue y orden ya existen en app_config). No-op:
// antes corría ALTER TABLE incondicional en cada GET/PATCH/PUT, y ALTER TABLE
// ... ADD COLUMN IF NOT EXISTS toma un lock ACCESS EXCLUSIVE aunque la columna
// ya exista, bloqueando lecturas concurrentes de la tabla.
async function ensureColumns() {}

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
