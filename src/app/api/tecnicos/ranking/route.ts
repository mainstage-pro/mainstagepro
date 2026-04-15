import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Get all project assignments with evaluation data
  const asignaciones = await prisma.proyectoPersonal.findMany({
    where: { tecnicoId: { not: null } },
    select: {
      tecnicoId: true,
      tecnico: { select: { id: true, nombre: true, nivel: true, rol: { select: { nombre: true } }, activo: true } },
      proyecto: {
        select: {
          id: true,
          nombre: true,
          numeroProyecto: true,
          fechaEvento: true,
          evaluacionInterna: { select: { promedioCalculado: true, desempenoPersonal: true, puntualidad: true } },
        },
      },
    },
    orderBy: { proyecto: { fechaEvento: "desc" } },
  });

  // Aggregate per tecnico
  const map = new Map<string, {
    tecnico: NonNullable<typeof asignaciones[0]["tecnico"]>;
    proyectos: number;
    scores: number[];
    puntualidades: number[];
    ultimos3: { nombre: string; numero: string; fecha: Date | null; score: number | null }[];
  }>();

  for (const a of asignaciones) {
    if (!a.tecnicoId || !a.tecnico) continue;
    const key = a.tecnicoId;
    if (!map.has(key)) {
      map.set(key, { tecnico: a.tecnico, proyectos: 0, scores: [], puntualidades: [], ultimos3: [] });
    }
    const entry = map.get(key)!;
    entry.proyectos++;
    const score = a.proyecto.evaluacionInterna?.promedioCalculado ?? null;
    const punt = a.proyecto.evaluacionInterna?.puntualidad ?? null;
    if (score !== null) entry.scores.push(score);
    if (punt !== null) entry.puntualidades.push(punt);
    if (entry.ultimos3.length < 3) {
      entry.ultimos3.push({
        nombre: a.proyecto.nombre,
        numero: a.proyecto.numeroProyecto,
        fecha: a.proyecto.fechaEvento,
        score,
      });
    }
  }

  const ranking = Array.from(map.values()).map(entry => ({
    ...entry.tecnico,
    proyectos: entry.proyectos,
    scorePromedio: entry.scores.length ? +(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(1) : null,
    puntualidadPromedio: entry.puntualidades.length ? +(entry.puntualidades.reduce((a, b) => a + b, 0) / entry.puntualidades.length).toFixed(1) : null,
    ultimos3: entry.ultimos3,
  }));

  ranking.sort((a, b) => {
    if (a.scorePromedio === null && b.scorePromedio === null) return b.proyectos - a.proyectos;
    if (a.scorePromedio === null) return 1;
    if (b.scorePromedio === null) return -1;
    return b.scorePromedio - a.scorePromedio;
  });

  return NextResponse.json({ ranking });
}
