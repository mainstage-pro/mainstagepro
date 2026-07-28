import Anthropic from "@anthropic-ai/sdk";

// Quién puede crear/editar áreas, capacitaciones y evaluaciones.
type SessionLike = { role?: string | null; area?: string | null } | null;
export function puedeEditarCapacitacion(session: SessionLike): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  return ["DIRECCION", "ADMINISTRACION", "RRHH"].includes(session.area ?? "");
}

export interface PreguntaEval {
  pregunta: string;
  opciones: string[]; // exactamente 4
  correcta: number;   // índice 0-3
}

// Convierte el HTML de la presentación en texto plano para alimentar a la IA.
export function htmlAtexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Genera N preguntas de opción múltiple del contenido de la capacitación.
export async function generarPreguntas(
  contenido: string,
  titulo: string,
  n = 6
): Promise<PreguntaEval[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `Eres un diseñador instruccional de Mainstage Pro (producción técnica de eventos en vivo). Creas evaluaciones de comprensión de opción múltiple a partir del contenido de una capacitación.

REGLAS:
• Genera EXACTAMENTE ${n} preguntas claras y relevantes que evalúen la comprensión real del material (no trivia irrelevante).
• Cada pregunta tiene EXACTAMENTE 4 opciones plausibles; solo UNA correcta.
• "correcta" es el índice (0-3) de la opción correcta. Varía la posición de la correcta.
• Español, tono profesional y directo. Sin numerar las preguntas dentro del texto.
• Responde ÚNICAMENTE con un array JSON válido. Sin markdown, sin backticks, sin texto extra.

FORMATO EXACTO:
[{"pregunta":"...","opciones":["...","...","...","..."],"correcta":0}]`;

  const user = `CAPACITACIÓN: ${titulo}

CONTENIDO:
${contenido.slice(0, 14000)}

Genera las ${n} preguntas de opción múltiple ahora. Solo el array JSON.`;

  const resp = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Extrae el array JSON aunque venga con texto o fences alrededor.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("La IA no devolvió JSON válido");
  const parsed = JSON.parse(text.slice(start, end + 1)) as PreguntaEval[];

  return parsed
    .filter(
      (p) =>
        p &&
        typeof p.pregunta === "string" &&
        Array.isArray(p.opciones) &&
        p.opciones.length === 4 &&
        typeof p.correcta === "number" &&
        p.correcta >= 0 &&
        p.correcta <= 3
    )
    .slice(0, n);
}
