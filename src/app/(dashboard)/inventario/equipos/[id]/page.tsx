"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  estado: string;
  precioRenta: number;
  costoProveedor: number | null;
  cantidadTotal: number;
  notas: string | null;
  activo: boolean;
  amperajeRequerido: number | null;
  voltajeRequerido: number | null;
  imagenUrl: string | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; correo: string | null; telefono: string | null } | null;
  mantenimientos: Array<{
    id: string; fecha: string; tipo: string;
    accionRealizada: string; estadoEquipo: string;
    comentarios: string | null; proximoMantenimiento: string | null;
  }>;
  proyectoEquipos: Array<{
    id: string;
    proyecto: {
      id: string; nombre: string; numeroProyecto: number;
      fechaEvento: string | null; estado: string;
      cliente: { nombre: string };
    };
  }>;
};

function fmt(n: number) {
  if (n === 0) return "INCLUYE";
  return `$${n.toLocaleString("es-MX")}`;
}

export default function EquipoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/equipos/${id}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setEquipo(d.equipo ?? null); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[#1a1a1a] rounded w-48" />
          <div className="h-7 bg-[#1a1a1a] rounded w-96" />
          <div className="h-64 bg-[#1a1a1a] rounded-xl mt-6" />
        </div>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center space-y-3">
        <p className="text-[#6b7280]">Equipo no encontrado.</p>
        <Link href="/inventario/equipos" className="text-[#B3985B] text-sm hover:underline">← Volver al inventario</Link>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/inventario/equipos" className="text-xs text-[#6b7280] hover:text-[#B3985B] transition-colors mb-1.5 inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Inventario de equipos
          </Link>
          <div className="flex items-center gap-3">
            {equipo.imagenUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={equipo.imagenUrl} alt="" className="w-12 h-12 object-contain rounded-lg bg-[#0a0a0a] p-1 shrink-0" />
            )}
            <div>
              <h1 className="text-xl font-semibold text-white">{equipo.descripcion}</h1>
              <p className="text-[#6b7280] text-sm mt-0.5">
                {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                {[equipo.marca, equipo.modelo].filter(Boolean).length > 0 && " · "}
                {equipo.categoria.nombre}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded font-medium ${equipo.activo ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {equipo.activo ? "ACTIVO" : "INACTIVO"}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#6b7280] border border-[#222]">
            {equipo.tipo === "PROPIO" ? "Propio" : "Externo"}
          </span>
        </div>
      </div>

      {/* Datos rápidos */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">Datos del equipo</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-[#6b7280] text-xs mb-0.5">Precio al cliente</dt>
            <dd className="text-white font-medium">{fmt(equipo.precioRenta)}</dd>
          </div>
          <div>
            <dt className="text-[#6b7280] text-xs mb-0.5">Cantidad</dt>
            <dd className="text-white">{equipo.cantidadTotal}</dd>
          </div>
          {(equipo.amperajeRequerido != null || equipo.voltajeRequerido != null) && (
            <div>
              <dt className="text-[#6b7280] text-xs mb-0.5">Eléctrico</dt>
              <dd className="text-yellow-400 text-xs">
                {equipo.amperajeRequerido != null ? `${equipo.amperajeRequerido}A` : ""}
                {equipo.amperajeRequerido != null && equipo.voltajeRequerido != null ? " · " : ""}
                {equipo.voltajeRequerido != null ? `${equipo.voltajeRequerido}V` : ""}
              </dd>
            </div>
          )}
          {equipo.tipo === "EXTERNO" && equipo.costoProveedor != null && (
            <div>
              <dt className="text-[#6b7280] text-xs mb-0.5">Costo proveedor</dt>
              <dd className="text-white">{fmt(equipo.costoProveedor)}</dd>
            </div>
          )}
          {equipo.proveedorDefault && (
            <div>
              <dt className="text-[#6b7280] text-xs mb-0.5">Proveedor</dt>
              <dd className="text-white text-xs">{equipo.proveedorDefault.nombre}</dd>
            </div>
          )}
          {equipo.notas && (
            <div className="col-span-2 sm:col-span-4 border-t border-[#1a1a1a] pt-3 mt-1">
              <dt className="text-[#6b7280] text-xs mb-1">Notas</dt>
              <dd className="text-[#9ca3af] text-xs leading-relaxed">{equipo.notas}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proyectos */}
        {equipo.proyectoEquipos.length > 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">
              Proyectos ({equipo.proyectoEquipos.length})
            </h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {equipo.proyectoEquipos.map(pe => (
                <Link key={pe.id} href={`/proyectos/${pe.proyecto.id}`}
                  className="flex items-center justify-between text-xs p-2 rounded bg-[#0d0d0d] hover:bg-[#1a1a1a] transition-colors group">
                  <div className="min-w-0">
                    <p className="text-white group-hover:text-[#B3985B] transition-colors truncate">
                      #{pe.proyecto.numeroProyecto} — {pe.proyecto.nombre}
                    </p>
                    <p className="text-[#555] truncate">{pe.proyecto.cliente.nombre}</p>
                  </div>
                  {pe.proyecto.fechaEvento && (
                    <span className="text-[#555] shrink-0 ml-3">
                      {new Date(pe.proyecto.fechaEvento).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "2-digit" })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mantenimiento */}
        {equipo.mantenimientos.length > 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">
              Mantenimiento ({equipo.mantenimientos.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {equipo.mantenimientos.map(m => (
                <div key={m.id} className="flex items-start gap-4 text-xs p-3 bg-[#0d0d0d] rounded-lg">
                  <div className="shrink-0 text-[#555] w-20 pt-0.5">
                    {new Date(m.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white">{m.accionRealizada}</p>
                    {m.comentarios && <p className="text-[#6b7280] mt-0.5">{m.comentarios}</p>}
                    {m.proximoMantenimiento && (
                      <p className="text-yellow-600/70 mt-0.5">
                        Próximo: {new Date(m.proximoMantenimiento).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#6b7280] text-[10px]">{m.tipo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {equipo.proyectoEquipos.length === 0 && equipo.mantenimientos.length === 0 && (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Aún no hay historial de proyectos ni mantenimientos para este equipo.</p>
          <Link href="/inventario/equipos" className="text-[#B3985B] text-xs mt-3 inline-block hover:underline">← Volver al inventario</Link>
        </div>
      )}
    </div>
  );
}
