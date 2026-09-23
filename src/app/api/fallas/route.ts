import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ESTADOS_FALLA_ABIERTA,
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const equipoId = searchParams.get("equipoId");
  const unidadId = searchParams.get("unidadId");
  const estado = searchParams.get("estado");
  const severidad = searchParams.get("severidad");
  const abiertas = searchParams.get("abiertas");

  const where: Record<string, unknown> = {};
  if (equipoId) where.equipoId = equipoId;
  if (unidadId) where.unidadId = unidadId;
  if (severidad) where.severidad = severidad;
  if (estado) where.estado = { in: estado.split(",") };
  else if (abiertas === "1") where.estado = { in: ESTADOS_FALLA_ABIERTA };

  const fallas = await prisma.fallaEquipo.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ fallas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { equipoId, unidadId, fecha, descripcion, severidad, origen, proyectoId, fotoEvidencia } = body;

  if (!equipoId || !fecha || !descripcion?.trim() || !severidad || !origen) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!SEVERIDADES_FALLA.includes(severidad)) {
    return NextResponse.json({ error: "Severidad inválida" }, { status: 400 });
  }
  if (!ORIGENES_FALLA.includes(origen)) {
    return NextResponse.json({ error: "Origen inválido" }, { status: 400 });
  }

  const falla = await prisma.fallaEquipo.create({
    data: {
      equipoId,
      unidadId: unidadId || null,
      fecha: new Date(fecha),
      descripcion: descripcion.trim(),
      severidad,
      origen,
      proyectoId: origen === "EVENTO" ? proyectoId || null : null,
      fotoEvidencia: fotoEvidencia ?? null,
      reportadoPorId: session.id,
    },
    include: INCLUDE,
  });

  return NextResponse.json({ falla });
}
