import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jwtVerify } from "jose";

// ── Edge runtime: no Prisma, sin límite de 10s (CPU time) ────────────────────
export const runtime = "edge";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type SesionData = {
  numero: number;
  titulo: string;
  bloque: string;
  fechaStr: string;
  duracion: number;
  impartidor: string;
  puntos: string[];
  notas: string | null;
};

export async function POST(req: NextRequest) {
  // ── Auth: verifica JWT sin Prisma (Edge-compatible) ──────────────────────
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    await jwtVerify(token, secret);
  } catch {
    return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401 });
  }

  // ── Datos de sesión desde el body (cliente los envía) ───────────────────
  let sesionData: SesionData;
  try {
    const body = await req.json() as { sesionData: SesionData };
    sesionData = body.sesionData;
    if (!sesionData?.titulo) throw new Error("sesionData incompleta");
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400 });
  }

  const { numero, titulo, bloque, fechaStr, duracion, impartidor, puntos, notas } = sesionData;

  // ── Prompts ────────────────────────────────────────────────────────────────
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

NAVEGACIÓN JS — USA EXACTAMENTE ESTE CÓDIGO (no lo improvises, cópialo tal cual):

Cada slide DEBE tener class="slide":
  <section class="slide" style="display:none; width:100%; aspect-ratio:16/9; ...">contenido</section>

Barra de navegación (fuera de los slides, siempre visible):
  <nav id="nav-bar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 20px;background:#0a0a0a;border-bottom:1px solid #1a1a1a;">
    <button onclick="goTo(cur-1)" style="background:none;border:1px solid #333;color:#999;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:16px;">‹</button>
    <div style="display:flex;align-items:center;gap:8px;">
      <!-- un <span class="dot"> por cada slide -->
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <span id="slide-counter" style="font-size:11px;color:#555;font-variant-numeric:tabular-nums;">01 / 07</span>
      <button onclick="goTo(cur+1)" style="background:none;border:1px solid #333;color:#999;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:16px;">›</button>
    </div>
  </nav>

Script (al final del body, antes de </body>):
  <script>
    var cur = 0;
    var slides = document.querySelectorAll('.slide');
    var dots = document.querySelectorAll('.dot');
    var counter = document.getElementById('slide-counter');
    function goTo(n) {
      slides[cur].style.display = 'none';
      dots[cur].style.opacity = '0.3';
      cur = ((n % slides.length) + slides.length) % slides.length;
      slides[cur].style.display = 'flex';
      dots[cur].style.opacity = '1';
      if (counter) counter.textContent = String(cur+1).padStart(2,'0') + ' / ' + String(slides.length).padStart(2,'0');
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(cur+1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(cur-1);
    });
    // Init
    slides.forEach(function(s,i){ s.style.display = i===0?'flex':'none'; });
    dots.forEach(function(d,i){ d.style.opacity = i===0?'1':'0.3'; });
  </script>

Layout general: <body style="margin:0;padding:0;background:#000;">
  <nav id="nav-bar">...</nav>
  <div id="deck" style="width:100%;max-width:1200px;margin:0 auto;">
    <section class="slide">...</section>  <!-- slide 1, display:flex -->
    <section class="slide">...</section>  <!-- slides 2-7, display:none -->
  </div>
  <script>...</script>
</body>

SOBRE LAS NOTAS DEL DIRECTOR:
Integra las notas de forma completamente natural. No las menciones como 'notas agregadas'.
Úsalas para enriquecer el concepto clave, alimentar el desarrollo, construir la frase
de reflexión o formular la pregunta del cierre. El resultado debe ser UNA presentación coherente.

Devuelve ÚNICAMENTE el HTML completo empezando con <!DOCTYPE html>.
Sin explicaciones, sin markdown, sin bloques de código, sin backticks.`;

  const userPrompt = `Genera la presentación para esta sesión de capacitación:

NÚMERO: ${numero}
TÍTULO: ${titulo}
BLOQUE: ${bloque}
FECHA: ${fechaStr}
DURACIÓN: ${duracion} minutos
IMPARTIDOR: ${impartidor}

PUNTOS DE LA SESIÓN:
${puntos.map((p, i) => `${String(i + 1).padStart(2, "0")}. ${p}`).join("\n")}

NOTAS PERSONALES DEL DIRECTOR (integrar de forma natural):
${notas?.trim() || "No hay notas adicionales para esta sesión."}`;

  // ── SSE Stream ─────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const anthropicStream = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 6000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "chunk", text: event.delta.text });
          }
        }

        // Stream done — client will call /versiones to save to DB
        send({ type: "done" });
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
