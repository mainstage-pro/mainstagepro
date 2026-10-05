import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; varianteId: string }> };

/**
 * Edita una variante y, en la misma llamada, las dos cosas que no son campos:
 * subir de revisión (deja asiento de qué cambió) y anotar a quién se le entregó.
 * Van aquí porque siempre ocurren sobre una variante concreta y porque el que
 * sube la revisión suele acto seguido reenviarla.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, varianteId } = await params;
  const variante = await prisma.sitePlanVariante.findFirst({ where: { id: varianteId, planId: id } });
  if (!variante) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = (await req.json()) as {
    nombre?: string;
    estado?: string;
    notas?: string | null;
    capasIds?: string[] | null;
    soloElectrico?: boolean;
    soloEmergencia?: boolean;
    revisionNueva?: { descripcion: string };
    emisionNueva?: { destinatario: string; organizacion?: string; medio?: string; notas?: string };
    emisionBorrar?: string;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
  if (typeof body.estado === "string") data.estado = body.estado;
  if (body.notas !== undefined) data.notas = body.notas;
  if (body.capasIds !== undefined) data.capasIds = body.capasIds?.length ? JSON.stringify(body.capasIds) : null;
  if (typeof body.soloElectrico === "boolean") data.soloElectrico = body.soloElectrico;
  if (typeof body.soloEmergencia === "boolean") data.soloEmergencia = body.soloEmergencia;

  if (body.revisionNueva?.descripcion?.trim()) {
    const numero = variante.revision + 1;
    data.revision = numero;
    // Subir de revisión es emitir: un plano que cambió y se quedó en borrador no
    // le sirve a nadie, y el estado es lo que el pie del PDF imprime.
    if (variante.estado === "BORRADOR") data.estado = "EMITIDO";
    await prisma.sitePlanRevision.create({
      data: {
        varianteId,
        numero,
        descripcion: body.revisionNueva.descripcion.trim(),
        autor: session.name ?? session.email ?? null,
      },
    });
  }

  if (body.emisionNueva?.destinatario?.trim()) {
    await prisma.sitePlanEmision.create({
      data: {
        varianteId,
        revision: (data.revision as number | undefined) ?? variante.revision,
        destinatario: body.emisionNueva.destinatario.trim(),
        organizacion: body.emisionNueva.organizacion?.trim() || null,
        medio: body.emisionNueva.medio || null,
        notas: body.emisionNueva.notas?.trim() || null,
      },
    });
  }

  if (body.emisionBorrar) {
    await prisma.sitePlanEmision.deleteMany({ where: { id: body.emisionBorrar, varianteId } });
  }

  if (Object.keys(data).length) await prisma.sitePlanVariante.update({ where: { id: varianteId }, data });

  const fresca = await prisma.sitePlanVariante.findUnique({
    where: { id: varianteId },
    include: {
      revisiones: { orderBy: { numero: "desc" } },
      emisiones: { orderBy: { fecha: "desc" } },
    },
  });
  return NextResponse.json(fresca);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, varianteId } = await params;
  await prisma.sitePlanVariante.updateMany({ where: { id: varianteId, planId: id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
