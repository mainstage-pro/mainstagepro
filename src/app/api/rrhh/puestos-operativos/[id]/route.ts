import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const arr = (v: unknown) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const puesto = await prisma.puesto.findUnique({
    where: { id },
    include: {
      reportaA: { select: { id: true, nombre: true } },
      subordinados: { select: { id: true, nombre: true } },
      puestoIdeal: { select: { id: true, titulo: true } },
      ocupantes: { select: { id: true, nombre: true, userId: true }, where: { activo: true } },
    },
  });
  if (!puesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ puesto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.nombre !== undefined) data.nombre = b.nombre;
    if (b.area !== undefined) data.area = b.area || "GENERAL";
    if (b.objetivoArea !== undefined) data.objetivoArea = b.objetivoArea || null;
    if (b.misionPuesto !== undefined) data.misionPuesto = b.misionPuesto || null;
    if (b.responsabilidades !== undefined) data.responsabilidades = arr(b.responsabilidades);
    if (b.reportaAId !== undefined) data.reportaAId = b.reportaAId || null;
    if (b.coordinaCon !== undefined) data.coordinaCon = arr(b.coordinaCon);
    if (b.supervisaA !== undefined) data.supervisaA = arr(b.supervisaA);
    if (b.estandares !== undefined) data.estandares = arr(b.estandares);
    if (b.puestoIdealId !== undefined) data.puestoIdealId = b.puestoIdealId || null;
    if (b.color !== undefined) data.color = b.color || null;
    if (b.activo !== undefined) data.activo = b.activo;
    data.updatedAt = new Date();

    const puesto = await prisma.puesto.update({ where: { id }, data });

    // Reasignar titulares (ocupantes) si viene el arreglo de IDs de personal
    if (Array.isArray(b.ocupantesIds)) {
      await prisma.personalInterno.updateMany({ where: { puestoId: id }, data: { puestoId: null } });
      if (b.ocupantesIds.length) {
        await prisma.personalInterno.updateMany({
          where: { id: { in: b.ocupantesIds } },
          data: { puestoId: id },
        });
      }
    }

    return NextResponse.json({ puesto });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos-operativos PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.personalInterno.updateMany({ where: { puestoId: id }, data: { puestoId: null } });
    await prisma.puesto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos-operativos DELETE]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
