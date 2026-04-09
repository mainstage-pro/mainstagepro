import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; archivoId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { archivoId } = await params;

  const archivo = await prisma.proyectoArchivo.findUnique({ where: { id: archivoId } });
  if (!archivo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Delete physical file (best effort)
  try {
    const filePath = path.join(process.cwd(), "public", archivo.url);
    await unlink(filePath);
  } catch {
    // File may not exist on disk
  }

  await prisma.proyectoArchivo.delete({ where: { id: archivoId } });
  return NextResponse.json({ ok: true });
}
