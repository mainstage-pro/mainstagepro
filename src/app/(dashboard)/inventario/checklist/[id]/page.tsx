"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";

interface EquipoInfo {
  id: string; descripcion: string; cantidadTotal: number; estado: string;
}
interface Item {
  id: string; descripcion: string; categoria: string; estado: string; notas: string | null; orden: number;
  equipo: EquipoInfo | null;
}
interface Checklist {
  id: string; semana: string; fechaInicio: string; estado: string; notas: string | null; creadoPor: string | null;
  items: Item[];
}

type EstadoItem = "PENDIENTE" | "EN_BODEGA" | "EN_RENTA_O_USO" | "EXTRAVIADO" | "PERDIDO";

const ESTADOS: { value: EstadoItem; label: string; color: string; dot: string }[] = [
  { value: "EN_BODEGA",     label: "En bodega",    color: "bg-green-900/50 text-green-300 border-green-800/40",   dot: "bg-green-400" },
  { value: "EN_RENTA_O_USO",label: "En renta/uso", color: "bg-blue-900/50 text-blue-300 border-blue-800/40",     dot: "bg-blue-400" },
  { value: "EXTRAVIADO",    label: "Extraviado",   color: "bg-orange-900/50 text-orange-300 border-orange-800/40", dot: "bg-orange-400" },
  { value: "PERDIDO",       label: "Perdido",      color: "bg-red-900/60 text-red-300 border-red-800/40",         dot: "bg-red-500" },
];

const ESTADO_CURRENT: Record<string, string> = {
  PENDIENTE:      "bg-[#1a1a1a] text-gray-600",
  EN_BODEGA:      "bg-green-900/50 text-green-300",
  EN_RENTA_O_USO: "bg-blue-900/50 text-blue-300",
  EXTRAVIADO:     "bg-orange-900/50 text-orange-300",
  PERDIDO:        "bg-red-900/60 text-red-300",
};

export default function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const confirm = useConfirm();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editNotas, setEditNotas] = useState<string | null>(null);
  const [notasVal, setNotasVal] = useState("");

  async function load() {
    const r = await fetch(`/api/bodega/checklist/${id}`);
    const d = await r.json();
    setChecklist(d.checklist);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateEstado(itemId: string, estado: EstadoItem, estadoActual: string) {
    // Clic en el estado activo → deseleccionar (volver a PENDIENTE)
    const nuevoEstado = estadoActual === estado ? "PENDIENTE" : estado;
    if (nuevoEstado === "PERDIDO" && !await confirm({ message: "¿Marcar como PERDIDO?\n\nEsto actualizará el equipo en el inventario como perdido y lo quitará de disponibilidad.", danger: true, confirmText: "Marcar perdido" })) return;
    setUpdating(itemId);
    await fetch(`/api/bodega/checklist/${id}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    await load();
    setUpdating(null);
  }

  async function eliminarChecklist() {
    if (!await confirm({ message: "¿Eliminar este checklist? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/bodega/checklist/${id}`, { method: "DELETE" });
    window.location.href = "/inventario/checklist";
  }

  async function saveNotas(itemId: string) {
    await fetch(`/api/bodega/checklist/${id}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: notasVal }),
    });
    setEditNotas(null);
    await load();
  }

  if (loading || !checklist) return <div className="p-6 text-gray-600 text-sm">Cargando...</div>;

  const total     = checklist.items.length;
  const revisados = checklist.items.filter(i => i.estado !== "PENDIENTE").length;
  const enBodega  = checklist.items.filter(i => i.estado === "EN_BODEGA").length;
  const extraviados = checklist.items.filter(i => i.estado === "EXTRAVIADO").length;
  const perdidos  = checklist.items.filter(i => i.estado === "PERDIDO").length;
  const pct       = total > 0 ? Math.round((revisados / total) * 100) : 0;

  // Agrupar por categoría
  const categorias = [...new Set(checklist.items.map(i => i.categoria))].sort();
  const grupos = categorias.map(cat => ({
    cat,
    items: checklist.items.filter(i => i.categoria === cat).sort((a, b) => a.orden - b.orden),
  }));

  const fechaLabel = new Date(checklist.fechaInicio).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const fechaCorta = new Date(checklist.fechaInicio).toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-5">
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
          className={`h-full rounded-full transition-all ${perdidos > 0 ? "bg-red-500" : extraviados > 0 ? "bg-orange-500" : pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "En bodega",    value: enBodega,    color: "text-green-400" },
          { label: "En renta/uso", value: checklist.items.filter(i => i.estado === "EN_RENTA_O_USO").length, color: "text-blue-400" },
          { label: "Extraviados",  value: extraviados, color: extraviados > 0 ? "text-orange-400" : "text-gray-600" },
          { label: "Perdidos",     value: perdidos,    color: perdidos > 0 ? "text-red-400" : "text-gray-600" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {(extraviados > 0 || perdidos > 0) && (
        <div className="bg-red-900/10 border border-red-900/30 rounded-xl px-5 py-3 space-y-1">
          {perdidos > 0 && (
            <p className="text-red-400 text-sm font-semibold">⚠ {perdidos} equipo{perdidos > 1 ? "s" : ""} marcado{perdidos > 1 ? "s" : ""} como PERDIDO — ya se actualizó en inventario</p>
          )}
          {extraviados > 0 && (
            <p className="text-orange-400 text-sm">⚠ {extraviados} equipo{extraviados > 1 ? "s" : ""} extraviado{extraviados > 1 ? "s" : ""} — seguimiento pendiente</p>
          )}
        </div>
      )}

      {/* Items por categoría */}
      {grupos.map(({ cat, items }) => {
        const catEnBodega = items.filter(i => i.estado === "EN_BODEGA").length;
        const catAlertas  = items.filter(i => i.estado === "EXTRAVIADO" || i.estado === "PERDIDO").length;
        return (
          <div key={cat} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{cat}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-600">{catEnBodega}/{items.length}</span>
                {catAlertas > 0 && <span className="text-red-400 font-semibold">⚠ {catAlertas} alerta{catAlertas > 1 ? "s" : ""}</span>}
              </div>
            </div>

            <div className="divide-y divide-[#181818]">
              {items.map(item => (
                <div key={item.id} className={`px-5 py-4 ${item.estado === "PERDIDO" ? "bg-red-900/5" : item.estado === "EXTRAVIADO" ? "bg-orange-900/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    {/* Dot estado */}
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      item.estado === "EN_BODEGA"      ? "bg-green-400"  :
                      item.estado === "EN_RENTA_O_USO" ? "bg-blue-400"   :
                      item.estado === "EXTRAVIADO"     ? "bg-orange-400" :
                      item.estado === "PERDIDO"        ? "bg-red-500"    : "bg-gray-700"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="text-white text-sm font-medium">{item.descripcion}</p>
                        {item.equipo?.cantidadTotal && item.equipo.cantidadTotal > 1 && (
                          <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">×{item.equipo.cantidadTotal}</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${ESTADO_CURRENT[item.estado]}`}>
                          {item.estado === "EN_RENTA_O_USO" ? "En renta/uso" :
                           item.estado === "EN_BODEGA" ? "En bodega" :
                           item.estado === "PENDIENTE" ? "Sin revisar" :
                           item.estado.charAt(0) + item.estado.slice(1).toLowerCase()}
                        </span>
                      </div>

                      {/* Botones de estado */}
                      <div className="flex gap-1.5 flex-wrap">
                        {ESTADOS.map(e => (
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
              ))}
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
