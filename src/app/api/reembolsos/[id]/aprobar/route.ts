import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";
import { ensureReembolsos } from "@/lib/reembolsos";
import { logActividad } from "@/lib/actividad";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerificar(session)) return NextResponse.json({ error: "Solo administración puede aprobar" }, { status: 403 });

  await ensureReembolsos();
  const { id } = await params;
  const body = await req.json();

  const solicitud = await prisma.solicitudReembolso.findUnique({
    where: { id },
    include: { solicitante: { select: { name: true } } },
  });
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (solicitud.estado !== "PENDIENTE") return NextResponse.json({ error: "Ya fue revisada" }, { status: 400 });

  // El gasto tiene que quedar clasificado: es la razón de pasarlo por CxP y no
  // sacar el dinero a secas.
  const categoriaId = body.categoriaId || solicitud.categoriaId;
  if (!categoriaId) return NextResponse.json({ error: "Elige la categoría del gasto" }, { status: 400 });

  const proyectoId = "proyectoId" in body ? body.proyectoId || null : solicitud.proyectoId;
  const fechaCompromiso = body.fechaCompromiso ? new Date(body.fechaCompromiso) : new Date();

  const actualizada = await prisma.$transaction(async (tx) => {
    // tipoAcreedor OTRO a propósito: con PERSONAL_INTERNO el pago se trataría
    // como nómina y pisaría la categoría con "Sueldos y salarios".
    const cxp = await tx.cuentaPagar.create({
      data: {
        tipoAcreedor: "OTRO",
        concepto: `Reembolso ${solicitud.folio} · ${solicitud.solicitante.name} — ${solicitud.concepto}`,
        monto: solicitud.monto,
        fechaCompromiso,
        categoriaId,
        proyectoId,
        notas: solicitud.notas,
      },
    });

    return tx.solicitudReembolso.update({
      where: { id },
      data: {
        estado: "APROBADO",
        revisadoPorId: session.id,
        revisadoEn: new Date(),
        categoriaId,
        proyectoId,
        cuentaPagarId: cxp.id,
      },
      include: {
        solicitante: { select: { id: true, name: true } },
        revisadoPor: { select: { id: true, name: true } },
        categoria: { select: { id: true, nombre: true } },
        proyecto: { select: { id: true, nombre: true, numeroProyecto: true } },
        cuentaPagar: { select: { id: true, estado: true, monto: true, montoPagado: true, fechaCompromiso: true } },
      },
    });
  });

  await logActividad(
    session.id,
    "APROBAR",
    "reembolso",
    id,
    `Aprobó el reembolso ${solicitud.folio} de ${solicitud.solicitante.name} por ${solicitud.monto}`
  );

  return NextResponse.json({ solicitud: actualizada });
}
