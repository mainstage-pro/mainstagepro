import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEstrategiaSchema } from "../route";

async function guard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  await ensureEstrategiaSchema();
  return session;
}

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  if (!b.areaId) return NextResponse.json({ error: "Área requerida" }, { status: 400 });
  const descripcion = (b.descripcion ?? "").trim();
  const metrica = (b.metrica ?? "").trim();
  if (!descripcion || !metrica) {
    return NextResponse.json({ error: "Descripción y métrica de éxito requeridas" }, { status: 400 });
  }
  // Todo objetivo cuelga de la meta vigente: no hay objetivos huérfanos.
  const meta = await prisma.metaGlobal.findFirst({ where: { vigente: true }, select: { id: true } });
  const ultimo = await prisma.objetivoArea.findFirst({
    where: { areaId: b.areaId },
    orderBy: { orden: "desc" },
  });
  const objetivo = await prisma.objetivoArea.create({
    data: {
      areaId: b.areaId,
      metaGlobalId: meta?.id ?? null,
      descripcion,
      metrica,
      unidad: b.unidad || "número",
      lineaBase: num(b.lineaBase),
      valorMeta: num(b.valorMeta),
      valorActual: num(b.valorActual),
      kpiSlug: b.kpiSlug || null,
      fechaLimite: b.fechaLimite ? new Date(b.fechaLimite) : null,
      orden: (ultimo?.orden ?? -1) + 1,
    },
    include: { tacticas: true },
  });
  return NextResponse.json({ objetivo }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const objetivo = await prisma.objetivoArea.update({
    where: { id: b.id },
    data: {
      ...(b.descripcion !== undefined ? { descripcion: String(b.descripcion).trim() } : {}),
      ...(b.metrica !== undefined ? { metrica: String(b.metrica).trim() } : {}),
      ...(b.unidad !== undefined ? { unidad: b.unidad } : {}),
      ...(b.lineaBase !== undefined ? { lineaBase: num(b.lineaBase) } : {}),
      ...(b.valorMeta !== undefined ? { valorMeta: num(b.valorMeta) } : {}),
      ...(b.valorActual !== undefined ? { valorActual: num(b.valorActual) } : {}),
      ...(b.kpiSlug !== undefined ? { kpiSlug: b.kpiSlug || null } : {}),
      ...(b.fechaLimite !== undefined
        ? { fechaLimite: b.fechaLimite ? new Date(b.fechaLimite) : null }
        : {}),
      ...(b.orden !== undefined ? { orden: Number(b.orden) } : {}),
    },
    include: { tacticas: { orderBy: { orden: "asc" } } },
  });
  return NextResponse.json({ objetivo });
}

export async function DELETE(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.objetivoArea.update({ where: { id }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
