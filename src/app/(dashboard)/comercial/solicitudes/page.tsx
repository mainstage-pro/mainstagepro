"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_COLORS,
  TIPO_EVENTO_LABELS,
} from "@/lib/constants";

interface Solicitud {
  id: string;
  folio: number;
  clienteNombre: string;
  fechaEvento: string | null;
  lugarEvento: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  estado: string;
  entregable: string;
  createdAt: string;
  tratoId: string | null;
  vendedor: { id: string; name: string } | null;
  _count: { equipos: number };
}

const ESTADOS = ["NUEVA", "ASIGNADA", "COTIZADA", "CONVERTIDA"];

function fmtFecha(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");

  useEffect(() => {
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => setUsuarios(d.usuarios || []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroVendedor) params.set("vendedorId", filtroVendedor);
      try {
        const res = await fetch(`/api/solicitudes-cotizacion?${params.toString()}`);
        const d = await res.json();
        if (!cancelled) setSolicitudes(d.solicitudes || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filtroEstado, filtroVendedor]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="ms-h1">Solicitudes de Cotización</h1>
          <p className="text-gray-600 text-xs mt-1">Bandeja de briefs para cotizar — captura rápida sin crear contacto</p>
        </div>
        <Link
          href="/comercial/solicitudes/nuevo"
          className="bg-[#B3985B] text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#B3985B]/80 transition-colors"
        >
          + Nueva solicitud
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_SOLICITUD_LABELS[e]}</option>)}
        </select>
        <select
          value={filtroVendedor}
          onChange={e => setFiltroVendedor(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2"
        >
          <option value="">Todos los vendedores</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Cargando…</div>
      ) : solicitudes.length === 0 ? (
        <div className="ms-card p-10 text-center text-gray-500 text-sm">
          No hay solicitudes. Crea la primera con “+ Nueva solicitud”.
        </div>
      ) : (
        <div className="ms-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333] text-[#B3985B] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-semibold">#</th>
                <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                <th className="text-left py-3 px-4 font-semibold">Fecha evento</th>
                <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold">Estado</th>
                <th className="text-left py-3 px-4 font-semibold">Vendedor</th>
                <th className="text-left py-3 px-4 font-semibold">Creada</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(s => (
                <tr key={s.id} className="border-b border-[#1a1a1a] hover:bg-[#0f0f0f] transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/comercial/solicitudes/${s.id}`} className="text-gray-500 hover:text-[#B3985B]">
                      {String(s.folio).padStart(3, "0")}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/comercial/solicitudes/${s.id}`} className="text-white hover:text-[#B3985B] font-medium">
                      {s.clienteNombre}
                    </Link>
                    {s._count.equipos > 0 && (
                      <span className="text-gray-600 text-xs ml-2">· {s._count.equipos} equipo{s._count.equipos !== 1 ? "s" : ""}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{fmtFecha(s.fechaEvento)}</td>
                  <td className="py-3 px-4 text-gray-400">{s.tipoEvento ? (TIPO_EVENTO_LABELS[s.tipoEvento] || s.tipoEvento) : "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${ESTADO_SOLICITUD_COLORS[s.estado] || "bg-gray-500/10 text-gray-400"}`}>
                      {ESTADO_SOLICITUD_LABELS[s.estado] || s.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{s.vendedor?.name || <span className="text-gray-600">Sin asignar</span>}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{fmtFecha(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
