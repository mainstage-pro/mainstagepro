import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { siguienteNumero } from "../../recalcular";

// POST: duplica la propuesta como nueva versión.
// La versión nueva nace en BORRADOR y sin token: el link viejo sigue apuntando
// a lo que el cliente ya vio, y la negociación avanza en una copia aparte.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const original = await prisma.propuestaServicio.findUnique({
    where: { id },
    include: { lineas: { orderBy: { orden: "asc" } } },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const numero = await siguienteNumero();

  const copia = await prisma.propuestaServicio.create({
    data: {
      numero,
      version: original.version + 1,
      creadaPorId: session.id,
      clienteId: original.clienteId,
      artistaId: original.artistaId,
      giraId: original.giraId,
      tratoId: original.tratoId,
      titulo: original.titulo,
      estado: "BORRADOR",
      modeloCobro: original.modeloCobro,
      moneda: original.moneda,
      vigenciaHasta: original.vigenciaHasta,
      alcance: original.alcance,
      exclusiones: original.exclusiones,
      supuestos: original.supuestos,
      condicionesPago: original.condicionesPago,
      notasInternas: original.notasInternas,
      aplicaIva: original.aplicaIva,
      descuentoMonto: original.descuentoMonto,
      descuentoRazon: original.descuentoRazon,
      subtotalHonorarios: original.subtotalHonorarios,
      subtotalEquipo: original.subtotalEquipo,
      subtotalLogistica: original.subtotalLogistica,
      subtotalReembolsables: original.subtotalReembolsables,
      subtotal: original.subtotal,
      montoIva: original.montoIva,
      granTotal: original.granTotal,
      costoEstimado: original.costoEstimado,
      lineas: {
        create: original.lineas.map((l) => ({
          tipo: l.tipo,
          concepto: l.concepto,
          descripcion: l.descripcion,
          unidad: l.unidad,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          costoUnitario: l.costoUnitario,
          subtotal: l.subtotal,
          esIncluido: l.esIncluido,
          esReembolsable: l.esReembolsable,
          servicioId: l.servicioId,
          equipoId: l.equipoId,
          rolTecnicoId: l.rolTecnicoId,
          showId: l.showId,
          notas: l.notas,
          orden: l.orden,
        })),
      },
    },
    select: { id: true, numero: true, version: true },
  });

  await logActividad(
    session.id,
    "CREAR",
    "propuesta_servicio",
    copia.id,
    `Propuesta ${copia.numero} v${copia.version} duplicada de ${original.numero}`,
  );

  return NextResponse.json({ propuesta: copia });
}
