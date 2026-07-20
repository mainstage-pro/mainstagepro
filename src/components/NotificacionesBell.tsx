"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Camera, Megaphone, Radio, Briefcase, Banknote, PartyPopper, User, CheckCircle2 } from "lucide-react";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  url: string | null;
  createdAt: string;
}

interface Alerta {
  tipo: string;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
  titulo: string;
  detalle: string;
  href: string;
  icono: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Ícono por tipo de notificación
function NotifIcon({ tipo, url }: { tipo: string; url: string | null }) {
  const base = "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm";
  if (tipo === "TAREA")
    return <div className={`${base} bg-blue-900/30 text-blue-400`}>✓</div>;
  if (tipo === "LEVANTAMIENTO")
    return <div className={`${base} bg-purple-900/30 text-purple-400`}><Camera strokeWidth={1.75} className="w-4 h-4" /></div>;
  if (tipo === "PUBLICACION")
    return <div className={`${base} bg-pink-900/30 text-pink-400`}><Megaphone strokeWidth={1.75} className="w-4 h-4" /></div>;
  if (tipo === "CAMPANA")
    return <div className={`${base} bg-cyan-900/30 text-cyan-400`}><Radio strokeWidth={1.75} className="w-4 h-4" /></div>;
  if (url?.includes("cotizacion"))
    return <div className={`${base} bg-yellow-900/30 text-yellow-400`}><Briefcase strokeWidth={1.75} className="w-4 h-4" /></div>;
  if (url?.includes("finanzas"))
    return <div className={`${base} bg-green-900/30 text-green-400`}><Banknote strokeWidth={1.75} className="w-4 h-4" /></div>;
  if (url?.includes("proyecto"))
    return <div className={`${base} bg-orange-900/30 text-orange-400`}><PartyPopper strokeWidth={1.75} className="w-4 h-4" /></div>;
  if (url?.includes("crm"))
    return <div className={`${base} bg-indigo-900/30 text-indigo-400`}><User strokeWidth={1.75} className="w-4 h-4" /></div>;
  return <div className={`${base} bg-white/5 text-white/40`}><Bell strokeWidth={1.75} className="w-4 h-4" /></div>;
}

export default function NotificacionesBell() {
  const router = useRouter();
  const [notifs, setNotifs]     = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [alertas, setAlertas]   = useState<Alerta[]>([]);
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<"notifs" | "alertas">("notifs");
  const ref = useRef<HTMLDivElement>(null);

  async function loadNotifs() {
    try {
      const r = await fetch("/api/notificaciones", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setNotifs(d.notificaciones ?? []);
      setNoLeidas(d.noLeidas ?? 0);
    } catch {}
  }

  const loadAlertas = useCallback(async () => {
    try {
      const res = await fetch("/api/alertas");
      const d = await res.json();
      setAlertas(d.alertas ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifs();
    loadAlertas();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [loadAlertas]);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  async function handleClick(n: Notificacion) {
    // Marcar como leída
    if (!n.leida) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x));
      setNoLeidas(prev => Math.max(0, prev - 1));
      fetch(`/api/notificaciones/${n.id}`, { method: "PATCH" });
    }
    // Navegar si tiene URL
    if (n.url) {
      setOpen(false);
      router.push(n.url);
    }
  }

  async function marcarTodas() {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    setNoLeidas(0);
    await fetch("/api/notificaciones/todas", { method: "PATCH" });
  }

  async function eliminar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setNotifs(prev => {
      const n = prev.find(x => x.id === id);
      if (n && !n.leida) setNoLeidas(c => Math.max(0, c - 1));
      return prev.filter(x => x.id !== id);
    });
    await fetch(`/api/notificaciones/${id}`, { method: "DELETE" });
  }

  const alertasAltas = alertas.filter(a => a.prioridad === "ALTA").length;

  // Badge
  const badgeCount = alertasAltas > 0 ? alertasAltas : noLeidas > 0 ? noLeidas : alertas.length > 0 ? alertas.length : 0;
  const badgeColor = alertasAltas > 0 ? "bg-red-600 text-white" : noLeidas > 0 ? "bg-[#B3985B] text-black" : "bg-yellow-600 text-black";
  const showBadge  = badgeCount > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors"
        aria-label="Notificaciones y alertas"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={alertasAltas > 0 ? "text-red-400" : "currentColor"}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {showBadge && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1 leading-none ${badgeColor}`}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-[360px] max-w-[calc(100vw-1rem)] bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab("notifs")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors ${tab === "notifs" ? "text-white border-b-2 border-[#B3985B]" : "text-white/30 hover:text-white/60"}`}
            >
              Notificaciones
              {noLeidas > 0 && (
                <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#B3985B] text-black text-[9px] font-bold px-1 leading-none">
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("alertas")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors ${tab === "alertas" ? "text-white border-b-2 border-[#B3985B]" : "text-white/30 hover:text-white/60"}`}
            >
              Alertas
              {alertas.length > 0 && (
                <span className={`min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1 leading-none ${alertasAltas > 0 ? "bg-red-600 text-white" : "bg-yellow-600 text-black"}`}>
                  {alertas.length > 9 ? "9+" : alertas.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Tab: Notificaciones ── */}
          {tab === "notifs" && (
            <>
              {noLeidas > 0 && (
                <div className="flex justify-end px-4 py-2 border-b border-white/[0.04]">
                  <button onClick={marcarTodas} className="text-white/30 hover:text-[#B3985B] text-xs transition-colors">
                    Marcar todo como leído
                  </button>
                </div>
              )}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.2) transparent" }}>
                {notifs.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell strokeWidth={1.75} className="w-6 h-6 mx-auto mb-2 text-white/30" />
                    <p className="text-white/30 text-sm">Sin notificaciones</p>
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`group flex gap-3 px-4 py-3 transition-colors ${n.url ? "cursor-pointer" : "cursor-default"} ${n.leida ? "hover:bg-white/[0.02]" : "bg-[#B3985B]/[0.05] hover:bg-[#B3985B]/[0.09]"}`}
                  >
                    {/* Ícono por tipo */}
                    <div className="shrink-0 mt-0.5">
                      <NotifIcon tipo={n.tipo} url={n.url} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-snug ${n.leida ? "text-white/50" : "text-white/90"}`}>
                          {n.titulo}
                        </p>
                        <span className="text-white/20 text-[10px] shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-white/40 text-[11px] leading-snug mt-0.5 line-clamp-2">{n.mensaje}</p>
                      {/* CTA si tiene URL */}
                      {n.url && (
                        <p className={`text-[10px] mt-1 font-medium ${n.leida ? "text-white/20" : "text-[#B3985B]/70"}`}>
                          Toca para ir →
                        </p>
                      )}
                    </div>

                    {/* Dot no leída + botón eliminar */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {!n.leida && <div className="w-1.5 h-1.5 rounded-full bg-[#B3985B] mt-1.5" />}
                      <button
                        onClick={e => eliminar(n.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all mt-auto"
                        title="Eliminar"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Tab: Alertas ── */}
          {tab === "alertas" && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
                <p className="text-white/30 text-[10px]">
                  {alertas.length} pendiente{alertas.length !== 1 ? "s" : ""}
                  {alertasAltas > 0 && <span className="text-red-400 ml-1">· {alertasAltas} alta prioridad</span>}
                </p>
                <button onClick={loadAlertas} className="text-white/20 hover:text-white/50 text-xs transition-colors" title="Actualizar">↻</button>
              </div>

              <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.2) transparent" }}>
                {alertas.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 strokeWidth={1.75} className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                    <p className="text-white/50 text-sm font-medium">Todo al día</p>
                    <p className="text-white/20 text-xs mt-1">No hay alertas pendientes</p>
                  </div>
                ) : alertas.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => { setOpen(false); router.push(a.href); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-l-2 ${a.prioridad === "ALTA" ? "border-red-600" : a.prioridad === "MEDIA" ? "border-yellow-600" : "border-transparent"}`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{a.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-xs font-medium leading-snug truncate">{a.titulo}</p>
                      <p className="text-white/30 text-[10px] mt-0.5 truncate">{a.detalle}</p>
                    </div>
                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase mt-0.5 ${a.prioridad === "ALTA" ? "text-red-400 bg-red-900/20" : a.prioridad === "MEDIA" ? "text-yellow-400 bg-yellow-900/20" : "text-gray-500 bg-gray-800/50"}`}>
                      {a.prioridad}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
