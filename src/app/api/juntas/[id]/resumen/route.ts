import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { AREA_LABELS, TIPO_AGENDA_LABELS } from "@/lib/junta-templates";

// Genera el resumen estructurado directamente de los datos — sin IA
function generarResumenEstructurado(junta: {
  titulo: string;
  area: string;
  fecha: Date;
  duracionMin: number;
  notas: string | null;
  facilitador: { name: string };
  participantes: { user: { name: string } }[];
  agendaItems: { tipo: string; titulo: string; respuesta: string | null; completado: boolean }[];
  temasAdicionales: { titulo: string; notas: string | null; cubierto: boolean; pasadoSiguienteSemana: boolean }[];
  tareas: { titulo: string; prioridad: string; asignadoA: { name: string } | null; fechaVencimiento: Date | null }[];
}): string {
  const areaLabel = AREA_LABELS[junta.area as keyof typeof AREA_LABELS] ?? junta.area;
  const fecha = new Date(junta.fecha).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const participantes = junta.participantes.map((p) => p.user.name).join(", ") || "Sin registrar";

  const partes: string[] = [];

  // ── Encabezado ──
  partes.push(`JUNTA ${areaLabel.toUpperCase()} — ${fecha}`);
  partes.push(`Facilitador: ${junta.facilitador.name} · Participantes: ${participantes} · Duración: ${junta.duracionMin} min`);

  // ── Agenda cubierta ──
  const itemsCubiertos = junta.agendaItems.filter((i) => i.completado);
  if (itemsCubiertos.length > 0) {
    partes.push("\nAGENDA CUBIERTA");
    itemsCubiertos.forEach((item) => {
      const tipoLabel = TIPO_AGENDA_LABELS[item.tipo as keyof typeof TIPO_AGENDA_LABELS] ?? item.tipo;
      partes.push(`[${tipoLabel}] ${item.titulo}`);
      if (item.respuesta) partes.push(item.respuesta);
    });
  }

  // ── Agenda no cubierta ──
  const itemsSinCubrir = junta.agendaItems.filter((i) => !i.completado);
  if (itemsSinCubrir.length > 0) {
    partes.push("\nPUNTOS NO CUBIERTOS");
    itemsSinCubrir.forEach((item) => {
      partes.push(`- ${item.titulo}`);
    });
  }

  // ── Temas adicionales cubiertos ──
  const temasCubiertos = junta.temasAdicionales.filter((t) => t.cubierto);
  if (temasCubiertos.length > 0) {
    partes.push("\nTEMAS ADICIONALES TRATADOS");
    temasCubiertos.forEach((t) => {
      partes.push(`- ${t.titulo}${t.notas ? `\n  ${t.notas}` : ""}`);
    });
  }

  // ── Temas pasados a siguiente semana ──
  const temasPasados = junta.temasAdicionales.filter((t) => !t.cubierto && t.pasadoSiguienteSemana);
  const temasPendientes = junta.temasAdicionales.filter((t) => !t.cubierto && !t.pasadoSiguienteSemana);
  const noTratados = [...temasPasados, ...temasPendientes];
  if (noTratados.length > 0) {
    partes.push("\nTEMAS NO TRATADOS (PASAN A LA SIGUIENTE SEMANA)");
    noTratados.forEach((t) => {
      partes.push(`- ${t.titulo}`);
    });
  }

  // ── Tareas generadas ──
  if (junta.tareas.length > 0) {
    partes.push(`\nTAREAS GENERADAS (${junta.tareas.length})`);
    junta.tareas.forEach((t) => {
      const asig = t.asignadoA?.name ?? "Sin asignar";
      const venc = t.fechaVencimiento
        ? new Date(t.fechaVencimiento).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
        : "Sin fecha";
      partes.push(`- [${t.prioridad}] ${t.titulo} → ${asig} · ${venc}`);
    });
  }

  // ── Notas generales (completas, sin modificar) ──
  if (junta.notas) {
    partes.push("\nNOTAS GENERALES");
    partes.push(junta.notas);
  }

  return partes.join("\n");
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const junta = await prisma.junta.findUnique({
    where: { id },
    include: {
      facilitador:      { select: { name: true } },
      participantes:    { include: { user: { select: { name: true } } } },
      agendaItems:      { orderBy: { orden: "asc" } },
      temasAdicionales: { orderBy: { orden: "asc" } },
      tareas: {
        where:  { parentId: null },
        select: {
          titulo: true,
          prioridad: true,
          asignadoA: { select: { name: true } },
          fechaVencimiento: true,
        },
      },
    },
  });

  if (!junta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const resumenTexto = generarResumenEstructurado(junta);

  const updated = await prisma.junta.update({
    where: { id },
    data:  { resumen: resumenTexto, estado: "COMPLETADA" },
  });

  return NextResponse.json({ resumen: updated.resumen });
}
