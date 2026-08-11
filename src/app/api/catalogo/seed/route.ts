import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { seedCatalogo, reseedContenidoNichos } from "@/lib/catalogo-eventos";

// Siembra idempotente del catálogo (solo si está vacío). Solo admin.
// Con { reseed: true } reconstruye adicionales y preguntas por nicho a partir de
// NICHO_CONTENIDO (afinado del contenido sin recrear tipos ni nichos).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body?.reseed) {
    const resultado = await reseedContenidoNichos();
    return NextResponse.json({ ok: true, reseed: true, resultado });
  }
  const resultado = await seedCatalogo();
  return NextResponse.json({ ok: true, resultado });
}
