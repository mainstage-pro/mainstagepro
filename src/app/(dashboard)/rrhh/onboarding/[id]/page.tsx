"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Combobox } from "@/components/Combobox";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

const TIPO_MODULO_COLORS: Record<string, string> = {
  ALINEACION:    "border-l-purple-500 bg-purple-900/5",
  TECNICO:       "border-l-blue-500 bg-blue-900/5",
  ADMINISTRATIVO:"border-l-orange-500 bg-orange-900/5",
  CULTURAL:      "border-l-pink-500 bg-pink-900/5",
  PRACTICO:      "border-l-green-500 bg-green-900/5",
};
const TIPO_MODULO_LABEL: Record<string, string> = {
  ALINEACION: "Alineación", TECNICO: "Técnico",
  ADMINISTRATIVO: "Administrativo", CULTURAL: "Cultural", PRACTICO: "Práctico",
};
const TIPO_TAREA_ICON: Record<string, string> = {
  LECTURA: "📖", VIDEO: "🎥", PRACTICA: "🔧",
  EVALUACION: "📝", REUNION: "👥", SHADOWING: "👁️",
};
const ESTADO_OPTIONS = ["EN_CURSO", "PAUSADO", "COMPLETADO", "CANCELADO"];
const ESTADO_COLORS: Record<string, string> = {
  EN_CURSO: "text-blue-400", COMPLETADO: "text-green-400",
  PAUSADO: "text-yellow-400", CANCELADO: "text-red-400",
};

export default function OnboardingDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [plan, setPlan] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  const [actualizando, setActualizando] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/onboarding/planes/${id}`)
      .then(r => r.json())
      .then(d => {
        setPlan(d.plan ?? null);
        // Abrir el primer módulo incompleto automáticamente
        if (d.plan?.modulos) {
          const primerIncompleto = d.plan.modulos.find((m: AnyObj) => !m.completado);
          if (primerIncompleto) setExpandido(new Set([primerIncompleto.id]));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function toggleModulo(moduloId: string) {
    setExpandido(prev => {
      const next = new Set(prev);
      if (next.has(moduloId)) next.delete(moduloId);
      else next.add(moduloId);
      return next;
    });
  }

  async function toggleTarea(tarea: AnyObj, moduloId: string) {
    if (actualizando.has(tarea.id)) return;
    setActualizando(prev => new Set(prev).add(tarea.id));

    const nuevaCompletada = !tarea.completada;

    // Optimistic update
    setPlan((prev: AnyObj) => ({
      ...prev,
      modulos: prev.modulos.map((m: AnyObj) =>
        m.id !== moduloId ? m : {
          ...m,
          completado: m.tareas.every((t: AnyObj) =>
            t.id === tarea.id ? nuevaCompletada : t.completada
          ),
          tareas: m.tareas.map((t: AnyObj) =>
            t.id === tarea.id
              ? { ...t, completada: nuevaCompletada, completadaEn: nuevaCompletada ? new Date().toISOString() : null }
              : t
          ),
        }
      ),
    }));

    try {
      const res = await fetch(`/api/onboarding/tareas/${tarea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: nuevaCompletada }),
      });
      if (!res.ok) {
        toast.error("Error al actualizar tarea");
        // Revertir
        setPlan((prev: AnyObj) => ({
          ...prev,
          modulos: prev.modulos.map((m: AnyObj) =>
            m.id !== moduloId ? m : {
              ...m,
              tareas: m.tareas.map((t: AnyObj) =>
                t.id === tarea.id ? { ...t, completada: tarea.completada } : t
              ),
            }
          ),
        }));
      }
    } finally {
      setActualizando(prev => { const n = new Set(prev); n.delete(tarea.id); return n; });
    }
  }

  async function cambiarEstado(estado: string) {
    const res = await fetch(`/api/onboarding/planes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      setPlan((prev: AnyObj) => ({ ...prev, estado }));
      toast.success("Estado actualizado");
    }
  }

  if (loading) return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="h-8 w-64 bg-[#1a1a1a] rounded-lg animate-pulse" />
      <div className="h-4 w-48 bg-[#1a1a1a] rounded animate-pulse" />
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!plan) return (
    <div className="p-6 text-center">
      <p className="text-red-400">Plan no encontrado</p>
      <Link href="/rrhh/onboarding" className="text-[#B3985B] text-sm mt-2 block hover:underline">← Volver</Link>
    </div>
  );

  const todasTareas = plan.modulos?.flatMap((m: AnyObj) => m.tareas) ?? [];
  const totalTareas = todasTareas.length;
  const tareasCompletadas = todasTareas.filter((t: AnyObj) => t.completada).length;
  const pct = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
  const modulosCompletos = plan.modulos?.filter((m: AnyObj) => m.completado).length ?? 0;
  const candidato = plan.postulacion?.candidato;

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link href="/rrhh/onboarding" className="text-gray-600 hover:text-white text-xs transition-colors">
          ← Planes de integración
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-xl font-semibold text-white">{plan.nombre}</h1>
            <p className="text-[#B3985B] text-sm font-medium">{plan.puesto}</p>
            {plan.area && <p className="text-gray-600 text-xs">{plan.area}</p>}
            {candidato && (
              <p className="text-gray-600 text-xs mt-0.5">
                Candidato: <span className="text-gray-400">{candidato.nombre}</span>
                {candidato.telefono && (
                  <a href={`https://wa.me/52${candidato.telefono.replace(/\D/g,"")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-green-400 hover:underline">{candidato.telefono}</a>
                )}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <Combobox
              value={plan.estado}
              onChange={v => cambiarEstado(v)}
              options={ESTADO_OPTIONS.map(e => ({ value: e, label: e.replace("_", " ") }))}
              className={`bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#B3985B]/50 ${ESTADO_COLORS[plan.estado] ?? "text-gray-400"}`}
            />
            {plan.fechaIngreso && (
              <p className="text-gray-600 text-xs mt-1">
                Ingreso: {new Date(plan.fechaIngreso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progreso global */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Progreso general</p>
          <span className={`text-2xl font-bold ${pct === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pct}%</span>
        </div>
        <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Tareas", value: `${tareasCompletadas}/${totalTareas}` },
            { label: "Módulos", value: `${modulosCompletos}/${plan.modulos?.length ?? 0}` },
            { label: "Restantes", value: `${totalTareas - tareasCompletadas}` },
          ].map(k => (
            <div key={k.label} className="bg-[#0d0d0d] rounded-lg py-2">
              <p className="text-white text-lg font-bold">{k.value}</p>
              <p className="text-gray-600 text-[10px]">{k.label}</p>
            </div>
          ))}
        </div>
        {pct === 100 && (
          <div className="mt-3 bg-green-900/20 border border-green-800/40 rounded-lg px-4 py-2 text-center">
            <p className="text-green-400 font-semibold text-sm">🎉 ¡Plan de integración completado!</p>
          </div>
        )}
      </div>

      {/* Módulos */}
      <div className="space-y-2">
        {plan.modulos?.map((modulo: AnyObj, mi: number) => {
          const tareasM = modulo.tareas ?? [];
          const doneM = tareasM.filter((t: AnyObj) => t.completada).length;
          const pctM = tareasM.length > 0 ? Math.round((doneM / tareasM.length) * 100) : 0;
          const isOpen = expandido.has(modulo.id);

          return (
            <div key={modulo.id}
              className={`border-l-4 border rounded-xl overflow-hidden ${TIPO_MODULO_COLORS[modulo.tipo] ?? "border-l-gray-600 bg-[#111]"} border-r-[#1e1e1e] border-t-[#1e1e1e] border-b-[#1e1e1e]`}>

              {/* Cabecera del módulo */}
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                onClick={() => toggleModulo(modulo.id)}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${modulo.completado ? "bg-green-500 text-black" : "bg-[#1a1a1a] text-gray-400"}`}>
                  {modulo.completado ? "✓" : mi + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${modulo.completado ? "text-gray-500 line-through" : "text-white"}`}>
                      {modulo.nombre}
                    </p>
                    <span className="text-[9px] text-gray-600 bg-[#111] px-1.5 py-0.5 rounded">
                      {TIPO_MODULO_LABEL[modulo.tipo] ?? modulo.tipo}
                    </span>
                    {modulo.duracionDias && (
                      <span className="text-[9px] text-gray-700">{modulo.duracionDias}d</span>
                    )}
                  </div>
                  {modulo.descripcion && (
                    <p className="text-gray-600 text-[11px] truncate">{modulo.descripcion}</p>
                  )}
                </div>
                <div className="shrink-0 text-right flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">{doneM}/{tareasM.length}</p>
                    <div className="w-16 h-1 bg-[#111] rounded-full overflow-hidden mt-0.5">
                      <div className={`h-full rounded-full ${modulo.completado ? "bg-green-500" : "bg-[#B3985B]"}`} style={{ width: `${pctM}%` }} />
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Tareas */}
              {isOpen && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {tareasM.length === 0 ? (
                    <p className="text-gray-600 text-sm px-4 py-4 text-center">Sin tareas en este módulo</p>
                  ) : tareasM.map((tarea: AnyObj) => (
                    <div key={tarea.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${tarea.completada ? "bg-green-900/5" : "hover:bg-white/5"}`}>
                      <button
                        onClick={() => toggleTarea(tarea, modulo.id)}
                        disabled={actualizando.has(tarea.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          tarea.completada
                            ? "bg-green-500 border-green-500 text-black"
                            : "border-[#333] hover:border-[#B3985B]"
                        } ${actualizando.has(tarea.id) ? "opacity-50" : ""}`}
                      >
                        {tarea.completada && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                      <span className="text-base shrink-0 mt-0.5">{TIPO_TAREA_ICON[tarea.tipo] ?? "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${tarea.completada ? "text-gray-600 line-through" : "text-white"}`}>
                          {tarea.titulo}
                        </p>
                        {tarea.descripcion && (
                          <p className="text-gray-500 text-xs mt-0.5">{tarea.descripcion}</p>
                        )}
                        {tarea.recurso && (
                          <p className="text-[#B3985B] text-[11px] mt-0.5">↗ {tarea.recurso}</p>
                        )}
                        {tarea.completada && tarea.completadaEn && (
                          <p className="text-green-600 text-[10px] mt-0.5">
                            Completada {new Date(tarea.completadaEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-700 text-[10px] shrink-0 uppercase hidden sm:block">{tarea.tipo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notas */}
      {plan.notas && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">Notas</p>
          <p className="text-gray-400 text-sm whitespace-pre-wrap">{plan.notas}</p>
        </div>
      )}
    </div>
  );
}
