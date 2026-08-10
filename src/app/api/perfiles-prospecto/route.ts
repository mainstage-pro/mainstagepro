import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PERFIL_CATEGORIAS } from "@/lib/proceso/perfiles";

function parseMateriales(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

function toDTO(p: { id: string; label: string; categoria: string; mensajeInicial: string | null; materiales: string | null }) {
  return {
    id: p.id,
    label: p.label,
    categoria: p.categoria,
    mensajeInicial: p.mensajeInicial,
    materiales: parseMateriales(p.materiales),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const perfiles = await prisma.perfilProspecto.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { label: "asc" }],
  });

  return NextResponse.json({ perfiles: perfiles.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const label: string = (body.label ?? "").trim();
  const categoria: string = body.categoria;

  if (!label) return NextResponse.json({ error: "Nombre del perfil requerido" }, { status: 400 });
  if (!(PERFIL_CATEGORIAS as readonly string[]).includes(categoria)) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const mensajeInicial: string | null = body.mensajeInicial?.trim() || null;
  const materiales: string | null =
    Array.isArray(body.materiales) && body.materiales.length > 0 ? JSON.stringify(body.materiales) : null;

  const perfil = await prisma.perfilProspecto.create({
    data: { label, categoria, mensajeInicial, materiales },
  });

  return NextResponse.json({ perfil: toDTO(perfil) }, { status: 201 });
}
