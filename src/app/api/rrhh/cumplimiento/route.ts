import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureActasFaltas } from "@/lib/migraciones-lazy";
import { computeCumplimientoLista, computeCumplimientoPersona } from "@/lib/cumplimiento";

// Tablero de cumplimiento. Con `personalId` devuelve el expediente detallado de
// una persona; sin él, la lista consolidada de todos los activos.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureActasFaltas();

  const { searchParams } = new URL(req.url);
  const personalId = searchParams.get("personalId");
  const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7);

  if (personalId) {
    const detalle = await computeCumplimientoPersona(personalId, mes);
    if (!detalle) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    return NextResponse.json({ mes, detalle });
  }

  const personas = await computeCumplimientoLista(mes);
  return NextResponse.json({ mes, personas });
}
