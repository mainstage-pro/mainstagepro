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

  const [proyectos, montajes, cxc, seguimientos, publicaciones] = await Promise.all([
    // Eventos (fechaEvento)
    prisma.proyecto.findMany({
      where: { fechaEvento: { gte: inicio, lte: fin }, estado: { not: "CANCELADO" } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "asc" },
    }),
    // Montajes
    prisma.proyecto.findMany({
      where: { fechaMontaje: { gte: inicio, lte: fin }, estado: { not: "CANCELADO" }, NOT: { fechaMontaje: null } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaMontaje: "asc" },
    }),
    // CxC pendientes con vencimiento en el mes
    prisma.cuentaCobrar.findMany({
      where: {
        fechaCompromiso: { gte: inicio, lte: fin },
        estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
      },
      include: { cliente: { select: { nombre: true } }, empresa: { select: { nombre: true } }, proyecto: { select: { nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
    }),
    // Seguimientos de ventas
    prisma.trato.findMany({
      where: {
        fechaProximaAccion: { gte: inicio, lte: fin },
        etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
      },
      include: { cliente: { select: { nombre: true } }, responsable: { select: { name: true } } },
      orderBy: { fechaProximaAccion: "asc" },
    }),
    // Publicaciones de marketing
    prisma.publicacion.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { tipo: { select: { nombre: true } } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  // Normalizar todo a eventos de calendario
  const eventos: {
    id: string; dia: number; tipo: string; titulo: string; subtitulo: string;
    estado: string; url: string; hora?: string;
  }[] = [];

  for (const p of proyectos) {
    eventos.push({
      id: `evt-${p.id}`,
      dia: new Date(p.fechaEvento.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
      tipo: "EVENTO",
      titulo: p.nombre,
      subtitulo: p.cliente.nombre,
      estado: p.estado,
      url: `/proyectos/${p.id}`,
    });
  }
  for (const p of montajes) {
    if (!p.fechaMontaje) continue;
    const alreadyAsEvento = proyectos.some(x => x.id === p.id && new Date(x.fechaEvento.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate() === new Date(p.fechaMontaje!.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate());
    if (alreadyAsEvento) continue;
    eventos.push({
      id: `mnt-${p.id}`,
      dia: new Date(p.fechaMontaje.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
      tipo: "MONTAJE",
      titulo: p.nombre,
      subtitulo: `Montaje · ${p.cliente.nombre}`,
      estado: p.estado,
      url: `/proyectos/${p.id}`,
    });
  }
  for (const c of cxc) {
    const monto = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(c.monto);
    eventos.push({
      id: `cxc-${c.id}`,
      dia: new Date(c.fechaCompromiso.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
      tipo: "CXC",
      titulo: c.proyecto?.nombre ? `Cobro: ${c.proyecto.nombre}` : c.concepto,
      subtitulo: `${c.empresa?.nombre ?? c.cliente?.nombre ?? "—"} · ${monto}`,
      estado: c.estado,
      url: `/finanzas/cxc`,
    });
  }
  for (const t of seguimientos) {
    if (!t.fechaProximaAccion) continue;
    eventos.push({
      id: `seg-${t.id}`,
      dia: new Date(t.fechaProximaAccion.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
      tipo: "SEGUIMIENTO",
      titulo: t.nombreEvento || "Seguimiento",
      subtitulo: `${t.cliente.nombre}${t.responsable?.name ? ` · ${t.responsable.name}` : ""}`,
      estado: new Date(t.fechaProximaAccion) < new Date() ? "VENCIDO" : "PENDIENTE",
      url: `/crm/tratos/${t.id}`,
    });
  }
  for (const pub of publicaciones) {
    eventos.push({
      id: `pub-${pub.id}`,
      dia: new Date(pub.fecha.toISOString().substring(0, 10) + "T12:00:00Z").getUTCDate(),
      tipo: "MARKETING",
      titulo: pub.tipo?.nombre ?? "Publicación",
      subtitulo: pub.descripcion?.slice(0, 50) ?? pub.estado,
      estado: pub.estado,
      url: `/marketing/calendario`,
    });
  }

  return NextResponse.json({ eventos });
}
