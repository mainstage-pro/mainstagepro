import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const politica = await prisma.politica.findUnique({
    where: { id },
    include: {
      versiones: { orderBy: { version: "desc" } },
      acuses: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!politica) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ politica });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.titulo !== undefined) data.titulo = b.titulo;
    if (b.categoria !== undefined) data.categoria = b.categoria || "GENERAL";
    if (b.resumen !== undefined) data.resumen = b.resumen || null;
    if (b.contenido !== undefined) data.contenido = b.contenido || "";
    if (b.requiereAcuse !== undefined) data.requiereAcuse = !!b.requiereAcuse;
    if (b.orden !== undefined) data.orden = Number(b.orden) || 0;
    if (b.estado !== undefined) data.estado = b.estado;
    data.updatedAt = new Date();
    const politica = await prisma.politica.update({ where: { id }, data });
    return NextResponse.json({ politica });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/politicas PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.politica.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/politicas DELETE]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
