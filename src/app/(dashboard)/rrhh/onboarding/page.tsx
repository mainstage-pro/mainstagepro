"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan = any;

const ESTADO_COLORS: Record<string, string> = {
  EN_CURSO:  "bg-blue-900/40 text-blue-300",
  COMPLETADO:"bg-green-900/40 text-green-300",
  PAUSADO:   "bg-yellow-900/40 text-yellow-300",
  CANCELADO: "bg-red-900/40 text-red-400",
};

const TIPO_COLORS: Record<string, string> = {
  ALINEACION:    "bg-purple-900/40 text-purple-300",
  TECNICO:       "bg-blue-900/40 text-blue-300",
  ADMINISTRATIVO:"bg-orange-900/40 text-orange-300",
  CULTURAL:      "bg-pink-900/40 text-pink-300",
  PRACTICO:      "bg-green-900/40 text-green-300",
};

function progreso(plan: Plan) {
  const tareas = plan.modulos?.flatMap((m: Plan) => m.tareas) ?? [];
  const total = tareas.length;
  const done = tareas.filter((t: Plan) => t.completada).length;
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export default function OnboardingPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetch("/api/onboarding/planes")
      .then(r => r.json())
      .then(d => setPlanes(d.planes ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, nombre: string, e: React.MouseEvent) {
    e.preventDefault();
    const ok = await confirm({ message: `¿Eliminar el plan de onboarding de "${nombre}"? Se borrarán todos los módulos y tareas.`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const res = await fetch(`/api/onboarding/planes/${id}`, { method: "DELETE" });
    if (res.ok) { setPlanes(prev => prev.filter(p => p.id !== id)); toast.success("Plan eliminado"); }
    else toast.error("Error al eliminar");
  }

  const activos = planes.filter(p => p.estado === "EN_CURSO");
  const otros = planes.filter(p => p.estado !== "EN_CURSO");

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Planes de integración</h1>
          <p className="text-gray-500 text-sm">
            {loading ? "Cargando..." : `${activos.length} activo${activos.length !== 1 ? "s" : ""} · ${otros.length} completado${otros.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/rrhh/onboarding/nuevo"
          className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          + Nuevo plan
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
        </div>
      ) : planes.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-20">
          <p className="text-4xl mb-3">🚀</p>
          <p className="text-gray-400 font-medium mb-1">Sin planes de integración</p>
          <p className="text-gray-600 text-sm mb-4">Crea el primer plan para un nuevo colaborador.</p>
          <Link href="/rrhh/onboarding/nuevo"
            className="inline-block bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
            Crear plan con IA
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activos.length > 0 && (
            <Section label="En curso" count={activos.length} color="text-blue-400">
              {activos.map(p => <PlanCard key={p.id} plan={p} onEliminar={eliminar} />)}
            </Section>
          )}
          {otros.length > 0 && (
            <Section label="Historial" count={otros.length} color="text-gray-500">
              {otros.map(p => <PlanCard key={p.id} plan={p} onEliminar={eliminar} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>{label}</p>
        <span className="text-[10px] text-gray-700 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{count}</span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PlanCard({ plan, onEliminar }: { plan: Plan; onEliminar: (id: string, nombre: string, e: React.MouseEvent) => void }) {
  const { total, done, pct } = progreso(plan);
  const candidato = plan.postulacion?.candidato;
  const modulosCompletos = plan.modulos?.filter((m: Plan) => m.completado).length ?? 0;
  const totalModulos = plan.modulos?.length ?? 0;

  return (
    <Link href={`/rrhh/onboarding/${plan.id}`}>
      <div className="bg-[#111] border border-[#1e1e1e] hover:border-[#333] rounded-xl p-5 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[plan.estado] ?? "bg-gray-800 text-gray-400"}`}>
                {plan.estado.replace("_", " ")}
              </span>
              {plan.area && <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded">{plan.area}</span>}
            </div>
            <h3 className="text-white font-semibold text-lg leading-tight">{plan.nombre}</h3>
            <p className="text-[#B3985B] text-sm">{plan.puesto}</p>
            {candidato && <p className="text-gray-600 text-xs mt-0.5">Candidato: {candidato.nombre}</p>}
          </div>
          <div className="text-right shrink-0">
            {plan.fechaIngreso && (
              <p className="text-white text-sm">
                {(() => { const [y,m,d] = plan.fechaIngreso.substring(0,10).split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"}); })()}
              </p>
            )}
            <p className="text-gray-600 text-xs">fecha de ingreso</p>
          </div>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{done}/{total} tareas completadas</span>
              <span className={`font-semibold ${pct === 100 ? "text-green-400" : "text-[#B3985B]"}`}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Módulos chips */}
        {plan.modulos?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#1a1a1a]">
            {plan.modulos.slice(0, 6).map((m: Plan) => (
              <span key={m.id} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${m.completado ? "bg-green-900/30 text-green-400 line-through opacity-60" : TIPO_COLORS[m.tipo] ?? "bg-gray-800 text-gray-400"}`}>
                {m.nombre}
              </span>
            ))}
            {plan.modulos.length > 6 && (
              <span className="text-[9px] text-gray-600">+{plan.modulos.length - 6} más</span>
            )}
            <span className="ml-auto text-[10px] text-gray-600">{modulosCompletos}/{totalModulos} módulos</span>
          </div>
        )}

        <div className="flex justify-end mt-2">
          <button onClick={e => onEliminar(plan.id, plan.nombre, e)}
            className="text-[#333] hover:text-red-400 text-xs transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </Link>
  );
}
