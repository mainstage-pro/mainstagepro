import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { crearProyectoDesdeCotizacion, ensureTratoIndiceSoltado } from "@/lib/crear-proyecto";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Cargar cotización (solo para validaciones e idempotencia)
  const cot = await prisma.cotizacion.findUnique({
    where: { id },
    select: { id: true, tratoId: true, proyecto: { select: { id: true, numeroProyecto: true } }, trato: { select: { id: true, etapa: true } } },
  });

  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (cot.proyecto) {
    // Ya existe el proyecto — asegurarse de que el trato esté en VENTA_CERRADA y redirigir
    if (cot.trato && cot.trato.etapa !== "VENTA_CERRADA") {
      await prisma.trato.update({ where: { id: cot.trato.id }, data: { etapa: "VENTA_CERRADA", etapaCambiadaEn: new Date() } });
    }
    // Aprobada ⇒ evento confirmado en calendario.
    await prisma.cotizacion.update({ where: { id: cot.id }, data: { eventoConfirmado: true } });
    return NextResponse.json({ proyectoId: cot.proyecto.id, numeroProyecto: cot.proyecto.numeroProyecto, yaExistia: true });
  }

  await ensureTratoIndiceSoltado();

  // Ejecutar todo en una transacción
  let proyecto;
  try {
    proyecto = await prisma.$transaction(async (tx) => {
      const proy = await crearProyectoDesdeCotizacion(tx, cot.id, { id: session.id, name: session.name });

      // Actualizar cotización → APROBADA (aprobada ⇒ evento confirmado en calendario)
      await tx.cotizacion.update({ where: { id: cot.id }, data: { estado: "APROBADA", eventoConfirmado: true } });

      // Actualizar trato → VENTA_CERRADA + confirmación operativa (solo si hay trato vinculado)
      if (cot.tratoId) {
        await tx.trato.update({
          where: { id: cot.tratoId },
          data: { etapa: "VENTA_CERRADA", etapaCambiadaEn: new Date(), confirmadaEn: new Date() },
        });
      }

      return proy;
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[aprobar]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ proyectoId: proyecto!.id, numeroProyecto: proyecto!.numeroProyecto });
}
