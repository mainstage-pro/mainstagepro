"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Proveedor = { id: string; nombre: string };
type Categoria = { id: string; nombre: string; orden: number };
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
  proveedorDefaultId: string | null;
  proveedorDefault: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string; orden: number };
  notas: string | null;
  activo: boolean;
  amperajeRequerido: number | null;
  voltajeRequerido: number | null;
  imagenUrl: string | null;
};

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/30 text-green-400",
  EN_MANTENIMIENTO: "bg-yellow-900/30 text-yellow-400",
  DADO_DE_BAJA: "bg-red-900/30 text-red-400",
};

type EditForm = {
  descripcion: string; marca: string; modelo: string; tipo: string;
  precioRenta: string; costoProveedor: string; cantidadTotal: string;
  proveedorDefaultId: string; notas: string; categoriaId: string;
  amperajeRequerido: string; voltajeRequerido: string;
};

const EMPTY_FORM: EditForm = {
  descripcion: "", marca: "", modelo: "", tipo: "PROPIO",
  precioRenta: "0", costoProveedor: "", cantidadTotal: "1",
  proveedorDefaultId: "", notas: "", categoriaId: "",
  amperajeRequerido: "", voltajeRequerido: "",
};

function fmt(n: number) {
  if (n === 0) return "INCLUYE";
  return `$${n.toLocaleString("es-MX")}`;
}

export default function InventarioEquiposPage() {
  const [equipos, setEquipos]     = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<EditForm | null>(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState<EditForm>(EMPTY_FORM);
  const [creando, setCreando]     = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | "PROPIO" | "EXTERNO">("TODOS");
  const [proveedorFiltro, setProveedorFiltro] = useState<string>("");

  async function descargarPDF() {
    setDescargandoPDF(true);
    try {
      const res = await fetch("/api/inventario/pdf");
      if (!res.ok) throw new Error("Error al generar PDF");
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

  async function load() {
    const [eqRes, provRes] = await Promise.all([
      fetch("/api/equipos?todos=true"),
      fetch("/api/proveedores"),
    ]);
    const [eqData, provData] = await Promise.all([eqRes.json(), provRes.json()]);
    const eq: Equipo[] = eqData.equipos ?? [];
    setEquipos(eq);
    setProveedores(provData.proveedores ?? []);
    const cats = Array.from(
      new Map(eq.map(e => [e.categoria.id, e.categoria])).values()
    ).sort((a, b) => a.orden - b.orden);
    setCategorias(cats);
  }

  useEffect(() => { load(); }, []);

  function startEdit(e: Equipo) {
    setShowNuevo(false);
    setEditingId(e.id);
    setForm({
      descripcion: e.descripcion,
      marca: e.marca ?? "",
      modelo: e.modelo ?? "",
      tipo: e.tipo,
      precioRenta: String(e.precioRenta),
      costoProveedor: e.costoProveedor != null ? String(e.costoProveedor) : "",
      cantidadTotal: String(e.cantidadTotal),
      proveedorDefaultId: e.proveedorDefaultId ?? "",
      notas: e.notas ?? "",
      categoriaId: e.categoria.id,
      amperajeRequerido: e.amperajeRequerido != null ? String(e.amperajeRequerido) : "",
      voltajeRequerido: e.voltajeRequerido != null ? String(e.voltajeRequerido) : "",
    });
  }

  async function crearEquipo() {
    if (!nuevoForm.descripcion || !nuevoForm.categoriaId) return;
    setCreando(true);
    await fetch("/api/equipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: nuevoForm.descripcion,
        categoriaId: nuevoForm.categoriaId,
        marca: nuevoForm.marca || null,
        modelo: nuevoForm.modelo || null,
        tipo: nuevoForm.tipo,
        precioRenta: nuevoForm.precioRenta,
        costoProveedor: nuevoForm.costoProveedor !== "" ? nuevoForm.costoProveedor : null,
        cantidadTotal: nuevoForm.cantidadTotal,
        proveedorDefaultId: nuevoForm.proveedorDefaultId || null,
        notas: nuevoForm.notas || null,
        amperajeRequerido: nuevoForm.amperajeRequerido !== "" ? nuevoForm.amperajeRequerido : null,
        voltajeRequerido: nuevoForm.voltajeRequerido !== "" ? nuevoForm.voltajeRequerido : null,
      }),
    });
    await load();
    setNuevoForm(EMPTY_FORM);
    setShowNuevo(false);
    setCreando(false);
  }

  function cancelEdit() { setEditingId(null); setForm(null); }

  async function saveEdit(id: string) {
    if (!form) return;
    setSaving(true);
    await fetch(`/api/equipos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: form.descripcion,
        marca: form.marca || null,
        modelo: form.modelo || null,
        tipo: form.tipo,
        precioRenta: parseFloat(form.precioRenta) || 0,
        costoProveedor: form.costoProveedor !== "" ? parseFloat(form.costoProveedor) : null,
        cantidadTotal: parseInt(form.cantidadTotal) || 1,
        proveedorDefaultId: form.proveedorDefaultId || null,
        notas: form.notas || null,
        amperajeRequerido: form.amperajeRequerido !== "" ? parseFloat(form.amperajeRequerido) : null,
        voltajeRequerido: form.voltajeRequerido !== "" ? parseInt(form.voltajeRequerido) : null,
      }),
    });
    await load();
    cancelEdit();
    setSaving(false);
  }

  async function toggleActivo(e: Equipo) {
    await fetch(`/api/equipos/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !e.activo }),
    });
    await load();
  }

  const filtered = equipos.filter(e => {
    if (search && !(
      e.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      (e.marca ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.modelo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.proveedorDefault?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (tipoFiltro === "PROPIO" && e.tipo !== "PROPIO") return false;
    if (tipoFiltro === "EXTERNO" && e.tipo !== "EXTERNO") return false;
    if (proveedorFiltro && e.proveedorDefaultId !== proveedorFiltro) return false;
    return true;
  });

  const visibles = verInactivos ? filtered : filtered.filter(e => e.activo);

  // Proveedores que tienen al menos un equipo externo
  const proveedoresConEquipo = proveedores.filter(p =>
    equipos.some(e => e.tipo === "EXTERNO" && e.proveedorDefaultId === p.id)
  );
  const totalActivos   = equipos.filter(e => e.activo).length;
  const totalInactivos = equipos.filter(e => !e.activo).length;
  const porCategoria = categorias.map(cat => ({
    cat,
    equipos: visibles.filter(e => e.categoria.id === cat.id),
  })).filter(g => g.equipos.length > 0);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario de Equipos</h1>
          <p className="text-[#6b7280] text-sm">
            {totalActivos} activos
            {totalInactivos > 0 && <> · <span className="text-orange-400">{totalInactivos} desactivados</span></>}
            {" · "}haz clic en cualquier fila para editar
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalInactivos > 0 && (
            <button
              onClick={() => setVerInactivos(v => !v)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${verInactivos ? "border-orange-500 text-orange-400 bg-orange-900/20" : "border-[#333] text-[#6b7280] hover:text-white"}`}
            >
              {verInactivos ? "Ocultar desactivados" : `Ver desactivados (${totalInactivos})`}
            </button>
          )}
          <button
            onClick={descargarPDF}
            disabled={descargandoPDF}
            className="flex items-center gap-2 border border-[#333] hover:border-[#B3985B]/50 text-[#6b7280] hover:text-[#B3985B] text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {descargandoPDF ? "Generando..." : "Descargar PDF"}
          </button>
          <button
            onClick={() => { setShowNuevo(v => !v); setEditingId(null); setForm(null); }}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo equipo
          </button>
        </div>
      </div>

      {/* ── Formulario nuevo equipo ── */}
      {showNuevo && (
        <div className="mb-6 bg-[#111] border border-[#B3985B]/40 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Agregar equipo al inventario</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-[#6b7280] block mb-1">Descripción *</label>
              <input value={nuevoForm.descripcion} onChange={e => setNuevoForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder='Ej: Subwoofer 18" activo'
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Categoría *</label>
              <select value={nuevoForm.categoriaId} onChange={e => setNuevoForm(f => ({ ...f, categoriaId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                <option value="">— Selecciona —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Tipo</label>
              <select value={nuevoForm.tipo} onChange={e => setNuevoForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                <option value="PROPIO">Propio</option>
                <option value="EXTERNO">Externo (tercero)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Marca</label>
              <input value={nuevoForm.marca} onChange={e => setNuevoForm(f => ({ ...f, marca: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Modelo</label>
              <input value={nuevoForm.modelo} onChange={e => setNuevoForm(f => ({ ...f, modelo: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Cantidad</label>
              <input type="number" min="1" value={nuevoForm.cantidadTotal} onChange={e => setNuevoForm(f => ({ ...f, cantidadTotal: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Precio al cliente ($)</label>
              <input type="number" min="0" value={nuevoForm.precioRenta} onChange={e => setNuevoForm(f => ({ ...f, precioRenta: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            {nuevoForm.tipo === "EXTERNO" && (
              <>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Costo proveedor ($)</label>
                  <input type="number" min="0" value={nuevoForm.costoProveedor} onChange={e => setNuevoForm(f => ({ ...f, costoProveedor: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] block mb-1">Proveedor</label>
                  <select value={nuevoForm.proveedorDefaultId} onChange={e => setNuevoForm(f => ({ ...f, proveedorDefaultId: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Amperaje (A)</label>
              <input type="number" step="0.1" value={nuevoForm.amperajeRequerido} onChange={e => setNuevoForm(f => ({ ...f, amperajeRequerido: e.target.value }))}
                placeholder="Ej. 15" className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] block mb-1">Voltaje (V)</label>
              <input type="number" value={nuevoForm.voltajeRequerido} onChange={e => setNuevoForm(f => ({ ...f, voltajeRequerido: e.target.value }))}
                placeholder="110 / 220" className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#6b7280] block mb-1">Notas internas</label>
              <input value={nuevoForm.notas} onChange={e => setNuevoForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Condiciones, disponibilidad, etc."
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={crearEquipo} disabled={creando || !nuevoForm.descripcion || !nuevoForm.categoriaId}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              {creando ? "Guardando..." : "Agregar al inventario"}
            </button>
            <button onClick={() => { setShowNuevo(false); setNuevoForm(EMPTY_FORM); }}
              className="text-xs text-[#6b7280] hover:text-white px-3 py-2 border border-[#333] rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipo, marca, proveedor..."
          className="w-full md:w-72 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
        />

        {/* Filtro por tipo */}
        <div className="flex gap-1">
          {(["TODOS", "PROPIO", "EXTERNO"] as const).map(t => (
            <button key={t} onClick={() => { setTipoFiltro(t); if (t !== "EXTERNO") setProveedorFiltro(""); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tipoFiltro === t
                  ? t === "PROPIO" ? "bg-green-900/40 border border-green-700/60 text-green-400"
                    : t === "EXTERNO" ? "bg-blue-900/40 border border-blue-700/60 text-blue-400"
                    : "bg-[#B3985B] text-black"
                  : "bg-[#111] border border-[#222] text-gray-400 hover:text-white"
              }`}>
              {t === "TODOS" ? `Todos (${equipos.filter(e => e.activo || verInactivos).length})`
                : t === "PROPIO" ? `Propios (${equipos.filter(e => e.tipo === "PROPIO" && (e.activo || verInactivos)).length})`
                : `De proveedor (${equipos.filter(e => e.tipo === "EXTERNO" && (e.activo || verInactivos)).length})`}
            </button>
          ))}
        </div>

        {/* Filtro por proveedor (solo visible cuando tipo = EXTERNO o TODOS con proveedores) */}
        {proveedoresConEquipo.length > 0 && tipoFiltro !== "PROPIO" && (
          <select
            value={proveedorFiltro}
            onChange={e => { setProveedorFiltro(e.target.value); if (e.target.value) setTipoFiltro("EXTERNO"); }}
            className="bg-[#111] border border-[#222] text-sm rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresConEquipo.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        )}

        {/* Limpiar filtros */}
        {(tipoFiltro !== "TODOS" || proveedorFiltro || search) && (
          <button onClick={() => { setTipoFiltro("TODOS"); setProveedorFiltro(""); setSearch(""); }}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 border border-[#222] rounded-lg">
            ✕ Limpiar
          </button>
        )}
      </div>

      <div className="space-y-6">
        {porCategoria.map(({ cat, equipos: eqs }) => (
          <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-white font-medium text-sm">{cat.nombre}</h2>
              <span className="text-[#6b7280] text-xs">{eqs.length} equipos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#0d0d0d]">
                    {["Descripción", "Marca/Modelo", "Cant", "Estado", "Precio cliente", "Costo proveedor", "Proveedor", ""].map(h => (
                      <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d0d0d]">
                  {eqs.map(e => (
                    editingId === e.id && form ? (
                      <tr key={e.id} className="bg-[#1a1a1a]">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="col-span-2">
                              <label className="text-xs text-[#6b7280] block mb-1">Descripción</label>
                              <input value={form.descripcion} onChange={ev => setForm(f => f ? { ...f, descripcion: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Marca</label>
                              <input value={form.marca} onChange={ev => setForm(f => f ? { ...f, marca: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Modelo</label>
                              <input value={form.modelo} onChange={ev => setForm(f => f ? { ...f, modelo: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Cantidad total</label>
                              <input type="number" value={form.cantidadTotal} onChange={ev => setForm(f => f ? { ...f, cantidadTotal: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Precio al cliente ($)</label>
                              <input type="number" value={form.precioRenta} onChange={ev => setForm(f => f ? { ...f, precioRenta: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Tipo</label>
                              <select value={form.tipo} onChange={ev => setForm(f => f ? { ...f, tipo: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                                <option value="PROPIO">Propio</option>
                                <option value="EXTERNO">Externo (tercero)</option>
                              </select>
                            </div>
                            {form.tipo === "EXTERNO" && (
                              <>
                                <div>
                                  <label className="text-xs text-[#6b7280] block mb-1">Costo proveedor ($)</label>
                                  <input type="number" value={form.costoProveedor} onChange={ev => setForm(f => f ? { ...f, costoProveedor: ev.target.value } : f)}
                                    className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-[#6b7280] block mb-1">Proveedor</label>
                                  <select value={form.proveedorDefaultId} onChange={ev => setForm(f => f ? { ...f, proveedorDefaultId: ev.target.value } : f)}
                                    className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]">
                                    <option value="">Sin proveedor</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                  </select>
                                </div>
                              </>
                            )}
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Amperaje (A)</label>
                              <input type="number" step="0.1" value={form.amperajeRequerido} onChange={ev => setForm(f => f ? { ...f, amperajeRequerido: ev.target.value } : f)}
                                placeholder="Ej. 15" className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div>
                              <label className="text-xs text-[#6b7280] block mb-1">Voltaje (V)</label>
                              <input type="number" value={form.voltajeRequerido} onChange={ev => setForm(f => f ? { ...f, voltajeRequerido: ev.target.value } : f)}
                                placeholder="110 / 220" className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-[#6b7280] block mb-1">Notas internas</label>
                              <input value={form.notas} onChange={ev => setForm(f => f ? { ...f, notas: ev.target.value } : f)}
                                className="w-full bg-[#222] border border-[#333] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
                                placeholder="Condiciones especiales, disponibilidad, etc." />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(e.id)} disabled={saving}
                              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                              {saving ? "Guardando..." : "Guardar"}
                            </button>
                            <button onClick={cancelEdit}
                              className="text-xs text-[#6b7280] hover:text-white px-3 py-1.5 border border-[#333] rounded transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={e.id} onClick={() => startEdit(e)}
                        className={`hover:bg-[#1a1a1a] transition-colors cursor-pointer group ${!e.activo ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {e.imagenUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={e.imagenUrl} alt="" className="w-8 h-8 object-contain rounded shrink-0 opacity-80 group-hover:opacity-100" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2a2a2a] shrink-0 flex items-center justify-center text-[#333] text-[10px]">IMG</div>
                            )}
                            <p className={`text-sm group-hover:text-[#B3985B] transition-colors ${e.activo ? "text-white" : "text-[#555] line-through"}`}>{e.descripcion}</p>
                            {!e.activo && <span className="text-[9px] bg-orange-900/40 text-orange-400 border border-orange-800 px-1.5 py-0.5 rounded font-medium">INACTIVO</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {e.notas && <p className="text-[#555] text-xs">{e.notas}</p>}
                            {(e.amperajeRequerido != null || e.voltajeRequerido != null) && (
                              <span className="text-[10px] text-yellow-600/70">
                                ⚡ {e.amperajeRequerido != null ? `${e.amperajeRequerido}A` : ""}{e.amperajeRequerido != null && e.voltajeRequerido != null ? " · " : ""}{e.voltajeRequerido != null ? `${e.voltajeRequerido}V` : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6b7280]">
                          {[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9ca3af] text-center">{e.cantidadTotal}</td>
                        <td className="px-4 py-3">
                          {e.tipo === "PROPIO" ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ESTADO_BADGE[e.estado] ?? "bg-gray-800 text-gray-400"}`}>
                              {e.estado?.replace(/_/g, " ") ?? "ACTIVO"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#555]">Externo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-medium whitespace-nowrap">{fmt(e.precioRenta)}</td>
                        <td className="px-4 py-3 text-sm text-[#6b7280] whitespace-nowrap">
                          {e.tipo === "EXTERNO" && e.costoProveedor != null ? fmt(e.costoProveedor) : (
                            e.tipo === "PROPIO" ? <span className="text-[#333] text-xs">Propio</span> : "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6b7280]">
                          {e.tipo === "EXTERNO"
                            ? (e.proveedorDefault?.nombre ?? <span className="text-[#444]">Sin asignar</span>)
                            : <span className="text-[#333]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/inventario/equipos/${e.id}`}
                              onClick={ev => ev.stopPropagation()}
                              className="text-[10px] text-[#B3985B] hover:text-white transition-colors whitespace-nowrap font-medium">
                              Ver ficha
                            </Link>
                            {e.tipo === "PROPIO" && (
                              <Link href={`/inventario/mantenimiento?equipoId=${e.id}`}
                                onClick={ev => ev.stopPropagation()}
                                className="text-[10px] text-[#6b7280] hover:text-[#B3985B] transition-colors whitespace-nowrap">
                                Mant.
                              </Link>
                            )}
                            <button onClick={ev => { ev.stopPropagation(); toggleActivo(e); }}
                              className={`text-[10px] transition-colors ${e.activo ? "text-[#444] hover:text-[#6b7280]" : "text-orange-400 hover:text-orange-300 font-semibold opacity-100"}`}>
                              {e.activo ? "Desactivar" : "✓ Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {porCategoria.length === 0 && (
          <div className="text-center py-20 text-[#333]">
            <p className="text-sm">No hay equipos{
              search ? " que coincidan con la búsqueda"
              : tipoFiltro === "PROPIO" ? " propios"
              : tipoFiltro === "EXTERNO" && proveedorFiltro
                ? ` de ${proveedoresConEquipo.find(p => p.id === proveedorFiltro)?.nombre ?? "este proveedor"}`
              : tipoFiltro === "EXTERNO" ? " de proveedor"
              : " en el inventario"
            }</p>
          </div>
        )}
      </div>
    </div>
  );
}
