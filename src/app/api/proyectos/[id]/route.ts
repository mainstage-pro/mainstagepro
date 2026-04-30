import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { guardarVersion } from "@/lib/versiones";
import { createExpiringToken } from "@/lib/tokens";

function proximoMiercolesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Non-admins: verify access to this specific project if project-level restrictions are set
  if (session.role !== "ADMIN") {
    const projectAccesos = await prisma.moduloAcceso.findMany({
      where: { userId: session.id, moduloKey: { startsWith: "proyecto:" } },
      select: { moduloKey: true },
    });
    if (projectAccesos.length > 0) {
      const allowed = projectAccesos.map(a => a.moduloKey.replace("proyecto:", ""));
      if (!allowed.includes(id)) {
        return NextResponse.json({ error: "Sin acceso a este proyecto" }, { status: 403 });
      }
    }
  }

  // Try with rider accessories (new tables); fall back without them if tables don't exist yet
  let proyecto = null;
  try {
    proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true } },
        encargado: { select: { id: true, name: true } },
        trato: { select: { tipoEvento: true, tipoServicio: true, ideasReferencias: true, notas: true, familyAndFriends: true, tradeCalificado: true, ventanaMontajeInicio: true, ventanaMontajeFin: true, responsable: { select: { name: true } } } },
        cotizacion: {
          select: {
            id: true, numeroCotizacion: true, granTotal: true, aplicaIva: true, diasComidas: true, subtotalComidas: true,
            lineas: {
              where: { tipo: "OPERACION_TECNICA" },
              select: { id: true, descripcion: true, cantidad: true, nivel: true, jornada: true, precioUnitario: true, rolTecnicoId: true, rolTecnico: { select: { id: true, nombre: true } } },
            },
          },
        },
        personal: {
          include: {
            tecnico: { select: { id: true, nombre: true, celular: true, rol: { select: { nombre: true } } } },
            rolTecnico: { select: { nombre: true } },
          },
          orderBy: { id: "asc" },
        },
        equipos: {
          include: {
            equipo: { select: { descripcion: true, marca: true, modelo: true, categoria: { select: { nombre: true } }, accesorios: { select: { id: true, nombre: true, categoria: true }, orderBy: { createdAt: "asc" } } } },
            proveedor: { select: { nombre: true, telefono: true } },
            riderAccesorios: { orderBy: { orden: "asc" } },
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
            categoria: { select: { id: true, nombre: true } },
            proveedor: { select: { id: true, nombre: true } },
            cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
          },
        },
        cierreFinanciero: { select: { cerradoEn: true, notas: true } },
      },
    });
  } catch {
    // Fallback: query without new rider tables (migration may not have run yet)
    proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true } },
        encargado: { select: { id: true, name: true } },
        trato: { select: { tipoEvento: true, tipoServicio: true, ideasReferencias: true, notas: true, familyAndFriends: true, tradeCalificado: true, ventanaMontajeInicio: true, ventanaMontajeFin: true, responsable: { select: { name: true } } } },
        cotizacion: {
          select: {
            id: true, numeroCotizacion: true, granTotal: true, aplicaIva: true, diasComidas: true, subtotalComidas: true,
            lineas: {
              where: { tipo: "OPERACION_TECNICA" },
              select: { id: true, descripcion: true, cantidad: true, nivel: true, jornada: true, precioUnitario: true, rolTecnicoId: true, rolTecnico: { select: { id: true, nombre: true } } },
            },
          },
        },
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
            categoria: { select: { id: true, nombre: true } },
            proveedor: { select: { id: true, nombre: true } },
            cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
          },
        },
        cierreFinanciero: { select: { cerradoEn: true, notas: true } },
      },
    });
    // Normalize fallback: add empty arrays for new fields
    if (proyecto) {
      proyecto = {
        ...proyecto,
        cotizacion: proyecto.cotizacion ? { ...(proyecto.cotizacion as Record<string, unknown>), lineas: [] } : null,
        equipos: proyecto.equipos.map((e: Record<string, unknown>) => ({
          ...e,
          riderAccesorios: [],
          equipo: { ...(e.equipo as Record<string, unknown>), accesorios: [] },
        })),
      } as unknown as typeof proyecto;
    }
  }

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
    "scoreFotoVideo", "recomendacionFotoVideo", "logisticaRenta", "reporteCatering", "marketingData", "docsTecnicos",
    "notasPortal", "responsables", "proveedoresRenta", "zona",
  ];
  const relationFields = ["encargadoId"];
  // Campos con tipos especiales (boolean/number/fecha) que no deben pasar por `|| null`
  const booleanFields = ["choferExterno"];
  const numberFields = ["choferCosto"];
  const textNullableFields = ["choferNombre", "recoleccionStatus", "recoleccionNotas", "protocoloSalida", "protocoloEntrada"];

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
  // Campos de chofer
  for (const key of booleanFields) {
    if (key in body) data[key] = Boolean(body[key]);
  }
  for (const key of numberFields) {
    if (key in body) data[key] = body[key] != null ? Number(body[key]) : null;
  }
  for (const key of textNullableFields) {
    if (key in body) data[key] = body[key] || null;
  }
  // recoleccionFechaReal es DateTime
  if ("recoleccionFechaReal" in body) {
    data["recoleccionFechaReal"] = body["recoleccionFechaReal"] ? new Date(body["recoleccionFechaReal"]) : null;
  }
  // encargadoId — relation field
  for (const key of relationFields) {
    if (key in body) data[key] = body[key] || null;
  }

  const proyectoAntes = await prisma.proyecto.findUnique({ where: { id }, select: { estado: true, choferExterno: true, choferNombre: true, choferCosto: true } });
  let proyecto = await prisma.proyecto.update({ where: { id }, data });

  // ── Auto-crear/actualizar CxP para chofer externo ──────────────────────────
  if ("choferNombre" in body || "choferExterno" in body || "choferCosto" in body) {
    const esExterno = (data.choferExterno ?? proyectoAntes?.choferExterno) as boolean;
    const costo = (data.choferCosto ?? proyectoAntes?.choferCosto) as number | null | undefined;
    const nombre = (data.choferNombre ?? proyectoAntes?.choferNombre) as string | null | undefined;
    if (esExterno && costo && costo > 0 && nombre) {
      // Buscar CxP existente de chofer para este proyecto
      const cxpExistente = await prisma.cuentaPagar.findFirst({
        where: { proyectoId: id, concepto: { contains: "Chofer" }, tipoAcreedor: "OTRO" },
      });
      const fechaEvento = proyecto.fechaEvento ?? new Date();
      const fechaCompromiso = proximoMiercolesTraEvento(fechaEvento);
      if (cxpExistente) {
        await prisma.cuentaPagar.update({
          where: { id: cxpExistente.id },
          data: { concepto: `Chofer externo — ${nombre}`, monto: costo, fechaCompromiso },
        });
      } else {
        await prisma.cuentaPagar.create({
          data: {
            tipoAcreedor: "OTRO",
            proyectoId: id,
            concepto: `Chofer externo — ${nombre}`,
            monto: costo as number,
            fechaCompromiso,
            estado: "PENDIENTE",
            notas: "Generado automáticamente al asignar chofer externo.",
          },
        });
      }
      // Refrescar proyecto con CxP
      proyecto = await prisma.proyecto.findUnique({ where: { id } }) as typeof proyecto;
    }
  }

  // ── Auto-crear evaluación de cliente al marcar COMPLETADO ──
  if (data.estado === "COMPLETADO" && proyectoAntes?.estado !== "COMPLETADO") {
    const evalExistente = await prisma.evaluacionCliente.findUnique({ where: { proyectoId: id } });
    if (!evalExistente) {
      await prisma.evaluacionCliente.create({ data: { proyectoId: id, tokenAcceso: createExpiringToken(180) } });
    }
  }

  // ── Auto-crear CxP para técnicos con pago pendiente al marcar COMPLETADO ──
  if (data.estado === "COMPLETADO" && proyectoAntes?.estado !== "COMPLETADO") {
    const personalPendiente = await prisma.proyectoPersonal.findMany({
      where: { proyectoId: id, estadoPago: "PENDIENTE", tarifaAcordada: { gt: 0 } },
      include: { tecnico: { select: { nombre: true } }, rolTecnico: { select: { nombre: true } } },
    });

    if (personalPendiente.length > 0) {
        const fechaCompromiso = proximoMiercolesTraEvento(proyecto.fechaEvento ?? new Date());

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

  if (data.estado && data.estado !== proyectoAntes?.estado) {
    await logActividad(session.id, "ESTADO", "proyecto", id, `Proyecto pasó a ${data.estado}: ${proyecto.nombre}`);
  } else if (Object.keys(data).length > 0) {
    await logActividad(session.id, "EDITAR", "proyecto", id, `Proyecto actualizado: ${proyecto.nombre}`);
    await guardarVersion(session.id, "proyecto", id, { nombre: proyecto.nombre, estado: proyecto.estado });
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
