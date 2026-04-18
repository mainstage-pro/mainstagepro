"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ChecklistResumen {
  id: string; semana: string; fechaInicio: string; estado: string;
  _count: { items: number };
  items: { estado: string }[];
}

const ESTADO_CHECKLIST: Record<string, string> = {
  EN_PROGRESO: "bg-blue-900/40 text-blue-300",
  COMPLETADO:  "bg-green-900/40 text-green-300",
  CON_ALERTAS: "bg-red-900/40 text-red-300",
};
const ESTADO_LABEL: Record<string, string> = {
  EN_PROGRESO: "En progreso", COMPLETADO: "Completado", CON_ALERTAS: "Con alertas",
};

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function fechaLabel(fechaInicio: string) {
  return new Date(fechaInicio).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function BodegaPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<ChecklistResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  async function load() {
    const r = await fetch("/api/bodega/checklist", { cache: "no-store" });
    const d = await r.json();
    setChecklists(d.checklists ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function crearSemana() {
    setCreando(true);
    const r = await fetch("/api/bodega/checklist", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    const d = await r.json();
    setCreando(false);
    if (d.checklist?.id) router.push(`/inventario/checklist/${d.checklist.id}`);
  }

  const semanaActual = isoWeek(new Date());
  const checklistSemana = checklists.find(c => c.semana === semanaActual);

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Checklist semanal de bodega</h1>
          <p className="text-[#6b7280] text-sm">Verificación del inventario propio · cada semana</p>
        </div>
      </div>

      {/* CTA semana actual */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Semana actual · {semanaActual}</p>
        {checklistSemana ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium capitalize">{fechaLabel(checklistSemana.fechaInicio)}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_CHECKLIST[checklistSemana.estado]}`}>
                  {ESTADO_LABEL[checklistSemana.estado]}
                </span>
                <span className="text-gray-600 text-xs">
                  {checklistSemana.items.filter(i => i.estado !== "PENDIENTE").length}/{checklistSemana._count.items} revisados
                </span>
              </div>
            </div>
            <button onClick={() => router.push(`/inventario/checklist/${checklistSemana.id}`)}
              className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Continuar →
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">No hay checklist para esta semana</p>
            <button onClick={crearSemana} disabled={creando}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {creando ? "Generando..." : "+ Nueva semana"}
            </button>
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Historial</p>
        {loading ? (
          <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
        ) : checklists.filter(c => c.semana !== semanaActual).length === 0 ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-10 text-center">
            <p className="text-gray-600 text-sm">Sin checklists anteriores</p>
          </div>
        ) : (
          <div className="space-y-2">
            {checklists.filter(c => c.semana !== semanaActual).map(c => {
              const revisados = c.items.filter(i => i.estado !== "PENDIENTE").length;
              const perdidos  = c.items.filter(i => i.estado === "PERDIDO").length;
              const extraviados = c.items.filter(i => i.estado === "EXTRAVIADO").length;
              const pct = c._count.items > 0 ? Math.round((revisados / c._count.items) * 100) : 0;
              return (
                <button key={c.id} onClick={() => router.push(`/inventario/checklist/${c.id}`)}
                  className="w-full bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-5 py-4 text-left flex items-center gap-4 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white text-sm font-medium">{fechaLabel(c.fechaInicio)}</p>
                      <span className="text-gray-700 text-[10px]">{c.semana}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_CHECKLIST[c.estado]}`}>
                        {ESTADO_LABEL[c.estado]}
                      </span>
                      <span className="text-gray-600 text-xs">{revisados}/{c._count.items} · {pct}%</span>
                      {perdidos > 0 && <span className="text-red-400 text-xs font-semibold">{perdidos} perdido{perdidos > 1 ? "s" : ""}</span>}
                      {extraviados > 0 && <span className="text-orange-400 text-xs">{extraviados} extraviado{extraviados > 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <span className="text-gray-700 group-hover:text-[#B3985B] text-sm transition-colors">→</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
