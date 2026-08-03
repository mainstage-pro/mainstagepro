import { ImageResponse } from "next/og";
import { interFonts, localImage, localPng } from "./assets";
import { getTemplate } from "./registry";
import { getRenderer } from "./renderers";
import { CANVAS } from "./tokens";

// Ensambla la imagen de un slide de cualquier plantilla registrada. Usada por la
// ruta genérica /api/diseno/render y por rutas de compatibilidad (ej. brief).
export async function renderDesign(
  origin: string,
  templateId: string | null,
  slideParam: string | null,
  params: { proyectoId?: string | null },
): Promise<Response> {
  const meta = templateId ? getTemplate(templateId) : null;
  const renderer = templateId ? getRenderer(templateId) : null;
  if (!meta || !renderer || !meta.disponible || meta.slides.length === 0) {
    return new Response("Diseño no disponible", { status: 404 });
  }

  const slide =
    slideParam && meta.slides.some((s) => s.id === slideParam) ? slideParam : meta.slides[0].id;

  const data = await renderer.buildData(params);
  const [bg, logo, fonts] = await Promise.all([
    localImage(origin, renderer.bgFor(slide)),
    localPng(origin, "logo-white.png"),
    interFonts(origin),
  ]);

  return new ImageResponse(renderer.render(slide, data, { bg, logo }), {
    width: CANVAS.W,
    height: CANVAS.H,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
}
