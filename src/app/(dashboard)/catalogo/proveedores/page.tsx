"use client";

import { useEffect, useState } from "react";

type Proveedor = {
  id: string;
  nombre: string;
  empresa: string | null;
  giro: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  cuentaBancaria: string | null;
  datosFiscales: string | null;
  activo: boolean;
};

const EMPTY = {
  nombre: "", empresa: "", giro: "", telefono: "", correo: "",
  notas: "", cuentaBancaria: "", datosFiscales: "",
};

type SortKey = "nombre" | "giro" | "empresa";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGiro, setFilterGiro] = useState<string>("TODOS");
  const [sortBy, setSortBy] = useState<SortKey>("nombre");
  const [showInactivos, setShowInactivos] = useState(false);

  async function load() {
    const res = await fetch("/api/proveedores");
    const data = await res.json();
    setProveedores(data.proveedores ?? []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(p: Proveedor) {
    setEditing(p);
    setForm({
      nombre: p.nombre, empresa: p.empresa ?? "", giro: p.giro ?? "",
      telefono: p.telefono ?? "", correo: p.correo ?? "",
      notas: p.notas ?? "", cuentaBancaria: p.cuentaBancaria ?? "",
      datosFiscales: p.datosFiscales ?? "",
    });
    setCreating(false);
  }

  function startCreate() { setCreating(true); setEditing(null); setForm(EMPTY); }
  function cancel() { setEditing(null); setCreating(false); }
  function set(key: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      empresa: form.empresa || null,
      giro: form.giro || null,
      telefono: form.telefono || null,
      correo: form.correo || null,
      notas: form.notas || null,
      cuentaBancaria: form.cuentaBancaria || null,
      datosFiscales: form.datosFiscales || null,
    };
    const url = editing ? `/api/proveedores/${editing.id}` : "/api/proveedores";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await load();
    cancel();
    setSaving(false);
  }

  async function toggleActivo(p: Proveedor) {
    await fetch(`/api/proveedores/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !p.activo }),
    });
    await load();
  }

  const showForm = editing !== null || creating;
  const girosUnicos = [...new Set(proveedores.map(p => p.giro).filter(Boolean) as string[])].sort();

  let filtered = proveedores.filter(p => {
    if (!showInactivos && !p.activo) return false;
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase()) &&
        !(p.empresa ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !(p.giro ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGiro !== "TODOS" && p.giro !== filterGiro) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "giro") return (a.giro ?? "").localeCompare(b.giro ?? "");
    if (sortBy === "empresa") return (a.empresa ?? a.nombre).localeCompare(b.empresa ?? b.nombre);
    return a.nombre.localeCompare(b.nombre);
  });

  const activos = filtered.filter(p => p.activo);
  const inactivos = filtered.filter(p => !p.activo);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Proveedores</h1>
          <p className="text-[#6b7280] text-sm">
            {proveedores.filter(p => p.activo).length} activos · rentas externas y servicios
          </p>
        </div>
        {!showForm && (
          <button onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo proveedor
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-6 mb-6 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
            {creating ? "Nuevo proveedor" : `Editando: ${editing?.nombre}`}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre / Contacto *</label>
              <input value={form.nombre} onChange={e => set("nombre", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Nombre del contacto o empresa" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Empresa / Razón social</label>
              <input value={form.empresa} onChange={e => set("empresa", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Nombre de la empresa" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Giro / Tipo de servicio</label>
              <input value={form.giro} onChange={e => set("giro", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Ej. Renta de audio, Iluminación, Estructuras" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Teléfono / WhatsApp</label>
              <input value={form.telefono} onChange={e => set("telefono", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="442 000 0000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Correo electrónico</label>
              <input type="email" value={form.correo} onChange={e => set("correo", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="contacto@proveedor.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cuenta bancaria</label>
              <input value={form.cuentaBancaria} onChange={e => set("cuentaBancaria", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Banco, CLABE o número de tarjeta" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Datos fiscales (RFC / razón social)</label>
              <input value={form.datosFiscales} onChange={e => set("datosFiscales", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="RFC, razón social para facturas" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={form.notas} onChange={e => set("notas", e.target.value)} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Condiciones de pago, disponibilidad, referencias..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !form.nombre}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editing ? "Actualizar" : "Agregar"}
            </button>
            <button onClick={cancel} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] w-52"
            placeholder="Buscar proveedor..." />
          {girosUnicos.length > 0 && (
            <select value={filterGiro} onChange={e => setFilterGiro(e.target.value)}
              className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
              <option value="TODOS">Todos los giros</option>
              {girosUnicos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
            <option value="nombre">Ordenar: Nombre</option>
            <option value="empresa">Ordenar: Empresa</option>
            <option value="giro">Ordenar: Giro</option>
          </select>
          {proveedores.some(p => !p.activo) && (
            <button onClick={() => setShowInactivos(!showInactivos)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${showInactivos ? "border-[#B3985B] text-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"}`}>
              {showInactivos ? "Ocultar inactivos" : "Ver inactivos"}
            </button>
          )}
        </div>
      )}

      {activos.length === 0 && !creating ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">{search || filterGiro !== "TODOS" ? "Sin resultados para ese filtro." : "No hay proveedores registrados."}</p>
          {!search && <button onClick={startCreate} className="mt-2 text-[#B3985B] text-sm hover:underline">Agregar el primero</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activos.map(p => (
            <ProveedorCard key={p.id} proveedor={p} onEdit={startEdit} onToggle={toggleActivo} />
          ))}
        </div>
      )}

      {showInactivos && inactivos.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Inactivos ({inactivos.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {inactivos.map(p => (
              <ProveedorCard key={p.id} proveedor={p} onEdit={startEdit} onToggle={toggleActivo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProveedorCard({ proveedor: p, onEdit, onToggle }: {
  proveedor: Proveedor;
  onEdit: (p: Proveedor) => void;
  onToggle: (p: Proveedor) => void;
}) {
  const initials = p.nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
          <span className="text-[#B3985B] text-xs font-bold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-tight">{p.nombre}</p>
          {p.empresa && p.empresa !== p.nombre && (
            <p className="text-gray-400 text-xs">{p.empresa}</p>
          )}
          {p.giro && (
            <span className="text-[10px] bg-[#1a1a1a] text-[#B3985B] px-1.5 py-0.5 rounded mt-0.5 inline-block">{p.giro}</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs">
        {p.telefono && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-14 shrink-0">Tel</span>
            <a href={`tel:${p.telefono}`} className="text-white hover:text-[#B3985B] transition-colors">{p.telefono}</a>
          </div>
        )}
        {p.correo && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-14 shrink-0">Correo</span>
            <a href={`mailto:${p.correo}`} className="text-gray-300 hover:text-[#B3985B] transition-colors truncate">{p.correo}</a>
          </div>
        )}
        {p.cuentaBancaria && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-14 shrink-0">Banco</span>
            <span className="text-gray-300">{p.cuentaBancaria}</span>
          </div>
        )}
        {p.datosFiscales && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-14 shrink-0">Fiscal</span>
            <span className="text-gray-300">{p.datosFiscales}</span>
          </div>
        )}
        {p.notas && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600 w-14 shrink-0 mt-0.5">Notas</span>
            <span className="text-gray-400 italic">{p.notas}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-[#1a1a1a] mt-auto">
        <button onClick={() => onEdit(p)}
          className="flex-1 text-xs text-[#B3985B] hover:text-white py-1.5 rounded-lg border border-[#B3985B]/30 hover:border-[#B3985B] transition-colors text-center">
          Editar
        </button>
        <button onClick={() => onToggle(p)}
          className="flex-1 text-xs text-gray-500 hover:text-white py-1.5 rounded-lg border border-[#222] hover:border-[#333] transition-colors text-center">
          {p.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}
