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
  propietario: string;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  proveedoresPrecios: { precio: number; proveedor: { id: string; nombre: string; empresa: string | null } }[];
  imagenUrl: string | null;
  accesorios: Accesorio[];
};

type Accesorio = {
  id: string;
  nombre: string;
  cantidad: number;
  descripcion: string | null;
  categoria: { id: string; nombre: string } | null;
};

type Categoria = { id: string; nombre: string; orden: number };

type EquipoOficina = {
  id: string;
  nombre: string;
  cantidad: number;
  valorUnitario: number;
  precioRenta: number;
  propietario: string;
  categoria: string;
};

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
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

type Tab = "resumen" | "produccion" | "accesorios" | "oficina";

export default function InventarioActivosPage() {
  const toast = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  function startEdit(id: string, field: string) { setEditingCell({ id, field }); }
  function stopEdit() { setEditingCell(null); }
  function isEditing(id: string, field: string) { return editingCell?.id === id && editingCell?.field === field; }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventario/maestro");
      const data = await res.json();
      setEquipos(data.equipos ?? []);
      setCategorias(data.categorias ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function patchEquipo(id: string, campo: string, valor: number | string | null) {
    setSavingInline(id);
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      setEquipos(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e));
      if (campo === "propietario") toast.success(`Cambiado a ${valor}`);
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
      a.download = `Inventario-Activos-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF");
    }
  }

  // ── Equipos de Producción = equipos propios activos
  const equiposProd = useMemo(() =>
    equipos.filter(e => e.tipo === "PROPIO" && e.activo),
    [equipos]
  );

  // ── Accesorios de Producción = accesorios de todos los equipos propios
  const accesoriosProd = useMemo(() => {
    const all: (Accesorio & { equipoNombre: string; equipoId: string })[] = [];
    equiposProd.forEach(eq => {
      (eq.accesorios ?? []).forEach(acc => {
        all.push({ ...acc, equipoNombre: [eq.marca, eq.modelo].filter(Boolean).join(" · ") || eq.descripcion, equipoId: eq.id });
      });
    });
    return all;
  }, [equiposProd]);

  // ── KPIs globales
  const valorTotalProd = equiposProd.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
  const rentaTotalProd = equiposProd.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
  const rentabilidadProm = valorTotalProd > 0 ? (rentaTotalProd * 12 / valorTotalProd) * 100 : 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumen",     label: "Reporte General" },
    { key: "produccion",  label: `Equipos de Producción (${equiposProd.length})` },
    { key: "accesorios",  label: `Accesorios de Producción (${accesoriosProd.length})` },
    { key: "oficina",     label: "Equipos de Oficina" },
  ];

  // ── Agrupar propios por categoría
  const porCategoriaProd = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: equiposProd.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, equiposProd]
  );

  // ── Agrupar accesorios por categoría
  const accesoriosPorCat = useMemo(() => {
    const map = new Map<string, typeof accesoriosProd>();
    accesoriosProd.forEach(a => {
      const key = a.categoria?.nombre ?? "Sin categoría";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }, [accesoriosProd]);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario de Activos</h1>
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
      <div className="flex flex-wrap gap-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-[#B3985B] text-black" : "text-[#6b7280] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>

      ) : tab === "resumen" ? (

        /* ── REPORTE GENERAL ── */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Equipos de Producción" value={String(equiposProd.length)} sub={`${porCategoriaProd.length} categorías`} />
            <KpiCard label="Valor total del activo" value={fmx(valorTotalProd)} sub="Costo de adquisición" color="text-[#B3985B]" />
            <KpiCard label="Renta mensual potencial" value={fmx(rentaTotalProd)} sub="Precio renta × cantidad" color="text-emerald-400" />
            <KpiCard label="Rentabilidad anual" value={pct(rentabilidadProm)} sub="Renta × 12 / valor" color="text-blue-400" />
          </div>

          {/* Desglose por categoría */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e1e]">
              <p className="text-white text-sm font-medium">Desglose por categoría — Equipos de Producción</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                    <th className="text-left px-4 py-2.5 font-medium">Categoría</th>
                    <th className="text-right px-4 py-2.5 font-medium">Equipos</th>
                    <th className="text-right px-4 py-2.5 font-medium">Valor total</th>
                    <th className="text-right px-4 py-2.5 font-medium">% del total</th>
                    <th className="text-right px-4 py-2.5 font-medium">Renta mensual</th>
                    <th className="text-right px-4 py-2.5 font-medium">Rentabilidad anual</th>
                  </tr>
                </thead>
                <tbody>
                  {porCategoriaProd.map(({ cat, items }) => {
                    const catValor = items.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
                    const catRenta = items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
                    const catPct = valorTotalProd > 0 ? (catValor / valorTotalProd) * 100 : 0;
                    const catRentabilidad = catValor > 0 ? (catRenta * 12 / catValor) * 100 : 0;
                    return (
                      <tr key={cat.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                        <td className="px-4 py-2.5 text-white font-medium">{cat.nombre}</td>
                        <td className="px-4 py-2.5 text-right text-[#9ca3af]">{items.length}</td>
                        <td className="px-4 py-2.5 text-right text-[#B3985B] font-semibold tabular-nums">{fmx(catValor)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                              <div className="h-full bg-[#B3985B] rounded-full" style={{ width: `${catPct}%` }} />
                            </div>
                            <span className="text-[#6b7280] tabular-nums">{pct(catPct)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 tabular-nums">{fmx(catRenta)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-medium tabular-nums ${catRentabilidad >= 30 ? "text-emerald-400" : catRentabilidad >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                            {pct(catRentabilidad)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#222] bg-[#0d0d0d]">
                    <td className="px-4 py-3 text-[#6b7280] text-xs font-semibold uppercase tracking-wider">TOTAL</td>
                    <td className="px-4 py-3 text-right text-white font-bold">{equiposProd.length}</td>
                    <td className="px-4 py-3 text-right text-[#B3985B] font-bold tabular-nums">{fmx(valorTotalProd)}</td>
                    <td className="px-4 py-3 text-right text-[#6b7280]">100%</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold tabular-nums">{fmx(rentaTotalProd)}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-bold">{pct(rentabilidadProm)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

      ) : tab === "produccion" ? (

        /* ── EQUIPOS DE PRODUCCIÓN ── */
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Equipos propios" value={String(equiposProd.length)} sub={`${porCategoriaProd.length} categorías`} />
            <KpiCard label="Valor total del activo" value={fmx(valorTotalProd)} sub="Costo de adquisición" color="text-[#B3985B]" />
            <KpiCard label="Renta mensual potencial" value={fmx(rentaTotalProd)} sub="Precio renta × cantidad" color="text-emerald-400" />
          </div>

          {equiposProd.length === 0 ? (
            <p className="text-center text-[#333] text-sm py-12">No hay equipos de producción registrados.</p>
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
                      <th className="text-right px-4 py-2.5 font-medium w-32">Rentabilidad</th>
                      <th className="text-center px-4 py-2.5 font-medium w-28">Propietario</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Subtotal valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoriaProd.map(({ cat, items }) => {
                      const catValor = items.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
                      const catRenta = items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
                      return (
                        <>
                          <tr key={`cat-${cat.id}`} className="border-t border-[#1a1a1a]">
                            <td colSpan={7} className="px-4 py-1.5 bg-[#0d0d0d]">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat.nombre}</span>
                                <span className="text-[#333] text-[10px]">({items.length})</span>
                                <div className="flex-1" />
                                {catValor > 0 && <span className="text-[10px] text-[#555]">Activo {fmx(catValor)}</span>}
                                {catRenta > 0 && <span className="text-[10px] text-emerald-900">Renta pot. {fmx(catRenta)}</span>}
                              </div>
                            </td>
                          </tr>
                          {items.map(e => {
                            const valorUnitario = e.costoInternoEstimado;
                            const subtotal = valorUnitario != null ? valorUnitario * e.cantidadTotal : null;
                            const rentabilidad = valorUnitario && valorUnitario > 0
                              ? (e.precioRenta * 12 / valorUnitario) * 100
                              : null;
                            const esHervam = e.propietario === "HERVAM";
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
                                {/* Rentabilidad */}
                                <td className="px-4 py-2.5 text-right">
                                  {rentabilidad != null ? (
                                    <span className={`font-medium tabular-nums ${rentabilidad >= 30 ? "text-emerald-400" : rentabilidad >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                                      {pct(rentabilidad)}
                                    </span>
                                  ) : <span className="text-[#333]">—</span>}
                                </td>
                                {/* Propietario toggle */}
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    disabled={savingInline === e.id}
                                    onClick={() => patchEquipo(e.id, "propietario", esHervam ? "MAINSTAGE" : "HERVAM")}
                                    title={`Click para cambiar a ${esHervam ? "MAINSTAGE" : "HERVAM"}`}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all disabled:opacity-50 ${
                                      esHervam
                                        ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                        : "bg-[#B3985B]/20 text-[#B3985B] hover:bg-[#B3985B]/30"
                                    }`}
                                  >
                                    {esHervam ? "HERVAM" : "Mainstage"}
                                  </button>
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
                <p className="text-[#6b7280] text-xs">{equiposProd.length} equipos de producción</p>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor total del activo</p>
                    <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmx(valorTotalProd)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Renta mensual potencial</p>
                    <p className="text-emerald-400 font-bold text-base tabular-nums">{fmx(rentaTotalProd)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Rentabilidad anual</p>
                    <p className="text-blue-400 font-bold text-base tabular-nums">{pct(rentabilidadProm)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : tab === "accesorios" ? (

        /* ── ACCESORIOS DE PRODUCCIÓN ── */
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Total accesorios" value={String(accesoriosProd.length)} sub="De equipos de producción" />
            <KpiCard label="Categorías" value={String(accesoriosPorCat.length)} sub="Grupos de accesorios" color="text-[#B3985B]" />
            <KpiCard label="Equipos origen" value={String(equiposProd.filter(e => e.accesorios?.length > 0).length)} sub="Equipos con accesorios" color="text-emerald-400" />
          </div>

          {accesoriosProd.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
              <p className="text-[#333] text-sm">No hay accesorios registrados en los equipos de producción.</p>
              <p className="text-[#222] text-xs mt-1">Agrega accesorios desde el módulo de Inventario de Equipos.</p>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                      <th className="text-left px-4 py-2.5 font-medium">Accesorio</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Equipo origen</th>
                      <th className="text-right px-4 py-2.5 font-medium w-20">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesoriosPorCat.map(({ cat, items }) => (
                      <>
                        <tr key={`cat-${cat}`} className="border-t border-[#1a1a1a]">
                          <td colSpan={3} className="px-4 py-1.5 bg-[#0d0d0d]">
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat}</span>
                            <span className="text-[#333] text-[10px] ml-2">({items.length})</span>
                          </td>
                        </tr>
                        {items.map(a => (
                          <tr key={a.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-4 py-2.5">
                              <p className="text-white font-medium">{a.nombre}</p>
                              {a.descripcion && <p className="text-[#555] text-[10px]">{a.descripcion}</p>}
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              <span className="text-[#6b7280] text-[11px]">{a.equipoNombre}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-white font-medium tabular-nums">{a.cantidad}</span>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      ) : (

        /* ── EQUIPOS DE OFICINA ── */
        <div className="space-y-5">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[#6b7280] text-sm font-medium">Módulo disponible</p>
            <p className="text-[#333] text-xs mt-1">Próximamente podrás registrar equipos de oficina aquí.</p>
          </div>
        </div>
      )}
    </div>
  );
}
