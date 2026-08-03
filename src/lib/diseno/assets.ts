import sharp from "sharp";
import { CANVAS } from "./tokens";

// En Vercel el directorio /public NO está en el filesystem de la función
// serverless: se sirve por CDN. Por eso leemos los assets por HTTP desde el
// propio origin del request (fetch), no con fs. Todo se cachea a nivel módulo.

export const FONT_NAME = "Inter";

let fontCache: { name: string; data: ArrayBuffer; weight: 400 | 700 | 900; style: "normal" }[] | null = null;

// Fuentes Inter (woff) servidas desde /public/diseno/fonts.
export async function interFonts(origin: string) {
  if (fontCache) return fontCache;
  const load = async (f: string) => {
    const res = await fetch(`${origin}/diseno/fonts/${f}`);
    if (!res.ok) throw new Error(`font ${f}: ${res.status}`);
    return res.arrayBuffer();
  };
  fontCache = [
    { name: FONT_NAME, data: await load("inter-400.woff"), weight: 400, style: "normal" },
    { name: FONT_NAME, data: await load("inter-700.woff"), weight: 700, style: "normal" },
    { name: FONT_NAME, data: await load("inter-900.woff"), weight: 900, style: "normal" },
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
  // Acepta rutas de /public (relativas) o URLs absolutas (fotos en Vercel Blob).
  const src = /^https?:\/\//.test(rel) ? rel : `${origin}/${rel.replace(/^\//, "")}`;
  const buf = await fetchBuffer(src);
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
