import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { accion, datos } = await req.json();

  const item = await prisma.backlogItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  switch (accion) {
    case "junta": {
      const temasCount = await prisma.temaAdicional.count({ where: { juntaId: datos.juntaId } });
      await prisma.temaAdicional.create({
        data: {
          juntaId: datos.juntaId,
          titulo: item.titulo,
          descripcion: item.descripcion ?? null,
          propuestoPor: item.creadoPorId,
          orden: temasCount,
        },
      });
      await prisma.backlogItem.update({
        where: { id },
        data: { estado: "EN_JUNTA", procesadoEn: "junta", procesadoAt: new Date(), juntaId: datos.juntaId },
      });
      break;
    }

    case "tarea": {
      const tarea = await prisma.tarea.create({
        data: {
          titulo: datos.titulo ?? item.titulo,
          descripcion: item.descripcion ?? null,
          prioridad: datos.prioridad ?? "MEDIA",
          area: datos.area ?? item.area ?? "GENERAL",
          asignadoAId: datos.asignadoAId ?? null,
          creadoPorId: session.id,
          fecha: datos.fecha ? new Date(datos.fecha) : null,
        },
      });
      await prisma.backlogItem.update({
        where: { id },
        data: { estado: "CONVERTIDO", procesadoEn: "tarea", procesadoAt: new Date(), tareaGeneradaId: tarea.id },
      });
      break;
    }

    case "proyecto": {
      const proyecto = await prisma.proyectoInterno.create({
        data: {
          nombre: datos.nombre ?? item.titulo,
          descripcion: item.descripcion ?? null,
          area: datos.area ?? item.area ?? "DIRECCION",
          liderId: datos.liderId ?? session.id,
          backlogItemId: id,
        },
      });
      await prisma.backlogItem.update({
        where: { id },
        data: { estado: "CONVERTIDO", procesadoEn: "proyecto", procesadoAt: new Date() },
      });
      return NextResponse.json({ success: true, proyectoId: proyecto.id });
    }

    case "descartar": {
      await prisma.backlogItem.update({
        where: { id },
        data: { estado: "DESCARTADO", procesadoEn: "descartado", procesadoAt: new Date() },
      });
      break;
    }

    default:
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
