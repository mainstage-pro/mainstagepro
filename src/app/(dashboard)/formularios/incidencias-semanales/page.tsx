"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

interface RegistroItem {
  id: string;
  semana: number;
  anio: number;
  estado: string;
  createdAt: string;
  incidencias: { area: string; texto: string; urgencia: string; orden: number }[];
  user: { id: string; name: string; area: string | null };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IncidenciasHistorialPage() {
  const toast = useToast();
  const [registros, setRegistros] = useState<RegistroItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/formularios/incidencias-semanales", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRegistros(d.registros ?? []))
      .catch(() => toast.error("Error al cargar registros"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[10px]">
            <Link href="/formularios" className="text-gray-600 hover:text-[#B3985B] transition-colors">Formularios</Link>
            <span className="text-gray-700">/</span>
            <span className="text-gray-500">Incidencias Semanales</span>
          </div>
          <h1 className="ms-h1">Incidencias Semanales</h1>
          <p className="text-gray-500 text-sm mt-1">
            {registros.length > 0
              ? `${registros.length} registro${registros.length !== 1 ? "s" : ""}`
              : "Sin registros aún"}
          </p>
        </div>
        <Link
          href="/formularios/incidencias-semanales/nuevo"
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo registro
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ms-card p-5 animate-pulse h-20" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && registros.length === 0 && (
        <div className="ms-card rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">⚠️</p>
          <p className="text-white font-semibold mb-1">Sin registros aún</p>
          <p className="text-gray-500 text-sm mb-6">Crea tu primer registro de incidencias semanales.</p>
          <Link
            href="/formularios/incidencias-semanales/nuevo"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black px-4 py-2 rounded-lg transition-colors"
          >
            Crear primer registro
          </Link>
        </div>
      )}

      {/* Lista */}
      {!loading && registros.length > 0 && (
        <div className="space-y-2">
          {registros.map((r) => {
            const incs = Array.isArray(r.incidencias) ? r.incidencias : [];
            const criticas = incs.filter((i) => i.urgencia === "critico").length;
            const importantes = incs.filter((i) => i.urgencia === "importante").length;
            return (
              <Link
                key={r.id}
                href={`/formularios/incidencias-semanales/${r.id}`}
                className="block ms-card-hover px-5 py-4 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-sm">Semana {r.semana} · {r.anio}</span>
                      <span className="text-[10px] text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                        {incs.length} incidencia{incs.length !== 1 ? "s" : ""}
                      </span>
                      {criticas > 0 && (
                        <span className="text-[10px] text-red-400 bg-red-900/20 border border-red-900/30 px-2 py-0.5 rounded-full font-semibold">
                          🔴 {criticas} crítica{criticas !== 1 ? "s" : ""}
                        </span>
                      )}
                      {importantes > 0 && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-900/20 border border-yellow-900/30 px-2 py-0.5 rounded-full">
                          🟡 {importantes}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600">{r.user.name}</span>
                    </div>
                    <p className="text-gray-700 text-[10px]">{fmtDate(r.createdAt)}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-700 group-hover:text-[#B3985B] shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
