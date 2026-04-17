import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Eres un especialista en Recursos Humanos experto en diseño de planes de integración y onboarding para empresas de producción audiovisual y eventos en vivo.

Mainstage Pro es una empresa de producción de audio, video e iluminación para eventos corporativos, sociales y musicales en México. Sus valores son: excelencia técnica, compromiso, trabajo en equipo, puntualidad y orientación al cliente.

Tu tarea es diseñar un plan de integración completo, estructurado y práctico para un nuevo colaborador. El plan SIEMPRE debe comenzar con módulos de alineación empresarial (historia, valores, cultura, estructura organizacional, procesos internos) antes de los módulos técnicos del puesto.

ESTRUCTURA OBLIGATORIA:
1. ALINEACION: Cultura, historia, valores, quiénes somos, estructura, sistemas internos (siempre presente, mínimo 3 módulos)
2. TECNICO: Conocimientos y habilidades específicas del puesto
3. ADMINISTRATIVO: Herramientas, plataformas, procesos administrativos del día a día
4. PRACTICO: Shadowing, práctica supervisada, primer proyecto real
5. CULTURAL: Dinámicas de equipo, integración social (opcional según el rol)

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones, solo JSON puro) con esta estructura exacta:
{
  "resumen": "Descripción breve del plan en 1-2 oraciones",
  "duracionTotalDias": number,
  "modulos": [
    {
      "nombre": "string",
      "tipo": "ALINEACION|TECNICO|ADMINISTRATIVO|PRACTICO|CULTURAL",
      "orden": number,
      "duracionDias": number,
      "descripcion": "string - objetivo del módulo",
      "tareas": [
        {
          "titulo": "string",
          "descripcion": "string - qué hace el colaborador en esta tarea",
          "tipo": "LECTURA|VIDEO|PRACTICA|EVALUACION|REUNION|SHADOWING",
          "orden": number,
          "recurso": "string|null - material, persona de contacto o referencia"
        }
      ]
    }
  ]
}`;

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
  const { puesto, area, descripcionPuesto, notasAdicionales } = body;

  const userPrompt = `Diseña un plan de integración completo para el siguiente puesto:

PUESTO: ${puesto}
ÁREA: ${area || "General"}
DESCRIPCIÓN DEL PUESTO: ${descripcionPuesto || "No especificada"}
NOTAS ADICIONALES / CONTEXTO ESPECIAL: ${notasAdicionales || "Ninguna"}

Genera un plan detallado, realista y aplicable para Mainstage Pro. Incluye tareas concretas con nombres de responsables tipo "Coordinador de RRHH", "Jefe directo", "Director técnico" en el campo recurso cuando aplique.`;

  try {
    const client = new Anthropic({ apiKey });

    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: "claude-opus-4-5",
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`\n__ERROR__: ${String(e)}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
