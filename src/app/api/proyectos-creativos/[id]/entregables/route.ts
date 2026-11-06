import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TIPOS = ["RENDER", "DOCUMENTACION_TECNICA", "PLOT", "OTRO"] as const;

/**
 * Entregables versionados del proyecto creativo (Fase 5.3). Versionado
 * simple: lista de versiones por tipo, sin comentarios ni aprobación por
 * versión. GET lista todo (más reciente primero); POST registra una versión
 * nueva — nunca sobreescribe la anterior.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoCreativoId } = await params;

  const entregables = await prisma.creativeEntregable.findMany({
    where: { proyectoCreativoId },
    orderBy: [{ tipo: "asc" }, { version: "desc" }],
  });

  return NextResponse.json({ entregables });
}

// POST: registra metadata de un archivo ya subido via client upload a Vercel
// Blob. { url, tipo, nombre, notas? }. La versión se calcula en el servidor —
// nunca llega del cliente — para que dos subidas simultáneas no choquen.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: proyectoCreativoId } = await params;

  const proyecto = await prisma.proyectoCreativo.findUnique({
    where: { id: proyectoCreativoId },
    select: { id: true },
  });
  if (!proyecto) return NextResponse.json({ error: "Proyecto creativo no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url : null;
  const tipo = typeof body.tipo === "string" ? body.tipo : "OTRO";
  const nombre = typeof body.nombre === "string" && body.nombre.trim() ? body.nombre.trim() : url?.split("/").pop() ?? "archivo";
  const notas = typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null;

  if (!url) return NextResponse.json({ error: "URL de archivo requerida" }, { status: 400 });
  if (!(TIPOS as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: "Tipo de entregable no válido" }, { status: 400 });
  }

  const ultimo = await prisma.creativeEntregable.findFirst({
    where: { proyectoCreativoId, tipo },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (ultimo?.version ?? 0) + 1;

  const entregable = await prisma.creativeEntregable.create({
    data: { proyectoCreativoId, tipo, version, nombre, url, notas, subidoPor: session.id },
  });

  return NextResponse.json({ entregable });
}
