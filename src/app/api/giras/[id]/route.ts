import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ESTADOS_GIRA, TIPOS_REGISTRO, esGira, parseFechaGira } from "@/lib/giras";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    include: {
      artista: { select: { id: true, nombre: true, logoUrl: true, tipoFormacion: true, integrantesNum: true } },
      cliente: { select: { id: true, nombre: true, empresa: true } },
      contactoPrincipal: { select: { id: true, nombre: true, rol: true, telefono: true, email: true } },
      rider: {
        select: {
          id: true,
          nombre: true,
          version: true,
          esActivo: true,
          formacion: true,
          canalesMinimos: true,
          mixesMonitor: true,
          _count: { select: { lineas: true, canales: true } },
        },
      },
      shows: {
        orderBy: { fecha: "asc" },
        include: {
          venue: { select: { id: true, nombre: true, ciudad: true, estado: true, capacidadPersonas: true } },
          riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          _count: { select: { crew: true, momentos: true } },
        },
      },
    },
  });

  if (!gira) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  return NextResponse.json({ gira });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await prisma.gira.findUnique({
    where: { id },
    select: { id: true, estado: true, nombre: true, tipo: true, _count: { select: { shows: true } } },
  });
  if (!existente) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.tipo === "string") {
    if (!TIPOS_REGISTRO.includes(body.tipo as (typeof TIPOS_REGISTRO)[number])) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    // Un show suelto es de una sola fecha: pasar a show una gira con varias
    // escondería shows que ya existen.
    if (!esGira(body.tipo) && existente._count.shows > 1) {
      return NextResponse.json(
        { error: "Esta gira tiene varios shows. Déjala como gira o borra los shows que sobran." },
        { status: 400 },
      );
    }
    data.tipo = body.tipo;
  }

  if (typeof body.nombre === "string") {
    if (!body.nombre.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    data.nombre = body.nombre.trim();
  }
  if (typeof body.estado === "string") {
    if (!ESTADOS_GIRA.includes(body.estado as (typeof ESTADOS_GIRA)[number])) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    data.estado = body.estado;
  }
  if ("fechaInicio" in body) data.fechaInicio = parseFechaGira(body.fechaInicio);
  if ("fechaFin" in body) data.fechaFin = parseFechaGira(body.fechaFin);
  if ("artistaId" in body && typeof body.artistaId === "string" && body.artistaId) data.artistaId = body.artistaId;
  if ("clienteId" in body) data.clienteId = body.clienteId || null;
  if ("tratoId" in body) data.tratoId = body.tratoId || null;
  if ("riderId" in body) data.riderId = body.riderId || null;
  if ("contactoPrincipalId" in body) data.contactoPrincipalId = body.contactoPrincipalId || null;
  if ("rolMainstage" in body) {
    data.rolMainstage = Array.isArray(body.rolMainstage)
      ? body.rolMainstage.length
        ? JSON.stringify(body.rolMainstage)
        : null
      : body.rolMainstage || null;
  }
  if (typeof body.moneda === "string" && body.moneda) data.moneda = body.moneda;
  if ("notas" in body) data.notas = typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null;
  if (typeof body.activo === "boolean") data.activo = body.activo;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  const gira = await prisma.gira.update({ where: { id }, data });

  if (data.estado && data.estado !== existente.estado) {
    await logActividad(
      session.id,
      "ACTUALIZAR",
      "Gira",
      id,
      `Movió ${esGira(gira.tipo) ? "la gira" : "el show"} ${gira.nombre} a ${String(data.estado)}`,
      { antes: existente.estado, despues: data.estado },
    );
  }

  return NextResponse.json({ gira });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await prisma.gira.findUnique({ where: { id }, select: { nombre: true, tipo: true } });
  if (!existente) return NextResponse.json({ error: "El show o la gira no existe" }, { status: 404 });

  await prisma.gira.update({ where: { id }, data: { activo: false } });
  await logActividad(session.id, "ELIMINAR", "Gira", id, `Archivó ${esGira(existente.tipo) ? "la gira" : "el show"} ${existente.nombre}`);

  return NextResponse.json({ ok: true });
}
