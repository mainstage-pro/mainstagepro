"use client";

import { useEffect, useState, useRef } from "react";

interface TipoContenido {
  id: string; nombre: string; formato: string;
}
interface Publicacion {
  id: string;
  fecha: string;
  descripcion: string | null;
  formato: string | null;
  estado: string;
  enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean;
  materialLink: string | null;
  colaboradores: string | null;
  tipo: TipoContenido | null;
}

const ESTADOS = [
  { key: "PENDIENTE",  label: "Pendiente",  color: "border-white/10 text-white/50" },
  { key: "EN_PROCESO", label: "En proceso", color: "border-blue-700/40 text-blue-400" },
  { key: "LISTO",      label: "Listo",      color: "border-yellow-700/40 text-yellow-400" },
  { key: "PUBLICADO",  label: "Publicado",  color: "border-green-700/40 text-green-400" },
  { key: "CANCELADO",  label: "Cancelado",  color: "border-red-800/40 text-red-400/70" },
];

const FORMATO_COLORS: Record<string, string> = {
  POST:    "bg-blue-900/40 text-blue-300 border-blue-800/30",
  REEL:    "bg-purple-900/40 text-purple-300 border-purple-800/30",
  STORIE:  "bg-pink-900/40 text-pink-300 border-pink-800/30",
  TIK_TOK: "bg-cyan-900/40 text-cyan-300 border-cyan-800/30",
};

const ESTADO_HEADER: Record<string, string> = {
  PENDIENTE:  "text-white/40 border-white/10",
  EN_PROCESO: "text-blue-400 border-blue-700/30",
  LISTO:      "text-yellow-400 border-yellow-700/30",
  PUBLICADO:  "text-green-400 border-green-700/30",
  CANCELADO:  "text-red-400/70 border-red-800/30",
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function prevMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function KanbanPage() {
  const [mes, setMes] = useState(getMes);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dragItem = useRef<Publicacion | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/marketing/publicaciones?mes=${mes}`, { cache: "no-store" });
    const d = await r.json();
    setPublicaciones(d.publicaciones ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [mes]);

  async function changeEstado(id: string, estado: string) {
    setPublicaciones(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    const r = await fetch(`/api/marketing/publicaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!r.ok) await load();
  }

  function onDragStart(e: React.DragEvent, pub: Publicacion) {
    dragItem.current = pub;
    setDragging(pub.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOver(colKey);
  }

  function onDrop(e: React.DragEvent, colKey: string) {
    e.preventDefault();
    if (dragItem.current && dragItem.current.estado !== colKey) {
      changeEstado(dragItem.current.id, colKey);
    }
    setDragging(null);
    setOver(null);
    dragItem.current = null;
  }

  function onDragEnd() {
    setDragging(null);
    setOver(null);
    dragItem.current = null;
  }

  const byEstado = (key: string) => publicaciones.filter(p => p.estado === key);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]" style={{ fontFamily: "'SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-white text-xl font-semibold tracking-tight">Pipeline de contenido</h1>
            <p className="text-white/30 text-sm mt-0.5">Arrastra publicaciones entre columnas para cambiar su estado</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMes(prevMes(mes))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-white/70 text-sm font-medium min-w-[90px] text-center">{mesLabel(mes)}</span>
            <button onClick={() => setMes(nextMes(mes))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/20 text-sm">Cargando...</div>
        ) : (
          <div className="flex gap-3 h-full p-4" style={{ minWidth: `${ESTADOS.length * 280}px` }}>
            {ESTADOS.map(({ key, label }) => {
              const col = byEstado(key);
              const isOver = over === key;
              return (
                <div
                  key={key}
                  className="flex flex-col w-64 shrink-0 h-full"
                  onDragOver={e => onDragOver(e, key)}
                  onDrop={e => onDrop(e, key)}
                  onDragLeave={() => setOver(null)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2 mb-2 rounded-lg border ${ESTADO_HEADER[key]} bg-white/[0.02]`}>
                    <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
                    <span className="text-xs opacity-60 font-medium">{col.length}</span>
                  </div>

                  {/* Drop zone */}
                  <div className={`flex-1 overflow-y-auto space-y-2 rounded-xl transition-colors ${isOver ? "bg-white/[0.03] ring-1 ring-white/10" : ""}`}
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.35) transparent" }}>
                    {col.map(pub => {
                      const fmt = pub.formato ?? pub.tipo?.formato;
                      const platforms: string[] = [
                        pub.enInstagram ? "IG" : null,
                        pub.enFacebook ? "FB" : null,
                        pub.enTiktok ? "TT" : null,
                        pub.enYoutube ? "YT" : null,
                      ].filter((p): p is string => p !== null);
                      return (
                        <div
                          key={pub.id}
                          draggable
                          onDragStart={e => onDragStart(e, pub)}
                          onDragEnd={onDragEnd}
                          className={`group bg-white/[0.025] border border-white/8 rounded-xl p-3 cursor-grab active:cursor-grabbing select-none transition-all ${
                            dragging === pub.id ? "opacity-40 scale-95" : "hover:border-white/15 hover:bg-white/[0.04]"
                          }`}
                        >
                          {/* Format + platforms */}
                          <div className="flex items-center gap-1.5 mb-2">
                            {fmt && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${FORMATO_COLORS[fmt] ?? "bg-white/5 text-white/40 border-white/10"}`}>
                                {fmt.replace("_", " ")}
                              </span>
                            )}
                            {platforms.map(p => (
                              <span key={p} className="text-[9px] font-medium text-white/30 bg-white/5 border border-white/8 rounded px-1 py-0.5">{p}</span>
                            ))}
                          </div>

                          {/* Title / description */}
                          <p className="text-white/80 text-xs font-medium leading-snug mb-1.5 line-clamp-2">
                            {pub.tipo?.nombre ?? pub.descripcion ?? "Sin descripción"}
                          </p>
                          {pub.tipo?.nombre && pub.descripcion && (
                            <p className="text-white/30 text-[11px] leading-snug mb-1.5 line-clamp-2">{pub.descripcion}</p>
                          )}

                          {/* Date */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-white/25 text-[10px]">{formatDate(pub.fecha)}</span>
                            {pub.materialLink && (
                              <a href={pub.materialLink} target="_blank" rel="noreferrer"
                                className="text-[#B3985B]/60 hover:text-[#B3985B] text-[10px] transition-colors"
                                onClick={e => e.stopPropagation()}>
                                Material ↗
                              </a>
                            )}
                          </div>

                          {/* Move buttons — visible on hover */}
                          <div className="hidden group-hover:flex gap-1 mt-2 flex-wrap">
                            {ESTADOS.filter(e => e.key !== key).map(e => (
                              <button
                                key={e.key}
                                onClick={() => changeEstado(pub.id, e.key)}
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${e.color} hover:bg-white/5`}
                              >
                                → {e.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {col.length === 0 && (
                      <div className={`flex items-center justify-center h-16 rounded-xl border border-dashed transition-colors ${isOver ? "border-white/20 bg-white/[0.04]" : "border-white/[0.06]"}`}>
                        <span className="text-white/15 text-xs">Arrastra aquí</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
