import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Obtener proyecto con cotización y equipos confirmados
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      fechaMontaje: true,
      cotizacionId: true,
      cotizacion: {
        select: {
          id: true,
          lineas: {
            where: { tipo: { in: ["EQUIPO_PROPIO", "EQUIPO_EXTERNO"] } },
            select: {
              id: true,
              tipo: true,
              orden: true,
              descripcion: true,
              marca: true,
              modelo: true,
              cantidad: true,
              dias: true,
              precioUnitario: true,
              costoExterno: true,
              proveedorId: true,
              proveedorRentaId: true,
              notasInternas: true,
              equipoId: true,
              equipo: {
                select: { id: true, descripcion: true, cantidadTotal: true, tipo: true },
              },
              proveedor: { select: { id: true, nombre: true, empresa: true } },
              proveedorRenta: { select: { id: true, nombre: true, empresa: true } },
            },
            orderBy: { orden: "asc" },
          },
        },
      },
      equipos: {
        include: {
          equipo: { select: { id: true, descripcion: true, marca: true, modelo: true, cantidadTotal: true } },
          proveedor: { select: { id: true, nombre: true, empresa: true } },
        },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (!proyecto.cotizacion) return NextResponse.json({ lineas: [], proveedores: [], equiposConfirmados: [], cxps: [] });

  // Rango de fechas: desde fechaMontaje (o fechaEvento si no hay) hasta fechaEvento
  const fechaInicio = proyecto.fechaMontaje ?? proyecto.fechaEvento;
  const fechaFin = new Date(proyecto.fechaEvento);
  fechaFin.setHours(23, 59, 59, 999);

  // IDs de equipos PROPIOS con vínculo al inventario
  const propioEquipoIds = proyecto.cotizacion.lineas
    .filter((l) => l.tipo === "EQUIPO_PROPIO" && l.equipoId)
    .map((l) => l.equipoId!);

  // Comprometido en OTRAS cotizaciones (sin proyecto asignado) en el rango de fechas
  const cotConflicto = propioEquipoIds.length > 0
    ? await prisma.cotizacion.findMany({
        where: {
          id: { not: proyecto.cotizacion.id },
          estado: { notIn: ["RECHAZADA", "VENCIDA"] },
          proyecto: { is: null },
          OR: [
            { fechaEvento: { gte: fechaInicio, lte: fechaFin } },
            { trato: { fechaEventoEstimada: { gte: fechaInicio, lte: fechaFin } } },
          ],
          lineas: { some: { equipoId: { in: propioEquipoIds }, tipo: "EQUIPO_PROPIO" } },
        },
        select: {
          numeroCotizacion: true,
          nombreEvento: true,
          estado: true,
          fechaEvento: true,
          lineas: {
            where: { equipoId: { in: propioEquipoIds }, tipo: "EQUIPO_PROPIO" },
            select: { equipoId: true, cantidad: true },
          },
        },
      })
    : [];

  // Comprometido en OTROS proyectos activos en el rango
  const proyConflicto = propioEquipoIds.length > 0
    ? await prisma.proyecto.findMany({
        where: {
          id: { not: id },
          estado: { notIn: ["CANCELADO", "COMPLETADO"] },
          OR: [
            { fechaEvento: { gte: fechaInicio, lte: fechaFin } },
            { fechaMontaje: { gte: fechaInicio, lte: fechaFin } },
          ],
          equipos: { some: { equipoId: { in: propioEquipoIds }, tipo: "PROPIO" } },
        },
        select: {
          numeroProyecto: true,
          nombre: true,
          estado: true,
          fechaEvento: true,
          equipos: {
            where: { equipoId: { in: propioEquipoIds }, tipo: "PROPIO" },
            select: { equipoId: true, cantidad: true },
          },
        },
      })
    : [];

  // Acumular comprometido por equipoId
  type ConflictoInfo = { cantidad: number; refs: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }> };
  const comprometidoMap: Record<string, ConflictoInfo> = {};

  for (const cot of cotConflicto) {
    for (const l of cot.lineas) {
      if (!l.equipoId) continue;
      if (!comprometidoMap[l.equipoId]) comprometidoMap[l.equipoId] = { cantidad: 0, refs: [] };
      comprometidoMap[l.equipoId].cantidad += Math.round(l.cantidad);
      comprometidoMap[l.equipoId].refs.push({
        ref: cot.numeroCotizacion,
        nombre: cot.nombreEvento ?? "Cotización",
        estado: cot.estado,
        fecha: cot.fechaEvento ? cot.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }

  for (const proy of proyConflicto) {
    for (const pe of proy.equipos) {
      if (!comprometidoMap[pe.equipoId]) comprometidoMap[pe.equipoId] = { cantidad: 0, refs: [] };
      comprometidoMap[pe.equipoId].cantidad += pe.cantidad;
      comprometidoMap[pe.equipoId].refs.push({
        ref: proy.numeroProyecto,
        nombre: proy.nombre,
        estado: proy.estado,
        fecha: proy.fechaEvento ? proy.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }

  // CxPs existentes de tipo PROVEEDOR para este proyecto (para saber cuáles ya generaron CxP)
  const cxpsExistentes = await prisma.cuentaPagar.findMany({
    where: { proyectoId: id },
    select: {
      id: true,
      concepto: true,
      monto: true,
      estado: true,
      notas: true,
      proveedor: { select: { id: true, nombre: true } },
    },
  });

  // Clasificar cada línea de cotización
  const lineasClasificadas = proyecto.cotizacion.lineas.map((linea) => {
    let clasificacion: "PROPIO_DISPONIBLE" | "PROPIO_CONFLICTO" | "EXTERNO_INVENTARIO" | "EXTERNO_MANUAL";
    let disponible = 0;
    let comprometido = 0;
    let conflictos: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }> = [];

    if (linea.tipo === "EQUIPO_PROPIO" && linea.equipoId && linea.equipo) {
      // Propio con vínculo al inventario → verificar disponibilidad
      const info = comprometidoMap[linea.equipoId];
      comprometido = info?.cantidad ?? 0;
      disponible = linea.equipo.cantidadTotal - comprometido;
      conflictos = info?.refs ?? [];
      clasificacion = disponible >= linea.cantidad ? "PROPIO_DISPONIBLE" : "PROPIO_CONFLICTO";
    } else if (linea.tipo === "EQUIPO_PROPIO") {
      // Propio sin vínculo al inventario (cotizado manualmente) → siempre disponible, es nuestro
      disponible = linea.cantidad;
      clasificacion = "PROPIO_DISPONIBLE";
    } else if (linea.tipo === "EQUIPO_EXTERNO" && linea.equipoId) {
      clasificacion = "EXTERNO_INVENTARIO";
    } else {
      clasificacion = "EXTERNO_MANUAL";
    }

    // Verificar si ya tiene confirmación (CxP generada para esta línea)
    const cxpVinculada = cxpsExistentes.find((c) => {
      try {
        const nota = JSON.parse(c.notas ?? "{}");
        return nota.lineaId === linea.id;
      } catch {
        return false;
      }
    }) ?? null;

    // Estado de confirmación del proveedor para EXTERNO
    const yaConfirmado = !!(linea.proveedorId || linea.proveedorRentaId) && !!cxpVinculada;

    return {
      id: linea.id,
      tipo: linea.tipo,
      orden: linea.orden,
      descripcion: linea.descripcion,
      marca: linea.marca,
      modelo: linea.modelo,
      cantidad: linea.cantidad,
      dias: linea.dias,
      precioUnitario: linea.precioUnitario,
      costoExterno: linea.costoExterno,
      equipoId: linea.equipoId,
      proveedorId: linea.proveedorId ?? linea.proveedorRentaId,
      proveedor: linea.proveedor ?? linea.proveedorRenta,
      clasificacion,
      disponible,
      comprometido,
      conflictos,
      yaConfirmado,
      cxp: cxpVinculada,
    };
  });

  // Proveedores activos para selector
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, empresa: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    proyecto: {
      id: proyecto.id,
      nombre: proyecto.nombre,
      fechaEvento: proyecto.fechaEvento,
      fechaMontaje: proyecto.fechaMontaje,
    },
    lineas: lineasClasificadas,
    proveedores,
    cxps: cxpsExistentes,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { lineaId, proveedorId, monto, fechaCompromiso, generarCxP } = body as {
    lineaId: string;
    proveedorId: string;
    monto: number;
    fechaCompromiso?: string;
    generarCxP: boolean;
  };

  if (!lineaId || !proveedorId || monto == null) {
    return NextResponse.json({ error: "lineaId, proveedorId y monto son requeridos" }, { status: 400 });
  }

  // Verificar que la línea pertenece a la cotización del proyecto
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { cotizacion: { select: { id: true } }, nombre: true, fechaEvento: true },
  });
  if (!proyecto?.cotizacion) return NextResponse.json({ error: "Proyecto sin cotización" }, { status: 404 });

  const linea = await prisma.cotizacionLinea.findFirst({
    where: { id: lineaId, cotizacionId: proyecto.cotizacion.id },
    select: { id: true, descripcion: true, costoExterno: true },
  });
  if (!linea) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  // Verificar que no exista ya una CxP para esta línea
  const cxpExistente = await prisma.cuentaPagar.findFirst({
    where: {
      proyectoId: id,
      notas: { contains: lineaId },
    },
  });

  if (cxpExistente && generarCxP) {
    // Actualizar la CxP existente con el nuevo monto
    await prisma.cuentaPagar.update({
      where: { id: cxpExistente.id },
      data: { monto, proveedorId, fechaCompromiso: fechaCompromiso ? new Date(fechaCompromiso) : undefined },
    });
  } else if (generarCxP) {
    // Crear nueva CxP
    await prisma.cuentaPagar.create({
      data: {
        tipoAcreedor: "PROVEEDOR",
        proyectoId: id,
        proveedorId,
        concepto: `Renta equipo externo — ${linea.descripcion} · ${proyecto.nombre}`,
        monto,
        montoOriginal: monto,
        estado: "PENDIENTE",
        fechaCompromiso: fechaCompromiso ? new Date(fechaCompromiso) : proyecto.fechaEvento,
        notas: JSON.stringify({ lineaId, tipo: "RENTA_EQUIPO_EXTERNO" }),
      },
    });
  }

  // Actualizar la línea de cotización con el proveedor y costo confirmados
  await prisma.cotizacionLinea.update({
    where: { id: lineaId },
    data: {
      costoExterno: monto,
      // Para EXTERNO_MANUAL, guardamos en proveedorRentaId; para EXTERNO_INVENTARIO en proveedorId
      notasInternas: JSON.stringify({
        confirmadoEn: new Date().toISOString(),
        confirmadoPorId: session.id ?? null,
        proveedorConfirmadoId: proveedorId,
        monto,
      }),
    },
  });

  return NextResponse.json({ ok: true });
}
