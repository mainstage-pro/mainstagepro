import { prisma } from "@/lib/prisma";
import Link from "next/link";

const ESTADO_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/60 border-l-2 border-blue-500 text-blue-200",
  CONFIRMADO: "bg-green-900/60 border-l-2 border-green-500 text-green-200",
  EN_CURSO:   "bg-yellow-900/60 border-l-2 border-yellow-500 text-yellow-200",
  COMPLETADO: "bg-[#1e1e1e] border-l-2 border-gray-600 text-gray-400",
  CANCELADO:  "bg-red-900/30 border-l-2 border-red-700 text-red-400",
};

function getCalendario(year: number, month: number) {
  const primerDia = new Date(year, month, 1).getDay(); // 0=dom
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  // Ajustar para que semana inicie lunes
  const offset = primerDia === 0 ? 6 : primerDia - 1;
  return { offset, diasEnMes };
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  let year = ahora.getFullYear();
  let month = ahora.getMonth();

  if (sp.mes) {
    const [y, m] = sp.mes.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
  }

  const inicioRango = new Date(year, month, 1);
  const finRango    = new Date(year, month + 1, 0, 23, 59, 59);

  const proyectos = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: inicioRango, lte: finRango },
      estado: { not: "CANCELADO" },
    },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaEvento: "asc" },
  });

  // También los de montaje en el mismo mes
  const montajes = await prisma.proyecto.findMany({
    where: {
      fechaMontaje: { gte: inicioRango, lte: finRango },
      estado: { not: "CANCELADO" },
    },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fechaMontaje: "asc" },
  });

  // Agrupar por día
  const eventosPorDia: Record<number, { id: string; nombre: string; cliente: string; estado: string; esMontaje?: boolean }[]> = {};
  for (const p of proyectos) {
    const dia = new Date(p.fechaEvento).getDate();
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push({ id: p.id, nombre: p.nombre, cliente: p.cliente.nombre, estado: p.estado });
  }
  for (const p of montajes) {
    if (!p.fechaMontaje) continue;
    const dia = new Date(p.fechaMontaje).getDate();
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    // No duplicar si ya está el evento
    const yaTiene = eventosPorDia[dia].some(e => e.id === p.id && !e.esMontaje);
    if (!yaTiene) {
      eventosPorDia[dia].push({ id: p.id, nombre: `[Montaje] ${p.nombre}`, cliente: p.cliente.nombre, estado: p.estado, esMontaje: true });
    }
  }

  const { offset, diasEnMes } = getCalendario(year, month);
  const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;

  // Navegación mes previo/siguiente
  const mesActual = `${year}-${String(month + 1).padStart(2, "0")}`;
  const mesPrev = month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
  const mesSig  = month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, "0")}`;
  const esMesActual = year === ahora.getFullYear() && month === ahora.getMonth();
  const nombreMes = new Date(year, month, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white capitalize">{nombreMes}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{proyectos.length} evento{proyectos.length !== 1 ? "s" : ""} este mes</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendario?mes=${mesPrev}`}
            className="bg-[#111] border border-[#222] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
            ← Anterior
          </Link>
          {!esMesActual && (
            <Link href="/calendario"
              className="bg-[#1a1a1a] border border-[#333] text-[#B3985B] px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[#222]">
              Hoy
            </Link>
          )}
          <Link href={`/calendario?mes=${mesSig}`}
            className="bg-[#111] border border-[#222] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
            Siguiente →
          </Link>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: "Planeación", color: "bg-blue-500" },
          { label: "Confirmado", color: "bg-green-500" },
          { label: "En curso",   color: "bg-yellow-500" },
          { label: "Completado", color: "bg-gray-600" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-gray-500 text-xs">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#B3985B]" />
          <span className="text-gray-500 text-xs">Montaje</span>
        </div>
      </div>

      {/* Grilla del mes */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        {/* Encabezado días */}
        <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCeldas }).map((_, i) => {
            const dia = i - offset + 1;
            const esValido = dia >= 1 && dia <= diasEnMes;
            const esHoy = esValido && esMesActual && dia === ahora.getDate();
            const eventos = esValido ? (eventosPorDia[dia] ?? []) : [];
            const semana = Math.floor(i / 7);
            const maxSemanas = Math.ceil(totalCeldas / 7);

            return (
              <div key={i}
                className={`min-h-[100px] p-1.5 border-b border-r border-[#1a1a1a] last:border-r-0
                  ${!esValido ? "bg-[#0d0d0d]" : ""}
                  ${semana === maxSemanas - 1 ? "border-b-0" : ""}
                  ${i % 7 === 6 ? "border-r-0" : ""}
                `}>
                {esValido && (
                  <>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 mx-auto
                      ${esHoy ? "bg-[#B3985B] text-black font-bold" : "text-gray-500 hover:text-white"}`}>
                      {dia}
                    </div>
                    <div className="space-y-0.5">
                      {eventos.map(e => (
                        <Link key={`${e.id}-${e.esMontaje}`} href={`/proyectos/${e.id}`}
                          className={`block px-1.5 py-0.5 rounded text-[10px] truncate leading-tight
                            hover:opacity-80 transition-opacity
                            ${e.esMontaje ? "bg-[#B3985B]/20 border-l-2 border-[#B3985B] text-[#B3985B]" : ESTADO_COLORS[e.estado] ?? "bg-[#222] text-gray-400"}`}
                          title={`${e.nombre} — ${e.cliente}`}>
                          <span className="font-medium">{e.nombre}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de eventos del mes */}
      {proyectos.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Agenda del mes</p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {proyectos.map(p => {
              const dias = Math.ceil((new Date(p.fechaEvento).getTime() - ahora.getTime()) / 86400000);
              return (
                <Link key={p.id} href={`/proyectos/${p.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-12 shrink-0">
                      <p className="text-[#B3985B] text-lg font-bold leading-none">
                        {new Date(p.fechaEvento).getDate()}
                      </p>
                      <p className="text-gray-600 text-[10px] uppercase">
                        {new Date(p.fechaEvento).toLocaleDateString("es-MX", { weekday: "short" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.nombre}</p>
                      <p className="text-gray-500 text-xs">{p.cliente.nombre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.estado === "CONFIRMADO" ? "bg-green-900/50 text-green-300" :
                      p.estado === "EN_CURSO"   ? "bg-yellow-900/50 text-yellow-300" :
                      p.estado === "PLANEACION" ? "bg-blue-900/50 text-blue-300" :
                      "bg-[#222] text-gray-400"
                    }`}>{p.estado.replace(/_/g, " ")}</span>
                    {dias >= 0 && (
                      <span className={`text-xs font-medium ${
                        dias === 0 ? "text-[#B3985B]" :
                        dias <= 3 ? "text-red-400" :
                        dias <= 7 ? "text-yellow-400" :
                        "text-gray-500"
                      }`}>
                        {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`}
                      </span>
                    )}
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
