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
  categoria: { id: string; nombre: string; orden: number };
  imagenUrl: string | null;
  notas: string | null;
};

type Categoria = { id: string; nombre: string; orden: number };

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/30 text-green-400",
  EN_MANTENIMIENTO: "bg-yellow-900/30 text-yellow-400",
  DADO_DE_BAJA: "bg-red-900/30 text-red-400",
};
const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo", EN_MANTENIMIENTO: "En mantenimiento", DADO_DE_BAJA: "Dado de baja",
};

export default function InventarioEquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | "PROPIO" | "EXTERNO">("TODOS");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [vista, setVista] = useState<"grid" | "lista">("grid");

  async function load() {
    const res = await fetch("/api/equipos?todos=true");
    const data = await res.json();
    const eq: Equipo[] = data.equipos ?? [];
    setEquipos(eq);
    const cats = Array.from(
      new Map(eq.map(e => [e.categoria.id, e.categoria])).values()
    ).sort((a, b) => a.orden - b.orden);
    setCategorias(cats);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function descargarPDF() {
    setDescargandoPDF(true);
    try {
      const res = await fetch("/api/inventario/pdf", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventario-MainstagePro-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDescargandoPDF(false);
    }
  }

  const filtrados = useMemo(() => {
    return equipos.filter(e => {
      if (!e.activo) return false;
      if (tipoFiltro !== "TODOS" && e.tipo !== tipoFiltro) return false;
      if (categoriaFiltro && e.categoria.id !== categoriaFiltro) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.descripcion.toLowerCase().includes(q) &&
          !(e.marca ?? "").toLowerCase().includes(q) &&
          !(e.modelo ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [equipos, search, tipoFiltro, categoriaFiltro]);

  const porCategoria = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: filtrados.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, filtrados]
  );

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario de Equipos</h1>
          <p className="text-[#6b7280] text-sm">{equipos.filter(e => e.activo).length} equipos activos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={descargarPDF} disabled={descargandoPDF}
            className="flex items-center gap-2 border border-[#333] hover:border-[#B3985B]/50 text-[#6b7280] hover:text-[#B3985B] text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {descargandoPDF ? "Generando..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Banner solo lectura */}
      <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#B3985B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[#9ca3af] text-xs">
            Esta vista es de <span className="text-white font-medium">solo lectura</span>. Para registrar o editar equipos y precios, usa el Inventario Maestro.
          </p>
        </div>
        <Link href="/inventario/maestro"
          className="shrink-0 text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          Ir al Maestro →
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo..."
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-44" />
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-lg p-0.5">
          {(["TODOS", "PROPIO", "EXTERNO"] as const).map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${tipoFiltro === t ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
              {t === "TODOS" ? "Todos" : t === "PROPIO" ? "Propios" : "Externos"}
            </button>
          ))}
        </div>
        <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Categoría: todas</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <span className="text-xs text-[#444]">{filtrados.length} equipos</span>

        {/* Toggle vista */}
        <div className="ml-auto flex gap-0.5 bg-[#111] border border-[#222] rounded-lg p-0.5">
          <button onClick={() => setVista("grid")} title="Vista cuadrícula"
            className={`p-1.5 rounded transition-colors ${vista === "grid" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button onClick={() => setVista("lista")} title="Vista lista"
            className={`p-1.5 rounded transition-colors ${vista === "lista" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-white"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        vista === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => <div key={i} className="h-36 bg-[#111] rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {[...Array(10)].map((_, i) => <div key={i} className="h-10 bg-[#111] rounded-lg animate-pulse" />)}
          </div>
        )
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Sin equipos con los filtros actuales.</p>
        </div>
      ) : vista === "grid" ? (

        /* ── Vista cuadrícula ── */
        <div className="space-y-8">
          {porCategoria.map(({ cat, items }) => (
            <div key={cat.id}>
              <h2 className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold mb-3 pb-2 border-b border-[#1a1a1a]">
                {cat.nombre} <span className="text-[#333] ml-1">({items.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {items.map(e => (
                  <Link key={e.id} href={`/inventario/equipos/${e.id}`}
                    className="bg-[#111] border border-[#1a1a1a] hover:border-[#B3985B]/40 rounded-xl p-3 flex flex-col gap-2 transition-colors group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#0d0d0d] flex items-center justify-center">
                      {e.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imagenUrl} alt={e.descripcion} className="w-full h-full object-contain p-2" />
                      ) : (
                        <svg className="w-8 h-8 text-[#2a2a2a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium leading-snug group-hover:text-[#B3985B] transition-colors line-clamp-2">
                        {e.descripcion}
                      </p>
                      {(e.marca || e.modelo) && (
                        <p className="text-[#555] text-[10px] truncate mt-0.5">
                          {[e.marca, e.modelo].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${ESTADO_BADGE[e.estado] ?? "bg-[#1a1a1a] text-[#555]"}`}>
                        {ESTADO_LABEL[e.estado] ?? e.estado}
                      </span>
                      <span className="text-sm font-bold text-white">×{e.cantidadTotal}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ── Vista lista ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-[#555]">
                <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Categoría</th>
                <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Tipo</th>
                <th className="text-center px-3 py-2.5 font-medium">Estado</th>
                <th className="text-right px-4 py-2.5 font-medium">Cant.</th>
              </tr>
            </thead>
            <tbody>
              {porCategoria.map(({ cat, items }) => (
                <>
                  <tr key={`cat-${cat.id}`} className="bg-[#0d0d0d]">
                    <td colSpan={5} className="px-4 py-2 text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">
                      {cat.nombre} <span className="text-[#333] ml-1">({items.length})</span>
                    </td>
                  </tr>
                  {items.map(e => (
                    <tr key={e.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors group">
                      <td className="px-4 py-2.5">
                        <Link href={`/inventario/equipos/${e.id}`} className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-[#0a0a0a] flex items-center justify-center shrink-0">
                            {e.imagenUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={e.imagenUrl} alt={e.descripcion} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <svg className="w-4 h-4 text-[#2a2a2a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate group-hover:text-[#B3985B] transition-colors">
                              {e.descripcion}
                            </p>
                            {(e.marca || e.modelo) && (
                              <p className="text-[#555] text-[10px] truncate">
                                {[e.marca, e.modelo].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[#6b7280] hidden md:table-cell">{e.categoria.nombre}</td>
                      <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.tipo === "PROPIO" ? "bg-[#1a1a1a] text-[#6b7280]" : "bg-blue-900/20 text-blue-400"}`}>
                          {e.tipo === "PROPIO" ? "Propio" : "Externo"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${ESTADO_BADGE[e.estado] ?? "bg-[#1a1a1a] text-[#555]"}`}>
                          {ESTADO_LABEL[e.estado] ?? e.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-white font-bold text-sm">×{e.cantidadTotal}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

      )}
    </div>
  );
}
