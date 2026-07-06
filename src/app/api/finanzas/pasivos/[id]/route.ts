import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const pasivo = await prisma.pasivoDeuda.findUnique({
    where: { id },
    include: {
      proveedor: { select: { id: true, nombre: true } },
      cuotas: { orderBy: { numeroCuota: "asc" } },
    },
  });
  if (!pasivo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ pasivo });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const pasivo = await prisma.pasivoDeuda.update({
    where: { id },
    data: {
      nombre: body.nombre,
      proveedorId: body.proveedorId || null,
      acreedorNombre: body.acreedorNombre || null,
      descripcion: body.descripcion || null,
      montoTotal: body.montoTotal ? parseFloat(body.montoTotal) : undefined,
      categoria: body.categoria,
      estado: body.estado,
      tasaInteres: body.tasaInteres ? parseFloat(body.tasaInteres) : null,
      notas: body.notas || null,
    },
    include: { proveedor: { select: { id: true, nombre: true } }, cuotas: true },
  });
  return NextResponse.json({ pasivo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.pasivoDeuda.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
