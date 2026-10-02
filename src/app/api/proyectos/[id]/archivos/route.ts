import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_ARCHIVO_PROYECTO } from "@/lib/proyecto-archivos";

const INCLUDE_ESCENARIO = { escenario: { select: { id: true, nombre: true } } };

// GET: archivero del proyecto. ?escenarioId acota a un escenario.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const escenarioId = req.nextUrl.searchParams.get("escenarioId");

  const archivos = await prisma.proyectoArchivo.findMany({
    where: { proyectoId: id, ...(escenarioId ? { escenarioId } : {}) },
    include: INCLUDE_ESCENARIO,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ archivos });
}

// POST: registra metadata de un archivo ya subido via client upload a Vercel Blob
// Acepta JSON: { url, tipo, nombre, tamanoBytes, escenarioId }
// El archivo ya está en Blob Storage cuando llega aquí — no procesa binarios
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  let url: string, tipo: string, nombre: string;
  let tamanoBytes: number | null = null;
  let escenarioId: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    // Client upload: recibe JSON con la URL ya subida a Vercel Blob
    const body = await req.json();
    url = body.url;
    tipo = body.tipo || "OTRO";
    nombre = body.nombre || url?.split("/").pop() || "archivo";
    tamanoBytes = typeof body.tamanoBytes === "number" ? body.tamanoBytes : null;
    escenarioId = typeof body.escenarioId === "string" && body.escenarioId ? body.escenarioId : null;
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
    tamanoBytes = file.size;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `proyectos/${id}/${Date.now()}-${tipo.toLowerCase()}.${ext}`;
    const blob = await put(pathname, file, { access: "public" });
    url = blob.url;
  }

  if (!url) return NextResponse.json({ error: "URL de archivo requerida" }, { status: 400 });
  if (!(TIPOS_ARCHIVO_PROYECTO as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: "Tipo de archivo no válido" }, { status: 400 });
  }

  // Un escenario de otro proyecto dejaría el archivo colgado en un archivero ajeno.
  if (escenarioId) {
    const escenario = await prisma.proyectoEscenario.findUnique({
      where: { id: escenarioId },
      select: { proyectoId: true },
    });
    if (!escenario || escenario.proyectoId !== id) {
      return NextResponse.json({ error: "El escenario no es de este proyecto" }, { status: 400 });
    }
  }

  try {
    const archivo = await prisma.proyectoArchivo.create({
      data: { proyectoId: id, escenarioId, tipo, nombre, url, tamanoBytes, subidoPor: session.id },
      include: INCLUDE_ESCENARIO,
    });

    await logActividad(
      session.id,
      "CREAR",
      "ProyectoArchivo",
      archivo.id,
      `Subió "${nombre}" al archivero del proyecto ${proyecto.nombre}`,
      { tipo, escenarioId },
    );

    return NextResponse.json({ archivo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[proyectos/archivos POST]", msg);
    return NextResponse.json({ error: "Error al guardar archivo: " + msg }, { status: 500 });
  }
}
