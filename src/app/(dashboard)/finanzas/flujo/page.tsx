"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CxCItem {
  id: string; concepto: string; monto: number; montoCobrado: number;
  fechaCompromiso: string; tipoPago: string;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
  cliente: { nombre: string } | null;
}
interface CxPItem {
  id: string; concepto: string; monto: number;
  fechaCompromiso: string; tipoAcreedor: string;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
}
interface Semana {
  label: string; inicioISO: string; finISO: string;
  entradas: number; salidas: number; neto: number;
  cxc: CxCItem[]; cxp: CxPItem[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

export default function FlujoCajaPage() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSalidas, setTotalSalidas] = useState(0);
  const [totalNeto, setTotalNeto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/finanzas/flujo-proyectado")
      .then(r => r.json())
      .then(d => {
        setSemanas(d.semanas ?? []);
        setTotalEntradas(d.totalEntradas ?? 0);
        setTotalSalidas(d.totalSalidas ?? 0);
        setTotalNeto(d.totalNeto ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxAbsoluto = Math.max(...semanas.map(s => Math.max(s.entradas, s.salidas)), 1);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Flujo de caja proyectado</h1>
          <p className="text-gray-500 text-sm">Próximos 90 días · CxC pendientes y CxP comprometidas</p>
        </div>
        <Link href="/finanzas/cobros-pagos" className="text-[11px] text-gray-500 hover:text-white border border-[#222] bg-[#111] px-3 py-1.5 rounded-lg transition-colors">
          Ver CxC / CxP
        </Link>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Entradas esperadas", value: totalEntradas, color: "text-green-400" },
          { label: "Salidas comprometidas", value: totalSalidas, color: "text-red-400" },
          { label: "Neto proyectado", value: totalNeto, color: totalNeto >= 0 ? "text-[#B3985B]" : "text-red-400" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-4">
            <p className="text-gray-600 text-[11px] mb-1">{k.label}</p>
            <p className={`text-lg font-semibold ${k.color}`}>{loading ? "..." : fmt(k.value)}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
        </div>
      ) : semanas.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-gray-500 text-sm">Sin cuentas pendientes en los próximos 90 días</p>
        </div>
      ) : (
        <div className="space-y-2">
          {semanas.map((semana, idx) => (
            <div key={idx} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              {/* Fila resumen */}
              <button
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#151515] transition-colors text-left"
                onClick={() => setExpandida(expandida === idx ? null : idx)}
              >
                <div className="w-36 shrink-0">
                  <p className="text-white text-xs font-medium">{semana.label}</p>
                </div>

                {/* Barra de entradas */}
                <div className="flex-1 flex flex-col gap-1">
                  {semana.entradas > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 shrink-0">
                        <div className="h-2 bg-green-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${(semana.entradas / maxAbsoluto) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-green-400 text-[11px]">+{fmt(semana.entradas)}</span>
                      <span className="text-gray-700 text-[10px]">{semana.cxc.length} cobro{semana.cxc.length !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  {semana.salidas > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 shrink-0">
                        <div className="h-2 bg-red-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500/70 rounded-full" style={{ width: `${(semana.salidas / maxAbsoluto) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-red-400 text-[11px]">-{fmt(semana.salidas)}</span>
                      <span className="text-gray-700 text-[10px]">{semana.cxp.length} pago{semana.cxp.length !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${semana.neto >= 0 ? "text-[#B3985B]" : "text-red-400"}`}>
                    {semana.neto >= 0 ? "+" : ""}{fmt(semana.neto)}
                  </p>
                  <p className="text-gray-600 text-[10px]">{expandida === idx ? "▲" : "▼"}</p>
                </div>
              </button>

              {/* Detalle expandible */}
              {expandida === idx && (
                <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-3">
                  {semana.cxc.length > 0 && (
                    <div>
                      <p className="text-green-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Entradas (CxC)</p>
                      <div className="space-y-1">
                        {semana.cxc.map(c => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <div className="min-w-0">
                              <span className="text-white truncate">{c.concepto}</span>
                              {c.cliente && <span className="text-gray-600 ml-2">{c.cliente.nombre}</span>}
                              {c.proyecto && (
                                <Link href={`/proyectos/${c.proyecto.id}`} onClick={e => e.stopPropagation()} className="text-[#B3985B] ml-2 hover:underline">
                                  {c.proyecto.numeroProyecto}
                                </Link>
                              )}
                            </div>
                            <span className="text-green-400 shrink-0 ml-2 font-medium">
                              +{fmt(c.monto - (c.montoCobrado ?? 0))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {semana.cxp.length > 0 && (
                    <div>
                      <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Salidas (CxP)</p>
                      <div className="space-y-1">
                        {semana.cxp.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <div className="min-w-0">
                              <span className="text-white truncate">{p.concepto}</span>
                              <span className="text-gray-600 ml-2">{p.tipoAcreedor}</span>
                              {p.proyecto && (
                                <Link href={`/proyectos/${p.proyecto.id}`} onClick={e => e.stopPropagation()} className="text-[#B3985B] ml-2 hover:underline">
                                  {p.proyecto.numeroProyecto}
                                </Link>
                              )}
                            </div>
                            <span className="text-red-400 shrink-0 ml-2 font-medium">-{fmt(p.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
