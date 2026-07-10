import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { validarArchivo } from "@/lib/upload-validation";

// Endpoint público (por token) de archivos del descubrimiento del cliente.
// Espeja /api/tratos/[id]/archivos pero acotado al trato dueño del formToken.
// Sin auth: la autorización es la posesión del token de un solo uso.

async function tratoDelToken(token: string) {
  return prisma.trato.findUnique({ where: { formToken: token }, select: { id: true } });
}

// GET — lista de archivos del trato ligado al token
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trato = await tratoDelToken(token);
  if (!trato) return NextResponse.json({ archivos: [] });
  const archivos = await prisma.tratoArchivo.findMany({
    where: { tratoId: trato.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ archivos });
}

// POST — el cliente sube una referencia/documento
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trato = await tratoDelToken(token);
  if (!trato) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string) || "REFERENCIA";
  const nombre = (formData.get("nombre") as string) || "";

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const validacion = validarArchivo(file);
  if (!validacion.ok) return NextResponse.json({ error: validacion.error }, { status: validacion.status });

  try {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `tratos/${trato.id}/${Date.now()}-${tipo.toLowerCase()}.${ext}`;
    const blob = await put(pathname, file, { access: "public" });

    const archivo = await prisma.tratoArchivo.create({
      data: {
        tratoId: trato.id,
        tipo,
        nombre: nombre || file.name,
        url: blob.url,
        subidoPor: null, // subido por el cliente vía link público
      },
    });

    return NextResponse.json({ archivo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[f/archivos POST]", msg);
    return NextResponse.json({ error: "Error al subir archivo: " + msg }, { status: 500 });
  }
}

// DELETE — el cliente elimina un archivo que subió (?archivoId=)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trato = await tratoDelToken(token);
  if (!trato) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });

  const archivoId = req.nextUrl.searchParams.get("archivoId");
  if (!archivoId) return NextResponse.json({ error: "archivoId requerido" }, { status: 400 });

  const archivo = await prisma.tratoArchivo.findUnique({ where: { id: archivoId } });
  // Solo permitir borrar archivos que pertenezcan al trato de este token
  if (!archivo || archivo.tratoId !== trato.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    await del(archivo.url);
  } catch {
    // el blob puede no existir ya
  }
  await prisma.tratoArchivo.delete({ where: { id: archivoId } });
  return NextResponse.json({ ok: true });
}
