'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function diasDesde(fecha: string | null): number {
  if (!fecha) return 999;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

export default function AlertasPage() {
  const [tratos, setTratos] = useState<any[]>([]);
  const [prospecciones, setProspecciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tratos').then(r => r.json()),
      fetch('/api/prospeccion').then(r => r.json()),
    ]).then(([td, pd]) => {
      // Tratos urgentes: acción vencida o sin fecha
      const tratosUrgentes = (td.tratos ?? []).filter((t: any) => {
        if (['VENTA_CERRADA', 'VENTA_PERDIDA'].includes(t.etapa)) return false;
        return !t.fechaProximaAccion || diasDesde(t.fechaProximaAccion) >= 1;
      }).sort((a: any, b: any) => diasDesde(b.fechaProximaAccion) - diasDesde(a.fechaProximaAccion));

      // Prospecciones urgentes: 5+ días sin contacto
      const prospUrg = (pd.prospecciones ?? []).filter((p: any) => {
        if (['CANCELADO', 'CONVERTIDO', 'EN_TRATO'].includes(p.estado)) return false;
        return !p.fechaProximoContacto || diasDesde(p.fechaProximoContacto) >= 5;
      }).sort((a: any, b: any) => diasDesde(b.fechaProximoContacto) - diasDesde(a.fechaProximoContacto));

      setTratos(tratosUrgentes);
      setProspecciones(prospUrg);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const total = tratos.length + prospecciones.length;

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Centro de Alertas</h1>
        <p className="text-gray-400 text-sm mt-1">
          {loading ? 'Cargando...' : `${total} ${total === 1 ? 'alerta activa' : 'alertas activas'}`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-[#111] border border-[#222] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tratos urgentes */}
          {tratos.length > 0 && (
            <section>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">
                🚨 Tratos sin seguimiento ({tratos.length})
              </p>
              <div className="space-y-2">
                {tratos.map((t: any) => {
                  const dias = diasDesde(t.fechaProximaAccion);
                  return (
                    <Link
                      key={t.id}
                      href={`/crm/tratos/${t.id}`}
                      className="flex items-center gap-3 p-3 bg-[#111] border border-amber-900/30 rounded-xl hover:border-amber-800/50 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{t.cliente?.nombre}</p>
                        <p className="text-gray-500 text-xs">{t.nombreEvento || t.tipoEvento}</p>
                      </div>
                      <span className="text-amber-400 text-xs shrink-0 font-semibold">
                        {dias === 999 ? 'Sin fecha' : `+${dias}d`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Prospecciones urgentes */}
          {prospecciones.length > 0 && (
            <section>
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">
                ⏰ Prospectos fríos sin contacto ({prospecciones.length})
              </p>
              <div className="space-y-2">
                {prospecciones.map((p: any) => {
                  const dias = diasDesde(p.fechaProximoContacto);
                  return (
                    <Link
                      key={p.id}
                      href={`/crm/prospeccion/${p.id}`}
                      className="flex items-center gap-3 p-3 bg-[#111] border border-red-900/30 rounded-xl hover:border-red-800/50 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.cliente?.nombre}</p>
                        <p className="text-gray-500 text-xs">{p.tipoEvento}</p>
                      </div>
                      <span className="text-red-400 text-xs shrink-0 font-semibold">
                        {dias === 999 ? 'Sin fecha' : `+${dias}d`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {total === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-white font-semibold">Todo al día</p>
              <p className="text-gray-500 text-sm mt-1">No hay alertas pendientes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
