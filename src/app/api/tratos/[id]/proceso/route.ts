import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcesoTablas, ensureSeguimientoColumns, ensureProcesoVentaColumns } from "@/lib/migraciones-lazy";
import {
  completarSeguimiento,
  descompletarUltimo,
  usarPasoManual,
  cambiarSubetapaManual,
  rutearPorCalificacion,
  completarDescubrimiento,
  generarSiguientePaso,
} from "@/lib/proceso/motor";
import { esEtapaInterna, esMomento } from "@/lib/proceso/valores";

// Todas las transiciones de proceso de un trato pasan por el motor.
// action: completar | descompletar | usar-paso | cambiar-subetapa | rutear | descubrimiento | generar
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await Promise.all([ensureProcesoTablas(), ensureSeguimientoColumns(), ensureProcesoVentaColumns()]);

  const { id: tratoId } = await params;
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "completar": {
        if (!body.seguimientoId) return NextResponse.json({ error: "seguimientoId requerido" }, { status: 400 });
        await completarSeguimiento(body.seguimientoId, body.notaResultado);
        break;
      }
      case "descompletar": {
        await descompletarUltimo(tratoId);
        break;
      }
      case "usar-paso": {
        if (!body.procesoPasoId) return NextResponse.json({ error: "procesoPasoId requerido" }, { status: 400 });
        await usarPasoManual(tratoId, body.procesoPasoId);
        break;
      }
      case "cambiar-subetapa": {
        if (!esEtapaInterna(body.etapaInterna)) return NextResponse.json({ error: "etapaInterna inválida" }, { status: 400 });
        await cambiarSubetapaManual(tratoId, body.etapaInterna);
        break;
      }
      case "rutear": {
        if (!esMomento(body.momentoContratacion)) return NextResponse.json({ error: "momentoContratacion inválido" }, { status: 400 });
        await rutearPorCalificacion(tratoId, body.momentoContratacion);
        break;
      }
      case "descubrimiento": {
        const modo = body.modo === "FORMULARIO" ? "FORMULARIO" : "LLAMADA";
        await completarDescubrimiento(tratoId, modo);
        break;
      }
      case "generar": {
        await generarSiguientePaso(tratoId);
        break;
      }
      default:
        return NextResponse.json({ error: "action desconocida" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del motor" }, { status: 500 });
  }

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { id: true, etapa: true, etapaInterna: true, etapaCambiadaEn: true, fechaProximaAccion: true, proximaAccion: true, descubrimientoNivel: true, descubrimientoCompleto: true, modoDescubrimiento: true },
  });

  return NextResponse.json({ ok: true, trato });
}

// Devuelve el paso actual (seguimiento de proceso activo) + info de subetapa.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await Promise.all([ensureProcesoTablas(), ensureSeguimientoColumns()]);
  const { id: tratoId } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { etapaInterna: true, cliente: { select: { telefono: true } } },
  });
  if (!trato?.etapaInterna) return NextResponse.json({ subetapa: null, pasoActual: null, historial: [], telefono: null });

  const [subetapa, pasoActual, historial] = await Promise.all([
    prisma.procesoSubetapa.findUnique({
      where: { etapaInterna: trato.etapaInterna },
      include: { pasos: { where: { activo: true }, orderBy: { orden: "asc" } } },
    }),
    prisma.seguimiento.findFirst({
      where: { tratoId, tipo: "PROCESO", completado: false },
      orderBy: { fechaProgramada: "asc" },
    }),
    prisma.seguimiento.findMany({
      where: { tratoId, tipo: "PROCESO", completado: true },
      orderBy: { fechaCompletado: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ subetapa, pasoActual, historial, telefono: trato.cliente?.telefono ?? null });
}
