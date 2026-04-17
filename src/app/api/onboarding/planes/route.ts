import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const planes = await prisma.onboardingPlan.findMany({
      include: {
        modulos: {
          include: { tareas: { select: { id: true, completada: true } } },
          orderBy: { orden: "asc" },
        },
        postulacion: {
          select: {
            id: true, puestoManual: true, areaManual: true,
            candidato: { select: { nombre: true, telefono: true } },
            puesto: { select: { titulo: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ planes });
  } catch (e) {
    return NextResponse.json({ error: String(e), planes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, puesto, area, fechaIngreso, notas, postulacionId, modulos } = body;

  try {
    const plan = await prisma.onboardingPlan.create({
      data: {
        nombre,
        puesto,
        area: area || null,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : null,
        notas: notas || null,
        postulacionId: postulacionId || null,
        modulos: {
          create: (modulos ?? []).map((m: {
            nombre: string; tipo: string; orden: number;
            descripcion?: string; duracionDias?: number;
            tareas?: { titulo: string; tipo: string; orden: number; descripcion?: string; recurso?: string }[];
          }) => ({
            nombre: m.nombre,
            tipo: m.tipo,
            orden: m.orden,
            descripcion: m.descripcion || null,
            duracionDias: m.duracionDias || null,
            tareas: {
              create: (m.tareas ?? []).map(t => ({
                titulo: t.titulo,
                tipo: t.tipo,
                orden: t.orden,
                descripcion: t.descripcion || null,
                recurso: t.recurso || null,
              })),
            },
          })),
        },
      },
      include: {
        modulos: { include: { tareas: true }, orderBy: { orden: "asc" } },
      },
    });
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
