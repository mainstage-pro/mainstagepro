"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

interface ReporteItem {
  id: string;
  semana: number;
  anio: number;
  bienestar: number;
  logros: string;
  estado: string;
  createdAt: string;
  user: { id: string; name: string; area: string | null };
}

const BIENESTAR_LABEL: Record<number, { label: string; color: string }> = {
  1:  { label: "Muy pesado",  color: "bg-red-900/40 text-red-400" },
  2:  { label: "Muy pesado",  color: "bg-red-900/40 text-red-400" },
  3:  { label: "Pesado",      color: "bg-orange-900/40 text-orange-400" },
  4:  { label: "Pesado",      color: "bg-orange-900/40 text-orange-400" },
  5:  { label: "Regular",     color: "bg-yellow-900/40 text-yellow-400" },
  6:  { label: "Regular",     color: "bg-yellow-900/40 text-yellow-400" },
  7:  { label: "Bien",        color: "bg-blue-900/40 text-blue-400" },
  8:  { label: "Bien",        color: "bg-blue-900/40 text-blue-400" },
  9:  { label: "Excelente",   color: "bg-green-900/40 text-green-400" },
  10: { label: "Excelente",   color: "bg-green-900/40 text-green-400" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReporteSemanalHistorialPage() {
  const toast = useToast();
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/formularios/reporte-semanal", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setReportes(d.reportes ?? []))
      .catch(() => toast.error("Error al cargar reportes"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/formularios"
              className="text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors"
            >
              Formularios
            </Link>
            <span className="text-gray-700 text-[10px]">/</span>
            <span className="text-[10px] text-gray-500">Reporte General Semanal</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Historial de Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {reportes.length > 0
              ? `${reportes.length} reporte${reportes.length !== 1 ? "s" : ""} registrado${reportes.length !== 1 ? "s" : ""}`
              : "Aún no hay reportes"}
          </p>
        </div>
        <Link
          href="/formularios/reporte-semanal/nuevo"
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96e] text-black px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo reporte
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && reportes.length === 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-white font-semibold mb-1">Sin reportes aún</p>
          <p className="text-gray-500 text-sm mb-6">
            Comparte el link del formulario con tu equipo para que empiecen a reportar.
          </p>
          <Link
            href="/formularios/reporte-semanal/nuevo"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96e] text-black px-4 py-2 rounded-lg transition-colors"
          >
            Llenar el primero
          </Link>
        </div>
      )}

      {/* Lista de reportes agrupados por año */}
      {!loading && reportes.length > 0 && (
        <div className="space-y-2">
          {reportes.map((r) => {
            const bw = BIENESTAR_LABEL[r.bienestar] ?? { label: `${r.bienestar}/10`, color: "bg-gray-800 text-gray-400" };
            const preview = r.logros?.slice(0, 120);
            return (
              <Link
                key={r.id}
                href={`/formularios/reporte-semanal/${r.id}`}
                className="block bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-5 py-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Nombre como título principal */}
                      <span className="text-white font-semibold text-sm">
                        Reporte de {r.user.name}
                      </span>
                      {r.user.area && (
                        <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                          {r.user.area}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-gray-500 text-xs">
                        Semana {r.semana} · {r.anio}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bw.color}`}>
                        {bw.label} {r.bienestar}/10
                      </span>
                    </div>
                    {preview && (
                      <p className="text-gray-500 text-xs truncate max-w-lg">{preview}{r.logros.length > 120 ? "…" : ""}</p>
                    )}
                    <p className="text-gray-700 text-[10px] mt-1">{fmtDate(r.createdAt)}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-[#B3985B] shrink-0 transition-colors mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
