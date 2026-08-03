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
  if (!meta || !renderer || !meta.disponible) {
    return new Response("Diseño no disponible", { status: 404 });
  }

  // Los datos se arman primero: la lista de slides es DINÁMICA (depende de los
  // equipos reales del evento), así que no se valida contra la metadata estática.
  const data = await renderer.buildData(params);
  const slideList = renderer.slides(data);
  if (slideList.length === 0) {
    return new Response("Diseño sin slides", { status: 404 });
  }

  const slide = slideParam && slideList.some((s) => s.id === slideParam) ? slideParam : slideList[0].id;
  const index = slideList.findIndex((s) => s.id === slide) + 1;

  const [bg, logo, fonts] = await Promise.all([
    localImage(origin, renderer.bgFor(slide, data)),
    localPng(origin, "logo-white.png"),
    interFonts(origin),
  ]);

  return new ImageResponse(renderer.render(slide, data, { bg, logo }, index), {
    width: CANVAS.W,
    height: CANVAS.H,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
}
