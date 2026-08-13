import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCalendariosTabla } from "@/lib/migraciones-lazy";

// Campos editables → columna. Valores se normalizan abajo.
const CAMPOS: Record<string, string> = {
  tipo: "tipo",
  titulo: "titulo",
  descripcion: "descripcion",
  anio: "anio",
  mesInicio: "mes_inicio",
  diaInicio: "dia_inicio",
  mesFin: "mes_fin",
  diaFin: "dia_fin",
  color: "color",
  icono: "icono",
  ideas: "ideas",
  tipoEventoSlug: "tipo_evento_slug",
  servicio: "servicio",
  orden: "orden",
};
const NUMERICOS = new Set(["anio", "mesInicio", "diaInicio", "mesFin", "diaFin", "orden"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCalendariosTabla();
  const { id } = await params;

  const b = await req.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [campo, col] of Object.entries(CAMPOS)) {
    if (!(campo in b)) continue;
    let v = b[campo];
    if (v === "" || v === undefined) v = null;
    else if (NUMERICOS.has(campo)) v = v == null ? null : Number(v);
    else if (typeof v === "string") v = v.trim() || null;
    sets.push(`${col} = $${i++}`);
    vals.push(v);
  }
  if (sets.length === 0) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  vals.push(id);
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `UPDATE calendario_entradas SET ${sets.join(", ")} WHERE id = $${i} RETURNING id`, ...vals,
  );
  if (rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCalendariosTabla();
  const { id } = await params;
  await prisma.$executeRawUnsafe(`UPDATE calendario_entradas SET activo = false WHERE id = $1`, id);
  return NextResponse.json({ ok: true });
}
