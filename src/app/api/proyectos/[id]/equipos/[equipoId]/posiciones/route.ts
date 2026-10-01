import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type PosicionInput = {
  cantidad?: number;
  funcion?: string | null;
  soporte?: string | null;
  zona?: string | null;
  alturaM?: number | string | null;
  notas?: string | null;
};

/** Reemplaza todas las posiciones de un equipo del proyecto. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { equipoId } = await params;
  const body = await req.json();
  const entrada: PosicionInput[] = Array.isArray(body.posiciones) ? body.posiciones : [];

  const posiciones = entrada.map((p, i) => ({
    proyectoEquipoId: equipoId,
    cantidad: Math.max(1, Number(p.cantidad) || 1),
    funcion: p.funcion || null,
    soporte: p.soporte || null,
    zona: p.zona || null,
    alturaM: p.alturaM != null && p.alturaM !== "" ? Number(p.alturaM) : null,
    notas: p.notas || null,
    orden: i,
  }));

  await prisma.$transaction([
    prisma.proyectoEquipoPosicion.deleteMany({ where: { proyectoEquipoId: equipoId } }),
    ...(posiciones.length > 0 ? [prisma.proyectoEquipoPosicion.createMany({ data: posiciones })] : []),
  ]);

  const items = await prisma.proyectoEquipoPosicion.findMany({
    where: { proyectoEquipoId: equipoId },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ posiciones: items });
}

/**
 * Edita UNA posición sin tocar las demás. El PUT recrea todas las filas con ids
 * nuevos y eso rompería las piezas del layout, que guardan el id de la posición
 * que dibujan; desde el plano siempre se edita por aquí.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, equipoId } = await params;
  const body = await req.json();
  const posicionId = String(body.posicionId ?? "");
  if (!posicionId) return NextResponse.json({ error: "Falta la posición" }, { status: 400 });

  const dueño = await prisma.proyectoEquipo.findFirst({ where: { id: equipoId, proyectoId: id }, select: { id: true } });
  if (!dueño) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("cantidad" in body) data.cantidad = Math.max(1, Number(body.cantidad) || 1);
  for (const campo of ["funcion", "soporte", "zona", "notas"]) {
    if (campo in body) data[campo] = body[campo] || null;
  }
  if ("alturaM" in body) data.alturaM = body.alturaM != null && body.alturaM !== "" ? Number(body.alturaM) : null;

  const { count } = await prisma.proyectoEquipoPosicion.updateMany({
    where: { id: posicionId, proyectoEquipoId: equipoId },
    data,
  });
  if (!count) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const posicion = await prisma.proyectoEquipoPosicion.findUnique({ where: { id: posicionId } });
  return NextResponse.json({ posicion });
}

/** Agrega una posición suelta: es como el equipo sin desglose entra a una zona. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; equipoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, equipoId } = await params;
  const dueño = await prisma.proyectoEquipo.findFirst({
    where: { id: equipoId, proyectoId: id },
    select: { id: true, cantidad: true, _count: { select: { posiciones: true } } },
  });
  if (!dueño) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const posicion = await prisma.proyectoEquipoPosicion.create({
    data: {
      proyectoEquipoId: equipoId,
      cantidad: Math.max(1, Number(body.cantidad) || dueño.cantidad),
      funcion: body.funcion || null,
      soporte: body.soporte || null,
      zona: body.zona || null,
      alturaM: body.alturaM != null && body.alturaM !== "" ? Number(body.alturaM) : null,
      notas: body.notas || null,
      orden: dueño._count.posiciones,
    },
  });
  return NextResponse.json({ posicion });
}
