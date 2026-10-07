import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CUBIERTO_POR, DISCIPLINAS, ESTADOS_ADVANCE, PRIORIDADES, UNIDADES_RIDER } from "@/lib/giras";

/// Edición renglón por renglón. Nunca hay un PUT que recree el reparto: las filas
/// conservan su id para no romper lo que ya apunta a ellas.
const ENUMS: Record<string, readonly string[]> = {
  disciplina: DISCIPLINAS,
  prioridad: PRIORIDADES,
  cubiertoPor: CUBIERTO_POR,
  estado: ESTADOS_ADVANCE,
};

/// `unidad` va aparte porque sí se puede vaciar: no todo renglón tiene unidad.
const TEXTO_OPCIONAL = ["especificaciones", "porConseguir", "notas"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const [campo, validos] of Object.entries(ENUMS)) {
    if (!(campo in body)) continue;
    const v = body[campo];
    if (typeof v !== "string" || !validos.includes(v)) {
      return NextResponse.json({ error: `Valor inválido para ${campo}` }, { status: 400 });
    }
    data[campo] = v;
  }

  if ("descripcion" in body) {
    const v = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
    if (!v) return NextResponse.json({ error: "La descripción no puede quedar vacía" }, { status: 400 });
    data.descripcion = v;
  }

  for (const f of TEXTO_OPCIONAL) {
    if (!(f in body)) continue;
    data[f] = typeof body[f] === "string" && body[f].trim() ? body[f].trim() : null;
  }

  if ("unidad" in body) {
    const v = body.unidad;
    data.unidad = typeof v === "string" && (UNIDADES_RIDER as readonly string[]).includes(v) ? v : null;
  }

  // La cantidad se puede dejar en blanco: "microfonía completa" no lleva número.
  if ("cantidad" in body) {
    const n = Number(body.cantidad);
    data.cantidad =
      body.cantidad === null || body.cantidad === "" || !Number.isFinite(n) ? null : Math.max(0, Math.trunc(n));
  }

  if ("orden" in body) {
    const n = Number(body.orden);
    data.orden = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  // Decidir que algo no aplica en esta fecha cierra el renglón: dejarlo
  // "pendiente" lo seguiría contando como abierto en el semáforo y en el PDF.
  if (data.cubiertoPor === "NO_APLICA") data.porConseguir = null;

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  try {
    const reparto = await prisma.showAdvanceReparto.update({ where: { id }, data });
    return NextResponse.json({ reparto });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el renglón" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  try {
    await prisma.showAdvanceReparto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo quitar el renglón" }, { status: 404 });
  }
}
