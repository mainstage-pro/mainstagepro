// ── Directriz de diseño Mainstage ────────────────────────────────────────────
// Fuente única de verdad para TODO lo que genere el módulo de diseño.
// Cambia aquí y cambia en todas las plantillas (brief técnico, y lo que venga).

export const CANVAS = { W: 1080, H: 1920 } as const;

export const COLOR = {
  gold: "#B3985B", // oro de marca (mismo que los PDFs)
  goldBright: "#CBB073", // acentos/realces
  black: "#0a0a0a",
  ink: "#101010",
  white: "#FFFFFF",
  mute: "#C6BCA8", // texto secundario cálido (subtítulos de items)
  muteSoft: "#9E9686",
  cardBg: "rgba(18,16,13,0.58)",
  cardBorder: "rgba(179,152,91,0.24)",
  ringLine: "rgba(179,152,91,0.10)",
} as const;

export const SPACE = {
  padX: 76, // margen lateral del lienzo
  padTop: 150,
} as const;

export const FONT = "Inter";

// Escrim/overlay sobre la foto de fondo, por intensidad.
export const SCRIM = {
  soft: "linear-gradient(180deg, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.40) 38%, rgba(10,10,10,0.78) 100%)",
  medium: "linear-gradient(180deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.58) 40%, rgba(10,10,10,0.86) 100%)",
  strong: "linear-gradient(180deg, rgba(8,8,8,0.90) 0%, rgba(8,8,8,0.74) 42%, rgba(8,8,8,0.92) 100%)",
} as const;
