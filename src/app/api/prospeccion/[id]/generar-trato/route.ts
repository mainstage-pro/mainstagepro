import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function mapOrigen(origen: string): string {
  switch (origen) {
    case "META_ADS":  return "META_ADS";
    case "REFERIDO":  return "REFERIDO";
    case "RECOMPRA":  return "RECOMPRA";
    default:          return "ORGANICO";
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;

    const prospeccion = await prisma.prospeccion.findUnique({
      where: { id },
      include: {
        cliente:    { select: { id: true, nombre: true } },
        responsable: { select: { id: true, name: true } },
      },
    });

    if (!prospeccion) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    if (prospeccion.etapa !== "LISTO_PARA_CERRAR") {
      return NextResponse.json(
        { error: "La prospeccion debe estar en etapa LISTO_PARA_CERRAR para generar un trato" },
        { status: 422 }
      );
    }

    // Verify no trato already linked
    const tratoExistente = await prisma.trato.findFirst({
      where: { prospeccionId: id },
      select: { id: true },
    });

    if (tratoExistente) {
      return NextResponse.json(
        { error: "Esta prospeccion ya tiene un trato generado", tratoId: tratoExistente.id },
        { status: 409 }
      );
    }

    const trato = await prisma.trato.create({
      data: {
        clienteId:         prospeccion.clienteId,
        responsableId:     prospeccion.responsableId ?? session.id,
        tipoEvento:        prospeccion.tipoEvento,
        origenLead:        mapOrigen(prospeccion.origen),
        etapa:             "DESCUBRIMIENTO",
        tipoProspecto:     "ACTIVO",
        tipoLead:          "INBOUND",
        origenVenta:       "CLIENTE_PROPIO",
        lugarEstimado:     prospeccion.lugarEstimado     ?? null,
        fechaEventoEstimada: prospeccion.fechaEventoEstimada ?? null,
        presupuestoEstimado: prospeccion.presupuestoAprox    ?? null,
        tipoServicio:      prospeccion.tipoServicioInteres ?? null,
        notas:             prospeccion.notasEvento         ?? null,
        prospeccionId:     prospeccion.id,
      },
    });

    // Update prospeccion estado to EN_TRATO (FK lives on Trato, so no tratoId needed here)
    const prospeccionActualizada = await prisma.prospeccion.update({
      where: { id },
      data: { estado: "EN_TRATO" },
      include: {
        cliente:    { select: { id: true, nombre: true } },
        responsable: { select: { id: true, name: true } },
        trato:      { select: { id: true, etapa: true, nombreEvento: true, createdAt: true } },
      },
    });

    return NextResponse.json({ trato, prospeccion: prospeccionActualizada }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/prospeccion/[id]/generar-trato]", error);
    return NextResponse.json({ error: "Error al generar trato" }, { status: 500 });
  }
}
