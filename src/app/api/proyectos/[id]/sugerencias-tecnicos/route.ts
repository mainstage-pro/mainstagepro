import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/proyectos/[id]/sugerencias-tecnicos?disciplina=AUDIO&nivel=AAA
 *
 * Devuelve la base de técnicos freelancers de una disciplina, ordenados por
 * prioridad para poder sugerirlos en la operación técnica del proyecto:
 *   1. no asignados aún a este proyecto primero
 *   2. prioridad (estrellas) desc
 *   3. coincidencia con el nivel cotizado
 *   4. evaluación promedio desc
 *   5. nombre
 * Marca (sin ocultar) técnicos ocupados en otro proyecto la misma fecha del evento.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const disciplina = req.nextUrl.searchParams.get("disciplina");
  const rolId = req.nextUrl.searchParams.get("rolId");
  const nivelCotizado = req.nextUrl.searchParams.get("nivel");
  const todos = req.nextUrl.searchParams.get("todos") === "true";

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      fechaEvento: true,
      personal: { select: { tecnicoId: true } },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const yaAsignados = new Set(
    proyecto.personal.map(p => p.tecnicoId).filter((x): x is string => !!x)
  );

  // Filtro: por rol exacto O por disciplina. Con ?todos=true se listan todos
  // (para casos donde el técnico aún no está categorizado con roles).
  let where: Record<string, unknown> = { activo: true };
  if (!todos) {
    const or: Record<string, unknown>[] = [];
    if (rolId) or.push({ roles: { some: { rolTecnicoId: rolId } } });
    if (disciplina) or.push({ disciplina: { has: disciplina } });
    if (or.length === 0) return NextResponse.json({ sugerencias: [] });
    where = { activo: true, OR: or };
  }

  const tecnicos = await prisma.tecnico.findMany({
    where,
    include: {
      rol: { select: { id: true, nombre: true } },
      roles: { select: { rolTecnicoId: true } },
    },
  });

  // ── Detectar ocupados en otro proyecto la misma fecha ──────────────────────
  let ocupados = new Set<string>();
  if (proyecto.fechaEvento && tecnicos.length > 0) {
    const diaInicio = new Date(proyecto.fechaEvento); diaInicio.setHours(0, 0, 0, 0);
    const diaFin    = new Date(proyecto.fechaEvento); diaFin.setHours(23, 59, 59, 999);
    const conflictos = await prisma.proyectoPersonal.findMany({
      where: {
        tecnicoId: { in: tecnicos.map(t => t.id) },
        proyecto: {
          id: { not: id },
          fechaEvento: { gte: diaInicio, lte: diaFin },
          estado: { notIn: ["COMPLETADO", "CANCELADO"] },
        },
      },
      select: { tecnicoId: true },
    });
    ocupados = new Set(conflictos.map(c => c.tecnicoId).filter((x): x is string => !!x));
  }

  const sugerencias = tecnicos
    .map(t => ({
      id: t.id,
      nombre: t.nombre,
      celular: t.celular,
      nivel: t.nivel,
      prioridad: t.prioridad,
      evaluacionPromedio: t.evaluacionPromedio,
      zonaHabitual: t.zonaHabitual,
      rol: t.rol,
      rolCoincide: rolId ? t.roles.some(r => r.rolTecnicoId === rolId) : false,
      yaAsignado: yaAsignados.has(t.id),
      ocupado: ocupados.has(t.id),
    }))
    .sort((a, b) => {
      if (a.yaAsignado !== b.yaAsignado) return a.yaAsignado ? 1 : -1;
      if (a.rolCoincide !== b.rolCoincide) return a.rolCoincide ? -1 : 1;
      if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
      if (nivelCotizado) {
        const am = a.nivel === nivelCotizado ? 0 : 1;
        const bm = b.nivel === nivelCotizado ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      const ae = a.evaluacionPromedio ?? -1;
      const be = b.evaluacionPromedio ?? -1;
      if (be !== ae) return be - ae;
      return a.nombre.localeCompare(b.nombre);
    });

  return NextResponse.json({ sugerencias });
}
