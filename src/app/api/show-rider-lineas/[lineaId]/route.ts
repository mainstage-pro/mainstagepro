import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  CUBIERTO_POR,
  DISCIPLINAS,
  ESTADOS_ADVANCE,
  PRIORIDADES,
} from "@/lib/giras";

const INCLUDE = {
  proveedor: { select: { id: true, nombre: true, empresa: true } },
  equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } },
  riderLinea: { select: { id: true, concepto: true, cantidad: true, prioridad: true, preferido: true, aceptables: true } },
} as const;

const ENUMS: Record<string, readonly string[]> = {
  disciplina: DISCIPLINAS,
  prioridad: PRIORIDADES,
  cubiertoPor: CUBIERTO_POR,
  estado: ESTADOS_ADVANCE,
};

const TEXTO = ["concepto", "ofrecidoCasa", "notas"];
const ENTEROS = ["cantidadPedida", "cantidadCasa", "cantidadCubierta", "orden"];
const DECIMALES = ["costoEstimado", "costoConfirmado"];
const RELACIONES = ["proveedorId", "equipoId"];

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

  for (const f of DECIMALES) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v === null || v === "" || v === undefined) data[f] = null;
    else {
      const n = Number(v);
      data[f] = Number.isFinite(n) ? n : null;
    }
  }

  for (const f of RELACIONES) {
    if (!(f in body)) continue;
    const v = body[f];
    data[f] = typeof v === "string" && v ? v : null;
  }

  if ("aprobadoPorArtista" in body) data.aprobadoPorArtista = !!body.aprobadoPorArtista;

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
