import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = ["nombre", "giro", "telefono", "correo", "notas", "rfc", "cuentaBancaria", "clabe", "banco", "noTarjeta", "datosFiscales", "activo"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] ?? null;
  }

  // Handle empresa: accept empresaId (FK) or plain empresa name
  if ("empresaId" in body) {
    const newId: string | null = body.empresaId || null;
    data.empresaId = newId;
    if (newId) {
      const emp = await prisma.empresa.findUnique({ where: { id: newId }, select: { nombre: true } });
      data.empresa = emp?.nombre ?? null;
    } else {
      data.empresa = null;
    }
  } else if ("empresa" in body) {
    const nombre: string | null = body.empresa || null;
    if (nombre) {
      let emp = await prisma.empresa.findFirst({
        where: { nombre: { equals: nombre, mode: "insensitive" }, activo: true },
      });
      if (!emp) {
        emp = await prisma.empresa.create({ data: { nombre, tipo: "PROVEEDOR" } });
      }
      data.empresa = emp.nombre;
      data.empresaId = emp.id;
    } else {
      data.empresa = null;
      data.empresaId = null;
    }
  }

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data,
    include: { compania: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json({ proveedor });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.proveedor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
