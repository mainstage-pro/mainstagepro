import fs from "fs";
import path from "path";
import sharp from "sharp";
import { CANVAS } from "./tokens";

// Fuentes Inter (woff) empaquetadas en el repo para next/og (Satori soporta woff).
let fontCache: { name: string; data: Buffer; weight: 400 | 700 | 900; style: "normal" }[] | null = null;

export function interFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src/lib/diseno/fonts");
  const read = (f: string) => fs.readFileSync(path.join(dir, f));
  fontCache = [
    { name: FONT_NAME, data: read("inter-400.woff"), weight: 400, style: "normal" },
    { name: FONT_NAME, data: read("inter-700.woff"), weight: 700, style: "normal" },
    { name: FONT_NAME, data: read("inter-900.woff"), weight: 900, style: "normal" },
  ];
  return fontCache;
}

export const FONT_NAME = "Inter";

// Lee una imagen de /public, la redimensiona al ancho del lienzo y la devuelve
// como data URL (Satori la incrusta). El downscale evita reventar el decodificador
// con fotos pesadas — clave cuando la foto venga de Vercel Blob a tamaño original.
const imgCache = new Map<string, string>();

export async function localImage(rel: string, maxWidth = CANVAS.W): Promise<string> {
  const key = `${rel}@${maxWidth}`;
  const cached = imgCache.get(key);
  if (cached) return cached;
  const p = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  const buf = await fs.promises.readFile(p);
  const url = await encodeImage(buf, maxWidth);
  imgCache.set(key, url);
  return url;
}

// Lee un PNG de /public preservando transparencia (logos, iconos).
export async function localPng(rel: string): Promise<string> {
  const key = `png:${rel}`;
  const cached = imgCache.get(key);
  if (cached) return cached;
  const p = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  const buf = await fs.promises.readFile(p);
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
