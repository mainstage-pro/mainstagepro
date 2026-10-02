import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; archivoId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, archivoId } = await params;

  const archivo = await prisma.proyectoArchivo.findUnique({ where: { id: archivoId } });
  if (!archivo || archivo.proyectoId !== id) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  await prisma.proyectoArchivo.delete({ where: { id: archivoId } });
  await logActividad(
    session.id,
    "ELIMINAR",
    "ProyectoArchivo",
    archivoId,
    `Quitó "${archivo.nombre}" del archivero del proyecto`,
    { tipo: archivo.tipo, url: archivo.url },
  );

  return NextResponse.json({ ok: true });
}
