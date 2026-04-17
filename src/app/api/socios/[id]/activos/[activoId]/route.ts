import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; activoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { activoId } = await params;
  const body = await req.json();

  const activo = await prisma.socioActivo.update({
    where: { id: activoId },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.marca !== undefined && { marca: body.marca || null }),
      ...(body.modelo !== undefined && { modelo: body.modelo || null }),
      ...(body.serial !== undefined && { serial: body.serial || null }),
      ...(body.categoria !== undefined && { categoria: body.categoria }),
      ...(body.condicion !== undefined && { condicion: body.condicion }),
      ...(body.valorDeclarado !== undefined && { valorDeclarado: parseFloat(body.valorDeclarado) }),
      ...(body.precioDia !== undefined && { precioDia: parseFloat(body.precioDia) }),
      ...(body.pctSocioOverride !== undefined && { pctSocioOverride: body.pctSocioOverride !== "" ? parseFloat(body.pctSocioOverride) : null }),
      ...(body.pctMainstageOverride !== undefined && { pctMainstageOverride: body.pctMainstageOverride !== "" ? parseFloat(body.pctMainstageOverride) : null }),
      ...(body.fotosUrls !== undefined && { fotosUrls: JSON.stringify(body.fotosUrls) }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
    },
  });

  return NextResponse.json({ activo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; activoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { activoId } = await params;
  await prisma.socioActivo.update({ where: { id: activoId }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
