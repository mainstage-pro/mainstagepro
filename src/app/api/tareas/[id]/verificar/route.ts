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
  // Cuando el ítem es una ocurrencia recurrente archivada, el cliente manda el
  // timestamp `ocurrenciaAt`: la verificación/rechazo se aplica a esa entrada del
  // historial, no a la fila viva (que ya avanzó a la próxima ocurrencia).
  const ocurrenciaAt = typeof body.ocurrenciaAt === "string" ? body.ocurrenciaAt : null;

  if (ocurrenciaAt) {
    return verificarOcurrencia(id, ocurrenciaAt, accion, body, session);
  }

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
        // Reabrir limpia la marca de "no realizada" para que la tarea vuelva viva.
        noRealizada: false,
        motivoNoRealizada: null,
        justificacionNoRealizada: null,
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

// Verifica/rechaza una ocurrencia archivada en `evidenciasHistorial`. La fila
// viva de una tarea recurrente ya avanzó a la próxima fecha, así que el estado de
// verificación de la ocurrencia cerrada vive en su entrada del historial.
async function verificarOcurrencia(
  id: string,
  ocurrenciaAt: string,
  accion: string | undefined,
  body: Record<string, unknown>,
  session: { id: string; name?: string | null },
) {
  const t = await prisma.tarea.findUnique({
    where: { id },
    select: { id: true, evidenciasHistorial: true, asignadoAId: true, titulo: true },
  });
  if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let hist: Record<string, unknown>[] = [];
  try {
    const parsed = t.evidenciasHistorial ? JSON.parse(t.evidenciasHistorial) : [];
    if (Array.isArray(parsed)) hist = parsed as Record<string, unknown>[];
  } catch {
    return NextResponse.json({ error: "Historial ilegible" }, { status: 500 });
  }

  const idx = hist.findIndex((h) => h.completadaAt === ocurrenciaAt);
  if (idx < 0) return NextResponse.json({ error: "Ocurrencia no encontrada" }, { status: 404 });

  if (accion === "VERIFICAR") {
    hist[idx] = {
      ...hist[idx],
      estadoVerificacion: "VERIFICADA",
      verificadaPorId: session.id,
      verificadaPor: session.name ?? null,
      verificadaAt: new Date().toISOString(),
      motivoRechazo: null,
    };
    await prisma.tarea.update({ where: { id }, data: { evidenciasHistorial: JSON.stringify(hist) } });
    return NextResponse.json({ ok: true, ocurrenciaAt, estadoVerificacion: "VERIFICADA" });
  }

  if (accion === "RECHAZAR") {
    const motivo = (body.motivoRechazo as string | undefined)?.trim();
    if (!motivo) {
      return NextResponse.json({ error: "El motivo de rechazo es obligatorio", code: "MOTIVO_REQUERIDO" }, { status: 422 });
    }
    hist[idx] = {
      ...hist[idx],
      estadoVerificacion: "RECHAZADA",
      verificadaPorId: session.id,
      verificadaPor: session.name ?? null,
      verificadaAt: new Date().toISOString(),
      motivoRechazo: motivo,
    };
    await prisma.tarea.update({ where: { id }, data: { evidenciasHistorial: JSON.stringify(hist) } });

    // Notificar al responsable que su evidencia fue rechazada.
    if (t.asignadoAId && t.asignadoAId !== session.id) {
      await prisma.notificacion.create({
        data: {
          usuarioId: t.asignadoAId,
          tipo:      "TAREA",
          titulo:    t.titulo,
          mensaje:   `${session.name} rechazó tu evidencia: ${motivo}`,
          url:       `/operaciones?open=${id}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, ocurrenciaAt, estadoVerificacion: "RECHAZADA" });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
