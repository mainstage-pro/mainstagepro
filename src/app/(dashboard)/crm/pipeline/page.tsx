"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from "@/lib/constants";
import { SERVICIO_LABELS } from "@/lib/form-labels";

const COLUMNAS = [
  { etapa: "DESCUBRIMIENTO", label: "Descubrimiento", color: "border-blue-800", badge: "bg-blue-900/20 text-blue-400" },
  { etapa: "OPORTUNIDAD",    label: "Oportunidad",    color: "border-yellow-700", badge: "bg-yellow-900/20 text-yellow-400" },
  { etapa: "VENTA_CERRADA",  label: "Venta Cerrada",  color: "border-green-800", badge: "bg-green-900/20 text-green-400" },
];

const ETAPA_ORDER = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA"];

type Trato = {
  id: string; etapa: string; tipoEvento: string; tipoServicio: string | null;
  nombreEvento: string | null; fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null; fechaProximaAccion: string | null;
  cliente: { nombre: string; empresa: string | null };
  responsable: { name: string } | null;
};

export default function PipelinePage() {
  const [tratos, setTratos] = useState<Trato[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tratos", { cache: "no-store" });
    const d = await res.json();
    setTratos((d.tratos ?? []).filter((t: Trato) => ["DESCUBRIMIENTO","OPORTUNIDAD","VENTA_CERRADA"].includes(t.etapa)));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moverEtapa(id: string, etapa: string) {
    setMoving(id);
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });
    if (res.ok) {
      setTratos(prev => prev.map(t => t.id === id ? { ...t, etapa } : t));
    } else {
      await load();
    }
    setMoving(null);
  }

  const totalPipeline = tratos.length;
  const totalValor = tratos.reduce((s, t) => s + (t.presupuestoEstimado ?? 0), 0);
  const vencidos = tratos.filter(t => t.fechaProximaAccion && new Date(t.fechaProximaAccion) < new Date()).length;

  return (
    <div className="p-3 md:p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipeline Comercial</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[#6b7280] text-sm">{totalPipeline} tratos activos</p>
            {totalValor > 0 && <p className="text-[#B3985B] text-sm">${totalValor.toLocaleString("es-MX")} en pipeline</p>}
            {vencidos > 0 && <p className="text-red-400 text-xs">⚠ {vencidos} seguimiento{vencidos !== 1 ? "s" : ""} vencido{vencidos !== 1 ? "s" : ""}</p>}
          </div>
        </div>
        <Link href="/crm/tratos/nuevo" className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          + Nuevo trato
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Cargando pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          {COLUMNAS.map(({ etapa, label, color, badge }) => {
            const columnaTratos = tratos.filter(t => t.etapa === etapa);
            const etapaIdx = ETAPA_ORDER.indexOf(etapa);
            const prev = etapaIdx > 0 ? ETAPA_ORDER[etapaIdx - 1] : null;
            const next = etapaIdx < ETAPA_ORDER.length - 1 ? ETAPA_ORDER[etapaIdx + 1] : null;
            const columnaValor = columnaTratos.reduce((s, t) => s + (t.presupuestoEstimado ?? 0), 0);

            return (
              <div key={etapa} className="flex flex-col min-h-0">
                {/* Header columna */}
                <div className={`flex items-center justify-between px-4 py-2.5 bg-[#111] rounded-t-lg border-t-2 ${color} border-x border-[#1e1e1e]`}>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{columnaTratos.length}</span>
                  </div>
                  {columnaValor > 0 && <span className="text-[#B3985B] text-[10px]">${columnaValor.toLocaleString("es-MX")}</span>}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto bg-[#0d0d0d] border border-t-0 border-[#1e1e1e] rounded-b-lg p-2 space-y-2">
                  {columnaTratos.map(trato => {
                    const vencido = trato.fechaProximaAccion && new Date(trato.fechaProximaAccion) < new Date();
                    const isMoving = moving === trato.id;
                    return (
                      <div key={trato.id} className={`bg-[#111] border rounded-lg overflow-hidden transition-all ${vencido ? "border-yellow-800/60" : "border-[#1e1e1e] hover:border-[#333]"} ${isMoving ? "opacity-50" : ""}`}>
                        <Link href={`/crm/tratos/${trato.id}`} className="block px-3 py-2 space-y-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_EVENTO_COLORS[trato.tipoEvento] ?? "#333" }} />
                            <span className="text-white text-xs font-medium truncate flex-1">{trato.cliente.nombre}</span>
                            {trato.presupuestoEstimado && (
                              <span className="text-[#B3985B] text-[10px] font-medium shrink-0">${trato.presupuestoEstimado.toLocaleString("es-MX")}</span>
                            )}
                          </div>
                          {trato.nombreEvento && (
                            <p className="text-[#6b7280] text-[10px] truncate pl-3">{trato.nombreEvento}</p>
                          )}
                          <div className="flex items-center gap-1 pl-3">
                            <span className="text-[#444] text-[10px] truncate flex-1">
                              {TIPO_EVENTO_LABELS[trato.tipoEvento] ?? trato.tipoEvento}
                              {trato.tipoServicio && <> · {SERVICIO_LABELS[trato.tipoServicio] ?? trato.tipoServicio}</>}
                            </span>
                            {trato.fechaEventoEstimada && (
                              <span className="text-[#555] text-[10px] shrink-0">
                                {new Date(trato.fechaEventoEstimada).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          {trato.responsable && (
                            <p className="text-[#555] text-[10px] pl-3 truncate">{trato.responsable.name}</p>
                          )}
                          {vencido && (
                            <p className="text-yellow-500 text-[10px] pl-3">⚠ Seguimiento vencido</p>
                          )}
                        </Link>
                        {/* Botones de mover */}
                        <div className="flex border-t border-[#1a1a1a]">
                          {prev && (
                            <button
                              onClick={() => moverEtapa(trato.id, prev)}
                              disabled={isMoving}
                              className="flex-1 text-[10px] text-gray-600 hover:text-white hover:bg-[#1a1a1a] py-1.5 transition-colors border-r border-[#1a1a1a]"
                            >
                              ← {COLUMNAS.find(c => c.etapa === prev)?.label}
                            </button>
                          )}
                          {next && (
                            <button
                              onClick={() => moverEtapa(trato.id, next)}
                              disabled={isMoving}
                              className="flex-1 text-[10px] text-gray-600 hover:text-[#B3985B] hover:bg-[#1a1a1a] py-1.5 transition-colors"
                            >
                              {COLUMNAS.find(c => c.etapa === next)?.label} →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
      )}
    </div>
  );
}
