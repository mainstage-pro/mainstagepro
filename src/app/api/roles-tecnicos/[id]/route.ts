import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "nombre", "tipoPago", "descripcion", "activo", "orden",
    "tarifaAAACorta", "tarifaAAAMedia", "tarifaAAALarga",
    "tarifaAACorta", "tarifaAAMedia", "tarifaAALarga",
    "tarifaACorta", "tarifaAMedia", "tarifaALarga",
    "tarifaPlanaAAA", "tarifaPlanaAA", "tarifaPlanaA",
    "tarifaHoraAAA", "tarifaHoraAA", "tarifaHoraA",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const numFields = [
        "tarifaAAACorta","tarifaAAAMedia","tarifaAAALarga",
        "tarifaAACorta","tarifaAAMedia","tarifaAALarga",
        "tarifaACorta","tarifaAMedia","tarifaALarga",
        "tarifaPlanaAAA","tarifaPlanaAA","tarifaPlanaA",
        "tarifaHoraAAA","tarifaHoraAA","tarifaHoraA",
      ];
      if (numFields.includes(key)) {
        data[key] = body[key] !== null && body[key] !== "" ? parseFloat(body[key]) : null;
      } else {
        data[key] = body[key];
      }
    }
  }

  const rol = await prisma.rolTecnico.update({ where: { id }, data });
  return NextResponse.json({ rol });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.rolTecnico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
