import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_BLOQUE } from "@/lib/giras";
import { SELECT_MOMENTO } from "@/lib/show-momentos";

const TEXTO = ["hora", "horaFin", "responsable", "lugar", "notas"] as const;

/// Edición momento por momento, como el advance: cada celda se guarda sola y la
/// fila conserva su id. La `llave` y el `esAncla` no se tocan nunca desde aquí
/// —son la identidad del renglón para los PDFs—, pero el título sí: un soundcheck
/// que en esta gira se llama "prueba de línea" se renombra y sigue siendo el
/// soundcheck.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ momentoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { momentoId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("titulo" in body) {
    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!titulo) return NextResponse.json({ error: "El momento necesita un título" }, { status: 400 });
    data.titulo = titulo;
  }

  if ("tipo" in body) {
    if (typeof body.tipo !== "string" || !TIPOS_BLOQUE.includes(body.tipo)) {
      return NextResponse.json({ error: "Fase del día inválida" }, { status: 400 });
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
    const momento = await prisma.showMomento.update({
      where: { id: momentoId },
      data,
      select: SELECT_MOMENTO,
    });
    return NextResponse.json({ momento });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el momento" }, { status: 404 });
  }
}

/// `ShowMomento` no tiene bandera `activo`: un momento que no va, no va. La UI
/// confirma antes de llegar aquí. Si lo que se borra es un ancla, el esqueleto
/// queda con un hueco a propósito y se puede volver a agregar de un clic.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ momentoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { momentoId } = await params;
  const existente = await prisma.showMomento.findUnique({
    where: { id: momentoId },
    select: { id: true, showId: true, titulo: true, llave: true, esAncla: true },
  });
  if (!existente) return NextResponse.json({ error: "El momento no existe" }, { status: 404 });

  await prisma.showMomento.delete({ where: { id: momentoId } });
  await logActividad(
    session.id,
    "ELIMINAR",
    "ShowMomento",
    momentoId,
    `Quitó «${existente.titulo}» del día del show`,
    { showId: existente.showId, llave: existente.llave, esAncla: existente.esAncla },
  );

  return NextResponse.json({ ok: true });
}
