"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SearchX, CheckCircle2 } from "lucide-react";

const METRICAS = [
  { key: "puntualidad", label: "Puntualidad" },
  { key: "ordenLimpieza", label: "Orden y limpieza" },
  { key: "actitud", label: "Actitud" },
  { key: "comunicacion", label: "Comunicación" },
  { key: "resolucionProb", label: "Resolución de problemas" },
  { key: "propuestasMejora", label: "Propuestas de mejora" },
  { key: "calidadTrabajo", label: "Calidad del trabajo" },
  { key: "trabajoEquipo", label: "Trabajo en equipo" },
] as const;

const CALIF_FINAL: Record<string, string> = {
  EXCEDE: "Excede expectativas",
  CUMPLE: "Cumple",
  EN_DESARROLLO: "En desarrollo",
  NO_CUMPLE: "No cumple",
};

interface Objetivo { texto: string; resultado: string; comentario: string }
interface Ctx {
  nombre: string; puesto: string; periodo: string;
  autoEstado: string;
  autoData: { metricas?: Record<string, number>; comentarios?: Record<string, string>; logros?: string; retos?: string } | null;
  completada: boolean; firmada: boolean; firmadaNombre: string | null;
  resultado: { puntajeTotal: number | null; calificacionFinal: string | null; aspectosPositivos: string | null; areasMejora: string | null; objetivos: Objetivo[] } | null;
}

export default function AutoevaluacionPage() {
  const { token } = useParams<{ token: string }>();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [metricas, setMetricas] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [logros, setLogros] = useState("");
  const [retos, setRetos] = useState("");
  const [firmaNombre, setFirmaNombre] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/autoevaluacion/${token}`);
    if (!r.ok) { setError("Enlace inválido o expirado"); setLoading(false); return; }
    const d: Ctx = await r.json();
    setCtx(d);
    if (d.autoData) {
      setMetricas(d.autoData.metricas ?? {});
      setComentarios(d.autoData.comentarios ?? {});
      setLogros(d.autoData.logros ?? "");
      setRetos(d.autoData.retos ?? "");
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  async function enviarAuto() {
    setSaving(true);
    const r = await fetch(`/api/autoevaluacion/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "autoevaluacion", autoData: { metricas, comentarios, logros, retos } }),
    });
    setSaving(false);
    if (r.ok) { setDone(true); await load(); }
    else { const e = await r.json().catch(() => ({})); setError(e.error ?? "Error al enviar"); }
  }

  async function firmar() {
    if (!firmaNombre.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/autoevaluacion/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "firma", nombre: firmaNombre }),
    });
    setSaving(false);
    if (r.ok) await load();
    else { const e = await r.json().catch(() => ({})); setError(e.error ?? "Error al firmar"); }
  }

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-600 text-sm">Cargando…</div>;
  if (error && !ctx) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 text-gray-500 px-6 text-center">
      <SearchX className="w-10 h-10 text-gray-700" />
      <p className="text-sm">{error}</p>
    </div>
  );
  if (!ctx) return null;

  const yaEnviada = ctx.autoEstado === "ENVIADA" || done;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-[#B3985B] text-xs uppercase tracking-widest mb-1">Evaluación de desempeño</p>
          <h1 className="text-2xl font-bold">{ctx.nombre}</h1>
          <p className="text-gray-500 text-sm">{ctx.puesto} · {ctx.periodo}</p>
        </div>

        {/* FASE 1 — Autoevaluación */}
        {!ctx.completada && (
          yaEnviada ? (
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
              <p className="text-white font-semibold">¡Autoevaluación enviada!</p>
              <p className="text-gray-500 text-sm">Gracias. Tu evaluador la revisará y cerrará tu evaluación. Podrás volver a este enlace para ver el resultado y firmarlo.</p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                Antes de tu evaluación, cuéntanos cómo valoras tú mismo tu desempeño este período. Sé honesto: esto se compara con la visión de dirección para tener una conversación más justa.
              </p>

              <div className="space-y-4">
                {METRICAS.map((m) => (
                  <div key={m.key} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                    <label className="text-sm text-gray-200 block mb-2">{m.label}</label>
                    <div className="flex gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setMetricas((p) => ({ ...p, [m.key]: p[m.key] === n ? 0 : n }))}
                          className={`flex-1 h-9 rounded font-bold text-sm transition-all ${metricas[m.key] === n
                            ? (n >= 4 ? "bg-green-600 text-white" : n >= 3 ? "bg-yellow-600 text-black" : n >= 2 ? "bg-orange-600 text-white" : "bg-red-600 text-white")
                            : "bg-[#1a1a1a] text-gray-600 hover:bg-[#222] hover:text-white"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <input value={comentarios[m.key] ?? ""} onChange={(e) => setComentarios((p) => ({ ...p, [m.key]: e.target.value }))}
                      placeholder="Comentario (opcional)…"
                      className="w-full bg-transparent border-b border-[#1a1a1a] focus:border-[#2a2a2a] text-gray-300 text-sm py-1 focus:outline-none placeholder:text-gray-700" />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1 block">Mis logros del período</label>
                  <textarea value={logros} onChange={(e) => setLogros(e.target.value)} rows={3}
                    placeholder="¿De qué te sientes orgulloso este período?"
                    className="w-full bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/40 resize-none" />
                </div>
                <div>
                  <label className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1 block">En qué quiero mejorar</label>
                  <textarea value={retos} onChange={(e) => setRetos(e.target.value)} rows={3}
                    placeholder="Retos, habilidades a desarrollar, apoyo que necesitas…"
                    className="w-full bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40 resize-none" />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button onClick={enviarAuto} disabled={saving}
                className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                {saving ? "Enviando…" : "Enviar mi autoevaluación"}
              </button>
            </>
          )
        )}

        {/* FASE 2 — Evaluación cerrada: ver resultado y firmar */}
        {ctx.completada && ctx.resultado && (
          <>
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Resultado del período</p>
              {ctx.resultado.puntajeTotal != null && (
                <p className="text-4xl font-bold text-[#B3985B]">{ctx.resultado.puntajeTotal.toFixed(1)}<span className="text-base text-gray-600"> /5</span></p>
              )}
              {ctx.resultado.calificacionFinal && (
                <p className="text-gray-300 text-sm mt-1">{CALIF_FINAL[ctx.resultado.calificacionFinal] ?? ctx.resultado.calificacionFinal}</p>
              )}
            </div>

            {ctx.resultado.aspectosPositivos && (
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1">Aspectos positivos</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{ctx.resultado.aspectosPositivos}</p>
              </div>
            )}
            {ctx.resultado.areasMejora && (
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1">Áreas de mejora</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{ctx.resultado.areasMejora}</p>
              </div>
            )}

            {ctx.firmada ? (
              <div className="bg-[#0f0f0f] border border-green-900/40 rounded-xl p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                <p className="text-white font-semibold">Evaluación firmada</p>
                <p className="text-gray-500 text-sm">Firmada por {ctx.firmadaNombre}. Gracias por tu acuse.</p>
              </div>
            ) : (
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
                <p className="text-gray-400 text-sm">Confirma que revisaste tu evaluación. Escribe tu nombre completo para firmar de enterado.</p>
                <input value={firmaNombre} onChange={(e) => setFirmaNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]" />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button onClick={firmar} disabled={saving || !firmaNombre.trim()}
                  className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                  {saving ? "Firmando…" : "Firmar de enterado"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
