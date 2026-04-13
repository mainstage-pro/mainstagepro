import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true } },
      encargado: { select: { name: true } },
      trato: { select: { tipoEvento: true, tipoServicio: true, ideasReferencias: true, ventanaMontajeInicio: true, ventanaMontajeFin: true, responsable: { select: { name: true } } } },
      cotizacion: { select: { id: true, numeroCotizacion: true, granTotal: true, aplicaIva: true } },
      personal: {
        include: {
          tecnico: { select: { id: true, nombre: true, celular: true, rol: { select: { nombre: true } } } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
      equipos: {
        include: {
          equipo: { select: { descripcion: true, marca: true, categoria: { select: { nombre: true } } } },
          proveedor: { select: { nombre: true, telefono: true } },
        },
        orderBy: { id: "asc" },
      },
      checklist: { orderBy: { orden: "asc" } },
      archivos: { orderBy: { createdAt: "asc" } },
      bitacora: {
        include: { usuario: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      cuentasCobrar: true,
      cuentasPagar: true,
      movimientos: {
        where: { tipo: "GASTO" },
        orderBy: { fecha: "desc" },
        include: {
          categoria: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
        },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ proyecto });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "estado", "nombre", "horaInicioEvento", "horaFinEvento", "fechaMontaje",
    "horaInicioMontaje", "duracionMontajeHrs", "lugarEvento", "encargadoLugar",
    "encargadoLugarContacto", "descripcionGeneral", "detallesEspecificos",
    "encargadoCliente", "transportes", "proveedorCatering", "contactosDireccion",
    "cronograma", "contactosEmergencia", "comentariosFinales",
    "scoreFotoVideo", "recomendacionFotoVideo", "logisticaRenta", "reporteCatering", "marketingData",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "fechaMontaje" && body[key]) {
        data[key] = new Date(body[key]);
      } else {
        data[key] = body[key] || null;
      }
    }
  }

  const proyectoAntes = await prisma.proyecto.findUnique({ where: { id }, select: { estado: true } });
  const proyecto = await prisma.proyecto.update({ where: { id }, data });

  // ── Auto-crear CxP para técnicos con pago pendiente al marcar COMPLETADO ──
  if (data.estado === "COMPLETADO" && proyectoAntes?.estado !== "COMPLETADO") {
    const personalPendiente = await prisma.proyectoPersonal.findMany({
      where: { proyectoId: id, estadoPago: "PENDIENTE", tarifaAcordada: { gt: 0 } },
      include: { tecnico: { select: { nombre: true } }, rolTecnico: { select: { nombre: true } } },
    });

    if (personalPendiente.length > 0) {
      // Fecha compromiso: 7 días después del evento
      const fechaCompromiso = new Date(proyecto.fechaEvento ?? new Date());
      fechaCompromiso.setDate(fechaCompromiso.getDate() + 7);

      await prisma.cuentaPagar.createMany({
        data: personalPendiente.map(p => ({
          tipoAcreedor: "TECNICO",
          tecnicoId: p.tecnicoId ?? undefined,
          proyectoId: id,
          concepto: `Honorarios - ${p.tecnico?.nombre ?? "Técnico"} (${p.rolTecnico?.nombre ?? p.participacion ?? "Operación"}) · ${proyecto.numeroProyecto}`,
          monto: p.tarifaAcordada!,
          fechaCompromiso,
          estado: "PENDIENTE",
        })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ proyecto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, cotizacionId: true, tratoId: true },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // 1. Romper FK de CxC → Movimiento antes de borrar movimientos
    await tx.cuentaCobrar.updateMany({
      where: { proyectoId: id },
      data: { movimientoId: null },
    });

    // 2. Romper FK de CxP → Movimiento
    await tx.cuentaPagar.updateMany({
      where: { proyectoId: id },
      data: { movimientoId: null },
    });

    // 3. Borrar movimientos financieros del proyecto
    await tx.movimientoFinanciero.deleteMany({ where: { proyectoId: id } });

    // 4. Borrar CxC y CxP ligadas al proyecto
    await tx.cuentaCobrar.deleteMany({ where: { proyectoId: id } });
    await tx.cuentaPagar.deleteMany({ where: { proyectoId: id } });

    // 5. Borrar evaluaciones si existen
    await tx.evaluacionInterna.deleteMany({ where: { proyectoId: id } });
    await tx.evaluacionCliente.deleteMany({ where: { proyectoId: id } });

    // 6. Borrar el proyecto (cascade: personal, equipos, checklist, archivos, bitácora)
    await tx.proyecto.delete({ where: { id } });

    // 7. Mantener cotización en APROBADA → el botón "Crear proyecto" reaparecerá automáticamente
    //    (El proyecto se desvincula al borrarse, no se necesita cambiar el estado)
  });

  return NextResponse.json({ ok: true, cotizacionId: proyecto.cotizacionId });
}
