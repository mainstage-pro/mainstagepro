"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/Toast";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  activo: boolean;
  cantidadTotal: number;
  precioRenta: number;
  costoProveedor: number | null;
  costoInternoEstimado: number | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  proveedoresPrecios: { precio: number; proveedor: { id: string; nombre: string; empresa: string | null } }[];
  imagenUrl: string | null;
};

type Categoria = { id: string; nombre: string; orden: number };

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function KpiCard({ label, value, sub, color = "text-white" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[#444] text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

const inlineCls = "w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded text-right text-xs focus:outline-none focus:border-[#B3985B]/50 px-1.5 py-0.5 disabled:opacity-50";

export default function ValuacionActivosPage() {
  const toast = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"propios" | "externos">("propios");
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  function startEdit(id: string, field: string) { setEditingCell({ id, field }); }
  function stopEdit() { setEditingCell(null); }
  function isEditing(id: string, field: string) { return editingCell?.id === id && editingCell?.field === field; }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/inventario/maestro");
    const data = await res.json();
    setEquipos(data.equipos ?? []);
    setCategorias(data.categorias ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function patchEquipo(id: string, campo: string, valor: number | null) {
    setSavingInline(id);
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      setEquipos(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e));
    } finally {
      setSavingInline(null);
    }
  }

  async function descargarPDF() {
    try {
      const res = await fetch("/api/inventario/pdf", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventario-Valuacion-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF");
    }
  }

  const propios = useMemo(() => equipos.filter(e => e.tipo === "PROPIO" && e.activo), [equipos]);
  const externos = useMemo(() => equipos.filter(e => e.tipo === "EXTERNO" && e.activo), [equipos]);

  const porCategoriaPropios = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: propios.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, propios]
  );

  const porCategoriaExternos = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: externos.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, externos]
  );

  const totalValorPropio = propios.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
  const totalRentaPropios = propios.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
  const totalCostoExternos = externos.reduce((s, e) => s + (e.costoProveedor ?? 0) * e.cantidadTotal, 0);
  const totalRentaExternos = externos.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Valuación de Activos</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Gestión financiera del inventario · solo administración</p>
        </div>
        <button
          onClick={descargarPDF}
          className="flex items-center gap-2 border border-[#333] hover:border-[#B3985B]/50 text-[#6b7280] hover:text-[#B3985B] text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        {(["propios", "externos"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-[#B3985B] text-black"
                : "text-[#6b7280] hover:text-white"
            }`}
          >
            {t === "propios" ? `Equipos Propios (${propios.length})` : `Equipos Externos (${externos.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>
      ) : tab === "propios" ? (

        /* ── PESTAÑA PROPIOS ── */
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Equipos propios" value={String(propios.length)} sub={`${porCategoriaPropios.length} categorías`} />
            <KpiCard label="Valor total del activo" value={fmx(totalValorPropio)} sub="Costo de adquisición" color="text-[#B3985B]" />
            <KpiCard label="Renta mensual potencial" value={fmx(totalRentaPropios)} sub="Precio renta × cantidad" color="text-emerald-400" />
          </div>

          {propios.length === 0 ? (
            <p className="text-center text-[#333] text-sm py-12">No hay equipos propios registrados.</p>
          ) : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                      <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                      <th className="text-right px-4 py-2.5 font-medium w-16">Cant.</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Valor unitario</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Precio de renta</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Subtotal valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoriaPropios.map(({ cat, items }) => {
                      const catValor = items.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
                      const catRenta = items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
                      return (
                        <>
                          {/* Separador de categoría */}
                          <tr key={`cat-${cat.id}`} className="border-t border-[#1a1a1a]">
                            <td colSpan={5} className="px-4 py-1.5 bg-[#0d0d0d]">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat.nombre}</span>
                                <span className="text-[#333] text-[10px]">({items.length})</span>
                                <div className="flex-1" />
                                {catValor > 0 && <span className="text-[10px] text-[#555]">Activo {fmx(catValor)}</span>}
                                {catRenta > 0 && <span className="text-[10px] text-emerald-900">Renta pot. {fmx(catRenta)}</span>}
                              </div>
                            </td>
                          </tr>
                          {/* Equipos */}
                          {items.map(e => {
                            const valorUnitario = e.costoInternoEstimado;
                            const subtotal = valorUnitario != null ? valorUnitario * e.cantidadTotal : null;
                            return (
                              <tr key={e.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {e.imagenUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={e.imagenUrl} alt="" className="w-7 h-7 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                                    ) : (
                                      <div className="w-7 h-7 rounded bg-[#1a1a1a] shrink-0" />
                                    )}
                                    <div>
                                      <p className="text-white font-medium">{(e.marca || e.modelo) ? [e.marca, e.modelo].filter(Boolean).join(" · ") : e.descripcion}</p>
                                      {(e.marca || e.modelo) && <p className="text-[#555] text-[10px]">{e.descripcion}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className="text-white font-medium tabular-nums">{e.cantidadTotal}</span>
                                </td>
                                {/* Valor unitario — editable */}
                                <td className="px-4 py-2.5 text-right">
                                  {isEditing(e.id, "costoInternoEstimado") ? (
                                    <input type="number" autoFocus defaultValue={valorUnitario ?? ""} min={0} placeholder="0"
                                      disabled={savingInline === e.id}
                                      className={`${inlineCls} text-[#9ca3af]`}
                                      onBlur={ev => { const raw = ev.target.value; const v = raw === "" ? null : parseFloat(raw); if (v !== valorUnitario) patchEquipo(e.id, "costoInternoEstimado", v); stopEdit(); }}
                                      onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                                  ) : (
                                    <button onClick={() => startEdit(e.id, "costoInternoEstimado")}
                                      className="text-[#9ca3af] font-medium hover:opacity-75 transition-opacity tabular-nums">
                                      {valorUnitario != null ? fmx(valorUnitario) : <span className="text-[#333]">—</span>}
                                    </button>
                                  )}
                                </td>
                                {/* Precio renta — editable */}
                                <td className="px-4 py-2.5 text-right">
                                  {isEditing(e.id, "precioRenta") ? (
                                    <input type="number" autoFocus defaultValue={e.precioRenta} min={0}
                                      disabled={savingInline === e.id}
                                      className={`${inlineCls} text-[#B3985B]`}
                                      onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v !== e.precioRenta) patchEquipo(e.id, "precioRenta", v); stopEdit(); }}
                                      onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                                  ) : (
                                    <button onClick={() => startEdit(e.id, "precioRenta")}
                                      className="text-[#B3985B] font-medium hover:opacity-75 transition-opacity tabular-nums">
                                      {fmx(e.precioRenta)}
                                    </button>
                                  )}
                                </td>
                                {/* Subtotal */}
                                <td className="px-4 py-2.5 text-right">
                                  {subtotal != null
                                    ? <span className="text-white font-semibold tabular-nums">{fmx(subtotal)}</span>
                                    : <span className="text-[#333]">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Total global */}
              <div className="border-t border-[#222] px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-[#0d0d0d]">
                <p className="text-[#6b7280] text-xs">{propios.length} equipos propios</p>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor total del activo</p>
                    <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmx(totalValorPropio)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Renta mensual potencial</p>
                    <p className="text-emerald-400 font-bold text-base tabular-nums">{fmx(totalRentaPropios)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : (

        /* ── PESTAÑA EXTERNOS ── */
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Equipos externos" value={String(externos.length)} sub="De proveedores" />
            <KpiCard label="Costo a Mainstage" value={fmx(totalCostoExternos)} sub="Lo que paga Mainstage" color="text-orange-400" />
            <KpiCard label="Precio público potencial" value={fmx(totalRentaExternos)} sub="Lo que cobra Mainstage" color="text-[#B3985B]" />
          </div>

          {externos.length === 0 ? (
            <p className="text-center text-[#333] text-sm py-12">No hay equipos externos registrados.</p>
          ) : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                      <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Proveedor</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">P. Mainstage</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Precio público</th>
                      <th className="text-right px-4 py-2.5 font-medium w-24 hidden md:table-cell">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoriaExternos.map(({ cat, items }) => (
                      <>
                        {/* Separador de categoría */}
                        <tr key={`cat-${cat.id}`} className="border-t border-[#1a1a1a]">
                          <td colSpan={5} className="px-4 py-1.5 bg-[#0d0d0d]">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat.nombre}</span>
                              <span className="text-[#333] text-[10px]">({items.length})</span>
                            </div>
                          </td>
                        </tr>
                        {/* Equipos */}
                        {items.map(e => {
                          const margen = e.precioRenta > 0 && e.costoProveedor != null
                            ? ((e.precioRenta - e.costoProveedor) / e.precioRenta) * 100
                            : null;
                          const provNombre = e.proveedorDefault?.nombre
                            ?? e.proveedoresPrecios?.[0]?.proveedor?.nombre
                            ?? null;
                          return (
                            <tr key={e.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  {e.imagenUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={e.imagenUrl} alt="" className="w-7 h-7 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                                  ) : (
                                    <div className="w-7 h-7 rounded bg-[#1a1a1a] shrink-0" />
                                  )}
                                  <div>
                                    <p className="text-white font-medium">{(e.marca || e.modelo) ? [e.marca, e.modelo].filter(Boolean).join(" · ") : e.descripcion}</p>
                                    {(e.marca || e.modelo) && <p className="text-[#555] text-[10px]">{e.descripcion}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 hidden md:table-cell">
                                <span className="text-[#6b7280] text-[11px]">{provNombre ?? <span className="text-[#333]">—</span>}</span>
                              </td>
                              {/* P. Mainstage — editable */}
                              <td className="px-4 py-2.5 text-right">
                                {isEditing(e.id, "costoProveedor") ? (
                                  <input type="number" autoFocus defaultValue={e.costoProveedor ?? ""} min={0} placeholder="0"
                                    disabled={savingInline === e.id}
                                    className={`${inlineCls} text-orange-400`}
                                    onBlur={ev => { const raw = ev.target.value; const v = raw === "" ? null : parseFloat(raw); if (v !== e.costoProveedor) patchEquipo(e.id, "costoProveedor", v); stopEdit(); }}
                                    onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                                ) : (
                                  <button onClick={() => startEdit(e.id, "costoProveedor")}
                                    className="text-orange-400/80 font-medium hover:text-orange-400 transition-colors tabular-nums">
                                    {e.costoProveedor != null ? fmx(e.costoProveedor) : <span className="text-[#333]">—</span>}
                                  </button>
                                )}
                              </td>
                              {/* Precio público — editable */}
                              <td className="px-4 py-2.5 text-right">
                                {isEditing(e.id, "precioRenta") ? (
                                  <input type="number" autoFocus defaultValue={e.precioRenta} min={0}
                                    disabled={savingInline === e.id}
                                    className={`${inlineCls} text-[#B3985B]`}
                                    onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v !== e.precioRenta) patchEquipo(e.id, "precioRenta", v); stopEdit(); }}
                                    onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                                ) : (
                                  <button onClick={() => startEdit(e.id, "precioRenta")}
                                    className="text-[#B3985B] font-medium hover:opacity-75 transition-opacity tabular-nums">
                                    {fmx(e.precioRenta)}
                                  </button>
                                )}
                              </td>
                              {/* Margen */}
                              <td className="px-4 py-2.5 text-right hidden md:table-cell">
                                {margen != null ? (
                                  <span className={`font-medium tabular-nums ${margen >= 30 ? "text-emerald-400" : margen >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                                    {margen.toFixed(1)}%
                                  </span>
                                ) : <span className="text-[#333]">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Total global */}
              <div className="border-t border-[#222] px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-[#0d0d0d]">
                <p className="text-[#6b7280] text-xs">{externos.length} equipos externos</p>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Costo total a Mainstage</p>
                    <p className="text-orange-400 font-bold text-base tabular-nums">{fmx(totalCostoExternos)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Precio público potencial</p>
                    <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmx(totalRentaExternos)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
