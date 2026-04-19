import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const trato = await prisma.trato.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, tipoCliente: true, clasificacion: true, telefono: true, correo: true } },
      responsable: { select: { id: true, name: true } },
      vendedorOrigen: { select: { id: true, name: true } },
      cotizaciones: {
        select: { id: true, numeroCotizacion: true, estado: true, granTotal: true, createdAt: true, proyecto: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
      },
      archivos: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ trato });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "etapa", "estatusContacto", "tipoEvento", "tipoServicio", "lugarEstimado",
    "fechaEventoEstimada", "presupuestoEstimado", "clasificacion", "notas",
    "proximaAccion", "fechaProximaAccion", "motivoPerdida", "origenLead", "tipoLead",
    "origenVenta", "vendedorOrigenId", "responsableId",
    // Scouting
    "scoutingData",
    // Nurturing
    "tipoProspecto", "nurturingData",
    // Descubrimiento
    "canalAtencion", "nombreEvento", "duracionEvento", "asistentesEstimados",
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
      } else if (key === "descubrimientoCompleto" || key === "tradeCalificado" || key === "familyAndFriends") {
        data[key] = Boolean(body[key]);
      } else if (key === "tradeNivel") {
        data[key] = body[key] !== null && body[key] !== "" ? parseInt(body[key]) : null;
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  // Auto-set fechaCierre cuando etapa cambia a VENTA_CERRADA
  if (body.etapa === "VENTA_CERRADA" && !data.fechaCierre) {
    const current = await prisma.trato.findUnique({ where: { id }, select: { etapa: true, fechaCierre: true } });
    if (current && current.etapa !== "VENTA_CERRADA" && !current.fechaCierre) {
      data.fechaCierre = new Date();
    }
  }

  const trato = await prisma.trato.update({ where: { id }, data });
  return NextResponse.json({ trato });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

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
        await tx.cuentaCobrar.updateMany({ where: { proyectoId: proyecto.id }, data: { movimientoId: null } });
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DELETE /api/tratos]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
