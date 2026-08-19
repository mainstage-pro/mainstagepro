import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncFechaProximaAccion } from "@/app/api/seguimientos/route";
import { ensureSeguimientoEtapaCol } from "@/lib/etapaSeguimientos";

// Migración lazy YA APLICADA en prod (verificado 2026-08-19: tratos.requiereRevision
// ya existe). No-op: ver nota en src/app/api/tratos/[id]/route.ts sobre por qué el
// ALTER TABLE incondicional es peligroso.
async function ensureRequiereRevision() {}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await ensureRequiereRevision();
  await ensureSeguimientoEtapaCol();

  const data: Record<string, unknown> = {};
  if ("completado" in body) {
    data.completado = body.completado;
    if (body.completado) data.fechaCompletado = new Date();
  }
  if ("notaResultado" in body) data.notaResultado = body.notaResultado ?? null;
  if ("nota" in body) data.nota = body.nota ?? null;
  if ("canal" in body) data.canal = body.canal;
  if ("titulo" in body) data.titulo = body.titulo;
  if ("guionSnapshot" in body) data.guionSnapshot = body.guionSnapshot ?? null;
  if ("fechaProgramada" in body) data.fechaProgramada = new Date(body.fechaProgramada);

  const seguimiento = await prisma.seguimiento.update({
    where: { id },
    data,
    include: {
      trato: {
        select: {
          id: true, etapa: true, nombreEvento: true,
          cliente: { select: { nombre: true } },
        },
      },
    },
  });

  // Bloque 7: si se completó el seguimiento auto #3 y el trato sigue abierto, marcar requiereRevision
  if (body.completado && seguimiento.tipo === "PROCESO" && seguimiento.numero === 3) {
    const etapaAbierta = ["DESCUBRIMIENTO", "OPORTUNIDAD"].includes(seguimiento.trato.etapa);
    if (etapaAbierta) {
      await prisma.$executeRawUnsafe(
        `UPDATE tratos SET "requiereRevision" = true WHERE id = $1`,
        seguimiento.trato.id
      );
    }
  }

  // Sync fechaProximaAccion whenever a seguimiento is completed or its date changes
  if ("completado" in body || "fechaProgramada" in body) {
    await syncFechaProximaAccion(seguimiento.trato.id);
  }

  return NextResponse.json({ seguimiento });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  await ensureSeguimientoEtapaCol();

  // Read tratoId before deleting
  const seg = await prisma.seguimiento.findUnique({ where: { id }, select: { tratoId: true } });

  await prisma.seguimiento.delete({ where: { id } });

  // Sync fechaProximaAccion — will set to null if no pending seguimientos remain
  if (seg?.tratoId) {
    await syncFechaProximaAccion(seg.tratoId);
  }

  return NextResponse.json({ ok: true });
}
