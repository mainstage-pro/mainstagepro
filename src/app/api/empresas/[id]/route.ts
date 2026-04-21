import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  const fields = ["nombre", "giro", "telefono", "correo", "sitioWeb", "notas", "datosFiscales", "cuentaBancaria", "tipo", "activo"];
  for (const f of fields) {
    if (f in body) data[f] = body[f] === "" ? null : body[f];
  }

  const empresa = await prisma.empresa.update({ where: { id }, data });
  return NextResponse.json({ empresa });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const [cxc, cxp] = await Promise.all([
    prisma.cuentaCobrar.count({ where: { empresaId: id } }),
    prisma.cuentaPagar.count({ where: { empresaId: id } }),
  ]);

  if (cxc > 0 || cxp > 0) {
    return NextResponse.json({ error: "La empresa tiene cuentas registradas. Desactívala en lugar de eliminarla." }, { status: 400 });
  }

  await prisma.empresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
