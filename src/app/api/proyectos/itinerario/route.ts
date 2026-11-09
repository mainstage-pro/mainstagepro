import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  ventanaProyecto,
  checkpointsDeProyecto,
  responsableDeProyecto,
  type ItinerarioEvento,
} from "@/lib/itinerario-operaciones";

function parseFecha(v: string | null, fallbackDaysFromNow: number): string {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date();
  d.setDate(d.getDate() + fallbackDaysFromNow);
  return d.toISOString().slice(0, 10);
}

/** Selección de campos que alimenta el itinerario; la comparte GET y el PDF. */
export const SELECT_ITINERARIO = {
  id: true,
  numeroProyecto: true,
  nombre: true,
  estado: true,
  lugarEvento: true,
  notasOperativas: true,
  responsables: true,
  fechaEvento: true,
  fechasEvento: true,
  horariosEvento: true,
  horaInicioEvento: true,
  horaFinEvento: true,
  fechaMontaje: true,
  horaInicioMontaje: true,
  duracionMontajeHrs: true,
  montajeDiaAparte: true,
  horaSalidaBodega: true,
  horaMontaje: true,
  horaDesmontaje: true,
  duracionDesmontajeHrs: true,
  desmontajeDiaAparte: true,
  fechaDesmontaje: true,
  llamadoBodega: true,
  lugarLlamado: true,
  puntoSalidaBodega: true,
  cliente: { select: { nombre: true } },
  encargado: { select: { name: true } },
  personal: {
    where: { coordinaEnSitio: true },
    select: { coordinaEnSitio: true, tecnico: { select: { nombre: true } } },
  },
  bloquesTiempo: {
    where: { tipo: { in: ["SOUNDCHECK", "PROGRAMA"] as string[] } },
    select: {
      id: true,
      tipo: true,
      fase: true,
      proveedorEventoId: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      titulo: true,
      detalle: true,
      responsable: true,
      involucrados: true,
      orden: true,
    },
    orderBy: { orden: "asc" },
  },
} as const;

export async function proyectosEnRango(inicio: string, fin: string) {
  // Buffer de 5 días: un montaje o desmontaje "día aparte" puede caer justo antes/después
  // del rango pedido; el recorte exacto lo hace ventanaProyecto() más abajo.
  const bufferDesde = new Date(`${inicio}T00:00:00.000Z`);
  bufferDesde.setDate(bufferDesde.getDate() - 5);
  const bufferHasta = new Date(`${fin}T00:00:00.000Z`);
  bufferHasta.setDate(bufferHasta.getDate() + 5);

  const proyectos = await prisma.proyecto.findMany({
    where: { estado: { not: "CANCELADO" }, fechaEvento: { gte: bufferDesde, lte: bufferHasta } },
    select: SELECT_ITINERARIO,
    orderBy: { fechaEvento: "asc" },
  });

  const eventos: ItinerarioEvento[] = [];
  for (const p of proyectos) {
    const ventana = ventanaProyecto(p);
    if (!ventana || ventana.fin < inicio || ventana.inicio > fin) continue;
    eventos.push({
      proyectoId: p.id,
      numeroProyecto: p.numeroProyecto,
      nombre: p.nombre,
      estado: p.estado,
      clienteNombre: p.cliente.nombre,
      lugarEvento: p.lugarEvento,
      responsable: responsableDeProyecto(p),
      notasOperativas: p.notasOperativas,
      checkpoints: checkpointsDeProyecto(p, p.bloquesTiempo),
    });
  }
  return eventos;
}

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inicio = parseFecha(searchParams.get("inicio"), 0);
  const fin = parseFecha(searchParams.get("fin"), 30);

  const eventos = await proyectosEnRango(inicio, fin);
  return NextResponse.json({ inicio, fin, eventos });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { proyectoId, notasOperativas } = body as { proyectoId?: string; notasOperativas?: string };
  if (!proyectoId) return NextResponse.json({ error: "Falta proyectoId" }, { status: 400 });

  await prisma.proyecto.update({
    where: { id: proyectoId },
    data: { notasOperativas: notasOperativas?.trim() || null },
  });
  return NextResponse.json({ ok: true });
}
