import { prisma } from "@/lib/prisma";

function diasDesde(fechaEvento: Date) {
  const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const evStr = fechaEvento.toISOString().substring(0, 10);
  return Math.round((new Date(evStr).getTime() - new Date(hoyStr).getTime()) / 86400000);
}

type EventoItem = {
  key: string;
  nombre: string;
  cliente: string;
  fechaEvento: Date;
  sinProyecto: boolean;
};

export async function EventosWidget() {
  const ahora = new Date();
  const inicioDeHoy = new Date(
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }) + "T00:00:00.000-06:00"
  );
  const en30dias = new Date(ahora.getTime() + 30 * 86400000);
  const hace14dias = new Date(ahora.getTime() - 14 * 86400000);

  const [proyProximos, proyRecientes, tratosVC] = await Promise.all([
    // Proyectos próximos (30 días)
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
        fechaEvento: { gte: inicioDeHoy, lte: en30dias },
      },
      select: {
        id: true, nombre: true, fechaEvento: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 10,
    }),
    // Proyectos recientes (últimos 14 días)
    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: hace14dias, lt: inicioDeHoy },
        estado: { notIn: ["CANCELADO"] },
      },
      select: {
        id: true, nombre: true, fechaEvento: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaEvento: "desc" },
      take: 5,
    }),
    // Tratos con cotización aprobada sin proyecto aún (cualquier etapa)
    prisma.trato.findMany({
      where: {
        proyectos: { none: {} },
        cotizaciones: {
          some: {
            estado: "APROBADA",
            fechaEvento: { gte: inicioDeHoy, lte: en30dias, not: null },
          },
        },
      },
      select: {
        id: true,
        nombreEvento: true,
        cliente: { select: { nombre: true } },
        cotizaciones: {
          where: { estado: "APROBADA", fechaEvento: { gte: inicioDeHoy, not: null } },
          select: { fechaEvento: true },
          orderBy: { fechaEvento: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  // Construir lista de próximos unificada
  const proximosDesdeProyectos: EventoItem[] = proyProximos.map(p => ({
    key: `p-${p.id}`,
    nombre: p.nombre,
    cliente: p.cliente?.nombre ?? "",
    fechaEvento: p.fechaEvento,
    sinProyecto: false,
  }));

  const proximosDesdeTratos: EventoItem[] = tratosVC.flatMap(t =>
    t.cotizaciones
      .filter(c => c.fechaEvento)
      .map(c => ({
        key: `t-${t.id}`,
        nombre: t.nombreEvento ?? "Evento",
        cliente: t.cliente?.nombre ?? "",
        fechaEvento: c.fechaEvento!,
        sinProyecto: true,
      }))
  );

  const proximos: EventoItem[] = [...proximosDesdeProyectos, ...proximosDesdeTratos]
    .sort((a, b) => a.fechaEvento.getTime() - b.fechaEvento.getTime())
    .slice(0, 10);

  const recientes: EventoItem[] = proyRecientes.map(p => ({
    key: `p-${p.id}`,
    nombre: p.nombre,
    cliente: p.cliente?.nombre ?? "",
    fechaEvento: p.fechaEvento,
    sinProyecto: false,
  }));

  if (proximos.length === 0 && recientes.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1a1a1a]">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Eventos</p>
      </div>

      {/* Próximos 30 días */}
      {proximos.length > 0 && (
        <div>
          <p className="px-5 pt-3 pb-1 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
            Próximos 30 días
          </p>
          <div className="divide-y divide-[#141414]">
            {proximos.map(e => {
              const dias = diasDesde(e.fechaEvento);
              return (
                <div key={e.key} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-white text-sm font-medium truncate">{e.nombre}</p>
                      {e.sinProyecto && (
                        <span className="text-[10px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded shrink-0">
                          Sin proyecto
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{e.cliente}</p>
                  </div>
                  <span className={`shrink-0 ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                    dias === 0 ? "bg-red-900/40 text-red-300" :
                    dias <= 3  ? "bg-red-900/30 text-red-300" :
                    dias <= 7  ? "bg-yellow-900/40 text-yellow-300" :
                                 "bg-[#1e1e1e] text-gray-400"
                  }`}>
                    {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recientes (últimos 14 días) */}
      {recientes.length > 0 && (
        <div className={proximos.length > 0 ? "border-t border-[#1a1a1a]" : ""}>
          <p className="px-5 pt-3 pb-1 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
            Eventos recientes
          </p>
          <div className="divide-y divide-[#141414]">
            {recientes.map(e => {
              const dias = Math.abs(diasDesde(e.fechaEvento));
              return (
                <div key={e.key} className="flex items-center justify-between px-5 py-2.5 opacity-60">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-300 text-sm font-medium truncate">{e.nombre}</p>
                    <p className="text-gray-600 text-xs truncate">{e.cliente}</p>
                  </div>
                  <span className="shrink-0 ml-3 text-xs text-gray-600 px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                    Hace {dias === 0 ? "hoy" : dias === 1 ? "1 día" : `${dias} días`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
