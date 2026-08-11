import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncFechaProximaAccion } from "@/app/api/seguimientos/route";
import { ensureProcesoVentaColumns, ensureMultidiaColumns } from "@/lib/migraciones-lazy";
import { defaultEtapaInterna, esEtapaInternaValida } from "@/lib/etapasInternas";
import { parsePerfiles, serializePerfiles, MAX_PERFILES } from "@/lib/proceso/perfiles";

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
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "momentoContratacion" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE tratos ADD COLUMN IF NOT EXISTS "posibleDuplicado" BOOLEAN NOT NULL DEFAULT false`);
  } catch { /* already exists */ }
  _briefColsReady = true;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureVendedorId();
  await ensureBriefCols();
  await ensureProcesoVentaColumns();
  const { id } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, tipoCliente: true, clasificacion: true, perfilProspecto: true, perfilesProspecto: true, telefono: true, correo: true } },
      responsable: { select: { id: true, name: true } },
      vendedor: { select: { id: true, name: true } },
      vendedorOrigen: { select: { id: true, name: true } },
      cotizaciones: {
        select: {
          id: true, numeroCotizacion: true, opcionLetra: true, grupoId: true, estado: true,
          granTotal: true, nombreEvento: true, nombreCotizacion: true, fechaEvento: true,
          lugarEvento: true, gastosProduccionActivo: true, gastosProduccionMonto: true,
          createdAt: true,
          proyecto: {
            select: {
              id: true, numeroProyecto: true, nombre: true, estado: true,
              fechaEvento: true, lugarEvento: true,
            },
          },
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
  await ensureBriefCols();
  await ensureProcesoVentaColumns();
  await ensureMultidiaColumns();
  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "clienteId",
    "etapa", "etapaInterna", "estatusContacto", "tipoEvento", "tipoServicio", "lugarEstimado",
    "fechaEventoEstimada", "presupuestoEstimado", "clasificacion", "notas", "perfilProspecto",
    "proximaAccion", "fechaProximaAccion", "motivoPerdida", "etapaCambiadaEn", "origenLead", "tipoLead",
    "origenVenta", "vendedorOrigenId", "responsableId", "vendedorId",
    // Scouting
    "scoutingData",
    // Nurturing
    "tipoProspecto", "nurturingData",
    // Descubrimiento
    "canalAtencion", "nombreEvento", "duracionEvento", "asistentesEstimados", "subtipoEvento",
    "diasServicio", "fechasEvento",
    "serviciosInteres", "ideasReferencias", "etapaContratacion", "momentoContratacion", "continuarPor",
    "descubrimientoCompleto", "posibleDuplicado",
    // Selección de equipos del inventario
    "equiposInteres",
    // Proceso de ventas: rama del descubrimiento y preferencia del cliente
    "modoDescubrimiento", "preferenciaContacto",
    // Descubrimiento por nicho (catálogo comercial)
    "nichoSlug", "respuestasDescubrimiento", "adicionalesSeleccionados",
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
    // Cierre / confirmación
    "montoFinal",
    "confirmadaEn", "metodoConfirmacion", "notaConfirmacion",
    "contactoDecisorNombre", "contactoDecisorCargo",
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
      } else if (key === "montoFinal" && body[key] !== null && body[key] !== "") {
        data[key] = parseFloat(body[key]);
      } else if (key === "confirmadaEn" && body[key]) {
        data[key] = new Date(body[key]);
      } else if (key === "descubrimientoCompleto" || key === "tradeCalificado" || key === "familyAndFriends" || key === "realizarRender" || key === "requiereRevision") {
        data[key] = Boolean(body[key]);
      } else if (key === "tradeNivel") {
        data[key] = body[key] !== null && body[key] !== "" ? parseInt(body[key]) : null;
      } else if (key === "equiposInteres") {
        // El cliente envía esto ya como string JSON — almacenar directo
        data[key] = body[key] || null;
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  // Auto-set fechaCierre y etapaCambiadaEn cuando etapa cambia
  let cambioAVentaPerdida = false;
  let etapaCambio = false;
  if (body.etapa) {
    const current = await prisma.trato.findUnique({
      where: { id },
      select: { etapa: true, fechaCierre: true, presupuestoEstimado: true },
    });
    if (current && current.etapa !== body.etapa) {
      etapaCambio = true;
      data.etapaCambiadaEn = new Date();
      // Al cambiar de etapa, arranca en la primera sub-etapa interna
      // (a menos que el body traiga una etapaInterna válida explícita para la nueva etapa).
      if (!("etapaInterna" in body) || !esEtapaInternaValida(body.etapa, body.etapaInterna)) {
        data.etapaInterna = defaultEtapaInterna(body.etapa);
      }
      if (["VENTA_CERRADA", "VENTA_PERDIDA"].includes(body.etapa) && !current.fechaCierre) {
        data.fechaCierre = new Date();
      }
      if (body.etapa === "VENTA_PERDIDA") {
        cambioAVentaPerdida = true;
      }
      // Auto-set montoFinal al cerrar si no viene en body
      if (body.etapa === "VENTA_CERRADA" && !data.montoFinal) {
        data.montoFinal = (body.presupuestoEstimado as number | undefined) ?? current.presupuestoEstimado ?? null;
      }
    }
  }

  // ── Candados de etapa — validados en servidor, aplican desde CUALQUIER punto ─
  if (body.etapa) {
    const tratoActual = await prisma.trato.findUnique({
      where: { id },
      select: { etapa: true, motivoPerdida: true, montoFinal: true, presupuestoEstimado: true, fechaProximaAccion: true },
    });
    if (tratoActual && tratoActual.etapa !== body.etapa) {
      // Candado 1: VENTA_PERDIDA requiere motivoPerdida
      if (body.etapa === 'VENTA_PERDIDA') {
        const motivo = (body.motivoPerdida as string | undefined)?.trim() || tratoActual.motivoPerdida?.trim();
        if (!motivo) {
          return NextResponse.json(
            { error: 'Se requiere el motivo de pérdida para marcar como Venta Perdida', code: 'REQUIERE_MOTIVO_PERDIDA' },
            { status: 400 }
          );
        }
      }
      // Candado 2: VENTA_CERRADA requiere montoFinal o presupuestoEstimado
      if (body.etapa === 'VENTA_CERRADA') {
        const monto = (body.montoFinal as number | undefined) ?? tratoActual.montoFinal ?? (body.presupuestoEstimado as number | undefined) ?? tratoActual.presupuestoEstimado;
        if (!monto || monto <= 0) {
          return NextResponse.json(
            { error: 'Se requiere capturar el monto final de cierre', code: 'REQUIERE_MONTO_FINAL' },
            { status: 400 }
          );
        }
      }
    }
  }

  // ── Cascada del responsable a las tareas del trato ──────────────────────────
  // Si cambia el responsable del trato, las tareas pendientes/en progreso que
  // estaban asignadas al responsable anterior (o sin asignar) siguen al nuevo. No
  // se tocan las completadas ni las que estén delegadas a otra persona a propósito.
  let responsableCambio: { prev: string | null; next: string | null } | null = null;
  if ("responsableId" in body) {
    const actualResp = await prisma.trato.findUnique({ where: { id }, select: { responsableId: true } });
    const nextResp = (body.responsableId as string | null) || null;
    if (actualResp && actualResp.responsableId !== nextResp) {
      responsableCambio = { prev: actualResp.responsableId, next: nextResp };
    }
  }

  const trato = await prisma.trato.update({
    where: { id },
    data,
    include: { cliente: { select: { nombre: true } } },
  });

  // ── Perfil del trato: si es nuevo para el cliente, agregarlo (hasta 3) ───────
  if ("perfilProspecto" in body && body.perfilProspecto) {
    const cli = await prisma.trato.findUnique({
      where: { id },
      select: { clienteId: true, cliente: { select: { perfilesProspecto: true, perfilProspecto: true } } },
    });
    if (cli?.clienteId) {
      const actuales = parsePerfiles(cli.cliente?.perfilesProspecto ?? cli.cliente?.perfilProspecto);
      if (!actuales.includes(body.perfilProspecto) && actuales.length < MAX_PERFILES) {
        const nuevos = serializePerfiles([...actuales, body.perfilProspecto]);
        await prisma.cliente.update({
          where: { id: cli.clienteId },
          data: { perfilesProspecto: nuevos, perfilProspecto: actuales[0] || body.perfilProspecto },
        });
      }
    }
  }

  if (responsableCambio) {
    await prisma.tarea.updateMany({
      where: {
        tratoId: id,
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
        OR: [{ asignadoAId: responsableCambio.prev }, { asignadoAId: null }],
      },
      data: { asignadoAId: responsableCambio.next },
    });
  }

  // ── Sincronizar próxima acción cuando el trato cambia de etapa ──────────────
  if (etapaCambio) {
    await syncFechaProximaAccion(id);
  }

  // ── Cancelar CxC pendientes cuando el trato se pierde ───────────────────────
  if (cambioAVentaPerdida) {
    // Buscar proyecto y cotizaciones del trato
    const tratoConRelaciones = await prisma.trato.findUnique({
      where: { id },
      select: {
        proyectos: { select: { id: true } },
        cotizaciones: { select: { id: true } },
      },
    });

    const proyectoIds = tratoConRelaciones?.proyectos.map(p => p.id) ?? [];
    const cotizacionIds = tratoConRelaciones?.cotizaciones.map(c => c.id) ?? [];

    // Cancelar CxC PENDIENTE ligadas al proyecto o cotizaciones (no tocar PARCIAL ni LIQUIDADO)
    await prisma.cuentaCobrar.updateMany({
      where: {
        estado: "PENDIENTE",
        OR: [
          ...(proyectoIds.length > 0 ? [{ proyectoId: { in: proyectoIds } }] : []),
          ...(cotizacionIds.length > 0 ? [{ cotizacionId: { in: cotizacionIds } }] : []),
        ],
      },
      data: {
        estado: "CANCELADO",
        notas: `Cancelado automáticamente — trato marcado como Venta Perdida`,
      },
    });

    // Des-confirmar el evento: venta perdida sale del calendario.
    if (cotizacionIds.length > 0) {
      await prisma.cotizacion.updateMany({ where: { id: { in: cotizacionIds } }, data: { eventoConfirmado: false } });
    }
  }

  // ── Si se confirma el evento, crear Proyecto en PLANEACION si no existe ─────
  if (body.confirmadaEn && !trato.prospeccionId) {
    const proyectoExistente = await prisma.proyecto.findFirst({ where: { tratoId: id } });
    if (!proyectoExistente && trato.fechaEventoEstimada) {
      const primeraCotizacion = await prisma.cotizacion.findFirst({
        where: { tratoId: id },
        orderBy: { createdAt: 'asc' },
      });
      if (primeraCotizacion) {
        const numeroProyecto = `P-${Date.now()}`;
        await prisma.proyecto.create({
          data: {
            numeroProyecto,
            tratoId: id,
            cotizacionId: primeraCotizacion.id,
            clienteId: trato.clienteId,
            nombre: trato.nombreEvento || `Proyecto ${trato.cliente?.nombre ?? 'Sin nombre'}`,
            estado: 'PLANEACION',
            tipoEvento: trato.tipoEvento || 'OTRO',
            tipoServicio: trato.tipoServicio ?? null,
            fechaEvento: trato.fechaEventoEstimada,
            lugarEvento: trato.lugarEstimado ?? null,
          },
        });
      }
    }
  }

  // ── Clasificación según el pipeline del trato ────────────────────────────────
  // El pipeline SOLO promueve (prospecto → cliente al cerrar la venta) y nunca
  // degrada: un cliente sigue siendo cliente aunque entre a un nuevo trato en
  // prospección o lo pierda. La reclasificación cliente → prospecto solo ocurre
  // manualmente desde la ficha.
  if (body.etapa) {
    if (body.etapa === "VENTA_CERRADA") {
      if (trato.prospeccionId) {
        await prisma.prospeccion.update({
          where: { id: trato.prospeccionId },
          data: { estado: "CONVERTIDO" },
        });
      }
      // Nos compró ⇒ es cliente, siempre.
      await prisma.cliente.update({
        where: { id: trato.clienteId },
        data: { esProspecto: false },
      });
    } else if (body.etapa === "VENTA_PERDIDA" && trato.prospeccionId) {
      // Reactivar la prospección; la clasificación del contacto no cambia.
      await prisma.prospeccion.update({
        where: { id: trato.prospeccionId },
        data: { estado: "ACTIVO", etapa: "EN_EVALUACION" },
      });
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
      // 1. Borrar proyectos PRIMERO (tienen FK → cotizacion)
      const proyectos = await tx.proyecto.findMany({ where: { tratoId: id }, select: { id: true } });
      for (const proyecto of proyectos) {
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
