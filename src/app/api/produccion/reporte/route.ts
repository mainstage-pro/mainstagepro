import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcularAvanceProyecto } from "@/lib/proyecto-avance";

function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") ?? getMesActual();
  const [year, month] = mes.split("-").map(Number);
  if (!year || !month) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const inicio = new Date(year, month - 1, 1);
  const fin = new Date(year, month, 0, 23, 59, 59, 999);

  // ─────────────────────────────────────────────────────────────────────────────
  // SECCIÓN 1: Checklist Semanal de Bodega
  // ─────────────────────────────────────────────────────────────────────────────
  const checklistsBodega = await prisma.checklistBodega.findMany({
    where: { fechaInicio: { gte: inicio, lte: fin } },
    include: {
      items: {
        include: { equipo: { select: { id: true, descripcion: true, marca: true, modelo: true, categoria: { select: { nombre: true } } } } },
        orderBy: { orden: "asc" },
      },
    },
    orderBy: { fechaInicio: "asc" },
  });

  const checklistSemanal = checklistsBodega.map((cl) => {
    const total = cl.items.length;
    const enBodega = cl.items.filter((i) => i.estado === "EN_BODEGA").length;
    const enRenta = cl.items.filter((i) => i.estado === "EN_RENTA_O_USO").length;
    const extraviados = cl.items.filter((i) => i.estado === "EXTRAVIADO");
    const perdidos = cl.items.filter((i) => i.estado === "PERDIDO");
    const pendientes = cl.items.filter((i) => i.estado === "PENDIENTE").length;
    const cumplimiento = total > 0 ? Math.round(((enBodega + enRenta) / total) * 100) : 0;
    return {
      id: cl.id,
      semana: cl.semana,
      fechaInicio: cl.fechaInicio,
      estado: cl.estado,
      notas: cl.notas,
      cerradoEn: cl.cerradoEn,
      stats: { total, enBodega, enRenta, pendientes, extraviados: extraviados.length, perdidos: perdidos.length, cumplimiento },
      alertas: [...extraviados, ...perdidos].map((i) => ({
        id: i.id,
        descripcion: i.descripcion,
        estado: i.estado,
        notas: i.notas,
        equipo: i.equipo,
        cantidadEsperada: i.cantidadEsperada,
        cantidadContada: i.cantidadContada,
      })),
    };
  });

  // Resumen global del mes
  const semanasTotales = checklistSemanal.length;
  const semanasCompletadas = checklistSemanal.filter((c) => c.estado === "COMPLETADO").length;
  const semanasConAlertas = checklistSemanal.filter((c) => c.estado === "CON_ALERTAS").length;

  // ─────────────────────────────────────────────────────────────────────────────
  // SECCIÓN 2: Mantenimiento y Revisión de Equipos
  // ─────────────────────────────────────────────────────────────────────────────
  const revisiones = await prisma.mantenimientoEquipo.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    include: {
      equipo: {
        select: {
          id: true, descripcion: true, marca: true, modelo: true, estado: true,
          categoria: { select: { nombre: true } },
        },
      },
      unidad: { select: { id: true, codigo: true, estado: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // Agrupar por equipo para detectar equipos con fallas en el mes
  const equiposEnRevision = new Map<string, {
    equipo: typeof revisiones[0]["equipo"];
    revisiones: typeof revisiones;
    tuvoBajaFalla: boolean;
    costoTotal: number;
  }>();
  for (const r of revisiones) {
    const key = r.equipoId;
    if (!equiposEnRevision.has(key)) {
      equiposEnRevision.set(key, { equipo: r.equipo, revisiones: [], tuvoBajaFalla: false, costoTotal: 0 });
    }
    const entry = equiposEnRevision.get(key)!;
    entry.revisiones.push(r);
    if (r.estadoEquipo && r.estadoEquipo !== "ACTIVO") entry.tuvoBajaFalla = true;
    entry.costoTotal += r.costoReparacion ?? 0;
  }

  // Equipos actualmente en taller: mantenimiento o reparación (independiente del mes)
  const equiposEnMantenimiento = await prisma.equipo.findMany({
    where: { estado: { in: ["EN_MANTENIMIENTO", "EN_REPARACION"] }, activo: true },
    include: {
      categoria: { select: { nombre: true } },
      mantenimientos: {
        orderBy: { fecha: "desc" },
        take: 1,
        select: { id: true, fecha: true, tipo: true, accionRealizada: true, comentarios: true, costoReparacion: true, estadoEquipo: true },
      },
      unidades: { where: { estado: { in: ["EN_MANTENIMIENTO", "EN_REPARACION"] } }, select: { id: true, codigo: true } },
    },
    orderBy: { descripcion: "asc" },
  });

  const totalCostoReparaciones = revisiones.reduce((s, r) => s + (r.costoReparacion ?? 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // SECCIÓN 3: Altas y Bajas de Inventario
  // ─────────────────────────────────────────────────────────────────────────────
  const [altas, bajas] = await Promise.all([
    // Altas: equipos creados en el mes
    prisma.equipo.findMany({
      where: { createdAt: { gte: inicio, lte: fin } },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Bajas: equipos con estado DADO_DE_BAJA cuyo fechaBaja (o updatedAt como fallback) está en el mes
    prisma.equipo.findMany({
      where: {
        estado: "DADO_DE_BAJA",
        OR: [
          { fechaBaja: { gte: inicio, lte: fin } },
          { fechaBaja: null, updatedAt: { gte: inicio, lte: fin } },
        ],
      },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Snapshot general del estado actual del inventario
  const inventarioStats = await prisma.equipo.groupBy({
    by: ["estado"],
    where: { activo: true },
    _count: { id: true },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECCIÓN 4: Mantenimiento de Vehículos
  // ─────────────────────────────────────────────────────────────────────────────
  const mantenimientosVehiculos = await prisma.mantenimientoVehiculo.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    include: {
      vehiculo: { select: { id: true, nombre: true, marca: true, modelo: true, placas: true, color: true } },
    },
    orderBy: { fecha: "asc" },
  });

  // Agrupar por vehículo
  const vehiculosConMantenimiento = new Map<string, {
    vehiculo: typeof mantenimientosVehiculos[0]["vehiculo"];
    registros: typeof mantenimientosVehiculos;
    costoTotal: number;
  }>();
  for (const m of mantenimientosVehiculos) {
    const key = m.vehiculoId;
    if (!vehiculosConMantenimiento.has(key)) {
      vehiculosConMantenimiento.set(key, { vehiculo: m.vehiculo, registros: [], costoTotal: 0 });
    }
    const entry = vehiculosConMantenimiento.get(key)!;
    entry.registros.push(m);
    entry.costoTotal += m.costo ?? 0;
  }

  const totalCostoVehiculos = mantenimientosVehiculos.reduce((s, m) => s + (m.costo ?? 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // SECCIÓN 5: Coordinación y Proyectos del Mes
  // ─────────────────────────────────────────────────────────────────────────────
  // Proyectos con fechaEvento en el mes, sin importar estado (incluyendo EN_CURSO, PLANEACION)
  // excluimos solo CANCELADO
  const proyectos = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: inicio, lte: fin },
      estado: { not: "CANCELADO" },
    },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      encargado: { select: { id: true, name: true } },
      trato: { select: { tipoServicio: true } },
      checklist: { orderBy: { orden: "asc" } },
      equipos: { select: { id: true } },
      evaluacionInterna: {
        select: {
          promedioCalculado: true,
          planeacionPrevia: true,
          cumplimientoTecnico: true,
          puntualidad: true,
          resolucionOperativa: true,
          desempenoPersonal: true,
          resultadoGeneral: true,
          notas: true,
        },
      },
      reportePostEvento: {
        select: {
          estado: true,
          calificacionEquipo: true,
          seEjecutoSegunPlan: true,
          fallasEquipo: true,
          equipoMantenimiento: true,
          briefCompleto: true,
          equipoRegreso: true,
          respondidoEn: true,
        },
      },
      cierreFinanciero: {
        select: {
          granTotalEstimado: true,
          totalCobrado: true,
          utilidadReal: true,
          margenReal: true,
        },
      },
    },
    orderBy: [{ tipoServicio: "asc" }, { fechaEvento: "asc" }],
  });

  const proyectosConAvance = proyectos.map((p) => {
    const tipoServicio = p.tipoServicio ?? p.trato?.tipoServicio ?? null;
    const avance = calcularAvanceProyecto({
      tipoServicio,
      planProduccionAprobado: p.planProduccionAprobado,
      recoleccionStatus: p.recoleccionStatus,
      checklist: p.checklist.map((c) => ({ completado: c.completado, item: c.item })),
      equiposCount: p.equipos.length,
    });

    const checklistTotal = p.checklist.filter((c) => c.tipo === "OPERACION").length;
    const checklistCompletados = p.checklist.filter((c) => c.tipo === "OPERACION" && c.completado).length;

    return {
      id: p.id,
      numeroProyecto: p.numeroProyecto,
      nombre: p.nombre,
      estado: p.estado,
      tipoServicio,
      tipoEvento: p.tipoEvento,
      fechaEvento: p.fechaEvento,
      lugarEvento: p.lugarEvento,
      zona: p.zona,
      cliente: p.cliente,
      encargado: p.encargado,
      planProduccionAprobado: p.planProduccionAprobado,
      recoleccionStatus: p.recoleccionStatus,
      avance,
      checklist: { total: checklistTotal, completados: checklistCompletados, porcentaje: checklistTotal > 0 ? Math.round((checklistCompletados / checklistTotal) * 100) : 0 },
      evaluacionInterna: p.evaluacionInterna,
      reportePostEvento: p.reportePostEvento,
      cierreFinanciero: p.cierreFinanciero,
    };
  });

  // KPIs de proyectos
  const proyKpis = {
    total: proyectosConAvance.length,
    renta: proyectosConAvance.filter((p) => p.tipoServicio === "RENTA").length,
    produccion: proyectosConAvance.filter((p) => p.tipoServicio === "PRODUCCION_TECNICA").length,
    completados: proyectosConAvance.filter((p) => p.estado === "COMPLETADO").length,
    postEventoCompletado: proyectosConAvance.filter((p) => p.reportePostEvento?.estado === "completado").length,
    conEvaluacion: proyectosConAvance.filter((p) => p.evaluacionInterna !== null).length,
    promedioAvance: proyectosConAvance.length > 0 ? Math.round(proyectosConAvance.reduce((s, p) => s + p.avance, 0) / proyectosConAvance.length) : 0,
    promedioCalificacion: (() => {
      const conEval = proyectosConAvance.filter((p) => p.evaluacionInterna?.promedioCalculado);
      return conEval.length > 0
        ? Math.round((conEval.reduce((s, p) => s + (p.evaluacionInterna?.promedioCalculado ?? 0), 0) / conEval.length) * 10) / 10
        : null;
    })(),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RESPUESTA
  // ─────────────────────────────────────────────────────────────────────────────
  return NextResponse.json({
    mes,
    periodo: { inicio: inicio.toISOString(), fin: fin.toISOString() },

    checklistSemanal: {
      checklists: checklistSemanal,
      kpis: { semanasTotales, semanasCompletadas, semanasConAlertas },
    },

    mantenimientoEquipos: {
      revisiones: revisiones.map((r) => ({
        id: r.id,
        fecha: r.fecha,
        tipo: r.tipo,
        accionRealizada: r.accionRealizada,
        estadoEquipo: r.estadoEquipo,
        comentarios: r.comentarios,
        costoReparacion: r.costoReparacion,
        descripcionReparacion: r.descripcionReparacion,
        proximoMantenimiento: r.proximoMantenimiento,
        equipo: r.equipo,
        unidad: r.unidad,
      })),
      equiposPorEquipo: Array.from(equiposEnRevision.values()),
      equiposEnMantenimientoActual: equiposEnMantenimiento,
      kpis: {
        totalRevisiones: revisiones.length,
        equiposRevisados: equiposEnRevision.size,
        equiposConFalla: Array.from(equiposEnRevision.values()).filter((e) => e.tuvoBajaFalla).length,
        equiposEnMantenimiento: equiposEnMantenimiento.length,
        totalCostoReparaciones,
        // Meta: 4 revisiones/mes (pueden ser a distintos equipos)
        metaRevisiones: 4,
        cumplimientoMeta: Math.min(Math.round((revisiones.length / 4) * 100), 100),
      },
    },

    inventario: {
      altas: altas.map((e) => ({
        id: e.id,
        descripcion: e.descripcion,
        marca: e.marca,
        modelo: e.modelo,
        tipo: e.tipo,
        propietario: e.propietario,
        cantidadTotal: e.cantidadTotal,
        categoria: e.categoria,
        createdAt: e.createdAt,
      })),
      bajas: bajas.map((e) => ({
        id: e.id,
        descripcion: e.descripcion,
        marca: e.marca,
        modelo: e.modelo,
        tipo: e.tipo,
        propietario: e.propietario,
        cantidadTotal: e.cantidadTotal,
        categoria: e.categoria,
        fechaBaja: e.fechaBaja,
        updatedAt: e.updatedAt,
      })),
      estadoActual: inventarioStats.reduce((acc, s) => {
        acc[s.estado] = s._count.id;
        return acc;
      }, {} as Record<string, number>),
      kpis: {
        altas: altas.length,
        bajas: bajas.length,
        delta: altas.length - bajas.length,
      },
    },

    vehiculos: {
      vehiculos: Array.from(vehiculosConMantenimiento.values()),
      totalRegistros: mantenimientosVehiculos.length,
      totalCosto: totalCostoVehiculos,
    },

    proyectos: {
      lista: proyectosConAvance,
      kpis: proyKpis,
    },
  });
}
