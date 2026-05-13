import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { AREA_LABELS } from "@/lib/junta-templates";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const junta = await prisma.junta.findUnique({
    where: { id },
    include: {
      facilitador:   { select: { name: true } },
      participantes: { include: { user: { select: { name: true } } } },
      agendaItems:   { orderBy: { orden: "asc" } },
      tareas: {
        where:  { parentId: null },
        select: {
          titulo: true,
          prioridad: true,
          asignadoA: { select: { name: true } },
          fechaVencimiento: true,
        },
      },
    },
  });

  if (!junta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const areaLabel = AREA_LABELS[junta.area as keyof typeof AREA_LABELS] ?? junta.area;
  const fecha = new Date(junta.fecha).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const participantesNombres = junta.participantes.map((p) => p.user.name).join(", ") || "Sin registrar";

  const agendaTexto = junta.agendaItems
    .map((item) => `[${item.tipo}] ${item.titulo}\n${item.respuesta || "(sin respuesta registrada)"}`)
    .join("\n\n");

  const tareasTexto = junta.tareas.length
    ? junta.tareas
        .map((t) => `- ${t.titulo} (${t.asignadoA?.name ?? "Sin asignar"}, ${t.prioridad})`)
        .join("\n")
    : "Ninguna";

  const prompt = `Eres el asistente operativo de Mainstage Pro, empresa de producción técnica de eventos en México.
Genera un resumen ejecutivo profesional y conciso de esta junta de ${areaLabel}.

Fecha: ${fecha}
Facilitador: ${junta.facilitador.name}
Participantes: ${participantesNombres}
Duración: ${junta.duracionMin} minutos

AGENDA CUBIERTA:
${agendaTexto}

TAREAS GENERADAS (${junta.tareas.length}):
${tareasTexto}

NOTAS GENERALES:
${junta.notas || "(ninguna)"}

Genera un resumen con estas secciones exactas, sin markdown extra:

RESUMEN EJECUTIVO
[2-3 líneas con los puntos más importantes de la junta]

PUNTOS CLAVE
[Lista de 3-5 puntos concisos]

DECISIONES TOMADAS
[Solo si hay decisiones en la agenda, sino omitir]

COMPROMISOS DE LA SEMANA
[Los compromisos del área para la siguiente semana, si los hay]

Sé directo, usa lenguaje operativo profesional. Máximo 300 palabras total.`;

  let resumenTexto = "";
  try {
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 600,
      messages:   [{ role: "user", content: prompt }],
    });
    resumenTexto = (response.content[0] as { text: string }).text ?? "";
  } catch {
    resumenTexto = "No se pudo generar el resumen automático. Puedes escribirlo manualmente.";
  }

  const updated = await prisma.junta.update({
    where: { id },
    data:  { resumen: resumenTexto, estado: "COMPLETADA" },
  });

  return NextResponse.json({ resumen: updated.resumen });
}
