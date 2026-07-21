import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createProyecto, getProyectosPublicos } from "@/lib/proyectos";

// GET: lista para admin (incluye borradores). Público usa /api/proyectos/publico.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? undefined;
  const proyectos = await getProyectosPublicos(tipo);
  return NextResponse.json({ proyectos });
}

// POST: crear proyecto (borrador en blanco o con datos).
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const proyecto = await createProyecto(body ?? {});
  return NextResponse.json({ proyecto }, { status: 201 });
}
