import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from "@/lib/constants";

export default async function ProyectosPage() {
  const proyectos = await prisma.proyecto.findMany({
    include: {
      cliente: true,
      checklist: true,
      personal: true,
      trato: { select: { responsable: { select: { name: true } } } },
    },
    orderBy: { fechaEvento: "asc" },
  });

  const activos = proyectos.filter((p) =>
    ["PLANEACION", "CONFIRMADO", "EN_CURSO"].includes(p.estado)
  );
  const completados = proyectos.filter((p) => p.estado === "COMPLETADO");

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Proyectos</h1>
          <p className="text-[#6b7280] text-sm">{activos.length} activos · {completados.length} completados</p>
        </div>
      </div>

      {proyectos.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
          <p className="text-[#6b7280] text-sm">No hay proyectos aún</p>
          <p className="text-[#444] text-xs mt-1">Los proyectos se crean automáticamente al aprobar una cotización</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map((proyecto) => {
            const checklistTotal = proyecto.checklist.length;
            const checklistDone = proyecto.checklist.filter((c) => c.completado).length;
            const pct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
            const personalConfirmado = proyecto.personal.filter((p) => p.confirmado).length;
            const personalTotal = proyecto.personal.length;

            return (
              <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`}>
                <div className="bg-[#111] border border-[#1e1e1e] hover:border-[#333] rounded-xl p-5 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: TIPO_EVENTO_COLORS[proyecto.tipoEvento] ?? "#333" }}
                        />
                        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">
                          {TIPO_EVENTO_LABELS[proyecto.tipoEvento] ?? proyecto.tipoEvento}
                        </span>
                        <span className="text-[#333] text-[10px]">·</span>
                        <span className="text-[10px] text-[#555]">{proyecto.numeroProyecto}</span>
                      </div>
                      <h3 className="text-white font-medium">{proyecto.nombre}</h3>
                      <p className="text-[#6b7280] text-sm">{proyecto.cliente.nombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-sm font-medium">
                        {new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {proyecto.lugarEvento && (
                        <p className="text-[#6b7280] text-xs">{proyecto.lugarEvento}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1a1a1a]">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_PROYECTO_COLORS[proyecto.estado] ?? "bg-gray-800 text-gray-400"}`}>
                      {ESTADO_PROYECTO_LABELS[proyecto.estado] ?? proyecto.estado}
                    </span>

                    {checklistTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#B3985B] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#6b7280]">{pct}% checklist</span>
                      </div>
                    )}

                    {personalTotal > 0 && (
                      <span className="text-[10px] text-[#6b7280]">
                        Staff: {personalConfirmado}/{personalTotal}
                        {personalConfirmado < personalTotal && (
                          <span className="text-yellow-400 ml-1">⚠</span>
                        )}
                      </span>
                    )}

                    {proyecto.trato?.responsable && (
                      <span className="text-[10px] text-[#B3985B] ml-auto">
                        {proyecto.trato.responsable.name}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
