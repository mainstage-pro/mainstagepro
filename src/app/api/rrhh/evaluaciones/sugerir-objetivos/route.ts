import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sugerirObjetivos, PersonalNoEncontrado, SinApiKey } from "@/lib/evaluacion-generador";

// Sugiere objetivos SMART del período para un colaborador (IA). No guarda nada:
// el evaluador revisa y aprueba en el formulario de evaluación.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { personalId, periodo } = await req.json();
  if (!personalId) return NextResponse.json({ error: "personalId requerido" }, { status: 400 });

  try {
    const borrador = await sugerirObjetivos(personalId, String(periodo ?? ""));
    return NextResponse.json(borrador);
  } catch (e) {
    if (e instanceof PersonalNoEncontrado) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof SinApiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada. Agrégala en las variables de entorno de Vercel." },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sugerir-objetivos]", msg);
    return NextResponse.json({ error: `No se pudo sugerir objetivos: ${msg}` }, { status: 500 });
  }
}
