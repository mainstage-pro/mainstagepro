import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const trato = await prisma.trato.findUnique({ where: { id }, select: { id: true } });
  if (!trato) return NextResponse.json({ error: "Trato no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string) || "OTRO";
  const nombre = (formData.get("nombre") as string) || "";

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = `${Date.now()}-${tipo.toLowerCase()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "tratos", id);

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safeName), buffer);

  const url = `/uploads/tratos/${id}/${safeName}`;

  const archivo = await prisma.tratoArchivo.create({
    data: {
      tratoId: id,
      tipo,
      nombre: nombre || file.name,
      url,
      subidoPor: session.id,
    },
  });

  return NextResponse.json({ archivo });
}
