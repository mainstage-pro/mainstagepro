import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { crearProyectoDesdeCotizacion, ensureTratoIndiceSoltado } from "@/lib/crear-proyecto";

const ESTADOS_ACTIVOS = ["BORRADOR", "ENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO", "REENVIADA"];

/**
 * Cierra la venta de un trato: aprueba las cotizaciones seleccionadas, genera un
 * proyecto por cada una, rechaza las cotizaciones activas no seleccionadas y deja
 * el trato en VENTA_CERRADA + confirmadaEn (evento confirmado en calendario/dashboard).
 *
 * Body: { cotizacionIds: string[] }  — ids de las cotizaciones a aprobar.
 * Si el trato no tiene cotizaciones, solo cierra el trato (sin proyectos).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cotizacionIds: string[] = Array.isArray(body.cotizacionIds) ? body.cotizacionIds : [];

  const trato = await prisma.trato.findUnique({
    where: { id },
    select: {
      id: true, etapa: true, montoFinal: true, presupuestoEstimado: true, fechaCierre: true,
      nombreEvento: true, requiereRevision: true,
      levantamientoContenido: { select: { id: true, estadoLevantamiento: true } },
      cotizaciones: {
        select: { id: true, estado: true, granTotal: true, proyecto: { select: { id: true } } },
      },
    },
  });
  if (!trato) return NextResponse.json({ error: "Trato no encontrado" }, { status: 404 });

  // Cotizaciones seleccionadas que realmente pertenecen al trato y son aprobables
  const seleccionadas = trato.cotizaciones.filter(
    (c) => cotizacionIds.includes(c.id) && (ESTADOS_ACTIVOS.includes(c.estado) || c.estado === "APROBADA"),
  );
  // Cotizaciones activas NO seleccionadas → se rechazarán
  const aRechazar = trato.cotizaciones.filter(
    (c) => !cotizacionIds.includes(c.id) && ESTADOS_ACTIVOS.includes(c.estado),
  );

  // Monto de cierre: suma de las cotizaciones aprobadas, o el existente / presupuesto
  const sumaAprobadas = seleccionadas.reduce((s, c) => s + (c.granTotal ?? 0), 0);
  const montoFinal = trato.montoFinal ?? (sumaAprobadas > 0 ? sumaAprobadas : trato.presupuestoEstimado ?? null);

  await ensureTratoIndiceSoltado();

  let proyectos: { id: string; numeroProyecto: string }[] = [];
  try {
    proyectos = await prisma.$transaction(async (tx) => {
      const creados: { id: string; numeroProyecto: string }[] = [];

      for (const cot of seleccionadas) {
        const proy = await crearProyectoDesdeCotizacion(tx, cot.id, { id: session.id, name: session.name });
        creados.push({ id: proy.id, numeroProyecto: proy.numeroProyecto });
        if (cot.estado !== "APROBADA") {
          await tx.cotizacion.update({ where: { id: cot.id }, data: { estado: "APROBADA" } });
        }
      }

      // Rechazar las cotizaciones activas no seleccionadas
      if (aRechazar.length > 0) {
        await tx.cotizacion.updateMany({
          where: { id: { in: aRechazar.map((c) => c.id) } },
          data: { estado: "RECHAZADA" },
        });
      }

      // Cerrar el trato como venta cerrada + confirmación operativa
      await tx.trato.update({
        where: { id },
        data: {
          etapa: "VENTA_CERRADA",
          etapaCambiadaEn: new Date(),
          confirmadaEn: new Date(),
          fechaCierre: trato.fechaCierre ?? new Date(),
          montoFinal,
        },
      });

      return creados;
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cerrar-venta]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── Levantamiento de contenido: crear orden si aplica (fuera de la transacción) ──
  if (trato.requiereRevision && seleccionadas.length > 0 && !trato.levantamientoContenido) {
    try {
      await prisma.levantamientoContenido.create({
        data: { tratoId: id, nombreEvento: trato.nombreEvento ?? null, estadoLevantamiento: "PENDIENTE" },
      });
      const marketingUsers = await prisma.user.findMany({
        where: { area: "MARKETING", active: true },
        select: { id: true },
      });
      if (marketingUsers.length > 0) {
        await prisma.notificacion.createMany({
          data: marketingUsers.map((u) => ({
            usuarioId: u.id,
            tipo: "INFO",
            titulo: `Levantamiento requerido: ${trato.nombreEvento ?? "Nuevo proyecto"}`,
            mensaje: "Se cerró una venta que requiere levantamiento de contenido.",
            url: "/marketing/levantamientos",
          })),
        });
      }
      await prisma.trato.update({ where: { id }, data: { requiereRevision: false } });
    } catch (e) {
      console.error("[cerrar-venta][levantamiento]", e);
    }
  }

  // Sincronizar esProspecto del cliente (venta cerrada ⇒ deja de ser prospecto si no hay otros tratos abiertos)
  try {
    const t = await prisma.trato.findUnique({ where: { id }, select: { clienteId: true, prospeccionId: true } });
    if (t) {
      if (t.prospeccionId) {
        await prisma.prospeccion.update({ where: { id: t.prospeccionId }, data: { estado: "CONVERTIDO" } });
      }
      const otrosAbiertos = await prisma.trato.count({
        where: { clienteId: t.clienteId, id: { not: id }, etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] } },
      });
      if (otrosAbiertos === 0) {
        await prisma.cliente.update({ where: { id: t.clienteId }, data: { esProspecto: false } });
      }
    }
  } catch (e) {
    console.error("[cerrar-venta][prospecto]", e);
  }

  return NextResponse.json({ proyectos, count: proyectos.length });
}
