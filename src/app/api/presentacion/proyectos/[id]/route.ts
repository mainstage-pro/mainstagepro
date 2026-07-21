import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateProyecto, deleteProyecto, getProyectoById } from "@/lib/proyectos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const proyecto = await updateProyecto(id, body ?? {});
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ proyecto });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const proyecto = await getProyectoById(id);
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ proyecto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await deleteProyecto(id);
  return NextResponse.json({ ok: true });
}
