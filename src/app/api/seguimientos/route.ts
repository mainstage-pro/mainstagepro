import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSeguimientoEtapaCol } from "@/lib/etapaSeguimientos";
import { ensureProcesoVentaColumns } from "@/lib/migraciones-lazy";

// ── Helper: recalculate and save fechaProximaAccion on the trato ─────────────
// Sets it to the earliest pending (not completed) seguimiento, or null if none.
export async function syncFechaProximaAccion(tratoId: string) {
  const next = await prisma.seguimiento.findFirst({
    where: { tratoId, completado: false },
    orderBy: { fechaProgramada: "asc" },
    select: { fechaProgramada: true },
  });
  await prisma.trato.update({
    where: { id: tratoId },
    data: { fechaProximaAccion: next?.fechaProgramada ?? null },
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureSeguimientoEtapaCol();
  await ensureProcesoVentaColumns();

  const { searchParams } = new URL(req.url);
  const tratoId = searchParams.get("tratoId");
  const filtro = searchParams.get("filtro"); // vencidos | hoy | semana | completados

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
  const finSemana = new Date(hoy); finSemana.setDate(finSemana.getDate() + 7);

  const where: Record<string, unknown> = {};
  if (tratoId) where.tratoId = tratoId;

  if (filtro === "vencidos") {
    where.completado = false;
    where.fechaProgramada = { lt: hoy };
  } else if (filtro === "hoy") {
    where.completado = false;
    where.fechaProgramada = { gte: hoy, lt: manana };
  } else if (filtro === "semana") {
    where.completado = false;
    where.fechaProgramada = { gte: manana, lt: finSemana };
  } else if (filtro === "completados-hoy") {
    where.completado = true;
    where.fechaCompletado = { gte: hoy, lt: manana };
  }

  const seguimientos = await prisma.seguimiento.findMany({
    where,
    include: {
      trato: {
        select: {
          id: true,
          nombreEvento: true,
          fechaEventoEstimada: true,
          etapa: true,
          etapaInterna: true,
          cliente: { select: { nombre: true, empresa: true } },
        },
      },
    },
    orderBy: { fechaProgramada: "asc" },
  });

  return NextResponse.json({ seguimientos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { tratoId, tipo = "manual", canal = "whatsapp", titulo, nota, fechaProgramada, numero } = body;

  if (!tratoId || !titulo || !fechaProgramada) {
    return NextResponse.json({ error: "tratoId, titulo y fechaProgramada son requeridos" }, { status: 400 });
  }

  await ensureSeguimientoEtapaCol();

  // Capturar la etapa de compra del prospecto al momento de agendar
  const tratoEtapa = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { etapa: true },
  });

  const seguimiento = await prisma.seguimiento.create({
    data: {
      tratoId,
      tipo,
      canal,
      titulo,
      nota: nota ?? null,
      numero: numero ?? null,
      etapa: tratoEtapa?.etapa ?? null,
      fechaProgramada: new Date(fechaProgramada),
    },
    include: {
      trato: { select: { id: true, nombreEvento: true, cliente: { select: { nombre: true } } } },
    },
  });

  // Sync fechaProximaAccion so the tratos list reflects the new seguimiento
  await syncFechaProximaAccion(tratoId);

  return NextResponse.json({ seguimiento });
}
