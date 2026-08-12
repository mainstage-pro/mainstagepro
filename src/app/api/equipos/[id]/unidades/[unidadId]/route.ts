import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureObservacionesTable } from "./observaciones/route";
import { esRetornoAServicio, registrarCostoMantenimiento } from "@/lib/mantenimiento-costo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; unidadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureObservacionesTable();
  const { unidadId } = await params;
  const [mantenimientos, observaciones] = await Promise.all([
    prisma.mantenimientoEquipo.findMany({
      where: { unidadId },
      orderBy: { fecha: "desc" },
      select: {
        id: true, fecha: true, tipo: true, accionRealizada: true,
        comentarios: true, proximoMantenimiento: true, costoReparacion: true,
      },
    }),
    prisma.unidadObservacion.findMany({
      where: { unidadId },
      include: { creadoPor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const costoMantenimiento = mantenimientos.reduce((s, m) => s + (m.costoReparacion ?? 0), 0);
  return NextResponse.json({ mantenimientos, observaciones, costoMantenimiento });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unidadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { unidadId } = await params;
  const body = await request.json();
  const allowed = ["codigo", "estado", "voltaje", "notas", "activo"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] === "" ? null : body[key];
  }

  // Estado previo, para detectar retorno a servicio y registrar el costo.
  const previa = "estado" in data
    ? await prisma.equipoUnidad.findUnique({
        where: { id: unidadId },
        select: { estado: true, codigo: true, equipo: { select: { descripcion: true } } },
      })
    : null;

  const unidad = await prisma.equipoUnidad.update({
    where: { id: unidadId },
    data,
    include: {
      _count: { select: { mantenimientos: true } },
      mantenimientos: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true, proximoMantenimiento: true, tipo: true } },
    },
  });

  if (previa && esRetornoAServicio(previa.estado, String(data.estado))) {
    await registrarCostoMantenimiento({
      costo: body.costo,
      estadoAnterior: previa.estado,
      equipoDescripcion: previa.equipo.descripcion,
      unidadCodigo: previa.codigo,
    });
  }

  return NextResponse.json({ unidad });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; unidadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, unidadId } = await params;
  await prisma.equipoUnidad.delete({ where: { id: unidadId } });
  
  await prisma.equipo.update({
    where: { id },
    data: { cantidadTotal: { decrement: 1 } }
  });

  return NextResponse.json({ ok: true });
}
