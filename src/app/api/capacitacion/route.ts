import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeEditarCapacitacion } from "@/lib/capacitacion";

// GET /api/capacitacion — Sesiones con última versión, categoría y progreso del usuario.
// ?categoria=<slug> filtra por área.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("categoria");
  const categoria = slug
    ? await prisma.categoriaCapacitacion.findUnique({ where: { slug } })
    : null;
  if (slug && !categoria) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  const sesiones = await prisma.sesionCapacitacion.findMany({
    where: categoria ? { categoriaId: categoria.id } : undefined,
    orderBy: [{ numero: "asc" }],
    include: {
      versiones: { orderBy: { version: "desc" }, take: 1, select: { version: true, generadaEn: true } },
      categoria: { select: { id: true, nombre: true, slug: true, color: true } },
      progreso: { where: { usuarioId: session.id }, take: 1 },
      evaluacion: { select: { id: true } },
    },
  });

  // Mejor intento de evaluación del usuario por sesión
  const evalIds = sesiones.map((s) => s.evaluacion?.id).filter(Boolean) as string[];
  const intentos = evalIds.length
    ? await prisma.intentoEvaluacion.findMany({
        where: { usuarioId: session.id, evaluacionId: { in: evalIds } },
        orderBy: { calificacion: "desc" },
      })
    : [];
  const mejorPorEval = new Map<string, { calificacion: number; aprobado: boolean }>();
  for (const it of intentos) {
    if (!mejorPorEval.has(it.evaluacionId)) mejorPorEval.set(it.evaluacionId, { calificacion: it.calificacion, aprobado: it.aprobado });
  }

  const result = sesiones.map((s) => {
    const prog = s.progreso[0];
    const mejor = s.evaluacion ? mejorPorEval.get(s.evaluacion.id) : undefined;
    return {
      id: s.id,
      numero: s.numero,
      titulo: s.titulo,
      bloque: s.bloque,
      bloqueLetra: s.bloqueLetra,
      descripcion: s.descripcion,
      duracion: s.duracion,
      categoria: s.categoria,
      versionActual: s.versiones[0]?.version ?? null,
      tieneContenido: (s.versiones[0]?.version ?? null) !== null,
      tieneEvaluacion: !!s.evaluacion,
      estadoUsuario: prog?.estado ?? "no-iniciado", // no-iniciado | en-progreso | completado
      segundosUsuario: prog?.segundos ?? 0,
      calificacion: mejor?.calificacion ?? null,
      aprobado: mejor?.aprobado ?? null,
    };
  });

  return NextResponse.json({ sesiones: result, puedeEditar: puedeEditarCapacitacion(session) });
}

// POST /api/capacitacion — Crear nueva capacitación (auto-orden y color por bloque).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEditarCapacitacion(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  const { titulo, descripcion, categoriaId, bloque, bloqueLetra, duracion, objetivos, puntosBase } = body;
  if (!titulo || !categoriaId) return NextResponse.json({ error: "Falta título o área" }, { status: 400 });

  const maxNumero = await prisma.sesionCapacitacion.aggregate({ _max: { numero: true } });

  const sesion = await prisma.sesionCapacitacion.create({
    data: {
      numero: (maxNumero._max.numero ?? 0) + 1,
      titulo,
      descripcion: descripcion ?? "",
      categoriaId,
      bloque: bloque ?? "Bloque A",
      bloqueLetra: (bloqueLetra ?? "A").toUpperCase().slice(0, 1),
      duracion: duracion ?? 60,
      objetivos: objetivos ?? [],
      puntosBase: puntosBase ?? [],
      puntosEditados: [],
      estado: "pendiente",
    },
  });

  return NextResponse.json(sesion, { status: 201 });
}
