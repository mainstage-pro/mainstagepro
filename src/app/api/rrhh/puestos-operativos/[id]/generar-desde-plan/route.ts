import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generarBorradorDesdePlan, PuestoNoEncontrado, SinApiKey } from "@/lib/puesto-generador";

// Genera un BORRADOR de misión, responsabilidades y estándares de un puesto a partir
// de las tareas del plan de trabajo asignadas a sus titulares. No guarda nada: el
// usuario revisa y aprueba en el editor del puesto.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  try {
    const borrador = await generarBorradorDesdePlan(id);
    return NextResponse.json(borrador);
  } catch (e) {
    if (e instanceof PuestoNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof SinApiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada. Agrégala en las variables de entorno de Vercel." },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generar-desde-plan]", msg);
    return NextResponse.json({ error: `No se pudo generar el borrador: ${msg}` }, { status: 500 });
  }
}
