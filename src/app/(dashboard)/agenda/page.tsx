"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/cotizador";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface AgendaData {
  usuario: { name: string; role: string };
  proyectosActivos: AnyObj[];
  cxcPendientes: AnyObj[];
  cotizacionesSinRespuesta: AnyObj[];
}

function diasHasta(fecha: string) {
  const d = Math.ceil((new Date(fecha.substring(0, 10) + "T12:00:00Z").getTime() - Date.now()) / 86400000);
  return d;
}

function fmtFecha(f: string) {
  return new Date(f.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
}

export default function AgendaPage() {
  const [data, setData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agenda")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="h-8 w-48 bg-[#1a1a1a] rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-40 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!data) return null;

  const { usuario, proyectosActivos, cxcPendientes, cotizacionesSinRespuesta } = data;

  const proyectosUrgentes = proyectosActivos.filter((p: AnyObj) => {
    const d = diasHasta(p.fechaEvento);
    return d >= 0 && d <= 14;
  });
  const proyectosProximos = proyectosActivos.filter((p: AnyObj) => {
    const d = diasHasta(p.fechaEvento);
    return d > 14;
  });

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Mi agenda</h1>
        <p className="text-gray-500 text-sm">
          {usuario.name} · {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Proyectos urgentes (≤ 14 días) */}
      {proyectosUrgentes.length > 0 && (
        <Section label="Próximos 14 días" count={proyectosUrgentes.length} color="text-red-400">
          <div className="space-y-2">
            {proyectosUrgentes.sort((a: AnyObj, b: AnyObj) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()).map((p: AnyObj) => (
              <ProyectoCard key={p.id} p={p} urgente />
            ))}
          </div>
        </Section>
      )}

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* CxC pendientes de mis proyectos */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Cobros pendientes</p>
            <Link href="/finanzas/cobros-pagos" className="text-[#B3985B] text-xs hover:underline">Ver todos →</Link>
          </div>
          {cxcPendientes.length === 0 ? (
            <p className="text-gray-600 text-sm px-4 py-6 text-center">Sin cobros pendientes</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {cxcPendientes.slice(0, 6).map((c: AnyObj) => {
                const d = diasHasta(c.fechaCompromiso);
                const vencida = d < 0;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{c.cliente.nombre}</p>
                      <p className="text-gray-600 text-xs truncate">{c.concepto}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-sm font-semibold">{formatCurrency(c.monto - (c.montoCobrado ?? 0))}</p>
                      <p className={`text-[10px] ${vencida ? "text-red-400" : d <= 3 ? "text-yellow-400" : "text-gray-600"}`}>
                        {vencida ? `Vencida ${Math.abs(d)}d` : d === 0 ? "Hoy" : `En ${d}d`}
                      </p>
                    </div>
                    {c.cliente.telefono && (
                      <a href={`https://wa.me/52${c.cliente.telefono.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${c.cliente.nombre}, te escribimos de Mainstage Pro para recordarte el cobro de ${formatCurrency(c.monto - (c.montoCobrado ?? 0))} por ${c.concepto}. Quedamos al pendiente.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cotizaciones sin respuesta */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Cotizaciones sin respuesta</p>
            <Link href="/cotizaciones" className="text-[#B3985B] text-xs hover:underline">Ver todas →</Link>
          </div>
          {cotizacionesSinRespuesta.length === 0 ? (
            <p className="text-gray-600 text-sm px-4 py-6 text-center">Sin cotizaciones pendientes</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {cotizacionesSinRespuesta.slice(0, 6).map((c: AnyObj) => {
                const dias = Math.floor((Date.now() - new Date(c.updatedAt).getTime()) / 86400000);
                return (
                  <Link key={c.id} href={`/cotizaciones/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#151515] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{c.cliente.nombre}</p>
                      <p className="text-gray-600 text-xs">{c.numeroCotizacion} · {formatCurrency(c.granTotal)}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded ${dias > 7 ? "text-red-400 bg-red-900/20" : "text-yellow-400 bg-yellow-900/20"}`}>
                      {dias}d esperando
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Proyectos próximos (> 14 días) */}
      {proyectosProximos.length > 0 && (
        <Section label="Más adelante" count={proyectosProximos.length} color="text-gray-400">
          <div className="space-y-2">
            {proyectosProximos.sort((a: AnyObj, b: AnyObj) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()).map((p: AnyObj) => (
              <ProyectoCard key={p.id} p={p} urgente={false} />
            ))}
          </div>
        </Section>
      )}

      {proyectosActivos.length === 0 && cxcPendientes.length === 0 && cotizacionesSinRespuesta.length === 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-gray-500 text-sm">Todo al día — sin pendientes asignados</p>
        </div>
      )}
    </div>
  );
}

function Section({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>{label}</p>
        <span className="text-[10px] text-gray-700 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{count}</span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
      </div>
      {children}
    </div>
  );
}

function ProyectoCard({ p, urgente }: { p: AnyObj; urgente: boolean }) {
  const dias = diasHasta(p.fechaEvento);
  const personalConfirmado = p.personal?.filter((x: AnyObj) => x.confirmado).length ?? 0;
  const personalTotal = p.personal?.length ?? 0;
  const checklistDone = p.checklist?.filter((c: AnyObj) => c.completado).length ?? 0;
  const checklistTotal = p.checklist?.length ?? 0;
  const pct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : null;

  return (
    <Link href={`/proyectos/${p.id}`}
      className={`flex items-center gap-4 bg-[#111] border rounded-xl px-4 py-3 hover:border-[#333] transition-colors ${
        urgente && dias <= 3 ? "border-red-900/40" : urgente && dias <= 7 ? "border-yellow-900/30" : "border-[#1e1e1e]"
      }`}>
      <div className="w-1.5 h-full min-h-[40px] rounded-full shrink-0"
        style={{ backgroundColor: TIPO_EVENTO_COLORS[p.tipoEvento] ?? "#333" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-gray-600">{TIPO_EVENTO_LABELS[p.tipoEvento] ?? p.tipoEvento}</span>
          <span className="text-[10px] text-[#444]">·</span>
          <span className="text-[10px] text-[#444]">{p.numeroProyecto}</span>
        </div>
        <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
        <p className="text-gray-600 text-xs">{p.cliente?.nombre}</p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <p className={`text-sm font-semibold ${dias <= 3 ? "text-red-400" : dias <= 7 ? "text-yellow-400" : "text-white"}`}>
          {dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
        </p>
        <p className="text-gray-600 text-[10px]">{fmtFecha(p.fechaEvento)}</p>
      </div>
      <div className="shrink-0 space-y-1 text-right hidden sm:block">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_PROYECTO_COLORS[p.estado] ?? "bg-gray-800 text-gray-400"}`}>
          {ESTADO_PROYECTO_LABELS[p.estado] ?? p.estado}
        </span>
        {pct !== null && (
          <p className="text-gray-600 text-[10px]">{pct}% checklist</p>
        )}
        {personalTotal > 0 && (
          <p className={`text-[10px] ${personalConfirmado < personalTotal ? "text-yellow-400" : "text-gray-600"}`}>
            Staff {personalConfirmado}/{personalTotal}
          </p>
        )}
      </div>
    </Link>
  );
}
