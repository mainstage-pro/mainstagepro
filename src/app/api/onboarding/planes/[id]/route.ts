import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  try {
    const plan = await prisma.onboardingPlan.findUnique({
      where: { id },
      include: {
        modulos: {
          include: { tareas: { orderBy: { orden: "asc" } } },
          orderBy: { orden: "asc" },
        },
        postulacion: {
          select: {
            id: true, puestoManual: true, areaManual: true,
            candidato: { select: { nombre: true, correo: true, telefono: true } },
            puesto: { select: { titulo: true, descripcion: true } },
          },
        },
      },
    });
    if (!plan) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  try {
    const plan = await prisma.onboardingPlan.update({
      where: { id },
      data: {
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.notas !== undefined && { notas: body.notas }),
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.fechaIngreso !== undefined && { fechaIngreso: body.fechaIngreso ? new Date(body.fechaIngreso) : null }),
      },
    });
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  try {
    await prisma.onboardingPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
