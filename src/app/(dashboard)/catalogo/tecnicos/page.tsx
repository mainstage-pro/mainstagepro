"use client";

import { useEffect, useState } from "react";

type Rol = { id: string; nombre: string };
type Tecnico = {
  id: string;
  nombre: string;
  celular: string | null;
  rolId: string | null;
  rol: Rol | null;
  nivel: string;
  zonaHabitual: string | null;
  cuentaBancaria: string | null;
  datosFiscales: string | null;
  activo: boolean;
  comentarios: string | null;
  evaluacionPromedio: number | null;
};

const NIVEL_COLORS: Record<string, string> = {
  AAA: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  AA:  "text-blue-400 bg-blue-900/20 border-blue-800/40",
  A:   "text-gray-400 bg-gray-800/20 border-gray-700/40",
};

const EMPTY = {
  nombre: "", celular: "", rolId: "", nivel: "A",
  zonaHabitual: "", cuentaBancaria: "", datosFiscales: "", comentarios: "",
};

type SortKey = "nombre" | "nivel" | "rol";

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [editing, setEditing] = useState<Tecnico | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterNivel, setFilterNivel] = useState<string>("TODOS");
  const [filterRol, setFilterRol] = useState<string>("TODOS");
  const [sortBy, setSortBy] = useState<SortKey>("nombre");
  const [showInactivos, setShowInactivos] = useState(false);

  async function load() {
    const [tRes, rRes] = await Promise.all([
      fetch("/api/tecnicos"),
      fetch("/api/roles-tecnicos"),
    ]);
    const [tData, rData] = await Promise.all([tRes.json(), rRes.json()]);
    setTecnicos(tData.tecnicos ?? []);
    setRoles(rData.roles ?? []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: Tecnico) {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      celular: t.celular ?? "",
      rolId: t.rolId ?? "",
      nivel: t.nivel,
      zonaHabitual: t.zonaHabitual ?? "",
      cuentaBancaria: t.cuentaBancaria ?? "",
      datosFiscales: t.datosFiscales ?? "",
      comentarios: t.comentarios ?? "",
    });
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm(EMPTY);
  }

  function cancel() { setEditing(null); setCreating(false); }

  function set(key: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      celular: form.celular || null,
      rolId: form.rolId || null,
      nivel: form.nivel,
      zonaHabitual: form.zonaHabitual || null,
      cuentaBancaria: form.cuentaBancaria || null,
      datosFiscales: form.datosFiscales || null,
      comentarios: form.comentarios || null,
    };
    const url = editing ? `/api/tecnicos/${editing.id}` : "/api/tecnicos";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await load();
    cancel();
    setSaving(false);
  }

  async function toggleActivo(t: Tecnico) {
    await fetch(`/api/tecnicos/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !t.activo }),
    });
    await load();
  }

  const showForm = editing !== null || creating;

  const rolesUnicos = roles.map(r => r.nombre);

  let filtered = tecnicos.filter(t => {
    if (!showInactivos && !t.activo) return false;
    if (search && !t.nombre.toLowerCase().includes(search.toLowerCase()) &&
        !(t.rol?.nombre ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !(t.zonaHabitual ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterNivel !== "TODOS" && t.nivel !== filterNivel) return false;
    if (filterRol !== "TODOS" && (t.rol?.nombre ?? "Sin rol") !== filterRol) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "nivel") {
      const order = { AAA: 0, AA: 1, A: 2 };
      return (order[a.nivel as keyof typeof order] ?? 3) - (order[b.nivel as keyof typeof order] ?? 3);
    }
    if (sortBy === "rol") return (a.rol?.nombre ?? "").localeCompare(b.rol?.nombre ?? "");
    return a.nombre.localeCompare(b.nombre);
  });

  const activos = filtered.filter(t => t.activo);
  const inactivos = filtered.filter(t => !t.activo);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Técnicos</h1>
          <p className="text-[#6b7280] text-sm">
            {tecnicos.filter(t => t.activo).length} activos
            {tecnicos.filter(t => !t.activo).length > 0 && ` · ${tecnicos.filter(t => !t.activo).length} inactivos`}
          </p>
        </div>
        {!showForm && (
          <button onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo técnico
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-6 mb-6 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
            {creating ? "Nuevo técnico" : `Editando: ${editing?.nombre}`}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre completo *</label>
              <input value={form.nombre} onChange={e => set("nombre", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Nombre del técnico" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Celular / WhatsApp</label>
              <input value={form.celular} onChange={e => set("celular", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="442 000 0000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Rol / Especialidad</label>
              <select value={form.rolId} onChange={e => set("rolId", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin rol definido</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nivel</label>
              <select value={form.nivel} onChange={e => set("nivel", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="AAA">AAA — Top</option>
                <option value="AA">AA — Intermedio alto</option>
                <option value="A">A — Intermedio</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Zona habitual</label>
              <input value={form.zonaHabitual} onChange={e => set("zonaHabitual", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Ej. Querétaro, CDMX" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cuenta bancaria</label>
              <input value={form.cuentaBancaria} onChange={e => set("cuentaBancaria", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Banco, CLABE o tarjeta" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Datos fiscales (RFC / razón social)</label>
              <input value={form.datosFiscales} onChange={e => set("datosFiscales", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="RFC o razón social para facturas" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Comentarios</label>
              <textarea value={form.comentarios} onChange={e => set("comentarios", e.target.value)} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Referencias, disponibilidad, notas especiales..." />
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
            placeholder="Buscar técnico..." />
          <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
            <option value="TODOS">Todos los niveles</option>
            <option value="AAA">AAA</option>
            <option value="AA">AA</option>
            <option value="A">A</option>
          </select>
          <select value={filterRol} onChange={e => setFilterRol(e.target.value)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
            <option value="TODOS">Todos los roles</option>
            {rolesUnicos.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]">
            <option value="nombre">Ordenar: Nombre</option>
            <option value="nivel">Ordenar: Nivel</option>
            <option value="rol">Ordenar: Rol</option>
          </select>
          {tecnicos.some(t => !t.activo) && (
            <button onClick={() => setShowInactivos(!showInactivos)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${showInactivos ? "border-[#B3985B] text-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"}`}>
              {showInactivos ? "Ocultar inactivos" : "Ver inactivos"}
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {activos.length === 0 && !creating ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">{search || filterNivel !== "TODOS" || filterRol !== "TODOS" ? "Sin resultados para ese filtro." : "No hay técnicos registrados."}</p>
          {!search && <button onClick={startCreate} className="mt-2 text-[#B3985B] text-sm hover:underline">Agregar el primero</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activos.map(t => (
            <TecnicoCard key={t.id} tecnico={t} onEdit={startEdit} onToggle={toggleActivo} />
          ))}
        </div>
      )}

      {showInactivos && inactivos.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Inactivos ({inactivos.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {inactivos.map(t => (
              <TecnicoCard key={t.id} tecnico={t} onEdit={startEdit} onToggle={toggleActivo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TecnicoCard({ tecnico: t, onEdit, onToggle }: {
  tecnico: Tecnico;
  onEdit: (t: Tecnico) => void;
  onToggle: (t: Tecnico) => void;
}) {
  const nivelStyle = NIVEL_COLORS[t.nivel] ?? "text-gray-400 bg-gray-800/20 border-gray-700/40";
  const initials = t.nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
            <span className="text-[#B3985B] text-xs font-bold">{initials}</span>
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-tight">{t.nombre}</p>
            <p className="text-gray-500 text-xs">{t.rol?.nombre ?? "Sin rol"}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${nivelStyle}`}>{t.nivel}</span>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs">
        {t.celular && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">Celular</span>
            <a href={`tel:${t.celular}`} className="text-white hover:text-[#B3985B] transition-colors">{t.celular}</a>
          </div>
        )}
        {t.zonaHabitual && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">Zona</span>
            <span className="text-white">{t.zonaHabitual}</span>
          </div>
        )}
        {t.cuentaBancaria && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">Banco</span>
            <span className="text-gray-300">{t.cuentaBancaria}</span>
          </div>
        )}
        {t.datosFiscales && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">Fiscal</span>
            <span className="text-gray-300">{t.datosFiscales}</span>
          </div>
        )}
        {t.comentarios && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600 w-16 shrink-0 mt-0.5">Notas</span>
            <span className="text-gray-400 italic">{t.comentarios}</span>
          </div>
        )}
        {t.evaluacionPromedio !== null && t.evaluacionPromedio !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">Evaluación</span>
            <span className="text-[#B3985B] font-semibold">{t.evaluacionPromedio.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-[#1a1a1a] mt-auto">
        <button onClick={() => onEdit(t)}
          className="flex-1 text-xs text-[#B3985B] hover:text-white py-1.5 rounded-lg border border-[#B3985B]/30 hover:border-[#B3985B] transition-colors text-center">
          Editar
        </button>
        <button onClick={() => onToggle(t)}
          className="flex-1 text-xs text-gray-500 hover:text-white py-1.5 rounded-lg border border-[#222] hover:border-[#333] transition-colors text-center">
          {t.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}
