"use client";

import { useEffect, useState, useRef } from "react";
import { CopyButton } from "@/components/CopyButton";

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
  habilidades: string | null;
};

type RankingItem = {
  id: string; nombre: string; nivel: string; activo: boolean;
  rol: Rol | null; proyectos: number;
  scorePromedio: number | null; puntualidadPromedio: number | null;
  ultimaFecha: string | null; diasSinTrabajar: number | null;
  ultimos3: { nombre: string; numero: string; fecha: string | null; score: number | null }[];
};

type DetalleTecnico = {
  cuentasPagar: { id: string; concepto: string; monto: number; estado: string; fechaCompromiso: string; proyecto: { id: string; nombre: string; numeroProyecto: string } | null }[];
  proyectoPersonal: { id: string; proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string | null; estado: string } }[];
};

const NIVEL_COLORS: Record<string, string> = {
  AAA: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  AA:  "text-blue-400 bg-blue-900/20 border-blue-800/40",
  A:   "text-gray-400 bg-gray-800/20 border-gray-700/40",
};

const EMPTY = {
  nombre: "", celular: "", rolId: "", nivel: "A",
  zonaHabitual: "", cuentaBancaria: "", datosFiscales: "", comentarios: "", habilidades: "",
};

type SortKey = "nombre" | "nivel" | "rol";

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [editing, setEditing] = useState<Tecnico | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const currentEditId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [view, setView] = useState<"card" | "list" | "ranking" | "disponibilidad">("list");
  const [search, setSearch] = useState("");
  const [filterNivel, setFilterNivel] = useState<string>("TODOS");
  const [filterRol, setFilterRol] = useState<string>("TODOS");
  const [sortBy, setSortBy] = useState<SortKey>("nombre");
  const [showInactivos, setShowInactivos] = useState(false);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleTecnico | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

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

  async function loadRanking() {
    setLoadingRanking(true);
    const res = await fetch("/api/tecnicos/ranking", { cache: "no-store" });
    const d = await res.json();
    setRanking(d.ranking ?? []);
    setLoadingRanking(false);
  }

  async function loadDetalle(id: string) {
    setDetalleId(id);
    setLoadingDetalle(true);
    const res = await fetch(`/api/tecnicos/${id}`, { cache: "no-store" });
    const d = await res.json();
    setDetalle(d.tecnico ?? null);
    setLoadingDetalle(false);
  }

  useEffect(() => {
    if (view === "ranking" && ranking.length === 0) loadRanking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Auto-save when editing existing tecnico
  useEffect(() => {
    if (!editing || editing.id !== currentEditId.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const habilidadesArr = form.habilidades ? form.habilidades.split(",").map(h => h.trim()).filter(Boolean) : [];
      const payload = { nombre: form.nombre, celular: form.celular || null, rolId: form.rolId || null, nivel: form.nivel, zonaHabitual: form.zonaHabitual || null, cuentaBancaria: form.cuentaBancaria || null, datosFiscales: form.datosFiscales || null, comentarios: form.comentarios || null, habilidades: habilidadesArr.length ? JSON.stringify(habilidadesArr) : null };
      await fetch(`/api/tecnicos/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setTecnicos(prev => prev.map(t => t.id === editing.id ? { ...t, ...payload } : t));
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(t: Tecnico) {
    currentEditId.current = t.id;
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
      habilidades: t.habilidades ? (JSON.parse(t.habilidades) as string[]).join(", ") : "",
    });
    setCreating(false);
  }

  function startCreate() {
    currentEditId.current = null;
    setCreating(true);
    setEditing(null);
    setForm(EMPTY);
  }

  function cancel() { currentEditId.current = null; setEditing(null); setCreating(false); }

  function set(key: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const habilidadesArr = form.habilidades ? form.habilidades.split(",").map(h => h.trim()).filter(Boolean) : [];
    const payload = {
      nombre: form.nombre,
      celular: form.celular || null,
      rolId: form.rolId || null,
      nivel: form.nivel,
      zonaHabitual: form.zonaHabitual || null,
      cuentaBancaria: form.cuentaBancaria || null,
      datosFiscales: form.datosFiscales || null,
      comentarios: form.comentarios || null,
      habilidades: habilidadesArr.length ? JSON.stringify(habilidadesArr) : null,
    };
    const url = editing ? `/api/tecnicos/${editing.id}` : "/api/tecnicos";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await load();
    cancel();
    setSaving(false);
  }

  async function eliminarTecnico(t: Tecnico) {
    if (!confirm(`¿Eliminar a ${t.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/tecnicos/${t.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "No se pudo eliminar. El técnico puede tener registros asociados.");
        return;
      }
      setTecnicos(prev => prev.filter(x => x.id !== t.id));
    } catch {
      alert("Error al eliminar.");
    }
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
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Técnicos</h1>
          <p className="text-[#6b7280] text-sm">
            {tecnicos.filter(t => t.activo).length} activos
            {tecnicos.filter(t => !t.activo).length > 0 && ` · ${tecnicos.filter(t => !t.activo).length} inactivos`}
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setView("card")} title="Tarjetas"
                className={`p-1.5 rounded-md transition-colors ${view === "card" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/></svg>
              </button>
              <button onClick={() => setView("list")} title="Lista"
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/></svg>
              </button>
              <button onClick={() => setView("ranking")} title="Ranking" className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${view === "ranking" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
                ★
              </button>
              <button onClick={() => setView("disponibilidad")} title="Disponibilidad" className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${view === "disponibilidad" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
                Cal
              </button>
            </div>
            <button onClick={startCreate}
              className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Nuevo técnico
            </button>
          </div>
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
              <label className="text-xs text-gray-500 mb-1 block">Habilidades / Especialidades</label>
              <input value={form.habilidades} onChange={e => set("habilidades", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="A1, Monitor, Luces, Video — separar por coma" />
              <p className="text-gray-600 text-[10px] mt-1">Separa con comas. Ej: A1, Monitor, Luces, IEM, Video</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Comentarios</label>
              <textarea value={form.comentarios} onChange={e => set("comentarios", e.target.value)} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Referencias, disponibilidad, notas especiales..." />
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

      {activos.length === 0 && !creating ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">{search || filterNivel !== "TODOS" || filterRol !== "TODOS" ? "Sin resultados para ese filtro." : "No hay técnicos registrados."}</p>
          {!search && <button onClick={startCreate} className="mt-2 text-[#B3985B] text-sm hover:underline">Agregar el primero</button>}
        </div>
      ) : view === "card" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activos.map(t => <TecnicoCard key={t.id} tecnico={t} onEdit={startEdit} onToggle={eliminarTecnico} />)}
          </div>
          {showInactivos && inactivos.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Inactivos ({inactivos.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                {inactivos.map(t => <TecnicoCard key={t.id} tecnico={t} onEdit={startEdit} onToggle={eliminarTecnico} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── LISTA ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Técnico", "Rol", "Nivel", "Zona", "Contacto", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {activos.map(t => (
                <tr key={t.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                        <span className="text-[#B3985B] text-[10px] font-bold">
                          {t.nombre.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium">{t.nombre}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{t.rol?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${NIVEL_COLORS[t.nivel] ?? "text-gray-400 bg-gray-800/20 border-gray-700/40"}`}>{t.nivel}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{t.zonaHabitual ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">
                    {t.celular ? (
                      <div className="flex items-center gap-2">
                        <span>{t.celular}</span>
                        <CopyButton value={t.celular} size="xs" />
                        <a href={`https://wa.me/${t.celular.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${t.nombre.split(" ")[0]}! 👋`)}`}
                           target="_blank" rel="noopener noreferrer"
                           className="text-green-500 hover:text-green-400 transition-colors shrink-0" title="WhatsApp">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(t)} className="text-[#B3985B] text-xs hover:underline">Editar</button>
                      <button onClick={() => eliminarTecnico(t)} className="text-red-500/70 text-xs hover:text-red-400 transition-colors">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {showInactivos && inactivos.map(t => (
                <tr key={t.id} className="opacity-40 hover:opacity-60 transition-opacity">
                  <td className="px-4 py-3">
                    <p className="text-gray-400 text-sm">{t.nombre}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#555]">{t.rol?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-gray-600 bg-gray-800/20 border-gray-700/40">{t.nivel}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#555]">{t.zonaHabitual ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">{t.celular ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => eliminarTecnico(t)} className="text-red-500/70 text-xs hover:text-red-400 transition-colors">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RANKING ── */}
      {view === "ranking" && !showForm && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">Ranking basado en evaluaciones internas de proyectos. Solo técnicos con al menos 1 proyecto evaluado tienen score.</p>
            <button onClick={loadRanking} className="text-xs text-[#B3985B] hover:underline">{loadingRanking ? "Cargando..." : "↺ Actualizar"}</button>
          </div>
          {loadingRanking ? (
            <div className="py-12 text-center text-gray-600 text-sm">Calculando ranking...</div>
          ) : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    {["#", "Técnico", "Rol", "Nivel", "Proyectos", "Score", "Puntualidad", "Último evento", "Últimos"].map(h => (
                      <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {ranking.filter(r => r.activo).map((r, i) => (
                    <tr key={r.id} className="hover:bg-[#1a1a1a] transition-colors cursor-pointer" onClick={() => loadDetalle(r.id)}>
                      <td className="px-4 py-3 text-gray-600 text-sm font-bold">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                            <span className="text-[#B3985B] text-[10px] font-bold">{r.nombre.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}</span>
                          </div>
                          <span className="text-white text-sm">{r.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">{r.rol?.nombre ?? "—"}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${NIVEL_COLORS[r.nivel] ?? "text-gray-400 bg-gray-800/20 border-gray-700/40"}`}>{r.nivel}</span></td>
                      <td className="px-4 py-3 text-white text-sm font-semibold">{r.proyectos}</td>
                      <td className="px-4 py-3">
                        {r.scorePromedio !== null ? (
                          <span className={`text-sm font-bold ${r.scorePromedio >= 8 ? "text-green-400" : r.scorePromedio >= 6 ? "text-[#B3985B]" : "text-red-400"}`}>{r.scorePromedio}</span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{r.puntualidadPromedio ?? "—"}</td>
                      <td className="px-4 py-3">
                        {r.ultimaFecha ? (
                          <div>
                            <p className="text-gray-300 text-xs">{new Date(r.ultimaFecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                            {r.diasSinTrabajar !== null && (
                              <p className={`text-[10px] ${r.diasSinTrabajar > 60 ? "text-red-400" : r.diasSinTrabajar > 30 ? "text-yellow-400" : "text-gray-600"}`}>
                                hace {r.diasSinTrabajar}d
                              </p>
                            )}
                          </div>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.ultimos3.map((p, j) => (
                            <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded border ${p.score !== null && p.score >= 8 ? "border-green-800/40 text-green-400" : p.score !== null && p.score >= 6 ? "border-[#B3985B]/40 text-[#B3985B]" : "border-[#222] text-gray-600"}`}>
                              {p.numero} {p.score !== null ? `·${p.score}` : ""}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ranking.filter(r => r.activo).length === 0 && !loadingRanking && (
                <p className="text-gray-600 text-sm text-center py-8">Sin datos de ranking aún — se calcula a partir de evaluaciones internas de proyectos</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DISPONIBILIDAD ── */}
      {view === "disponibilidad" && !showForm && (
        <div>
          <p className="text-xs text-gray-500 mb-4">Proyectos asignados a cada técnico en los próximos 60 días. Click en un técnico para ver su historial completo.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activos.filter(t => t.activo).map(t => (
              <div key={t.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 cursor-pointer hover:border-[#2a2a2a] transition-colors" onClick={() => loadDetalle(t.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                      <span className="text-[#B3985B] text-[10px] font-bold">{t.nombre.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{t.nombre}</p>
                      <p className="text-gray-600 text-xs">{t.rol?.nombre ?? "Sin rol"}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${NIVEL_COLORS[t.nivel] ?? "text-gray-400 bg-gray-800/20 border-gray-700/40"}`}>{t.nivel}</span>
                </div>
                {t.habilidades && (() => {
                  try {
                    const skills = JSON.parse(t.habilidades) as string[];
                    return (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {skills.map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded text-gray-400">{s}</span>)}
                      </div>
                    );
                  } catch { return null; }
                })()}
                <p className="text-[10px] text-[#B3985B] mt-2 hover:underline">Ver historial →</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETALLE MODAL ── */}
      {detalleId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setDetalleId(null); setDetalle(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
              <p className="text-white font-semibold">{tecnicos.find(t => t.id === detalleId)?.nombre ?? "Técnico"}</p>
              <button onClick={() => { setDetalleId(null); setDetalle(null); }} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            {loadingDetalle ? (
              <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
            ) : detalle ? (
              <div className="p-6 space-y-6">
                {/* Proyectos */}
                <div>
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Proyectos ({detalle.proyectoPersonal.length})</p>
                  {detalle.proyectoPersonal.length === 0 ? (
                    <p className="text-gray-600 text-sm">Sin proyectos registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {detalle.proyectoPersonal.map(pp => (
                        <a key={pp.id} href={`/proyectos/${pp.proyecto.id}`} className="flex items-center justify-between bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 hover:border-[#333] transition-colors">
                          <div>
                            <p className="text-white text-sm">{pp.proyecto.nombre}</p>
                            <p className="text-gray-600 text-xs">{pp.proyecto.numeroProyecto}</p>
                          </div>
                          <div className="text-right">
                            {pp.proyecto.fechaEvento && <p className="text-gray-400 text-xs">{new Date(pp.proyecto.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>}
                            <span className={`text-[10px] ${pp.proyecto.estado === "COMPLETADO" ? "text-green-400" : pp.proyecto.estado === "EN_CURSO" ? "text-yellow-400" : "text-gray-500"}`}>{pp.proyecto.estado}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {/* Historial pagos */}
                <div>
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Historial de pagos ({detalle.cuentasPagar.length})</p>
                  {detalle.cuentasPagar.length === 0 ? (
                    <p className="text-gray-600 text-sm">Sin pagos registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {detalle.cuentasPagar.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2">
                          <div>
                            <p className="text-white text-sm">{p.concepto || p.proyecto?.nombre || "Pago"}</p>
                            {p.proyecto && <p className="text-gray-600 text-xs">{p.proyecto.numeroProyecto}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-semibold">${p.monto.toLocaleString("es-MX")}</p>
                            <span className={`text-[10px] ${p.estado === "PAGADO" ? "text-green-400" : "text-yellow-400"}`}>{p.estado}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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
            <span className="text-white">{t.celular}</span>
            <a href={`https://wa.me/${t.celular.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${t.nombre.split(" ")[0]}! 👋`)}`}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full text-[10px] font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WA
            </a>
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
        {t.habilidades && (() => {
          try {
            const skills = JSON.parse(t.habilidades) as string[];
            return skills.length > 0 ? (
              <div className="flex items-start gap-2">
                <span className="text-gray-600 w-16 shrink-0 mt-0.5">Skills</span>
                <div className="flex gap-1 flex-wrap">
                  {skills.map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded text-gray-400">{s}</span>)}
                </div>
              </div>
            ) : null;
          } catch { return null; }
        })()}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-[#1a1a1a] mt-auto">
        <button onClick={() => onEdit(t)}
          className="flex-1 text-xs text-[#B3985B] hover:text-white py-1.5 rounded-lg border border-[#B3985B]/30 hover:border-[#B3985B] transition-colors text-center">
          Editar
        </button>
        <button onClick={() => onToggle(t)}
          className="flex-1 text-xs text-red-500/70 hover:text-red-400 py-1.5 rounded-lg border border-red-900/30 hover:border-red-900/60 transition-colors text-center">
          Eliminar
        </button>
      </div>
    </div>
  );
}
