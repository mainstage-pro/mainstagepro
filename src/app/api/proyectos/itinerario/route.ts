import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  ventanaProyecto,
  checkpointsDeProyecto,
  responsableDeProyecto,
  type ItinerarioEvento,
  type CampoEditableItinerario,
} from "@/lib/itinerario-operaciones";
import { diasEvento, parseHorariosEvento } from "@/lib/fechas-evento";

function parseFecha(v: string | null, fallbackDaysFromNow: number): string {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date();
  d.setDate(d.getDate() + fallbackDaysFromNow);
  return d.toISOString().slice(0, 10);
}

const CAMPOS_EDITABLES: CampoEditableItinerario[] = [
  "llamado",
  "salidaBodega",
  "llegadaVenue",
  "inicioMontaje",
  "finMontaje",
  "inicioEvento",
  "finEvento",
  "inicioDesmontaje",
  "finDesmontaje",
];

function minutosDe(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Misma fórmula que usa la página del proyecto (horasEntre) para que el dato cuadre igual sin importar desde dónde se capture. */
function horasEntre(inicio: string | null | undefined, fin: string | null | undefined): number | null {
  const a = minutosDe(inicio);
  const b = minutosDe(fin);
  if (a == null || b == null) return null;
  return Math.round((((b - a) % 1440 + 1440) % 1440) / 60 * 100) / 100;
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
  notasItinerario: true,
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
  const { proyectoId } = body as { proyectoId?: string };
  if (!proyectoId) return NextResponse.json({ error: "Falta proyectoId" }, { status: 400 });

  // Edición en línea de un checkpoint (llamado, montaje, horarios del evento, desmontaje):
  // escribe exactamente el mismo campo del proyecto que la página de detalle, para que
  // itinerario y proyecto queden sincronizados en ambos sentidos.
  if ("campo" in body) {
    const { campo, fecha, valor } = body as { campo?: string; fecha?: string; valor?: string | null };
    if (!campo || !CAMPOS_EDITABLES.includes(campo as CampoEditableItinerario)) {
      return NextResponse.json({ error: "Campo no editable" }, { status: 400 });
    }
    const v = (valor ?? "").trim();
    const data: Record<string, unknown> = {};

    if (campo === "llamado") {
      const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { llamadoBodega: true } });
      const fechaBase = p?.llamadoBodega ? p.llamadoBodega.toISOString().slice(0, 10) : fecha;
      if (v && !fechaBase) return NextResponse.json({ error: "Falta fecha" }, { status: 400 });
      data.llamadoBodega = v ? new Date(`${fechaBase}T${v}:00.000Z`) : null;
    } else if (campo === "salidaBodega") {
      data.horaSalidaBodega = v || null;
    } else if (campo === "llegadaVenue") {
      data.horaMontaje = v || null;
    } else if (campo === "inicioMontaje") {
      data.horaInicioMontaje = v || null;
    } else if (campo === "finMontaje") {
      const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { horaInicioMontaje: true } });
      data.duracionMontajeHrs = v ? horasEntre(p?.horaInicioMontaje, v) : null;
    } else if (campo === "inicioDesmontaje") {
      data.horaDesmontaje = v || null;
    } else if (campo === "finDesmontaje") {
      const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { horaDesmontaje: true } });
      data.duracionDesmontajeHrs = v ? horasEntre(p?.horaDesmontaje, v) : null;
    } else if (campo === "inicioEvento" || campo === "finEvento") {
      if (!fecha) return NextResponse.json({ error: "Falta fecha" }, { status: 400 });
      const p = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: { fechaEvento: true, fechasEvento: true, horariosEvento: true },
      });
      if (!p) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      const dias = diasEvento(p.fechaEvento, p.fechasEvento);
      const indice = dias.indexOf(fecha);
      if (indice === -1) return NextResponse.json({ error: "Fecha fuera del evento" }, { status: 400 });
      if (indice === 0) {
        data[campo === "inicioEvento" ? "horaInicioEvento" : "horaFinEvento"] = v || null;
      } else {
        const mapa = parseHorariosEvento(p.horariosEvento);
        const prev = mapa[fecha] ?? { inicio: null, fin: null, llamado: null, montaje: null, aplicaMontaje: false };
        mapa[fecha] = { ...prev, [campo === "inicioEvento" ? "inicio" : "fin"]: v || null };
        data.horariosEvento = JSON.stringify(mapa);
      }
    }

    await prisma.proyecto.update({ where: { id: proyectoId }, data });
    return NextResponse.json({ ok: true });
  }

  // Nota libre por checkpoint (distinta de `notasOperativas`, que es una sola por evento).
  if ("notaCampo" in body) {
    const { notaCampo, valor } = body as { notaCampo?: string; valor?: string | null };
    if (!notaCampo || !CAMPOS_EDITABLES.includes(notaCampo as CampoEditableItinerario)) {
      return NextResponse.json({ error: "Campo no editable" }, { status: 400 });
    }
    const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { notasItinerario: true } });
    if (!p) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    let notas: Record<string, string> = {};
    try {
      notas = p.notasItinerario ? JSON.parse(p.notasItinerario) : {};
    } catch {
      notas = {};
    }
    const v = (valor ?? "").trim();
    if (v) notas[notaCampo] = v;
    else delete notas[notaCampo];
    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: { notasItinerario: Object.keys(notas).length ? JSON.stringify(notas) : null },
    });
    return NextResponse.json({ ok: true });
  }

  // Fecha del bloque de Montaje/Desmontaje cuando se captura como día aparte.
  if ("fechaCampo" in body) {
    const { fechaCampo, valor } = body as { fechaCampo?: string; valor?: string };
    if (fechaCampo !== "montaje" && fechaCampo !== "desmontaje") {
      return NextResponse.json({ error: "Campo no editable" }, { status: 400 });
    }
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    const p = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { fechaEvento: true, fechasEvento: true },
    });
    if (!p) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    const dias = diasEvento(p.fechaEvento, p.fechasEvento);
    const diaNatural = fechaCampo === "montaje" ? dias[0] : dias[dias.length - 1];
    const diaAparte = valor !== diaNatural;
    const fechaDate = diaAparte ? new Date(`${valor}T12:00:00.000Z`) : null;
    if (fechaCampo === "montaje") {
      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: { fechaMontaje: fechaDate, montajeDiaAparte: diaAparte },
      });
    } else {
      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: { fechaDesmontaje: fechaDate, desmontajeDiaAparte: diaAparte },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const { notasOperativas } = body as { notasOperativas?: string };
  await prisma.proyecto.update({
    where: { id: proyectoId },
    data: { notasOperativas: notasOperativas?.trim() || null },
  });
  return NextResponse.json({ ok: true });
}
