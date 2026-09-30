import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { crearProyectoDesdeCotizacion, ensureTratoIndiceSoltado } from "@/lib/crear-proyecto";
import { ensureCotizacionHorarioColumns, ensureEtapaNegociacion } from "@/lib/migraciones-lazy";
import { sincronizarProyectoDesdeCotizacion } from "@/lib/sync-cotizacion-proyecto";
import { cambiarSubetapaManual } from "@/lib/proceso/motor";

// Arranca producción con el evento confirmado pero el número todavía en la mesa:
// crea el proyecto sin aprobar la cotización ni cerrar la venta. Es el contrario
// de /aprobar, que sí formaliza las tres cosas a la vez.
const ETAPAS_QUE_PUEDEN_ADELANTAR = ["PROSPECCION", "DESCUBRIMIENTO", "OPORTUNIDAD"];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  await Promise.all([ensureCotizacionHorarioColumns(), ensureEtapaNegociacion()]);

  const cot = await prisma.cotizacion.findUnique({
    where: { id },
    select: {
      id: true,
      tratoId: true,
      estado: true,
      proyecto: { select: { id: true, numeroProyecto: true } },
      trato: { select: { id: true, etapa: true } },
    },
  });

  if (!cot) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (cot.estado === "RECHAZADA") {
    return NextResponse.json({ error: "La cotización está rechazada" }, { status: 400 });
  }
  if (cot.proyecto) {
    return NextResponse.json({
      proyectoId: cot.proyecto.id,
      numeroProyecto: cot.proyecto.numeroProyecto,
      yaExistia: true,
    });
  }

  await ensureTratoIndiceSoltado();

  let proyecto;
  try {
    proyecto = await prisma.$transaction(async (tx) => {
      const proy = await crearProyectoDesdeCotizacion(tx, cot.id, { id: session.id, name: session.name });
      // El evento entra al calendario, pero el estado de la cotización no se toca:
      // sigue en negociación hasta que el cliente apruebe el número.
      await tx.cotizacion.update({ where: { id: cot.id }, data: { eventoConfirmado: true } });
      return proy;
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generar-proyecto]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await sincronizarProyectoDesdeCotizacion(cot.id);

  // Nunca arrastra hacia atrás un trato que ya pasó de negociación.
  if (cot.trato && ETAPAS_QUE_PUEDEN_ADELANTAR.includes(cot.trato.etapa)) {
    await cambiarSubetapaManual(cot.trato.id, "CAMBIOS_Y_NEGOCIACION");
  }

  return NextResponse.json({ proyectoId: proyecto.id, numeroProyecto: proyecto.numeroProyecto });
}
