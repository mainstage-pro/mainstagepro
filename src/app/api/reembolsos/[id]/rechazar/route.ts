import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";
import { ensureReembolsos } from "@/lib/reembolsos";
import { logActividad } from "@/lib/actividad";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerificar(session)) return NextResponse.json({ error: "Solo administración puede rechazar" }, { status: 403 });

  await ensureReembolsos();
  const { id } = await params;
  const { motivo } = await req.json();
  if (!motivo?.trim()) return NextResponse.json({ error: "Escribe el motivo del rechazo" }, { status: 400 });

  const solicitud = await prisma.solicitudReembolso.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (solicitud.estado !== "PENDIENTE") return NextResponse.json({ error: "Ya fue revisada" }, { status: 400 });

  const actualizada = await prisma.solicitudReembolso.update({
    where: { id },
    data: {
      estado: "RECHAZADO",
      revisadoPorId: session.id,
      revisadoEn: new Date(),
      motivoRechazo: motivo.trim(),
    },
    include: {
      solicitante: { select: { id: true, name: true } },
      revisadoPor: { select: { id: true, name: true } },
      categoria: { select: { id: true, nombre: true } },
      proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
      cuentaPagar: { select: { id: true, estado: true, monto: true, montoPagado: true, fechaCompromiso: true } },
    },
  });

  await logActividad(session.id, "RECHAZAR", "reembolso", id, `Rechazó el reembolso ${solicitud.folio}: ${motivo.trim()}`);

  return NextResponse.json({ solicitud: actualizada });
}
