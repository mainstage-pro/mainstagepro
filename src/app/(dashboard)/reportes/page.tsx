"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReporteResumen = {
  id: string;
  semana: string;
  fechaInicio: string;
  fechaFin: string;
  score: number;
  generadoEn: string;
  notas: string | null;
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400 border-green-700/40 bg-green-900/20"
    : score >= 60 ? "text-yellow-400 border-yellow-700/40 bg-yellow-900/20"
    : "text-red-400 border-red-700/40 bg-red-900/20";
  const label = score >= 80 ? "Excelente" : score >= 60 ? "Bueno" : "Atención";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>
      {score}/100 · {label}
    </span>
  );
}

export default function ReportesPage() {
  const [reportes, setReportes] = useState<ReporteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const r = await fetch("/api/reportes");
    const d = await r.json();
    setReportes(d.reportes || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const generar = async () => {
    setGenerating(true);
    await fetch("/api/reportes/generar", { method: "POST" });
    await cargar();
    setGenerating(false);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Reportes Semanales</h1>
          <p className="text-[#6b7280] text-sm">Estado del negocio semana a semana</p>
        </div>
        <button
          onClick={generar}
          disabled={generating}
          className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {generating ? "Generando..." : "Generar reporte"}
        </button>
      </div>

      {/* Intro card */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-6">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-2">¿Cómo funciona?</p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Cada lunes se genera automáticamente un reporte con el estado del negocio: ventas, finanzas, producción,
          marketing, RRHH y socios. Incluye un <span className="text-white font-medium">score 0–100</span>, alertas
          críticas, highlights de la semana y puedes enviarlo directo a tu WhatsApp para usarlo en reuniones.
        </p>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando reportes...</div>
      ) : reportes.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-sm mb-3">Aún no hay reportes generados.</p>
          <button onClick={generar} disabled={generating}
            className="text-[#B3985B] text-sm hover:underline">
            {generating ? "Generando..." : "Generar el primero ahora →"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {reportes.map((r, i) => {
            const esUltimo = i === 0;
            return (
              <Link key={r.id} href={`/reportes/${r.id}`}
                className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-colors hover:border-[#333] group ${
                  esUltimo ? "bg-[#111] border-[#B3985B]/30" : "bg-[#0f0f0f] border-[#1a1a1a]"
                }`}>
                <div className="flex items-center gap-4">
                  {/* Score ring */}
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    r.score >= 80 ? "border-green-600/60" : r.score >= 60 ? "border-yellow-600/60" : "border-red-600/60"
                  }`}>
                    <span className={`text-sm font-bold ${
                      r.score >= 80 ? "text-green-400" : r.score >= 60 ? "text-yellow-400" : "text-red-400"
                    }`}>{r.score}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-medium">
                        {fmt(r.fechaInicio)} — {fmt(r.fechaFin)}
                      </p>
                      {esUltimo && (
                        <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded-full font-semibold">
                          Más reciente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreBadge score={r.score} />
                      {r.notas && (
                        <span className="text-[10px] text-gray-600">✏ Con notas</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-gray-600 text-xs hidden md:block">
                    Generado {fmt(r.generadoEn)}
                  </p>
                  <span className="text-[#B3985B] text-xs group-hover:underline">Ver →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
