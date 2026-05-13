"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AREA_LABELS, AREA_COLORS, TIPO_AGENDA_LABELS, type AreaJunta, type TipoAgenda } from "@/lib/junta-templates";

type AgendaItem = {
  id: string;
  orden: number;
  tipo: string;
  titulo: string;
  respuesta: string | null;
  completado: boolean;
};

type TareaJunta = {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
  proyectoTarea: { id: string; nombre: string } | null;
};

type Junta = {
  id: string;
  titulo: string;
  area: string;
  fecha: string;
  duracionMin: number;
  estado: string;
  notas: string | null;
  resumen: string | null;
  facilitador: { id: string; name: string };
  agendaItems: AgendaItem[];
  participantes: { user: { id: string; name: string } }[];
  tareas: TareaJunta[];
};

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtVenc(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

const PRIORIDAD_COLORS: Record<string, string> = {
  URGENTE: "text-red-400", ALTA: "text-orange-400", MEDIA: "text-[#B3985B]", BAJA: "text-gray-500",
};

export default function ReporteJuntaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [junta, setJunta]           = useState<Junta | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generando, setGenerando]   = useState(false);

  useEffect(() => {
    fetch(`/api/juntas/${id}`)
      .then((r) => r.json())
      .then((d) => { setJunta(d.junta ?? null); setLoading(false); });
  }, [id]);

  async function regenerarResumen() {
    setGenerando(true);
    const res = await fetch(`/api/juntas/${id}/resumen`, { method: "POST" });
    if (res.ok) {
      const { resumen } = await res.json();
      setJunta((prev) => prev ? { ...prev, resumen } : prev);
    }
    setGenerando(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-600 text-sm">
        Cargando reporte...
      </div>
    );
  }

  if (!junta) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white">Junta no encontrada. <Link href="/juntas" className="text-[#B3985B]">Volver</Link></p>
      </div>
    );
  }

  const colors    = AREA_COLORS[junta.area as AreaJunta] ?? AREA_COLORS.GLOBAL;
  const areaLabel = AREA_LABELS[junta.area as AreaJunta] ?? junta.area;
  const participantesStr = junta.participantes.map((p) => p.user.name).join(", ") || "—";
  const itemsCubiertos = junta.agendaItems.filter((i) => i.completado).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#1a1a1a] flex items-center gap-4 flex-wrap">
        <Link href="/juntas" className="text-gray-600 hover:text-white text-sm transition-colors">
          ← Juntas
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {areaLabel}
            </span>
            <span className="text-xs text-gray-600">REPORTE</span>
          </div>
          <h1 className="text-lg font-bold truncate">{junta.titulo}</h1>
          <p className="text-gray-500 text-xs">
            {fmtFecha(junta.fecha)} · {fmtHora(junta.fecha)} · {junta.facilitador.name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/juntas/${id}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:border-[#444] transition-colors"
          >
            ← Editar junta
          </Link>
          <button
            onClick={() => window.print()}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Duración",      val: `${junta.duracionMin} min` },
            { label: "Facilitador",   val: junta.facilitador.name },
            { label: "Agenda cubierta", val: `${itemsCubiertos}/${junta.agendaItems.length}` },
            { label: "Tareas generadas", val: String(junta.tareas.length) },
          ].map((item) => (
            <div key={item.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
              <p className="text-white font-semibold mt-1">{item.val}</p>
            </div>
          ))}
        </div>

        {participantesStr !== "—" && (
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Participantes</p>
            <p className="text-gray-300 text-sm">{participantesStr}</p>
          </div>
        )}

        {/* Resumen ejecutivo */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#B3985B] uppercase tracking-wider">Resumen ejecutivo</p>
            <button
              onClick={regenerarResumen}
              disabled={generando}
              className="text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors disabled:opacity-50"
            >
              {generando ? "Generando..." : "Regenerar IA ↺"}
            </button>
          </div>
          <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
            {junta.resumen ? (
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{junta.resumen}</p>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm mb-2">Sin resumen generado</p>
                <button
                  onClick={regenerarResumen}
                  disabled={generando}
                  className="text-xs text-[#B3985B] hover:underline disabled:opacity-50"
                >
                  {generando ? "Generando con IA..." : "Generar resumen →"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Agenda cubierta */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Agenda y puntos cubiertos</p>
          <div className="space-y-3">
            {junta.agendaItems.map((item) => {
              const tipoLabel = TIPO_AGENDA_LABELS[item.tipo as TipoAgenda] ?? item.tipo;
              return (
                <div key={item.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0d0d0d]">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      item.completado ? "text-green-400" : "text-gray-600"
                    }`}>
                      {item.completado ? "✓" : "○"} {tipoLabel}
                    </span>
                    <p className={`text-sm font-medium ${item.completado ? "text-white" : "text-gray-500"}`}>
                      {item.titulo}
                    </p>
                  </div>
                  {item.respuesta ? (
                    <div className="px-4 py-3">
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.respuesta}</p>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-gray-700 text-xs italic">Sin respuesta registrada</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tareas generadas */}
        {junta.tareas.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Tareas generadas ({junta.tareas.length})
            </p>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-[#0d0d0d]">
                <span className="text-[10px] text-gray-600 uppercase">Tarea</span>
                <span className="text-[10px] text-gray-600 uppercase">Asignado</span>
                <span className="text-[10px] text-gray-600 uppercase">Prioridad</span>
                <span className="text-[10px] text-gray-600 uppercase">Fecha</span>
              </div>
              {junta.tareas.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-[#0d0d0d] last:border-0 hover:bg-[#0d0d0d] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{t.titulo}</p>
                    {t.proyectoTarea && (
                      <p className="text-[10px] text-gray-600 truncate">{t.proyectoTarea.nombre}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {t.asignadoA?.name ?? "—"}
                  </span>
                  <span className={`text-xs font-semibold whitespace-nowrap ${PRIORIDAD_COLORS[t.prioridad] ?? "text-gray-500"}`}>
                    {t.prioridad}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {fmtVenc(t.fechaVencimiento)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas generales */}
        {junta.notas && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Notas generales</p>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{junta.notas}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#1a1a1a] pt-6 text-center">
          <p className="text-gray-700 text-xs">
            Reporte generado · Mainstage Pro · {new Date().toLocaleDateString("es-MX")}
          </p>
          <Link href="/juntas" className="text-xs text-[#B3985B] hover:underline mt-1 inline-block">
            ← Ver todas las juntas
          </Link>
        </div>
      </div>
    </div>
  );
}
