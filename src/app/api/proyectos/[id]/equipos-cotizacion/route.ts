import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── Tipos de clasificación (5 estados) ─────────────────────────────────────
export type ClasifEquipo =
  | "PROPIO_INVENTARIO"   // En nuestro inventario, disponibilidad verificada
  | "PROPIO_MANUAL"       // Marcado como propio pero sin vínculo al inventario
  | "EXTERNO_INVENTARIO"  // En inventario externo/renta catalogado
  | "EXTERNO_CONFIRMADO"  // Proveedor externo asignado + CxP generada
  | "A_CONSEGUIR";        // Sin proveedor todavía

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

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
  if (!proyecto.cotizacion) return NextResponse.json({ lineas: [], proveedores: [] });

  // ── Rango de fechas del evento ─────────────────────────────────────────────
  const fechaInicio = proyecto.fechaMontaje ?? proyecto.fechaEvento;
  const fechaFin = new Date(proyecto.fechaEvento);
  fechaFin.setHours(23, 59, 59, 999);

  // ── IDs de equipos propios vinculados al inventario ────────────────────────
  const propioEquipoIds = proyecto.cotizacion.lineas
    .filter((l) => l.tipo === "EQUIPO_PROPIO" && l.equipoId && l.equipo?.tipo === "PROPIO")
    .map((l) => l.equipoId!);

  // ── Conflictos en otras cotizaciones ──────────────────────────────────────
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

  // ── Conflictos en otros proyectos ─────────────────────────────────────────
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

  // ── Mapa de comprometido por equipoId ─────────────────────────────────────
  const comprometidoMap: Record<string, { cantidad: number; refs: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }> }> = {};

  for (const cot of cotConflicto) {
    for (const l of cot.lineas) {
      if (!l.equipoId) continue;
      if (!comprometidoMap[l.equipoId]) comprometidoMap[l.equipoId] = { cantidad: 0, refs: [] };
      comprometidoMap[l.equipoId].cantidad += l.cantidad;
      comprometidoMap[l.equipoId].refs.push({
        ref: cot.numeroCotizacion,
        nombre: cot.nombreEvento ?? "Sin nombre",
        estado: cot.estado,
        fecha: cot.fechaEvento ? cot.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }
  for (const proy of proyConflicto) {
    for (const e of proy.equipos) {
      if (!e.equipoId) continue;
      if (!comprometidoMap[e.equipoId]) comprometidoMap[e.equipoId] = { cantidad: 0, refs: [] };
      comprometidoMap[e.equipoId].cantidad += e.cantidad;
      comprometidoMap[e.equipoId].refs.push({
        ref: proy.numeroProyecto,
        nombre: proy.nombre,
        estado: proy.estado,
        fecha: proy.fechaEvento ? proy.fechaEvento.toISOString().split("T")[0] : null,
      });
    }
  }

  // ── CxPs existentes para este proyecto ────────────────────────────────────
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

  // ── Clasificar cada línea ──────────────────────────────────────────────────
  const lineasClasificadas = proyecto.cotizacion.lineas.map((linea) => {
    let clasificacion: ClasifEquipo;
    let disponible = 0;
    let comprometido = 0;
    let conflictos: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }> = [];

    if (linea.tipo === "EQUIPO_PROPIO") {
      if (linea.equipoId && linea.equipo) {
        if (linea.equipo.tipo === "PROPIO") {
          // Propio con vínculo al inventario → verificar disponibilidad
          const info = comprometidoMap[linea.equipoId];
          comprometido = info?.cantidad ?? 0;
          disponible = linea.equipo.cantidadTotal - comprometido;
          conflictos = info?.refs ?? [];
          clasificacion = disponible >= linea.cantidad ? "PROPIO_INVENTARIO" : "PROPIO_INVENTARIO"; // conflicto se señala aparte
        } else {
          // Equipo en inventario pero de tipo EXTERNO → proveedor externo catalogado
          clasificacion = "EXTERNO_INVENTARIO";
        }
      } else {
        // Propio manual (sin vínculo al inventario)
        clasificacion = "PROPIO_MANUAL";
      }
    } else {
      // EQUIPO_EXTERNO
      const cxpVinculadaCheck = cxpsExistentes.find((c) => {
        try { return JSON.parse(c.notas ?? "{}").lineaId === linea.id; } catch { return false; }
      });
      const tieneProveedor = !!(linea.proveedorId || linea.proveedorRentaId);
      if (tieneProveedor && cxpVinculadaCheck) {
        clasificacion = "EXTERNO_CONFIRMADO";
      } else {
        clasificacion = "A_CONSEGUIR";
      }
    }

    // CxP vinculada (para externos)
    const cxpVinculada = cxpsExistentes.find((c) => {
      try { return JSON.parse(c.notas ?? "{}").lineaId === linea.id; } catch { return false; }
    }) ?? null;

    const yaConfirmado = clasificacion === "EXTERNO_CONFIRMADO";

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
      equipoInventarioTipo: linea.equipo?.tipo ?? null,
      cantidadTotal: linea.equipo?.cantidadTotal ?? null,
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

  // ── Proveedores activos ────────────────────────────────────────────────────
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
  });
}

// ── POST — Confirmar proveedor externo + generar CxP ─────────────────────────
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

  const cxpExistente = await prisma.cuentaPagar.findFirst({
    where: { proyectoId: id, notas: { contains: lineaId } },
  });

  if (cxpExistente && generarCxP) {
    await prisma.cuentaPagar.update({
      where: { id: cxpExistente.id },
      data: { monto, proveedorId, fechaCompromiso: fechaCompromiso ? new Date(fechaCompromiso) : undefined },
    });
  } else if (generarCxP) {
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

  await prisma.cotizacionLinea.update({
    where: { id: lineaId },
    data: {
      costoExterno: monto,
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

// ── PATCH — Reclasificar línea (cambiar tipo: EQUIPO_PROPIO ↔ EQUIPO_EXTERNO) ─
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { lineaId, nuevoTipo } = await req.json() as { lineaId: string; nuevoTipo: "EQUIPO_PROPIO" | "EQUIPO_EXTERNO" };

  if (!lineaId || !nuevoTipo) {
    return NextResponse.json({ error: "lineaId y nuevoTipo son requeridos" }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { cotizacion: { select: { id: true } } },
  });
  if (!proyecto?.cotizacion) return NextResponse.json({ error: "Proyecto sin cotización" }, { status: 404 });

  const linea = await prisma.cotizacionLinea.findFirst({
    where: { id: lineaId, cotizacionId: proyecto.cotizacion.id },
    select: { id: true, tipo: true },
  });
  if (!linea) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  await prisma.cotizacionLinea.update({
    where: { id: lineaId },
    data: {
      tipo: nuevoTipo,
      // Si se mueve a externo, limpiar vínculo al inventario propio
      ...(nuevoTipo === "EQUIPO_EXTERNO" ? { equipoId: null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
