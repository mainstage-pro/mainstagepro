import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DISCIPLINAS, PRIORIDADES, PROVISTO_POR, UNIDADES_RIDER } from "@/lib/giras";

interface LineaEntrante {
  id?: string | null;
  disciplina?: string | null;
  concepto?: string | null;
  cantidad?: number | string | null;
  unidad?: string | null;
  equipoId?: string | null;
  preferido?: string | null;
  aceptables?: string | null;
  noAceptable?: string | null;
  prioridad?: string | null;
  provistoPor?: string | null;
  enAdvance?: boolean | null;
  notas?: string | null;
  orden?: number | string | null;
}

interface LineaDatos {
  disciplina: string;
  concepto: string;
  cantidad: number;
  unidad: string | null;
  equipoId: string | null;
  preferido: string | null;
  aceptables: string | null;
  noAceptable: string | null;
  prioridad: string;
  provistoPor: string;
  enAdvance: boolean;
  notas: string | null;
  orden: number;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function deLista(v: unknown, lista: readonly string[], porDefecto: string): string {
  return typeof v === "string" && lista.includes(v) ? v : porDefecto;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const lineas = await prisma.artistaRiderLinea.findMany({
    where: { riderId },
    orderBy: [{ orden: "asc" }],
    include: { equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } } },
  });

  return NextResponse.json({ lineas });
}

/// Guardado completo del rider maestro de equipo. Igual que las listas de canales:
/// una sola superficie editable, un solo Guardar, y lo que se quitó se borra.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.lineas)) {
    return NextResponse.json({ error: "lineas debe ser un arreglo" }, { status: 400 });
  }

  const rider = await prisma.artistaRider.findUnique({ where: { id: riderId }, select: { id: true } });
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const equipoIds = (body.lineas as LineaEntrante[])
    .map((l) => l.equipoId)
    .filter((id): id is string => !!id);
  const equiposValidos = new Set(
    equipoIds.length
      ? (await prisma.equipo.findMany({ where: { id: { in: equipoIds } }, select: { id: true } })).map(
          (e) => e.id,
        )
      : [],
  );

  const entrantes = (body.lineas as LineaEntrante[])
    .map((l, i): { id: string | null; datos: LineaDatos } | null => {
      const concepto = texto(l.concepto);
      if (!concepto) return null;
      const cantidad = Number(l.cantidad);
      const orden = Number(l.orden);
      return {
        id: l.id || null,
        datos: {
          disciplina: deLista(l.disciplina, DISCIPLINAS, "AUDIO"),
          concepto,
          cantidad: Number.isFinite(cantidad) && cantidad > 0 ? Math.trunc(cantidad) : 1,
          unidad: typeof l.unidad === "string" && (UNIDADES_RIDER as readonly string[]).includes(l.unidad)
            ? l.unidad
            : texto(l.unidad),
          equipoId: l.equipoId && equiposValidos.has(l.equipoId) ? l.equipoId : null,
          preferido: texto(l.preferido),
          aceptables: texto(l.aceptables),
          noAceptable: texto(l.noAceptable),
          prioridad: deLista(l.prioridad, PRIORIDADES, "INDISPENSABLE"),
          provistoPor: deLista(l.provistoPor, PROVISTO_POR, "CASA"),
          enAdvance: l.enAdvance !== false,
          notas: texto(l.notas),
          orden: Number.isFinite(orden) ? Math.trunc(orden) : i,
        },
      };
    })
    .filter((l): l is { id: string | null; datos: LineaDatos } => l !== null);

  const conservados = entrantes.map((e) => e.id).filter((id): id is string => !!id);

  await prisma.$transaction(async (tx) => {
    await tx.artistaRiderLinea.deleteMany({
      where: { riderId, ...(conservados.length ? { id: { notIn: conservados } } : {}) },
    });
    for (const e of entrantes) {
      if (e.id) {
        await tx.artistaRiderLinea.update({ where: { id: e.id }, data: e.datos });
      } else {
        await tx.artistaRiderLinea.create({ data: { ...e.datos, riderId } });
      }
    }
  });

  const lineas = await prisma.artistaRiderLinea.findMany({
    where: { riderId },
    orderBy: [{ orden: "asc" }],
    include: { equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } } },
  });

  return NextResponse.json({ lineas });
}
