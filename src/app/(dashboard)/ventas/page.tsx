"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Vendedor {
  id: string;
  name: string;
  fechaInicioVendedor: string | null;
}

interface TratoResumen {
  id: string;
  etapa: string;
  cliente: { nombre: string; empresa: string | null };
  nombreEvento: string | null;
  fechaEventoEstimada: string | null;
  presupuestoEstimado: number | null;
  origenVenta: string;
  responsable: { id: string; name: string } | null;
  createdAt: string;
}

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

const ETAPAS = ["DESCUBRIMIENTO", "OPORTUNIDAD", "VENTA_CERRADA", "VENTA_PERDIDA"];
const ETAPA_LABEL: Record<string, string> = {
  DESCUBRIMIENTO: "Descubrimiento",
  OPORTUNIDAD: "Oportunidad",
  VENTA_CERRADA: "Venta Cerrada",
  VENTA_PERDIDA: "Venta Perdida",
};
const ETAPA_COLOR: Record<string, string> = {
  DESCUBRIMIENTO: "border-blue-600 text-blue-400",
  OPORTUNIDAD: "border-yellow-600 text-yellow-400",
  VENTA_CERRADA: "border-green-600 text-green-400",
  VENTA_PERDIDA: "border-red-700 text-red-500",
};
const ORIGEN_LABEL: Record<string, string> = {
  CLIENTE_PROPIO: "Propio",
  PUBLICIDAD: "Publicidad",
  ASIGNADO: "Asignado",
};
const ORIGEN_COLOR: Record<string, string> = {
  CLIENTE_PROPIO: "bg-purple-900/30 text-purple-300",
  PUBLICIDAD: "bg-blue-900/30 text-blue-300",
  ASIGNADO: "bg-orange-900/30 text-orange-300",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

export default function VentasPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vendedorSelId, setVendedorSelId] = useState<string>("");
  const [tratos, setTratos] = useState<TratoResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setSession(d.user);
        if (d.user.role !== "ADMIN") setVendedorSelId(d.user.id);
      }
    });
    // Cargar vendedores (solo admin los ve todos)
    fetch("/api/vendedores").then(r => r.json()).then(d => setVendedores(d.vendedores ?? []));
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    const params = vendedorSelId ? `?responsableId=${vendedorSelId}` : "";
    fetch(`/api/tratos${params}`)
      .then(r => r.json())
      .then(d => {
        setTratos(d.tratos ?? []);
        setLoading(false);
      });
  }, [session, vendedorSelId]);

  const tratosPorEtapa = ETAPAS.reduce<Record<string, TratoResumen[]>>((acc, e) => {
    acc[e] = tratos.filter(t => t.etapa === e);
    return acc;
  }, {});

  const totalPipeline = tratos
    .filter(t => t.etapa !== "VENTA_PERDIDA")
    .reduce((s, t) => s + (t.presupuestoEstimado ?? 0), 0);

  const cerradosMes = (() => {
    const now = new Date();
    return tratos.filter(t => {
      if (t.etapa !== "VENTA_CERRADA") return false;
      return true; // simplificado: todos los cerrados
    });
  })();

  const mesActual = new Date().toISOString().slice(0, 7);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ventas</h1>
          <p className="text-gray-400 text-sm mt-1">Pipeline, rendimiento y comisiones</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ventas/reporte"
            className="px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] transition-colors"
          >
            Reporte comisiones
          </Link>
          {session?.role === "ADMIN" && (
            <>
              <Link
                href="/ventas/vendedores"
                className="px-4 py-2 rounded-lg border border-[#333] text-gray-300 text-sm hover:text-white hover:border-[#555] transition-colors"
              >
                Vendedores
              </Link>
              <Link
                href="/ventas/config"
                className="px-4 py-2 rounded-lg border border-[#333] text-gray-300 text-sm hover:text-white hover:border-[#555] transition-colors"
              >
                Configuración
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Selector de vendedor (solo admin) */}
      {session?.role === "ADMIN" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Ver pipeline de:</span>
          <select
            value={vendedorSelId}
            onChange={e => setVendedorSelId(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">Todos los vendedores</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <Link
            href={`/ventas/reporte?mes=${mesActual}${vendedorSelId ? `&vendedorId=${vendedorSelId}` : ""}`}
            className="text-xs text-[#B3985B] hover:text-white transition-colors"
          >
            Ver comisiones del mes →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total pipeline", value: fmt(totalPipeline), sub: "Presupuesto estimado activo" },
          { label: "En descubrimiento", value: tratosPorEtapa.DESCUBRIMIENTO.length, sub: "tratos" },
          { label: "Oportunidades", value: tratosPorEtapa.OPORTUNIDAD.length, sub: "tratos" },
          { label: "Cerrados (total)", value: tratosPorEtapa.VENTA_CERRADA.length, sub: "tratos" },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline por etapas */}
      {loading ? (
        <div className="text-gray-500 text-sm text-center py-10">Cargando...</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {ETAPAS.map(etapa => (
            <div key={etapa} className={`bg-[#111] border rounded-xl p-4 ${etapa === "VENTA_PERDIDA" ? "border-[#1f1f1f] opacity-70" : "border-[#222]"}`}>
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-[#1a1a1a]`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${ETAPA_COLOR[etapa].split(" ")[1]}`}>
                  {ETAPA_LABEL[etapa]}
                </span>
                <span className="ml-auto text-xs text-gray-500 bg-[#1a1a1a] rounded-full px-2 py-0.5">
                  {tratosPorEtapa[etapa].length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tratosPorEtapa[etapa].length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-4">Sin tratos</p>
                )}
                {tratosPorEtapa[etapa].map(t => (
                  <Link
                    key={t.id}
                    href={`/crm/tratos/${t.id}`}
                    className="block bg-[#161616] border border-[#222] hover:border-[#333] rounded-lg p-3 transition-colors group"
                  >
                    <p className="text-white text-xs font-medium truncate group-hover:text-[#B3985B] transition-colors">
                      {t.nombreEvento || t.cliente.nombre}
                    </p>
                    <p className="text-gray-500 text-xs truncate mt-0.5">
                      {t.cliente.nombre}{t.cliente.empresa ? ` · ${t.cliente.empresa}` : ""}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      {t.presupuestoEstimado ? (
                        <span className="text-[#B3985B] text-xs font-medium">{fmt(t.presupuestoEstimado)}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${ORIGEN_COLOR[t.origenVenta] ?? "bg-gray-800 text-gray-400"}`}>
                        {ORIGEN_LABEL[t.origenVenta] ?? t.origenVenta}
                      </span>
                    </div>
                    {session?.role === "ADMIN" && t.responsable && (
                      <p className="text-gray-600 text-[10px] mt-1 truncate">↳ {t.responsable.name}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
