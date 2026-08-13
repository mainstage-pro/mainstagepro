import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProcesoVentaColumns, ensureMultidiaColumns, ensureCotizacionEventoConfirmadoColumn } from "@/lib/migraciones-lazy";
import { diasEvento } from "@/lib/fechas-evento";

// El color del calendario deriva ÚNICAMENTE de la cotización, no del estado del proyecto:
//   'confirmado'    → cotización APROBADA (auto-confirmada) o ya hay proyecto (verde)
//   'por_confirmar' → evento apartado manualmente (eventoConfirmado) con cotización sin aprobar (ámbar)
type Nivel = 'por_confirmar' | 'confirmado';

// Expande un evento (posiblemente de varios días) en las celdas que caen dentro del
// mes consultado. Devuelve el número de día del mes, el índice (0-based) y el total.
// Expande un evento en sus celdas dentro del rango pedido. Si `month` es null se
// consideran todos los meses del año (vista anual). Devuelve día, mes (0-based),
// índice del día dentro del evento y total de días.
function celdasDelMes(
  fechaPrincipal: Date | string | null | undefined,
  fechasEventoJson: string | null | undefined,
  year: number,
  month: number | null,
): { dia: number; mes: number; idx: number; total: number }[] {
  const dias = diasEvento(fechaPrincipal, fechasEventoJson);
  const total = dias.length;
  const out: { dia: number; mes: number; idx: number; total: number }[] = [];
  dias.forEach((d, idx) => {
    const [y, m, dd] = d.split("-").map(Number);
    if (y === year && (month == null || m - 1 === month)) out.push({ dia: dd, mes: m - 1, idx, total });
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
  const anioParam = sp.get("anio"); // "2026" → vista anual (todos los meses)

  let year = new Date().getFullYear();
  let month: number | null = new Date().getMonth();
  if (anioParam) {
    const y = Number(anioParam);
    if (!isNaN(y)) { year = y; month = null; }
  } else if (mes) {
    const [y, m] = mes.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
  }

  const inicio = month == null ? new Date(year, 0, 1) : new Date(year, month, 1);
  const fin    = month == null ? new Date(year, 11, 31, 23, 59, 59) : new Date(year, month + 1, 0, 23, 59, 59);

  // El calendario solo muestra eventos confirmados vía COTIZACIÓN. Un evento aparece si
  // (a) ya tiene proyecto —el proyecto solo nace de una cotización aprobada— o (b) el
  // trato tiene una cotización APROBADA (verde) o una cotización con eventoConfirmado
  // (desbloqueo manual: el evento se apartó aunque la cotización aún no se apruebe; ámbar).
  // Ni el estado/etapa del proyecto ni el del trato pintan el calendario: el color y la
  // visibilidad salen exclusivamente de la cotización.

  // ── 1. Proyectos (venta ya convertida en proyecto) ─────────────────────────
  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: inicio, lte: fin }, estado: { not: "CANCELADO" } },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaEvento: "asc" },
  });

  const eventosProyecto = proyectos.flatMap(p =>
    celdasDelMes(p.fechaEvento, (p as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, mes, idx, total }) => ({
      id: `proy-${p.id}-d${idx}`,
      dia,
      mes,
      titulo: total > 1 ? `${p.nombre} · Día ${idx + 1}/${total}` : p.nombre,
      subtitulo: p.cliente.nombre,
      estado: p.estado,
      nivel: 'confirmado' as Nivel,
      sinProyecto: false,
      url: `/proyectos/${p.id}`,
      tipoEvento: p.tipoEvento,
      tipoServicio: p.tipoServicio,
      lugarEvento: p.lugarEvento,
      horaInicioEvento: p.horaInicioEvento,
    })),
  );

  // ── 2. Tratos con cotización confirmada, sin proyecto aún ──────────────────
  // Aparecen solo si tienen una cotización APROBADA (verde) o una con eventoConfirmado
  // (apartado manual, ámbar). La fecha del evento sale de esa cotización y, si no hay,
  // de fechaEventoEstimada. VENTA_PERDIDA nunca aparece.
  const tratosGanados = await prisma.trato.findMany({
    where: {
      proyectos: { none: {} },
      etapa: { not: "VENTA_PERDIDA" },
      cotizaciones: { some: { OR: [{ estado: "APROBADA" }, { eventoConfirmado: true }] } },
    },
    include: {
      cliente: { select: { nombre: true } },
      cotizaciones: {
        where: { OR: [{ estado: "APROBADA" }, { eventoConfirmado: true }] },
        orderBy: { fechaEvento: "asc" },
      },
    },
  });

  const eventosTratoGanado = tratosGanados.flatMap(t => {
    // El color sale de la cotización: aprobada = verde, solo apartada = ámbar.
    const aprobada = t.cotizaciones.some(c => c.estado === "APROBADA");
    const cot = t.cotizaciones.find(c => c.fechaEvento) ?? null;
    const fechaPrincipal = cot?.fechaEvento ?? t.fechaEventoEstimada ?? null;
    if (!fechaPrincipal) return [];
    const titulo = t.nombreEvento || cot?.nombreEvento || "Evento";
    // La lista canónica de días sale del descubrimiento (trato.fechasEvento); día 1 = fecha principal.
    return celdasDelMes(fechaPrincipal, (t as unknown as { fechasEvento?: string | null }).fechasEvento, year, month).map(({ dia, mes, idx, total }) => ({
      id: `tratocot-${t.id}-d${idx}`,
      dia,
      mes,
      titulo: total > 1 ? `${titulo} · Día ${idx + 1}/${total}` : titulo,
      subtitulo: t.cliente?.nombre || "",
      estado: aprobada ? "APROBADA" : "POR_CONFIRMAR",
      nivel: (aprobada ? "confirmado" : "por_confirmar") as Nivel,
      sinProyecto: true,
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
