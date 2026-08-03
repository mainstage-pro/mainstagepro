import type { ReactElement } from "react";
import { renderStory } from "./brief-tecnico/templates";
import { STORY_BG, SUPRATERRA, type BriefTecnicoData } from "./brief-tecnico/data";
import { buildBriefTecnicoData } from "./brief-tecnico/build";

// ── Renderers (server-only) ──────────────────────────────────────────────────
// Aquí sí se importa lo pesado (prisma vía build, templates). Cada plantilla del
// registro que esté "disponible" debe tener su entrada aquí.

export type RenderParams = { proyectoId?: string | null };

export type TemplateRenderer = {
  // Arma los datos de la pieza (deterministas + IA). Sin proyecto usa la muestra.
  buildData: (params: RenderParams) => Promise<unknown>;
  // Foto de fondo (ruta en /public) para un slide dado.
  bgFor: (slide: string) => string;
  // Elemento Satori para un slide dado.
  render: (slide: string, data: unknown, assets: { bg: string; logo: string }) => ReactElement;
};

export const RENDERERS: Record<string, TemplateRenderer> = {
  "brief-tecnico": {
    buildData: async ({ proyectoId }) =>
      proyectoId ? (await buildBriefTecnicoData(proyectoId)) ?? SUPRATERRA : SUPRATERRA,
    bgFor: (slide) => STORY_BG[slide] ?? STORY_BG.portada,
    render: (slide, data, assets) => renderStory(slide, data as BriefTecnicoData, assets),
  },
};

export function getRenderer(id: string): TemplateRenderer | null {
  return RENDERERS[id] ?? null;
}
