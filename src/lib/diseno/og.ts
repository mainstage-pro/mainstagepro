import { ImageResponse } from "next/og";
import { brandFonts, localImage, localPng } from "./assets";
import { getTemplate } from "./registry";
import { getRenderer } from "./renderers";
import { applyOverrides, type DesignOverrides } from "./overrides";
import { getDiseno } from "./guardados";
import { getFormato } from "./formatos";

// Ensambla la imagen de un slide de cualquier plantilla registrada. Usada por la
// ruta genérica /api/diseno/render y por rutas de compatibilidad (ej. brief).
// Con `disenoId` aplica las ediciones manuales (texto + fotos) del diseño guardado.
export async function renderDesign(
  origin: string,
  templateId: string | null,
  slideParam: string | null,
  params: { proyectoId?: string | null; disenoId?: string | null; formato?: string | null },
): Promise<Response> {
  // Si viene un diseño guardado, él manda: define plantilla, proyecto, formato,
  // overrides y —si ya se generó— el snapshot congelado de datos.
  let overrides: DesignOverrides | null = null;
  let proyectoId = params.proyectoId ?? null;
  let effTemplate = templateId;
  let effFormato = params.formato ?? null;
  let snapshot: unknown | null = null;
  if (params.disenoId) {
    const guardado = await getDiseno(params.disenoId);
    if (!guardado) return new Response("Diseño guardado no existe", { status: 404 });
    overrides = guardado.overrides;
    proyectoId = guardado.proyectoId;
    effTemplate = guardado.template;
    effFormato = params.formato ?? guardado.formato; // el param explícito puede forzar otro formato
    snapshot = guardado.snapshot;
  }
  const fmt = getFormato(effFormato);

  const meta = effTemplate ? getTemplate(effTemplate) : null;
  const renderer = effTemplate ? getRenderer(effTemplate) : null;
  if (!meta || !renderer || !meta.disponible) {
    return new Response("Diseño no disponible", { status: 404 });
  }

  // Los datos se arman primero: la lista de slides es DINÁMICA (depende de los
  // equipos reales del evento), así que no se valida contra la metadata estática.
  // Si la pieza ya se generó, sus datos están congelados (snapshot); si no, se
  // arman en vivo desde la fuente. En ambos casos los overrides mandan encima.
  const base = snapshot ?? (await renderer.buildData({ proyectoId }));
  const data = applyOverrides(base, overrides);
  const slideList = renderer.slides(data);
  if (slideList.length === 0) {
    return new Response("Diseño sin slides", { status: 404 });
  }

  const slide = slideParam && slideList.some((s) => s.id === slideParam) ? slideParam : slideList[0].id;
  const index = slideList.findIndex((s) => s.id === slide) + 1;

  // Foto de fondo: si el usuario subió una para este slide, gana; si no, la de marca.
  const bgRef = overrides?.fotos?.[slide] ?? renderer.bgFor(slide, data);
  const [bg, logo, fonts] = await Promise.all([
    localImage(origin, bgRef),
    localPng(origin, "logo-white.png"),
    brandFonts(origin),
  ]);

  return new ImageResponse(renderer.render(slide, data, { bg, logo }, index, fmt), {
    width: fmt.w,
    height: fmt.h,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
}
