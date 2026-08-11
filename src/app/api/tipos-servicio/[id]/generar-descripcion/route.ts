import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SERVICIOS_DETALLE } from "@/lib/presentacion-servicios";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Eres un especialista en propuestas comerciales para Mainstage Pro, empresa de producción de audio, video e iluminación para eventos en Querétaro, México (musicales, sociales y empresariales). Director: Mauricio Hernández.

Tu tarea es redactar el texto comercial de un TIPO DE SERVICIO que se muestra en las galerías y presentaciones para clientes.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "subtitulo": "Tagline corto (máx 8 palabras) que resume el servicio, estilo 'Conciertos · Festivales · DJ Sets'",
  "descripcion": "Párrafo descriptivo (3-5 oraciones) del servicio: qué incluye, para quién es y el valor que entrega. Concreto, técnico donde aplique, orientado a que el cliente entienda qué recibe."
}

Tono profesional, cálido y orientado a ventas. Español de México. No inventes precios ni marcas. Apóyate en el conocimiento de referencia que se te da del servicio; si hay captions de fotos, úsalas para aterrizar el texto en lo que se ve.`;

// Conocimiento base de la operación técnica (capa de ejecución en vivo), que no
// vive en SERVICIOS_DETALLE como servicio vendible aislado.
const OPERACION_TECNICA_REF = `OPERACIÓN TÉCNICA — Es la capa de ejecución en vivo del evento: los técnicos que montan, prueban y operan audio, iluminación y video durante todo el evento, resolviendo cualquier imprevisto en el momento. Incluye montaje y prueba de sonido, operación en vivo de cada área, coordinación en sitio el día del evento y desmontaje/logística de salida. Es lo que garantiza que todo lo planeado se ejecute a tiempo y sin fallas; es el determinante de que el evento salga bien en la práctica.`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada. Agrégala en las variables de entorno de Vercel." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const tipo = await prisma.tipoServicio.findUnique({
    where: { id },
    include: { fotos: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] } },
  });
  if (!tipo) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  // Referencia: enlaza el slug con el detalle de servicio hardcodeado si aplica.
  const detalle = SERVICIOS_DETALLE.find((s) => s.slug === tipo.slug || tipo.slug.startsWith(s.slug));
  const referencia = detalle
    ? `SERVICIO DE REFERENCIA (${detalle.title}):\nTagline: ${detalle.tagline}\nResumen: ${detalle.resumen}\nPara quién: ${detalle.para}\nIncluye: ${detalle.incluye.join("; ")}\nEntregables: ${detalle.entregables.map((e) => `${e.title} — ${e.body}`).join("; ")}`
    : tipo.slug.includes("operacion")
      ? OPERACION_TECNICA_REF
      : "Sin referencia base; redacta a partir del nombre y las fotos.";

  const captions = tipo.fotos.map((f) => f.caption).filter(Boolean);
  const userPrompt = `Redacta el texto comercial para este tipo de servicio:

NOMBRE: ${tipo.nombre}
IDENTIFICADOR: ${tipo.slug}
TAGLINE ACTUAL: ${tipo.subtitulo || "(vacío)"}
DESCRIPCIÓN ACTUAL: ${tipo.descripcion || "(vacía)"}
FOTOS (captions): ${captions.length ? captions.join(" · ") : "sin captions"}

CONOCIMIENTO DE REFERENCIA:
${referencia}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const jsonStr = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as { subtitulo?: string; descripcion?: string };

    return NextResponse.json({
      subtitulo: parsed.subtitulo ?? "",
      descripcion: parsed.descripcion ?? "",
    });
  } catch (e) {
    return NextResponse.json({ error: `No se pudo generar: ${String(e)}` }, { status: 500 });
  }
}
