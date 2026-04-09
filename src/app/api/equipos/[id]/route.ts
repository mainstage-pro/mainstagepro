import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "descripcion", "marca", "modelo", "tipo", "precioRenta", "costoProveedor",
    "cantidadTotal", "proveedorDefaultId", "notas", "activo", "estado",
    "categoriaId", "subcategoria",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (["precioRenta", "costoProveedor"].includes(key)) {
        data[key] = body[key] !== null && body[key] !== "" ? parseFloat(body[key]) : null;
      } else if (key === "cantidadTotal") {
        data[key] = body[key] !== null && body[key] !== "" ? parseInt(body[key]) : 1;
      } else {
        data[key] = body[key] ?? null;
      }
    }
  }

  const equipo = await prisma.equipo.update({
    where: { id },
    data,
    include: {
      categoria: { select: { id: true, nombre: true } },
      proveedorDefault: { select: { id: true, nombre: true } },
    },
  });
  return NextResponse.json({ equipo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.equipo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
