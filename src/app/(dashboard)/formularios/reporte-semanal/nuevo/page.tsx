"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getSemanaISO(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const FRASES = [
  "La excelencia no es un acto, es un hábito. Esta semana, reforzamos lo que somos.",
  "Cada reto que superamos juntos nos hace un equipo más fuerte y más unido.",
  "La mejora continua empieza con la honestidad de reconocer lo que podemos hacer mejor.",
  "Detrás de cada gran evento hay un equipo que planeó, ejecutó y aprendió.",
  "Reportar es reflexionar. Y reflexionar es crecer.",
  "Una semana bien analizada vale más que un mes de trabajo sin dirección.",
  "El equipo que comunica bien, rinde bien. Esta semana lo demostramos.",
  "Cada incidencia resuelta es una victoria del equipo sobre los imprevistos.",
  "Comprometerse con mejoras personales es el primer paso para elevar al equipo.",
  "La semana que viene será mejor porque esta semana nos tomamos el tiempo de evaluar.",
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TareaItem {
  titulo: string;
  fechaVencimiento: string;
}
interface Incidencia {
  que: string;
  causa: string;
  propuesta: string;
}
interface SessionInfo {
  id: string;
  name: string;
  area: string | null;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ num, children }: { num: string | number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-7 h-7 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-xs font-bold flex items-center justify-center shrink-0">
        {num}
      </span>
      <h2 className="text-white font-semibold text-sm">{children}</h2>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 md:p-6">
      {children}
    </div>
  );
}

const textareaClass =
  "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none transition-colors placeholder:text-gray-700";
const inputClass =
  "bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] transition-colors placeholder:text-gray-700";

// ─── Main Component ────────────────────────────────────────────────────────────

export default function NuevoReportePage() {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Form state
  const semana = getSemanaISO();
  const anio = new Date().getFullYear();
  const frase = FRASES[(semana - 1) % FRASES.length];

  const [logros, setLogros] = useState("");
  const [pendientes, setPendientes] = useState("");
  const [tareas, setTareas] = useState<TareaItem[]>([{ titulo: "", fechaVencimiento: "" }]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([
    { que: "", causa: "", propuesta: "" },
    { que: "", causa: "", propuesta: "" },
  ]);
  const [mejoras, setMejoras] = useState("");
  const [compromisos, setCompromisos] = useState("");
  const [sugerencias, setSugerencias] = useState("");
  const [bienestar, setBienestar] = useState(7);

  const tareaRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) setSession({ id: d.id, name: d.name, area: d.area ?? null });
        else router.push(`/login?redirect=/formularios/reporte-semanal/nuevo`);
      })
      .catch(() => router.push(`/login?redirect=/formularios/reporte-semanal/nuevo`));
  }, []); // eslint-disable-line

  // ── Tareas helpers ──────────────────────────────────────────────────────────

  function addTarea() {
    setTareas((prev) => [...prev, { titulo: "", fechaVencimiento: "" }]);
    setTimeout(() => tareaRefs.current[tareas.length]?.focus(), 50);
  }

  function updateTarea(i: number, field: keyof TareaItem, value: string) {
    setTareas((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  function removeTarea(i: number) {
    setTareas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleTareaKeyDown(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i === tareas.length - 1) addTarea();
      else tareaRefs.current[i + 1]?.focus();
    }
  }

  // ── Incidencias helpers ─────────────────────────────────────────────────────

  function addIncidencia() {
    setIncidencias((prev) => [...prev, { que: "", causa: "", propuesta: "" }]);
  }

  function updateIncidencia(i: number, field: keyof Incidencia, value: string) {
    setIncidencias((prev) => prev.map((inc, idx) => (idx === i ? { ...inc, [field]: value } : inc)));
  }

  function removeIncidencia(i: number) {
    if (incidencias.length <= 1) return;
    setIncidencias((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { toast.error("Debes estar autenticado"); return; }
    if (!logros.trim()) { toast.error("Por favor completa los logros de la semana"); return; }

    setEnviando(true);
    try {
      const tareasLimpias = tareas.filter((t) => t.titulo.trim()).map((t) => ({
        titulo: t.titulo.trim(),
        fechaVencimiento: t.fechaVencimiento || null,
      }));
      const incidenciasLimpias = incidencias.filter(
        (inc) => inc.que.trim() || inc.causa.trim() || inc.propuesta.trim()
      );

      const res = await fetch("/api/formularios/reporte-semanal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana,
          anio,
          logros,
          pendientes,
          tareas: tareasLimpias,
          incidencias: incidenciasLimpias,
          mejoras,
          compromisos,
          sugerencias,
          bienestar,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al enviar el reporte");
        return;
      }

      toast.success("¡Reporte enviado correctamente! 🎉");
      setTimeout(() => router.push("/formularios/reporte-semanal"), 800);
    } catch {
      toast.error("Error de conexión al enviar");
    } finally {
      setEnviando(false);
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  const bienestarLabel =
    bienestar <= 3 ? "Muy pesado" : bienestar <= 5 ? "Pesado" : bienestar <= 7 ? "Bien" : bienestar <= 9 ? "Muy bien" : "Excelente";
  const bienestarColor =
    bienestar <= 3 ? "text-red-400" : bienestar <= 5 ? "text-orange-400" : bienestar <= 7 ? "text-blue-400" : "text-green-400";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* ── Frase motivacional ── */}
        <div className="bg-gradient-to-br from-[#B3985B]/10 to-[#0d0d0d] border border-[#B3985B]/20 rounded-2xl p-6">
          <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-2">
            Semana {semana} · {anio}
          </p>
          <p className="text-white text-base font-medium leading-relaxed italic">"{frase}"</p>
        </div>

        {/* ── Header de usuario ── */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 flex items-center justify-center text-[#B3985B] font-bold text-sm shrink-0">
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{session.name}</p>
            <p className="text-gray-500 text-xs">{session.area ?? "Sin área asignada"}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-gray-600">Reporte General Semanal</p>
            <p className="text-[#B3985B] text-xs font-semibold">S{semana} · {anio}</p>
          </div>
        </div>

        {/* ── 1. Logros ── */}
        <SectionCard>
          <SectionTitle num={1}>Logros de la semana anterior</SectionTitle>
          <textarea
            className={textareaClass}
            rows={4}
            placeholder="¿Qué logramos esta semana? ¿Qué salió bien?"
            value={logros}
            onChange={(e) => setLogros(e.target.value)}
          />
        </SectionCard>

        {/* ── 2. Pendientes ── */}
        <SectionCard>
          <SectionTitle num={2}>Pendientes de la semana anterior</SectionTitle>
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="¿Qué quedó sin terminar o requiere seguimiento?"
            value={pendientes}
            onChange={(e) => setPendientes(e.target.value)}
          />
        </SectionCard>

        {/* ── 3. Tareas próximas ── */}
        <SectionCard>
          <SectionTitle num={3}>Tareas para la próxima semana</SectionTitle>
          <p className="text-gray-600 text-xs mb-4">
            Escribe cada tarea y su fecha de vencimiento. Presiona Enter para agregar la siguiente.
            Estas tareas quedarán registradas en el módulo de tareas.
          </p>
          <div className="space-y-2">
            {tareas.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-700 text-xs w-5 text-right shrink-0">{i + 1}.</span>
                <input
                  ref={(el) => { tareaRefs.current[i] = el; }}
                  className={`${inputClass} flex-1`}
                  placeholder="Descripción de la tarea..."
                  value={t.titulo}
                  onChange={(e) => updateTarea(i, "titulo", e.target.value)}
                  onKeyDown={(e) => handleTareaKeyDown(e, i)}
                />
                <input
                  type="date"
                  className={`${inputClass} w-36 text-xs`}
                  value={t.fechaVencimiento}
                  onChange={(e) => updateTarea(i, "fechaVencimiento", e.target.value)}
                  title="Fecha de vencimiento (opcional)"
                />
                {tareas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTarea(i)}
                    className="text-gray-700 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTarea}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#B3985B]/70 hover:text-[#B3985B] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar tarea
          </button>
        </SectionCard>

        {/* ── 4. Incidencias ── */}
        <SectionCard>
          <SectionTitle num={4}>Incidencias de la semana</SectionTitle>
          <p className="text-gray-600 text-xs mb-4">
            Registra cualquier problema, imprevisto o situación que requiera atención.
          </p>
          <div className="space-y-4">
            {incidencias.map((inc, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
                    Incidencia {i + 1}
                  </span>
                  {incidencias.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIncidencia(i)}
                      className="text-gray-700 hover:text-red-400 text-xs transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">¿Qué pasó?</label>
                  <textarea
                    className={`${textareaClass} text-xs`}
                    rows={2}
                    placeholder="Describe brevemente la incidencia..."
                    value={inc.que}
                    onChange={(e) => updateIncidencia(i, "que", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Causa raíz</label>
                  <textarea
                    className={`${textareaClass} text-xs`}
                    rows={2}
                    placeholder="¿Por qué ocurrió?"
                    value={inc.causa}
                    onChange={(e) => updateIncidencia(i, "causa", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Propuesta de corrección</label>
                  <textarea
                    className={`${textareaClass} text-xs`}
                    rows={2}
                    placeholder="¿Cómo evitarlo en el futuro?"
                    value={inc.propuesta}
                    onChange={(e) => updateIncidencia(i, "propuesta", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIncidencia}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#B3985B]/70 hover:text-[#B3985B] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar incidencia
          </button>
        </SectionCard>

        {/* ── 5. Mejoras de otras áreas ── */}
        <SectionCard>
          <SectionTitle num={5}>Mejoras observadas en otras áreas</SectionTitle>
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="¿Observaste algo en otras áreas que se podría mejorar o reconocer?"
            value={mejoras}
            onChange={(e) => setMejoras(e.target.value)}
          />
        </SectionCard>

        {/* ── 6. Compromisos ── */}
        <SectionCard>
          <SectionTitle num={6}>Compromisos de mejora personal</SectionTitle>
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="¿En qué te comprometes a mejorar la próxima semana?"
            value={compromisos}
            onChange={(e) => setCompromisos(e.target.value)}
          />
        </SectionCard>

        {/* ── 7. Sugerencias ── */}
        <SectionCard>
          <SectionTitle num={7}>Comentarios, solicitudes o sugerencias a dirección</SectionTitle>
          <textarea
            className={textareaClass}
            rows={3}
            placeholder="¿Qué quieres comunicar a la dirección? Propuestas, necesidades, reconocimientos..."
            value={sugerencias}
            onChange={(e) => setSugerencias(e.target.value)}
          />
        </SectionCard>

        {/* ── 8. Bienestar ── */}
        <SectionCard>
          <SectionTitle num={8}>¿Cómo empiezas la semana?</SectionTitle>
          <p className="text-gray-600 text-xs mb-5">
            Califica tu estado de ánimo y energía para esta semana del 1 al 10.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-xs">Pesado</span>
              <div className="text-center">
                <span className={`text-3xl font-bold ${bienestarColor} transition-colors`}>
                  {bienestar}
                </span>
                <p className={`text-xs mt-0.5 font-medium ${bienestarColor} transition-colors`}>
                  {bienestarLabel}
                </p>
              </div>
              <span className="text-gray-600 text-xs">Excelente</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={bienestar}
              onChange={(e) => setBienestar(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #B3985B ${(bienestar - 1) * 100 / 9}%, #2a2a2a ${(bienestar - 1) * 100 / 9}%)`,
              }}
            />
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBienestar(n)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                    bienestar === n
                      ? "bg-[#B3985B] text-black scale-110"
                      : "bg-[#1a1a1a] text-gray-600 hover:bg-[#2a2a2a] hover:text-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <div className="pb-8">
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            {enviando ? "Enviando reporte..." : "Enviar reporte semanal ✓"}
          </button>
          <p className="text-center text-gray-700 text-xs mt-3">
            Una vez enviado, el reporte quedará registrado y no podrá editarse.
          </p>
        </div>

      </form>
    </div>
  );
}
