"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { formatCurrency } from "@/lib/cotizador";

interface EventoResumen {
  id: string;
  numeroCotizacion: string;
  nombreCotizacion: string | null;
  descripcionCotizacion: string | null;
  opcionLetra: string;
  grupoId: string | null;
  estado: string;
  nombreEvento: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  proyecto: { id: string; numeroProyecto: string; estado: string } | null;
  createdAt: string;
}

interface ResumenData {
  tratoId: string | null;
  trato: { id: string; nombreEvento: string | null; responsable: { name: string } | null } | null;
  cliente: { id: string; nombre: string; empresa: string | null };
  eventos: EventoResumen[];
  totales: {
    totalBruto: number;
    totalIva: number;
    granTotalProyecto: number;
    numeroEventos: number;
  };
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-700 text-gray-300",
  ENVIADA: "bg-blue-900/50 text-blue-300",
  APROBADA: "bg-green-900/50 text-green-300",
  RECHAZADA: "bg-red-900/50 text-red-300",
  VENCIDA: "bg-gray-800 text-gray-500",
  EN_REVISION: "bg-yellow-900/50 text-yellow-300",
};

function fmt(v: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function ResumenGlobalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [descargandoGlobal, setDescargandoGlobal] = useState(false);

  async function descargarPdfGlobal() {
    setDescargandoGlobal(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}/resumen-global/pdf`);
      if (!res.ok) { alert("Error al generar PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split('filename="')[1]?.replace('"', '') ?? "cotizacion-global.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDescargandoGlobal(false);
    }
  }

  useEffect(() => {
    fetch(`/api/cotizaciones/${id}/resumen-global`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-4"><BackButton /></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-[#111] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-4"><BackButton /></div>
        <p className="text-gray-500 text-sm">No se encontró la cotización.</p>
      </div>
    );
  }

  const { eventos, totales, cliente, trato } = data;
  const tieneTodoAprobado = eventos.every(e => e.estado === "APROBADA");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="mb-2"><BackButton /></div>

      {/* Header */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Resumen Global del Proyecto</p>
            <h1 className="text-xl font-semibold text-white leading-tight">
              {trato?.nombreEvento || cliente.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Link href={`/crm/clientes/${cliente.id}`} className="text-[#B3985B] text-sm hover:underline">
                {cliente.nombre}{cliente.empresa ? ` · ${cliente.empresa}` : ""}
              </Link>
              {trato && (
                <Link href={`/crm/tratos/${trato.id}`} className="text-gray-600 text-xs hover:text-gray-400 transition-colors">
                  → ver trato
                </Link>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-2">
            <p className="text-3xl font-bold text-[#B3985B] tabular-nums">{fmt(totales.granTotalProyecto)}</p>
            <p className="text-gray-500 text-xs mt-0.5">{totales.numeroEventos} evento{totales.numeroEventos !== 1 ? "s" : ""}</p>

            <button
              onClick={descargarPdfGlobal}
              disabled={descargandoGlobal}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-[#B3985B]/10 border border-[#B3985B]/40 text-[#B3985B] text-xs font-semibold rounded-lg hover:bg-[#B3985B]/20 transition-colors disabled:opacity-40"
            >
              {descargandoGlobal ? "Generando..." : "↓ PDF Global"}
            </button>
          </div>
        </div>

        {/* Resumen de totales */}
        <div className="border-t border-[#1a1a1a] pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0d0d0d] rounded-lg p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Subtotal</p>
            <p className="text-white font-semibold text-sm tabular-nums">{fmt(totales.totalBruto)}</p>
          </div>

          {totales.totalIva > 0 && (
            <div className="bg-[#0d0d0d] rounded-lg p-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">IVA 16%</p>
              <p className="text-gray-300 font-semibold text-sm tabular-nums">{fmt(totales.totalIva)}</p>
            </div>
          )}
          <div className="bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-lg p-3">
            <p className="text-[10px] text-[#B3985B]/60 uppercase tracking-wider mb-1">Gran Total</p>
            <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmt(totales.granTotalProyecto)}</p>
          </div>
        </div>
      </div>

      {/* Tabla de eventos */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-sm font-semibold text-gray-300">Desglose por evento</h2>
        </div>

        {eventos.length === 0 ? (
          <p className="text-gray-500 text-sm p-5">Sin cotizaciones.</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {eventos.map((ev, i) => {
              const nombre = ev.nombreCotizacion || ev.nombreEvento || `Evento ${i + 1}`;

              return (
                <div key={ev.id} className="px-5 py-4 hover:bg-[#0d0d0d] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info del evento */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white font-semibold text-sm">{nombre}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_COLORS[ev.estado] || "bg-gray-700 text-gray-300"}`}>
                          {ev.estado}
                        </span>
                        {ev.proyecto && (
                          <Link href={`/proyectos/${ev.proyecto.id}`} className="text-[10px] text-green-400 bg-green-900/20 border border-green-800/30 px-1.5 py-0.5 rounded-full hover:text-green-300 transition-colors">
                            {ev.proyecto.numeroProyecto}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                        <span className="font-mono text-gray-700">{ev.numeroCotizacion}</span>
                        {ev.fechaEvento && <span>{fmtFecha(ev.fechaEvento)}</span>}
                        {ev.lugarEvento && <span className="truncate max-w-[200px]">{ev.lugarEvento}</span>}
                      </div>
                      {ev.descripcionCotizacion && (
                        <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">{ev.descripcionCotizacion}</p>
                      )}
                    </div>

                    {/* Desglose de montos */}
                    <div className="text-right shrink-0 min-w-[130px]">
                      <p className="text-white font-bold text-base tabular-nums">{fmt(ev.granTotal)}</p>
                      <div className="space-y-0.5 mt-1">
                        {ev.aplicaIva && (
                          <p className="text-gray-600 text-[10px]">IVA {fmt(ev.montoIva)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 justify-end">
                        <a
                          href={`/api/cotizaciones/${ev.id}/pdf`}
                          target="_blank"
                          className="inline-block text-[10px] text-gray-500 hover:text-[#B3985B] transition-colors"
                          title="Descargar PDF individual"
                        >
                          ↓ PDF
                        </a>
                        <Link
                          href={`/cotizaciones/${ev.id}`}
                          className="inline-block text-[10px] text-[#B3985B]/60 hover:text-[#B3985B] transition-colors"
                        >
                          Ver →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer con gran total */}
        <div className="px-5 py-4 bg-[#0a0a0a] border-t border-[#222] flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Gran total del proyecto</p>
          </div>
          <p className="text-2xl font-bold text-[#B3985B] tabular-nums">{fmt(totales.granTotalProyecto)}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3 flex-wrap">
        {trato && (
          <Link
            href={`/crm/tratos/${trato.id}`}
            className="flex items-center gap-1.5 bg-[#111] border border-[#222] hover:border-[#B3985B]/40 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            ← Volver al trato
          </Link>
        )}
        {trato && (
          <Link
            href={`/contratos/${trato.id}`}
            target="_blank"
            className="flex items-center gap-1.5 bg-[#111] border border-[#222] hover:border-[#333] text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Ver contrato
          </Link>
        )}
        {tieneTodoAprobado && (
          <span className="text-xs text-green-400 bg-green-900/20 border border-green-800/30 px-3 py-2 rounded-lg">
            ✓ Todos los eventos aprobados
          </span>
        )}
      </div>
    </div>
  );
}
