import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// Destila la descripción de un puesto (misión, responsabilidades, estándares) a partir
// de las tareas del plan de trabajo que ejecutan sus titulares. No persiste nada:
// devuelve un borrador que el llamador decide guardar o mostrar para aprobación.

const SYSTEM_PROMPT = `Eres un especialista en Recursos Humanos y diseño organizacional para Mainstage Pro, una empresa mexicana de producción de audio, video e iluminación para eventos.

Recibes el listado real de tareas del plan de trabajo que ejecuta la(s) persona(s) que ocupa(n) un puesto, agrupadas por subárea. Tu trabajo es destilar de ahí la descripción del puesto.

Reglas:
- Redacta en español, claro y concreto, con el lenguaje de la empresa (eventos, montaje, operación técnica).
- Las responsabilidades son enunciados permanentes de lo que la persona es responsable de lograr (no copies el título de cada tarea; agrúpalas y súbelas de nivel).
- Los estándares describen "cómo se mide que está bien hecho" para cada responsabilidad clave, usando el estándar mínimo de las tareas cuando exista.
- Respeta EXACTAMENTE los nombres de subárea que te doy. Ordena poniendo primero la subárea principal (la que trae más tareas).
- No inventes funciones que no se desprendan de las tareas. Sé fiel al insumo.

Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicación), con esta forma exacta:
{
  "misionPuesto": "1-2 oraciones: para qué existe el puesto, resumido de lo que hace",
  "responsabilidades": ["string", "..."],
  "estandares": [ { "subarea": "string", "responsabilidad": "string", "estandar": "string" } ]
}`;

function extractJson(text: string): unknown {
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Respuesta sin JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

export interface DiagnosticoPuesto {
  ocupantes: number;
  ocupantesSinUser: number;
  totalTareas: number;
  tareasSinSubarea: number;
}
export interface SubAreaGen { id: string; nombre: string; area: string; count: number; principal: boolean }
export interface EstandarGen { subarea: string; responsabilidad: string; estandar: string }

export interface BorradorPuesto {
  ok: boolean;
  diagnostico: DiagnosticoPuesto;
  subAreas: SubAreaGen[];
  subAreaPrincipalId: string | null;
  misionPuesto: string;
  responsabilidades: string[];
  estandares: EstandarGen[];
  mensaje?: string;
}

// Errores de configuración (sin API key, puesto inexistente) se lanzan como excepción
// para que el endpoint decida el status. Los casos "sin datos" vuelven con mensaje.
export class PuestoNoEncontrado extends Error {}
export class SinApiKey extends Error {}

export async function generarBorradorDesdePlan(puestoId: string): Promise<BorradorPuesto> {
  const puesto = await prisma.puesto.findUnique({
    where: { id: puestoId },
    select: {
      nombre: true, area: true, subAreaId: true,
      ocupantes: { where: { activo: true }, select: { id: true, nombre: true, userId: true } },
    },
  });
  if (!puesto) throw new PuestoNoEncontrado("Puesto no encontrado");

  const userIds = puesto.ocupantes.map((o) => o.userId).filter((u): u is string => !!u);
  const ocupantesSinUser = puesto.ocupantes.filter((o) => !o.userId).length;

  const diagnostico: DiagnosticoPuesto = {
    ocupantes: puesto.ocupantes.length,
    ocupantesSinUser,
    totalTareas: 0,
    tareasSinSubarea: 0,
  };

  const vacio = (mensaje: string): BorradorPuesto => ({
    ok: false, diagnostico, subAreas: [], subAreaPrincipalId: null,
    misionPuesto: "", responsabilidades: [], estandares: [], mensaje,
  });

  if (userIds.length === 0) {
    return vacio(
      puesto.ocupantes.length === 0
        ? "Este puesto no tiene titular asignado. Nombra un titular para generar desde su plan."
        : "El titular no tiene usuario (login) ligado, así que no puedo identificar sus tareas del plan.",
    );
  }

  const tareas = await prisma.tarea.findMany({
    where: {
      asignadoAId: { in: userIds },
      OR: [{ tipoOrigen: "PLAN" }, { origenPlan: true }, { ptTemplateId: { not: null } }],
    },
    select: {
      titulo: true, descripcion: true, porqueSeHace: true, estandarMinimo: true, cuando: true,
      ptTemplate: {
        select: {
          nombre: true, descripcion: true, porqueSeHace: true, estandarMinimo: true,
          siNoSeHace: true, impacto: true, cuando: true, subAreaId: true,
          subArea: { select: { id: true, nombre: true, area: { select: { codigo: true, nombre: true } } } },
        },
      },
      seccion: {
        select: { subArea: { select: { id: true, nombre: true, area: { select: { codigo: true, nombre: true } } } } },
      },
    },
    take: 300,
  });

  diagnostico.totalTareas = tareas.length;

  type SubAgg = { id: string; nombre: string; area: string; count: number; lineas: string[] };
  const grupos = new Map<string, SubAgg>();
  const sinSubarea: string[] = [];

  for (const t of tareas) {
    const sa = t.ptTemplate?.subArea ?? t.seccion?.subArea ?? null;
    const linea = [
      `• ${t.ptTemplate?.nombre ?? t.titulo}`,
      (t.ptTemplate?.descripcion || t.descripcion) ? `  qué: ${t.ptTemplate?.descripcion || t.descripcion}` : "",
      (t.ptTemplate?.porqueSeHace || t.porqueSeHace) ? `  por qué: ${t.ptTemplate?.porqueSeHace || t.porqueSeHace}` : "",
      (t.ptTemplate?.estandarMinimo || t.estandarMinimo) ? `  estándar: ${t.ptTemplate?.estandarMinimo || t.estandarMinimo}` : "",
      t.ptTemplate?.impacto ? `  impacto: ${t.ptTemplate.impacto}` : "",
    ].filter(Boolean).join("\n");

    if (!sa) { sinSubarea.push(linea); continue; }
    const g = grupos.get(sa.id) ?? { id: sa.id, nombre: sa.nombre, area: sa.area?.codigo ?? sa.area?.nombre ?? puesto.area, count: 0, lineas: [] };
    g.count += 1;
    g.lineas.push(linea);
    grupos.set(sa.id, g);
  }

  diagnostico.tareasSinSubarea = sinSubarea.length;

  const subAreasAgg = Array.from(grupos.values()).sort((a, b) => b.count - a.count);
  const subAreaPrincipalId = subAreasAgg[0]?.id ?? null;

  if (subAreasAgg.length === 0 && sinSubarea.length === 0) {
    return vacio("El titular no tiene tareas del plan de trabajo asignadas todavía.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new SinApiKey("ANTHROPIC_API_KEY no configurada.");

  const bloques = subAreasAgg.map((g, i) =>
    `## Subárea: ${g.nombre}${i === 0 ? " (PRINCIPAL — más tareas)" : ""} · ${g.count} tarea(s)\n${g.lineas.join("\n")}`
  );
  if (sinSubarea.length) bloques.push(`## Sin subárea clasificada\n${sinSubarea.join("\n")}`);

  const userPrompt = `Puesto: ${puesto.nombre}
Titular(es): ${puesto.ocupantes.map((o) => o.nombre).join(", ")}
Subáreas donde tiene tareas (de mayor a menor): ${subAreasAgg.map((s) => `${s.nombre} (${s.count})`).join(", ") || "—"}

Tareas reales del plan de trabajo agrupadas:

${bloques.join("\n\n")}

Destila la misión del puesto, sus responsabilidades permanentes y los estándares por responsabilidad. Usa los nombres de subárea tal cual.`;

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("");
  const draft = extractJson(text) as {
    misionPuesto?: string;
    responsabilidades?: unknown;
    estandares?: unknown;
  };

  const responsabilidades = Array.isArray(draft.responsabilidades)
    ? draft.responsabilidades.map((r) => String(r).trim()).filter(Boolean)
    : [];
  const estandares = Array.isArray(draft.estandares)
    ? draft.estandares.map((e: Record<string, unknown>) => ({
        subarea: String(e?.subarea ?? "").trim(),
        responsabilidad: String(e?.responsabilidad ?? "").trim(),
        estandar: String(e?.estandar ?? "").trim(),
      })).filter((e) => e.responsabilidad || e.estandar)
    : [];

  return {
    ok: true,
    diagnostico,
    subAreas: subAreasAgg.map((s) => ({ id: s.id, nombre: s.nombre, area: s.area, count: s.count, principal: s.id === subAreaPrincipalId })),
    subAreaPrincipalId,
    misionPuesto: String(draft.misionPuesto ?? "").trim(),
    responsabilidades,
    estandares,
  };
}
