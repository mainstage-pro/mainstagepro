// Borrar un archivo del archivero de la gira.
//
// GiraArchivo no tiene columna `activo`, así que el borrado es duro — igual que
// ProyectoArchivo. Queda el rastro en ActividadUsuario con el nombre y la URL,
// que es lo que se necesita si alguien pregunta qué pasó con un documento.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; archivoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, archivoId } = await params;

  const archivo = await prisma.giraArchivo.findUnique({
    where: { id: archivoId },
    select: { id: true, giraId: true, nombre: true, url: true, tipo: true },
  });
  if (!archivo || archivo.giraId !== id) {
    return NextResponse.json({ error: "El archivo no existe en este registro" }, { status: 404 });
  }

  await prisma.giraArchivo.delete({ where: { id: archivoId } });

  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraArchivo",
    archivoId,
    `Quitó "${archivo.nombre}" del archivero de la gira`,
    { tipo: archivo.tipo, url: archivo.url },
  );

  return NextResponse.json({ ok: true });
}
