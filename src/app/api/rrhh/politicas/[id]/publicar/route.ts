import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Publica la política: congela la versión de trabajo como snapshot inmutable,
// marca estado PUBLICADA y sella la fecha. Si ya estaba publicada, sube versión.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const politica = await prisma.politica.findUnique({ where: { id } });
    if (!politica) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    // Si ya había una versión publicada, la nueva publicación incrementa el número.
    const yaPublicada = politica.estado === "PUBLICADA";
    const nuevaVersion = yaPublicada ? politica.version + 1 : politica.version;

    await prisma.politicaVersion.create({
      data: {
        politicaId: id,
        version: nuevaVersion,
        titulo: politica.titulo,
        contenido: politica.contenido,
        nota: typeof b.nota === "string" ? b.nota : null,
        autorNombre: session.name || session.email || null,
      },
    });
    const updated = await prisma.politica.update({
      where: { id },
      data: { estado: "PUBLICADA", version: nuevaVersion, publicadaEn: new Date() },
    });
    return NextResponse.json({ politica: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/politicas/publicar POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
