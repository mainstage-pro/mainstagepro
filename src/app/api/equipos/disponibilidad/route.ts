import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/equipos/disponibilidad?fecha=YYYY-MM-DD&excludeCotizacionId=X
 *
 * Devuelve disponibilidad de todos los equipos propios para una fecha específica.
 * excludeCotizacionId: cuando se edita una cotización existente, excluirla del cálculo
 * para no contarla a sí misma.
 *
 * Respuesta: { disponibilidad: Record<equipoId, { disponible, comprometido, total, eventos[] }> }
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const excludeCotizacionId = searchParams.get("excludeCotizacionId") ?? undefined;

  if (!fecha) return NextResponse.json({ error: "fecha requerida" }, { status: 400 });

  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  // 1. Todos los equipos propios activos
  const equipos = await prisma.equipo.findMany({
    where: { tipo: "PROPIO", activo: true },
    select: { id: true, cantidadTotal: true },
  });

  // 2. Cotizaciones en esa fecha que comprometen inventario
  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      OR: [
        { fechaEvento: { gte: inicio, lte: fin } },
        { fechaEvento: null, trato: { fechaEventoEstimada: { gte: inicio, lte: fin } } },
      ],
      estado: { notIn: ["RECHAZADA", "VENCIDA"] },
      proyecto: { is: null },
      ...(excludeCotizacionId ? { id: { not: excludeCotizacionId } } : {}),
    },
    select: {
      id: true,
      numeroCotizacion: true,
      estado: true,
      nombreEvento: true,
      cliente: { select: { nombre: true } },
      lineas: {
        where: { tipo: "EQUIPO_PROPIO", equipoId: { not: null } },
        select: { equipoId: true, cantidad: true },
      },
    },
  });

  // 3. Proyectos activos en esa fecha
  const proyectos = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: inicio, lte: fin },
      estado: { notIn: ["CANCELADO"] },
    },
    select: {
      id: true,
      numeroProyecto: true,
      nombre: true,
      estado: true,
      equipos: {
        where: { equipo: { tipo: "PROPIO" } },
        select: { equipoId: true, cantidad: true },
      },
    },
  });

  // 4. Acumular comprometido por equipoId
  const comprometido: Record<string, {
    cantidad: number;
    eventos: Array<{ ref: string; nombre: string; estado: string }>
  }> = {};

  for (const cot of cotizaciones) {
    for (const linea of cot.lineas) {
      if (!linea.equipoId) continue;
      if (!comprometido[linea.equipoId]) comprometido[linea.equipoId] = { cantidad: 0, eventos: [] };
      comprometido[linea.equipoId].cantidad += Math.round(linea.cantidad);
      comprometido[linea.equipoId].eventos.push({
        ref: cot.numeroCotizacion,
        nombre: cot.nombreEvento ?? cot.cliente.nombre,
        estado: cot.estado,
      });
    }
  }

  for (const proy of proyectos) {
    for (const pe of proy.equipos) {
      if (!pe.equipoId) continue;
      if (!comprometido[pe.equipoId]) comprometido[pe.equipoId] = { cantidad: 0, eventos: [] };
      comprometido[pe.equipoId].cantidad += pe.cantidad;
      comprometido[pe.equipoId].eventos.push({
        ref: proy.numeroProyecto,
        nombre: proy.nombre,
        estado: proy.estado,
      });
    }
  }

  // 5. Resultado
  const disponibilidad: Record<string, {
    disponible: number; comprometido: number; total: number;
    eventos: Array<{ ref: string; nombre: string; estado: string }>
  }> = {};

  for (const eq of equipos) {
    const comp = comprometido[eq.id] ?? { cantidad: 0, eventos: [] };
    disponibilidad[eq.id] = {
      total: eq.cantidadTotal,
      comprometido: comp.cantidad,
      disponible: Math.max(0, eq.cantidadTotal - comp.cantidad),
      eventos: comp.eventos,
    };
  }

  return NextResponse.json({ disponibilidad });
}
