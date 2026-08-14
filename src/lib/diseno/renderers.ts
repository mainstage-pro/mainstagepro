import type { ReactElement } from "react";
import { renderStory } from "./brief-tecnico/templates";
import { briefBg, briefEditableFields, briefSlides, SUPRATERRA, type BriefTecnicoData } from "./brief-tecnico/data";
import { buildBriefTecnicoData } from "./brief-tecnico/build";
import { renderServicio } from "./servicios/templates";
import { serviciosBg, serviciosEditableFields, serviciosSlides, type ServiciosData } from "./servicios/data";
import { buildServiciosData } from "./servicios/build";
import { renderTipoEvento } from "./tipos-evento/templates";
import { tiposEventoBg, tiposEventoEditableFields, tiposEventoSlides, type TiposEventoData } from "./tipos-evento/data";
import { buildTiposEventoData } from "./tipos-evento/build";
import type { EditableField } from "./overrides";
import type { FormatoPerfil } from "./formatos";

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
  // Campos que el usuario puede editar manualmente (para el editor).
  editableFields: (data: unknown) => EditableField[];
  // Elemento Satori para un slide dado (index = número de esquina, 1-based).
  render: (slide: string, data: unknown, assets: { bg: string; logo: string }, index: number, fmt: FormatoPerfil) => ReactElement;
};

export const RENDERERS: Record<string, TemplateRenderer> = {
  "brief-tecnico": {
    buildData: async ({ proyectoId }) =>
      proyectoId ? (await buildBriefTecnicoData(proyectoId)) ?? SUPRATERRA : SUPRATERRA,
    slides: (data) => briefSlides(data as BriefTecnicoData),
    bgFor: (slide, data) => briefBg(data as BriefTecnicoData, slide),
    editableFields: (data) => briefEditableFields(data as BriefTecnicoData),
    render: (slide, data, assets, index, fmt) => renderStory(slide, data as BriefTecnicoData, assets, index, fmt),
  },
  "servicios-mainstage": {
    buildData: async () => buildServiciosData(),
    slides: (data) => serviciosSlides(data as ServiciosData),
    bgFor: (slide, data) => serviciosBg(data as ServiciosData, slide),
    editableFields: (data) => serviciosEditableFields(data as ServiciosData),
    render: (slide, data, assets, index, fmt) => renderServicio(slide, data as ServiciosData, assets, index, fmt),
  },
  "tipos-evento": {
    buildData: async () => buildTiposEventoData(),
    slides: (data) => tiposEventoSlides(data as TiposEventoData),
    bgFor: (slide, data) => tiposEventoBg(data as TiposEventoData, slide),
    editableFields: (data) => tiposEventoEditableFields(data as TiposEventoData),
    render: (slide, data, assets, index, fmt) => renderTipoEvento(slide, data as TiposEventoData, assets, index, fmt),
  },
};

export function getRenderer(id: string): TemplateRenderer | null {
  return RENDERERS[id] ?? null;
}
