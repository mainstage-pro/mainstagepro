import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface RigEntrante {
  id?: string | null;
  nombre?: string | null;
  equipo?: string | null;
  cadena?: string | null;
  conexion?: string | null;
  notas?: string | null;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const rigs = await prisma.artistaRiderRig.findMany({ where: { riderId }, orderBy: { orden: "asc" } });
  return NextResponse.json({ rigs });
}

/// Guardado completo del bloque en un viaje, igual que las listas de canales.
/// Borrar un rig deja sus canales sin rig (onDelete: SetNull), no los borra: el
/// canal sigue entrando a la consola aunque ya no se sepa por dónde pasó antes.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.rigs)) {
    return NextResponse.json({ error: "rigs debe ser un arreglo" }, { status: 400 });
  }

  const rider = await prisma.artistaRider.findUnique({ where: { id: riderId }, select: { id: true } });
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const idsVivos = new Set(
    (await prisma.artistaRiderRig.findMany({ where: { riderId }, select: { id: true } })).map((r) => r.id),
  );

  // El rig sin nombre no existe: es un renglón que se abrió y no se llenó.
  const entrantes = (body.rigs as RigEntrante[])
    .map((r, i) => ({
      id: r.id && idsVivos.has(r.id) ? r.id : null,
      datos: {
        nombre: texto(r.nombre) ?? "",
        equipo: texto(r.equipo),
        cadena: texto(r.cadena),
        conexion: texto(r.conexion),
        notas: texto(r.notas),
        orden: i,
      },
    }))
    .filter((e) => e.datos.nombre);

  const conservados = entrantes.map((e) => e.id).filter((id): id is string => !!id);

  await prisma.$transaction(async (tx) => {
    await tx.artistaRiderRig.deleteMany({
      where: { riderId, ...(conservados.length ? { id: { notIn: conservados } } : {}) },
    });
    for (const e of entrantes) {
      if (e.id) await tx.artistaRiderRig.update({ where: { id: e.id }, data: e.datos });
      else await tx.artistaRiderRig.create({ data: { ...e.datos, riderId } });
    }
  });

  const rigs = await prisma.artistaRiderRig.findMany({ where: { riderId }, orderBy: { orden: "asc" } });
  return NextResponse.json({ rigs });
}
