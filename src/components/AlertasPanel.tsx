"use client";

import { useState } from "react";
import Link from "next/link";

interface CxCVencida {
  id: string;
  concepto: string;
  monto: number;
  fechaCompromiso: string;
  cliente: { nombre: string } | null;
  proyecto: { nombre: string; numeroProyecto: string } | null;
}

interface TratoVencido {
  id: string;
  nombreEvento: string | null;
  cliente: { nombre: string } | null;
  fechaProximaAccion: string | null;
  responsable: { name: string } | null;
}

interface ProyectoSinPersonal {
  id: string;
  nombre: string;
  numeroProyecto: string;
  fechaEvento: string;
  cliente: { nombre: string } | null;
}

interface AlertasPanelProps {
  total: number;
  cxcVencidas: CxCVencida[];
  tratosVencidos: TratoVencido[];
  proyectosSinPersonal: ProyectoSinPersonal[];
}

function fmtFecha(iso: string) {
  return new Date(iso.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

export default function AlertasPanel({ total, cxcVencidas, tratosVencidos, proyectosSinPersonal }: AlertasPanelProps) {
  const [open, setOpen] = useState(false);

  if (total === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-red-900/20 border border-red-700/40 hover:bg-red-900/40 hover:border-red-600/60 rounded-xl px-4 py-2 text-sm text-red-300 transition-colors cursor-pointer"
      >
        ⚠ {total} alerta{total !== 1 ? "s" : ""} requieren atención
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div>
            <h2 className="text-white font-semibold text-base">Alertas</h2>
            <p className="text-red-400 text-xs">{total} elemento{total !== 1 ? "s" : ""} requieren atención</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* CxC Vencidas */}
          {cxcVencidas.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-red-400 text-xs font-bold uppercase tracking-wider">
                  💸 Cobros vencidos ({cxcVencidas.length})
                </h3>
                <Link
                  href="/finanzas/cxc"
                  onClick={() => setOpen(false)}
                  className="text-[10px] text-[#B3985B] hover:underline"
                >
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-2">
                {cxcVencidas.map(c => (
                  <div key={c.id} className="bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{c.cliente?.nombre ?? "—"}</p>
                        <p className="text-[#888] text-xs truncate">{c.concepto}</p>
                        {c.proyecto && (
                          <p className="text-[#555] text-[10px]">#{c.proyecto.numeroProyecto} · {c.proyecto.nombre}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-red-400 text-sm font-semibold">{fmtMoneda(c.monto)}</p>
                        <p className="text-[#666] text-[10px]">vence {fmtFecha(c.fechaCompromiso)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tratos con seguimiento vencido */}
          {tratosVencidos.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                  📞 Seguimiento vencido ({tratosVencidos.length})
                </h3>
                <Link
                  href="/crm/tratos"
                  onClick={() => setOpen(false)}
                  className="text-[10px] text-[#B3985B] hover:underline"
                >
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-2">
                {tratosVencidos.map(t => (
                  <Link
                    key={t.id}
                    href={`/crm/tratos/${t.id}`}
                    onClick={() => setOpen(false)}
                    className="block bg-[#111] border border-[#1f1f1f] hover:border-[#333] rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {t.cliente?.nombre ?? "—"}
                        </p>
                        <p className="text-[#888] text-xs truncate">
                          {t.nombreEvento ?? "Sin nombre de evento"}
                          {t.responsable ? ` · ${t.responsable.name}` : ""}
                        </p>
                      </div>
                      {t.fechaProximaAccion && (
                        <p className="text-yellow-400 text-[10px] shrink-0">
                          venció {fmtFecha(t.fechaProximaAccion)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Proyectos sin personal confirmado */}
          {proyectosSinPersonal.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider">
                  👤 Sin personal confirmado ({proyectosSinPersonal.length})
                </h3>
                <Link
                  href="/proyectos"
                  onClick={() => setOpen(false)}
                  className="text-[10px] text-[#B3985B] hover:underline"
                >
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-2">
                {proyectosSinPersonal.map(p => (
                  <Link
                    key={p.id}
                    href={`/proyectos/${p.id}`}
                    onClick={() => setOpen(false)}
                    className="block bg-[#111] border border-[#1f1f1f] hover:border-[#333] rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                        <p className="text-[#888] text-xs">{p.cliente?.nombre ?? "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[#B3985B] text-[10px]">#{p.numeroProyecto}</p>
                        <p className="text-[#666] text-[10px]">{fmtFecha(p.fechaEvento)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
