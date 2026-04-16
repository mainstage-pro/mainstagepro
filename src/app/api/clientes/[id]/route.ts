import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      tratos: {
        select: { id: true, etapa: true, tipoEvento: true, fechaEventoEstimada: true, presupuestoEstimado: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      cotizaciones: {
        select: { id: true, numeroCotizacion: true, estado: true, granTotal: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      proyectos: {
        select: { id: true, numeroProyecto: true, nombre: true, estado: true, fechaEvento: true },
        orderBy: { fechaEvento: "desc" },
      },
    },
  });

  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ cliente });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;

  // Verificar que no tenga proyectos activos
  const activos = await prisma.proyecto.count({
    where: { clienteId: id, estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] } },
  });
  if (activos > 0) {
    return NextResponse.json({ error: `El cliente tiene ${activos} proyecto(s) activo(s). Ciérralos antes de eliminar.` }, { status: 409 });
  }

  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = ["nombre", "empresa", "tipoCliente", "clasificacion", "servicioUsual", "telefono", "correo", "notas"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] || null;
  }

  const cliente = await prisma.cliente.update({ where: { id }, data });
  return NextResponse.json({ cliente });
}
