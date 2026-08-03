import type { ReactElement } from "react";
import { renderStory } from "./brief-tecnico/templates";
import { briefBg, briefSlides, SUPRATERRA, type BriefTecnicoData } from "./brief-tecnico/data";
import { buildBriefTecnicoData } from "./brief-tecnico/build";

// ── Renderers (server-only) ──────────────────────────────────────────────────
// Aquí sí se importa lo pesado (prisma vía build, templates). Cada plantilla del
// registro que esté "disponible" debe tener su entrada aquí.

export type RenderParams = { proyectoId?: string | null };

export type TemplateRenderer = {
  // Arma los datos de la pieza (deterministas + IA). Sin proyecto usa la muestra.
  buildData: (params: RenderParams) => Promise<unknown>;
  // Lista ORDENADA de slides (dinámica: depende de los datos ya construidos).
  slides: (data: unknown) => { id: string; label: string }[];
  // Foto de fondo (ruta en /public) para un slide dado.
  bgFor: (slide: string, data: unknown) => string;
  // Elemento Satori para un slide dado (index = número de esquina, 1-based).
  render: (slide: string, data: unknown, assets: { bg: string; logo: string }, index: number) => ReactElement;
};

export const RENDERERS: Record<string, TemplateRenderer> = {
  "brief-tecnico": {
    buildData: async ({ proyectoId }) =>
      proyectoId ? (await buildBriefTecnicoData(proyectoId)) ?? SUPRATERRA : SUPRATERRA,
    slides: (data) => briefSlides(data as BriefTecnicoData),
    bgFor: (slide, data) => briefBg(data as BriefTecnicoData, slide),
    render: (slide, data, assets, index) => renderStory(slide, data as BriefTecnicoData, assets, index),
  },
};

export function getRenderer(id: string): TemplateRenderer | null {
  return RENDERERS[id] ?? null;
}
