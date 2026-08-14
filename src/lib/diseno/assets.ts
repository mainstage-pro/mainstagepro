import sharp from "sharp";
import { CANVAS } from "./tokens";

// En Vercel el directorio /public NO está en el filesystem de la función
// serverless: se sirve por CDN. Por eso leemos los assets por HTTP desde el
// propio origin del request (fetch), no con fs. Todo se cachea a nivel módulo.

export const FONT_NAME = "Montserrat";
export const FONT_MONO_NAME = "JetBrains Mono";

type FontFace = { name: string; data: ArrayBuffer; weight: 300 | 400 | 600 | 700 | 800; style: "normal" };
let fontCache: FontFace[] | null = null;

// Tipografías de marca (TTF) servidas desde /public/diseno/fonts.
// Montserrat (300/400/600/700/800) para todo + JetBrains Mono para datos.
export async function brandFonts(origin: string): Promise<FontFace[]> {
  if (fontCache) return fontCache;
  const load = async (f: string) => {
    const res = await fetch(`${origin}/diseno/fonts/${f}`);
    if (!res.ok) throw new Error(`font ${f}: ${res.status}`);
    return res.arrayBuffer();
  };
  const [m3, m4, m6, m7, m8, jm4, jm7] = await Promise.all([
    load("montserrat-300.ttf"),
    load("montserrat-400.ttf"),
    load("montserrat-600.ttf"),
    load("montserrat-700.ttf"),
    load("montserrat-800.ttf"),
    load("jetbrainsmono-400.ttf"),
    load("jetbrainsmono-700.ttf"),
  ]);
  fontCache = [
    { name: FONT_NAME, data: m3, weight: 300, style: "normal" },
    { name: FONT_NAME, data: m4, weight: 400, style: "normal" },
    { name: FONT_NAME, data: m6, weight: 600, style: "normal" },
    { name: FONT_NAME, data: m7, weight: 700, style: "normal" },
    { name: FONT_NAME, data: m8, weight: 800, style: "normal" },
    { name: FONT_MONO_NAME, data: jm4, weight: 400, style: "normal" },
    { name: FONT_MONO_NAME, data: jm7, weight: 700, style: "normal" },
  ];
  return fontCache;
}

const imgCache = new Map<string, string>();

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`asset ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Foto de fondo desde /public: descarga, redimensiona al ancho del lienzo y
// devuelve data URL. El downscale evita reventar el decodificador de Satori con
// fotos pesadas (varias de /public pesan >8MB).
export async function localImage(origin: string, rel: string, maxWidth = CANVAS.W): Promise<string> {
  const key = `${rel}@${maxWidth}`;
  const cached = imgCache.get(key);
  if (cached) return cached;
  // Acepta data URLs base64 (fotos de equipo en BD), rutas de /public (relativas)
  // o URLs absolutas (fotos en Vercel Blob).
  const buf = rel.startsWith("data:")
    ? Buffer.from(rel.slice(rel.indexOf(",") + 1), "base64")
    : await fetchBuffer(/^https?:\/\//.test(rel) ? rel : `${origin}/${rel.replace(/^\//, "")}`);
  const url = await encodeImage(buf, maxWidth);
  imgCache.set(key, url);
  return url;
}

// PNG desde /public preservando transparencia (logos, iconos).
export async function localPng(origin: string, rel: string): Promise<string> {
  const key = `png:${rel}`;
  const cached = imgCache.get(key);
  if (cached) return cached;
  const buf = await fetchBuffer(`${origin}/${rel.replace(/^\//, "")}`);
  const url = `data:image/png;base64,${buf.toString("base64")}`;
  imgCache.set(key, url);
  return url;
}

// Convierte un buffer de imagen (local o remoto) a data URL JPEG redimensionado.
export async function encodeImage(input: Buffer, maxWidth = CANVAS.W): Promise<string> {
  const out = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
