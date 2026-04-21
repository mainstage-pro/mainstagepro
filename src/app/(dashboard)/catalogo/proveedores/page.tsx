"use client";

import { useEffect, useState, useRef } from "react";
import { CopyButton } from "@/components/CopyButton";
import { useConfirm } from "@/components/Confirm";

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
  portalToken: string | null;
};

type EquipoPortal = {
  id: string;
  categoria: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  potenciaW: number | null;
  voltaje: string | null;
  pesoKg: number | null;
  precioPublico: number | null;
  precioMainstage: number | null;
  notas: string | null;
  fotosUrls: string | null;
  fichaTecnicaUrl: string | null;
  aprobado: boolean;
  incluyeCase: boolean;
  importadoEquipoId: string | null;
};

const CAT_LABEL: Record<string, string> = {
  AUDIO: "Audio", VIDEO: "Video", ILUMINACION: "Iluminación",
  BACKLINE: "Backline", ESCENOGRAFIA: "Escenografía", LOGISTICA: "Logística", OTRO: "Otro",
};
const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const EMPTY = {
  nombre: "", empresa: "", giro: "", telefono: "", correo: "",
  notas: "", cuentaBancaria: "", datosFiscales: "",
};

type SortKey = "nombre" | "giro" | "empresa";

export default function ProveedoresPage() {
  const confirm = useConfirm();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [view, setView] = useState<"card" | "list">("list");
  const [search, setSearch] = useState("");
  const [filterGiro, setFilterGiro] = useState<string>("TODOS");
  const [sortBy, setSortBy] = useState<SortKey>("nombre");
  const [showInactivos, setShowInactivos] = useState(false);
  const currentEditId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Portal state
  const [generandoToken, setGenerandoToken] = useState<string | null>(null);
  const [equiposPanel, setEquiposPanel] = useState<{ proveedorId: string; equipos: EquipoPortal[] } | null>(null);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [aprobando, setAprobando] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/proveedores", { cache: "no-store" });
    const data = await res.json();
    setProveedores(data.proveedores ?? []);
  }

  useEffect(() => { load(); }, []);

  async function generarPortalToken(p: Proveedor) {
    if (p.portalToken) {
      const ok = await confirm({ message: "¿Revocar el link actual y generar uno nuevo? El proveedor ya no podrá acceder con el link anterior.", danger: true, confirmText: "Revocar y generar" });
      if (!ok) return;
    }
    setGenerandoToken(p.id);
    const res = await fetch(`/api/proveedores/${p.id}/portal-token`, { method: "POST" });
    const d = await res.json();
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, portalToken: d.portalToken } : x));
    setGenerandoToken(null);
  }

  async function revocarPortalToken(p: Proveedor) {
    const ok = await confirm({ message: "¿Revocar el link del portal? El proveedor perderá acceso.", danger: true, confirmText: "Revocar" });
    if (!ok) return;
    await fetch(`/api/proveedores/${p.id}/portal-token`, { method: "DELETE" });
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, portalToken: null } : x));
  }

  async function verEquipos(p: Proveedor) {
    if (equiposPanel?.proveedorId === p.id) { setEquiposPanel(null); return; }
    setLoadingEquipos(true);
    const res = await fetch(`/api/proveedores/${p.id}/equipos-portal`, { cache: "no-store" });
    const d = await res.json();
    setEquiposPanel({ proveedorId: p.id, equipos: d.equipos ?? [] });
    setLoadingEquipos(false);
  }

  async function toggleAprobado(proveedorId: string, equipoId: string, aprobado: boolean) {
    setAprobando(equipoId);
    const res = await fetch(`/api/proveedores/${proveedorId}/equipos-portal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoId, aprobado }),
    });
    const d = await res.json();
    const importadoEquipoId = d.equipo?.importadoEquipoId ?? null;
    setEquiposPanel(prev => prev ? {
      ...prev,
      equipos: prev.equipos.map(e => e.id === equipoId ? { ...e, aprobado, importadoEquipoId } : e),
    } : prev);
    setAprobando(null);
  }

  // Auto-save when editing an existing record
  useEffect(() => {
    if (!editing || editing.id !== currentEditId.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const payload = { nombre: form.nombre, empresa: form.empresa || null, giro: form.giro || null, telefono: form.telefono || null, correo: form.correo || null, notas: form.notas || null, cuentaBancaria: form.cuentaBancaria || null, datosFiscales: form.datosFiscales || null };
      await fetch(`/api/proveedores/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setProveedores(prev => prev.map(p => p.id === editing.id ? { ...p, ...payload } : p));
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(p: Proveedor) {
    currentEditId.current = p.id;
    setEditing(p);
    setForm({
      nombre: p.nombre, empresa: p.empresa ?? "", giro: p.giro ?? "",
      telefono: p.telefono ?? "", correo: p.correo ?? "",
      notas: p.notas ?? "", cuentaBancaria: p.cuentaBancaria ?? "",
      datosFiscales: p.datosFiscales ?? "",
    });
    setCreating(false);
  }

  function startCreate() { currentEditId.current = null; setCreating(true); setEditing(null); setForm(EMPTY); }
  function cancel() { currentEditId.current = null; setEditing(null); setCreating(false); }
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
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Proveedores</h1>
          <p className="text-[#6b7280] text-sm">
            {proveedores.filter(p => p.activo).length} activos · rentas externas y servicios
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
              <button onClick={() => setView("card")} title="Tarjetas"
                className={`p-1.5 rounded-md transition-colors ${view === "card" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/></svg>
              </button>
              <button onClick={() => setView("list")} title="Lista"
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/></svg>
              </button>
            </div>
            <button onClick={startCreate}
              className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Nuevo proveedor
            </button>
          </div>
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
          <div className="flex items-center gap-3">
            {editing && autoSaved && <span className="text-xs text-green-500">✓ Guardado</span>}
            {!editing && (
              <button onClick={save} disabled={saving || !form.nombre}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Agregar"}
              </button>
            )}
            <button onClick={cancel} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cerrar</button>
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
      ) : view === "card" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activos.map(p => (
              <ProveedorCard key={p.id} proveedor={p} onEdit={startEdit} onToggle={toggleActivo}
                generandoToken={generandoToken === p.id}
                onGenerarToken={() => generarPortalToken(p)}
                onRevocarToken={() => revocarPortalToken(p)}
                onVerEquipos={() => verEquipos(p)}
                equiposPanelOpen={equiposPanel?.proveedorId === p.id}
              />
            ))}
          </div>
          {/* Equipment panel */}
          {equiposPanel && (
            <div className="mt-4 bg-[#0d0d0d] border border-[#B3985B]/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Inventario de {proveedores.find(p => p.id === equiposPanel.proveedorId)?.nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {equiposPanel.equipos.length} equipo{equiposPanel.equipos.length !== 1 ? "s" : ""} registrado{equiposPanel.equipos.length !== 1 ? "s" : ""}
                    {" · "}{equiposPanel.equipos.filter(e => e.aprobado).length} aprobado{equiposPanel.equipos.filter(e => e.aprobado).length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => setEquiposPanel(null)} className="text-gray-600 hover:text-white text-xs transition-colors">Cerrar</button>
              </div>
              {loadingEquipos ? (
                <div className="text-center py-6 text-gray-600 text-sm">Cargando equipos...</div>
              ) : equiposPanel.equipos.length === 0 ? (
                <div className="text-center py-6 text-gray-600 text-sm">Este proveedor aún no ha registrado equipos.</div>
              ) : (
                <div className="space-y-2">
                  {equiposPanel.equipos.map(e => (
                    <div key={e.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${e.aprobado ? "bg-green-900/10 border-green-800/30" : "bg-[#111] border-[#1e1e1e]"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-[#1a1a1a] text-[#B3985B] px-1.5 py-0.5 rounded">{CAT_LABEL[e.categoria] ?? e.categoria}</span>
                          {e.cantidad > 1 && <span className="text-[10px] text-gray-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded">x{e.cantidad}</span>}
                          {e.aprobado && !e.importadoEquipoId && <span className="text-[10px] text-green-400 bg-green-900/20 border border-green-700/40 px-1.5 py-0.5 rounded">Aprobado</span>}
                          {e.importadoEquipoId && <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/30 px-1.5 py-0.5 rounded">✓ En catálogo</span>}
                        </div>
                        <p className="text-white text-sm font-medium mt-1">{e.descripcion}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
                          {e.marca && <span>Marca: <span className="text-gray-300">{e.marca}</span></span>}
                          {e.modelo && <span>Modelo: <span className="text-gray-300">{e.modelo}</span></span>}
                          {e.potenciaW && <span>Potencia: <span className="text-gray-300">{e.potenciaW}W</span></span>}
                          {e.voltaje && <span>Voltaje: <span className="text-gray-300">{e.voltaje}</span></span>}
                          {e.pesoKg && <span>Peso: <span className="text-gray-300">{e.pesoKg}kg</span></span>}
                          {e.incluyeCase && <span className="text-blue-400">Incluye case</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px]">
                          {e.precioPublico && <span className="text-gray-400">Público: <span className="text-white font-medium">{fmt(e.precioPublico)}</span></span>}
                          {e.precioMainstage && <span className="text-gray-400">Mainstage: <span className="text-[#B3985B] font-medium">{fmt(e.precioMainstage)}</span></span>}
                        </div>
                        {e.notas && <p className="text-[11px] text-gray-500 italic mt-1">{e.notas}</p>}
                        {(e.fotosUrls || e.fichaTecnicaUrl) && (
                          <div className="flex gap-2 mt-1">
                            {e.fotosUrls && <a href={e.fotosUrls} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">Ver fotos</a>}
                            {e.fichaTecnicaUrl && <a href={e.fichaTecnicaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">Ficha técnica</a>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleAprobado(equiposPanel.proveedorId, e.id, !e.aprobado)}
                        disabled={aprobando === e.id}
                        className={`shrink-0 text-[11px] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${e.aprobado ? "text-red-400 border-red-800/40 hover:bg-red-900/20" : "text-green-400 border-green-800/40 hover:bg-green-900/20"}`}>
                        {aprobando === e.id ? "..." : e.aprobado ? "Rechazar" : "Aprobar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showInactivos && inactivos.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Inactivos ({inactivos.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                {inactivos.map(p => <ProveedorCard key={p.id} proveedor={p} onEdit={startEdit} onToggle={toggleActivo} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── LISTA ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Proveedor", "Empresa", "Giro", "Teléfono", "Correo", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {activos.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                        <span className="text-[#B3985B] text-[10px] font-bold">
                          {p.nombre.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium">{p.nombre}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{p.empresa ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.giro ? (
                      <span className="text-[10px] bg-[#1a1a1a] text-[#B3985B] px-1.5 py-0.5 rounded">{p.giro}</span>
                    ) : <span className="text-[#555] text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {p.telefono ? (
                      <div className="flex items-center gap-2">
                        <span>{p.telefono}</span>
                        <CopyButton value={p.telefono} size="xs" />
                        <a href={`https://wa.me/${p.telefono.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}! 👋`)}`}
                           target="_blank" rel="noopener noreferrer"
                           className="text-green-500 hover:text-green-400 transition-colors shrink-0" title="WhatsApp">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {p.correo ? <a href={`mailto:${p.correo}`} className="hover:text-[#B3985B] transition-colors truncate">{p.correo}</a> : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(p)} className="text-[#B3985B] text-xs hover:underline">Editar</button>
                      <button onClick={() => toggleActivo(p)} className="text-gray-600 text-xs hover:text-white transition-colors">Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {showInactivos && inactivos.map(p => (
                <tr key={p.id} className="opacity-40 hover:opacity-60 transition-opacity">
                  <td className="px-4 py-3 text-gray-400 text-sm">{p.nombre}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">{p.empresa ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">{p.giro ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">{p.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">{p.correo ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActivo(p)} className="text-gray-600 text-xs hover:text-[#B3985B] transition-colors">Activar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProveedorCard({
  proveedor: p, onEdit, onToggle,
  generandoToken = false,
  onGenerarToken,
  onRevocarToken,
  onVerEquipos,
  equiposPanelOpen = false,
}: {
  proveedor: Proveedor;
  onEdit: (p: Proveedor) => void;
  onToggle: (p: Proveedor) => void;
  generandoToken?: boolean;
  onGenerarToken?: () => void;
  onRevocarToken?: () => void;
  onVerEquipos?: () => void;
  equiposPanelOpen?: boolean;
}) {
  const initials = p.nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const portalUrl = p.portalToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/proveedor/${p.portalToken}` : "";

  return (
    <div className={`bg-[#111] border rounded-xl p-4 transition-colors flex flex-col gap-3 ${equiposPanelOpen ? "border-[#B3985B]/40" : "border-[#1e1e1e] hover:border-[#2a2a2a]"}`}>
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
            <span className="text-white">{p.telefono}</span>
            <a href={`https://wa.me/${p.telefono.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}! 👋`)}`}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full text-[10px] font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WA
            </a>
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

      {/* Portal section */}
      {onGenerarToken && (
        <div className="border-t border-[#1a1a1a] pt-2 space-y-2">
          <p className="text-[10px] text-[#555] uppercase tracking-wider font-semibold">Portal de inventario</p>
          {p.portalToken ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5">
                <svg className="text-green-500 shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                <span className="text-[10px] text-gray-400 truncate flex-1">{portalUrl}</span>
                <CopyButton value={portalUrl} size="xs" />
              </div>
              <div className="flex gap-1.5">
                {p.telefono && (
                  <a href={`https://wa.me/${p.telefono.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}! Te comparto el link para registrar tu inventario de equipos: ${portalUrl}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-green-400 border border-green-800/40 bg-green-900/20 hover:bg-green-900/30 px-2 py-1 rounded transition-colors">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar WA
                  </a>
                )}
                <button onClick={onRevocarToken}
                  className="text-[10px] text-red-500/70 hover:text-red-400 border border-red-900/30 hover:border-red-700/40 px-2 py-1 rounded transition-colors">
                  Revocar link
                </button>
                <button onClick={onGenerarToken} disabled={generandoToken}
                  className="text-[10px] text-gray-500 hover:text-white border border-[#222] hover:border-[#333] px-2 py-1 rounded transition-colors ml-auto">
                  Regenerar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={onGenerarToken} disabled={generandoToken}
              className="w-full text-[11px] text-[#B3985B] hover:text-white border border-[#B3985B]/30 hover:border-[#B3985B]/60 bg-[#B3985B]/5 hover:bg-[#B3985B]/10 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {generandoToken ? "Generando..." : "+ Generar link de inventario"}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={`flex gap-2 ${onGenerarToken ? "" : "pt-1 border-t border-[#1a1a1a]"} mt-auto`}>
        {onVerEquipos && (
          <button onClick={onVerEquipos}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors text-center ${equiposPanelOpen ? "text-[#B3985B] border-[#B3985B]/50 bg-[#B3985B]/10" : "text-gray-400 hover:text-white border-[#222] hover:border-[#333]"}`}>
            {equiposPanelOpen ? "Ocultar equipos" : "Ver equipos"}
          </button>
        )}
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
