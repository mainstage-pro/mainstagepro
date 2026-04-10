import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: checklistId, itemId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("estado" in body) data.estado = body.estado;
  if ("notas" in body) data.notas = body.notas || null;

  const item = await prisma.checklistBodegaItem.update({ where: { id: itemId }, data });

  // Cascada al equipo según el estado
  if (item.equipoId && "estado" in body) {
    const nuevoEstado = body.estado as string;
    if (nuevoEstado === "PERDIDO") {
      await prisma.equipo.update({
        where: { id: item.equipoId },
        data: { estado: "PERDIDO", activo: false },
      });
    } else if (nuevoEstado === "EXTRAVIADO") {
      await prisma.equipo.update({
        where: { id: item.equipoId },
        data: { estado: "EXTRAVIADO" },
      });
    } else if (nuevoEstado === "EN_BODEGA") {
      const equipo = await prisma.equipo.findUnique({ where: { id: item.equipoId } });
      if (equipo && (equipo.estado === "EXTRAVIADO" || equipo.estado === "PERDIDO")) {
        await prisma.equipo.update({
          where: { id: item.equipoId },
          data: { estado: "ACTIVO", activo: true },
        });
      }
    }
  }

  // Auto-calc estado del checklist
  const todos = await prisma.checklistBodegaItem.findMany({ where: { checklistId } });
  const hayAlertas = todos.some(i => i.estado === "EXTRAVIADO" || i.estado === "PERDIDO");
  const todoRevisado = todos.every(i => i.estado !== "PENDIENTE");

  await prisma.checklistBodega.update({
    where: { id: checklistId },
    data: {
      estado: !todoRevisado ? "EN_PROGRESO" : hayAlertas ? "CON_ALERTAS" : "COMPLETADO",
      cerradoEn: todoRevisado && !hayAlertas ? new Date() : null,
    },
  });

  return NextResponse.json({ item });
}
