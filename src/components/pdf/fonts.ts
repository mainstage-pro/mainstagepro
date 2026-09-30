/**
 * Fuentes de marca para los PDF (Montserrat + JetBrains Mono, manual v1).
 *
 * Los TTF viven en `public/fonts` (subconjunto latino generado desde las fuentes
 * variables de Google Fonts). Si por alguna razón no están en el bundle, se cae a
 * Helvetica en vez de tronar el render.
 *
 * Solo se puede importar desde código de servidor: usa `fs`/`path`.
 */
import { Font } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

function registrar(): boolean {
  const dir = path.join(process.cwd(), "public", "fonts");
  const f = (n: string) => path.join(dir, n);
  const requeridos = [
    "Montserrat-Regular.ttf", "Montserrat-SemiBold.ttf", "Montserrat-Bold.ttf",
    "Montserrat-ExtraBold.ttf", "Montserrat-Italic.ttf",
    "JetBrainsMono-Regular.ttf", "JetBrainsMono-Medium.ttf", "JetBrainsMono-Bold.ttf",
  ];
  try {
    if (!requeridos.every(n => fs.existsSync(f(n)))) return false;
    Font.register({
      family: "Montserrat",
      fonts: [
        { src: f("Montserrat-Regular.ttf"), fontWeight: 400 },
        { src: f("Montserrat-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
        { src: f("Montserrat-SemiBold.ttf"), fontWeight: 600 },
        { src: f("Montserrat-Bold.ttf"), fontWeight: 700 },
        { src: f("Montserrat-ExtraBold.ttf"), fontWeight: 800 },
      ],
    });
    Font.register({
      family: "JetBrainsMono",
      fonts: [
        { src: f("JetBrainsMono-Regular.ttf"), fontWeight: 400 },
        { src: f("JetBrainsMono-Medium.ttf"), fontWeight: 500 },
        { src: f("JetBrainsMono-Bold.ttf"), fontWeight: 700 },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

const ok = registrar();

// Sin partición de palabras: el guionado por defecto rompe nombres propios y
// palabras largas ("corre-sponde", "Mel-lado"), que en una cotización se lee mal.
Font.registerHyphenationCallback(palabra => [palabra]);

/** Tipografía de marca para texto. */
export const SANS = ok ? "Montserrat" : "Helvetica";
/** Tipografía de marca para datos: folios, fechas, cantidades y precios. */
export const MONO = ok ? "JetBrainsMono" : "Courier";
