import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/plan-trabajo/instancias/[id]
// Body: { accion: "completar" | "reabrir" | "omitir" | "en_progreso", notas?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { accion, notas } = body;

  const instancia = await prisma.pTTareaInstancia.findUnique({ where: { id } });
  if (!instancia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Solo el responsable o admin puede modificar
  const isAdmin = session.role === "ADMIN" || session.role === "DIRECTOR";
  if (instancia.responsableId !== session.id && !isAdmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  let nuevoEstado: string;
  let completadaAt: Date | null = null;
  let completadaPorId: string | null = null;
  let accionHistorial: string;

  switch (accion) {
    case "completar":
      nuevoEstado = "COMPLETADA";
      completadaAt = new Date();
      completadaPorId = session.id;
      accionHistorial = "COMPLETADA";
      break;
    case "reabrir":
      nuevoEstado = "PENDIENTE";
      accionHistorial = "REABIERTA";
      break;
    case "omitir":
      nuevoEstado = "OMITIDA";
      accionHistorial = "OMITIDA";
      break;
    case "en_progreso":
      nuevoEstado = "EN_PROGRESO";
      accionHistorial = "COMENTADA"; // reutilizamos
      break;
    default:
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const updated = await prisma.pTTareaInstancia.update({
    where: { id },
    data: {
      estado: nuevoEstado,
      notas: notas ?? instancia.notas,
      ...(completadaAt ? { completadaAt } : { completadaAt: null }),
      ...(completadaPorId ? { completadaPorId } : {}),
    },
    include: {
      template: { include: { area: true, subArea: true } },
      responsable: { select: { id: true, name: true, email: true } },
      subtareasInstancia: { include: { subtarea: true } },
    },
  });

  // Registrar en historial
  await prisma.pTHistorialEjecucion.create({
    data: {
      instanciaId: id,
      usuarioId: session.id,
      accion: accionHistorial,
      detalles: notas ? JSON.stringify({ notas }) : null,
    },
  });

  return NextResponse.json({ instancia: updated });
}

// GET /api/plan-trabajo/instancias/[id] — detalle completo
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const instancia = await prisma.pTTareaInstancia.findUnique({
    where: { id },
    include: {
      template: { include: { area: true, subArea: true } },
      responsable: { select: { id: true, name: true, email: true } },
      completadaPor: { select: { id: true, name: true } },
      subtareasInstancia: {
        include: { subtarea: true },
        orderBy: { subtarea: { orden: "asc" } },
      },
      comentarios: {
        include: { autor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      historial: {
        include: { usuario: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!instancia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ instancia });
}
