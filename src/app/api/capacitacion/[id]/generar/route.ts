import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// Node.js runtime with streaming — avoids Vercel Hobby 10s timeout via chunked response
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const { id } = await params;

  // Fetch session from DB
  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    include: {
      versiones: {
        select: { version: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!sesion) {
    return new Response(JSON.stringify({ error: "Sesión no encontrada" }), { status: 404 });
  }

  const nextVersion =
    sesion.versiones.length > 0 ? sesion.versiones[0].version + 1 : 1;
  const puntos =
    sesion.puntosEditados.length > 0 ? sesion.puntosEditados : sesion.puntosBase;
  const fechaStr = sesion.fechaProgramada
    ? new Date(sesion.fechaProgramada).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Por programar";

  const systemPrompt = `Eres el generador de presentaciones de capacitación interna de Mainstage Pro.
Mainstage Pro es una empresa de producción técnica para eventos (audio, iluminación,
video, rigging, staging) en Querétaro, México. El director es Mauricio Hernández.

Tu tarea: generar una presentación HTML completa, autocontenida y navegable
para una sesión de capacitación del equipo de Mainstage Pro.

IDENTIDAD VISUAL OBLIGATORIA (no negociable):
- Fondo oscuro: #040404 en portada y cierre, #080808 en slides de contenido
- Color dorado de marca: #B3985B
- Tipografía: -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif
- Peso display/hero: 800 | Títulos H1: 700 | Labels/captions: 600 | Cuerpo: 400
- Letter-spacing títulos: -0.03em | Labels: uppercase + 0.12em tracking

LOGO SVG (usar en portada, cierre y footers):
<svg viewBox='0 0 220 38' xmlns='http://www.w3.org/2000/svg'>
  <circle cx='13' cy='19' r='11' fill='#6b6b6b' opacity='.8'/>
  <circle cx='22' cy='25' r='11' fill='#B3985B' opacity='.9'/>
  <text x='40' y='22' font-family='-apple-system,SF Pro Display,Segoe UI,sans-serif' font-size='14' font-weight='300' fill='#ffffff' letter-spacing='3'>MAINSTAGE</text>
  <line x1='40' y1='28' x2='193' y2='28' stroke='#B3985B' stroke-width='.6' opacity='.6'/>
  <text x='165' y='36' font-family='-apple-system,SF Pro Display,Segoe UI,sans-serif' font-size='10' font-weight='700' fill='#B3985B' letter-spacing='1.5'>PRO</text>
</svg>

ESTRUCTURA DE SLIDES — siempre exactamente 7 slides:

Slide 1 — PORTADA
  Fondo #040404. Logo en top-left. Tag 'Módulo Fundacional · 2026' en top-right.
  Centro: eyebrow con bloque y número de sesión, luego título en display 800w
  (font-size clamp(28px, 6.5vw, 82px)), luego fecha y datos en muted.
  Footer: caption con duración e impartidor + contador 01/07.

Slide 2 — OBJETIVO
  Fondo #080808. Eyebrow + H1 'Qué vas a llevarte hoy'.
  Box con borde izquierdo dorado 2px, border-radius 0 6px 6px 0:
  texto del objetivo de la sesión.
  Chips con: audiencia, bloque, módulo, impartidor.

Slide 3 — CONTENIDO
  Fondo #080808. Eyebrow + H1 'Lo que vamos a ver'.
  Lista numerada de puntos: cada punto es un item con número en dorado
  y texto en color #ccc con términos clave en bold blanco.

Slide 4 — CONCEPTO CLAVE
  Fondo #080808. Eyebrow + H1 con el concepto central del tema.
  Grid 2x2 de cards (border .5px solid #1a1a1a, border-radius 7px):
  - Card 1 (borde dorado, fondo #0c0b08): el concepto más importante
  - Cards 2-4: conceptos complementarios
  Cada card tiene: label (eyebrow dorado) + título (font-weight 700) + descripción (color #666)

Slide 5 — DESARROLLO
  Fondo #080808. Slide variable según el tema:
  - Si el tema tiene datos/cifras relevantes: grid de stats con número en dorado grande
  - Si el tema es un proceso: lista expandida con pasos o fases
  - Si el tema tiene contrastes: dos columnas comparativas
  Adaptar el tipo de slide al contenido específico de la sesión.

Slide 6 — FRASE / REFLEXIÓN
  Fondo #040404. Logo en top-left. Tag de la sesión en top-right.
  Centro: quote en display 800w (max-width 88%), con 1-2 palabras clave en dorado.
  Footer: fuente de la frase en caption + contador 06/07.

Slide 7 — CIERRE
  Fondo #040404. Logo en top-left. Tag 'Sesión XX · Módulo Fundacional' en top-right.
  Eyebrow 'Para reflexionar'. Pregunta en H1 700w (max-width 78%).
  3 cards horizontales (fondo #0d0d0d, border #1a1a1a):
    - Siguiente sesión (número + título + fecha)
    - Material de apoyo
    - Tarea concreta para el equipo

NAVEGACIÓN JS (obligatoria):
- Botones anterior/siguiente clickeables
- Puntos de navegación que se actualizan al cambiar slide
- Teclas ArrowLeft/ArrowRight del teclado
- Contador 'XX / 07' que se actualiza
- Primer slide visible, resto display:none, JS cambia visibilidad
- Aspect ratio 16/9 centrado en la página, máx 1200px ancho, con nav arriba

SOBRE LAS NOTAS DEL DIRECTOR:
Integra las notas de forma completamente natural. No las menciones como 'notas agregadas'.
Úsalas para enriquecer el concepto clave, alimentar el desarrollo, construir la frase
de reflexión o formular la pregunta del cierre. El resultado debe ser UNA presentación coherente.

Devuelve ÚNICAMENTE el HTML completo empezando con <!DOCTYPE html>.
Sin explicaciones, sin markdown, sin bloques de código, sin backticks.`;

  const userPrompt = `Genera la presentación para esta sesión de capacitación:

NÚMERO: ${sesion.numero}
TÍTULO: ${sesion.titulo}
BLOQUE: ${sesion.bloque}
FECHA: ${fechaStr}
DURACIÓN: ${sesion.duracion} minutos
IMPARTIDOR: ${sesion.impartidor}

PUNTOS DE LA SESIÓN:
${puntos.map((p, i) => `${String(i + 1).padStart(2, "0")}. ${p}`).join("\n")}

NOTAS PERSONALES DEL DIRECTOR (integrar de forma natural):
${sesion.notas?.trim() || "No hay notas adicionales para esta sesión."}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      let htmlContent = "";

      try {
        const anthropicStream = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            htmlContent += event.delta.text;
            send({ type: "chunk", text: event.delta.text });
          }
        }

        // Clean HTML
        if (
          !htmlContent.startsWith("<!DOCTYPE html") &&
          !htmlContent.startsWith("<!doctype html")
        ) {
          const match = htmlContent.match(/(<!DOCTYPE html[\s\S]*)/i);
          if (match) htmlContent = match[1];
        }

        // Save to DB (Node.js runtime — Prisma works fine here)
        const version = await prisma.versionPresentacion.create({
          data: {
            sesionId: id,
            version: nextVersion,
            htmlContent,
            notasSnapshot: sesion.notas,
            puntosSnapshot: puntos,
            generadaPor: session.name ?? "Mauricio Hernández",
          },
        });

        await prisma.sesionCapacitacion.update({
          where: { id },
          data: { estado: "lista" },
        });

        send({
          type: "done",
          versionId: version.id,
          version: version.version,
          generadaEn: version.generadaEn.toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        send({ type: "error", message: `Error al generar con IA: ${msg}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
