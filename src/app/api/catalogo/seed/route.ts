import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { seedCatalogo } from "@/lib/catalogo-eventos";

// Siembra idempotente del catálogo (solo si está vacío). Solo admin.
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const resultado = await seedCatalogo();
  return NextResponse.json({ ok: true, resultado });
}
