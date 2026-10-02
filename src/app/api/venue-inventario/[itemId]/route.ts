import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DISCIPLINAS } from "@/lib/giras";

const CONDICIONES = ["BUENO", "REGULAR", "MALO", "DESCONOCIDO"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { itemId } = await params;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("disciplina" in body) {
    const v = body.disciplina;
    if (typeof v !== "string" || !DISCIPLINAS.includes(v as (typeof DISCIPLINAS)[number])) {
      return NextResponse.json({ error: "Disciplina inválida" }, { status: 400 });
    }
    data.disciplina = v;
  }

  if ("concepto" in body) {
    const texto = typeof body.concepto === "string" ? body.concepto.trim() : "";
    if (!texto) return NextResponse.json({ error: "El concepto no puede quedar vacío" }, { status: 400 });
    data.concepto = texto;
  }

  for (const f of ["marca", "modelo", "notas"]) {
    if (!(f in body)) continue;
    const texto = typeof body[f] === "string" ? body[f].trim() : "";
    data[f] = texto || null;
  }

  if ("condicion" in body) {
    const v = body.condicion;
    data.condicion = typeof v === "string" && CONDICIONES.includes(v as (typeof CONDICIONES)[number]) ? v : null;
  }

  if ("cantidad" in body) {
    const n = Number(body.cantidad);
    data.cantidad = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 1;
  }

  if ("costoExtra" in body) {
    const v = body.costoExtra;
    if (v === null || v === "" || v === undefined) data.costoExtra = null;
    else {
      const n = Number(v);
      data.costoExtra = Number.isFinite(n) ? n : null;
    }
  }

  if ("incluidoEnRenta" in body) data.incluidoEnRenta = !!body.incluidoEnRenta;

  // Marcar como verificado sella quién lo revisó y cuándo; desmarcar limpia el sello.
  if ("verificado" in body) {
    if (body.verificado) {
      data.verificadoEn = new Date();
      data.verificadoPor = session.name ?? session.email;
    } else {
      data.verificadoEn = null;
      data.verificadoPor = null;
    }
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  try {
    const item = await prisma.venueInventario.update({ where: { id: itemId }, data });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { itemId } = await params;

  try {
    await prisma.venueInventario.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 404 });
  }
}
