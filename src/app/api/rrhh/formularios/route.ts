import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerFormularios, slugUnico } from "@/lib/formularios";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const formularios = await prisma.formulario.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      puestos: { include: { puesto: { select: { id: true, nombre: true, area: true } } } },
      _count: { select: { respuestas: true } },
    },
  });

  // Conteo de pendientes de calificación por formulario (respuestas sin ningún
  // calificacionManual aún). Barato: una query agregada.
  const pendientes = await prisma.formularioRespuesta.groupBy({
    by: ["formularioId"],
    where: { respuestasPreguntas: { none: { calificacionManual: { not: null } } } },
    _count: { _all: true },
  });
  const mapaPendientes = new Map(pendientes.map((p) => [p.formularioId, p._count._all]));

  // Última respuesta por formulario.
  const ultimas = await prisma.formularioRespuesta.groupBy({
    by: ["formularioId"],
    _max: { enviadoAt: true },
  });
  const mapaUltimas = new Map(ultimas.map((u) => [u.formularioId, u._max.enviadoAt]));

  return NextResponse.json({
    formularios: formularios.map((f) => ({
      ...f,
      pendientesCount: mapaPendientes.get(f.id) ?? 0,
      ultimaRespuesta: mapaUltimas.get(f.id) ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerFormularios(session))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const titulo = (body.titulo ?? "Formulario sin título").toString().trim() || "Formulario sin título";
  const descripcion = body.descripcion?.toString() ?? null;
  const slugBase = body.slug ? String(body.slug) : titulo;
  const slug = await slugUnico(slugBase);

  const formulario = await prisma.formulario.create({
    data: {
      titulo,
      descripcion,
      slug,
      creadoPorId: session.id,
      secciones: {
        create: [
          { orden: 0, titulo: "Sección 1", descripcion: null },
        ],
      },
    },
    include: {
      secciones: { include: { preguntas: true } },
      puestos: { include: { puesto: true } },
    },
  });

  return NextResponse.json({ formulario }, { status: 201 });
}
