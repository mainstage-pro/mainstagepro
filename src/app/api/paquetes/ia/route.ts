import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT_PAQUETE } from "@/lib/paquetesTextoIA";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada. Agrégala en las variables de entorno de Vercel." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { nombre, tipoEvento, rangoPersonas, subtiposEvento, equipos, conceptos } = body as {
    nombre?: string;
    tipoEvento?: string;
    rangoPersonas?: string;
    subtiposEvento?: string[];
    equipos?: string[];
    conceptos?: string[];
  };

  const userPrompt = `Redacta el texto comercial para este paquete:

NOMBRE: ${nombre || "Sin nombre"}
TIPO DE EVENTO: ${tipoEvento || "No especificado"}
TAMAÑO (personas): ${rangoPersonas || "No especificado"}
SUBTIPOS / OCASIONES: ${subtiposEvento?.length ? subtiposEvento.join(", ") : "No especificados"}
EQUIPOS Y PRODUCTOS INCLUIDOS: ${equipos?.length ? equipos.join(", ") : "No especificados"}
CONCEPTOS OPERATIVOS: ${conceptos?.length ? conceptos.join(", ") : "Ninguno"}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT_PAQUETE,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const jsonStr = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as { resumen?: string; descripcion?: string; propuestaValor?: string };

    return NextResponse.json({
      resumen: parsed.resumen ?? "",
      descripcion: parsed.descripcion ?? "",
      propuestaValor: parsed.propuestaValor ?? "",
    });
  } catch (e) {
    return NextResponse.json({ error: `No se pudo generar: ${String(e)}` }, { status: 500 });
  }
}
