import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

// ── Edge runtime: no Prisma, no 10s limit (CPU time) ────────────────────────
// NOTE: Generation uses Edge for streaming, but we need Prisma here.
// So we split: stream generation lives in /api/presentaciones-venta/[id]/generar
// This route handles CRUD (Node.js runtime with Prisma).

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const presentaciones = await prisma.presentacionVenta.findMany({
    where: { creadaPorId: session.id },
    include: { imagenes: { orderBy: { orden: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ presentaciones });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { titulo, descripcion, imagenes } = body as {
    titulo: string;
    descripcion: string;
    imagenes: { url: string; nombre: string; orden: number }[];
  };

  if (!titulo || !descripcion) {
    return NextResponse.json({ error: "Título y descripción requeridos" }, { status: 400 });
  }

  const fotosDisponibles = imagenes?.length || 0;
  const galeriaSections =
    fotosDisponibles <= 3
      ? "Una sola sección de galería hero con las fotos disponibles"
      : "Dos secciones de galería, distribuyendo las fotos equitativamente";

  const systemPrompt = `Eres un experto en diseño de presentaciones comerciales para Mainstage Pro, empresa líder de producción audiovisual y eventos en Querétaro, México. Director: Mauricio Hernández.

OUTPUT: HTML del contenido de la presentación. OBLIGATORIO:
• El deck completo va dentro de <div id="deck">
• Comienza directamente con <div id="deck"> y termina con </div>
• SIN ninguna etiqueta <script> (el sistema las inyecta)
• SIN bloques <style> (el sistema inyecta el CSS completo)
• SIN markdown, backticks ni explicaciones externas
• La barra de navegación ya se inyecta automáticamente, NO la incluyas`;

  const userPrompt = `Eres un experto en diseño de presentaciones comerciales para Mainstage Pro.

Genera una presentación de ventas completa en HTML usando las clases CSS de Mainstage Pro.

## DESCRIPCIÓN DEL PAQUETE/OFERTA:
${descripcion}

## FOTOS DISPONIBLES (${fotosDisponibles} imágenes):
${(imagenes || []).map((img, i) => `Imagen ${i + 1}: ${img.nombre} → ${img.url}`).join("\n")}

## INSTRUCCIONES DE DISEÑO:
Genera exactamente 9 slides usando las clases CSS de Mainstage Pro. TODAS las secciones son obligatorias.

CLASES DISPONIBLES (úsalas):
- Slides: <section class="slide bg-dark"> o <section class="slide bg-mid">
- Títulos: <h1 class="ms-title xl">, <h2 class="ms-title lg">, <h2 class="ms-title md">
- Subtítulos: <p class="ms-subtitle">
- Etiqueta superior: <div class="ms-eyebrow">TEXTO</div>
- Cards: <div class="ms-card"> o <div class="ms-card gold">
  - Dentro: <div class="ms-card-label">, <div class="ms-card-title">, <div class="ms-card-body">
- Grids: <div class="ms-grid ms-grid-2">, <div class="ms-grid ms-grid-3">
- Listas: <ul class="ms-list"><li>...</li></ul>
- Stats: <div class="ms-stat-num">, <div class="ms-stat-label">
- Tag/badge: <span class="ms-tag">TEXTO</span>
- Dorado: <span class="ms-gold">texto</span>
- Divisor: <div class="ms-divider"></div>
- Footer del slide: <div class="ms-footer"><span>Mainstage Pro</span><span>2025</span></div>
- Logo: <img src="LOGO_HERE" class="ms-logo" alt="Mainstage Pro">
- Galería: <div class="ms-gallery cols-2"><img src="URL" alt="desc"></div>

ESTRUCTURA DE LOS 9 SLIDES:

1. PORTADA (bg-dark): Logo Mainstage Pro, ms-eyebrow con el tipo de oferta, título grande con el nombre del paquete, ms-subtitle con tagline impactante

2. CONTEXTO (bg-mid): ms-eyebrow "EL CONTEXTO", título medio, párrafo explicando la situación o necesidad que este paquete resuelve

3. LA SOLUCIÓN (bg-dark): ms-eyebrow "LA SOLUCIÓN", título grande, descripción de qué es exactamente lo que se ofrece, tag dorado con el nombre del paquete

4. QUÉ INCLUYE (bg-mid): ms-eyebrow "LO QUE INCLUYE", grid de cards con cada elemento del paquete. Mínimo 3 cards.

5. GALERÍA / EVIDENCIA (bg-dark): ms-eyebrow "NUESTRO TRABAJO", ${galeriaSections}. Usa las URLs de las imágenes directamente con <img> tags dentro de <div class="ms-gallery cols-N">. Si hay 0 fotos, pon una sección de stats en su lugar.
${fotosDisponibles > 3 ? '6. GALERÍA 2 (bg-mid): Continúa con más fotos del trabajo. ms-eyebrow "RESULTADOS REALES". Usa las URLs restantes.' : "6. POR QUÉ MAINSTAGE (bg-mid): ms-eyebrow \"POR QUÉ MAINSTAGE PRO\", 3-4 diferenciadores en cards o lista."}

7. POR QUÉ MAINSTAGE (bg-dark): ms-eyebrow "POR QUÉ MAINSTAGE PRO", grid con 3-4 diferenciadores clave (experiencia, calidad, servicio, tecnología)

8. INVERSIÓN (bg-mid): ms-eyebrow "INVERSIÓN", título con precio o rango si está en la descripción, desglose de qué incluye, nota sobre personalización

9. PRÓXIMOS PASOS (bg-dark): ms-eyebrow "SIGAMOS ADELANTE", título motivador, CTA claro, datos de contacto de Mainstage Pro (Tel: +52 442 XXX XXXX), logo

## REGLAS IMPORTANTES:
- Comienza con <div id="deck"> y termina con </div>
- NO incluyas <style>, <script>, <html>, <head>, <body> ni <nav>
- Usa texto REAL y específico basado en la descripción, no placeholders
- El contenido debe ser profesional, conciso y orientado a ventas
- Usa ms-gold para destacar números y datos importantes
- Los slides deben tener contenido equilibrado

Devuelve SOLO el HTML del deck, empezando con <div id="deck"> y terminando con </div>.`;

  // Call Claude (non-streaming for simplicity in the Node.js route)
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 12000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawHtml = message.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("");

  // Extract just the deck div
  let htmlContent = rawHtml;
  const deckMatch = rawHtml.match(/<div\s+id=["']deck["'][\s\S]*<\/div>/i);
  if (deckMatch) {
    htmlContent = deckMatch[0];
  }

  // Wrap in full HTML doc for the viewer
  const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${titulo}</title>
</head>
<body>
${htmlContent}
</body>
</html>`;

  // Create in DB
  const presentacion = await prisma.presentacionVenta.create({
    data: {
      titulo,
      descripcion,
      htmlContent: fullHtml,
      estado: "GENERADA",
      creadaPorId: session.id,
      imagenes: {
        create: (imagenes || []).map((img) => ({
          blobUrl: img.url,
          nombre: img.nombre,
          orden: img.orden,
        })),
      },
    },
    include: { imagenes: true },
  });

  return NextResponse.json({ presentacion }, { status: 201 });
}
