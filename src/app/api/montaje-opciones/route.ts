import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TIPOS = ["CONFIGURACION", "SOPORTE", "ZONA"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const opciones = await prisma.montajeOpcion.findMany({
    where: { activo: true },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ opciones });
}

/** Guarda una opción escrita a mano para reutilizarla en futuros proyectos. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const tipo = String(body.tipo ?? "");
  const label = String(body.label ?? "").trim();
  if (!TIPOS.includes(tipo) || !label) {
    return NextResponse.json({ error: "Tipo o texto inválido" }, { status: 400 });
  }

  const categoria = tipo === "ZONA" ? null : body.categoria || null;
  const disciplina = tipo === "ZONA" ? null : body.disciplina || null;

  const existente = await prisma.montajeOpcion.findFirst({ where: { tipo, label, categoria } });
  if (existente) {
    const opcion = existente.activo
      ? existente
      : await prisma.montajeOpcion.update({ where: { id: existente.id }, data: { activo: true } });
    return NextResponse.json({ opcion });
  }

  const opcion = await prisma.montajeOpcion.create({ data: { tipo, label, categoria, disciplina } });
  return NextResponse.json({ opcion });
}
