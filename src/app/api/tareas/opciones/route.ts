import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/tareas/opciones
// Alimenta el selector de "Nueva tarea" con las fuentes seleccionables:
//   - eventos:   proyectos de evento activos, agrupados por mes (YYYY-MM)
//   - proyectosInternos: proyectos de empresa activos, con sus fases
// Se usa para los tipos de tarea 3 (proyecto de evento) y 4 (proyecto de empresa).
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // ── Proyectos de evento (planeación, en curso y completados; sin cancelados) ──
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
    eventos: { id: string; nombre: string; numeroProyecto: string; estado: string; fechaEvento: string; cliente: string | null }[];
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

  return NextResponse.json({ eventosPorMes, proyectosInternos: internos });
}
