import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

// PATCH /api/tareas/[id]/evidencia-historial
// Body: { ocurrenciaAt: string, evidenciaNota: string }
// Corrige la nota de una ocurrencia archivada (típicamente una RECHAZADA) y la
// devuelve a PENDIENTE_VERIFICACION para que el verificador la revise de nuevo.
// Sólo el responsable de la tarea o un ADMIN pueden corregir.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const ocurrenciaAt = typeof body.ocurrenciaAt === "string" ? body.ocurrenciaAt : null;
  const evidenciaNota = typeof body.evidenciaNota === "string" ? body.evidenciaNota : null;
  if (!ocurrenciaAt) return NextResponse.json({ error: "Falta ocurrenciaAt" }, { status: 400 });

  const t = await prisma.tarea.findUnique({
    where: { id },
    select: { id: true, evidenciasHistorial: true, asignadoAId: true, tipoEvidencia: true },
  });
  if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const puedeCorregir = session.role === "ADMIN" || t.asignadoAId === session.id;
  if (!puedeCorregir) {
    return NextResponse.json({ error: "Solo el responsable puede corregir la evidencia.", code: "SOLO_RESPONSABLE" }, { status: 403 });
  }

  let hist: Record<string, unknown>[] = [];
  try {
    const parsed = t.evidenciasHistorial ? JSON.parse(t.evidenciasHistorial) : [];
    if (Array.isArray(parsed)) hist = parsed as Record<string, unknown>[];
  } catch {
    return NextResponse.json({ error: "Historial ilegible" }, { status: 500 });
  }

  const idx = hist.findIndex((h) => h.completadaAt === ocurrenciaAt);
  if (idx < 0) return NextResponse.json({ error: "Ocurrencia no encontrada" }, { status: 404 });

  // Validación mínima de la nota cuando la tarea espera texto (NOTA o sin tipo).
  const entry = hist[idx];
  const tipoEvid = (entry.tipoEvidencia as string | null) ?? t.tipoEvidencia;
  const nota = (evidenciaNota ?? "").trim();
  if ((tipoEvid === "NOTA" || tipoEvid === "ENLACE_MODULO" || !tipoEvid) && nota.length < 10) {
    return NextResponse.json({ error: "Escribe una nota de evidencia (mínimo 10 caracteres).", code: "EVIDENCIA_REQUERIDA" }, { status: 422 });
  }

  hist[idx] = {
    ...entry,
    evidenciaNota: nota || null,
    estadoVerificacion: "PENDIENTE_VERIFICACION",
    motivoRechazo: null,
    verificadaPorId: null,
    verificadaPor: null,
    verificadaAt: null,
    corregidaAt: new Date().toISOString(),
    corregidaPor: session.name ?? null,
  };

  await prisma.tarea.update({ where: { id }, data: { evidenciasHistorial: JSON.stringify(hist) } });
  return NextResponse.json({ ok: true, ocurrenciaAt, entry: hist[idx] });
}
