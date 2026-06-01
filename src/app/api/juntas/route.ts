import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { JUNTA_TEMPLATES } from "@/lib/junta-templates";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const area   = searchParams.get("area");
  const estado = searchParams.get("estado");
  const from   = searchParams.get("from");
  const to     = searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (area)   where.area   = area;
  if (estado) where.estado = estado;
  if (from || to) {
    where.fecha = {};
    if (from) where.fecha.gte = new Date(from);
    if (to)   where.fecha.lte = new Date(to);
  }

  const semana = searchParams.get('semana');
  const anio   = searchParams.get('anio');
  const tipo   = searchParams.get('tipo');

  if (semana && anio) {
    // Calculate ISO week date range
    const jan4 = new Date(parseInt(anio), 0, 4);
    const dow = jan4.getDay() || 7;
    const lunes = new Date(jan4);
    lunes.setDate(jan4.getDate() - dow + 1 + (parseInt(semana) - 1) * 7);
    lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);
    where.fecha = { gte: lunes, lte: domingo };
  }
  if (tipo) where.tipo = tipo;

  const juntas = await prisma.junta.findMany({
    where,
    orderBy: { fecha: "desc" },
    include: {
      facilitador:      { select: { id: true, name: true } },
      participantes:    { include: { user: { select: { id: true, name: true, area: true } } } },
      agendaItems:      { orderBy: { orden: 'asc' } },
      temasAdicionales: { orderBy: { orden: 'asc' }, include: { autor: { select: { id: true, name: true } } } },
      _count:           { select: { tareas: true, agendaItems: true } },
    },
  });

  return NextResponse.json({ juntas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { tipo, area, fecha, duracionMin, participanteIds, notas } = body;

  if (!tipo || !area || !fecha)
    return NextResponse.json({ error: "tipo, area y fecha son requeridos" }, { status: 400 });

  // Obtener template y generar título
  const templateKey = area === "GLOBAL" ? tipo : area;
  const template = JUNTA_TEMPLATES[templateKey] ?? JUNTA_TEMPLATES[tipo];
  const titulo = template?.nombre ?? `Junta ${area} — ${tipo}`;
  const duracion = duracionMin ?? template?.duracionMin ?? 45;

  // Buscar temas pendientes de la última junta completada del mismo área
  const juntaAnterior = area !== "GLOBAL"
    ? await prisma.junta.findFirst({
        where: { area, estado: "COMPLETADA" },
        include: {
          temasAdicionales: {
            where: { pasadoSiguienteSemana: true, cubierto: false },
            orderBy: { orden: "asc" },
          },
        },
        orderBy: { fecha: "desc" },
      })
    : null;

  const junta = await prisma.junta.create({
    data: {
      titulo,
      area,
      tipo,
      fecha:        new Date(fecha),
      duracionMin:  duracion,
      estado:       "PROGRAMADA",
      facilitadorId: session.id,
      notas:        notas ?? null,
      agendaItems: {
        create: (template?.agendaItems ?? []).map((item) => ({
          orden:       item.orden,
          tipo:        item.tipo,
          titulo:      item.titulo,
          descripcion: item.descripcion ?? null,
          placeholder: item.placeholder ?? null,
          completado:  false,
        })),
      },
      participantes: participanteIds?.length
        ? { create: participanteIds.map((uid: string) => ({ userId: uid })) }
        : undefined,
    },
    include: {
      facilitador:   { select: { id: true, name: true } },
      agendaItems:   { orderBy: { orden: "asc" } },
      participantes: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // Copiar temas pendientes de la semana anterior
  const temasPendientes = juntaAnterior?.temasAdicionales ?? [];
  if (temasPendientes.length > 0) {
    await prisma.temaAdicional.createMany({
      data: temasPendientes.map((t, i) => ({
        juntaId:      junta.id,
        titulo:       `[Pendiente] ${t.titulo}`,
        descripcion:  t.descripcion,
        propuestoPor: t.propuestoPor,
        orden:        i,
      })),
    });
  }

  return NextResponse.json({ junta }, { status: 201 });
}
