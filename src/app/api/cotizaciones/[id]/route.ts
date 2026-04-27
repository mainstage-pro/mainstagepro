import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { guardarVersion } from "@/lib/versiones";
import { generarTokenPresentacion } from "@/lib/presentacion-token";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      trato: { select: { id: true, tipoEvento: true, etapa: true, tradeCalificado: true, familyAndFriends: true, realizarRender: true, ideasReferencias: true, notas: true, lugarEstimado: true } },
      creadaPor: { select: { name: true } },
      lineas: {
        orderBy: { orden: "asc" },
        include: { equipo: { select: { imagenUrl: true } } },
      },
      proyecto: { select: { id: true, numeroProyecto: true, estado: true } },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Cargar opciones hermanas del mismo grupo
  let opciones: { id: string; numeroCotizacion: string; opcionLetra: string; estado: string; granTotal: number }[] = [];
  if (cotizacion.grupoId) {
    opciones = await prisma.cotizacion.findMany({
      where: { grupoId: cotizacion.grupoId },
      select: { id: true, numeroCotizacion: true, opcionLetra: true, estado: true, granTotal: true },
      orderBy: { opcionLetra: "asc" },
    });
  } else {
    // La cotización es la única, exponerla como "Opción A" para consistencia en UI
    opciones = [{ id: cotizacion.id, numeroCotizacion: cotizacion.numeroCotizacion, opcionLetra: cotizacion.opcionLetra, estado: cotizacion.estado, granTotal: cotizacion.granTotal }];
  }

  const presentacionToken = generarTokenPresentacion(cotizacion.id);
  return NextResponse.json({ cotizacion, opciones, presentacionToken });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Si viene "lineas" en el body, es una re-edición completa desde BORRADOR
  if (body.lineas !== undefined) {
    const {
      lineas,
      notasSecciones,
      nombreEvento, tipoEvento, tipoServicio, fechaEvento, lugarEvento,
      horasOperacion, diasEquipo, diasOperacion,
      descuentoVolumenPct, descuentoB2bPct, descuentoMultidiaPct,
      descuentoPatrocinioPct, descuentoPatrocinioNota,
      descuentoEspecialPct, descuentoEspecialNota,
      descuentoFamilyFriendsPct,
      descuentoTotalPct, montoDescuento, montoBeneficio,
      subtotalEquiposBruto, subtotalEquiposNeto,
      subtotalPaquetes, subtotalTerceros, subtotalOperacion,
      subtotalTransporte, subtotalComidas, subtotalHospedaje,
      total, aplicaIva, incluirChofer, montoIva, granTotal,
      costosTotalesEstimados, utilidadEstimada, porcentajeUtilidad,
      observaciones,
    } = body;

    try {
      // Capture current granTotal before overwriting, so we can cascade later
      const prev = await prisma.cotizacion.findUnique({
        where: { id },
        select: {
          granTotal: true,
          numeroCotizacion: true,
          proyecto: { select: { id: true } },
        },
      });
      const prevGranTotal = prev?.granTotal ?? 0;
      const newGranTotal  = granTotal ?? 0;

      // Borrar lineas y actualizar cotización en una sola transacción
      const cotizacion = await prisma.$transaction(async (tx) => {
        await tx.cotizacionLinea.deleteMany({ where: { cotizacionId: id } });
        return tx.cotizacion.update({
          where: { id },
          data: {
            notasSecciones: notasSecciones ?? null,
            nombreEvento: nombreEvento ?? null,
            tipoEvento: tipoEvento ?? null,
            tipoServicio: tipoServicio ?? null,
            fechaEvento: fechaEvento ? new Date(fechaEvento) : null,
            lugarEvento: lugarEvento ?? null,
            horasOperacion: horasOperacion ? parseFloat(horasOperacion) : null,
            diasEquipo: diasEquipo ? parseInt(diasEquipo) : 1,
            diasOperacion: diasOperacion ? parseInt(diasOperacion) : 1,
            descuentoVolumenPct: descuentoVolumenPct ?? 0,
            descuentoB2bPct: descuentoB2bPct ?? 0,
            descuentoMultidiaPct: descuentoMultidiaPct ?? 0,
            descuentoPatrocinioPct: descuentoPatrocinioPct ?? 0,
            descuentoPatrocinioNota: descuentoPatrocinioNota ?? null,
            descuentoEspecialPct: descuentoEspecialPct ?? 0,
            descuentoEspecialNota: descuentoEspecialNota ?? null,
            descuentoFamilyFriendsPct: descuentoFamilyFriendsPct ?? 0,
            descuentoTotalPct: descuentoTotalPct ?? 0,
            montoDescuento: montoDescuento ?? 0,
            montoBeneficio: montoBeneficio ?? 0,
            subtotalEquiposBruto: subtotalEquiposBruto ?? 0,
            subtotalEquiposNeto: subtotalEquiposNeto ?? 0,
            subtotalPaquetes: subtotalPaquetes ?? 0,
            subtotalTerceros: subtotalTerceros ?? 0,
            subtotalOperacion: subtotalOperacion ?? 0,
            subtotalTransporte: subtotalTransporte ?? 0,
            subtotalComidas: subtotalComidas ?? 0,
            subtotalHospedaje: subtotalHospedaje ?? 0,
            total: total ?? 0,
            aplicaIva: aplicaIva ?? false,
            incluirChofer: incluirChofer ?? false,
            montoIva: montoIva ?? 0,
            granTotal: granTotal ?? 0,
            costosTotalesEstimados: costosTotalesEstimados ?? 0,
            utilidadEstimada: utilidadEstimada ?? 0,
            porcentajeUtilidad: porcentajeUtilidad ?? 0,
            observaciones: observaciones ?? null,
            lineas: {
              create: (lineas as Record<string, unknown>[]).map((l, i) => ({
                tipo: l.tipo as string,
                orden: i,
                descripcion: l.descripcion as string,
                marca: (l.marca as string) || null,
                nivel: (l.nivel as string) || null,
                jornada: (l.jornada as string) || null,
                cantidad: Number(l.cantidad ?? 1),
                dias: Number(l.dias ?? 1),
                precioUnitario: Number(l.precioUnitario ?? 0),
                costoUnitario: Number(l.costoUnitario ?? 0),
                subtotal: Number(l.subtotal ?? 0),
                esExterno: Boolean(l.esExterno ?? false),
                esIncluido: Boolean(l.esIncluido ?? false),
                equipoId: (l.equipoId as string) || null,
                rolTecnicoId: (l.rolTecnicoId as string) || null,
                proveedorId: (l.proveedorId as string) || null,
                notas: (l.notas as string) || null,
              })),
            },
          },
        });
      });

      // ── Cascade: sync CuentaCobrar when granTotal changes on a project-linked cotización ──
      if (prev?.proyecto?.id && newGranTotal !== prevGranTotal) {
        const proyectoId = prev.proyecto.id;
        const cxcAll = await prisma.cuentaCobrar.findMany({
          where: { proyectoId },
          orderBy: { createdAt: "asc" },
        });
        const liquidadas  = cxcAll.filter(c => c.estado === "LIQUIDADO");
        const pendientes  = cxcAll.filter(c => c.estado !== "LIQUIDADO");

        if (pendientes.length > 0) {
          const sumLiquidadas    = liquidadas.reduce((s, c) => s + c.monto, 0);
          const remainingNew     = newGranTotal - sumLiquidadas;
          const oldPendientesSum = pendientes.reduce((s, c) => s + c.monto, 0);

          const ahora = new Date().toISOString();
          await Promise.all(pendientes.map(cxc => {
            let nuevoMonto: number;
            if (oldPendientesSum > 0) {
              nuevoMonto = (cxc.monto / oldPendientesSum) * remainingNew;
            } else {
              nuevoMonto = remainingNew / pendientes.length;
            }
            // Never go below what has already been collected
            nuevoMonto = Math.max(nuevoMonto, cxc.montoCobrado);
            nuevoMonto = Math.round(nuevoMonto * 100) / 100;

            const log = cxc.ajustesLog ? (JSON.parse(cxc.ajustesLog) as unknown[]) : [];
            log.push({
              fecha:   ahora,
              de:      cxc.monto,
              a:       nuevoMonto,
              motivo:  `Cotización ${prev.numeroCotizacion} actualizada: total ${prevGranTotal} → ${newGranTotal}`,
              usuario: session.name,
            });

            return prisma.cuentaCobrar.update({
              where: { id: cxc.id },
              data:  { monto: nuevoMonto, ajustesLog: JSON.stringify(log) },
            });
          }));
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      await logActividad(session.id, "EDITAR", "cotizacion", id, `Cotización editada: ${nombreEvento ?? id}`);
      await guardarVersion(session.id, "cotizacion", id, { nombreEvento, granTotal, lineas: lineas.length });
      return NextResponse.json({ cotizacion });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[PATCH cotizacion lineas]", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Actualización parcial normal (estado, observaciones, etc.)
  try {
    const allowed = ["estado", "observaciones", "terminosComerciales", "fechaEnvio", "fechaVencimiento", "notasSecciones", "planPagos", "mainstageTradeData", "tradeToken", "descuentoFamilyFriendsPct"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        if ((key === "fechaEnvio" || key === "fechaVencimiento") && body[key]) {
          data[key] = new Date(body[key]);
        } else {
          data[key] = body[key];
        }
      }
    }

    const cotizacion = await prisma.cotizacion.update({ where: { id }, data });
    if (body.estado) {
      await logActividad(session.id, "ESTADO", "cotizacion", id, `Estado cambiado a ${body.estado}`);
    }
    return NextResponse.json({ cotizacion });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH cotizacion estado]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await logActividad(session.id, "ELIMINAR", "cotizacion", id, `Cotización eliminada`);
  await prisma.cotizacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
