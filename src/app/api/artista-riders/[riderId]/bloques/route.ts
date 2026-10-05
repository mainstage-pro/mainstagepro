import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_BLOQUE } from "@/lib/giras";

interface BloqueEntrante {
  id?: string | null;
  titulo?: string | null;
  tipo?: string | null;
  duracionMin?: number | string | null;
  responsable?: string | null;
  contenido?: string | null;
  orden?: number | string | null;
}

interface BloqueDatos {
  titulo: string;
  tipo: string;
  duracionMin: number | null;
  responsable: string | null;
  contenido: string | null;
  orden: number;
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

  const bloques = await prisma.artistaRiderBloque.findMany({
    where: { riderId },
    orderBy: [{ orden: "asc" }],
  });

  return NextResponse.json({ bloques });
}

/// Guardado completo, igual que el resto de las listas del rider: una sola
/// superficie editable, un solo Guardar, y lo que se quitó se borra.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.bloques)) {
    return NextResponse.json({ error: "bloques debe ser un arreglo" }, { status: 400 });
  }

  const rider = await prisma.artistaRider.findUnique({ where: { id: riderId }, select: { id: true } });
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const entrantes = (body.bloques as BloqueEntrante[])
    .map((b, i): { id: string | null; datos: BloqueDatos } | null => {
      const titulo = texto(b.titulo);
      if (!titulo) return null;
      const duracion = Number(b.duracionMin);
      const orden = Number(b.orden);
      return {
        id: b.id || null,
        datos: {
          titulo,
          tipo:
            typeof b.tipo === "string" && (TIPOS_BLOQUE as readonly string[]).includes(b.tipo)
              ? b.tipo
              : "MONTAJE",
          duracionMin: Number.isFinite(duracion) && duracion > 0 ? Math.trunc(duracion) : null,
          responsable: texto(b.responsable),
          contenido: texto(b.contenido),
          orden: Number.isFinite(orden) ? Math.trunc(orden) : i,
        },
      };
    })
    .filter((b): b is { id: string | null; datos: BloqueDatos } => b !== null);

  const conservados = entrantes.map((e) => e.id).filter((id): id is string => !!id);

  await prisma.$transaction(async (tx) => {
    await tx.artistaRiderBloque.deleteMany({
      where: { riderId, ...(conservados.length ? { id: { notIn: conservados } } : {}) },
    });
    for (const e of entrantes) {
      if (e.id) {
        await tx.artistaRiderBloque.update({ where: { id: e.id }, data: e.datos });
      } else {
        await tx.artistaRiderBloque.create({ data: { ...e.datos, riderId } });
      }
    }
  });

  const bloques = await prisma.artistaRiderBloque.findMany({
    where: { riderId },
    orderBy: [{ orden: "asc" }],
  });

  return NextResponse.json({ bloques });
}
