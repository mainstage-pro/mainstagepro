import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { esRetornoAServicio, registrarCostoMantenimiento } from "@/lib/mantenimiento-costo";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const equipoId = searchParams.get("equipoId");
  const tipo = searchParams.get("tipo");

  const where: Record<string, unknown> = {};
  if (equipoId) where.equipoId = equipoId;
  if (tipo) where.tipo = tipo;

  const registros = await prisma.mantenimientoEquipo.findMany({
    where,
    include: {
      equipo: {
        select: {
          id: true,
          descripcion: true,
          marca: true,
          modelo: true,
          estado: true,
          categoria: { select: { nombre: true } },
        },
      },
      unidad: { select: { id: true, codigo: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ registros });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { equipoId, unidadId, fecha, tipo, accionRealizada, estadoEquipo, comentarios, proximoMantenimiento, fotoEvidencia, costo } = body;

  if (!equipoId || !fecha || !tipo || !accionRealizada) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Actualizar estado del equipo o de la unidad específica
  let estadoAnterior: string | null = null;
  let equipoDescripcion = "";
  let unidadCodigo: string | null = null;
  if (estadoEquipo) {
    if (unidadId) {
      const previa = await prisma.equipoUnidad.findUnique({
        where: { id: unidadId },
        select: { estado: true, codigo: true, equipo: { select: { descripcion: true } } },
      });
      estadoAnterior = previa?.estado ?? null;
      equipoDescripcion = previa?.equipo.descripcion ?? "";
      unidadCodigo = previa?.codigo ?? null;
      await prisma.equipoUnidad.update({ where: { id: unidadId }, data: { estado: estadoEquipo } });
    } else {
      const previo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { estado: true, descripcion: true } });
      estadoAnterior = previo?.estado ?? null;
      equipoDescripcion = previo?.descripcion ?? "";
      await prisma.equipo.update({ where: { id: equipoId }, data: { estado: estadoEquipo } });
    }
  }

  const registro = await prisma.mantenimientoEquipo.create({
    data: {
      equipoId,
      unidadId: unidadId || null,
      fecha: new Date(fecha),
      tipo,
      accionRealizada,
      estadoEquipo: estadoEquipo ?? null,
      comentarios: comentarios ?? null,
      proximoMantenimiento: proximoMantenimiento ? new Date(proximoMantenimiento) : null,
      fotoEvidencia: fotoEvidencia ?? null,
      costoReparacion: costo?.hubo && costo?.monto ? parseFloat(String(costo.monto)) : null,
      descripcionReparacion: costo?.hubo ? (costo?.descripcion?.trim() || null) : null,
    },
    include: {
      equipo: {
        select: {
          id: true,
          descripcion: true,
          marca: true,
          modelo: true,
          estado: true,
          categoria: { select: { nombre: true } },
        },
      },
      unidad: { select: { id: true, codigo: true } },
    },
  });

  if (estadoAnterior && estadoEquipo && esRetornoAServicio(estadoAnterior, estadoEquipo)) {
    await registrarCostoMantenimiento({
      costo,
      estadoAnterior,
      equipoDescripcion,
      unidadCodigo,
    });
  }

  return NextResponse.json({ registro });
}
