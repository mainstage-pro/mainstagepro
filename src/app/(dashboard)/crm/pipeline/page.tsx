import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from "@/lib/constants";
import { SERVICIO_LABELS } from "@/lib/form-labels";

const COLUMNAS = [
  { etapa: "DESCUBRIMIENTO", label: "Descubrimiento", color: "border-blue-800" },
  { etapa: "OPORTUNIDAD", label: "Oportunidad", color: "border-yellow-700" },
  { etapa: "VENTA_CERRADA", label: "Venta Cerrada", color: "border-green-800" },
];

export default async function PipelinePage() {
  const tratos = await prisma.trato.findMany({
    where: { etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA"] } },
    select: { id: true, etapa: true, tipoEvento: true, tipoServicio: true, nombreEvento: true, fechaEventoEstimada: true, origenLead: true, presupuestoEstimado: true, fechaProximaAccion: true, cliente: { select: { nombre: true, empresa: true } }, responsable: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipeline Comercial</h1>
          <p className="text-[#6b7280] text-sm">{tratos.length} tratos activos</p>
        </div>
        <Link
          href="/crm/tratos/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          + Nuevo trato
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
        {COLUMNAS.map(({ etapa, label, color }) => {
          const columnaTratos = tratos.filter((t) => t.etapa === etapa);
          return (
            <div key={etapa} className="flex flex-col">
              {/* Header columna */}
              <div className={`flex items-center justify-between px-4 py-2.5 bg-[#111] rounded-t-lg border-t-2 ${color} border-x border-[#1e1e1e]`}>
                <span className="text-white text-sm font-medium">{label}</span>
                <span className="text-[#6b7280] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                  {columnaTratos.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto bg-[#0d0d0d] border border-t-0 border-[#1e1e1e] rounded-b-lg p-2 space-y-2">
                {columnaTratos.map((trato) => (
                  <Link key={trato.id} href={`/crm/tratos/${trato.id}`}>
                    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 hover:border-[#333] transition-colors cursor-pointer space-y-1">
                      {/* Fila 1: punto + cliente + presupuesto */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_EVENTO_COLORS[trato.tipoEvento] ?? "#333" }} />
                        <span className="text-white text-xs font-medium truncate flex-1">{trato.cliente.nombre}</span>
                        {trato.presupuestoEstimado && (
                          <span className="text-[#B3985B] text-[10px] font-medium shrink-0">${trato.presupuestoEstimado.toLocaleString("es-MX")}</span>
                        )}
                      </div>
                      {/* Fila 2: nombre del evento */}
                      {trato.nombreEvento && (
                        <p className="text-[#6b7280] text-[10px] truncate pl-3">{trato.nombreEvento}</p>
                      )}
                      {/* Fila 3: tipo evento · servicio | fecha evento */}
                      <div className="flex items-center gap-1 pl-3">
                        <span className="text-[#444] text-[10px] truncate flex-1">
                          {TIPO_EVENTO_LABELS[trato.tipoEvento] ?? trato.tipoEvento}
                          {trato.tipoServicio && <> · {SERVICIO_LABELS[trato.tipoServicio] ?? trato.tipoServicio}</>}
                        </span>
                        {trato.fechaEventoEstimada && (
                          <span className="text-[#555] text-[10px] shrink-0">
                            {new Date(trato.fechaEventoEstimada).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}

                {columnaTratos.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[#333] text-xs">Sin tratos</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
