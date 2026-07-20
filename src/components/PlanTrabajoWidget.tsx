"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface AreaResumen {
  id: string;
  nombre: string;
  color: string;
  icono: string | null;
  entregablesPendientes: number;
  vencidas: number;
  efectividad: number;
}

interface EntregablePendiente {
  id: string;
  template: { nombre: string; area: { nombre: string; color: string } };
  responsable: { name: string };
  fechaVencimiento: string;
}

interface DashboardData {
  areas: AreaResumen[];
  entregablesPendientesHoy: EntregablePendiente[];
  totalVencidas: number;
}

export default function PlanTrabajoWidget() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plan-trabajo/dashboard")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl h-24" />
        ))}
      </div>
    );
  }

  // Si no hay áreas (seed no ejecutado aún), no mostrar nada
  if (!data || data.areas.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-6 text-center">
        <p className="text-gray-600 text-sm">Las plantillas aún no han sido cargadas.</p>
        <Link href="/plan-trabajo" className="text-[#B3985B] text-xs hover:underline mt-1 inline-block">
          Ir a Plan de Trabajo para configurar →
        </Link>
      </div>
    );
  }

  const todasAlDia = data.totalVencidas === 0 && data.entregablesPendientesHoy.length === 0;

  return (
    <div className="space-y-4">
      {/* Badge de estado global */}
      <div className="flex items-center gap-2 flex-wrap">
        {data.totalVencidas > 0 && (
          <span className="flex items-center gap-1.5 bg-red-900/20 border border-red-900/40 text-red-400 text-xs font-semibold px-3 py-1 rounded-full">
            <AlertTriangle strokeWidth={1.75} className="w-3.5 h-3.5" /> {data.totalVencidas} vencida{data.totalVencidas !== 1 ? "s" : ""}
          </span>
        )}
        {todasAlDia && (
          <span className="flex items-center gap-1.5 bg-green-900/20 border border-green-900/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
            ✓ Todo al día
          </span>
        )}
      </div>

      {/* 4 cards de área */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.areas.map(area => (
          <Link key={area.id} href="/plan-trabajo"
            className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
              <span className="text-xs text-white/70 font-medium truncate">{area.nombre}</span>
              {area.icono && <span className="text-base ml-auto">{area.icono}</span>}
            </div>
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-600">Entregables hoy</span>
                <span className={area.entregablesPendientes > 0 ? "text-yellow-400 font-semibold" : "text-gray-700"}>
                  {area.entregablesPendientes}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-600">Vencidas</span>
                <span className={area.vencidas > 0 ? "text-red-400 font-semibold" : "text-gray-700"}>
                  {area.vencidas}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600 text-[9px] uppercase tracking-wider">Efectividad</span>
                <span className="text-white text-[10px] font-bold">{area.efectividad}%</span>
              </div>
              <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${area.efectividad}%`, backgroundColor: area.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Entregables pendientes hoy */}
      {data.entregablesPendientesHoy.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Entregables pendientes hoy</p>
            <Link href="/plan-trabajo" className="text-[#B3985B] text-xs hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {data.entregablesPendientesHoy.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{e.template.nombre}</p>
                  <p className="text-gray-600 text-[10px]">{e.template.area.nombre} · {e.responsable?.name ?? "Sin asignar"}</p>
                </div>
                <p className="text-yellow-400 text-[10px] font-semibold ml-3 shrink-0">
                  {new Date(e.fechaVencimiento).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.entregablesPendientesHoy.length === 0 && (
        <p className="text-green-400/50 text-xs text-center py-1">✓ Todos los entregables del día están al día</p>
      )}
    </div>
  );
}
