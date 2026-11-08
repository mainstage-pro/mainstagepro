import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Subida pública para el formulario de postulación. No hay sesión, así que el
// servidor recibe el archivo y lo guarda directo en Blob. Límite: 10 MB,
// tipos imagen/pdf (lo mismo que aceptamos en la pregunta archivo_o_liga).
export const runtime = "nodejs";
export const maxDuration = 30;

const TIPOS_OK = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (!TIPOS_OK.has(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 10 MB." }, { status: 400 });
  }
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `postular/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const blob = await put(key, file, { access: "public", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url, pathname: blob.pathname });
}
