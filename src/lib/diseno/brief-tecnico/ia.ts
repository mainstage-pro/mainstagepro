import Anthropic from "@anthropic-ai/sdk";
import type { BriefTecnicoData } from "./data";
import type { ProyectoFacts } from "./facts";

// Pule con IA solo la prosa (descripción del brief e intro de números). Los datos
// duros (equipos, cantidades, fechas, stats) quedan deterministas para no alucinar.
// Si no hay API key o falla, se conserva el draft.
export async function pulirConIA(facts: ProyectoFacts, draft: BriefTecnicoData): Promise<BriefTecnicoData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return draft;

  const equiposResumen = facts.equipos.map((e) => `${e.cantidad}x ${[e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion} (${e.categoria})`).join("; ");
  const dias = facts.fechasEvento?.length || 1;

  const system = `Eres el equipo de producción y contenido de Mainstage Pro, empresa de producción técnica de audio, video e iluminación para eventos en Querétaro, México. Escribes el copy de una serie de stories "Brief Técnico" para redes sociales (detrás del show).

Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown) con esta estructura exacta:
{
  "descripcion": "Párrafo de 2-4 oraciones que describa la producción técnica del evento: montaje, jornadas de operación, y el alcance (audio, video/pantalla, equipo técnico). Concreto y profesional, sin inventar equipos ni cifras que no se den.",
  "intro": "1 oración que enmarque los números del evento como muestra del nivel de producción técnica requerido."
}

Tono profesional, conciso y con orgullo técnico. Español de México. NO inventes marcas, modelos ni cantidades.`;

  const user = `Genera el copy para este evento:
NOMBRE: ${facts.nombre}
CLIENTE: ${facts.clienteEmpresa || facts.clienteNombre}
TIPO: ${facts.tipoEvento} | SERVICIO: ${facts.tipoServicio ?? "-"}
VENUE: ${facts.lugarEvento ?? "-"}
JORNADAS DE OPERACIÓN: ${dias}
EQUIPOS: ${equiposResumen || "no especificados"}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const jsonStr = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as { descripcion?: string; intro?: string };

    return {
      ...draft,
      brief: { ...draft.brief, descripcion: parsed.descripcion?.trim() || draft.brief.descripcion },
      numeros: { ...draft.numeros, intro: parsed.intro?.trim() || draft.numeros.intro },
    };
  } catch {
    return draft;
  }
}
