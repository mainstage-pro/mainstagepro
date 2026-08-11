import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { guardarVersion } from "@/lib/versiones";
import { generarTokenPresentacion } from "@/lib/presentacion-token";
import { syncFechaProximaAccion } from "@/app/api/seguimientos/route";
import { defaultEtapaInterna } from "@/lib/etapasInternas";
import { sincronizarProyectoDesdeCotizacion } from "@/lib/sync-cotizacion-proyecto";
import { ensureCotizacionEventoConfirmadoColumn, ensureCotizacionPaqueteColumn } from "@/lib/migraciones-lazy";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      trato: { select: { id: true, tipoEvento: true, etapa: true, tradeCalificado: true, familyAndFriends: true, realizarRender: true, ideasReferencias: true, notas: true, lugarEstimado: true, equiposInteres: true } },
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

  const vencida =
    ['ENVIADA', 'REENVIADA'].includes(cotizacion.estado) &&
    cotizacion.fechaVencimiento !== null &&
    cotizacion.fechaVencimiento < new Date();

  return NextResponse.json({ cotizacion: { ...cotizacion, vencida }, opciones, presentacionToken });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  await ensureCotizacionEventoConfirmadoColumn();
  await ensureCotizacionPaqueteColumn();

  // Si viene "lineas" en el body, es una re-edición completa desde BORRADOR
  if (body.lineas !== undefined) {
    const {
      lineas,
      paqueteId,
      notasSecciones,
      nombreEvento, tipoEvento, tipoServicio, fechaEvento, lugarEvento,
      horasOperacion, diasEquipo, diasOperacion,
      descuentoVolumenPct, descuentoB2bPct, descuentoMultidiaPct,
      descuentoPatrocinioPct, descuentoPatrocinioNota,
      descuentoEspecialPct, descuentoEspecialNota,
      descuentoFamilyFriendsPct,
      descuentoFijoMonto,
      descuentoManualRazon,
      descuentoManualEsMonto,
      pagoAnticipadoActivo,
      pagoAnticipadoFecha,
      pagoAnticipadoTexto,
      descuentoTotalPct, montoDescuento, montoBeneficio,
      subtotalEquiposBruto, subtotalEquiposNeto,
      subtotalPaquetes, subtotalTerceros, subtotalOperacion,
      subtotalTransporte, subtotalComidas, subtotalHospedaje,
      total, aplicaIva, incluirChofer, montoIva, granTotal,
      costosTotalesEstimados, utilidadEstimada, porcentajeUtilidad,
      observaciones,
      jornadasPlan,
      zonaEvento,
      numTecnicosZona,
      // Multi-evento + Gastos de producción
      nombreCotizacion,
      descripcionCotizacion,
      gastosProduccionActivo,
      gastosProduccionEsMonto,
      gastosProduccionPct,
      gastosProduccionMonto,
    } = body;

    // El cliente ya calcula gastos de producción e incluye el monto tanto en `total`
    // como en `granTotal`. Recalcular aquí duplicaba la comisión y, además, aplicaba
    // otro /100 sobre un pct que ya viene como fracción (0.1) → granTotal inflado con
    // decimales fantasma. El servidor solo persiste lo que envía el cliente.
    const gastosMontoCalculado = gastosProduccionActivo ? (gastosProduccionMonto ?? 0) : 0;
    const granTotalFinal = granTotal ?? 0;

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

      // Sanear rolTecnicoId huérfanos: si un rol fue borrado (hard delete),
      // las líneas que aún lo referencian romperían el FK al recrearse.
      const rolTecnicoIdsRef = [
        ...new Set(
          (lineas as Record<string, unknown>[])
            .map((l) => (l.rolTecnicoId as string) || null)
            .filter((v): v is string => Boolean(v)),
        ),
      ];
      const rolesValidos = rolTecnicoIdsRef.length
        ? new Set(
            (
              await prisma.rolTecnico.findMany({
                where: { id: { in: rolTecnicoIdsRef } },
                select: { id: true },
              })
            ).map((r) => r.id),
          )
        : new Set<string>();

      // Borrar lineas y actualizar cotización en una sola transacción
      const cotizacion = await prisma.$transaction(async (tx) => {
        await tx.cotizacionLinea.deleteMany({ where: { cotizacionId: id } });
        return tx.cotizacion.update({
          where: { id },
          data: {
            paqueteId: paqueteId !== undefined ? (paqueteId || null) : undefined,
            notasSecciones: notasSecciones ?? null,
            jornadasPlan: jornadasPlan !== undefined ? (jornadasPlan ? JSON.stringify(jornadasPlan) : null) : undefined,
            zonaEvento: zonaEvento ?? "LOCAL",
            numTecnicosZona: numTecnicosZona ?? 0,
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
            descuentoFijoMonto: descuentoFijoMonto ?? 0,
            descuentoManualRazon: descuentoManualRazon ?? null,
            descuentoManualEsMonto: descuentoManualEsMonto ?? false,
            pagoAnticipadoActivo: pagoAnticipadoActivo ?? false,
            pagoAnticipadoFecha: pagoAnticipadoFecha ?? null,
            pagoAnticipadoTexto: pagoAnticipadoTexto ?? null,
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
            granTotal: granTotalFinal,
            // Gastos de producción
            gastosProduccionActivo: gastosProduccionActivo ?? false,
            gastosProduccionEsMonto: gastosProduccionEsMonto ?? false,
            gastosProduccionPct: gastosProduccionPct ?? 10,
            gastosProduccionMonto: gastosMontoCalculado,
            costosTotalesEstimados: costosTotalesEstimados ?? 0,
            utilidadEstimada: utilidadEstimada ?? 0,
            porcentajeUtilidad: porcentajeUtilidad ?? 0,
            observaciones: observaciones ?? null,
            // Multi-evento
            nombreCotizacion: nombreCotizacion !== undefined ? (nombreCotizacion?.trim() || null) : undefined,
            descripcionCotizacion: descripcionCotizacion !== undefined ? (descripcionCotizacion?.trim() || null) : undefined,
            lineas: {
              create: (lineas as Record<string, unknown>[]).map((l, i) => ({
                tipo: l.tipo as string,
                orden: i,
                descripcion: l.descripcion as string,
                marca: (l.marca as string) || null,
                modelo: (l.modelo as string) || null,
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
                rolTecnicoId: rolesValidos.has(l.rolTecnicoId as string) ? (l.rolTecnicoId as string) : null,
                proveedorId: (l.proveedorId as string) || null,
                notas: (l.notas as string) || null,
                // Déficit de stock propio
                cantidadPropia: l.cantidadPropia != null ? Number(l.cantidadPropia) : null,
                cantidadExterna: l.cantidadExterna != null ? Number(l.cantidadExterna) : null,
                proveedorRentaId: (l.proveedorRentaId as string) || null,
                notasInternas: (l.notasInternas as string) || null,
              })),
            },
          },
        });
      });

      // ── Cascade: sync CuentaCobrar when cotización total changes or CxC are out of sync ──
      if (prev?.proyecto?.id) {
        const proyectoId = prev.proyecto.id;
        // Cast by proyectoId OR cotizacionId so we never miss records
        const cxcAll = await prisma.cuentaCobrar.findMany({
          where: { OR: [{ proyectoId }, { cotizacionId: id }] },
          orderBy: { createdAt: "asc" },
        });
        const liquidadas  = cxcAll.filter(c => c.estado === "LIQUIDADO");
        const pendientes  = cxcAll.filter(c => c.estado !== "LIQUIDADO");

        if (pendientes.length > 0) {
          const sumLiquidadas    = liquidadas.reduce((s, c) => s + c.monto, 0);
          const remainingNew     = newGranTotal - sumLiquidadas;
          const oldPendientesSum = pendientes.reduce((s, c) => s + c.monto, 0);

          // Run if total changed OR if CxC sum is already out of sync with the new total
          const outOfSync = Math.abs(oldPendientesSum - remainingNew) > 0.01;
          const totalChanged = Math.abs(newGranTotal - prevGranTotal) > 0.01;

          if (totalChanged || outOfSync) {
            const ahora = new Date().toISOString();
            await Promise.all(pendientes.map(cxc => {
              let nuevoMonto: number;
              if (oldPendientesSum > 0) {
                nuevoMonto = (cxc.monto / oldPendientesSum) * remainingNew;
              } else {
                nuevoMonto = remainingNew / pendientes.length;
              }
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
      }
      // ─────────────────────────────────────────────────────────────────────────

      // ── Sync automático: propagar equipos y operación técnica al proyecto ──
      // Nunca borra datos manuales; marca lo removido con necesitaRevision.
      if (prev?.proyecto?.id) {
        await sincronizarProyectoDesdeCotizacion(id);
      }

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
    const allowed = ["estado", "observaciones", "terminosComerciales", "fechaEnvio", "fechaVencimiento", "notasSecciones", "planPagos", "mainstageTradeData", "tradeToken", "descuentoFamilyFriendsPct", "nombreCotizacion", "descripcionCotizacion", "gastosProduccionActivo", "gastosProduccionEsMonto", "gastosProduccionPct", "gastosProduccionMonto", "fechaEvento", "lugarEvento", "eventoConfirmado"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        if ((key === "fechaEnvio" || key === "fechaVencimiento" || key === "fechaEvento") && body[key]) {
          data[key] = new Date(body[key]);
        } else if (key === "eventoConfirmado") {
          data[key] = Boolean(body[key]);
        } else {
          data[key] = body[key];
        }
      }
    }

    // NOTA: El recálculo de granTotal SOLO ocurre en el FULL SAVE (PUT).
    // El PATCH parcial (fechaEvento, lugarEvento, estado, etc.) nunca toca granTotal.

    const cotizacion = await prisma.cotizacion.update({ where: { id }, data });

    // Propagar cambios de fecha/lugar al proyecto ligado (1:1 vía cotizacionId).
    // El proyecto es la fuente para producción/logística, así que un cambio de
    // fecha en la cotización debe reflejarse ahí, no quedarse solo en la venta.
    const proyectoData: Record<string, unknown> = {};
    if ("fechaEvento" in data) proyectoData.fechaEvento = data.fechaEvento;
    if ("lugarEvento" in data) proyectoData.lugarEvento = data.lugarEvento;
    if (Object.keys(proyectoData).length > 0) {
      // fechaEvento es obligatoria en Proyecto; no propagues null (evita romper la fila).
      if ("fechaEvento" in proyectoData && !proyectoData.fechaEvento) {
        delete proyectoData.fechaEvento;
      }
      if (Object.keys(proyectoData).length > 0) {
        await prisma.proyecto.updateMany({ where: { cotizacionId: id }, data: proyectoData });
      }
    }

    if ("eventoConfirmado" in body) {
      await logActividad(session.id, "EDITAR", "cotizacion", id, data.eventoConfirmado ? "Evento marcado como confirmado (visible en calendario)" : "Confirmación de evento retirada");
    }

    if (body.estado) {
      await logActividad(session.id, "ESTADO", "cotizacion", id, `Estado cambiado a ${body.estado}`);

      // CASCADE: When cotizacion is approved
      if (body.estado === "APROBADA") {
        // Aprobada ⇒ evento confirmado automáticamente en el calendario.
        await prisma.cotizacion.update({ where: { id }, data: { eventoConfirmado: true } });
        const cotData = await prisma.cotizacion.findUnique({
          where: { id },
          select: { tratoId: true, grupoId: true },
        });
        if (cotData?.tratoId) {
          // Solo rechazar las OPCIONES hermanas del MISMO grupo (alternativas mutuamente
          // excluyentes A/B/C). Las cotizaciones independientes (otro grupo o sin grupo)
          // son entregables separados y pueden aprobarse por su cuenta.
          if (cotData.grupoId) {
            await prisma.cotizacion.updateMany({
              where: {
                tratoId: cotData.tratoId,
                grupoId: cotData.grupoId,
                id: { not: id },
                estado: { in: ["BORRADOR", "ENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO", "REENVIADA"] },
              },
              data: { estado: "RECHAZADA" },
            });
          }
          await prisma.trato.update({
            where: { id: cotData.tratoId },
            data: { etapa: "VENTA_CERRADA", etapaInterna: defaultEtapaInterna("VENTA_CERRADA"), confirmadaEn: new Date() },
          });

          // ── Levantamiento de contenido: crear orden si aplica ──
          try {
            const tratoConRevision = await prisma.trato.findUnique({
              where: { id: cotData.tratoId },
              select: {
                requiereRevision: true,
                nombreEvento: true,
                levantamientoContenido: { select: { id: true, estadoLevantamiento: true } },
              },
            });
            if (tratoConRevision?.requiereRevision && !tratoConRevision.levantamientoContenido) {
              // Create the levantamiento order
              await prisma.levantamientoContenido.create({
                data: {
                  tratoId: cotData.tratoId,
                  nombreEvento: tratoConRevision.nombreEvento ?? null,
                  estadoLevantamiento: "PENDIENTE",
                },
              });
              // Notify all marketing users
              const marketingUsers = await prisma.user.findMany({
                where: { area: "MARKETING", active: true },
                select: { id: true },
              });
              if (marketingUsers.length > 0) {
                await prisma.notificacion.createMany({
                  data: marketingUsers.map(u => ({
                    usuarioId: u.id,
                    tipo: "INFO",
                    titulo: `Levantamiento requerido: ${tratoConRevision.nombreEvento ?? "Nuevo proyecto"}`,
                    mensaje: "Se aprobó una cotización que requiere levantamiento de contenido.",
                    url: "/marketing/levantamientos",
                  })),
                });
              }
              // Clear the flag
              await prisma.trato.update({
                where: { id: cotData.tratoId },
                data: { requiereRevision: false },
              });
            } else if (tratoConRevision?.requiereRevision && tratoConRevision.levantamientoContenido) {
              // Levantamiento already exists (edge case) — ensure it's PENDIENTE
              if (tratoConRevision.levantamientoContenido.estadoLevantamiento === "CANCELADO") {
                await prisma.levantamientoContenido.update({
                  where: { id: tratoConRevision.levantamientoContenido.id },
                  data: { estadoLevantamiento: "PENDIENTE" },
                });
              }
            }
          } catch (e) {
            console.error("[levantamiento] Error creando orden:", e);
          }
        }
      }

      // CASCADE: When cotizacion is rejected
      if (body.estado === "RECHAZADA") {
        // Rechazada ⇒ se des-confirma el evento (sale del calendario).
        await prisma.cotizacion.update({ where: { id }, data: { eventoConfirmado: false } });
        const cotData = await prisma.cotizacion.findUnique({
          where: { id },
          select: { tratoId: true },
        });
        if (cotData?.tratoId) {
          const activasCount = await prisma.cotizacion.count({
            where: {
              tratoId: cotData.tratoId,
              id: { not: id },
              estado: { in: ["BORRADOR", "ENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO", "REENVIADA", "APROBADA"] },
            },
          });
          if (activasCount === 0) {
            // Venta perdida ⇒ ninguna cotización del trato debe seguir confirmada.
            await prisma.cotizacion.updateMany({ where: { tratoId: cotData.tratoId }, data: { eventoConfirmado: false } });
            await prisma.trato.update({
              where: { id: cotData.tratoId },
              data: { etapa: "VENTA_PERDIDA", etapaInterna: defaultEtapaInterna("VENTA_PERDIDA"), confirmadaEn: null },
            });
            await syncFechaProximaAccion(cotData.tratoId);
          }
        }
      }

      // CASCADE INVERSA: al regresar la cotización a un estado activo (borrador/
      // enviada/en revisión), si el trato quedó en una etapa terminal (cerrada o
      // perdida) y no hay otra cotización aprobada, regrésalo a OPORTUNIDAD.
      const ESTADOS_ACTIVOS = ["BORRADOR", "ENVIADA", "REENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO"];
      if (ESTADOS_ACTIVOS.includes(body.estado)) {
        const cotData = await prisma.cotizacion.findUnique({
          where: { id },
          select: { tratoId: true },
        });
        if (cotData?.tratoId) {
          const trato = await prisma.trato.findUnique({
            where: { id: cotData.tratoId },
            select: { etapa: true },
          });
          if (trato && ["VENTA_CERRADA", "VENTA_PERDIDA"].includes(trato.etapa)) {
            const aprobadaCount = await prisma.cotizacion.count({
              where: { tratoId: cotData.tratoId, id: { not: id }, estado: "APROBADA" },
            });
            if (aprobadaCount === 0) {
              await prisma.trato.update({
                where: { id: cotData.tratoId },
                data: { etapa: "OPORTUNIDAD", etapaInterna: defaultEtapaInterna("OPORTUNIDAD"), confirmadaEn: null },
              });
              await syncFechaProximaAccion(cotData.tratoId);
            }
          }
        }
      }
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
