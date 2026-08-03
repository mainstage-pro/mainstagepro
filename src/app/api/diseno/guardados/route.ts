import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Diseños guardados: lista (filtrable por proyecto/plantilla) y creación.
async function guard() {
  const s = await getSession();
  return s && s.email === OWNER_EMAIL ? s : null;
}

export async function GET(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(req.url);
  const proyectoId = url.searchParams.get("proyectoId");
  const template = url.searchParams.get("template");
  const where: { proyectoId?: string; template?: string } = {};
  if (proyectoId) where.proyectoId = proyectoId;
  if (template) where.template = template;
  const items = await prisma.disenoGuardado.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { template, proyectoId, titulo, overrides } = body ?? {};
  if (!template || !titulo) {
    return NextResponse.json({ error: "Faltan campos (template, titulo)" }, { status: 400 });
  }
  const item = await prisma.disenoGuardado.create({
    data: {
      template: String(template),
      proyectoId: proyectoId ? String(proyectoId) : null,
      titulo: String(titulo),
      overrides: overrides ?? {},
      estado: "GUARDADO",
    },
  });
  return NextResponse.json({ item });
}
