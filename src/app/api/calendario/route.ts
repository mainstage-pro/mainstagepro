import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const mes = sp.get("mes"); // "2026-04"

  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
  }

  const inicio = new Date(year, month, 1);
  const fin    = new Date(year, month + 1, 0, 23, 59, 59);

  // ── 1. Proyectos existentes (igual que antes) ─────────────────────────────
  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: inicio, lte: fin }, estado: { not: "CANCELADO" } },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaEvento: "asc" },
  });

  const eventosProyecto = proyectos.map(p => ({
    id: p.id,
    dia: new Date(p.fechaEvento.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
    titulo: p.nombre,
    subtitulo: p.cliente.nombre,
    estado: p.estado,
    url: `/proyectos/${p.id}`,
    tipoEvento: p.tipoEvento,
    tipoServicio: p.tipoServicio,
    lugarEvento: p.lugarEvento,
    horaInicioEvento: p.horaInicioEvento,
  }));

  // ── 2. Tratos con cotización APROBADA sin proyecto creado aún ──────────────
  // Cualquier trato sin proyecto vinculado que tenga al menos
  // una cotización APROBADA con fechaEvento en el mes solicitado
  const tratos = await prisma.trato.findMany({
    where: {
      proyecto: null,
      cotizaciones: {
        some: {
          estado: "APROBADA",
          fechaEvento: { gte: inicio, lte: fin, not: null },
        },
      },
    },
    include: {
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: {
          estado: "APROBADA",
          fechaEvento: { gte: inicio, lte: fin, not: null },
        },
        orderBy: { fechaEvento: "asc" },
        take: 1,
      },
    },
  });

  const eventosTrato = tratos.flatMap(t => {
    return t.cotizaciones
      .filter(c => c.fechaEvento)
      .map(c => ({
        id: t.id,
        dia: new Date(c.fechaEvento!.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
        titulo: t.nombreEvento || (c as unknown as Record<string, unknown>).nombreEvento as string || "Evento",
        subtitulo: t.cliente?.nombre || "",
        estado: "VENTA_CERRADA" as const,
        url: `/crm/tratos/${t.id}`,
        tipoEvento: t.tipoEvento,
        tipoServicio: null,
        lugarEvento: t.lugarEstimado,
        horaInicioEvento: null,
      }));
  });

  // ── Merge y ordenar por día ───────────────────────────────────────────────
  const eventos = [...eventosProyecto, ...eventosTrato].sort((a, b) => a.dia - b.dia);

  return NextResponse.json({ eventos });
}
