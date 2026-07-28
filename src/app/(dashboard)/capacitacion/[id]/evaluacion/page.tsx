"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

interface Pregunta { pregunta: string; opciones: string[]; }
interface Intento { id: string; calificacion: number; aprobado: boolean; creadoEn: string; }
interface Correccion { correcta: number; elegida: number; acerto: boolean; }
interface EvalData {
  titulo: string;
  categoria: { slug: string; nombre: string; color: string } | null;
  tieneContenido: boolean;
  puedeEditar: boolean;
  existe: boolean;
  minAprobar?: number;
  preguntas?: Pregunta[];
  intentos?: Intento[];
}
interface Resultado { calificacion: number; aprobado: boolean; minAprobar: number; aciertos: number; total: number; correccion: Correccion[]; }

export default function EvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [modo, setModo] = useState<"intro" | "examen">("intro");

  async function cargar() {
    const r = await fetch(`/api/capacitacion/${id}/evaluacion`);
    const d = await r.json();
    setData(d);
    setLoading(false);
  }
  useEffect(() => { cargar(); }, [id]);

  async function generar() {
    setGenerando(true);
    const r = await fetch(`/api/capacitacion/${id}/evaluacion/generar`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numPreguntas: 6 }),
    });
    setGenerando(false);
    if (r.ok) cargar();
    else alert((await r.json()).error ?? "Error al generar");
  }

  async function enviar() {
    if (!data?.preguntas || enviando) return;
    if (Object.keys(respuestas).length < data.preguntas.length) { alert("Responde todas las preguntas"); return; }
    setEnviando(true);
    const arr = data.preguntas.map((_, i) => respuestas[i] ?? -1);
    const r = await fetch(`/api/capacitacion/${id}/evaluacion/intento`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ respuestas: arr }),
    });
    setEnviando(false);
    if (r.ok) setResultado(await r.json());
  }

  function reintentar() { setRespuestas({}); setResultado(null); setModo("examen"); }

  const backHref = data?.categoria ? `/capacitacion/area/${data.categoria.slug}` : "/capacitacion";

  if (loading) return <Shell><p className="text-sm" style={{ color: "#6b7280" }}>Cargando…</p></Shell>;
  if (!data) return <Shell><p className="text-sm" style={{ color: "#6b7280" }}>No encontrado</p></Shell>;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-white" style={{ color: "#6b7280" }}>
          <ArrowLeft size={14} /> Volver
        </Link>

        <h1 className="ms-h1 tracking-tight mb-1">Evaluación</h1>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>{data.titulo}</p>

        {/* No existe evaluación todavía */}
        {!data.existe && (
          <div className="rounded-xl border p-8 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>Esta capacitación aún no tiene evaluación.</p>
            {data.puedeEditar ? (
              <button onClick={generar} disabled={generando || !data.tieneContenido}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-40" style={{ background: "#c9a96a", color: "#000" }}>
                <Sparkles size={15} /> {generando ? "Generando con IA…" : "Generar evaluación con IA"}
              </button>
            ) : <p className="text-xs" style={{ color: "#4b5563" }}>Pídele a un administrador que la genere.</p>}
            {data.puedeEditar && !data.tieneContenido && <p className="text-xs mt-3" style={{ color: "#4b5563" }}>Primero genera el contenido/presentación de la capacitación.</p>}
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-8 text-center" style={{ background: "#111", borderColor: resultado.aprobado ? "#22c55e44" : "#EF444444" }}>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: resultado.aprobado ? "#0a1f0a" : "#1f0a0a" }}>
                {resultado.aprobado ? <Trophy size={26} style={{ color: "#22c55e" }} /> : <XCircle size={26} style={{ color: "#EF4444" }} />}
              </div>
              <p className="text-3xl font-bold" style={{ color: resultado.aprobado ? "#22c55e" : "#EF4444" }}>{resultado.calificacion}%</p>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>{resultado.aciertos} de {resultado.total} correctas · mínimo {resultado.minAprobar}%</p>
              <p className="text-sm font-medium mt-3" style={{ color: resultado.aprobado ? "#22c55e" : "#F59E0B" }}>
                {resultado.aprobado ? "¡Aprobada! Capacitación completada." : "No alcanzaste el mínimo. Puedes reintentar."}
              </p>
            </div>

            {/* Retroalimentación */}
            {data.preguntas?.map((p, i) => {
              const c = resultado.correccion[i];
              return (
                <div key={i} className="rounded-xl border p-4" style={{ background: "#111", borderColor: "#1e1e1e" }}>
                  <p className="text-sm font-medium text-white mb-2">{i + 1}. {p.pregunta}</p>
                  {p.opciones.map((op, j) => {
                    const esCorrecta = j === c.correcta;
                    const esElegida = j === c.elegida;
                    return (
                      <div key={j} className="flex items-center gap-2 text-xs py-1 px-2 rounded"
                        style={{ background: esCorrecta ? "#0a1f0a" : esElegida ? "#1f0a0a" : "transparent", color: esCorrecta ? "#22c55e" : esElegida ? "#EF4444" : "#9ca3af" }}>
                        {esCorrecta ? <CheckCircle2 size={13} /> : esElegida ? <XCircle size={13} /> : <span className="w-[13px]" />}
                        {op}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="flex gap-3">
              {!resultado.aprobado && (
                <button onClick={reintentar} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#c9a96a", color: "#000" }}>
                  <RotateCcw size={15} /> Reintentar
                </button>
              )}
              <Link href={backHref} className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium border" style={{ borderColor: "#262626", color: "#9ca3af" }}>Volver al área</Link>
            </div>
          </div>
        )}

        {/* Examen */}
        {data.existe && !resultado && modo === "examen" && data.preguntas && (
          <div className="space-y-4">
            {data.preguntas.map((p, i) => (
              <div key={i} className="rounded-xl border p-4" style={{ background: "#111", borderColor: "#1e1e1e" }}>
                <p className="text-sm font-medium text-white mb-3">{i + 1}. {p.pregunta}</p>
                <div className="space-y-2">
                  {p.opciones.map((op, j) => {
                    const sel = respuestas[i] === j;
                    return (
                      <button key={j} onClick={() => setRespuestas((r) => ({ ...r, [i]: j }))}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors"
                        style={{ background: sel ? "#1a1500" : "#0a0a0a", borderColor: sel ? "#c9a96a" : "#262626", color: sel ? "#c9a96a" : "#d1d5db" }}>
                        {op}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={enviar} disabled={enviando} className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: "#c9a96a", color: "#000" }}>
              {enviando ? "Calificando…" : "Enviar respuestas"}
            </button>
          </div>
        )}

        {/* Intro / intentos previos */}
        {data.existe && !resultado && modo === "intro" && (
          <div className="space-y-4">
            <div className="rounded-xl border p-6" style={{ background: "#111", borderColor: "#262626" }}>
              <p className="text-sm text-white mb-1">{data.preguntas?.length} preguntas de opción múltiple</p>
              <p className="text-xs mb-5" style={{ color: "#6b7280" }}>Necesitas {data.minAprobar}% para aprobar. Puedes reintentar las veces que quieras.</p>
              <button onClick={() => setModo("examen")} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#c9a96a", color: "#000" }}>
                {data.intentos?.length ? "Volver a presentar" : "Comenzar evaluación"}
              </button>
              {data.puedeEditar && (
                <button onClick={generar} disabled={generando} className="w-full mt-2 py-2 rounded-lg text-xs font-medium border disabled:opacity-40" style={{ borderColor: "#262626", color: "#9ca3af" }}>
                  <Sparkles size={12} className="inline mr-1" /> {generando ? "Regenerando…" : "Regenerar preguntas con IA"}
                </button>
              )}
            </div>

            {!!data.intentos?.length && (
              <div className="rounded-xl border p-4" style={{ background: "#111", borderColor: "#1e1e1e" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>Tus intentos</p>
                <div className="space-y-2">
                  {data.intentos.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: "#9ca3af" }}>{new Date(it.creadoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono" style={{ color: it.aprobado ? "#22c55e" : "#EF4444" }}>{it.calificacion}%</span>
                        {it.aprobado ? <CheckCircle2 size={14} style={{ color: "#22c55e" }} /> : <XCircle size={14} style={{ color: "#EF4444" }} />}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>{children}</div>;
}
