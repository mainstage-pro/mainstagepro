// ── Directriz de diseño Mainstage ────────────────────────────────────────────
// Fuente ÚNICA de verdad para TODO lo que genera el módulo de diseño.
// Codifica el Brandbook Mainstage Pro (V.1 · 2026). Si cambia el brandbook,
// se cambia aquí y se propaga a todas las plantillas.
//
// Reglas ancla del brandbook:
//   · Un solo negro (#0A0A0A) y un solo dorado (#B3985B). Sin excepciones.
//   · El oro ACENTÚA, no domina: 70% negro/superficies · 20% grises · 10% oro.
//     El oro nunca se satura "para que resalte"; jamás sobre gris; oro sobre
//     negro solo en texto de ≥24 px.
//   · Una sola tipografía: Montserrat. Datos (folios, fechas, medidas, códigos)
//     en JetBrains Mono. Nunca se sustituye por Arial, Calibri, Poppins ni Inter.

export const CANVAS = { W: 1080, H: 1920 } as const;

// ── C · Color ────────────────────────────────────────────────────────────────
// Códigos EXACTOS del bloque C.1 y de los tokens de plataforma (H.3).
export const COLOR = {
  gold: "#B3985B", // Oro Mainstage — Pantone 4007 C. El único dorado.
  black: "#0A0A0A", // Negro escena — Pantone Black 6 C. Fondo base.
  surface: "#131313", // Superficie — tarjetas y módulos (solo digital).
  grey: "#8C8C8C", // Gris técnico — del isotipo.
  white: "#F6F4F0", // Blanco cálido — texto sobre negro. (NO #FFFFFF)
  textMute: "#8E887F", // Texto secundario en interfaz/piezas.
  border: "rgba(255,255,255,0.08)", // Borde de superficie (plataforma).
  cardBg: "rgba(19,19,19,0.72)", // Superficie translúcida sobre foto.
  cardBorder: "rgba(179,152,91,0.24)", // Borde de tarjeta con acento oro.
  // Alias de compatibilidad — el oro NO se aclara; goldBright = gold.
  goldBright: "#B3985B",
} as const;

// Proporción de uso del oro (C.2) — referencia, no se consume en código.
export const RATIO = { negro: 0.7, grises: 0.2, oro: 0.1 } as const;

// ── D · Tipografía ───────────────────────────────────────────────────────────
export const FONT = "Montserrat"; // familia única de la marca
export const FONT_MONO = "JetBrains Mono"; // solo datos: folios, fechas, medidas

// Pesos aprobados. Máximo ExtraBold 800 — no existe 900 en la marca.
export const WEIGHT = {
  light: 300, // pie de foto y datos secundarios
  regular: 400, // texto corrido
  semibold: 600, // etiquetas y subtítulos
  bold: 700, // títulos de bloque
  extrabold: 800, // titulares y portadas
} as const;

// Escala tipográfica por lienzo (D.2). El story 1080×1920 es el lienzo base.
export const TYPE = {
  // Redes · 1080 × 1920
  titular: { size: 130, weight: WEIGHT.extrabold, lineHeight: 1.02, tracking: -2 },
  bajada: { size: 46, weight: WEIGHT.bold, lineHeight: 1.15 },
  etiqueta: { size: 34, weight: WEIGHT.semibold, tracking: 0.2 * 34 }, // +0.2em
  texto: { size: 40, weight: WEIGHT.regular, lineHeight: 1.5 }, // mínimo absoluto 24 px
  dato: { size: 34, weight: WEIGHT.bold, mono: true },
} as const;

// Tracking en em para titulares/etiquetas cortas: +0.18 a +0.3em.
export const TRACKING = { titular: -0.02, etiqueta: 0.22 } as const;

// ── E · Sistema gráfico ──────────────────────────────────────────────────────
// Retícula del story vertical (E.2): margen 8%, 14% superior y 20% inferior
// libres de texto (ahí va la interfaz de Reels/Stories).
export const GRID = {
  margin: Math.round(CANVAS.W * 0.08), // 86 px
  safeTop: Math.round(CANVAS.H * 0.14), // 269 px libres arriba
  safeBottom: Math.round(CANVAS.H * 0.2), // 384 px libres abajo
  columns: 6,
  unit: 8, // grid base de 8 px
  radius: 6, // radio de tarjeta/badge (E.1)
} as const;

// Márgenes laterales del lienzo (compat con plantillas existentes).
export const SPACE = {
  padX: GRID.margin,
  padTop: GRID.safeTop,
} as const;

// Iconografía (E.3): línea, no relleno.
export const ICON = { canvas: 48, stroke: 2, corner: 2 } as const;

// ── F · Fotografía ───────────────────────────────────────────────────────────
// Velo negro 40–60% cuando lleva texto encima. Contraste alto, negros profundos,
// temperatura cálida. Sin filtros de moda ni saturación forzada.
export const SCRIM = {
  soft: "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.30) 42%, rgba(10,10,10,0.60) 100%)",
  medium: "linear-gradient(180deg, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.42) 42%, rgba(10,10,10,0.66) 100%)",
  strong: "linear-gradient(180deg, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.55) 44%, rgba(10,10,10,0.74) 100%)",
} as const;
