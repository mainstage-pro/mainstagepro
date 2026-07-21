import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addImagen } from "@/lib/proyectos";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { url, caption } = await req.json().catch(() => ({}));
  if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  const imagen = await addImagen(id, url, caption ?? null);
  return NextResponse.json({ imagen }, { status: 201 });
}
