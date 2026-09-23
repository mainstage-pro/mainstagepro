import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SEVERIDADES_FALLA, SEVERIDAD_FALLA_LABEL } from "@/lib/falla-equipo";

// Una falla capturada en el reporte post-evento se convierte en una FallaEquipo real
// (origen EVENTO, ligada al proyecto). El coordinador elige el equipo de la lista del
// proyecto; si no está en la lista, queda solo como texto en el reporte.
type FallaDetalle = {
  equipoId?: string | null;
  equipoLabel?: string;
  severidad?: string;
  descripcion?: string;
};

function etiquetaEquipo(e: { descripcion: string; marca: string | null; modelo: string | null }): string {
  const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
  return marcaModelo ? `${e.descripcion} · ${marcaModelo}` : e.descripcion;
}

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
          // Equipo propio asignado al proyecto: es lo único que podemos mandar a taller.
          equipos: {
            where: { tipo: "PROPIO" },
            select: {
              equipo: { select: { id: true, descripcion: true, marca: true, modelo: true } },
            },
          },
        },
      },
    },
  });

  if (!reporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Un mismo equipo puede venir en varias líneas del proyecto; la lista se deduplica.
  const vistos = new Set<string>();
  const equipos = reporte.proyecto.equipos
    .map((pe) => pe.equipo)
    .filter((e) => (vistos.has(e.id) ? false : (vistos.add(e.id), true)))
    .map((e) => ({ id: e.id, label: etiquetaEquipo(e) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  return NextResponse.json({
    estado: reporte.estado,
    coordinadorNombre: reporte.coordinadorNombre,
    proyectoNombre: reporte.proyecto.nombre,
    numeroProyecto: reporte.proyecto.numeroProyecto,
    clienteNombre: reporte.proyecto.cliente.nombre,
    fechaEvento: reporte.proyecto.fechaEvento?.toISOString() ?? null,
    tipoServicio: reporte.proyecto.tipoServicio ?? null,
    equipos,
  });
}

// ─── POST público: recibe y guarda el reporte completo ───────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const reporte = await prisma.reportePostEvento.findUnique({
    where: { token },
    include: { proyecto: { select: { id: true, fechaEvento: true } } },
  });
  if (!reporte) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (reporte.estado === "completado") {
    return NextResponse.json({ error: "Este reporte ya fue enviado" }, { status: 409 });
  }

  const body = await req.json();

  // Fallas estructuradas (formulario nuevo). Si el navegador trae la versión vieja
  // cacheada por el service worker, cae al string[] de siempre y no se pierde nada.
  const detalle: FallaDetalle[] | null = Array.isArray(body.fallasDetalle) ? body.fallasDetalle : null;

  // El equipoId viene de un formulario público: solo se acepta si de verdad pertenece
  // a este proyecto. Lo demás queda como texto del reporte.
  const equiposDelProyecto = new Set<string>(
    detalle?.some((f) => f.equipoId)
      ? (await prisma.proyectoEquipo.findMany({
          where: { proyectoId: reporte.proyecto.id },
          select: { equipoId: true },
        })).map((pe) => pe.equipoId)
      : [],
  );

  const fallasNuevas = (detalle ?? [])
    .map((f) => ({
      equipoId: f.equipoId && equiposDelProyecto.has(f.equipoId) ? f.equipoId : null,
      severidad: (SEVERIDADES_FALLA as readonly string[]).includes(f.severidad ?? "")
        ? f.severidad!
        : "MODERADA",
      descripcion: (f.descripcion ?? "").trim(),
      equipoLabel: (f.equipoLabel ?? "").trim(),
    }))
    .filter((f) => f.descripcion);

  const fallasTexto = detalle
    ? fallasNuevas.map((f) =>
        `${f.equipoLabel ? `${f.equipoLabel} — ` : ""}${f.descripcion} (${SEVERIDAD_FALLA_LABEL[f.severidad]})`,
      )
    : (body.fallasEquipo ?? []);

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
      fallasEquipo: fallasTexto,
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

  // Las fallas con equipo identificado se vuelven registros reales y aparecen en el
  // tablero de producción. Si esto falla, el reporte ya quedó guardado: se registra el
  // error pero no se tumba la respuesta del coordinador.
  const conEquipo = fallasNuevas.filter((f) => f.equipoId);
  if (conEquipo.length > 0) {
    try {
      await prisma.fallaEquipo.createMany({
        data: conEquipo.map((f) => ({
          equipoId: f.equipoId!,
          proyectoId: reporte.proyecto.id,
          fecha: reporte.proyecto.fechaEvento ?? new Date(),
          descripcion: f.descripcion,
          severidad: f.severidad,
          origen: "EVENTO",
          estado: "REPORTADA",
        })),
      });
    } catch (e) {
      console.error("[reporte-evento] no se pudieron crear las fallas", e);
    }
  }

  return NextResponse.json({ ok: true, fallasCreadas: conEquipo.length });
}
