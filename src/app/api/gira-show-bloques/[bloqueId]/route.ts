import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_BLOQUE } from "@/lib/giras";

const TEXTO = ["responsable", "lugar", "notas", "hora", "horaFin"] as const;

/// Edición bloque por bloque, como el advance: cada celda se guarda sola y la
/// fila conserva su id.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bloqueId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { bloqueId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("titulo" in body) {
    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!titulo) return NextResponse.json({ error: "El bloque necesita un título" }, { status: 400 });
    data.titulo = titulo;
  }

  if ("tipo" in body) {
    if (typeof body.tipo !== "string" || !TIPOS_BLOQUE.includes(body.tipo)) {
      return NextResponse.json({ error: "Tipo de bloque inválido" }, { status: 400 });
    }
    data.tipo = body.tipo;
  }

  for (const campo of TEXTO) {
    if (!(campo in body)) continue;
    const v = body[campo];
    data[campo] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada por actualizar" }, { status: 400 });

  try {
    const bloque = await prisma.giraShowBloque.update({ where: { id: bloqueId }, data });
    return NextResponse.json({ bloque });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el bloque" }, { status: 404 });
  }
}

/// GiraShowBloque no tiene bandera `activo`: un bloque que no va, no va. La UI
/// confirma antes de llegar aquí.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ bloqueId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { bloqueId } = await params;
  const existente = await prisma.giraShowBloque.findUnique({
    where: { id: bloqueId },
    select: { id: true, showId: true, titulo: true },
  });
  if (!existente) return NextResponse.json({ error: "El bloque no existe" }, { status: 404 });

  await prisma.giraShowBloque.delete({ where: { id: bloqueId } });
  await logActividad(
    session.id,
    "ELIMINAR",
    "GiraShowBloque",
    bloqueId,
    `Quitó «${existente.titulo}» del día del show`,
    { showId: existente.showId },
  );

  return NextResponse.json({ ok: true });
}
