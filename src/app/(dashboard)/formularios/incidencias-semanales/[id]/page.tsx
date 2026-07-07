"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type Urgencia = "critico" | "importante" | "revisar" | "none";

interface IncidenciaItem {
  area: string;
  texto: string;
  causa?: string;
  solucion?: string;
  urgencia: Urgencia;
  orden: number;
}

interface Registro {
  id: string;
  semana: number;
  anio: number;
  incidencias: IncidenciaItem[];
  estado: string;
  createdAt: string;
  user: { id: string; name: string; area: string | null };
}

const AREAS: { key: string; label: string; badgeClass: string }[] = [
  { key: "admin",   label: "Administración",      badgeClass: "bg-indigo-900/30 text-indigo-300 border-indigo-700/40" },
  { key: "mkt",     label: "Marketing",            badgeClass: "bg-pink-900/30 text-pink-300 border-pink-700/40" },
  { key: "ventas",  label: "Ventas",               badgeClass: "bg-green-900/30 text-green-300 border-green-700/40" },
  { key: "prod",    label: "Producción",            badgeClass: "bg-amber-900/30 text-amber-300 border-amber-700/40" },
  { key: "eventos", label: "Operación de Eventos",  badgeClass: "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/30" },
];

const URGENCIA_CONFIG: Record<Urgencia, { label: string; emoji: string; borderClass: string; badgeClass: string; printClass: string }> = {
  critico:    { label: "Crítico",    emoji: "🔴", borderClass: "border-l-red-500",    badgeClass: "bg-red-900/30 text-red-300 border-red-700/40",    printClass: "print-critico" },
  importante: { label: "Importante", emoji: "🟡", borderClass: "border-l-yellow-500", badgeClass: "bg-yellow-900/30 text-yellow-300 border-yellow-700/40", printClass: "print-importante" },
  revisar:    { label: "A revisar",  emoji: "🟢", borderClass: "border-l-green-500",  badgeClass: "bg-green-900/30 text-green-300 border-green-700/40",  printClass: "print-revisar" },
  none:       { label: "Sin clasificar", emoji: "⚪", borderClass: "border-l-[#333]", badgeClass: "bg-[#1a1a1a] text-gray-600 border-[#2a2a2a]",        printClass: "" },
};


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function IncidenciaDetallePage() {
  const params = useParams();
  const toast = useToast();
  const id = params.id as string;

  const [registro, setRegistro] = useState<Registro | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/formularios/incidencias-semanales/${id}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404 || r.status === 403) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d?.registro) setRegistro(d.registro); })
      .catch(() => toast.error("Error al cargar"))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !registro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-white font-semibold mb-2">Registro no encontrado</p>
        <p className="text-gray-500 text-sm mb-6">No existe o no tienes acceso.</p>
        <Link href="/formularios/incidencias-semanales" className="text-[#B3985B] hover:underline text-sm">← Volver</Link>
      </div>
    );
  }

  const incs = Array.isArray(registro.incidencias) ? registro.incidencias : [];
  const total = incs.length;
  const criticas = incs.filter(i => i.urgencia === "critico").length;

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print-critico { border-left-color: #ef4444 !important; border-left-width: 4px !important; background: #fff5f5 !important; }
          .print-importante { border-left-color: #eab308 !important; border-left-width: 4px !important; background: #fefce8 !important; }
          .print-revisar { border-left-color: #22c55e !important; border-left-width: 4px !important; background: #f0fdf4 !important; }
          * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* Print header */}
        <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
          <p className="text-xl font-bold text-black">Mainstage Pro — Incidencias Semanales</p>
          <p className="text-sm text-gray-600">Semana {registro.semana} · {registro.anio} — {fmtDate(registro.createdAt)}</p>
          <p className="text-sm font-semibold text-black mt-1">{registro.user.name}{registro.user.area ? ` · ${registro.user.area}` : ""}</p>
        </div>

        {/* Screen header */}
        <div className="print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px]">
              <Link href="/formularios" className="text-gray-600 hover:text-[#B3985B] transition-colors">Formularios</Link>
              <span className="text-gray-700">/</span>
              <Link href="/formularios/incidencias-semanales" className="text-gray-600 hover:text-[#B3985B] transition-colors">Incidencias</Link>
              <span className="text-gray-700">/</span>
              <span className="text-gray-500">S{registro.semana} · {registro.anio}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#444] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
              <Link
                href="/formularios/incidencias-semanales"
                className="text-xs text-gray-500 hover:text-white border border-[#2a2a2a] hover:border-[#444] px-3 py-1.5 rounded-lg transition-colors"
              >
                ← Volver
              </Link>
            </div>
          </div>

          {/* Summary card */}
          <div className="mt-4 bg-gradient-to-br from-[#B3985B]/10 to-[#0d0d0d] border border-[#B3985B]/20 rounded-2xl px-5 py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">Incidencias Semanales</p>
                <h1 className="text-xl font-semibold text-white">Semana {registro.semana} · {registro.anio}</h1>
                <p className="text-gray-500 text-xs mt-1">{fmtDate(registro.createdAt)}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-[10px] text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                    {total} incidencias
                  </span>
                  {criticas > 0 && (
                    <span className="text-[10px] text-red-400 bg-red-900/20 border border-red-900/30 px-2 py-0.5 rounded-full font-semibold">
                      🔴 {criticas} crítica{criticas !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">{registro.user.name}</p>
                {registro.user.area && <p className="text-gray-600 text-[10px]">{registro.user.area}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Area sections */}
        {AREAS.map(area => {
          const areaIncs = incs
            .filter(i => i.area === area.key)
            .sort((a, b) => a.orden - b.orden);
          if (areaIncs.length === 0) return null;
          return (
            <div key={area.key} className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden print:border-gray-300 print:border">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e1e] print:border-gray-300">
                <h2 className="text-white font-semibold text-sm print:text-black">{area.label}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${area.badgeClass} print:hidden`}>
                  {areaIncs.length}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {areaIncs.map((inc, i) => {
                  const ucfg = URGENCIA_CONFIG[inc.urgencia] ?? URGENCIA_CONFIG.none;
                  return (
                    <div
                      key={i}
                      className={`bg-[#0d0d0d] border border-[#2a2a2a] border-l-4 ${ucfg.borderClass} rounded-lg px-3 py-2.5 ${ucfg.printClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-gray-700 text-xs w-4 shrink-0 mt-0.5">{i + 1}.</span>
                        <p className="flex-1 text-gray-300 text-sm leading-relaxed print:text-black font-medium">{inc.texto}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${ucfg.badgeClass} print:hidden`}>
                          {ucfg.emoji} {ucfg.label}
                        </span>
                        <span className="hidden print:inline text-xs font-semibold text-gray-700">
                          [{ucfg.label}]
                        </span>
                      </div>
                      {(inc.causa || inc.solucion) && (
                        <div className="ml-7 mt-2 space-y-1.5">
                          {inc.causa && (
                            <div className="flex items-start gap-2">
                              <span className="text-[9px] text-gray-700 uppercase tracking-wider font-semibold mt-0.5 w-12 shrink-0">Causa</span>
                              <p className="flex-1 text-gray-500 text-xs leading-relaxed print:text-black">{inc.causa}</p>
                            </div>
                          )}
                          {inc.solucion && (
                            <div className="flex items-start gap-2">
                              <span className="text-[9px] text-[#B3985B]/60 uppercase tracking-wider font-semibold mt-0.5 w-12 shrink-0">Solución</span>
                              <p className="flex-1 text-gray-400 text-xs leading-relaxed print:text-black">{inc.solucion}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty */}
        {total === 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 text-center">
            <p className="text-gray-600 text-sm italic">Sin incidencias registradas</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-8 print:hidden">
          <Link href="/formularios/incidencias-semanales" className="text-[#B3985B] hover:underline text-xs">
            ← Volver al historial
          </Link>
        </div>

      </div>
    </>
  );
}
