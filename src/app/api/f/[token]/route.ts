import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const trato = await prisma.trato.findUnique({
    where: { formToken: token },
    select: {
      id: true,
      tipoServicio: true,
      tipoEvento: true,
      rutaEntrada: true,
      nombreEvento: true,
      fechaEventoEstimada: true,
      lugarEstimado: true,
      asistentesEstimados: true,
      formEstado: true,
      cliente: { select: { nombre: true } },
    },
  });

  if (!trato) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });
  if (trato.formEstado === "COMPLETADO") return NextResponse.json({ completado: true, trato });

  return NextResponse.json({ trato });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const trato = await prisma.trato.findUnique({
    where: { formToken: token },
    select: { id: true, formEstado: true },
  });

  if (!trato) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });
  if (trato.formEstado === "COMPLETADO") return NextResponse.json({ error: "Ya fue enviado" }, { status: 400 });

  const body = await req.json();

  // Extraer campos clave para actualizar el Trato directamente
  const tratoUpdate: Record<string, unknown> = {
    formRespuestas: JSON.stringify(body),
    formEstado: "COMPLETADO",
    descubrimientoCompleto: true,
  };

  if (body.asistentes) tratoUpdate.asistentesEstimados = parseInt(body.asistentes);
  if (body.lugar) tratoUpdate.lugarEstimado = body.lugar;
  if (body.fechaEvento) tratoUpdate.fechaEventoEstimada = new Date(body.fechaEvento);
  if (body.nombreEvento) tratoUpdate.nombreEvento = body.nombreEvento;
  if (body.presupuesto) tratoUpdate.presupuestoEstimado = parseFloat(body.presupuesto);
  if (body.ciudad) tratoUpdate.lugarEstimado = [body.lugar, body.ciudad].filter(Boolean).join(" · ") || tratoUpdate.lugarEstimado;

  await prisma.trato.update({ where: { id: trato.id }, data: tratoUpdate });

  return NextResponse.json({ ok: true });
}
