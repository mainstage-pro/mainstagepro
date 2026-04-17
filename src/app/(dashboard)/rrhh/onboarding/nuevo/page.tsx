"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface TareaGen {
  titulo: string; descripcion: string; tipo: string; orden: number; recurso: string | null;
}
interface ModuloGen {
  nombre: string; tipo: string; orden: number; duracionDias: number;
  descripcion: string; tareas: TareaGen[];
}
interface PlanGen {
  resumen: string; duracionTotalDias: number; modulos: ModuloGen[];
}

const TIPO_MODULO_COLORS: Record<string, string> = {
  ALINEACION:    "border-purple-500/40 bg-purple-900/10",
  TECNICO:       "border-blue-500/40 bg-blue-900/10",
  ADMINISTRATIVO:"border-orange-500/40 bg-orange-900/10",
  CULTURAL:      "border-pink-500/40 bg-pink-900/10",
  PRACTICO:      "border-green-500/40 bg-green-900/10",
};
const TIPO_MODULO_BADGE: Record<string, string> = {
  ALINEACION:    "bg-purple-900/40 text-purple-300",
  TECNICO:       "bg-blue-900/40 text-blue-300",
  ADMINISTRATIVO:"bg-orange-900/40 text-orange-300",
  CULTURAL:      "bg-pink-900/40 text-pink-300",
  PRACTICO:      "bg-green-900/40 text-green-300",
};
const TIPO_TAREA_ICON: Record<string, string> = {
  LECTURA: "📖", VIDEO: "🎥", PRACTICA: "🔧", EVALUACION: "📝",
  REUNION: "👥", SHADOWING: "👁️",
};

export default function NuevoOnboardingPage() {
  const router = useRouter();
  const toast = useToast();

  // Formulario de entrada
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("");
  const [area, setArea] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [descripcionPuesto, setDescripcionPuesto] = useState("");
  const [notasAdicionales, setNotasAdicionales] = useState("");

  // Estado IA
  const [generando, setGenerando] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [planGenerado, setPlanGenerado] = useState<PlanGen | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  // Guardado
  const [guardando, setGuardando] = useState(false);

  async function generarConIA() {
    if (!puesto.trim()) { toast.error("Indica el puesto antes de generar"); return; }
    setGenerando(true);
    setStreamText("");
    setPlanGenerado(null);
    setErrorIA(null);

    try {
      const res = await fetch("/api/onboarding/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puesto, area, descripcionPuesto, notasAdicionales }),
      });

      if (!res.ok) {
        const d = await res.json();
        setErrorIA(d.error ?? "Error al generar");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamText(accumulated);

        if (accumulated.includes("__ERROR__:")) {
          setErrorIA(accumulated.split("__ERROR__:")[1].trim());
          break;
        }
      }

      // Intentar parsear el JSON final
      try {
        const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const plan = JSON.parse(jsonMatch[0]) as PlanGen;
          setPlanGenerado(plan);
          setStreamText("");
        }
      } catch {
        setErrorIA("La IA devolvió un formato inesperado. Intenta de nuevo.");
      }
    } catch (e) {
      setErrorIA(String(e));
    } finally {
      setGenerando(false);
    }
  }

  async function guardarPlan() {
    if (!nombre.trim()) { toast.error("Agrega el nombre del colaborador"); return; }
    if (!puesto.trim()) { toast.error("Agrega el puesto"); return; }
    if (!planGenerado) { toast.error("Genera o diseña el plan primero"); return; }

    setGuardando(true);
    try {
      const res = await fetch("/api/onboarding/planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, puesto, area: area || null,
          fechaIngreso: fechaIngreso || null,
          modulos: planGenerado.modulos,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Plan creado correctamente");
        router.push(`/rrhh/onboarding/${d.plan.id}`);
      } else {
        toast.error(d.error ?? "Error al guardar");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Nuevo plan de integración</h1>
        <p className="text-gray-500 text-sm">Completa la información del puesto y usa la IA para generar el plan completo.</p>
      </div>

      {/* ── DATOS DEL COLABORADOR ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Datos del colaborador</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre completo *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Juan García López"
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Puesto *</label>
            <input value={puesto} onChange={e => setPuesto(e.target.value)}
              placeholder="Ej: Técnico de audio, Coordinador de producción"
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Área</label>
            <input value={area} onChange={e => setArea(e.target.value)}
              placeholder="Ej: Operaciones, Ventas, Administración"
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha de ingreso</label>
            <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
          </div>
        </div>
      </div>

      {/* ── CONTEXTO PARA LA IA ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Contexto para la IA</p>
          <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded-full">Más contexto = mejor plan</span>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Descripción del puesto y responsabilidades</label>
          <textarea value={descripcionPuesto} onChange={e => setDescripcionPuesto(e.target.value)}
            rows={4}
            placeholder="Describe qué hará esta persona en su día a día: responsabilidades principales, con quién trabajará, qué sistemas usará, qué habilidades necesita desarrollar..."
            className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50 resize-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notas adicionales / Contexto especial</label>
          <textarea value={notasAdicionales} onChange={e => setNotasAdicionales(e.target.value)}
            rows={3}
            placeholder="¿Hay algo específico que deba aprender primero? ¿Alguna situación especial? ¿Qué tan técnico es el perfil? ¿Tendrá personal a cargo?"
            className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50 resize-none" />
        </div>
        <button
          onClick={generarConIA}
          disabled={generando || !puesto.trim()}
          className="w-full bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {generando ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Generando plan con IA...
            </>
          ) : planGenerado ? (
            "✨ Regenerar plan"
          ) : (
            "✨ Generar plan con IA"
          )}
        </button>
      </div>

      {/* ── STREAMING OUTPUT ── */}
      {generando && streamText && (
        <div className="bg-[#0a0a0a] border border-[#B3985B]/30 rounded-xl p-4">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-2">Generando...</p>
          <pre className="text-gray-400 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {streamText.slice(-600)}
          </pre>
        </div>
      )}

      {/* ── ERROR IA ── */}
      {errorIA && (
        <div className="bg-red-900/10 border border-red-800/40 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium mb-1">Error al generar</p>
          <p className="text-red-400/70 text-xs">{errorIA}</p>
          {errorIA.includes("ANTHROPIC_API_KEY") && (
            <p className="text-gray-500 text-xs mt-2">
              Ve a Vercel → Settings → Environment Variables y agrega{" "}
              <code className="text-[#B3985B]">ANTHROPIC_API_KEY</code> con tu clave de Anthropic.
            </p>
          )}
        </div>
      )}

      {/* ── PLAN GENERADO ── */}
      {planGenerado && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="bg-[#B3985B]/10 border border-[#B3985B]/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🎯</span>
              <div>
                <p className="text-[#B3985B] font-semibold text-sm mb-0.5">Plan generado</p>
                <p className="text-white text-sm">{planGenerado.resumen}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Duración estimada: {planGenerado.duracionTotalDias} días · {planGenerado.modulos.length} módulos · {planGenerado.modulos.reduce((s, m) => s + m.tareas.length, 0)} tareas
                </p>
              </div>
            </div>
          </div>

          {/* Módulos */}
          <div className="space-y-3">
            {planGenerado.modulos.map((modulo, mi) => (
              <div key={mi} className={`border rounded-xl overflow-hidden ${TIPO_MODULO_COLORS[modulo.tipo] ?? "border-[#222] bg-[#111]"}`}>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-white font-semibold text-xs bg-[#0d0d0d] rounded-full w-6 h-6 flex items-center justify-center shrink-0">{modulo.orden}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm">{modulo.nombre}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${TIPO_MODULO_BADGE[modulo.tipo] ?? "bg-gray-800 text-gray-400"}`}>
                          {modulo.tipo}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">{modulo.descripcion}</p>
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs shrink-0">{modulo.duracionDias}d</span>
                </div>
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {modulo.tareas.map((tarea, ti) => (
                    <div key={ti} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-base shrink-0 mt-0.5">{TIPO_TAREA_ICON[tarea.tipo] ?? "📌"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-medium">{tarea.titulo}</p>
                        <p className="text-gray-500 text-[11px]">{tarea.descripcion}</p>
                        {tarea.recurso && (
                          <p className="text-[#B3985B] text-[10px] mt-0.5">↗ {tarea.recurso}</p>
                        )}
                      </div>
                      <span className="text-gray-700 text-[10px] shrink-0 uppercase">{tarea.tipo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Botón guardar */}
          <div className="flex gap-3 pt-2">
            <button onClick={generarConIA} disabled={generando}
              className="flex-1 border border-[#333] text-gray-400 hover:text-white text-sm py-2.5 rounded-lg transition-colors">
              Regenerar
            </button>
            <button onClick={guardarPlan} disabled={guardando || !nombre.trim()}
              className="flex-1 bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors">
              {guardando ? "Guardando..." : "Guardar plan →"}
            </button>
          </div>
          {!nombre.trim() && (
            <p className="text-yellow-400 text-xs text-center">Completa el nombre del colaborador antes de guardar.</p>
          )}
        </div>
      )}
    </div>
  );
}
