import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureActasFaltas } from "@/lib/migraciones-lazy";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureActasFaltas();
  const { id } = await params;
  const acta = await prisma.actaAdministrativa.findUnique({
    where: { id },
    include: {
      personal: { select: { id: true, nombre: true, puesto: true } },
      tipo: { select: { id: true, nombre: true, codigo: true, categoria: true } },
    },
  });
  if (!acta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ acta });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureActasFaltas();
  const { id } = await params;
  const body = await req.json();

  const actual = await prisma.actaAdministrativa.findUnique({ where: { id }, select: { incidenciaId: true } });
  if (!actual) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of ["hechos", "consecuencia", "descargo", "evidenciaUrl", "estado"] as const) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  // Anular el acta también rechaza el descuento ligado (si sigue propuesto).
  if (body.estado === "ANULADA" && actual.incidenciaId) {
    await prisma.incidencia.updateMany({
      where: { id: actual.incidenciaId, estado: "PROPUESTA" },
      data: { estado: "RECHAZADA" },
    });
  }

  const acta = await prisma.actaAdministrativa.update({
    where: { id },
    data,
    include: {
      personal: { select: { id: true, nombre: true, puesto: true } },
      tipo: { select: { id: true, nombre: true, codigo: true, categoria: true } },
    },
  });
  return NextResponse.json({ acta });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureActasFaltas();
  const { id } = await params;

  const acta = await prisma.actaAdministrativa.findUnique({ where: { id }, select: { incidenciaId: true } });
  if (acta?.incidenciaId) {
    await prisma.incidencia.deleteMany({ where: { id: acta.incidenciaId, estado: "PROPUESTA" } });
  }
  await prisma.actaAdministrativa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
