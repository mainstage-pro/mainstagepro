import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncFechaProximaAccion } from "@/app/api/seguimientos/route";
import { defaultEtapaInterna } from "@/lib/etapasInternas";

/**
 * POST /api/tratos/[id]/cotizaciones
 * Crea una nueva cotización independiente para el trato (diferente evento/fecha/equipo).
 * No es una "opción" de una cotización existente — es una cotización nueva para un sub-evento.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: tratoId } = await params;

  // Verificar que el trato existe
  const trato = await prisma.trato.findUnique({
    where: { id: tratoId },
    select: { id: true, clienteId: true, etapa: true },
  });
  if (!trato) return NextResponse.json({ error: "Trato no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { nombreCotizacion } = body;

  // Verificar límite de cotizaciones por trato (50 máximo)
  const cotizacionesExistentes = await prisma.cotizacion.count({
    where: { tratoId },
  });
  if (cotizacionesExistentes >= 50) {
    return NextResponse.json({ error: "Máximo de 50 cotizaciones por trato alcanzado" }, { status: 400 });
  }

  // Generar número de cotización incremental
  const last = await prisma.cotizacion.findFirst({
    orderBy: { numeroCotizacion: "desc" },
    select: { numeroCotizacion: true },
  });
  const lastNum = last ? parseInt(last.numeroCotizacion.replace("COT-", "")) || 0 : 0;
  const numeroCotizacion = `COT-${String(lastNum + 1).padStart(4, "0")}`;

  // Generar nombre por defecto si no se proporcionó
  const nombre = nombreCotizacion?.trim() || `Evento ${cotizacionesExistentes + 1}`;

  const nueva = await prisma.cotizacion.create({
    data: {
      numeroCotizacion,
      version: 1,
      opcionLetra: "A",
      grupoId: null, // será el propio id al crear la primera opción
      estado: "BORRADOR",
      tratoId,
      clienteId: trato.clienteId,
      creadaPorId: session.id,
      nombreCotizacion: nombre,
    },
  });

  // Si el trato estaba en LEAD o DESCUBRIMIENTO, avanzar a OPORTUNIDAD
  if (["LEAD", "DESCUBRIMIENTO"].includes(trato.etapa)) {
    await prisma.trato.update({
      where: { id: tratoId },
      data: { etapa: "OPORTUNIDAD", etapaInterna: defaultEtapaInterna("OPORTUNIDAD") },
    });
    await syncFechaProximaAccion(tratoId);
  }

  return NextResponse.json(
    {
      id: nueva.id,
      numeroCotizacion: nueva.numeroCotizacion,
      nombreCotizacion: nueva.nombreCotizacion,
    },
    { status: 201 }
  );
}
