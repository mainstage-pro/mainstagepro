"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ChecklistResumen {
  id: string; semana: string; fechaInicio: string; estado: string; notas: string | null; creadoPor: string | null;
  _count: { items: number };
  items: { estado: string }[];
}

const ESTADO_COLORS: Record<string, string> = {
  EN_PROGRESO: "bg-blue-900/50 text-blue-300",
  COMPLETADO:  "bg-green-900/50 text-green-300",
  CON_ALERTAS: "bg-red-900/50 text-red-300",
};

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export default function BodegaPage() {
  const [checklists, setChecklists] = useState<ChecklistResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [noTemplates, setNoTemplates] = useState(false);

  async function load() {
    const r = await fetch("/api/bodega/checklist");
    const d = await r.json();
    setChecklists(d.checklists ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function crearSemana() {
    setCreando(true);
    const r = await fetch("/api/bodega/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const d = await r.json();
    if (r.status === 409) { alert("Ya existe un checklist para esta semana"); }
    else if (d.checklist?.items?.length === 0) { setNoTemplates(true); }
    await load();
    setCreando(false);
  }

  const semanaActual = isoWeek(new Date());
  const tieneActual = checklists.some(c => c.semana === semanaActual);

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Checklist de Bodega</h1>
          <p className="text-[#6b7280] text-sm">Semana actual: {semanaActual}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventario/bodega/templates"
            className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
            Catálogo items
          </Link>
          {!tieneActual && (
            <button onClick={crearSemana} disabled={creando}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
              {creando ? "Creando..." : "Nueva semana"}
            </button>
          )}
        </div>
      </div>

      {noTemplates && (
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-5 py-4">
          <p className="text-yellow-300 text-sm font-medium">El checklist se creó pero sin items</p>
          <p className="text-yellow-400/70 text-xs mt-1">Agrega items al <Link href="/inventario/bodega/templates" className="underline">catálogo</Link> para que se pueblen automáticamente cada semana.</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : checklists.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-gray-600 text-sm">Sin checklists registrados</p>
          <p className="text-gray-700 text-xs mt-1">Primero configura el <Link href="/inventario/bodega/templates" className="text-[#B3985B] hover:underline">catálogo de items</Link></p>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map(c => {
            const ok      = c.items.filter(i => i.estado === "OK").length;
            const alertas = c.items.filter(i => i.estado === "FALTA" || i.estado === "DAÑADO").length;
            const total   = c._count.items;
            const pct     = total > 0 ? Math.round((c.items.filter(i => i.estado !== "PENDIENTE").length / total) * 100) : 0;
            return (
              <Link key={c.id} href={`/inventario/bodega/${c.id}`}
                className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4 hover:bg-[#141414] transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-semibold">{c.semana}</p>
                      {c.semana === semanaActual && <span className="text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-1.5 py-0.5 rounded font-semibold">Esta semana</span>}
                    </div>
                    <p className="text-gray-500 text-xs">{new Date(c.fechaInicio).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {c.creadoPor ?? "Sistema"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white text-sm">{ok}/{total} <span className="text-gray-500 text-xs">revisados</span></p>
                    {alertas > 0 && <p className="text-red-400 text-xs">{alertas} alerta{alertas !== 1 ? "s" : ""}</p>}
                  </div>
                  <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${alertas > 0 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[c.estado] ?? "bg-gray-800 text-gray-400"}`}>
                    {c.estado.replace("_", " ")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
