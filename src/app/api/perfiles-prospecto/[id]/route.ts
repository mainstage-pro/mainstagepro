import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PERFIL_CATEGORIAS } from "@/lib/proceso/perfiles";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("label" in body) {
    const label = (body.label ?? "").trim();
    if (!label) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    data.label = label;
  }
  if ("categoria" in body) {
    if (!(PERFIL_CATEGORIAS as readonly string[]).includes(body.categoria)) {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
    }
    data.categoria = body.categoria;
  }
  if ("mensajeInicial" in body) data.mensajeInicial = body.mensajeInicial?.trim() || null;
  if ("materiales" in body) {
    data.materiales = Array.isArray(body.materiales) && body.materiales.length > 0 ? JSON.stringify(body.materiales) : null;
  }

  const perfil = await prisma.perfilProspecto.update({ where: { id }, data });
  return NextResponse.json({ perfil });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  // Soft delete: el contacto puede seguir apuntando al id; se resolverá al label guardado.
  await prisma.perfilProspecto.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
