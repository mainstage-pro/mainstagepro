import { prisma } from "@/lib/prisma";

function formatFechaCorta(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });
}

function diasDesde(fechaEvento: Date) {
  const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const evStr = fechaEvento.toISOString().substring(0, 10);
  return Math.round((new Date(evStr).getTime() - new Date(hoyStr).getTime()) / 86400000);
}

export async function EventosWidget() {
  const ahora = new Date();
  const inicioDeHoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }) + "T00:00:00.000-06:00");
  const en30dias = new Date(ahora.getTime() + 30 * 86400000);
  const hace14dias = new Date(ahora.getTime() - 14 * 86400000);

  const [proximos, recientes] = await Promise.all([
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
        fechaEvento: { gte: inicioDeHoy, lte: en30dias },
      },
      select: {
        id: true, nombre: true, fechaEvento: true, estado: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 8,
    }),
    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: hace14dias, lt: inicioDeHoy },
        estado: { notIn: ["CANCELADO"] },
      },
      select: {
        id: true, nombre: true, fechaEvento: true, estado: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaEvento: "desc" },
      take: 5,
    }),
  ]);

  if (proximos.length === 0 && recientes.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1a1a1a]">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Eventos</p>
      </div>

      {/* Próximos */}
      {proximos.length > 0 && (
        <div>
          <p className="px-5 pt-3 pb-1 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Próximos 30 días</p>
          <div className="divide-y divide-[#141414]">
            {proximos.map(e => {
              const dias = diasDesde(e.fechaEvento);
              return (
                <div key={e.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{e.nombre}</p>
                    <p className="text-gray-500 text-xs truncate">{e.cliente?.nombre}</p>
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

      {/* Recientes / pasados */}
      {recientes.length > 0 && (
        <div className={proximos.length > 0 ? "border-t border-[#1a1a1a]" : ""}>
          <p className="px-5 pt-3 pb-1 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Eventos recientes</p>
          <div className="divide-y divide-[#141414]">
            {recientes.map(e => {
              const dias = Math.abs(diasDesde(e.fechaEvento));
              return (
                <div key={e.id} className="flex items-center justify-between px-5 py-2.5 opacity-60">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-300 text-sm font-medium truncate">{e.nombre}</p>
                    <p className="text-gray-600 text-xs truncate">{e.cliente?.nombre}</p>
                  </div>
                  <span className="shrink-0 ml-3 text-xs text-gray-600 px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                    Hace {dias === 0 ? 'hoy' : dias === 1 ? '1 día' : `${dias} días`}
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
