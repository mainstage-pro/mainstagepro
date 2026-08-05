import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/operaciones/reporte-mensual?mes=2026-07
// Reporte mensual de tareas para PDF de rendimiento del equipo

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

  // ─── Tareas con vencimiento en el mes ────────────────────────────────────────
  // Incluimos tareas con fechaVencimiento en el mes (o completadas en el mes)
  const tareasDelMes = await prisma.tarea.findMany({
    where: {
      parentId: null, // solo tareas principales
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
      carpeta:      { select: { nombre: true } },
    },
    orderBy: [{ prioridad: "asc" }, { fechaVencimiento: "asc" }],
  });

  // ─── Tareas ATRASADAS (vencidas antes del mes y sin completar) ───────────────
  // Si la tarea se movió a un día futuro (cambia `fecha`), su compromiso real es
  // esa fecha nueva, así que ya no cuenta como atrasada aunque conserve un
  // `fechaVencimiento` viejo anterior al mes.
  const tareasAtrasadas = (await prisma.tarea.findMany({
    where: {
      parentId: null,
      estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
      fechaVencimiento: { lt: inicioMes },
    },
    include: {
      asignadoA:    { select: { id: true, name: true, area: true } },
      proyectoTarea:{ select: { nombre: true } },
    },
    orderBy: { fechaVencimiento: "asc" },
    take: 50,
  })).filter((t) => !t.fecha || t.fecha < inicioMes);

  // ─── Stats por usuario ────────────────────────────────────────────────────────
  const usuariosStats = users.map((u) => {
    const tareasAsignadas = tareasDelMes.filter((t) => t.asignadoAId === u.id);
    const completadas     = tareasAsignadas.filter((t) => t.estado === "COMPLETADA");
    const enProgreso      = tareasAsignadas.filter((t) => t.estado === "EN_PROGRESO");
    const pendientes      = tareasAsignadas.filter((t) => t.estado === "PENDIENTE");
    const urgentes        = tareasAsignadas.filter((t) => t.prioridad === "URGENTE");
    const atrasadas       = tareasAtrasadas.filter((t) => t.asignadoAId === u.id);
    const pct             = tareasAsignadas.length > 0
      ? Math.round((completadas.length / tareasAsignadas.length) * 100) : 0;

    return {
      id:          u.id,
      name:        u.name,
      area:        u.area,
      total:       tareasAsignadas.length,
      completadas: completadas.length,
      enProgreso:  enProgreso.length,
      pendientes:  pendientes.length,
      urgentes:    urgentes.length,
      atrasadas:   atrasadas.length,
      pct,
      tareasPendientesDetalle: pendientes.concat(enProgreso).slice(0, 8).map((t) => ({
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
    const items     = tareasDelMes.filter((t) => t.prioridad === p);
    const compCount = items.filter((t) => t.estado === "COMPLETADA").length;
    return { prioridad: p, total: items.length, completadas: compCount,
      pct: items.length > 0 ? Math.round((compCount / items.length) * 100) : 0 };
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

  // ─── Tendencia semanal (4 semanas del mes) ────────────────────────────────────
  const semanas: { label: string; total: number; completadas: number; pct: number }[] = [];
  for (let w = 0; w < 4; w++) {
    const inicioSem = new Date(year, month - 1, 1 + w * 7);
    const finSem    = new Date(year, month - 1, Math.min(7 + w * 7, new Date(year, month, 0).getDate()), 23, 59, 59);
    if (inicioSem > finMes) break;
    const tareasSem = tareasDelMes.filter((t) => {
      const ref = t.fechaCompletada ?? t.fechaVencimiento ?? t.createdAt;
      return ref >= inicioSem && ref <= finSem;
    });
    const compSem = tareasSem.filter((t) => t.estado === "COMPLETADA").length;
    semanas.push({
      label: `Sem ${w + 1} (${inicioSem.getDate()}–${Math.min(7 + w * 7, new Date(year, month, 0).getDate())})`,
      total: tareasSem.length,
      completadas: compSem,
      pct: tareasSem.length > 0 ? Math.round((compSem / tareasSem.length) * 100) : 0,
    });
  }

  // ─── Totales globales ─────────────────────────────────────────────────────────
  const totalMes           = tareasDelMes.length;
  const completadasMes     = tareasDelMes.filter((t) => t.estado === "COMPLETADA").length;
  const enProgresoMes      = tareasDelMes.filter((t) => t.estado === "EN_PROGRESO").length;
  const pendientesMes      = tareasDelMes.filter((t) => t.estado === "PENDIENTE").length;
  const pctGeneral         = totalMes > 0 ? Math.round((completadasMes / totalMes) * 100) : 0;
  const totalAtrasadas     = tareasAtrasadas.length;

  // ─── Tareas sin responsable ───────────────────────────────────────────────────
  const sinResponsable = tareasDelMes.filter((t) => !t.asignadoAId).length;

  // ─── Top tareas pendientes urgentes ──────────────────────────────────────────
  const urgentesIncompletas = tareasDelMes
    .filter((t) => t.prioridad === "URGENTE" && t.estado !== "COMPLETADA")
    .slice(0, 10)
    .map((t) => ({
      id:          t.id,
      titulo:      t.titulo,
      estado:      t.estado,
      asignadoA:   t.asignadoA?.name ?? "Sin asignar",
      vence:       t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      proyecto:    t.proyectoTarea?.nombre ?? null,
    }));

  return NextResponse.json({
    mes,
    totalMes, completadasMes, enProgresoMes, pendientesMes, pctGeneral,
    totalAtrasadas, sinResponsable,
    usuarios: usuariosStats,
    prioridades: statsPrioridad,
    areas: statsAreas,
    semanas,
    urgentesIncompletas,
    tareasAtrasadasDetalle: tareasAtrasadas.slice(0, 20).map((t) => ({
      id:        t.id,
      titulo:    t.titulo,
      prioridad: t.prioridad,
      estado:    t.estado,
      vence:     t.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
      asignadoA: t.asignadoA?.name ?? "Sin asignar",
      proyecto:  t.proyectoTarea?.nombre ?? null,
    })),
  });
}
