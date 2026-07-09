import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCampanaBriefColumns } from "@/lib/campana-brief-db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCampanaBriefColumns();
  const { id } = await params;
  const body = await request.json();
  const {
    nombre, objetivo, objetivoMeta, formato, recurrencia, canal,
    duracionDias, presupuestoEstimado,
    publicoEdadMin, publicoEdadMax, publicoGenero, ubicaciones,
    cta, copyReferencia, pixelEvento,
    descripcion, grupo, color, activo, orden,
    categoria, vigenciaDesde, vigenciaHasta, briefTemplate,
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
      ...(grupo !== undefined && { grupo: grupo || null }),
      ...(color !== undefined && { color }),
      ...(categoria !== undefined && { categoria: categoria === "eventual" ? "eventual" : "base" }),
      ...(vigenciaDesde !== undefined && { vigenciaDesde: vigenciaDesde ? new Date(vigenciaDesde) : null }),
      ...(vigenciaHasta !== undefined && { vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta) : null }),
      ...(briefTemplate !== undefined && { briefTemplate: briefTemplate || null }),
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
