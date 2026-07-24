import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/tareas/opciones
// Alimenta el selector de "Nueva tarea" con las fuentes seleccionables:
//   - eventos:   proyectos de evento vigentes, agrupados por mes (YYYY-MM)
//   - proyectosInternos: proyectos de empresa activos, con sus fases
//   - tratos:    tratos de venta del pipeline activo
// Se usa para los tipos de tarea EVENTO, PROYECTO y TRATO.
// Por defecto la lista viene recortada a lo vigente; con ?todos=1 se abre el histórico completo.
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const todos = new URL(req.url).searchParams.get("todos") === "1";

  // Ventana activa por defecto: últimos 7 días y próximos 90 (espejo de /api/tareas/por-proyecto).
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const desde = new Date(hoy);
  desde.setUTCDate(hoy.getUTCDate() - 7);
  const hasta = new Date(hoy);
  hasta.setUTCDate(hoy.getUTCDate() + 90);

  // ── Proyectos de evento (sin cancelados; ventana activa salvo ?todos=1) ──────
  const proyectos = await prisma.proyecto.findMany({
    where: {
      estado: { not: "CANCELADO" },
      ...(todos ? {} : { fechaEvento: { gte: desde, lte: hasta } }),
    },
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

  // ── Tratos de venta (pipeline activo por defecto; cerrados solo con ?todos=1) ─
  const tratos = await prisma.trato.findMany({
    where: {
      etapa: { notIn: todos ? ["VENTA_PERDIDA"] : ["VENTA_PERDIDA", "VENTA_CERRADA"] },
    },
    orderBy: { updatedAt: "desc" },
    take: todos ? 500 : 200,
    select: {
      id: true,
      nombreEvento: true,
      etapa: true,
      cliente: { select: { nombre: true } },
    },
  });
  const tratosOpts = tratos.map(t => ({
    id: t.id,
    nombre: t.nombreEvento || t.cliente?.nombre || "Trato sin nombre",
    cliente: t.cliente?.nombre ?? null,
    etapa: t.etapa,
  }));

  return NextResponse.json({ eventosPorMes, proyectosInternos: internos, tratos: tratosOpts });
}
