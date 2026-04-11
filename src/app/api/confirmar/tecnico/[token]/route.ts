import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const personal = await prisma.proyectoPersonal.findUnique({
    where: { confirmToken: token },
    select: {
      id: true,
      confirmRespuesta: true,
      jornada: true,
      responsabilidad: true,
      tarifaAcordada: true,
      proyecto: {
        select: { nombre: true, fechaEvento: true, lugarEvento: true },
      },
      tecnico: {
        select: { nombre: true },
      },
      rolTecnico: {
        select: { nombre: true },
      },
    },
  });

  if (!personal) {
    return NextResponse.json({ error: "Token inválido o no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ personal });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { respuesta, notas } = body as { respuesta: "CONFIRMADO" | "RECHAZADO"; notas?: string };

  if (!["CONFIRMADO", "RECHAZADO"].includes(respuesta)) {
    return NextResponse.json({ error: "Respuesta inválida" }, { status: 400 });
  }

  const personal = await prisma.proyectoPersonal.findUnique({
    where: { confirmToken: token },
    select: { id: true },
  });

  if (!personal) {
    return NextResponse.json({ error: "Token inválido o no encontrado" }, { status: 404 });
  }

  const updated = await prisma.proyectoPersonal.update({
    where: { id: personal.id },
    data: {
      confirmRespuesta: respuesta,
      confirmado: respuesta === "CONFIRMADO",
      ...(notas !== undefined ? { notas } : {}),
    },
  });

  return NextResponse.json({ ok: true, confirmRespuesta: updated.confirmRespuesta });
}
