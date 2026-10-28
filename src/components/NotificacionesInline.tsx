"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Camera, Megaphone, Radio, Briefcase, Banknote, PartyPopper, User, AtSign, CheckCheck, MessageSquare } from "lucide-react";

// ── Panel de notificaciones SIEMPRE visible en el dashboard ─────────────────
// La campanita se quedó en el olvido por falta de uso; esto pone lo mismo
// (asignaciones, menciones, avisos) directo en la primera pantalla, sin tener
// que acordarse de abrirla.

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

function NotifIcon({ tipo, url }: { tipo: string; url: string | null }) {
  const base = "w-7 h-7 rounded-lg flex items-center justify-center shrink-0";
  if (tipo === "TAREA")
    return <div className={`${base} bg-blue-900/30 text-blue-400 text-xs font-bold`}>✓</div>;
  if (tipo === "LEVANTAMIENTO")
    return <div className={`${base} bg-purple-900/30 text-purple-400`}><Camera strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (tipo === "PUBLICACION")
    return <div className={`${base} bg-pink-900/30 text-pink-400`}><Megaphone strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (tipo === "CAMPANA")
    return <div className={`${base} bg-cyan-900/30 text-cyan-400`}><Radio strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (tipo === "MENCION")
    return <div className={`${base} bg-[#B3985B]/15 text-[#B3985B]`}><AtSign strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (tipo === "MENSAJE")
    return <div className={`${base} bg-sky-900/30 text-sky-400`}><MessageSquare strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (url?.includes("cotizacion"))
    return <div className={`${base} bg-yellow-900/30 text-yellow-400`}><Briefcase strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (url?.includes("finanzas"))
    return <div className={`${base} bg-green-900/30 text-green-400`}><Banknote strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (url?.includes("proyecto"))
    return <div className={`${base} bg-orange-900/30 text-orange-400`}><PartyPopper strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  if (url?.includes("crm"))
    return <div className={`${base} bg-indigo-900/30 text-indigo-400`}><User strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
  return <div className={`${base} bg-white/5 text-white/40`}><Bell strokeWidth={1.75} className="w-3.5 h-3.5" /></div>;
}

export default function NotificacionesInline() {
  const router = useRouter();
  const [notifs, setNotifs]     = useState<Notificacion[] | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);

  async function load() {
    try {
      const r = await fetch("/api/notificaciones", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setNotifs((d.notificaciones ?? []).slice(0, 8));
      setNoLeidas(d.noLeidas ?? 0);
    } catch {
      setNotifs([]);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  function handleClick(n: Notificacion) {
    if (!n.leida) {
      setNotifs(prev => (prev ?? []).map(x => (x.id === n.id ? { ...x, leida: true } : x)));
      setNoLeidas(prev => Math.max(0, prev - 1));
      fetch(`/api/notificaciones/${n.id}`, { method: "PATCH" }).catch(() => {});
    }
    if (n.url) router.push(n.url);
  }

  function marcarTodas() {
    setNotifs(prev => (prev ?? []).map(n => ({ ...n, leida: true })));
    setNoLeidas(0);
    fetch("/api/notificaciones/todas", { method: "PATCH" }).catch(() => {});
  }

  if (notifs === null) {
    return <div className="h-40 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl animate-pulse" />;
  }

  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1a1a1a]">
        <Bell strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
        <p className="text-[11px] font-bold text-[#B3985B] uppercase tracking-widest">Notificaciones</p>
        {noLeidas > 0 && (
          <span className="text-[10px] bg-[#B3985B] text-black px-1.5 py-0.5 rounded-full font-bold leading-none">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
        <div className="flex-1" />
        {noLeidas > 0 && (
          <button onClick={marcarTodas} title="Marcar todo como leído" className="text-[#555] hover:text-[#B3985B] transition-colors">
            <CheckCheck strokeWidth={1.75} className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="divide-y divide-[#131313] max-h-[360px] overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="py-10 text-center">
            <Bell strokeWidth={1.75} className="w-6 h-6 mx-auto mb-2 text-[#333]" />
            <p className="text-[#555] text-sm">Sin notificaciones</p>
          </div>
        ) : notifs.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[#151515] ${n.leida ? "" : "bg-[#B3985B]/[0.04]"}`}
          >
            <NotifIcon tipo={n.tipo} url={n.url} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-[11px] font-semibold leading-snug truncate ${n.leida ? "text-[#888]" : "text-white"}`}>{n.titulo}</p>
                <span className="text-[#444] text-[9px] shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="text-[#666] text-[10px] leading-snug mt-0.5 line-clamp-2">{n.mensaje}</p>
            </div>
            {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0 mt-1.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
