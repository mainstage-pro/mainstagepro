import type { Disciplina } from './disciplinaColors'

/**
 * Trazos (viewBox 24×24, línea de 2) del icono de cada disciplina. Son los de
 * Lucide, copiados como datos para que la pantalla (SVG) y el PDF (react-pdf)
 * dibujen exactamente el mismo icono desde una sola fuente.
 */
export type TrazoIcono =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; width: number; height: number; rx?: number }

export const ICONO_DISCIPLINA: Record<Disciplina, TrazoIcono[]> = {
  // speaker
  AUDIO: [
    { t: 'rect', x: 4, y: 2, width: 16, height: 20, rx: 2 },
    { t: 'path', d: 'M12 6h.01' },
    { t: 'circle', cx: 12, cy: 14, r: 4 },
    { t: 'path', d: 'M12 14h.01' },
  ],
  // lightbulb
  ILUMINACION: [
    { t: 'path', d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' },
    { t: 'path', d: 'M9 18h6' },
    { t: 'path', d: 'M10 22h4' },
  ],
  // video
  VIDEO: [
    { t: 'path', d: 'm16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5' },
    { t: 'rect', x: 2, y: 6, width: 14, height: 12, rx: 2 },
  ],
  // theater
  STAGE: [
    { t: 'path', d: 'M2 10s3-3 3-8' },
    { t: 'path', d: 'M22 10s-3-3-3-8' },
    { t: 'path', d: 'M10 2c0 4.4-3.6 8-8 8' },
    { t: 'path', d: 'M14 2c0 4.4 3.6 8 8 8' },
    { t: 'path', d: 'M2 10s2 2 2 5' },
    { t: 'path', d: 'M22 10s-2 2-2 5' },
    { t: 'path', d: 'M8 15h8' },
    { t: 'path', d: 'M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1' },
    { t: 'path', d: 'M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1' },
  ],
  // zap
  ELECTRICIDAD: [
    { t: 'path', d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' },
  ],
  // link (cadena)
  RIGGING: [
    { t: 'path', d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
    { t: 'path', d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  ],
  // disc-3
  DJ: [
    { t: 'circle', cx: 12, cy: 12, r: 10 },
    { t: 'path', d: 'M6 12c0-1.7.7-3.2 1.8-4.2' },
    { t: 'circle', cx: 12, cy: 12, r: 2 },
    { t: 'path', d: 'M18 12c0 1.7-.7 3.2-1.8 4.2' },
  ],
  // clipboard-list
  PRODUCCION: [
    { t: 'rect', x: 8, y: 2, width: 8, height: 4, rx: 1 },
    { t: 'path', d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' },
    { t: 'path', d: 'M12 11h4' },
    { t: 'path', d: 'M12 16h4' },
    { t: 'path', d: 'M8 11h.01' },
    { t: 'path', d: 'M8 16h.01' },
  ],
  // users
  STAFF_GENERAL: [
    { t: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
    { t: 'path', d: 'M16 3.128a4 4 0 0 1 0 7.744' },
    { t: 'path', d: 'M22 21v-2a4 4 0 0 0-3-3.87' },
    { t: 'circle', cx: 9, cy: 7, r: 4 },
  ],
}
