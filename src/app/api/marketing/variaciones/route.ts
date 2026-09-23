import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { codigoSugerido, etiquetaSlot, slotsDelCiclo } from "@/lib/contenido-variaciones";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipoId = new URL(request.url).searchParams.get("tipoId");
  const variaciones = await prisma.variacionContenido.findMany({
    where: tipoId ? { tipoId } : {},
    orderBy: [{ tipoId: "asc" }, { semana: "asc" }, { posicion: "asc" }],
  });
  return NextResponse.json({ variaciones });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { tipoId, generarRejilla } = body;
  if (!tipoId) return NextResponse.json({ error: "Tipo requerido" }, { status: 400 });

  const tipo = await prisma.tipoContenido.findUnique({ where: { id: tipoId } });
  if (!tipo) return NextResponse.json({ error: "Tipo no encontrado" }, { status: 404 });

  // Modo rejilla: crea de golpe los slots del ciclo que aún no existen.
  if (generarRejilla) {
    const existentes = await prisma.variacionContenido.findMany({
      where: { tipoId },
      select: { semana: true, posicion: true },
    });
    const ocupados = new Set(existentes.map(v => `${v.semana}-${v.posicion}`));
    const faltantes = slotsDelCiclo(tipo).filter(s => !ocupados.has(`${s.semana}-${s.posicion}`));

    if (faltantes.length === 0) return NextResponse.json({ creadas: 0 });

    const { count } = await prisma.variacionContenido.createMany({
      data: faltantes.map(s => ({
        tipoId,
        codigo: codigoSugerido(tipo.nombre, s.semana, s.posicion),
        nombre: etiquetaSlot(tipo, s.semana, s.posicion),
        semana: s.semana,
        posicion: s.posicion,
      })),
    });
    return NextResponse.json({ creadas: count }, { status: 201 });
  }

  const semana = Number(body.semana) || 1;
  const posicion = Number(body.posicion) || 1;
  const variacion = await prisma.variacionContenido.create({
    data: {
      tipoId,
      codigo: body.codigo?.trim() || codigoSugerido(tipo.nombre, semana, posicion),
      nombre: body.nombre?.trim() || etiquetaSlot(tipo, semana, posicion),
      semana,
      posicion,
      descripcion: body.descripcion || null,
    },
  });
  return NextResponse.json({ variacion }, { status: 201 });
}
