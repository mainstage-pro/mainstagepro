"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type NurturingData = {
  etapa?: string;
  temperatura?: string;
};

type Prospecto = {
  id: string;
  origenLead: string;
  nurturingData: string | null;
  proximaAccion: string | null;
  fechaProximaAccion: string | null;
  createdAt: string;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  responsable: { id: string; name: string } | null;
};

const TEMPERATURA_CONFIG: Record<string, { icon: string; label: string; cls: string; dot: string }> = {
  FRIO:     { icon: "❄️", label: "Frío",     cls: "border-blue-700/50 bg-blue-900/20 text-blue-300",     dot: "bg-blue-500" },
  TIBIO:    { icon: "🌡️", label: "Tibio",    cls: "border-yellow-600/50 bg-yellow-900/20 text-yellow-300", dot: "bg-yellow-500" },
  CALIENTE: { icon: "🔥", label: "Caliente", cls: "border-red-700/50 bg-red-900/20 text-red-300",         dot: "bg-red-500" },
};

const ETAPA_LABELS: Record<string, string> = {
  PRIMER_CONTACTO: "Primer contacto",
  SEGUIMIENTO_1:   "Seguimiento 1",
  SEGUIMIENTO_2:   "Seguimiento 2",
  SEGUIMIENTO_3:   "Seguimiento 3",
  MADURO:          "Maduro",
};

const ORIGEN_LABELS: Record<string, { icon: string; label: string }> = {
  REDES_SOCIALES: { icon: "📱", label: "Redes sociales" },
  BASE_DATOS:     { icon: "📋", label: "Base de datos" },
  NETWORKING:     { icon: "🤝", label: "Networking" },
};

function fmtFecha(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const hoy = new Date();
  const diff = Math.floor((d.getTime() - hoy.setHours(0,0,0,0)) / 86400000);
  if (diff < 0)  return { label: `Hace ${Math.abs(diff)}d`, color: "text-red-400" };
  if (diff === 0) return { label: "Hoy",                    color: "text-yellow-400" };
  if (diff === 1) return { label: "Mañana",                 color: "text-yellow-300" };
  return { label: `En ${diff}d`, color: "text-gray-400" };
}

export default function ProspectosPage() {
  const router = useRouter();
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTemp, setFiltroTemp] = useState<string>("TODOS");
  const [eliminando, setEliminando] = useState<string | null>(null);

  async function eliminarProspecto(e: React.MouseEvent, id: string, nombre: string) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el prospecto "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(id);
    await fetch(`/api/tratos/${id}`, { method: "DELETE" });
    setProspectos(prev => prev.filter(p => p.id !== id));
    setEliminando(null);
  }

  useEffect(() => {
    fetch("/api/tratos?tipoProspecto=NURTURING")
      .then(r => r.json())
      .then(d => { setProspectos(d.tratos ?? []); setLoading(false); });
  }, []);

  const lista = prospectos.filter(p => {
    if (filtroTemp === "TODOS") return true;
    const nd: NurturingData = p.nurturingData ? JSON.parse(p.nurturingData) : {};
    return nd.temperatura === filtroTemp;
  });

  const counts = {
    TODOS:    prospectos.length,
    FRIO:     prospectos.filter(p => { try { return (JSON.parse(p.nurturingData ?? "{}") as NurturingData).temperatura === "FRIO";     } catch { return false; } }).length,
    TIBIO:    prospectos.filter(p => { try { return (JSON.parse(p.nurturingData ?? "{}") as NurturingData).temperatura === "TIBIO";    } catch { return false; } }).length,
    CALIENTE: prospectos.filter(p => { try { return (JSON.parse(p.nurturingData ?? "{}") as NurturingData).temperatura === "CALIENTE"; } catch { return false; } }).length,
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Prospectos en frío</h1>
          <p className="text-gray-500 text-sm mt-0.5">Outbound · nurturing · construcción de relaciones</p>
        </div>
        <Link href="/prospectos/nuevo"
          className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors">
          + Nuevo prospecto
        </Link>
      </div>

      {/* Filtros de temperatura */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          { id: "TODOS",    label: "Todos" },
          { id: "FRIO",     label: "❄️ Frío" },
          { id: "TIBIO",    label: "🌡️ Tibio" },
          { id: "CALIENTE", label: "🔥 Caliente" },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFiltroTemp(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtroTemp === f.id
                ? "border-emerald-600/60 bg-emerald-900/30 text-emerald-300"
                : "border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444]"
            }`}>
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filtroTemp === f.id ? "bg-emerald-800/60 text-emerald-400" : "bg-[#1a1a1a] text-gray-600"}`}>
              {counts[f.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 bg-[#111] border border-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-white font-semibold mb-1">Sin prospectos {filtroTemp !== "TODOS" ? `con temperatura ${TEMPERATURA_CONFIG[filtroTemp]?.label.toLowerCase()}` : "aún"}</p>
          <p className="text-gray-500 text-sm mb-5">Registra el primer prospecto para arrancar el proceso de nurturing</p>
          <Link href="/prospectos/nuevo"
            className="inline-flex px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors">
            + Nuevo prospecto
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(p => {
            const nd: NurturingData = p.nurturingData ? (() => { try { return JSON.parse(p.nurturingData!); } catch { return {}; } })() : {};
            const temp = TEMPERATURA_CONFIG[nd.temperatura ?? "FRIO"];
            const etapa = ETAPA_LABELS[nd.etapa ?? "PRIMER_CONTACTO"] ?? nd.etapa ?? "Primer contacto";
            const origen = ORIGEN_LABELS[p.origenLead];
            const prox = fmtFecha(p.fechaProximaAccion);

            return (
              <div key={p.id} className="relative group">
                <button onClick={() => router.push(`/crm/tratos/${p.id}`)}
                  className="w-full text-left bg-[#111] border border-[#1e1e1e] hover:border-emerald-900/60 rounded-xl px-4 py-3.5 transition-colors group/row">
                  <div className="flex items-center gap-3">

                    {/* Temperatura dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${temp.dot}`} />

                    {/* Nombre + empresa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm group-hover/row:text-emerald-200 transition-colors">
                          {p.cliente.nombre}
                        </span>
                        {p.cliente.empresa && (
                          <span className="text-gray-500 text-xs">{p.cliente.empresa}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[10px] text-gray-500 bg-[#1a1a1a] border border-[#222] px-1.5 py-0.5 rounded">
                          {etapa}
                        </span>
                        {origen && (
                          <span className="text-[10px] text-gray-600">
                            {origen.icon} {origen.label}
                          </span>
                        )}
                        {prox && (
                          <span className={`text-[10px] font-medium ${prox.color}`}>
                            🗓 {prox.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Temperatura badge */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium shrink-0 ${temp.cls}`}>
                      <span>{temp.icon}</span>
                      <span>{temp.label}</span>
                    </div>

                    {/* Responsable */}
                    {p.responsable && (
                      <span className="text-[10px] text-gray-600 shrink-0 hidden sm:block">
                        {p.responsable.name.split(" ")[0]}
                      </span>
                    )}

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 group-hover/row:text-gray-500 shrink-0 transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </button>

                {/* Eliminar */}
                <button
                  onClick={ev => eliminarProspecto(ev, p.id, p.cliente.nombre)}
                  disabled={eliminando === p.id}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  title="Eliminar prospecto"
                >
                  {eliminando === p.id ? (
                    <span className="text-xs">…</span>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
