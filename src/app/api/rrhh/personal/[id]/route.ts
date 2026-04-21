import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const persona = await prisma.personalInterno.findUnique({
    where: { id },
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      pagos: {
        orderBy: { createdAt: "desc" },
        include: { cuentaOrigen: { select: { nombre: true } } },
      },
    },
  });

  if (!persona) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ persona });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["nombre", "puesto", "departamento", "tipo", "telefono", "correo", "salario", "periodoPago", "fechaIngreso", "activo", "cuentaBancaria", "datosFiscales", "notas", "banco", "clabe", "numeroCuenta", "numeroTarjeta", "ineUrl", "domicilio", "emergenciaNombre", "emergenciaTel", "padecimientos"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "fechaIngreso") data[k] = body[k] ? new Date(body[k]) : null;
      else if (k === "salario") data[k] = body[k] ? parseFloat(body[k]) : null;
      else data[k] = body[k] === "" ? null : body[k];
    }
  }

  const persona = await prisma.personalInterno.update({ where: { id }, data });
  return NextResponse.json({ persona });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.personalInterno.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
