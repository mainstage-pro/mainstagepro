import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/tareas/opciones
// Alimenta el selector de "Nueva tarea" con las fuentes seleccionables:
//   - eventos:   proyectos de evento (todos, sin cancelados), agrupados por mes; cada uno con flag `vigente`
//   - proyectosInternos: proyectos de empresa activos, con sus fases
//   - tratos:    tratos de venta (todos, sin perdidos), cada uno con flag `vigente`
// La lista completa se envía para poder buscar en todo el histórico; el flag `vigente`
// permite al cliente mostrar en reposo solo lo relevante (ventana activa / pipeline abierto).
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Ventana "vigente" para eventos: últimos 7 días y próximos 90 (espejo de /api/tareas/por-proyecto).
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const desde = new Date(hoy);
  desde.setUTCDate(hoy.getUTCDate() - 7);
  const hasta = new Date(hoy);
  hasta.setUTCDate(hoy.getUTCDate() + 90);

  // ── Proyectos de evento (todos, sin cancelados) ─────────────────────────────
  const proyectos = await prisma.proyecto.findMany({
    where: { estado: { not: "CANCELADO" } },
    orderBy: { fechaEvento: "asc" },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      estado: true,
      fechaEvento: true,
      cliente: { select: { nombre: true } },
    },
  });

  // Agrupar por mes (YYYY-MM) preservando el orden cronológico ascendente
  const gruposMap = new Map<string, {
    clave: string;
    etiqueta: string;
    eventos: { id: string; nombre: string; numeroProyecto: string; estado: string; fechaEvento: string; cliente: string | null; vigente: boolean }[];
  }>();
  for (const p of proyectos) {
    const f = p.fechaEvento;
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
    const etiqueta = `${MESES[f.getMonth()]} ${f.getFullYear()}`;
    if (!gruposMap.has(clave)) gruposMap.set(clave, { clave, etiqueta, eventos: [] });
    gruposMap.get(clave)!.eventos.push({
      id: p.id,
      nombre: p.nombre,
      numeroProyecto: p.numeroProyecto,
      estado: p.estado,
      fechaEvento: f.toISOString(),
      cliente: p.cliente?.nombre ?? null,
      vigente: f >= desde && f <= hasta,
    });
  }
  const eventosPorMes = Array.from(gruposMap.values());

  // ── Proyectos de empresa (internos activos) con sus fases ──────────────────
  const internos = await prisma.proyectoInterno.findMany({
    where: { estado: { notIn: ["CANCELADO", "COMPLETADO"] } },
    orderBy: [{ area: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      area: true,
      estado: true,
      lider: { select: { id: true, name: true } },
      fases: {
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true, completada: true },
      },
    },
  });

  // ── Tratos de venta (todos, sin perdidos) ──────────────────────────────────
  const tratos = await prisma.trato.findMany({
    where: { etapa: { not: "VENTA_PERDIDA" } },
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      nombreEvento: true,
      etapa: true,
      fechaEventoEstimada: true,
      cliente: { select: { nombre: true } },
    },
  });
  const tratosOpts = tratos.map(t => ({
    id: t.id,
    nombre: t.nombreEvento || t.cliente?.nombre || "Trato sin nombre",
    cliente: t.cliente?.nombre ?? null,
    etapa: t.etapa,
    fechaEvento: t.fechaEventoEstimada ? t.fechaEventoEstimada.toISOString() : null,
    // Pipeline abierto = sigue vigente; los cerrados quedan disponibles solo vía búsqueda.
    vigente: t.etapa !== "VENTA_CERRADA",
  }));

  return NextResponse.json({ eventosPorMes, proyectosInternos: internos, tratos: tratosOpts });
}
