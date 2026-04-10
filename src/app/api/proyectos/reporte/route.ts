import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const mesDesde = searchParams.get("mesDesde"); // "YYYY-MM"
  const mesHasta = searchParams.get("mesHasta"); // "YYYY-MM"

  let desde: Date;
  let hasta: Date;

  if (mesDesde && mesHasta) {
    const [dy, dm] = mesDesde.split("-").map(Number);
    const [hy, hm] = mesHasta.split("-").map(Number);
    desde = new Date(dy, dm - 1, 1);
    hasta = new Date(hy, hm, 0, 23, 59, 59);
  } else {
    desde = new Date(year, 0, 1);
    hasta = new Date(year, 11, 31, 23, 59, 59);
  }

  const proyectos = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: desde, lte: hasta },
      estado: { not: "CANCELADO" },
    },
    select: {
      tipoEvento: true,
      tipoServicio: true,
      estado: true,
      clienteId: true,
      fechaEvento: true,
      cliente: { select: { nombre: true } },
    },
  });

  const total = proyectos.length;
  const completados = proyectos.filter(p => p.estado === "COMPLETADO").length;
  const confirmados = proyectos.filter(p => p.estado === "CONFIRMADO").length;
  const enCurso = proyectos.filter(p => p.estado === "EN_CURSO").length;
  const planeacion = proyectos.filter(p => p.estado === "PLANEACION").length;

  // Por tipo de evento
  const porTipoEvento: Record<string, number> = {};
  for (const p of proyectos) {
    const k = p.tipoEvento || "SIN_DEFINIR";
    porTipoEvento[k] = (porTipoEvento[k] ?? 0) + 1;
  }

  // Por tipo de servicio
  const porTipoServicio: Record<string, number> = {};
  for (const p of proyectos) {
    const k = p.tipoServicio || "SIN_DEFINIR";
    porTipoServicio[k] = (porTipoServicio[k] ?? 0) + 1;
  }

  // Top clientes
  const clienteCount: Record<string, { nombre: string; count: number }> = {};
  for (const p of proyectos) {
    if (!clienteCount[p.clienteId]) {
      clienteCount[p.clienteId] = { nombre: p.cliente.nombre, count: 0 };
    }
    clienteCount[p.clienteId].count++;
  }
  const topClientes = Object.entries(clienteCount)
    .map(([id, v]) => ({ id, nombre: v.nombre, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Por mes
  const porMes: Record<string, number> = {};
  for (const p of proyectos) {
    const key = p.fechaEvento.toISOString().slice(0, 7); // "YYYY-MM"
    porMes[key] = (porMes[key] ?? 0) + 1;
  }
  const porMesArr = Object.entries(porMes)
    .map(([mes, count]) => ({ mes, count }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  return NextResponse.json({
    total,
    completados,
    confirmados,
    enCurso,
    planeacion,
    porTipoEvento: Object.entries(porTipoEvento)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count),
    porTipoServicio: Object.entries(porTipoServicio)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count),
    topClientes,
    porMes: porMesArr,
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
  });
}
