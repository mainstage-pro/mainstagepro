import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureTiposMovimiento } from "@/lib/tipos-movimiento";

const NATURALEZAS = ["ENTRADA", "SALIDA", "NEUTRO"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTiposMovimiento();
  const { id } = await params;
  const tipo = await prisma.tipoMovimiento.findUnique({ where: { id } });
  if (!tipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("nombre" in body && body.nombre?.trim()) data.nombre = body.nombre.trim();
  if ("color" in body) data.color = body.color;
  if ("orden" in body) data.orden = body.orden;
  if ("activo" in body) data.activo = Boolean(body.activo);

  // La naturaleza y afectaResultado de los tipos del sistema no se tocan:
  // cambiarlas alteraría la clasificación histórica de los reportes.
  if (!tipo.sistema) {
    if ("naturaleza" in body) {
      if (!NATURALEZAS.includes(body.naturaleza)) return NextResponse.json({ error: "Naturaleza inválida" }, { status: 400 });
      data.naturaleza = body.naturaleza;
      if (body.naturaleza === "NEUTRO") data.afectaResultado = false;
    }
    if ("afectaResultado" in body && data.afectaResultado === undefined) {
      data.afectaResultado = Boolean(body.afectaResultado);
    }
  }

  const updated = await prisma.tipoMovimiento.update({ where: { id }, data });
  return NextResponse.json({ tipo: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureTiposMovimiento();
  const { id } = await params;
  const tipo = await prisma.tipoMovimiento.findUnique({ where: { id } });
  if (!tipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (tipo.sistema) {
    return NextResponse.json({ error: "No se puede eliminar un tipo del sistema. Puedes desactivarlo." }, { status: 400 });
  }

  const [usadoMov, usadoCat] = await Promise.all([
    prisma.movimientoFinanciero.count({ where: { tipo: tipo.clave } }),
    prisma.categoriaFinanciera.count({ where: { tipo: tipo.clave } }),
  ]);
  if (usadoMov > 0 || usadoCat > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: hay ${usadoMov} movimiento(s) y ${usadoCat} categoría(s) usando este tipo. Desactívalo en su lugar.` },
      { status: 400 }
    );
  }

  await prisma.tipoMovimiento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
