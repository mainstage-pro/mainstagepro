"use client";

import { useEffect, useRef, useState } from "react";
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
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/notificaciones", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setNotifs(d.notificaciones ?? []);
      setNoLeidas(d.noLeidas ?? 0);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors"
        aria-label="Notificaciones"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#B3985B] text-black text-[9px] font-bold px-1 leading-none">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-white/80 text-sm font-semibold">Notificaciones</span>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="text-white/30 hover:text-[#B3985B] text-xs transition-colors">
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(179,152,91,0.2) transparent" }}>
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/20 text-sm">Sin notificaciones</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`group flex gap-3 px-4 py-3 border-b border-white/[0.04] transition-colors cursor-pointer ${n.leida ? "hover:bg-white/[0.02]" : "bg-[#B3985B]/[0.05] hover:bg-[#B3985B]/[0.08]"}`}
                  onClick={() => { if (!n.leida) marcarLeida(n.id); if (n.url) { setOpen(false); } }}
                >
                  {/* Dot */}
                  <div className="mt-1.5 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${n.leida ? "bg-white/10" : "bg-[#B3985B]"}`} />
                  </div>
                  {/* Content */}
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
                  {/* Delete */}
                  <button
                    onClick={e => eliminar(n.id, e)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all mt-0.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
