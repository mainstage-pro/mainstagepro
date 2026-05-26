import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: registra metadata de un archivo ya subido via client upload a Vercel Blob
// Acepta JSON: { url, tipo, nombre }
// El archivo ya está en Blob Storage cuando llega aquí — no procesa binarios
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  let url: string, tipo: string, nombre: string;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    // Client upload: recibe JSON con la URL ya subida a Vercel Blob
    const body = await req.json();
    url = body.url;
    tipo = body.tipo || "OTRO";
    nombre = body.nombre || url.split("/").pop() || "archivo";
  } else {
    // Legacy: FormData para compatibilidad (aunque ya no debería llegar por aquí)
    const { put } = await import("@vercel/blob");
    const { validarArchivo } = await import("@/lib/upload-validation");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    const validacion = validarArchivo(file);
    if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: validacion.status });
    tipo = (formData.get("tipo") as string) || "OTRO";
    nombre = (formData.get("nombre") as string) || file.name;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `proyectos/${id}/${Date.now()}-${tipo.toLowerCase()}.${ext}`;
    const blob = await put(pathname, file, { access: "public" });
    url = blob.url;
  }

  if (!url) return NextResponse.json({ error: "URL de archivo requerida" }, { status: 400 });

  try {
    const archivo = await prisma.proyectoArchivo.create({
      data: {
        proyectoId: id,
        tipo,
        nombre,
        url,
        subidoPor: session.id,
      },
    });

    return NextResponse.json({ archivo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[proyectos/archivos POST]", msg);
    return NextResponse.json({ error: "Error al guardar archivo: " + msg }, { status: 500 });
  }
}
