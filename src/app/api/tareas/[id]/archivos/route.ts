import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { put } from "@vercel/blob";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const archivos = await prisma.tareaArchivo.findMany({
    where: { tareaId: id },
    include: { subidoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ archivos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const urlManual = formData.get("url") as string | null;
  const nombreManual = formData.get("nombre") as string | null;

  let url: string;
  let nombre: string;
  let tipo: string | null = null;
  let tamano: number | null = null;

  if (file) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `tareas/${id}/${Date.now()}-${safeName}`;
      const blob = await put(pathname, file, { access: "public" });
      url = blob.url;
      nombre = file.name;
      tipo = file.type || null;
      tamano = file.size;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[tareas/archivos POST]", msg);
      return NextResponse.json({ error: "Error al subir archivo: " + msg }, { status: 500 });
    }
  } else if (urlManual) {
    url = urlManual;
    nombre = nombreManual ?? urlManual.split("/").pop() ?? "archivo";
  } else {
    return NextResponse.json({ error: "Se requiere archivo o URL" }, { status: 400 });
  }

  const archivo = await prisma.tareaArchivo.create({
    data: { nombre, url, tipo, tamano, tareaId: id, subidoPorId: session.id },
    include: { subidoPor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ archivo }, { status: 201 });
}
