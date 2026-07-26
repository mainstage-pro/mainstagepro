import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProyectoIdeasTable } from "@/lib/proyecto-ideas";

// Convierte una idea de la bandeja de entrada en un proyecto de empresa (ProyectoInterno).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await ensureProyectoIdeasTable();
  const idea = await prisma.proyectoIdea.findUnique({ where: { id } });
  if (!idea) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 });
  if (idea.estado === "CONVERTIDA" && idea.proyectoId) {
    return NextResponse.json({ proyectoId: idea.proyectoId, yaExistia: true });
  }

  const nombre = (body.nombre ?? idea.titulo ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre del proyecto es obligatorio" }, { status: 400 });

  const area: string = body.area || idea.area || "DIRECCION";
  const liderId: string = body.liderId || idea.responsableId || session.id;
  const prioridad: string = body.prioridad || "MEDIA";
  const descripcion: string | null = (body.descripcion ?? idea.descripcion ?? "")?.trim() || null;
  const objetivo: string | null = body.objetivo?.trim() || null;
  const entregable: string | null = body.entregable?.trim() || null;
  const fechaInicio: Date | null = body.fechaInicio ? new Date(body.fechaInicio) : null;
  const fechaFin: Date | null = body.fechaFin ? new Date(body.fechaFin) : null;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const proy = await tx.proyectoInterno.create({
        data: {
          nombre,
          descripcion,
          area,
          liderId,
          prioridad,
          fechaInicio,
          fechaFin,
          objetivo,
          entregable,
        },
      });

      await tx.proyectoIdea.update({
        where: { id: idea.id },
        data: { estado: "CONVERTIDA", proyectoId: proy.id },
      });

      return proy;
    });

    return NextResponse.json({ proyectoId: resultado.id });
  } catch (e) {
    console.error("[/api/proyectos-internos/ideas/[id]/convertir]", e);
    return NextResponse.json({ error: "No se pudo convertir la idea en proyecto" }, { status: 500 });
  }
}
