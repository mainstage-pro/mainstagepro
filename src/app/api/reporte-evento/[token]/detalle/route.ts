import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Ruta protegida: devuelve todos los datos del reporte para la vista /ver
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { token } = await params;

  const reporte = await prisma.reportePostEvento.findUnique({
    where: { token },
    include: {
      proyecto: {
        select: {
          nombre: true,
          numeroProyecto: true,
          fechaEvento: true,
          cliente: { select: { nombre: true } },
        },
      },
    },
  });

  if (!reporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    estado: reporte.estado,
    coordinadorNombre: reporte.coordinadorNombre,
    respondidoEn: reporte.respondidoEn?.toISOString() ?? null,
    proyectoNombre: reporte.proyecto.nombre,
    numeroProyecto: reporte.proyecto.numeroProyecto,
    clienteNombre: reporte.proyecto.cliente.nombre,
    fechaEvento: reporte.proyecto.fechaEvento?.toISOString() ?? null,
    llegadaPlaneada: reporte.llegadaPlaneada,
    llegadaReal: reporte.llegadaReal,
    montajePlaneado: reporte.montajePlaneado,
    montajeReal: reporte.montajeReal,
    inicioProgramado: reporte.inicioProgramado,
    inicioReal: reporte.inicioReal,
    salidaPlaneada: reporte.salidaPlaneada,
    salidaReal: reporte.salidaReal,
    seEjecutoSegunPlan: reporte.seEjecutoSegunPlan,
    fallasEquipo: reporte.fallasEquipo ?? [],
    equipoMantenimiento: reporte.equipoMantenimiento ?? [],
    herramientasFaltantes: reporte.herramientasFaltantes ?? [],
    briefCompleto: reporte.briefCompleto,
    cambiosUltimoMomento: reporte.cambiosUltimoMomento,
    descripcionCambios: reporte.descripcionCambios,
    calificacionEquipo: reporte.calificacionEquipo,
    puntosPositivos: reporte.puntosPositivos,
    areasMejora: reporte.areasMejora,
    incidencias: reporte.incidencias ?? [],
    equipoRegreso: reporte.equipoRegreso,
    faltantesDescripcion: reporte.faltantesDescripcion,
    aprendizajeClave: reporte.aprendizajeClave,
    loRepetiriamos: reporte.loRepetiriamos,
  });
}
