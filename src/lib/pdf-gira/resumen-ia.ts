// src/lib/pdf-gira/resumen-ia.ts
//
// Condensa en un solo lote los textos largos de Notas y aprendizajes (falla /
// solución / propuesta de mejora, comentarios de tema, resumen ejecutivo...)
// para que el PDF no se sienta pesado de leer. Mismo patrón que
// traducirTextosCotizacion: un lote, un modelo, y si no hay API key o la IA
// falla se regresan los textos tal cual — nunca rompe el documento por esto.

import Anthropic from "@anthropic-ai/sdk";

/// Por debajo de esto no vale la pena condensar: ya es un par de líneas.
const UMBRAL = 200;

export async function condensarTextosLargos(textos: string[]): Promise<string[]> {
  const indices: number[] = [];
  const payload: Record<string, string> = {};
  textos.forEach((t, i) => {
    if (t.trim().length > UMBRAL) {
      indices.push(i);
      payload[String(i)] = t.trim();
    }
  });
  if (indices.length === 0) return textos;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return textos;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `Eres un editor que condensa notas de producción de eventos en vivo (audio, iluminación, video) para un documento de retroalimentación de gira.
Recibes un objeto JSON de la forma { "clave": "texto largo", ... } y devuelves ÚNICAMENTE un objeto JSON con las MISMAS claves, cada texto resumido a 2-3 oraciones como máximo, en español, conservando los hechos concretos (qué pasó, qué se hizo, nombres propios, cifras, lugares) — nunca generalices al punto de perder el detalle.
No agregues explicación, notas ni markdown: responde solo el objeto JSON.`,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const condensados: Record<string, string> = m ? JSON.parse(m[0]) : payload;

    const resultado = [...textos];
    for (const i of indices) {
      const c = condensados[String(i)];
      if (c && c.trim()) resultado[i] = c.trim();
    }
    return resultado;
  } catch {
    return textos; // si la IA falla, mostrar el texto original en vez de romper el PDF
  }
}
