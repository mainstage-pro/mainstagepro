import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  CUBIERTO_POR,
  DISCIPLINAS,
  ESTADOS_ADVANCE,
  PRIORIDADES,
} from "@/lib/giras";

/// El advance no captura proveedor ni costo: eso se deriva del rider del
/// proyecto (`src/lib/proveedor-equipos.ts`). Por eso ni se lee ni se escribe aquí.
const INCLUDE = {
  riderLinea: { select: { id: true, concepto: true, cantidad: true, prioridad: true, preferido: true, aceptables: true } },
} as const;

const ENUMS: Record<string, readonly string[]> = {
  disciplina: DISCIPLINAS,
  prioridad: PRIORIDADES,
  cubiertoPor: CUBIERTO_POR,
  estado: ESTADOS_ADVANCE,
};

const TEXTO = ["concepto", "ofrecidoCasa", "notas"];
const ENTEROS = ["cantidadPedida", "cantidadCasa", "orden"];
const BOOLEANOS = ["pedirAlPromotor"];

/**
 * Edición renglón por renglón. Nunca hay un PUT que recree el advance: las filas
 * conservan su id para no romper lo que ya apunta a ellas.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lineaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { lineaId } = await params;

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

  for (const f of TEXTO) {
    if (!(f in body)) continue;
    const v = body[f];
    const texto = typeof v === "string" ? v.trim() : "";
    if (f === "concepto") {
      if (!texto) return NextResponse.json({ error: "El concepto no puede quedar vacío" }, { status: 400 });
      data[f] = texto;
    } else {
      data[f] = texto || null;
    }
  }

  for (const f of ENTEROS) {
    if (!(f in body)) continue;
    const n = Number(body[f]);
    data[f] = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }

  for (const f of BOOLEANOS) {
    if (!(f in body)) continue;
    data[f] = !!body[f];
  }

  // No se le pide al promotor algo que ya se decidió que no aplica en esta fecha.
  if (data.cubiertoPor === "NO_APLICA") data.pedirAlPromotor = false;

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  try {
    const linea = await prisma.showRiderLinea.update({ where: { id: lineaId }, data, include: INCLUDE });
    return NextResponse.json({ linea });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el renglón" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ lineaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { lineaId } = await params;

  try {
    await prisma.showRiderLinea.delete({ where: { id: lineaId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo quitar el renglón" }, { status: 404 });
  }
}
