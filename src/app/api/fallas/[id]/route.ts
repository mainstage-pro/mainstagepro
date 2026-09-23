import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ESTADOS_FALLA,
  ESTADOS_FALLA_CERRADA,
  ORIGENES_FALLA,
  SEVERIDADES_FALLA,
} from "@/lib/falla-equipo";

const INCLUDE = {
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
  unidad: { select: { id: true, codigo: true, estado: true } },
  proyecto: { select: { id: true, numeroProyecto: true, nombre: true, fechaEvento: true } },
  reportadoPor: { select: { id: true, name: true } },
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.estado !== undefined) {
    if (!ESTADOS_FALLA.includes(body.estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    data.estado = body.estado;
    data.resueltaEn = ESTADOS_FALLA_CERRADA.includes(body.estado) ? new Date() : null;
  }
  if (body.severidad !== undefined) {
    if (!SEVERIDADES_FALLA.includes(body.severidad)) {
      return NextResponse.json({ error: "Severidad inválida" }, { status: 400 });
    }
    data.severidad = body.severidad;
  }
  if (body.origen !== undefined) {
    if (!ORIGENES_FALLA.includes(body.origen)) {
      return NextResponse.json({ error: "Origen inválido" }, { status: 400 });
    }
    data.origen = body.origen;
    if (body.origen !== "EVENTO") data.proyectoId = null;
  }
  if (body.descripcion !== undefined) {
    if (!body.descripcion?.trim()) return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });
    data.descripcion = body.descripcion.trim();
  }
  if (body.fecha !== undefined) data.fecha = new Date(body.fecha);
  if (body.notaCierre !== undefined) data.notaCierre = body.notaCierre?.trim() || null;
  if (body.proyectoId !== undefined && data.proyectoId === undefined) data.proyectoId = body.proyectoId || null;
  if (body.fotoEvidencia !== undefined) data.fotoEvidencia = body.fotoEvidencia || null;

  const falla = await prisma.fallaEquipo.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({ falla });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.fallaEquipo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
