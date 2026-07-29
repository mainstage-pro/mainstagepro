import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import type { Objetivo } from "@/lib/evaluaciones";

// Sugiere objetivos SMART del período para la evaluación de un colaborador, a partir
// de las responsabilidades de su puesto y las tareas reales del plan de trabajo que
// ejecuta. No persiste nada: el evaluador revisa, edita y aprueba en el formulario.

export class PersonalNoEncontrado extends Error {}
export class SinApiKey extends Error {}

const SYSTEM_PROMPT = `Eres un especialista en Recursos Humanos y gestión del desempeño para Mainstage Pro, una empresa mexicana de producción de audio, video e iluminación para eventos.

Recibes el puesto de un colaborador, sus responsabilidades permanentes y una muestra de las tareas reales del plan de trabajo que ejecuta. Tu trabajo es proponer objetivos SMART para el período de evaluación (típicamente un mes).

Reglas:
- Redacta en español, claro y concreto, con el lenguaje de la empresa (eventos, montaje, operación técnica).
- Cada objetivo debe ser específico, medible y alcanzable en el período; enfócalo en resultados, no en actividades sueltas.
- Deriva los objetivos de las responsabilidades y las tareas reales; no inventes funciones ajenas al puesto.
- Propón entre 3 y 5 objetivos, priorizando lo más importante del rol.

Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicación), con esta forma exacta:
{
  "objetivos": ["objetivo 1", "objetivo 2", "..."]
}`;

function extractJson(text: string): unknown {
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Respuesta sin JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

export interface BorradorObjetivos {
  ok: boolean;
  puestoNombre: string | null;
  objetivos: Objetivo[];
  mensaje?: string;
}

export async function sugerirObjetivos(personalId: string, periodo: string): Promise<BorradorObjetivos> {
  const persona = await prisma.personalInterno.findUnique({
    where: { id: personalId },
    select: {
      nombre: true,
      userId: true,
      puestoRef: { select: { nombre: true, responsabilidades: true, estandares: true } },
    },
  });
  if (!persona) throw new PersonalNoEncontrado("Colaborador no encontrado");

  const puestoNombre = persona.puestoRef?.nombre ?? null;

  const responsabilidades: string[] = [];
  try {
    const r = JSON.parse(persona.puestoRef?.responsabilidades ?? "[]");
    if (Array.isArray(r)) for (const item of r) { const s = String(item ?? "").trim(); if (s) responsabilidades.push(s); }
  } catch { /* responsabilidades inválidas */ }
  try {
    const e = JSON.parse(persona.puestoRef?.estandares ?? "[]");
    if (Array.isArray(e)) for (const it of e) { const s = String(it?.responsabilidad ?? "").trim(); if (s && !responsabilidades.includes(s)) responsabilidades.push(s); }
  } catch { /* estándares inválidos */ }

  const tareas = persona.userId
    ? await prisma.tarea.findMany({
        where: {
          asignadoAId: persona.userId,
          OR: [{ tipoOrigen: "PLAN" }, { origenPlan: true }, { ptTemplateId: { not: null } }],
        },
        select: { titulo: true, descripcion: true, ptTemplate: { select: { nombre: true, descripcion: true, estandarMinimo: true } } },
        take: 120,
      })
    : [];

  const lineasTareas = tareas.map((t) => {
    const nombre = t.ptTemplate?.nombre ?? t.titulo;
    const detalle = t.ptTemplate?.descripcion || t.descripcion || "";
    const estandar = t.ptTemplate?.estandarMinimo ? ` (estándar: ${t.ptTemplate.estandarMinimo})` : "";
    return `• ${nombre}${detalle ? ` — ${detalle}` : ""}${estandar}`;
  });

  if (responsabilidades.length === 0 && lineasTareas.length === 0) {
    return {
      ok: false,
      puestoNombre,
      objetivos: [],
      mensaje: puestoNombre
        ? "El puesto no tiene responsabilidades ni tareas del plan para derivar objetivos. Captúralos en Organización → Puestos."
        : "Este colaborador no tiene un puesto asignado. Asígnale uno para sugerir objetivos.",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SinApiKey("ANTHROPIC_API_KEY no configurada.");

  const userPrompt = `Colaborador: ${persona.nombre}
Puesto: ${puestoNombre ?? "—"}
Período a evaluar: ${periodo || "el mes en curso"}

Responsabilidades permanentes del puesto:
${responsabilidades.length ? responsabilidades.map((r) => `- ${r}`).join("\n") : "- (sin capturar)"}

Muestra de tareas reales del plan de trabajo:
${lineasTareas.length ? lineasTareas.join("\n") : "- (sin tareas registradas)"}

Propón entre 3 y 5 objetivos SMART para este colaborador en el período.`;

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("");
  const draft = extractJson(text) as { objetivos?: unknown };

  const objetivos: Objetivo[] = Array.isArray(draft.objetivos)
    ? draft.objetivos
        .map((o) => String(o).trim())
        .filter(Boolean)
        .map((texto) => ({ texto, resultado: "PENDIENTE" as const, comentario: "", evidencias: [] }))
    : [];

  return { ok: objetivos.length > 0, puestoNombre, objetivos };
}
