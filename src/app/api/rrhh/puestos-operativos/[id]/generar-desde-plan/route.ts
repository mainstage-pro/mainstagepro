import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

// Genera un BORRADOR de misión, responsabilidades y estándares de un puesto a partir
// de las tareas del plan de trabajo asignadas a sus titulares. No guarda nada: el
// usuario revisa y aprueba en el editor del puesto.

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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const puesto = await prisma.puesto.findUnique({
    where: { id },
    select: {
      nombre: true, area: true, subAreaId: true,
      ocupantes: { where: { activo: true }, select: { id: true, nombre: true, userId: true } },
    },
  });
  if (!puesto) return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });

  const userIds = puesto.ocupantes.map((o) => o.userId).filter((u): u is string => !!u);
  const ocupantesSinUser = puesto.ocupantes.filter((o) => !o.userId).length;

  const diagnosticoBase = {
    ocupantes: puesto.ocupantes.length,
    ocupantesSinUser,
    totalTareas: 0,
    tareasSinSubarea: 0,
  };

  if (userIds.length === 0) {
    return NextResponse.json({
      diagnostico: diagnosticoBase,
      subAreas: [],
      subAreaPrincipalId: null,
      misionPuesto: "",
      responsabilidades: [],
      estandares: [],
      mensaje: puesto.ocupantes.length === 0
        ? "Este puesto no tiene titular asignado. Nombra un titular para generar desde su plan."
        : "El titular no tiene usuario (login) ligado, así que no puedo identificar sus tareas del plan.",
    });
  }

  // Tareas del plan de trabajo asignadas a los titulares.
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

  diagnosticoBase.totalTareas = tareas.length;

  // Agrupa por subárea (vía plantilla o vía sección).
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

  diagnosticoBase.tareasSinSubarea = sinSubarea.length;

  const subAreas = Array.from(grupos.values()).sort((a, b) => b.count - a.count);
  const subAreaPrincipalId = subAreas[0]?.id ?? null;

  if (subAreas.length === 0 && sinSubarea.length === 0) {
    return NextResponse.json({
      diagnostico: diagnosticoBase, subAreas: [], subAreaPrincipalId: null,
      misionPuesto: "", responsabilidades: [], estandares: [],
      mensaje: "El titular no tiene tareas del plan de trabajo asignadas todavía.",
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada. Agrégala en las variables de entorno de Vercel." },
      { status: 503 },
    );
  }

  // Construye el insumo para el modelo.
  const bloques = subAreas.map((g, i) =>
    `## Subárea: ${g.nombre}${i === 0 ? " (PRINCIPAL — más tareas)" : ""} · ${g.count} tarea(s)\n${g.lineas.join("\n")}`
  );
  if (sinSubarea.length) bloques.push(`## Sin subárea clasificada\n${sinSubarea.join("\n")}`);

  const userPrompt = `Puesto: ${puesto.nombre}
Titular(es): ${puesto.ocupantes.map((o) => o.nombre).join(", ")}
Subáreas donde tiene tareas (de mayor a menor): ${subAreas.map((s) => `${s.nombre} (${s.count})`).join(", ") || "—"}

Tareas reales del plan de trabajo agrupadas:

${bloques.join("\n\n")}

Destila la misión del puesto, sus responsabilidades permanentes y los estándares por responsabilidad. Usa los nombres de subárea tal cual.`;

  try {
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

    return NextResponse.json({
      diagnostico: diagnosticoBase,
      subAreas: subAreas.map((s) => ({ id: s.id, nombre: s.nombre, area: s.area, count: s.count, principal: s.id === subAreaPrincipalId })),
      subAreaPrincipalId,
      misionPuesto: String(draft.misionPuesto ?? "").trim(),
      responsabilidades,
      estandares,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generar-desde-plan]", msg);
    return NextResponse.json({ error: `No se pudo generar el borrador: ${msg}` }, { status: 500 });
  }
}
