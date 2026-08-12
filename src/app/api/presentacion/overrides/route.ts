import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOverrides, setOverride } from "@/lib/presentacion-overrides";

export const dynamic = "force-dynamic";

// GET público: mapa de overrides { key: value } para hidratar la presentación.
export async function GET() {
  try {
    const overrides = await getOverrides();
    return NextResponse.json({ overrides });
  } catch {
    // Si la tabla aún no existe o falla, devolvemos vacío para no romper la vista.
    return NextResponse.json({ overrides: {} });
  }
}

// PATCH: cualquier usuario autenticado puede ajustar textos/imágenes de la
// presentación (los edita en vivo desde la propia página). Body: { key, value }
// o { overrides: {k:v} }.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  try {
    if (body && typeof body.key === "string") {
      await setOverride(body.key, body.value ?? null);
    } else if (body && body.overrides && typeof body.overrides === "object") {
      for (const [k, v] of Object.entries(body.overrides as Record<string, unknown>)) {
        await setOverride(k, v == null ? null : String(v));
      }
    } else {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    const overrides = await getOverrides();
    return NextResponse.json({ ok: true, overrides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al guardar" },
      { status: 500 }
    );
  }
}
