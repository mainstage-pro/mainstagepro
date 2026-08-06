import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProcesoVentaColumns, ensureMultidiaColumns, ensureCotizacionEventoConfirmadoColumn } from "@/lib/migraciones-lazy";
import { diasEvento } from "@/lib/fechas-evento";

type Nivel = 'tentativo' | 'confirmado' | 'operativo';

function nivelProyecto(estado: string): Nivel {
  if (['PRODUCCION', 'EN_CURSO', 'EN_PRODUCCION'].includes(estado)) return 'operativo';
  if (estado === 'CONFIRMADO') return 'confirmado';
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
  await ensureCotizacionEventoConfirmadoColumn();

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

  // El calendario solo muestra eventos GANADOS o CONFIRMADOS. Un evento aparece si
  // (a) ya tiene proyecto —el proyecto solo nace de una venta cerrada— o (b) el trato
  // está en VENTA_CERRADA, tiene confirmadaEn, tiene una cotización APROBADA, o tiene
  // una cotización con eventoConfirmado (desbloqueo manual: el evento se confirmó
  // aunque la cotización aún no se cierre). Los tratos en pipeline temprano sin
  // ninguna de esas señales NO aparecen.

  // ── 1. Proyectos (venta ya convertida en proyecto) ─────────────────────────
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

  // ── 2. Tratos ganados/confirmados sin proyecto aún ─────────────────────────
  // Ganado = VENTA_CERRADA, confirmadaEn, cotización APROBADA, o cotización con
  // eventoConfirmado. La fecha del evento sale de esa cotización y, si no hay, de
  // fechaEventoEstimada.
  const tratosGanados = await prisma.trato.findMany({
    where: {
      proyectos: { none: {} },
      // Un trato con venta perdida nunca va al calendario, ni siquiera con el flag manual.
      etapa: { not: "VENTA_PERDIDA" },
      OR: [
        { etapa: "VENTA_CERRADA" },
        { confirmadaEn: { not: null } },
        { cotizaciones: { some: { estado: "APROBADA" } } },
        { cotizaciones: { some: { eventoConfirmado: true } } },
      ],
    },
    include: {
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: { OR: [{ estado: "APROBADA" }, { eventoConfirmado: true }] },
        orderBy: { fechaEvento: "asc" },
        take: 1,
      },
    },
  });

  const eventosTratoGanado = tratosGanados.flatMap(t => {
    const cot = t.cotizaciones.find(c => c.fechaEvento) ?? null;
    // Fecha principal: cotización aprobada/confirmada > fecha estimada del trato.
    const fechaPrincipal = cot?.fechaEvento ?? t.fechaEventoEstimada ?? null;
    if (!fechaPrincipal) return [];
    const titulo =
      t.nombreEvento ||
      ((cot as unknown as Record<string, unknown> | null)?.nombreEvento as string) ||
      "Evento";
    // La lista canónica de días sale del descubrimiento (trato.fechasEvento); día 1 = fecha principal.
    return celdasDelMes(fechaPrincipal, (t as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, idx, total }) => ({
      id: `tratocot-${t.id}-d${idx}`,
      dia,
      titulo: total > 1 ? `${titulo} · Día ${idx + 1}/${total}` : titulo,
      subtitulo: t.cliente?.nombre || "",
      estado: "VENTA_CERRADA" as const,
      nivel: "confirmado" as Nivel,
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
    ...eventosTratoGanado,
  ].sort((a, b) => a.dia - b.dia);

  return NextResponse.json({ eventos });
}
