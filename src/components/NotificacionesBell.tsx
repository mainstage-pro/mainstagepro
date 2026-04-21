"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

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

const PRIORIDAD_BADGE: Record<string, string> = {
  ALTA:  "text-red-400 bg-red-900/20",
  MEDIA: "text-yellow-400 bg-yellow-900/20",
  BAJA:  "text-gray-500 bg-gray-800/50",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificacionesBell() {
  const [notifs, setNotifs]     = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [alertas, setAlertas]   = useState<Alerta[]>([]);
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<"notifs" | "alertas">("notifs");
  const [filtro, setFiltro]     = useState<"TODAS" | "ALTA" | "MEDIA" | "BAJA">("TODAS");
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

  async function marcarLeida(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setNoLeidas(prev => Math.max(0, prev - 1));
    await fetch(`/api/notificaciones/${id}`, { method: "PATCH" });
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
  const alertasVisibles = filtro === "TODAS" ? alertas : alertas.filter(a => a.prioridad === filtro);

  // Badge: red if ALTA alerts exist, gold if unread notifs, yellow if any alerts
  const badgeCount = alertasAltas > 0 ? alertasAltas : noLeidas > 0 ? noLeidas : alertas.length;
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
        <div className="absolute right-0 top-10 w-[340px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
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

          {/* Notificaciones tab */}
          {tab === "notifs" && (
            <>
              {noLeidas > 0 && (
                <div className="flex justify-end px-4 py-2 border-b border-white/[0.04]">
                  <button onClick={marcarTodas} className="text-white/30 hover:text-[#B3985B] text-xs transition-colors">
                    Marcar todo como leído
                  </button>
                </div>
              )}
              <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.2) transparent" }}>
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-2xl mb-2">🔔</p>
                    <p className="text-white/30 text-sm">Sin notificaciones</p>
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className={`group flex gap-3 px-4 py-3 border-b border-white/[0.04] transition-colors cursor-pointer ${n.leida ? "hover:bg-white/[0.02]" : "bg-[#B3985B]/[0.05] hover:bg-[#B3985B]/[0.08]"}`}
                    onClick={() => { if (!n.leida) marcarLeida(n.id); if (n.url) setOpen(false); }}
                  >
                    <div className="mt-1.5 shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${n.leida ? "bg-white/10" : "bg-[#B3985B]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-snug ${n.leida ? "text-white/50" : "text-white/90"}`}>
                          {n.url ? (
                            <Link href={n.url} onClick={() => setOpen(false)} className="hover:text-[#B3985B] transition-colors">
                              {n.titulo}
                            </Link>
                          ) : n.titulo}
                        </p>
                        <span className="text-white/20 text-[10px] shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-white/30 text-[11px] leading-snug mt-0.5 line-clamp-2">{n.mensaje}</p>
                    </div>
                    <button
                      onClick={e => eliminar(n.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all mt-0.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Alertas tab */}
          {tab === "alertas" && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
                <p className="text-white/30 text-[10px]">
                  {alertas.length} pendiente{alertas.length !== 1 ? "s" : ""}
                  {alertasAltas > 0 && <span className="text-red-400 ml-1">· {alertasAltas} alta prioridad</span>}
                </p>
                <button onClick={loadAlertas} className="text-white/20 hover:text-white/50 text-xs transition-colors">↻</button>
              </div>

              {alertas.length > 1 && (
                <div className="flex gap-1 px-3 py-2 border-b border-white/[0.04]">
                  {(["TODAS", "ALTA", "MEDIA", "BAJA"] as const).map(f => (
                    <button key={f} onClick={() => setFiltro(f)}
                      className={`text-[10px] px-2 py-0.5 rounded transition-colors ${filtro === f ? "bg-[#B3985B] text-black font-semibold" : "text-white/30 hover:text-white/60"}`}>
                      {f === "TODAS" ? `Todas (${alertas.length})` : `${f} (${alertas.filter(a => a.prioridad === f).length})`}
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]">
                {alertasVisibles.length === 0 ? (
                  <div className="text-center py-8">
                    {alertas.length === 0 ? (
                      <>
                        <p className="text-2xl mb-2">✅</p>
                        <p className="text-white/50 text-sm font-medium">Todo al día</p>
                        <p className="text-white/20 text-xs mt-1">No hay alertas pendientes</p>
                      </>
                    ) : (
                      <p className="text-white/30 text-sm">Sin alertas de este nivel</p>
                    )}
                  </div>
                ) : alertasVisibles.map((a, i) => (
                  <Link key={i} href={a.href} onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-l-2 ${a.prioridad === "ALTA" ? "border-red-600" : a.prioridad === "MEDIA" ? "border-yellow-600" : "border-transparent"}`}>
                    <span className="text-base shrink-0 mt-0.5">{a.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-xs font-medium leading-snug truncate">{a.titulo}</p>
                      <p className="text-white/30 text-[10px] mt-0.5 truncate">{a.detalle}</p>
                    </div>
                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${PRIORIDAD_BADGE[a.prioridad]}`}>
                      {a.prioridad}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
