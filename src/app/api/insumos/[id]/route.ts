import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("nombre" in body) data.nombre = String(body.nombre).trim();
  if ("descripcion" in body) data.descripcion = body.descripcion || null;
  if ("usoPrincipal" in body) data.usoPrincipal = body.usoPrincipal || null;
  if ("porQueNecesario" in body) data.porQueNecesario = body.porQueNecesario || null;
  if ("categoria" in body) data.categoria = body.categoria || "GENERAL";
  if ("unidad" in body) data.unidad = body.unidad || "pieza";
  if ("minimo" in body) data.minimo = Number(body.minimo);
  if ("dondeSeCompra" in body) data.dondeSeCompra = body.dondeSeCompra || null;
  if ("costoAprox" in body) data.costoAprox = body.costoAprox === "" || body.costoAprox == null ? null : Number(body.costoAprox);
  if ("notas" in body) data.notas = body.notas || null;

  // Capturar una cantidad es "revisar": deja sello de quién y cuándo.
  if ("cantidadActual" in body) {
    data.cantidadActual = Number(body.cantidadActual);
    data.revisadoEn = new Date();
    data.revisadoPor = session.name;
  }

  const insumo = await prisma.insumo.update({ where: { id }, data });
  return NextResponse.json({ insumo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.insumo.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
