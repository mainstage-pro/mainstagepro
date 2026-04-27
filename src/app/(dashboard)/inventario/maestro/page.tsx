"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  estado: string;
  activo: boolean;
  cantidadTotal: number;
  precioRenta: number;
  costoProveedor: number | null;
  costoInternoEstimado: number | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  imagenUrl: string | null;
  _count: { accesorios: number };
};

type Categoria = { id: string; nombre: string };

type Kpis = {
  totalEquipos: number;
  totalPropios: number;
  totalExternos: number;
  valorTotalActivo: number;
  potencialRentaMensual: number;
};

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/20 text-green-400",
  EN_MANTENIMIENTO: "bg-yellow-900/20 text-yellow-400",
  DADO_DE_BAJA: "bg-red-900/20 text-red-400",
};

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  EN_MANTENIMIENTO: "En mantenimiento",
  DADO_DE_BAJA: "Dado de baja",
};

export default function InventarioMaestroPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  const [filtroTipo, setFiltroTipo] = useState<"" | "PROPIO" | "EXTERNO">("");
  const [filtroEstado, setFiltroEstado] = useState<"" | "ACTIVO" | "EN_MANTENIMIENTO" | "DADO_DE_BAJA">("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroInactivos, setFiltroInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filtroTipo) qs.set("tipo", filtroTipo);
    if (filtroEstado) qs.set("estado", filtroEstado);
    if (filtroCategoria) qs.set("categoriaId", filtroCategoria);
    if (filtroInactivos) qs.set("inactivos", "true");

    fetch(`/api/inventario/maestro?${qs}`)
      .then(r => r.json())
      .then(d => {
        setEquipos(d.equipos ?? []);
        setCategorias(d.categorias ?? []);
        setKpis(d.kpis ?? null);
        setLoading(false);
      });
  }, [filtroTipo, filtroEstado, filtroCategoria, filtroInactivos]);

  const equiposFiltrados = useMemo(() => {
    if (!busqueda.trim()) return equipos;
    const q = busqueda.toLowerCase();
    return equipos.filter(e =>
      e.descripcion.toLowerCase().includes(q) ||
      (e.marca ?? "").toLowerCase().includes(q) ||
      (e.modelo ?? "").toLowerCase().includes(q) ||
      e.categoria.nombre.toLowerCase().includes(q)
    );
  }, [equipos, busqueda]);

  const valorTotal = useMemo(() =>
    equiposFiltrados
      .filter(e => e.tipo === "PROPIO")
      .reduce((sum, e) => sum + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0),
    [equiposFiltrados]
  );

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/inventario/equipos" className="text-xs text-[#6b7280] hover:text-[#B3985B] transition-colors inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Inventario de equipos
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-white">Inventario maestro</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Activos, precios de renta y valor del inventario</p>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Total equipos</p>
            <p className="text-white text-2xl font-semibold">{kpis.totalEquipos}</p>
            <p className="text-[#444] text-[10px] mt-0.5">{kpis.totalPropios} propios · {kpis.totalExternos} externos</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Valor del inventario</p>
            <p className="text-[#B3985B] text-2xl font-semibold">{fmx(kpis.valorTotalActivo)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Costo activo equipos propios</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Renta mensual potencial</p>
            <p className="text-green-400 text-2xl font-semibold">{fmx(kpis.potencialRentaMensual)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Suma precio renta × cantidad</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Valor filtrado</p>
            <p className="text-white text-2xl font-semibold">{fmx(valorTotal)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Propios en vista actual</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar equipo..."
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-44"
        />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none focus:border-[#B3985B]/40">
          <option value="">Tipo: todos</option>
          <option value="PROPIO">Propios</option>
          <option value="EXTERNO">Externos</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none focus:border-[#B3985B]/40">
          <option value="">Estado: todos</option>
          <option value="ACTIVO">Activo</option>
          <option value="EN_MANTENIMIENTO">En mantenimiento</option>
          <option value="DADO_DE_BAJA">Dado de baja</option>
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none focus:border-[#B3985B]/40">
          <option value="">Categoría: todas</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
          <input type="checkbox" checked={filtroInactivos} onChange={e => setFiltroInactivos(e.target.checked)}
            className="accent-[#B3985B]" />
          Incluir inactivos
        </label>
        <span className="ml-auto text-xs text-[#444]">{equiposFiltrados.length} equipos</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Sin equipos con los filtros actuales.</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium">Equipo</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-medium hidden md:table-cell">Categoría</th>
                  <th className="text-center px-3 py-3 text-[#6b7280] font-medium">Tipo</th>
                  <th className="text-center px-3 py-3 text-[#6b7280] font-medium hidden sm:table-cell">Estado</th>
                  <th className="text-right px-3 py-3 text-[#6b7280] font-medium">Cant.</th>
                  <th className="text-right px-4 py-3 text-[#6b7280] font-medium">Precio renta</th>
                  <th className="text-right px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Valor del activo</th>
                  <th className="text-right px-4 py-3 text-[#6b7280] font-medium hidden lg:table-cell">Valor total (cant. × activo)</th>
                  <th className="text-center px-3 py-3 text-[#6b7280] font-medium hidden xl:table-cell">Acc.</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161616]">
                {equiposFiltrados.map(e => {
                  const valorActivo = e.costoInternoEstimado ?? null;
                  const valorFilaTotal = valorActivo != null ? valorActivo * e.cantidadTotal : null;
                  return (
                    <tr key={e.id} className="hover:bg-[#0d0d0d] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {e.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.imagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{e.descripcion}</p>
                            {(e.marca || e.modelo) && (
                              <p className="text-[#555] truncate">{[e.marca, e.modelo].filter(Boolean).join(" · ")}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">{e.categoria.nombre}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.tipo === "PROPIO" ? "bg-[#1a1a1a] text-[#6b7280]" : "bg-blue-900/20 text-blue-400"}`}>
                          {e.tipo === "PROPIO" ? "Propio" : "Externo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center hidden sm:table-cell">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ESTADO_BADGE[e.estado] ?? "bg-[#1a1a1a] text-[#6b7280]"}`}>
                          {ESTADO_LABEL[e.estado] ?? e.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-white font-medium">{e.cantidadTotal}</td>
                      <td className="px-4 py-3 text-right text-[#B3985B] font-medium">
                        {e.precioRenta === 0 ? <span className="text-[#444]">Incluye</span> : fmx(e.precioRenta)}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {valorActivo != null ? (
                          <span className="text-[#9ca3af]">{fmx(valorActivo)}</span>
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {valorFilaTotal != null ? (
                          <span className="text-white font-medium">{fmx(valorFilaTotal)}</span>
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center hidden xl:table-cell">
                        {e._count.accesorios > 0 ? (
                          <span className="text-[#B3985B] font-medium">{e._count.accesorios}</span>
                        ) : (
                          <span className="text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/inventario/equipos/${e.id}`}
                          className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#B3985B] transition-all text-[10px]">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer con totales */}
          <div className="border-t border-[#1a1a1a] px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0d0d0d]">
            <p className="text-[#555] text-xs">{equiposFiltrados.length} equipos mostrados</p>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-right hidden lg:block">
                <p className="text-[#555]">Total valor del activo (vista)</p>
                <p className="text-[#B3985B] font-semibold">
                  {fmx(equiposFiltrados.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#555]">Renta potencial (vista)</p>
                <p className="text-green-400 font-semibold">
                  {fmx(equiposFiltrados.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
