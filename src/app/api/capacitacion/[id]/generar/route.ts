import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/capacitacion/[id]/versiones/[vid] — lazy-load HTML for a specific version
// (handled via this route so we don't bloat the list response)

// POST /api/capacitacion/[id]/generar — Generate a new presentation version
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // 1. Fetch session with existing versions
  const sesion = await prisma.sesionCapacitacion.findUnique({
    where: { id },
    include: { versiones: { select: { version: true }, orderBy: { version: "desc" }, take: 1 } },
  });
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  // 2. Calculate next version number
  const nextVersion = sesion.versiones.length > 0 ? sesion.versiones[0].version + 1 : 1;

  // 3. Build prompt data
  const puntos = sesion.puntosEditados.length > 0 ? sesion.puntosEditados : sesion.puntosBase;
  const fechaStr = sesion.fechaProgramada
    ? sesion.fechaProgramada.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
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
  Grid 2×2 de cards (border .5px solid #1a1a1a, border-radius 7px):
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
El HTML debe incluir:
- Botones ← → clickeables
- Puntos de navegación que se actualizan al cambiar slide
- Teclas ArrowLeft/ArrowRight del teclado
- Contador 'XX / 07' que se actualiza
- Primer slide visible, resto display:none, JS cambia visibilidad
- Aspect ratio 16/9 centrado en la página, máx 1200px ancho, con nav arriba

SOBRE LAS NOTAS DEL DIRECTOR:
Integra las notas de forma completamente natural. No las menciones como 'notas agregadas'.
Úsalas para: enriquecer el concepto clave (slide 4), alimentar el desarrollo (slide 5),
construir la frase de reflexión (slide 6) o formular la pregunta del cierre (slide 7).
Si contiene anécdotas o casos reales, incorpóralos donde más impacten.
El resultado debe sentirse como UNA sola presentación coherente.

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

NOTAS PERSONALES DEL DIRECTOR (integrar de forma natural en la presentación):
${sesion.notas?.trim() || "No hay notas adicionales para esta sesión."}`;

  // 4. Call Claude API
  let htmlContent: string;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "La IA no devolvió contenido de texto" }, { status: 500 });
    }

    htmlContent = textBlock.text.trim();

    // Ensure the content starts with <!DOCTYPE html>
    if (!htmlContent.startsWith("<!DOCTYPE html") && !htmlContent.startsWith("<!doctype html")) {
      const match = htmlContent.match(/(<!DOCTYPE html[\s\S]*)/i);
      if (match) htmlContent = match[1];
    }
  } catch (err) {
    console.error("[generar] Anthropic API error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Error al generar con IA: ${msg}` }, { status: 500 });
  }

  // 5. Save new version (never overwrite existing)
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

  // 6. Update session state to "lista"
  await prisma.sesionCapacitacion.update({
    where: { id },
    data: { estado: "lista" },
  });

  return NextResponse.json({
    versionId: version.id,
    version: version.version,
    htmlContent: version.htmlContent,
    generadaEn: version.generadaEn,
  });
}
