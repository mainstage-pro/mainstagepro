import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, puedeVerificar } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import type { Prisma } from "@prisma/client";

// GET /api/verificacion — lista de tareas PENDIENTE_VERIFICACION con filtros.
// Query: area, responsableId, desde (YYYY-MM-DD), hasta (YYYY-MM-DD), semana=1
// Devuelve también `atrasadas`: tareas pendientes con fechaVencimiento vencida.
// Sólo Administración / Dirección / ADMIN.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeVerificar(session)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  await ensureTareaColumns();

  const sp = req.nextUrl.searchParams;
  const area = sp.get("area");
  const responsableId = sp.get("responsableId");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const semana = sp.get("semana") === "1";

  const where: Prisma.TareaWhereInput = { estadoVerificacion: "PENDIENTE_VERIFICACION" };
  if (area) where.area = area;
  if (responsableId) where.asignadoAId = responsableId;

  // Rango de fechaCompletada
  const fechaFilter: Prisma.DateTimeFilter = {};
  if (semana) {
    // Lunes 00:00 → domingo 23:59 (semana actual, hora local del servidor)
    const now = new Date();
    const day = now.getDay(); // 0=dom
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const lunes = new Date(now); lunes.setDate(now.getDate() + diffToMon); lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23, 59, 59, 999);
    fechaFilter.gte = lunes;
    fechaFilter.lte = domingo;
  } else {
    if (desde) fechaFilter.gte = new Date(desde + "T00:00:00");
    if (hasta) fechaFilter.lte = new Date(hasta + "T23:59:59");
  }
  if (fechaFilter.gte || fechaFilter.lte) where.fechaCompletada = fechaFilter;

  const selectVerif = {
    id: true,
    titulo: true,
    tipoOrigen: true,
    area: true,
    prioridad: true,
    fecha: true,
    fechaVencimiento: true,
    fechaCompletada: true,
    estado: true,
    requiereEvidencia: true,
    tipoEvidencia: true,
    evidenciaNota: true,
    evidenciaEnviadaAt: true,
    estandarMinimo: true,
    porqueSeHace: true,
    moduloDestino: true,
    moduloTexto: true,
    moduloDisponible: true,
    asignadoA: { select: { id: true, name: true } },
    archivos: {
      select: { id: true, nombre: true, url: true, tipo: true, tamano: true },
      orderBy: { createdAt: "desc" as const },
    },
  } satisfies Prisma.TareaSelect;

  const tareas = await prisma.tarea.findMany({
    where,
    orderBy: { fechaCompletada: "asc" },
    select: selectVerif,
  });

  // ── Atrasadas: pendientes/en progreso con fechaVencimiento vencida ──────────
  // Se muestran en el mismo módulo para que quien verifica vea también lo que
  // está retrasado (aún sin completar), respetando los filtros de área/responsable.
  const atrasadasWhere: Prisma.TareaWhereInput = {
    estado: { in: ["PENDIENTE", "EN_PROGRESO"] },
    fechaVencimiento: { lt: new Date() },
  };
  if (area) atrasadasWhere.area = area;
  if (responsableId) atrasadasWhere.asignadoAId = responsableId;

  const atrasadas = await prisma.tarea.findMany({
    where: atrasadasWhere,
    orderBy: { fechaVencimiento: "asc" },
    take: 200,
    select: selectVerif,
  });

  // Opciones de filtro (áreas y responsables presentes entre pendientes + atrasadas)
  const todas = [...tareas, ...atrasadas];
  const areas = Array.from(new Set(todas.map(t => t.area).filter(Boolean))) as string[];
  const responsablesMap = new Map<string, string>();
  todas.forEach(t => { if (t.asignadoA) responsablesMap.set(t.asignadoA.id, t.asignadoA.name); });
  const responsables = Array.from(responsablesMap, ([id, name]) => ({ id, name }));

  return NextResponse.json({ tareas, atrasadas, areas, responsables });
}
