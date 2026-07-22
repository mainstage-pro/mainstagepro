import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

// POST /api/tareas/[id]/verificar
// Body: { accion: "VERIFICAR" } | { accion: "RECHAZAR", motivoRechazo: string }
// Sólo Administración o Dirección (o ADMIN) pueden verificar/rechazar.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerificar(session)) return NextResponse.json({ error: "Sin permiso para verificar" }, { status: 403 });
  await ensureTareaColumns();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const accion = body.accion as string | undefined;

  const actual = await prisma.tarea.findUnique({
    where: { id },
    select: {
      id: true,
      estadoVerificacion: true,
      asignadoAId: true,
      titulo: true,
    },
  });
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (accion === "VERIFICAR") {
    const tarea = await prisma.tarea.update({
      where: { id },
      data: {
        estadoVerificacion: "VERIFICADA",
        verificadaPorId: session.id,
        verificadaAt: new Date(),
        motivoRechazo: null,
      },
      select: { id: true, estadoVerificacion: true, verificadaAt: true },
    });
    return NextResponse.json({ tarea });
  }

  if (accion === "RECHAZAR") {
    const motivo = (body.motivoRechazo as string | undefined)?.trim();
    if (!motivo) {
      return NextResponse.json({ error: "El motivo de rechazo es obligatorio", code: "MOTIVO_REQUERIDO" }, { status: 422 });
    }
    const tarea = await prisma.tarea.update({
      where: { id },
      data: {
        estado: "PENDIENTE",
        estadoVerificacion: "RECHAZADA",
        motivoRechazo: motivo,
        fechaCompletada: null,
        verificadaPorId: session.id,
        verificadaAt: new Date(),
      },
      select: { id: true, estado: true, estadoVerificacion: true, asignadoAId: true, titulo: true },
    });

    // Notificar al responsable que su tarea fue rechazada
    if (tarea.asignadoAId && tarea.asignadoAId !== session.id) {
      await prisma.notificacion.create({
        data: {
          usuarioId: tarea.asignadoAId,
          tipo:      "TAREA",
          titulo:    tarea.titulo,
          mensaje:   `${session.name} rechazó tu evidencia: ${motivo}`,
          url:       `/operaciones?open=${id}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ tarea });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
