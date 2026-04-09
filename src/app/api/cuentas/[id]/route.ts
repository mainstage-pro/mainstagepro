import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  const fields = ["nombre", "banco", "numeroCuenta", "clabe", "titular", "rfc", "activa"];
  for (const f of fields) {
    if (f in body) data[f] = body[f] === "" ? null : body[f];
  }

  const cuenta = await prisma.cuentaBancaria.update({ where: { id }, data });
  return NextResponse.json({ cuenta });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.cuentaBancaria.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
