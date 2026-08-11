import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";

function toJson(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() ? v : null;
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  return JSON.stringify(v);
}

type ReglaInput = { condicion?: unknown; categoriasEquipo?: unknown; adicionalIds?: unknown };
function limpiarReglas(raw: unknown): { condicion: string; categoriasEquipo: string | null; adicionalIds: string | null }[] {
  if (!Array.isArray(raw)) return [];
  return (raw as ReglaInput[]).map((r) => ({
    condicion: toJson(r.condicion) ?? JSON.stringify({ op: "truthy" }),
    categoriasEquipo: toJson(r.categoriasEquipo),
    adicionalIds: toJson(r.adicionalIds),
  }));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.texto !== undefined) data.texto = String(body.texto).trim();
  if (body.tipoRespuesta !== undefined) data.tipoRespuesta = body.tipoRespuesta || "SI_NO";
  if (body.opciones !== undefined) data.opciones = toJson(body.opciones);
  if (body.nichos !== undefined) data.nichos = toJson(body.nichos);
  if (body.orden !== undefined) data.orden = Number(body.orden) || 0;
  if (body.activa !== undefined) data.activa = !!body.activa;

  const reemplazaReglas = Array.isArray(body.reglas);
  const reglas = reemplazaReglas ? limpiarReglas(body.reglas) : [];

  await prisma.$transaction(async (tx) => {
    await tx.preguntaDescubrimiento.update({ where: { id }, data });
    if (reemplazaReglas) {
      await tx.reglaPregunta.deleteMany({ where: { preguntaId: id } });
      if (reglas.length) await tx.reglaPregunta.createMany({ data: reglas.map((r) => ({ preguntaId: id, ...r })) });
    }
  });

  const pregunta = await prisma.preguntaDescubrimiento.findUnique({ where: { id }, include: { reglas: true } });
  return NextResponse.json({ pregunta });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await ensureCatalogoTables();

  const { id } = await params;
  await prisma.preguntaDescubrimiento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
