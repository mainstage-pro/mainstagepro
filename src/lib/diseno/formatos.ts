// ── Perfiles de formato (D1) ─────────────────────────────────────────────────
// Una sola composición se autora una vez y el renderer la resuelve contra uno de
// estos perfiles. NO se autoran tres plantillas por pieza.
//
//   · story    1080×1920 (9:16) — Stories IG/FB. Lienzo base (escala 1.00).
//   · post     1080×1350 (4:5)  — Feed de Instagram.
//   · cuadrado 1080×1080 (1:1)  — Carruseles, LinkedIn, respaldo. El más restrictivo.
//
// `safeTop`/`safeBottom` (solo story) son las zonas que tapa la interfaz de
// Instagram (avatar arriba, barra de respuesta abajo): nada crítico entra ahí.
// `escala` reduce proporcionalmente los tamaños tipográficos al achicar el alto.

import { CANVAS } from "./tokens";

export type FormatoId = "story" | "post" | "cuadrado";

export type FormatoPerfil = {
  id: FormatoId;
  label: string;
  ratio: string;
  w: number;
  h: number;
  margen: number; // margen lateral en px
  safeTop: number; // zona superior libre de UI (px)
  safeBottom: number; // zona inferior libre de UI (px)
  escala: number; // factor global sobre tamaños tipográficos
};

export const FORMATOS: Record<FormatoId, FormatoPerfil> = {
  story: { id: "story", label: "Story", ratio: "9:16", w: CANVAS.W, h: CANVAS.H, margen: 86, safeTop: 250, safeBottom: 320, escala: 1.0 },
  post: { id: "post", label: "Post", ratio: "4:5", w: 1080, h: 1350, margen: 72, safeTop: 0, safeBottom: 0, escala: 0.88 },
  cuadrado: { id: "cuadrado", label: "Cuadrado", ratio: "1:1", w: 1080, h: 1080, margen: 64, safeTop: 0, safeBottom: 0, escala: 0.78 },
} as const;

export const FORMATO_IDS = Object.keys(FORMATOS) as FormatoId[];

export const FORMATO_DEFAULT: FormatoId = "story";

export function getFormato(id: string | null | undefined): FormatoPerfil {
  return (id && (FORMATOS as Record<string, FormatoPerfil>)[id]) || FORMATOS[FORMATO_DEFAULT];
}

// Alto útil de contenido = alto total menos las zonas seguras (para el sistema de
// bloques con prioridad: se arma en orden y se corta cuando se acaba este alto).
export function altoUtil(f: FormatoPerfil): number {
  return f.h - f.safeTop - f.safeBottom;
}

// Redondea un tamaño tipográfico contra la escala del formato (mínimo 20 px por
// la regla de legibilidad del brandbook: el texto nunca baja de ~24 px reales).
export function s(px: number, f: FormatoPerfil): number {
  return Math.round(px * f.escala);
}
