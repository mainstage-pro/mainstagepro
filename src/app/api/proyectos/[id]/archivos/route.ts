import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import { validarArchivo } from "@/lib/upload-validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string) || "OTRO";
  const nombre = (formData.get("nombre") as string) || "";

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const validacion = validarArchivo(file);
  if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: validacion.status });

  try {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `proyectos/${id}/${Date.now()}-${tipo.toLowerCase()}.${ext}`;

    const blob = await put(pathname, file, { access: "public" });

    const archivo = await prisma.proyectoArchivo.create({
      data: {
        proyectoId: id,
        tipo,
        nombre: nombre || file.name,
        url: blob.url,
        subidoPor: session.id,
      },
    });

    return NextResponse.json({ archivo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[proyectos/archivos POST]", msg);
    return NextResponse.json({ error: "Error al subir archivo: " + msg }, { status: 500 });
  }
}
