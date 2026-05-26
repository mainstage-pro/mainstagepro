import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";

// Ruta de upload server-side (legacy, limitada a ~4.5 MB por Vercel Functions)
// Para archivos grandes usa /api/upload/token + client upload de @vercel/blob
export const maxDuration = 60; // segundos

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `marketing/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, { access: "public" });
  return NextResponse.json({ url: blob.url });
}
