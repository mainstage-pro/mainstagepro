import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const {
    nombre, objetivo, objetivoMeta, formato, recurrencia, canal,
    duracionDias, presupuestoEstimado,
    publicoEdadMin, publicoEdadMax, publicoGenero, ubicaciones,
    cta, copyReferencia, pixelEvento,
    descripcion, color, activo, orden,
  } = body;
  const tipo = await prisma.tipoCampana.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(objetivo !== undefined && { objetivo }),
      ...(objetivoMeta !== undefined && { objetivoMeta }),
      ...(formato !== undefined && { formato }),
      ...(recurrencia !== undefined && { recurrencia }),
      ...(canal !== undefined && { canal }),
      ...(duracionDias !== undefined && { duracionDias: parseInt(duracionDias) }),
      ...(presupuestoEstimado !== undefined && { presupuestoEstimado: presupuestoEstimado ? parseFloat(presupuestoEstimado) : null }),
      ...(publicoEdadMin !== undefined && { publicoEdadMin: parseInt(publicoEdadMin) }),
      ...(publicoEdadMax !== undefined && { publicoEdadMax: parseInt(publicoEdadMax) }),
      ...(publicoGenero !== undefined && { publicoGenero }),
      ...(ubicaciones !== undefined && { ubicaciones }),
      ...(cta !== undefined && { cta }),
      ...(copyReferencia !== undefined && { copyReferencia: copyReferencia || null }),
      ...(pixelEvento !== undefined && { pixelEvento: pixelEvento || null }),
      ...(descripcion !== undefined && { descripcion: descripcion || null }),
      ...(color !== undefined && { color }),
      ...(activo !== undefined && { activo }),
      ...(orden !== undefined && { orden }),
    },
  });
  return NextResponse.json({ tipo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.ejecucionCampana.updateMany({ where: { tipoId: id }, data: { tipoId: null } });
  await prisma.tipoCampana.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
