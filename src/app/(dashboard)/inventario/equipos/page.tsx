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
        <span className="ml-auto text-xs text-[#444]">{filtrados.length} equipos</span>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => <div key={i} className="h-36 bg-[#111] rounded-xl animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Sin equipos con los filtros actuales.</p>
        </div>
      ) : (
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
                    {/* Imagen */}
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#0d0d0d] flex items-center justify-center">
                      {e.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imagenUrl} alt={e.descripcion}
                          className="w-full h-full object-contain p-2" />
                      ) : (
                        <svg className="w-8 h-8 text-[#2a2a2a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    {/* Info */}
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
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${ESTADO_BADGE[e.estado] ?? "bg-[#1a1a1a] text-[#555]"}`}>
                        {ESTADO_LABEL[e.estado] ?? e.estado}
                      </span>
                      <span className="text-[10px] text-[#6b7280] font-medium">×{e.cantidadTotal}</span>
                    </div>
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
