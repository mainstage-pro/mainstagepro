import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const artista = await prisma.artista.findUnique({ where: { id } });
  if (!artista) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ artista });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  const textFields = ["nombre", "genero", "origen", "contactoNombre", "contactoTelefono",
    "contactoEmail", "instagram", "sitioWeb", "notas",
    // Campos de Giras: el logo encabeza riders y day sheets.
    "clienteId", "logoUrl", "tipoFormacion"];
  for (const f of textFields) if (f in body) data[f] = body[f] || null;
  if ("integrantesNum" in body) {
    const n = Number(body.integrantesNum);
    data.integrantesNum = body.integrantesNum === null || body.integrantesNum === "" || !Number.isFinite(n)
      ? null
      : Math.trunc(n);
  }
  if ("activo" in body) data.activo = body.activo;

  const artista = await prisma.artista.update({ where: { id }, data });
  return NextResponse.json({ artista });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.artista.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
