import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  ensureTablaActividades,
  crearBloqueEnProyecto,
  esSeccion,
  fechaValida,
  horaValida,
  textoLimpio,
} from "@/lib/itinerario-actividades";

/**
 * Agrega una actividad desde el itinerario de operaciones.
 *  - Sin `proyectoId` → actividad suelta (ItinerarioActividad).
 *  - Con `proyectoId` + `seccion` → renglón en la Logística general de ese proyecto.
 *    Si además trae `actividadId`, es "integrar": la suelta se apaga en la misma transacción.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fecha = fechaValida(body.fecha);
  const titulo = textoLimpio(body.titulo);
  if (!fecha) return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
  if (!titulo) return NextResponse.json({ error: "Falta la actividad" }, { status: 400 });
  const datos = {
    fecha,
    titulo,
    horaInicio: horaValida(body.horaInicio),
    horaFin: horaValida(body.horaFin),
    nota: textoLimpio(body.nota),
    responsable: textoLimpio(body.responsable),
  };

  const proyectoId = textoLimpio(body.proyectoId);
  const actividadId = textoLimpio(body.actividadId);

  if (!proyectoId) {
    if (actividadId) return NextResponse.json({ error: "Falta el proyecto" }, { status: 400 });
    await ensureTablaActividades();
    const actividad = await prisma.itinerarioActividad.create({
      data: { ...datos, creadoPorId: session.id },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, actividadId: actividad.id });
  }

  if (!esSeccion(body.seccion)) return NextResponse.json({ error: "Falta la sección" }, { status: 400 });
  const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } });
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const bloque = await crearBloqueEnProyecto({ ...datos, proyectoId, seccion: body.seccion });
  if (actividadId) {
    await ensureTablaActividades();
    await prisma.itinerarioActividad.updateMany({ where: { id: actividadId }, data: { activo: false } });
  }
  return NextResponse.json({ ok: true, bloqueId: bloque.id });
}
