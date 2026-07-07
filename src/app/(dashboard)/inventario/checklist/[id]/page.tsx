"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { BackButton } from "@/components/BackButton";

interface EquipoInfo {
  id: string; descripcion: string; cantidadTotal: number; estado: string; imagenUrl: string | null;
}
interface Item {
  id: string; descripcion: string; categoria: string; estado: string; notas: string | null; orden: number;
  cantidadEsperada: number | null; cantidadContada: number | null;
  equipo: EquipoInfo | null;
}
interface Checklist {
  id: string; semana: string; fechaInicio: string; estado: string; notas: string | null; creadoPor: string | null;
  items: Item[];
}

type EstadoItem = "PENDIENTE" | "EN_BODEGA" | "EN_RENTA_O_USO" | "EXTRAVIADO" | "PERDIDO";

// Color semáforo basado en cantidad contada vs esperada
function colorSemaforo(item: Item): "green" | "orange" | "red" | "gray" {
  const esperada = item.cantidadEsperada ?? item.equipo?.cantidadTotal ?? 1;
  const contada = item.cantidadContada;
  if (contada === null || contada === undefined) {
    // Sin contar: usar estado manual
    if (item.estado === "EN_BODEGA") return "green";
    if (item.estado === "EN_RENTA_O_USO") return "orange";
    if (item.estado === "EXTRAVIADO" || item.estado === "PERDIDO") return "red";
    return "gray";
  }
  if (contada >= esperada) return "green";
  if (item.estado === "EN_RENTA_O_USO") return "orange";
  return "red";
}

const SEMAFORO_DOT: Record<string, string> = {
  green:  "bg-green-400",
  orange: "bg-orange-400",
  red:    "bg-red-500",
  gray:   "bg-gray-700",
};

const SEMAFORO_ROW: Record<string, string> = {
  green:  "",
  orange: "bg-orange-900/5",
  red:    "bg-red-900/5",
  gray:   "",
};

const ESTADOS_MANUAL: { value: EstadoItem; label: string; color: string }[] = [
  { value: "EN_BODEGA",      label: "En bodega",    color: "bg-green-900/50 text-green-300 border-green-800/40" },
  { value: "EN_RENTA_O_USO", label: "En renta/uso", color: "bg-orange-900/50 text-orange-300 border-orange-800/40" },
  { value: "EXTRAVIADO",     label: "Extraviado",   color: "bg-red-900/50 text-red-300 border-red-800/40" },
  { value: "PERDIDO",        label: "Perdido",      color: "bg-red-900/60 text-red-300 border-red-800/40" },
];

export default function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const confirm = useConfirm();
  const toast = useToast();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editNotas, setEditNotas] = useState<string | null>(null);
  const [notasVal, setNotasVal] = useState("");
  const [cantidadEdit, setCantidadEdit] = useState<Record<string, string>>({});

  async function load() {
    const r = await fetch(`/api/bodega/checklist/${id}`, { cache: "no-store" });
    const d = await r.json();
    setChecklist(d.checklist);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function patchItem(itemId: string, body: Record<string, unknown>) {
    setUpdating(itemId);
    const res = await fetch(`/api/bodega/checklist/${id}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setUpdating(null);
      return false;
    }
    await load();
    setUpdating(null);
    return true;
  }

  async function updateEstado(itemId: string, estado: EstadoItem, estadoActual: string) {
    const nuevoEstado = estadoActual === estado ? "PENDIENTE" : estado;
    if (nuevoEstado === "PERDIDO" && !await confirm({ message: "¿Marcar como PERDIDO?\n\nEsto actualizará el equipo en el inventario como perdido y lo quitará de disponibilidad.", danger: true, confirmText: "Marcar perdido" })) return;
    await patchItem(itemId, { estado: nuevoEstado });
  }

  async function saveCantidad(item: Item) {
    const raw = cantidadEdit[item.id];
    if (raw === undefined) return;
    const val = raw === "" ? null : parseInt(raw, 10);
    if (raw !== "" && (isNaN(val as number) || (val as number) < 0)) return;
    await patchItem(item.id, { cantidadContada: val });
    setCantidadEdit(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  }

  async function eliminarChecklist() {
    if (!await confirm({ message: "¿Eliminar este checklist? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/bodega/checklist/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar"); return; }
    window.location.href = "/inventario/checklist";
  }

  async function saveNotas(itemId: string) {
    const ok = await patchItem(itemId, { notas: notasVal });
    if (ok) setEditNotas(null);
  }

  if (loading || !checklist) return <div className="p-6 text-gray-600 text-sm">Cargando...</div>;

  const total      = checklist.items.length;
  const revisados  = checklist.items.filter(i => i.estado !== "PENDIENTE" || i.cantidadContada !== null).length;
  const verdes     = checklist.items.filter(i => colorSemaforo(i) === "green").length;
  const naranjas   = checklist.items.filter(i => colorSemaforo(i) === "orange").length;
  const rojos      = checklist.items.filter(i => colorSemaforo(i) === "red").length;
  const pct        = total > 0 ? Math.round((revisados / total) * 100) : 0;

  const categorias = [...new Set(checklist.items.map(i => i.categoria))].sort();
  const grupos = categorias.map(cat => ({
    cat,
    items: checklist.items.filter(i => i.categoria === cat).sort((a, b) => a.orden - b.orden),
  }));

  const _iso = typeof checklist.fechaInicio === "string" ? checklist.fechaInicio : (checklist.fechaInicio as Date).toISOString();
  const [_y, _m, _d] = _iso.substring(0, 10).split("-").map(Number);
  const _fecha = new Date(_y, _m - 1, _d);
  const fechaLabel = _fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="mb-2"><BackButton /></div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventario/checklist" className="text-gray-500 hover:text-white text-sm transition-colors">← Volver</Link>
          <button onClick={eliminarChecklist} className="text-gray-700 hover:text-red-400 text-xs transition-colors">Eliminar</button>
          <div>
            <h1 className="text-lg font-semibold text-white capitalize">{fechaLabel}</h1>
            <p className="text-gray-600 text-xs">Creado por {checklist.creadoPor ?? "—"}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white text-2xl font-bold">{pct}%</p>
          <p className="text-gray-600 text-xs">{revisados}/{total} revisados</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rojos > 0 ? "bg-red-500" : naranjas > 0 ? "bg-orange-500" : pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Completos",  value: verdes,   color: "text-green-400" },
          { label: "En renta",   value: naranjas,  color: naranjas > 0 ? "text-orange-400" : "text-gray-600" },
          { label: "Faltantes",  value: rojos,     color: rojos > 0 ? "text-red-400" : "text-gray-600" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {rojos > 0 && (
        <div className="bg-red-900/10 border border-red-900/30 rounded-xl px-5 py-3">
          <p className="text-red-400 text-sm font-semibold">⚠ {rojos} equipo{rojos > 1 ? "s" : ""} faltante{rojos > 1 ? "s" : ""} sin justificación — verificar</p>
        </div>
      )}
      {naranjas > 0 && rojos === 0 && (
        <div className="bg-orange-900/10 border border-orange-900/30 rounded-xl px-5 py-3">
          <p className="text-orange-400 text-sm">🟠 {naranjas} equipo{naranjas > 1 ? "s" : ""} fuera de bodega — marcado{naranjas > 1 ? "s" : ""} en renta/uso</p>
        </div>
      )}

      {/* Items por categoría */}
      {grupos.map(({ cat, items }) => {
        const catVerdes  = items.filter(i => colorSemaforo(i) === "green").length;
        const catRojos   = items.filter(i => colorSemaforo(i) === "red").length;
        const catNaranjas = items.filter(i => colorSemaforo(i) === "orange").length;
        return (
          <div key={cat} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{cat}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-600">{catVerdes}/{items.length}</span>
                {catRojos > 0 && <span className="text-red-400 font-semibold">⚠ {catRojos} faltante{catRojos > 1 ? "s" : ""}</span>}
                {catNaranjas > 0 && catRojos === 0 && <span className="text-orange-400">🟠 {catNaranjas} en renta</span>}
              </div>
            </div>

            <div className="divide-y divide-[#181818]">
              {items.map(item => {
                const semaforo = colorSemaforo(item);
                const esperada = item.cantidadEsperada ?? item.equipo?.cantidadTotal ?? 1;
                const contada  = item.cantidadContada;
                const editando = cantidadEdit[item.id] !== undefined;

                return (
                  <div key={item.id} className={`px-5 py-4 ${SEMAFORO_ROW[semaforo]}`}>
                    <div className="flex items-start gap-3">
                      {/* Dot semáforo */}
                      <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${SEMAFORO_DOT[semaforo]}`} />

                      {/* Miniatura del equipo */}
                      {item.equipo?.imagenUrl ? (
                        <img
                          src={item.equipo.imagenUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-contain bg-[#0d0d0d] border border-[#222] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] shrink-0 flex items-center justify-center text-[#2a2a2a]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                          </svg>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Nombre + contador */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="text-white text-sm font-medium">{item.descripcion}</p>

                          {/* Contador de cantidad */}
                          <div className="flex items-center gap-1 ml-auto shrink-0">
                            {editando ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={cantidadEdit[item.id]}
                                  onChange={e => setCantidadEdit(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") saveCantidad(item); if (e.key === "Escape") setCantidadEdit(prev => { const n = { ...prev }; delete n[item.id]; return n; }); }}
                                  autoFocus
                                  className="w-16 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-0.5 text-white text-xs text-center focus:outline-none focus:border-[#B3985B]"
                                />
                                <span className="text-gray-600 text-xs">/ {esperada}</span>
                                <button onClick={() => saveCantidad(item)} disabled={updating === item.id} className="text-[10px] text-[#B3985B] hover:text-white transition-colors">✓</button>
                                <button onClick={() => setCantidadEdit(prev => { const n = { ...prev }; delete n[item.id]; return n; })} className="text-[10px] text-gray-600 hover:text-white transition-colors">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setCantidadEdit(prev => ({ ...prev, [item.id]: contada !== null ? String(contada) : "" }))}
                                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                  semaforo === "green"  ? "bg-green-900/30 border-green-800/40 text-green-300 hover:bg-green-900/50" :
                                  semaforo === "orange" ? "bg-orange-900/30 border-orange-800/40 text-orange-300 hover:bg-orange-900/50" :
                                  semaforo === "red"    ? "bg-red-900/30 border-red-800/40 text-red-300 hover:bg-red-900/50" :
                                                          "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#333]"
                                }`}>
                                {contada !== null ? `${contada} / ${esperada}` : `— / ${esperada}`}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Botones de estado (para justificar faltantes) */}
                        <div className="flex gap-1.5 flex-wrap">
                          {ESTADOS_MANUAL.map(e => (
                            <button key={e.value}
                              onClick={() => updateEstado(item.id, e.value, item.estado)}
                              disabled={updating === item.id}
                              className={`text-[10px] px-2.5 py-1 rounded border font-semibold transition-all disabled:cursor-default ${
                                item.estado === e.value
                                  ? e.color + " opacity-100"
                                  : "bg-[#0d0d0d] border-[#222] text-gray-600 hover:text-white hover:border-[#333]"
                              }`}>
                              {e.label}
                            </button>
                          ))}
                        </div>

                        {/* Notas */}
                        {editNotas === item.id ? (
                          <div className="mt-2 flex gap-2">
                            <input
                              value={notasVal}
                              onChange={e => setNotasVal(e.target.value)}
                              placeholder="Observación..."
                              autoFocus
                              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                            />
                            <button onClick={() => saveNotas(item.id)} className="text-xs text-[#B3985B] hover:text-white transition-colors">Guardar</button>
                            <button onClick={() => setEditNotas(null)} className="text-xs text-gray-600 hover:text-white transition-colors">✕</button>
                          </div>
                        ) : (
                          <div className="mt-1.5 flex items-center gap-2">
                            {item.notas && <p className="text-gray-500 text-xs italic flex-1">{item.notas}</p>}
                            <button
                              onClick={() => { setEditNotas(item.id); setNotasVal(item.notas ?? ""); }}
                              className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors">
                              {item.notas ? "editar nota" : "+ nota"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {checklist.items.length === 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center">
          <p className="text-gray-600 text-sm">Sin equipos en el checklist</p>
          <p className="text-gray-700 text-xs mt-1">Agrega equipos propios al inventario para que aparezcan aquí</p>
        </div>
      )}
    </div>
  );
}
