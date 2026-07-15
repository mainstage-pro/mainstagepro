import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Eres un especialista en propuestas comerciales para Mainstage Pro, empresa de producción de audio, video e iluminación para eventos en Querétaro, México (musicales, sociales y empresariales). Director: Mauricio Hernández.

Tu tarea es redactar el texto comercial de un PAQUETE base que se ofrecerá como cotización estándar según el tipo y tamaño del evento.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "resumen": "1-2 oraciones que resuman de qué consta el paquete y para qué evento aplica",
  "descripcion": "Párrafo descriptivo (3-5 oraciones) del paquete, su alcance técnico y experiencia que entrega",
  "propuestaValor": "Párrafo (2-4 oraciones) enfocado en el valor y diferenciadores para el cliente"
}

Tono profesional, cálido y orientado a ventas. Español de México. No inventes precios ni marcas que no se te den.`;

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
      system: SYSTEM_PROMPT,
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
