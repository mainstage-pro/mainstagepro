import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | Date) {
  const s = typeof iso === "string" ? iso : iso.toISOString();
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

export default async function AgendaSemanaPage() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.area !== "DIRECCION")) {
    redirect("/agenda");
  }

  const ahora       = new Date();
  const hoyStr      = ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const inicioDeHoy = new Date(hoyStr);
  const en7         = new Date(ahora.getTime() + 7 * 86400000);
  const en14        = new Date(ahora.getTime() + 14 * 86400000);
  const en3         = new Date(ahora.getTime() + 3 * 86400000);

  // Lunes de la semana actual (para buscar reportes de área)
  const day = ahora.getDay();
  const diffLunes = day === 0 ? -6 : 1 - day;
  const lunes = new Date(ahora);
  lunes.setDate(lunes.getDate() + diffLunes);
  const lunesStr = lunes.toLocaleDateString("en-CA");


  const [
    // Esta semana
    proyectosEstaSemana,
    proyectosSinPlan72h,
    // Próximas 2 semanas
    proyectosDosSemanás,
    // Pagos urgentes
    cobrosEstaSemanа,
    pagosEstaSemana,
    // Cotizaciones sin respuesta
    cotizacionesPendientes,
    // Tareas vencidas por área
    tareasVencidas,
    // Tratos sin seguimiento vencido
    tratosSeguimientoPorVencer,
  ] = await Promise.all([

    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: inicioDeHoy, lte: en7 },
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
      },
      select: {
        id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
        estado: true, planProduccionAprobado: true,
        cliente: { select: { nombre: true } },
        personal: { select: { confirmado: true } },
      },
      orderBy: { fechaEvento: "asc" },
    }),

    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: inicioDeHoy, lte: en3 },
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
        planProduccionAprobado: false,
      },
      select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true },
    }).catch(() => []),

    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: en7, lte: en14 },
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
      },
      select: {
        id: true, nombre: true, numeroProyecto: true, fechaEvento: true, estado: true,
        cliente: { select: { nombre: true } },
        personal: { select: { confirmado: true } },
      },
      orderBy: { fechaEvento: "asc" },
    }),

    prisma.cuentaCobrar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        fechaCompromiso: { gte: inicioDeHoy, lte: en7 },
      },
      select: {
        id: true, concepto: true, monto: true, fechaCompromiso: true,
        cliente: { select: { nombre: true } },
        proyecto: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }),

    prisma.cuentaPagar.findMany({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        fechaCompromiso: { gte: inicioDeHoy, lte: en7 },
      },
      select: {
        id: true, concepto: true, monto: true, fechaCompromiso: true,
        proveedor: { select: { nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    }).catch(() => []),

    prisma.cotizacion.findMany({
      where: { estado: "ENVIADA" },
      select: {
        id: true, numeroCotizacion: true, granTotal: true, updatedAt: true,
        nombreEvento: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 8,
    }),

    prisma.tarea.groupBy({
      by: ["area"],
      _count: { _all: true },
      where: {
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
        parentId: null,
        fecha: { lt: inicioDeHoy },
      },
    }),

    // Tratos activos sin actualización reciente (proxy de seguimiento vencido)
    prisma.trato.findMany({
      where: {
        etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
        updatedAt: { lt: new Date(ahora.getTime() - 7 * 86400000) },
      },
      select: { id: true, clienteId: true, updatedAt: true, responsable: { select: { name: true } }, cliente: { select: { nombre: true } } },
      orderBy: { updatedAt: "asc" },
      take: 5,
    }),
  ]);

  const AREA_LABEL: Record<string, string> = {
    VENTAS: "Ventas", PRODUCCION: "Producción", MARKETING: "Marketing",
    ADMINISTRACION: "Administración", RRHH: "RR.HH.", DIRECCION: "Dirección",
  };

  const totalCobros = cobrosEstaSemanа.reduce((s, c) => s + c.monto, 0);
  const totalPagos = pagosEstaSemana.reduce((s, p) => s + p.monto, 0);

  const fmtSemana = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const lun = new Date(y, m - 1, d);
    const dom = new Date(y, m - 1, d + 6);
    return `${lun.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${dom.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Agenda · Semana</p>
          <h1 className="text-white text-2xl font-bold">Vista semanal de Dirección</h1>
          <p className="text-[#555] text-sm mt-1 capitalize">{fmtSemana(lunesStr)}</p>
        </div>
        <Link href="/agenda" className="text-[#555] hover:text-white text-xs mt-1">← Mi agenda</Link>
      </div>

      {/* Alertas críticas */}
      {(proyectosSinPlan72h.length > 0 || tareasVencidas.some(t => t._count._all > 5)) && (
        <div className="space-y-2">
          {proyectosSinPlan72h.map(p => (
            <div key={p.id} className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-red-400 font-bold text-sm">⚠ Plan de producción sin aprobar — {p.numeroProyecto}</p>
                <p className="text-red-300/60 text-xs mt-0.5">{p.nombre} · {fmtDate(p.fechaEvento)}</p>
              </div>
              <Link href={`/proyectos/${p.id}/plan`} className="text-xs text-red-400 hover:underline shrink-0">Ver plan →</Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Eventos esta semana */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">EVENTOS ESTA SEMANA</p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
          </div>
          {proyectosEstaSemana.length === 0 ? (
            <p className="text-[#444] text-sm bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">Sin eventos esta semana</p>
          ) : (
            <div className="space-y-2">
              {proyectosEstaSemana.map(p => {
                const confirmados = p.personal.filter(x => x.confirmado).length;
                return (
                  <Link key={p.id} href={`/proyectos/${p.id}`}
                    className="block ms-card p-3 hover:border-[#2a2a2a] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.nombre}</p>
                        <p className="text-[#555] text-xs mt-0.5">{p.cliente.nombre} · {fmtDate(p.fechaEvento)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold ${p.planProduccionAprobado ? "text-green-400" : "text-yellow-400"}`}>
                          {p.planProduccionAprobado ? "Plan ✓" : "Sin plan"}
                        </span>
                        <span className={`text-[10px] ${confirmados > 0 ? "text-green-400" : "text-red-400"}`}>
                          {confirmados}/{p.personal.length}p
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Próximas 2 semanas */}
          {proyectosDosSemanás.length > 0 && (
            <>
              <div className="flex items-center gap-3 mt-4">
                <p className="text-[11px] font-bold text-[#2a2a2a] uppercase tracking-widest">PRÓXIMAS 2 SEMANAS</p>
                <div className="flex-1 h-px bg-[#141414]" />
              </div>
              <div className="space-y-1.5">
                {proyectosDosSemanás.map(p => {
                  const confirmados = p.personal.filter(x => x.confirmado).length;
                  return (
                    <Link key={p.id} href={`/proyectos/${p.id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-[#0d0d0d] rounded-lg hover:bg-[#141414] transition-all">
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">{p.nombre}</p>
                        <p className="text-[#444] text-[10px]">{fmtDate(p.fechaEvento)}</p>
                      </div>
                      <span className={`text-[10px] shrink-0 ${confirmados > 0 ? "text-[#555]" : "text-red-500"}`}>
                        {confirmados}/{p.personal.length}p
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Cobros y pagos esta semana */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">COBROS Y PAGOS ESTA SEMANA</p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
          </div>

          {cobrosEstaSemanа.length === 0 && pagosEstaSemana.length === 0 ? (
            <p className="text-[#444] text-sm bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">Sin movimientos esta semana</p>
          ) : (
            <div className="space-y-1.5">
              {cobrosEstaSemanа.map(c => (
                <Link key={c.id} href="/finanzas/cxc"
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg hover:border-[#2a2a2a] transition-all">
                  <div className="min-w-0">
                    <p className="text-green-400 text-xs font-semibold truncate">{c.cliente?.nombre ?? "Cliente"}</p>
                    <p className="text-[#444] text-[10px]">{c.concepto ?? "Cobro"} · {c.fechaCompromiso ? fmtDate(c.fechaCompromiso) : "—"}</p>
                  </div>
                  <p className="text-green-400 text-xs font-bold shrink-0">{fmt(c.monto)}</p>
                </Link>
              ))}
              {pagosEstaSemana.map(p => (
                <Link key={p.id} href="/finanzas/cxp"
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg hover:border-[#2a2a2a] transition-all">
                  <div className="min-w-0">
                    <p className="text-red-400 text-xs font-semibold truncate">{p.proveedor?.nombre ?? "Proveedor"}</p>
                    <p className="text-[#444] text-[10px]">{p.concepto ?? "Pago"} · {p.fechaCompromiso ? fmtDate(p.fechaCompromiso) : "—"}</p>
                  </div>
                  <p className="text-red-400 text-xs font-bold shrink-0">-{fmt(p.monto)}</p>
                </Link>
              ))}
              <div className="flex items-center justify-between pt-1 px-1">
                <p className="text-[#444] text-xs">Neto semana</p>
                <p className={`text-sm font-bold ${totalCobros - totalPagos >= 0 ? "text-[#B3985B]" : "text-red-400"}`}>
                  {fmt(totalCobros - totalPagos)}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>


      {/* Cotizaciones sin respuesta */}
      {cotizacionesPendientes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">
              COTIZACIONES SIN RESPUESTA ({cotizacionesPendientes.length})
            </p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <Link href="/cotizaciones" className="text-[#B3985B] text-xs hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-1.5">
            {cotizacionesPendientes.map(c => {
              const dias = Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 86400000);
              return (
                <Link key={c.id} href={`/cotizaciones/${c.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg hover:border-[#2a2a2a] transition-all">
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{c.nombreEvento ?? c.cliente?.nombre ?? "Cotización"}</p>
                    <p className="text-[#444] text-[10px]">{c.numeroCotizacion} · enviada hace {dias}d</p>
                  </div>
                  <p className={`text-xs font-semibold shrink-0 ${dias > 7 ? "text-red-400" : "text-[#B3985B]"}`}>
                    {fmt(c.granTotal)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tareas vencidas por área */}
      {tareasVencidas.some(t => t._count._all > 0) && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">TAREAS VENCIDAS POR ÁREA</p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <Link href="/operaciones/equipo" className="text-[#B3985B] text-xs hover:underline">Ver equipo →</Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            {tareasVencidas.map(t => (
              <div key={t.area} className={`bg-[#111] border rounded-xl px-4 py-3 ${t._count._all > 5 ? "border-red-900/40" : "border-[#1e1e1e]"}`}>
                <p className={`text-lg font-bold ${t._count._all > 5 ? "text-red-400" : t._count._all > 2 ? "text-yellow-400" : "text-[#555]"}`}>
                  {t._count._all}
                </p>
                <p className="text-[#444] text-[10px] mt-0.5">{AREA_LABEL[t.area] ?? t.area}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tratos sin seguimiento reciente */}
      {tratosSeguimientoPorVencer.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest">TRATOS SIN ACTUALIZACIÓN +7 DÍAS ({tratosSeguimientoPorVencer.length})</p>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <Link href="/crm/tratos" className="text-[#B3985B] text-xs hover:underline">Ver CRM →</Link>
          </div>
          <div className="space-y-1.5">
            {tratosSeguimientoPorVencer.map(t => {
              const dias = Math.round((Date.now() - new Date(t.updatedAt).getTime()) / 86400000);
              return (
                <Link key={t.id} href="/crm/tratos"
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg hover:border-[#2a2a2a] transition-all">
                  <p className="text-white text-xs font-medium truncate">{t.cliente.nombre}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[#555] text-[10px]">{t.responsable?.name ?? "Sin resp."}</p>
                    <p className="text-red-400 text-[10px] font-bold">{dias}d sin actualizar</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
