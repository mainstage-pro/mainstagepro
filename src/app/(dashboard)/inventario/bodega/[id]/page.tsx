"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Item {
  id: string; descripcion: string; categoria: string; estado: string; notas: string | null; orden: number;
  equipo: { descripcion: string } | null;
}
interface Checklist {
  id: string; semana: string; fechaInicio: string; estado: string; notas: string | null;
  items: Item[];
}

const ESTADOS_ITEM = ["PENDIENTE", "OK", "FALTA", "DAÑADO", "EN_REPARACION"] as const;
const ESTADO_ITEM_COLORS: Record<string, string> = {
  PENDIENTE:      "bg-[#222] text-gray-500",
  OK:             "bg-green-900/50 text-green-300",
  FALTA:          "bg-red-900/50 text-red-300",
  DAÑADO:         "bg-orange-900/50 text-orange-300",
  EN_REPARACION:  "bg-yellow-900/50 text-yellow-300",
};
const CATEGORIAS_ORDER = ["AUDIO", "ILUMINACION", "VIDEO", "CABLES", "HERRAMIENTAS", "TRANSPORTES", "GENERAL"];

export default function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notasItem, setNotasItem] = useState<Record<string, string>>({});
  const [editNotas, setEditNotas] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/bodega/checklist/${id}`);
    const d = await r.json();
    setChecklist(d.checklist);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateItem(itemId: string, estado: string) {
    setUpdating(itemId);
    await fetch(`/api/bodega/checklist/${id}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    await load();
    setUpdating(null);
  }

  async function saveNotas(itemId: string) {
    await fetch(`/api/bodega/checklist/${id}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: notasItem[itemId] ?? "" }),
    });
    setEditNotas(null);
    await load();
  }

  if (loading || !checklist) return <div className="p-3 md:p-6 text-gray-600 text-sm">Cargando...</div>;

  const itemsPorCategoria = CATEGORIAS_ORDER.map(cat => ({
    cat,
    items: checklist.items.filter(i => i.categoria === cat),
  })).filter(g => g.items.length > 0);

  // Categorías no en el orden estándar
  const otrasCategs = [...new Set(checklist.items.map(i => i.categoria))].filter(c => !CATEGORIAS_ORDER.includes(c));
  otrasCategs.forEach(cat => itemsPorCategoria.push({ cat, items: checklist.items.filter(i => i.categoria === cat) }));

  const total   = checklist.items.length;
  const ok      = checklist.items.filter(i => i.estado === "OK").length;
  const alertas = checklist.items.filter(i => i.estado === "FALTA" || i.estado === "DAÑADO").length;
  const pct     = total > 0 ? Math.round((checklist.items.filter(i => i.estado !== "PENDIENTE").length / total) * 100) : 0;

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventario/bodega" className="text-gray-500 hover:text-white text-sm transition-colors">← Volver</Link>
          <div>
            <h1 className="text-xl font-semibold text-white">{checklist.semana}</h1>
            <p className="text-gray-500 text-sm">{new Date(checklist.fechaInicio).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white text-lg font-bold">{pct}%</p>
          <p className="text-gray-500 text-xs">{ok}/{total} revisados{alertas > 0 ? ` · ` : ""}{alertas > 0 && <span className="text-red-400">{alertas} alertas</span>}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${alertas > 0 ? "bg-red-500" : pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Items por categoría */}
      {itemsPorCategoria.map(({ cat, items }) => (
        <div key={cat} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{cat}</p>
            <p className="text-gray-600 text-xs">
              {items.filter(i => i.estado === "OK").length}/{items.length} OK
              {items.some(i => i.estado === "FALTA" || i.estado === "DAÑADO") && (
                <span className="text-red-400 ml-2">⚠ alertas</span>
              )}
            </p>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {items.map(item => (
              <div key={item.id} className={`px-5 py-3 ${item.estado === "FALTA" || item.estado === "DAÑADO" ? "bg-red-900/10" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{item.descripcion}</p>
                    {item.equipo && <p className="text-gray-500 text-xs">{item.equipo.descripcion}</p>}
                    {item.notas && editNotas !== item.id && (
                      <p className="text-gray-500 text-xs mt-0.5 italic">{item.notas}</p>
                    )}
                  </div>
                  {/* Botones de estado */}
                  <div className="flex gap-1 flex-wrap justify-end">
                    {ESTADOS_ITEM.filter(e => e !== "PENDIENTE").map(e => (
                      <button key={e} onClick={() => updateItem(item.id, e)} disabled={updating === item.id}
                        className={`text-[10px] px-2 py-1 rounded font-semibold transition-all ${item.estado === e ? ESTADO_ITEM_COLORS[e] : "bg-[#1a1a1a] text-gray-600 hover:text-white hover:bg-[#222]"}`}>
                        {e === "EN_REPARACION" ? "Reparac." : e}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setEditNotas(item.id); setNotasItem(p => ({ ...p, [item.id]: item.notas ?? "" })); }}
                    className="text-gray-600 hover:text-gray-400 text-xs transition-colors shrink-0">nota</button>
                </div>
                {editNotas === item.id && (
                  <div className="mt-2 flex gap-2">
                    <input value={notasItem[item.id] ?? ""} onChange={e => setNotasItem(p => ({ ...p, [item.id]: e.target.value }))}
                      placeholder="Observación..."
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    <button onClick={() => saveNotas(item.id)} className="text-xs text-[#B3985B] hover:text-white transition-colors">Guardar</button>
                    <button onClick={() => setEditNotas(null)} className="text-xs text-gray-600 hover:text-white transition-colors">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {checklist.items.length === 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl py-12 text-center">
          <p className="text-gray-600 text-sm">Sin items en este checklist</p>
          <Link href="/inventario/bodega/templates" className="text-[#B3985B] text-xs hover:underline">Configura el catálogo de items →</Link>
        </div>
      )}
    </div>
  );
}
