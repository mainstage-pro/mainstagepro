"use client";

import { useEffect, useState } from "react";

type Proveedor = { id: string; nombre: string };
type Categoria = { id: string; nombre: string; orden: number };
type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  precioRenta: number;
  costoProveedor: number | null;
  cantidadTotal: number;
  proveedorDefaultId: string | null;
  proveedorDefault: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string; orden: number };
  notas: string | null;
  activo: boolean;
};

type EditForm = {
  descripcion: string; marca: string; modelo: string; tipo: string;
  precioRenta: string; costoProveedor: string; cantidadTotal: string;
  proveedorDefaultId: string; notas: string; categoriaId: string;
};

const EMPTY_FORM: EditForm = {
  descripcion: "", marca: "", modelo: "", tipo: "PROPIO",
  precioRenta: "0", costoProveedor: "", cantidadTotal: "1",
  proveedorDefaultId: "", notas: "", categoriaId: "",
};

function fmt(n: number) {
  if (n === 0) return "INCLUYE";
  return `$${n.toLocaleString("es-MX")}`;
}

export default function CatalogoEquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState<EditForm>(EMPTY_FORM);
  const [creando, setCreando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);

  async function load() {
    // Siempre cargamos todos (activos e inactivos) para poder mostrar el toggle
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

  const filtered = search
    ? equipos.filter(e =>
        e.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        (e.marca ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (e.modelo ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : equipos;

  const visibles = verInactivos ? filtered : filtered.filter(e => e.activo);
  const totalActivos = equipos.filter(e => e.activo).length;
  const totalInactivos = equipos.filter(e => !e.activo).length;
  const porCategoria = categorias.map(cat => ({
    cat,
    equipos: visibles.filter(e => e.categoria.id === cat.id),
  })).filter(g => g.equipos.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Catálogo de Equipos</h1>
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
            onClick={() => { setShowNuevo(v => !v); setEditingId(null); setForm(null); }}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo equipo
          </button>
        </div>
      </div>

      {/* ── Formulario de nuevo equipo ── */}
      {showNuevo && (
        <div className="mb-6 bg-[#111] border border-[#B3985B]/40 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Agregar equipo al inventario</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-[#6b7280] block mb-1">Descripción *</label>
              <input value={nuevoForm.descripcion} onChange={e => setNuevoForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Subwoofer 18&quot; activo"
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

      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          className="w-full md:w-80 bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
        />
      </div>

      <div className="space-y-6">
        {porCategoria.map(({ cat, equipos: eqs }) => (
          <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-white font-medium text-sm">{cat.nombre}</h2>
              <span className="text-[#6b7280] text-xs">{eqs.length} equipos</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#0d0d0d]">
                  {["Descripción", "Marca/Modelo", "Cant", "Precio cliente", "Costo proveedor", "Proveedor", ""].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d0d0d]">
                {eqs.map(e => (
                  editingId === e.id && form ? (
                    <tr key={e.id} className="bg-[#1a1a1a]">
                      <td colSpan={7} className="px-4 py-4">
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
                          <p className={`text-sm group-hover:text-[#B3985B] transition-colors ${e.activo ? "text-white" : "text-[#555] line-through"}`}>{e.descripcion}</p>
                          {!e.activo && <span className="text-[9px] bg-orange-900/40 text-orange-400 border border-orange-800 px-1.5 py-0.5 rounded font-medium">INACTIVO</span>}
                        </div>
                        {e.notas && <p className="text-[#555] text-xs mt-0.5">{e.notas}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">
                        {[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#9ca3af] text-center">{e.cantidadTotal}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{fmt(e.precioRenta)}</td>
                      <td className="px-4 py-3 text-sm text-[#6b7280]">
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
                        <button onClick={ev => { ev.stopPropagation(); toggleActivo(e); }}
                          className={`text-[10px] transition-colors ${e.activo ? "text-[#444] hover:text-[#6b7280] opacity-0 group-hover:opacity-100" : "text-orange-400 hover:text-orange-300 opacity-100 font-semibold"}`}>
                          {e.activo ? "Desactivar" : "✓ Activar"}
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
