import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { TareasReportePDF, type TareasReporteData } from "@/components/TareasReportePDF";
import React from "react";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const getMesLabel = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const [year, month] = mes.split("-").map(Number);
  const inicioMes = new Date(year, month - 1, 1);
  const finMes    = new Date(year, month, 0, 23, 59, 59);

  // ─── Usuarios activos ────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, area: true },
    orderBy: { name: "asc" },
  });

  // ─── Tareas del mes ──────────────────────────────────────────────────────────
  const tareasDelMes = await prisma.tarea.findMany({
    where: {
      parentId: null,
      estado: { not: "CANCELADA" },
      OR: [
        { fechaVencimiento: { gte: inicioMes, lte: finMes } },
        { fechaCompletada:  { gte: inicioMes, lte: finMes } },
        { createdAt:        { gte: inicioMes, lte: finMes } },
      ],
    },
    include: {
      asignadoA:    { select: { id: true, name: true, area: true } },
      proyectoTarea:{ select: { nombre: true } },
    },
    orderBy: [{ prioridad: "asc" }, { fechaVencimiento: "asc" }],
  });

  // ─── Tareas atrasadas ────────────────────────────────────────────────────────
  const tareasAtrasadas = await prisma.tarea.findMany({
    where: {
      parentId: null,
      estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
      fechaVencimiento: { lt: inicioMes },
    },
    include: {
      asignadoA:    { select: { id: true, name: true } },
      proyectoTarea:{ select: { nombre: true } },
    },
    orderBy: { fechaVencimiento: "asc" },
    take: 50,
  });

  // ─── Stats por usuario ────────────────────────────────────────────────────────
  const usuariosStats = users.map((u) => {
    const tareasAsignadas = tareasDelMes.filter((t) => t.asignadoAId === u.id);
    const completadas     = tareasAsignadas.filter((t) => t.estado === "COMPLETADA");
    const enProgreso      = tareasAsignadas.filter((t) => t.estado === "EN_PROGRESO");
    const pendientes      = tareasAsignadas.filter((t) => t.estado === "PENDIENTE");
    const atrasadas       = tareasAtrasadas.filter((t) => t.asignadoAId === u.id);
    const pct = tareasAsignadas.length > 0 ? Math.round((completadas.length / tareasAsignadas.length) * 100) : 0;

    return {
      id: u.id, name: u.name, area: u.area,
      total: tareasAsignadas.length,
      completadas: completadas.length,
      enProgreso:  enProgreso.length,
      pendientes:  pendientes.length,
      urgentes:    tareasAsignadas.filter((t) => t.prioridad === "URGENTE").length,
      atrasadas:   atrasadas.length,
      pct,
      tareasPendientesDetalle: [...pendientes, ...enProgreso].slice(0, 8).map((t) => ({
        id:        t.id,
        titulo:    t.titulo,
        prioridad: t.prioridad,
        estado:    t.estado,
        vence:     t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
        proyecto:  t.proyectoTarea?.nombre ?? null,
      })),
    };
  }).filter((u) => u.total > 0 || u.atrasadas > 0).sort((a, b) => b.pct - a.pct);

  // ─── Stats por prioridad ─────────────────────────────────────────────────────
  const PRIORIDADES = ["URGENTE", "ALTA", "MEDIA", "BAJA"] as const;
  const statsPrioridad = PRIORIDADES.map((p) => {
    const items  = tareasDelMes.filter((t) => t.prioridad === p);
    const comp   = items.filter((t) => t.estado === "COMPLETADA").length;
    return { prioridad: p, total: items.length, completadas: comp,
      pct: items.length > 0 ? Math.round((comp / items.length) * 100) : 0 };
  }).filter((s) => s.total > 0);

  // ─── Stats por área ──────────────────────────────────────────────────────────
  const areasMap: Record<string, { total: number; completadas: number }> = {};
  for (const t of tareasDelMes) {
    const area = t.asignadoA?.area ?? "Sin asignar";
    if (!areasMap[area]) areasMap[area] = { total: 0, completadas: 0 };
    areasMap[area].total++;
    if (t.estado === "COMPLETADA") areasMap[area].completadas++;
  }
  const statsAreas = Object.entries(areasMap).map(([area, s]) => ({
    area, ...s, pct: s.total > 0 ? Math.round((s.completadas / s.total) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);

  // ─── Semanas ─────────────────────────────────────────────────────────────────
  const ultimoDia = new Date(year, month, 0).getDate();
  const semanas: { label: string; total: number; completadas: number; pct: number }[] = [];
  for (let w = 0; w < 4; w++) {
    const ini = new Date(year, month - 1, 1 + w * 7);
    const fin = new Date(year, month - 1, Math.min(7 + w * 7, ultimoDia), 23, 59, 59);
    if (ini > finMes) break;
    const sem  = tareasDelMes.filter((t) => {
      const ref = t.fechaCompletada ?? t.fechaVencimiento ?? t.createdAt;
      return ref >= ini && ref <= fin;
    });
    const comp = sem.filter((t) => t.estado === "COMPLETADA").length;
    semanas.push({
      label: `Sem ${w + 1} (${ini.getDate()}–${Math.min(7 + w * 7, ultimoDia)})`,
      total: sem.length, completadas: comp,
      pct: sem.length > 0 ? Math.round((comp / sem.length) * 100) : 0,
    });
  }

  // ─── Totales ─────────────────────────────────────────────────────────────────
  const totalMes       = tareasDelMes.length;
  const completadasMes = tareasDelMes.filter((t) => t.estado === "COMPLETADA").length;
  const enProgresoMes  = tareasDelMes.filter((t) => t.estado === "EN_PROGRESO").length;
  const pendientesMes  = tareasDelMes.filter((t) => t.estado === "PENDIENTE").length;
  const pctGeneral     = totalMes > 0 ? Math.round((completadasMes / totalMes) * 100) : 0;
  const sinResponsable = tareasDelMes.filter((t) => !t.asignadoAId).length;

  // ─── Urgentes incompletas ─────────────────────────────────────────────────────
  const urgentesIncompletas = tareasDelMes
    .filter((t) => t.prioridad === "URGENTE" && t.estado !== "COMPLETADA")
    .slice(0, 10)
    .map((t) => ({
      id: t.id, titulo: t.titulo, estado: t.estado,
      asignadoA: t.asignadoA?.name ?? "Sin asignar",
      vence: t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      proyecto: t.proyectoTarea?.nombre ?? null,
    }));

  const data: TareasReporteData = {
    mes,
    mesLabel: getMesLabel(mes),
    totalMes, completadasMes, enProgresoMes, pendientesMes,
    pctGeneral, totalAtrasadas: tareasAtrasadas.length, sinResponsable,
    usuarios: usuariosStats,
    prioridades: statsPrioridad,
    areas: statsAreas,
    semanas,
    urgentesIncompletas,
    tareasAtrasadasDetalle: tareasAtrasadas.slice(0, 20).map((t) => ({
      id: t.id, titulo: t.titulo, prioridad: t.prioridad, estado: t.estado,
      vence: t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      asignadoA: t.asignadoA?.name ?? "Sin asignar",
      proyecto: t.proyectoTarea?.nombre ?? null,
    })),
  };

  // ─── Render PDF ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfStream = await ReactPDF.renderToStream(React.createElement(TareasReportePDF, { data }) as any);
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="Reporte-Tareas-${mes}.pdf"`,
      "Content-Length":      String(pdfBuffer.length),
    },
  });
}
