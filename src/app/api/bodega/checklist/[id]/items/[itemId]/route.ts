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

  // Auto-actualizar estado del checklist
  const todos = await prisma.checklistBodegaItem.findMany({ where: { checklistId } });
  const hayAlertas = todos.some(i => i.estado === "FALTA" || i.estado === "DAÑADO");
  const todoRevisado = todos.every(i => i.estado !== "PENDIENTE");
  if (todoRevisado) {
    await prisma.checklistBodega.update({
      where: { id: checklistId },
      data: {
        estado: hayAlertas ? "CON_ALERTAS" : "COMPLETADO",
        cerradoEn: hayAlertas ? null : new Date(),
      },
    });
  } else {
    // Asegura que vuelva a EN_PROGRESO si se des-revisa algo
    await prisma.checklistBodega.update({
      where: { id: checklistId },
      data: { estado: "EN_PROGRESO", cerradoEn: null },
    });
  }

  return NextResponse.json({ item });
}
