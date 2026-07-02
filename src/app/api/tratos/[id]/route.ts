import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

let _vendedorColReady = false;
async function ensureVendedorId() {
  if (_vendedorColReady) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "vendedorId" TEXT REFERENCES users(id) ON DELETE SET NULL`
    );
  } catch { /* already exists */ }
  _vendedorColReady = true;
}

let _briefColsReady = false;
async function ensureBriefCols() {
  if (_briefColsReady) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "briefToken" TEXT UNIQUE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "briefRecibidoEn" TIMESTAMP`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "requiereRevision" BOOLEAN NOT NULL DEFAULT false`);
  } catch { /* already exists */ }
  _briefColsReady = true;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureVendedorId();
  await ensureBriefCols();
  const { id } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, tipoCliente: true, clasificacion: true, telefono: true, correo: true } },
      responsable: { select: { id: true, name: true } },
      vendedor: { select: { id: true, name: true } },
      vendedorOrigen: { select: { id: true, name: true } },
      cotizaciones: {
        select: {
          id: true, numeroCotizacion: true, opcionLetra: true, grupoId: true, estado: true,
          granTotal: true, nombreEvento: true, nombreCotizacion: true, fechaEvento: true,
          lugarEvento: true, gastosProduccionActivo: true, gastosProduccionMonto: true,
          createdAt: true, proyecto: { select: { id: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      archivos: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const allowedNames = ["mauricio", "emiliano", "carlos"];
  const canViewFinances = allowedNames.some(name => session.name.toLowerCase().includes(name));

  if (!canViewFinances) {
    trato.cotizaciones = [];
    trato.presupuestoEstimado = null;
  }

  return NextResponse.json({ trato: { ...trato, _canViewFinances: canViewFinances } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureVendedorId();
  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "clienteId",
    "etapa", "estatusContacto", "tipoEvento", "tipoServicio", "lugarEstimado",
    "fechaEventoEstimada", "presupuestoEstimado", "clasificacion", "notas",
    "proximaAccion", "fechaProximaAccion", "motivoPerdida", "etapaCambiadaEn", "origenLead", "tipoLead",
    "origenVenta", "vendedorOrigenId", "responsableId", "vendedorId",
    // Scouting
    "scoutingData",
    // Nurturing
    "tipoProspecto", "nurturingData",
    // Descubrimiento
    "canalAtencion", "nombreEvento", "duracionEvento", "asistentesEstimados",
    "diasServicio",
    "serviciosInteres", "ideasReferencias", "etapaContratacion", "continuarPor",
    "descubrimientoCompleto",
    // Horarios del evento
    "horaInicioEvento", "horaFinEvento", "duracionMontajeHrs",
    // Logística del venue
    "ventanaMontajeInicio", "ventanaMontajeFin",
    // Mainstage Trade
    "tradeCalificado", "tradeNivel",
    // Family & Friends
    "familyAndFriends",
    // Render
    "realizarRender",
    // Levantamiento de contenido
    "requiereRevision",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if ((key === "fechaEventoEstimada" || key === "fechaProximaAccion") && body[key]) {
        data[key] = new Date(body[key]);
      } else if ((key === "presupuestoEstimado" || key === "duracionMontajeHrs") && body[key] !== null && body[key] !== "") {
        data[key] = parseFloat(body[key]);
      } else if (key === "asistentesEstimados" && body[key] !== null && body[key] !== "") {
        data[key] = parseInt(body[key]);
      } else if (key === "descubrimientoCompleto" || key === "tradeCalificado" || key === "familyAndFriends" || key === "realizarRender" || key === "requiereRevision") {
        data[key] = Boolean(body[key]);
      } else if (key === "tradeNivel") {
        data[key] = body[key] !== null && body[key] !== "" ? parseInt(body[key]) : null;
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  // Auto-set fechaCierre y etapaCambiadaEn cuando etapa cambia
  let cambioAVentaPerdida = false;
  if (body.etapa) {
    const current = await prisma.trato.findUnique({ where: { id }, select: { etapa: true, fechaCierre: true } });
    if (current && current.etapa !== body.etapa) {
      data.etapaCambiadaEn = new Date();
      if (["VENTA_CERRADA", "VENTA_PERDIDA"].includes(body.etapa) && !current.fechaCierre) {
        data.fechaCierre = new Date();
      }
      if (body.etapa === "VENTA_PERDIDA") {
        cambioAVentaPerdida = true;
      }
    }
  }

  const trato = await prisma.trato.update({ where: { id }, data });

  // ── Cancelar CxC pendientes cuando el trato se pierde ───────────────────────
  if (cambioAVentaPerdida) {
    // Buscar proyecto y cotizaciones del trato
    const tratoConRelaciones = await prisma.trato.findUnique({
      where: { id },
      select: {
        proyecto: { select: { id: true } },
        cotizaciones: { select: { id: true } },
      },
    });

    const proyectoId = tratoConRelaciones?.proyecto?.id;
    const cotizacionIds = tratoConRelaciones?.cotizaciones.map(c => c.id) ?? [];

    // Cancelar CxC PENDIENTE ligadas al proyecto o cotizaciones (no tocar PARCIAL ni LIQUIDADO)
    await prisma.cuentaCobrar.updateMany({
      where: {
        estado: "PENDIENTE",
        OR: [
          ...(proyectoId ? [{ proyectoId }] : []),
          ...(cotizacionIds.length > 0 ? [{ cotizacionId: { in: cotizacionIds } }] : []),
        ],
      },
      data: {
        estado: "CANCELADO",
        notas: `Cancelado automáticamente — trato marcado como Venta Perdida`,
      },
    });
  }



  // ── Sincronizar esProspecto según etapa del trato ────────────────────────────
  // Se ejecuta SIEMPRE que cambia etapa, sin importar si hay prospeccionId.
  if (body.etapa) {
    if (body.etapa === "VENTA_CERRADA") {
      // Si hay prospección vinculada, marcarla como convertida
      if (trato.prospeccionId) {
        await prisma.prospeccion.update({
          where: { id: trato.prospeccionId },
          data: { estado: "CONVERTIDO" },
        });
      }
      // Verificar si el cliente tiene algún otro trato abierto (no cerrado ni perdido)
      const otrosTratosAbiertos = await prisma.trato.count({
        where: {
          clienteId: trato.clienteId,
          id: { not: trato.id },
          etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
        },
      });
      // Solo marcar como NO prospecto si no tiene tratos abiertos pendientes
      if (otrosTratosAbiertos === 0) {
        await prisma.cliente.update({
          where: { id: trato.clienteId },
          data: { esProspecto: false },
        });
      }
    } else if (body.etapa === "VENTA_PERDIDA") {
      // Si hay prospección vinculada, reactivarla
      if (trato.prospeccionId) {
        await prisma.prospeccion.update({
          where: { id: trato.prospeccionId },
          data: { estado: "ACTIVO", etapa: "EN_EVALUACION" },
        });
      }
      // Verificar si tiene alguna VENTA_CERRADA — si no, mantenerlo como prospecto
      const tieneVentaCerrada = await prisma.trato.count({
        where: { clienteId: trato.clienteId, etapa: "VENTA_CERRADA" },
      });
      if (tieneVentaCerrada === 0) {
        await prisma.cliente.update({
          where: { id: trato.clienteId },
          data: { esProspecto: true },
        });
      }
    } else {
      // Etapa abierta (LEAD, DESCUBRIMIENTO, OPORTUNIDAD) → asegurar que sea prospecto
      // a menos que ya tenga al menos una VENTA_CERRADA en otro trato
      const tieneVentaCerrada = await prisma.trato.count({
        where: { clienteId: trato.clienteId, etapa: "VENTA_CERRADA" },
      });
      if (tieneVentaCerrada === 0) {
        await prisma.cliente.update({
          where: { id: trato.clienteId },
          data: { esProspecto: true },
        });
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Cascade a cotizaciones y proyectos ──────────────────────────────────────
  const cotUpdate: Record<string, unknown> = {};
  const proyUpdate: Record<string, unknown> = {};

  if ("nombreEvento" in body && body.nombreEvento) {
    cotUpdate.nombreEvento = body.nombreEvento;
    proyUpdate.nombre = body.nombreEvento;
  }
  if ("fechaEventoEstimada" in body && body.fechaEventoEstimada) {
    cotUpdate.fechaEvento = new Date(body.fechaEventoEstimada);
    proyUpdate.fechaEvento = new Date(body.fechaEventoEstimada);
  }
  if ("tipoEvento" in body && body.tipoEvento) {
    cotUpdate.tipoEvento = body.tipoEvento;
    proyUpdate.tipoEvento = body.tipoEvento;
  }
  if ("tipoServicio" in body && body.tipoServicio) {
    cotUpdate.tipoServicio = body.tipoServicio;
    proyUpdate.tipoServicio = body.tipoServicio;
  }
  if ("lugarEstimado" in body && body.lugarEstimado) {
    cotUpdate.lugarEvento = body.lugarEstimado;
    proyUpdate.lugarEvento = body.lugarEstimado;
  }

  if (Object.keys(cotUpdate).length > 0) {
    await prisma.cotizacion.updateMany({ where: { tratoId: id }, data: cotUpdate });
  }
  if (Object.keys(proyUpdate).length > 0) {
    await prisma.proyecto.updateMany({
      where: { tratoId: id, estado: { not: "COMPLETADO" } },
      data: proyUpdate,
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ trato });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Snapshot del trato antes de eliminar (para el log)
  const tratoSnap = await prisma.trato.findUnique({
    where: { id },
    select: { nombreEvento: true, cliente: { select: { nombre: true } }, etapa: true },
  });

  // Eliminar en orden para respetar foreign keys:
  // 1. Archivos del trato (ya tienen Cascade pero por si acaso)
  // 2. Líneas y cuentas de cotizaciones del trato
  // 3. Cotizaciones
  // 4. Proyecto asociado (si no tiene estado COMPLETADO)
  // 5. El trato

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Borrar proyecto PRIMERO (tiene FK → cotizacion)
      const proyecto = await tx.proyecto.findUnique({ where: { tratoId: id }, select: { id: true } });
      if (proyecto) {
        // Romper FK CxC/CxP → MovimientoFinanciero antes de borrar movimientos
        await tx.abono.updateMany({ where: { cuentaCobrar: { proyectoId: proyecto.id } }, data: { movimientoId: null } });
        await tx.cuentaPagar.updateMany({ where: { proyectoId: proyecto.id }, data: { movimientoId: null } });
        await tx.movimientoFinanciero.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.cuentaCobrar.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.cuentaPagar.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.evaluacionInterna.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.evaluacionCliente.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyectoEquipo.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyectoPersonal.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyectoChecklist.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyectoBitacora.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.cierreFinanciero.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.gastoOperativo.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.ordenCompra.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyectoArchivo.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyecto.delete({ where: { id: proyecto.id } });
      }

      // 2. Borrar líneas y cuentas de las cotizaciones
      const cotizaciones = await tx.cotizacion.findMany({ where: { tratoId: id }, select: { id: true } });
      const cotIds = cotizaciones.map((c) => c.id);
      if (cotIds.length > 0) {
        await tx.cotizacionLinea.deleteMany({ where: { cotizacionId: { in: cotIds } } });
        await tx.cuentaCobrar.deleteMany({ where: { cotizacionId: { in: cotIds } } });
      }

      // 3. Borrar cotizaciones
      await tx.cotizacion.deleteMany({ where: { tratoId: id } });

      // 4. Borrar levantamientos del trato
      await tx.levantamientoContenido.deleteMany({ where: { tratoId: id } });

      // 5. Borrar el trato (archivos tienen Cascade en DB)
      await tx.trato.delete({ where: { id } });
    });

    // Log de auditoría post-eliminación
    const desc = tratoSnap
      ? `Trato eliminado — Cliente: ${tratoSnap.cliente?.nombre ?? "?"}, Evento: ${tratoSnap.nombreEvento ?? "sin nombre"}, Etapa: ${tratoSnap.etapa}`
      : `Trato eliminado (id: ${id})`;
    await prisma.actividadUsuario.create({
      data: { userId: session.id, accion: "ELIMINAR", entidad: "trato", entidadId: id, descripcion: desc },
    }).catch(() => {});
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DELETE /api/tratos]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
