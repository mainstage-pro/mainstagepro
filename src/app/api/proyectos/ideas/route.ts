import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProyectoIdeasTable } from "@/lib/proyecto-ideas";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureProyectoIdeasTable();
  const ideas = await prisma.proyectoIdea.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ideas });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const titulo = (body.titulo ?? "").trim();
  if (!titulo) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });

  await ensureProyectoIdeasTable();
  const idea = await prisma.proyectoIdea.create({
    data: {
      titulo,
      descripcion: body.descripcion?.trim() || null,
      area: body.area || "GENERAL",
      responsableId: body.responsableId || null,
    },
  });
  return NextResponse.json({ idea });
}
