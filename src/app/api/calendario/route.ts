import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProcesoVentaColumns, ensureMultidiaColumns } from "@/lib/migraciones-lazy";
import { diasEvento } from "@/lib/fechas-evento";

type Nivel = 'tentativo' | 'confirmado' | 'operativo';

function nivelProyecto(estado: string): Nivel {
  if (['PRODUCCION', 'EN_CURSO', 'EN_PRODUCCION'].includes(estado)) return 'operativo';
  if (estado === 'CONFIRMADO') return 'confirmado';
  return 'tentativo';
}

function nivelTrato(confirmadaEn: Date | null, etapa: string): Nivel {
  if (confirmadaEn || etapa === 'VENTA_CERRADA') return 'confirmado';
  if (['LEAD', 'DESCUBRIMIENTO', 'OPORTUNIDAD'].includes(etapa)) return 'tentativo';
  return 'tentativo';
}

// Expande un evento (posiblemente de varios días) en las celdas que caen dentro del
// mes consultado. Devuelve el número de día del mes, el índice (0-based) y el total.
function celdasDelMes(
  fechaPrincipal: Date | string | null | undefined,
  fechasEventoJson: string | null | undefined,
  year: number,
  month: number,
): { dia: number; idx: number; total: number }[] {
  const dias = diasEvento(fechaPrincipal, fechasEventoJson);
  const total = dias.length;
  const out: { dia: number; idx: number; total: number }[] = [];
  dias.forEach((d, idx) => {
    const [y, m, dd] = d.split("-").map(Number);
    if (y === year && m - 1 === month) out.push({ dia: dd, idx, total });
  });
  return out;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Lee tratos con `include`; garantizar columnas nuevas antes de consultar.
  await ensureProcesoVentaColumns();
  await ensureMultidiaColumns();

  const sp = req.nextUrl.searchParams;
  const mes = sp.get("mes"); // "2026-04"

  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
  }

  const inicio = new Date(year, month, 1);
  const fin    = new Date(year, month + 1, 0, 23, 59, 59);

  // ── 1. Proyectos existentes ───────────────────────────────────────────────
  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: inicio, lte: fin }, estado: { not: "CANCELADO" } },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaEvento: "asc" },
  });

  const eventosProyecto = proyectos.flatMap(p =>
    celdasDelMes(p.fechaEvento, (p as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, idx, total }) => ({
      id: `proy-${p.id}-d${idx}`,
      dia,
      titulo: total > 1 ? `${p.nombre} · Día ${idx + 1}/${total}` : p.nombre,
      subtitulo: p.cliente.nombre,
      estado: p.estado,
      nivel: nivelProyecto(p.estado),
      url: `/proyectos/${p.id}`,
      tipoEvento: p.tipoEvento,
      tipoServicio: p.tipoServicio,
      lugarEvento: p.lugarEvento,
      horaInicioEvento: p.horaInicioEvento,
    })),
  );

  // ── 2. Tratos con cotización APROBADA sin proyecto creado aún ──────────────
  const tratosConCot = await prisma.trato.findMany({
    where: {
      proyectos: { none: {} },
      cotizaciones: {
        some: {
          estado: "APROBADA",
          fechaEvento: { gte: inicio, lte: fin, not: null },
        },
      },
    },
    include: {
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: {
          estado: "APROBADA",
          fechaEvento: { gte: inicio, lte: fin, not: null },
        },
        orderBy: { fechaEvento: "asc" },
        take: 1,
      },
    },
  });

  // IDs de tratos ya cubiertos por cotización APROBADA (para no duplicar en fuente 3)
  const idsConCotAprobada = new Set(tratosConCot.map(t => t.id));

  const eventosTratoCot = tratosConCot.flatMap(t => {
    const nivel = nivelTrato(
      (t as unknown as { confirmadaEn?: Date | null }).confirmadaEn ?? null,
      (t as unknown as { etapa?: string }).etapa ?? 'LEAD',
    );
    const cot = t.cotizaciones.find(c => c.fechaEvento);
    if (!cot) return [];
    const titulo = t.nombreEvento || (cot as unknown as Record<string, unknown>).nombreEvento as string || "Evento";
    // La lista canónica de días sale del descubrimiento (trato.fechasEvento); día 1 = fecha de la cotización.
    return celdasDelMes(cot.fechaEvento, (t as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, idx, total }) => ({
      id: `tratocot-${t.id}-d${idx}`,
      dia,
      titulo: total > 1 ? `${titulo} · Día ${idx + 1}/${total}` : titulo,
      subtitulo: t.cliente?.nombre || "",
      estado: "VENTA_CERRADA" as const,
      nivel,
      url: `/crm/tratos/${t.id}`,
      tipoEvento: t.tipoEvento,
      tipoServicio: null,
      lugarEvento: t.lugarEstimado,
      horaInicioEvento: null,
    }));
  });

  // ── 3. Tratos seguros (VENTA_CERRADA o con confirmadaEn) sin cotización APROBADA ──
  const tratosConfirmados = await prisma.trato.findMany({
    where: {
      proyectos: { none: {} },
      OR: [
        { confirmadaEn: { not: null } },
        { etapa: 'VENTA_CERRADA' },
      ],
      fechaEventoEstimada: { gte: inicio, lte: fin, not: null },
      // Excluir los que ya tienen cotización APROBADA (cubiertos por fuente 2)
      id: { notIn: [...idsConCotAprobada] },
    },
    include: {
      cliente: { select: { nombre: true } },
    },
    orderBy: { fechaEventoEstimada: 'asc' },
  });

  const eventosTratosConfirmados = tratosConfirmados
    .filter(t => t.fechaEventoEstimada)
    .flatMap(t => {
      const titulo = t.nombreEvento || "Evento confirmado";
      return celdasDelMes(t.fechaEventoEstimada, (t as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, idx, total }) => ({
        id: `tratoconf-${t.id}-d${idx}`,
        dia,
        titulo: total > 1 ? `${titulo} · Día ${idx + 1}/${total}` : titulo,
        subtitulo: t.cliente?.nombre || "",
        estado: "VENTA_CERRADA" as const,
        nivel: 'confirmado' as Nivel,
        url: `/crm/tratos/${t.id}`,
        tipoEvento: t.tipoEvento,
        tipoServicio: null,
        lugarEvento: t.lugarEstimado,
        horaInicioEvento: null,
      }));
    });

  // IDs ya cubiertos (cotización aprobada o confirmado)
  const idsCubiertos = new Set([
    ...idsConCotAprobada,
    ...tratosConfirmados.map(t => t.id),
  ]);

  // ── 4. Tratos activos (LEAD / DESCUBRIMIENTO / OPORTUNIDAD) con fecha estimada ──
  // Se muestran como eventos tentativos para que el equipo vea la carga potencial
  const tratosActivos = await prisma.trato.findMany({
    where: {
      proyectos: { none: {} },
      etapa: { in: ['LEAD', 'DESCUBRIMIENTO', 'OPORTUNIDAD'] },
      fechaEventoEstimada: { gte: inicio, lte: fin, not: null },
      id: { notIn: [...idsCubiertos] },
    },
    include: {
      cliente: { select: { nombre: true } },
    },
    orderBy: { fechaEventoEstimada: 'asc' },
  });

  const eventosTratosActivos = tratosActivos
    .filter(t => t.fechaEventoEstimada)
    .flatMap(t => {
      const titulo = t.nombreEvento || 'Evento tentativo';
      return celdasDelMes(t.fechaEventoEstimada, (t as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, idx, total }) => ({
        id: `tratoact-${t.id}-d${idx}`,
        dia,
        titulo: total > 1 ? `${titulo} · Día ${idx + 1}/${total}` : titulo,
        subtitulo: t.cliente?.nombre || '',
        estado: t.etapa as string,
        nivel: 'tentativo' as Nivel,
        url: `/crm/tratos/${t.id}`,
        tipoEvento: t.tipoEvento,
        tipoServicio: null,
        lugarEvento: t.lugarEstimado,
        horaInicioEvento: null,
      }));
    });

  // ── Merge y ordenar por día ───────────────────────────────────────────────
  const eventos = [
    ...eventosProyecto,
    ...eventosTratoCot,
    ...eventosTratosConfirmados,
    ...eventosTratosActivos,
  ].sort((a, b) => a.dia - b.dia);

  return NextResponse.json({ eventos });
}
