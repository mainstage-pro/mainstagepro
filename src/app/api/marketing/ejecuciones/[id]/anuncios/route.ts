import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCampanaBriefColumns } from "@/lib/campana-brief-db";

// Anuncios (creativos) de una campaña unificada.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  const { id } = await params;
  const body = await req.json();
  if (!body.nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const anuncio = await prisma.anuncioCampana.create({
    data: {
      ejecucionId: id,
      nombre: body.nombre.trim(),
      formato: body.formato || "IMAGEN",
      titular: body.titular || null,
      copy: body.copy || null,
      cta: body.cta || null,
      urlDestino: body.urlDestino || null,
      estado: body.estado || "ACTIVO",
    },
  });
  return NextResponse.json({ anuncio }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  const { id } = await params;
  const body = await req.json();
  const { anuncioId, ...data } = body;
  if (!anuncioId) return NextResponse.json({ error: "anuncioId requerido" }, { status: 400 });
  const anuncio = await prisma.anuncioCampana.update({
    where: { id: anuncioId, ejecucionId: id },
    data: {
      ...(data.nombre !== undefined && { nombre: String(data.nombre).trim() }),
      ...(data.formato !== undefined && { formato: data.formato }),
      ...(data.titular !== undefined && { titular: data.titular || null }),
      ...(data.copy !== undefined && { copy: data.copy || null }),
      ...(data.cta !== undefined && { cta: data.cta || null }),
      ...(data.urlDestino !== undefined && { urlDestino: data.urlDestino || null }),
      ...(data.estado !== undefined && { estado: data.estado }),
    },
  });
  return NextResponse.json({ anuncio });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const { anuncioId } = await req.json();
  if (!anuncioId) return NextResponse.json({ error: "anuncioId requerido" }, { status: 400 });
  await prisma.anuncioCampana.deleteMany({ where: { id: anuncioId, ejecucionId: id } });
  return NextResponse.json({ ok: true });
}
