import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteImagen } from "@/lib/proyectos";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ imgId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { imgId } = await params;
  await deleteImagen(imgId);
  return NextResponse.json({ ok: true });
}
