import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { guardarVersion } from "@/lib/versiones";
import { createExpiringToken } from "@/lib/tokens";
import { calcularAvanceProyecto } from "@/lib/proyecto-avance";

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
            id: true, numeroCotizacion: true, granTotal: true, aplicaIva: true, diasComidas: true,
            subtotalComidas: true, subtotalOperacion: true, subtotalTransporte: true,
            subtotalHospedaje: true, subtotalEquiposNeto: true, subtotalTerceros: true,
            notasSecciones: true, observaciones: true,
            lineas: {
              select: { id: true, tipo: true, descripcion: true, cantidad: true, nivel: true, jornada: true, precioUnitario: true, notas: true, marca: true, rolTecnicoId: true, rolTecnico: { select: { id: true, nombre: true } } },
              orderBy: { id: "asc" },
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
            equipo: { select: { descripcion: true, marca: true, modelo: true, imagenUrl: true, categoria: { select: { nombre: true } }, accesorios: { select: { id: true, nombre: true, categoria: true }, orderBy: { createdAt: "asc" } } } },
            proveedor: { select: { nombre: true, empresa: true, telefono: true } },
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
        cuentasPagar: { orderBy: [{ estado: "desc" }, { fechaCompromiso: "asc" }] },
        movimientos: {
          where: { tipo: "GASTO" },
          orderBy: { fecha: "desc" },
          include: {
            categoria: { select: { id: true, nombre: true } },
            proveedor: { select: { id: true, nombre: true, empresa: true } },
            cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
          },
        },
        cierreFinanciero: { select: { cerradoEn: true, notas: true, totalCobrado: true, totalGastado: true, utilidadReal: true, margenReal: true, granTotalEstimado: true, costoEstimado: true, utilidadEstimada: true } },
        proveedoresEvento: { orderBy: { createdAt: "asc" } },
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
            id: true, numeroCotizacion: true, granTotal: true, aplicaIva: true, diasComidas: true,
            subtotalComidas: true, subtotalOperacion: true, subtotalTransporte: true,
            subtotalHospedaje: true, subtotalEquiposNeto: true, subtotalTerceros: true,
            notasSecciones: true, observaciones: true,
            lineas: {
              select: { id: true, tipo: true, descripcion: true, cantidad: true, nivel: true, jornada: true, precioUnitario: true, notas: true, marca: true, rolTecnicoId: true, rolTecnico: { select: { id: true, nombre: true } } },
              orderBy: { id: "asc" },
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
            proveedor: { select: { nombre: true, empresa: true, telefono: true } },
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
        cuentasPagar: { orderBy: [{ estado: "desc" }, { fechaCompromiso: "asc" }] },
        movimientos: {
          where: { tipo: "GASTO" },
          orderBy: { fecha: "desc" },
          include: {
            categoria: { select: { id: true, nombre: true } },
            proveedor: { select: { id: true, nombre: true, empresa: true } },
            cuentaOrigen: { select: { id: true, nombre: true, banco: true } },
          },
        },
        cierreFinanciero: { select: { cerradoEn: true, notas: true, totalCobrado: true, totalGastado: true, utilidadReal: true, margenReal: true, granTotalEstimado: true, costoEstimado: true, utilidadEstimada: true } },
        proveedoresEvento: { orderBy: { createdAt: "asc" } },
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
        proveedoresEvento: (proyecto as { proveedoresEvento?: unknown[] }).proveedoresEvento ?? [],
      } as unknown as typeof proyecto;
    }
  }

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const avance = calcularAvanceProyecto({
    tipoServicio: proyecto.tipoServicio ?? null,
    planProduccionAprobado: proyecto.planProduccionAprobado,
    recoleccionStatus: proyecto.recoleccionStatus,
    checklist: proyecto.checklist,
    equiposCount: (proyecto.equipos as unknown[])?.length ?? 0,
  });

  return NextResponse.json({ proyecto: { ...proyecto, avance } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "estado", "nombre", "horaInicioEvento", "horaFinEvento", "fechaMontaje", "fechaEvento",
    "horaInicioMontaje", "duracionMontajeHrs", "lugarEvento", "encargadoLugar",
    "encargadoLugarContacto", "encargadoCliente", "encargadoClienteContacto",
    "descripcionGeneral", "detallesEspecificos",
    "transportes", "proveedorCatering", "contactosDireccion",
    "cronograma", "contactosEmergencia", "comentariosFinales",
    "scoreFotoVideo", "recomendacionFotoVideo", "logisticaRenta", "reporteCatering", "marketingData", "docsTecnicos",
    "notasPortal", "responsables", "proveedoresRenta", "equiposRiderExtra", "zona",
    "planProduccion",
    // Nuevos campos de logística del día del evento
    "horaMontaje", "horaInicio", "horaDesmontaje",
    "direccionVenue", "linkMaps", "indicacionesAcceso",
    "puntoSalidaBodega", "horaSalidaBodega", "indicacionesCliente",
    "notasBriefTecnico", "llamadoBodega",
  ];
  const relationFields = ["encargadoId"];
  // Campos con tipos especiales (boolean/number/fecha) que no deben pasar por `|| null`
  const booleanFields = ["choferExterno", "aplicaCatering"];
  const numberFields = ["choferCosto"];
  const textNullableFields = ["choferNombre", "recoleccionStatus", "recoleccionNotas", "protocoloSalida", "protocoloEntrada"];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if ((key === "fechaMontaje" || key === "llamadoBodega") && body[key]) {
        data[key] = new Date(body[key]);
      } else if (key === "fechaEvento" && body[key]) {
        // Parse date-only string as UTC noon to avoid timezone shifting
        data[key] = new Date(body[key].substring(0, 10) + "T12:00:00Z");
      } else {
        data[key] = body[key] || null;
      }
    }
  }
  // planProduccionAprobado — boolean especial con timestamp
  if ("planProduccionAprobado" in body) {
    data["planProduccionAprobado"] = Boolean(body["planProduccionAprobado"]);
    if (body["planProduccionAprobado"]) {
      data["planProduccionAprobadoEn"] = new Date();
      // Auto-advance to CONFIRMADO if currently in PLANEACION
      const current = await prisma.proyecto.findUnique({ where: { id }, select: { estado: true } });
      if (current?.estado === "PLANEACION") {
        (data as Record<string, unknown>).estado = "CONFIRMADO";
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

  // ── Auto-crear levantamiento de contenido al marcar COMPLETADO ──
  if (data.estado === "COMPLETADO" && proyectoAntes?.estado !== "COMPLETADO") {
    const levExistente = await prisma.levantamientoContenido.findUnique({ where: { tratoId: proyecto.tratoId } });
    if (!levExistente) {
      const clienteNombre = await prisma.cliente.findUnique({ where: { id: proyecto.clienteId }, select: { nombre: true } });
      await prisma.levantamientoContenido.create({
        data: {
          tratoId: proyecto.tratoId,
          nombreEvento: proyecto.nombre,
          nombreCliente: clienteNombre?.nombre ?? null,
          fecha: proyecto.fechaEvento,
          planCobertura: "BASICO",
          notasAdicionales: "Pendiente de material",
        },
      });
    }
  }

  // ── Auto-crear CxP para técnicos con pago pendiente al marcar COMPLETADO ──
  if (data.estado === "COMPLETADO" && proyectoAntes?.estado !== "COMPLETADO") {
    const personalPendiente = await prisma.proyectoPersonal.findMany({
      where: { proyectoId: id, estadoPago: "PENDIENTE", tarifaAcordada: { gt: 0 } },
      include: { tecnico: { select: { nombre: true } }, rolTecnico: { select: { nombre: true } } },
    });

    if (personalPendiente.length > 0) {
      // Contar CxP existentes por técnico para no duplicar las creadas al asignar
      const cxpExistentes = await prisma.cuentaPagar.findMany({
        where: { proyectoId: id, tipoAcreedor: "TECNICO", tecnicoId: { not: null } },
        select: { tecnicoId: true },
      });
      const cxpPorTecnico = new Map<string, number>();
      for (const c of cxpExistentes) {
        if (c.tecnicoId) cxpPorTecnico.set(c.tecnicoId, (cxpPorTecnico.get(c.tecnicoId) ?? 0) + 1);
      }
      // Contar entradas de personal por técnico para comparar
      const personalPorTecnico = new Map<string, number>();
      const personalSinCxP = personalPendiente.filter(p => {
        if (!p.tecnicoId) return true;
        const existentes = cxpPorTecnico.get(p.tecnicoId) ?? 0;
        const visto = personalPorTecnico.get(p.tecnicoId) ?? 0;
        personalPorTecnico.set(p.tecnicoId, visto + 1);
        return visto >= existentes;
      });

      if (personalSinCxP.length > 0) {
        const fechaCompromiso = proximoMiercolesTraEvento(proyecto.fechaEvento ?? new Date());
        await prisma.cuentaPagar.createMany({
          data: personalSinCxP.map(p => ({
            tipoAcreedor: "TECNICO",
            tecnicoId: p.tecnicoId ?? undefined,
            proyectoId: id,
            concepto: `Honorarios - ${p.tecnico?.nombre ?? "Técnico"} (${p.rolTecnico?.nombre ?? p.participacion ?? "Operación"}) · ${proyecto.numeroProyecto}`,
            monto: p.tarifaAcordada!,
            fechaCompromiso,
            estado: "PENDIENTE",
          })),
        });
      }
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
    // 1. Romper FK de Abono → Movimiento antes de borrar movimientos
    await tx.abono.updateMany({
      where: { cuentaCobrar: { proyectoId: id } },
      data: { movimientoId: null },
    });

    // 2. Romper FK de CxP → Movimiento
    await tx.cuentaPagar.updateMany({
      where: { proyectoId: id },
      data: { movimientoId: null },
    });

    // 3. Borrar movimientos financieros del proyecto
    await tx.movimientoFinanciero.deleteMany({ where: { proyectoId: id } });

    // 4. Borrar CxC y CxP ligadas al proyecto (abonos se eliminan en cascada)
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
