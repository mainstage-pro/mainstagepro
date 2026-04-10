import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const personalId = searchParams.get("personalId");
  const mes = searchParams.get("mes");
  const where: Record<string, unknown> = {};
  if (personalId) where.personalId = personalId;
  if (mes) {
    where.fecha = {
      gte: new Date(`${mes}-01`),
      lt: new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1)),
    };
  }
  const incidencias = await prisma.incidencia.findMany({
    where, orderBy: { fecha: "desc" },
    include: {
      personal: { select: { id: true, nombre: true, salario: true, periodoPago: true } },
      tipo: true,
    },
  });
  return NextResponse.json({ incidencias });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const { personalId, tipoId, fecha, descripcion, periodoNomina } = body;
  if (!personalId || !tipoId || !fecha) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const [personal, tipo] = await Promise.all([
    prisma.personalInterno.findUnique({ where: { id: personalId }, select: { salario: true, periodoPago: true } }),
    prisma.tipoIncidencia.findUnique({ where: { id: tipoId } }),
  ]);

  let montoCalculado: number | null = null;
  if (tipo && personal?.salario) {
    const salario = personal.salario;
    const periodos = personal.periodoPago === "QUINCENAL" ? 24 : personal.periodoPago === "SEMANAL" ? 52 : 12;
    const salarioDia = salario / (periodos * (personal.periodoPago === "SEMANAL" ? 5 : personal.periodoPago === "QUINCENAL" ? 15 : 30));
    if (tipo.calculoTipo === "FIJO") montoCalculado = tipo.valor;
    else if (tipo.calculoTipo === "PORCENTAJE_DIA") montoCalculado = salarioDia * (tipo.valor / 100);
    else if (tipo.calculoTipo === "PORCENTAJE_HORA") montoCalculado = (salarioDia / 8) * (tipo.valor / 100);
  }

  const incidencia = await prisma.incidencia.create({
    data: { personalId, tipoId, fecha: new Date(fecha), descripcion, periodoNomina, montoCalculado },
    include: { personal: { select: { id: true, nombre: true } }, tipo: true },
  });
  return NextResponse.json({ incidencia }, { status: 201 });
}
