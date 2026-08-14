import sharp from "sharp";

// ── Tratamiento visual de un equipo en el módulo de diseño ────────────────────
// Un equipo se pinta de una de dos formas en las composiciones:
//   · "png-transparente" → recorte sin fondo; se estampa libre sobre el lienzo.
//   · "foto-marco"       → foto rectangular; va dentro de un marco/tarjeta.
// El sistema PROPONE por canal alfa (si la imagen tiene transparencia real es un
// recorte); el usuario corrige. Módulo server-only (usa sharp).

export type Tratamiento = "png-transparente" | "foto-marco";

export const TRATAMIENTOS: { value: Tratamiento; label: string }[] = [
  { value: "png-transparente", label: "PNG sin fondo" },
  { value: "foto-marco", label: "Foto con marco" },
];

export function esTratamiento(v: string | null | undefined): v is Tratamiento {
  return v === "png-transparente" || v === "foto-marco";
}

// Propone el tratamiento inspeccionando el canal alfa. Se considera "recorte" si
// una fracción significativa de píxeles es (semi)transparente: un JPEG opaco o un
// PNG con fondo sólido caen en "foto-marco".
export async function proponerTratamiento(buffer: Buffer): Promise<Tratamiento> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  if (!meta.hasAlpha) return "foto-marco";

  // Extrae solo el canal alfa y mide qué proporción de píxeles es transparente.
  const alpha = await img.ensureAlpha().extractChannel(3).raw().toBuffer();
  if (alpha.length === 0) return "foto-marco";
  let transparentes = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] < 250) transparentes++;
  }
  const frac = transparentes / alpha.length;
  // >8% de píxeles no-opacos ⇒ es un recorte con fondo removido.
  return frac > 0.08 ? "png-transparente" : "foto-marco";
}
