import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { validarArchivo } from "@/lib/upload-validation";
import { isTokenExpired } from "@/lib/tokens";

// Endpoint público (por token) de archivos del brief creativo del cliente.
// Espeja /api/proyectos-creativos/[id]/archivos pero acotado al proyecto
// dueño del formToken. Sin auth: la autorización es la posesión del token.

async function proyectoDelToken(token: string) {
  if (isTokenExpired(token)) return null;
  return prisma.proyectoCreativo.findUnique({ where: { formToken: token }, select: { id: true } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proyecto = await proyectoDelToken(token);
  if (!proyecto) return NextResponse.json({ archivos: [] });
  const archivos = await prisma.proyectoCreativoArchivo.findMany({
    where: { proyectoCreativoId: proyecto.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ archivos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proyecto = await proyectoDelToken(token);
  if (!proyecto) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string) || "REFERENCIA";
  const nombre = (formData.get("nombre") as string) || "";

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const validacion = validarArchivo(file);
  if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: validacion.status });

  try {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `proyectos-creativos/${proyecto.id}/${Date.now()}-${tipo.toLowerCase()}.${ext}`;
    const blob = await put(pathname, file, { access: "public" });

    const archivo = await prisma.proyectoCreativoArchivo.create({
      data: {
        proyectoCreativoId: proyecto.id,
        tipo,
        nombre: nombre || file.name,
        url: blob.url,
        subidoPor: null, // subido por el cliente vía link público
      },
    });

    return NextResponse.json({ archivo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[brief-creativo/archivos POST]", msg);
    return NextResponse.json({ error: "Error al subir archivo: " + msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proyecto = await proyectoDelToken(token);
  if (!proyecto) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

  const archivoId = req.nextUrl.searchParams.get("archivoId");
  if (!archivoId) return NextResponse.json({ error: "archivoId requerido" }, { status: 400 });

  const archivo = await prisma.proyectoCreativoArchivo.findUnique({ where: { id: archivoId } });
  if (!archivo || archivo.proyectoCreativoId !== proyecto.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    await del(archivo.url);
  } catch {
    // el blob puede no existir ya
  }
  await prisma.proyectoCreativoArchivo.delete({ where: { id: archivoId } });
  return NextResponse.json({ ok: true });
}
