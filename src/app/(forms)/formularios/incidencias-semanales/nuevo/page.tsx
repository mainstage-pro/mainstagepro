"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AreaKey = "admin" | "mkt" | "ventas" | "prod" | "eventos";
type Urgencia = "critico" | "importante" | "revisar" | "none";

interface Incidencia {
  id: string; area: AreaKey; texto: string;
  causa: string; solucion: string; urgencia: Urgencia; orden: number;
}
interface SessionInfo { id: string; name: string; area: string | null; }

// ─── Constants ─────────────────────────────────────────────────────────────────

const AREAS: { key: AreaKey; label: string; accent: string; hint: string }[] = [
  { key: "admin",   label: "Administración",        accent: "text-indigo-400",  hint: "Facturación, contratos, proveedores, trámites o procesos administrativos." },
  { key: "mkt",     label: "Marketing",              accent: "text-pink-400",    hint: "Redes sociales, campañas, contenido, branding o comunicación externa." },
  { key: "ventas",  label: "Ventas",                 accent: "text-green-400",   hint: "Situaciones con clientes, cotizaciones, cierres de venta o seguimiento de prospectos." },
  { key: "prod",    label: "Producción",              accent: "text-amber-400",   hint: "Fallas de equipo, inventario, logística interna o preparación de materiales." },
  { key: "eventos", label: "Operación de Eventos",   accent: "text-[#B3985B]",   hint: "Montaje, desmontaje, cliente en sitio, proveedor externo o imprevisto durante el evento." },
];

const URGENCIA: Record<Urgencia, { label: string; emoji: string; active: string }> = {
  critico:    { label: "Crítico",       emoji: "🔴", active: "border-red-500/50 bg-red-500/10" },
  importante: { label: "Importante",   emoji: "🟡", active: "border-yellow-500/50 bg-yellow-500/10" },
  revisar:    { label: "A revisar",    emoji: "🟢", active: "border-green-500/50 bg-green-500/10" },
  none:       { label: "Sin clasificar", emoji: "⚪", active: "border-[#2a2a2a] bg-[#1a1a1a]" },
};

function getSemanaISO(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function genId() { return Math.random().toString(36).slice(2); }

const ta = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#B3985B] resize-none transition-colors placeholder:text-gray-700 leading-relaxed";

// ─── IncidenciaCard ────────────────────────────────────────────────────────────

function IncidenciaCard({ item, index, onUpdate, onRemove }: {
  item: Incidencia; index: number;
  onUpdate: (id: string, f: keyof Incidencia, v: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2.5">
          <textarea value={item.texto} onChange={(e) => onUpdate(item.id, "texto", e.target.value)}
            rows={2} placeholder="¿Qué sucedió? Describe la incidencia de forma clara y concreta..."
            className={ta}
          />
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mt-2.5 w-14 shrink-0">Causa</span>
            <textarea value={item.causa} onChange={(e) => onUpdate(item.id, "causa", e.target.value)}
              rows={1} placeholder="¿Por qué ocurrió? ¿Cuál fue el origen del problema?"
              className={ta} style={{ minHeight: "2rem" }}
              onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
            />
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-[#B3985B] uppercase tracking-wider font-semibold mt-2.5 w-14 shrink-0">Solución</span>
            <textarea value={item.solucion} onChange={(e) => onUpdate(item.id, "solucion", e.target.value)}
              rows={1} placeholder="¿Qué propones para resolverlo o evitarlo en el futuro?"
              className={ta} style={{ minHeight: "2rem" }}
              onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0 ml-1 pt-0.5">
          {(["critico", "importante", "revisar"] as Urgencia[]).map((u) => (
            <button key={u} type="button" title={URGENCIA[u].label}
              onClick={() => onUpdate(item.id, "urgencia", u === item.urgencia ? "none" : u)}
              className={`w-7 h-7 rounded-lg text-xs border transition-all ${item.urgencia === u ? URGENCIA[u].active + " scale-110" : "border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]"}`}
            >{URGENCIA[u].emoji}</button>
          ))}
          <button type="button" onClick={() => onRemove(item.id)}
            className="w-7 h-7 rounded-lg text-gray-700 hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/50 transition-colors text-sm flex items-center justify-center mt-1"
          >×</button>
        </div>
      </div>
    </div>
  );
}

// ─── AreaSection ───────────────────────────────────────────────────────────────

function AreaSection({ area, items, onAdd, onUpdate, onRemove }: {
  area: typeof AREAS[number]; items: Incidencia[];
  onAdd: (area: AreaKey, texto: string) => void;
  onUpdate: (id: string, f: keyof Incidencia, v: string) => void;
  onRemove: (id: string) => void;
}) {
  const [newText, setNewText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!newText.trim()) return;
    onAdd(area.key, newText.trim());
    setNewText("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-5 rounded-full bg-[#B3985B]/30" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold ${area.accent}`}>{area.label}</h3>
              {items.length > 0 && (
                <span className="text-[10px] text-gray-600 bg-[#0d0d0d] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                  {items.length} {items.length === 1 ? "incidencia" : "incidencias"}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{area.hint}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items.length === 0 && (
          <p className="text-gray-700 text-xs italic">Sin incidencias en esta área esta semana</p>
        )}
        {items.map((item, i) => (
          <IncidenciaCard key={item.id} item={item} index={i} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
        <div className="flex items-center gap-2 pt-1">
          <input ref={inputRef} type="text" value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder={`Agregar incidencia... (Enter para agregar)`}
            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] transition-colors placeholder:text-gray-700"
          />
          <button type="button" onClick={handleAdd} disabled={!newText.trim()}
            className="text-xs text-[#B3985B]/70 hover:text-[#B3985B] disabled:opacity-30 transition-colors px-2 py-2 shrink-0"
          >+ Agregar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function IncidenciasLandingPage() {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [privacyDismissed, setPrivacyDismissed] = useState(false);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  const semana = getSemanaISO();
  const anio = new Date().getFullYear();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) setSession({ id: d.id, name: d.name, area: d.area ?? null });
        else router.push(`/login?redirect=/formularios/incidencias-semanales/nuevo`);
      })
      .catch(() => router.push(`/login?redirect=/formularios/incidencias-semanales/nuevo`));
  }, []); // eslint-disable-line

  const addIncidencia = useCallback((area: AreaKey, texto: string) => {
    const areaItems = incidencias.filter(i => i.area === area);
    setIncidencias(prev => [...prev, { id: genId(), area, texto, causa: "", solucion: "", urgencia: "none", orden: areaItems.length }]);
  }, [incidencias]);

  const updateIncidencia = useCallback((id: string, f: keyof Incidencia, v: string) => {
    setIncidencias(prev => prev.map(i => i.id === id ? { ...i, [f]: v } : i));
  }, []);

  const removeIncidencia = useCallback((id: string) => {
    setIncidencias(prev => prev.filter(i => i.id !== id));
  }, []);

  const total = incidencias.filter(i => i.texto.trim()).length;
  const criticas = incidencias.filter(i => i.urgencia === "critico").length;

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { toast.error("Debes estar autenticado"); return; }
    setGuardando(true);
    try {
      const payload = incidencias.filter(i => i.texto.trim())
        .map(({ area, texto, causa, solucion, urgencia, orden }) => ({ area, texto, causa, solucion, urgencia, orden }));
      const res = await fetch("/api/formularios/incidencias-semanales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana, anio, incidencias: payload }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
      setEnviado(true);
    } catch { toast.error("Error de conexión"); }
    finally { setGuardando(false); }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ── Enviado ──────────────────────────────────────────────────────────────────

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-white font-bold text-xl mb-2">¡Incidencias registradas!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Gracias, <span className="text-white font-semibold">{session.name}</span>. Se registraron <strong className="text-white">{total}</strong> incidencias para la semana {semana}.
          </p>
          {criticas > 0 && <p className="text-red-400 text-xs mb-4">🔴 {criticas} incidencia{criticas !== 1 ? "s" : ""} crítica{criticas !== 1 ? "s" : ""} notificada{criticas !== 1 ? "s" : ""} a Dirección.</p>}
          <p className="text-gray-700 text-xs">Solo Dirección tiene acceso a esta información.</p>
          <div className="mt-8 pt-6 border-t border-[#1e1e1e] flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#111] border border-[#2a2a2a] flex items-center justify-center">
              <span className="text-[#B3985B] text-xs font-bold">M</span>
            </div>
            <span className="text-gray-400 text-sm font-semibold">Mainstage Pro</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Privacy Notice ───────────────────────────────────────────────────────────

  if (!privacyDismissed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center shrink-0">
              <span className="text-[#B3985B] text-base font-bold">M</span>
            </div>
            <div>
              <p className="text-white text-base font-bold leading-tight">Mainstage Pro</p>
              <p className="text-gray-600 text-[10px]">Sistema operativo interno</p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-7 text-center">
            <div className="w-14 h-14 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-white font-bold text-lg mb-3">Incidencias Semanales — Privado</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Este formulario es <span className="text-white font-semibold">completamente confidencial</span>. Solo el equipo de Dirección tiene acceso a lo que reportes aquí.
            </p>

            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 mb-5 text-left space-y-1.5">
              <p className="text-[#B3985B] text-xs font-semibold mb-2">🔒 Importante saber:</p>
              <p className="text-gray-500 text-xs">• Ningún compañero verá lo que escribas</p>
              <p className="text-gray-500 text-xs">• Solo lo lee Dirección para tomar acciones</p>
              <p className="text-gray-500 text-xs">• Reportar incidencias ayuda a mejorar los procesos</p>
              <p className="text-gray-500 text-xs">• Sé específico: describe qué pasó, por qué y cómo resolverlo</p>
            </div>

            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-6 text-left">
              <p className="text-gray-600 text-xs mb-1">Reportando como:</p>
              <p className="text-white font-semibold text-sm">{session.name}</p>
              {session.area && <p className="text-gray-500 text-xs">{session.area}</p>}
              <p className="text-[#B3985B] text-xs font-semibold mt-1">Semana {semana} · {anio}</p>
            </div>

            <button onClick={() => setPrivacyDismissed(true)}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96e] text-black font-bold py-3.5 rounded-xl transition-colors text-sm">
              Entendido — Comenzar registro ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top bar */}
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#111] border border-[#2a2a2a] flex items-center justify-center shrink-0">
              <span className="text-[#B3985B] text-xs font-bold">M</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">Mainstage Pro</p>
              <p className="text-gray-600 text-[10px]">Incidencias Semanales · Privado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-2 py-0.5 rounded-full font-medium">
              🔒 Solo Dirección
            </span>
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs font-semibold">{session.name}</p>
              <p className="text-gray-600 text-[10px]">S{semana} · {anio}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleGuardar}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

          {/* Hero */}
          <div className="bg-gradient-to-br from-[#B3985B]/10 to-[#0d0d0d] border border-[#B3985B]/20 rounded-2xl p-6">
            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">Semana {semana} · {anio}</p>
            <h1 className="text-white text-lg font-bold mb-2">Registro de Incidencias Semanales</h1>
            <p className="text-gray-500 text-xs leading-relaxed">
              Documenta en cada sección las incidencias de tu área. Para cada una: describe qué pasó, identifica la causa y propone una solución. Clasifica por urgencia con los botones de colores.
            </p>
          </div>

          {/* Leyenda urgencia */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-3 flex items-center gap-6 flex-wrap">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Urgencia:</p>
            {(["critico", "importante", "revisar"] as Urgencia[]).map(u => (
              <span key={u} className="flex items-center gap-1.5 text-xs text-gray-500">
                {URGENCIA[u].emoji} <span>{URGENCIA[u].label}</span>
              </span>
            ))}
          </div>

          {/* Secciones por área */}
          {AREAS.map(area => {
            const areaItems = incidencias.filter(i => i.area === area.key).sort((a, b) => a.orden - b.orden);
            return (
              <AreaSection key={area.key} area={area} items={areaItems}
                onAdd={addIncidencia} onUpdate={updateIncidencia} onRemove={removeIncidencia}
              />
            );
          })}

          {/* Submit */}
          <div className="pb-8 space-y-3">
            {total === 0 && (
              <p className="text-center text-gray-700 text-xs">Agrega al menos una incidencia para poder guardar el registro</p>
            )}
            <button type="submit" disabled={guardando || total === 0}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm">
              {guardando ? "Guardando..." : total === 0 ? "Agrega al menos una incidencia" : `Guardar registro — ${total} incidencia${total !== 1 ? "s" : ""} ✓`}
            </button>
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-[#B3985B]/70 bg-[#B3985B]/5 border border-[#B3985B]/15 px-3 py-0.5 rounded-full">
                🔒 Solo Dirección tiene acceso a tus respuestas
              </span>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
