import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const socio = await prisma.socio.findUnique({
    where: { id },
    include: {
      checklist: { orderBy: { orden: "asc" } },
      activos: {
        where: { activo: true },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { rentas: true, mantenimientos: true } } },
      },
      reportes: { orderBy: [{ anio: "desc" }, { mes: "desc" }] },
    },
  });

  if (!socio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ socio });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const socio = await prisma.socio.update({
    where: { id },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.tipo !== undefined && { tipo: body.tipo }),
      ...(body.rfc !== undefined && { rfc: body.rfc || null }),
      ...(body.curp !== undefined && { curp: body.curp || null }),
      ...(body.telefono !== undefined && { telefono: body.telefono || null }),
      ...(body.email !== undefined && { email: body.email || null }),
      ...(body.domicilio !== undefined && { domicilio: body.domicilio || null }),
      ...(body.colonia !== undefined && { colonia: body.colonia || null }),
      ...(body.ciudad !== undefined && { ciudad: body.ciudad || null }),
      ...(body.estado !== undefined && { estado: body.estado || null }),
      ...(body.cp !== undefined && { cp: body.cp || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
      ...(body.pctSocio !== undefined && { pctSocio: parseFloat(body.pctSocio) }),
      ...(body.pctMainstage !== undefined && { pctMainstage: parseFloat(body.pctMainstage) }),
      ...(body.contratoInicio !== undefined && { contratoInicio: body.contratoInicio ? new Date(body.contratoInicio) : null }),
      ...(body.contratoFin !== undefined && { contratoFin: body.contratoFin ? new Date(body.contratoFin) : null }),
    },
  });

  return NextResponse.json({ socio });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.socio.update({ where: { id }, data: { status: "INACTIVO" } });
  return NextResponse.json({ ok: true });
}
