import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolverVariacion } from "@/lib/contenido-variaciones";

/**
 * Recalcula a qué variación pertenece cada publicación según el ciclo de su tipo.
 * Sin `mes` recorre todo el histórico; con `soloVacias` respeta las asignadas a mano.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { mes, tipoId, soloVacias } = await request.json().catch(() => ({}));

  const tipos = await prisma.tipoContenido.findMany({
    where: tipoId ? { id: tipoId } : {},
    include: { variaciones: { where: { activo: true } } },
  });

  const conVariaciones = tipos.filter(t => t.variaciones.length > 0);
  if (conVariaciones.length === 0) return NextResponse.json({ asignadas: 0 });

  const publicaciones = await prisma.publicacion.findMany({
    where: {
      tipoId: { in: conVariaciones.map(t => t.id) },
      ...(soloVacias ? { variacionId: null } : {}),
      ...(mes ? {
        fecha: {
          gte: new Date(`${mes}-01T00:00:00.000Z`),
          lt: new Date(new Date(`${mes}-01T00:00:00.000Z`).setUTCMonth(new Date(`${mes}-01T00:00:00.000Z`).getUTCMonth() + 1)),
        },
      } : {}),
    },
    select: { id: true, fecha: true, tipoId: true, variacionId: true },
  });

  const porTipo = new Map(conVariaciones.map(t => [t.id, t]));
  const cambios: { id: string; variacionId: string }[] = [];

  for (const p of publicaciones) {
    const tipo = porTipo.get(p.tipoId!);
    if (!tipo) continue;
    const v = resolverVariacion(p.fecha, tipo, tipo.variaciones);
    if (v && v.id !== p.variacionId) cambios.push({ id: p.id, variacionId: v.id });
  }

  for (let i = 0; i < cambios.length; i += 50) {
    await prisma.$transaction(cambios.slice(i, i + 50).map(c =>
      prisma.publicacion.update({ where: { id: c.id }, data: { variacionId: c.variacionId } })
    ));
  }

  return NextResponse.json({ asignadas: cambios.length });
}
