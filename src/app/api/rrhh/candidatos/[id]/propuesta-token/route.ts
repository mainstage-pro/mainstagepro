import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: generate or return existing propuesta token for the active postulacion
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { postulacionId } = body;

  if (!postulacionId) return NextResponse.json({ error: "postulacionId requerido" }, { status: 400 });

  const post = await prisma.postulacion.findUnique({ where: { id: postulacionId } });
  if (!post || post.candidatoId !== id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Reuse existing token or generate new one
  const token = post.propuestaToken ?? crypto.randomUUID().replace(/-/g, "");

  if (!post.propuestaToken) {
    await prisma.postulacion.update({
      where: { id: postulacionId },
      data: { propuestaToken: token, updatedAt: new Date() },
    });
  }

  return NextResponse.json({ token });
}
