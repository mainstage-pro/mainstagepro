import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET público: devuelve contexto del proyecto para mostrar en el formulario ─
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const reporte = await prisma.reportePostEvento.findUnique({
    where: { token },
    include: {
      proyecto: {
        select: {
          nombre: true,
          numeroProyecto: true,
          fechaEvento: true,
          tipoServicio: true,
          cliente: { select: { nombre: true } },
        },
      },
    },
  });

  if (!reporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    estado: reporte.estado,
    coordinadorNombre: reporte.coordinadorNombre,
    proyectoNombre: reporte.proyecto.nombre,
    numeroProyecto: reporte.proyecto.numeroProyecto,
    clienteNombre: reporte.proyecto.cliente.nombre,
    fechaEvento: reporte.proyecto.fechaEvento?.toISOString() ?? null,
    tipoServicio: reporte.proyecto.tipoServicio ?? null,
  });
}

// ─── POST público: recibe y guarda el reporte completo ───────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const reporte = await prisma.reportePostEvento.findUnique({ where: { token } });
  if (!reporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (reporte.estado === "completado") {
    return NextResponse.json({ error: "Este reporte ya fue enviado" }, { status: 409 });
  }

  const body = await req.json();

  await prisma.reportePostEvento.update({
    where: { token },
    data: {
      estado: "completado",
      respondidoEn: new Date(),
      coordinadorNombre: body.coordinadorNombre || null,
      // Bloque ejecución
      llegadaPlaneada: body.llegadaPlaneada || null,
      llegadaReal: body.llegadaReal || null,
      montajePlaneado: body.montajePlaneado || null,
      montajeReal: body.montajeReal || null,
      inicioProgramado: body.inicioProgramado || null,
      inicioReal: body.inicioReal || null,
      salidaPlaneada: body.salidaPlaneada || null,
      salidaReal: body.salidaReal || null,
      seEjecutoSegunPlan: body.seEjecutoSegunPlan || null,
      // Bloque equipos
      fallasEquipo: body.fallasEquipo ?? [],
      equipoMantenimiento: body.equipoMantenimiento ?? [],
      herramientasFaltantes: body.herramientasFaltantes ?? [],
      // Bloque información
      briefCompleto: body.briefCompleto || null,
      cambiosUltimoMomento: body.cambiosUltimoMomento ?? null,
      descripcionCambios: body.descripcionCambios || null,
      // Bloque equipo técnico
      calificacionEquipo: body.calificacionEquipo ? Number(body.calificacionEquipo) : null,
      puntosPositivos: body.puntosPositivos || null,
      areasMejora: body.areasMejora || null,
      // Bloque incidencias
      incidencias: body.incidencias ?? [],
      // Bloque cierre
      equipoRegreso: body.equipoRegreso || null,
      faltantesDescripcion: body.faltantesDescripcion || null,
      aprendizajeClave: body.aprendizajeClave || null,
      loRepetiriamos: body.loRepetiriamos || null,
    },
  });

  return NextResponse.json({ ok: true });
}
