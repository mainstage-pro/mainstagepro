import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// Traduce un lote de textos libres (notas, observaciones, descripciones) de una
// cotización de español a inglés vía IA, y cachea el resultado en
// cotizaciones.traduccionEn (JSON) por hash del contenido de entrada — así el PDF
// no vuelve a llamar a la IA en cada descarga mientras la cotización no cambie.
export async function traducirTextosCotizacion(
  cotizacionId: string,
  textos: Record<string, string>,
  traduccionEnActual: string | null
): Promise<Record<string, string>> {
  const entries = Object.entries(textos).filter(([, v]) => typeof v === "string" && v.trim());
  if (entries.length === 0) return {};

  const hash = crypto.createHash("sha1").update(JSON.stringify(entries)).digest("hex");

  if (traduccionEnActual) {
    try {
      const cached = JSON.parse(traduccionEnActual) as { hash?: string; textos?: Record<string, string> };
      if (cached.hash === hash && cached.textos) return cached.textos;
    } catch { /* caché corrupta, regenerar */ }
  }

  const payload = Object.fromEntries(entries);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return payload; // sin IA disponible, deja el texto original en español

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `Eres un traductor profesional de español a inglés para documentos comerciales (cotizaciones) de una empresa de producción de eventos en vivo (audio, iluminación, video, producción técnica).
Recibes un objeto JSON de la forma { "clave": "texto en español", ... } y devuelves ÚNICAMENTE un objeto JSON con las MISMAS claves, cada texto traducido a inglés de negocios, natural, conciso y con el mismo tono profesional-cercano del original.
Reglas:
- No traduzcas nombres propios, marcas, modelos de equipo, ni cifras/porcentajes.
- Si un texto ya está en inglés, déjalo igual.
- No agregues explicación, notas ni markdown: responde solo el objeto JSON.`,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const traducidos: Record<string, string> = m ? JSON.parse(m[0]) : payload;

    await prisma.cotizacion.update({
      where: { id: cotizacionId },
      data: { traduccionEn: JSON.stringify({ hash, textos: traducidos }) },
    }).catch(() => { /* no bloquear el PDF si falla el guardado de caché */ });

    return traducidos;
  } catch {
    return payload; // si la IA falla, mostrar el texto original en vez de romper el PDF
  }
}

// Extrae el texto de nota libre de un campo `notas` de línea de cotización.
// Formatos: "cat:Cat|nota:Texto", "nota:Texto", "cat:Cat" (sin nota), texto plano.
export function extraerNotaLibre(notas: string | null): string | null {
  if (!notas) return null;
  if (notas.includes("|nota:")) return notas.split("|nota:")[1]?.trim() || null;
  if (notas.startsWith("nota:")) return notas.slice(5).trim() || null;
  if (notas.startsWith("cat:")) return null;
  return notas.trim() || null;
}

// Reconstruye el campo `notas` reemplazando solo la parte de nota libre por su
// traducción, preservando el prefijo "cat:X" usado para agrupar por categoría.
export function conNotaTraducida(notasOriginal: string | null, notaTraducida: string): string | null {
  if (!notasOriginal) return notasOriginal;
  if (notasOriginal.includes("|nota:")) return notasOriginal.split("|nota:")[0] + "|nota:" + notaTraducida;
  if (notasOriginal.startsWith("nota:")) return "nota:" + notaTraducida;
  if (notasOriginal.startsWith("cat:")) return notasOriginal;
  return notaTraducida;
}
