"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

interface TipoContenido {
  id: string; nombre: string; formato: string; objetivo: string | null;
  diaSemana: string | null; semanaDelMes: number | null; recurrencia: string | null; cantMes: number | null;
  descripcion: string | null; activo: boolean; orden: number;
  enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean; enFeedIG: boolean;
}

const SEMANA_LABEL: Record<number, string> = { 1: "1er", 2: "2do", 3: "3er", 4: "4to" };

const FORMATOS = ["POST", "REEL", "STORIE", "TIK_TOK"];
const DIAS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
const RECURRENCIAS = ["DIARIO", "SEMANAL", "QUINCENAL", "MENSUAL", "EVENTUAL"];

const FORMATO_COLORS: Record<string, string> = {
  POST: "bg-blue-900/40 text-blue-300 border-blue-800/30",
  REEL: "bg-purple-900/40 text-purple-300 border-purple-800/30",
  STORIE: "bg-pink-900/40 text-pink-300 border-pink-800/30",
  TIK_TOK: "bg-cyan-900/40 text-cyan-300 border-cyan-800/30",
};

const PLATAFORMAS = [
  { key: "enFacebook" as const, label: "Facebook", short: "FB" },
  { key: "enInstagram" as const, label: "Instagram", short: "IG" },
  { key: "enTiktok" as const, label: "TikTok", short: "TT" },
  { key: "enYoutube" as const, label: "YouTube", short: "YT" },
];

const EMPTY = {
  nombre: "", formato: "POST", objetivo: "", diaSemana: "", semanaDelMes: "", recurrencia: "", cantMes: "",
  descripcion: "", enFacebook: false, enInstagram: false, enTiktok: false, enYoutube: false, enFeedIG: false,
};

export default function ContenidosPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [tipos, setTipos] = useState<TipoContenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroFormato, setFiltroFormato] = useState<string | null>(null);
  const [filtroPlataforma, setFiltroPlataforma] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/marketing/contenidos", { cache: "no-store" });
    const d = await r.json();
    setTipos(d.tipos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: TipoContenido) {
    setForm({
      nombre: t.nombre, formato: t.formato, objetivo: t.objetivo ?? "",
      diaSemana: t.diaSemana ?? "", semanaDelMes: t.semanaDelMes?.toString() ?? "",
      recurrencia: t.recurrencia ?? "", cantMes: t.cantMes?.toString() ?? "",
      descripcion: t.descripcion ?? "",
      enFacebook: t.enFacebook, enInstagram: t.enInstagram,
      enTiktok: t.enTiktok, enYoutube: t.enYoutube, enFeedIG: t.enFeedIG,
    });
    setEditId(t.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre, formato: form.formato,
      objetivo: form.objetivo || null, diaSemana: form.diaSemana || null,
      semanaDelMes: form.semanaDelMes ? parseInt(form.semanaDelMes) : null,
      recurrencia: form.recurrencia || null,
      cantMes: form.cantMes ? parseInt(form.cantMes) : null,
      descripcion: form.descripcion || null,
      enFacebook: form.enFacebook, enInstagram: form.enInstagram,
      enTiktok: form.enTiktok, enYoutube: form.enYoutube, enFeedIG: form.enFeedIG,
    };
    if (editId) {
      await fetch(`/api/marketing/contenidos/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      const res = await fetch("/api/marketing/contenidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (d.generadas > 0) {
        toast.success(`✓ Tipo creado. Se generaron ${d.generadas} publicaciones automáticamente en el calendario del mes actual.`);
      }
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function toggleActivo(t: TipoContenido) {
    await fetch(`/api/marketing/contenidos/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !t.activo }) });
    await load();
  }

  async function deleteContenido(id: string, nombre: string) {
    if (!await confirm({ message: `¿Eliminar "${nombre}"?\n\nSe eliminarán también todas las publicaciones pendientes de este tipo en el calendario.`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/marketing/contenidos/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.eliminadas > 0) toast.info(`Se eliminaron ${d.eliminadas} publicaciones del calendario.`);
    await load();
  }

  const PLAT_KEYS: Record<string, keyof TipoContenido> = {
    FB: "enFacebook", IG: "enInstagram", TT: "enTiktok", YT: "enYoutube", FeedIG: "enFeedIG",
  };

  function applyFilters(list: TipoContenido[]) {
    return list.filter(t => {
      if (search && !t.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (filtroFormato && t.formato !== filtroFormato) return false;
      if (filtroPlataforma && !t[PLAT_KEYS[filtroPlataforma]]) return false;
      return true;
    });
  }

  const activos = applyFilters(tipos.filter(t => t.activo));
  const inactivos = applyFilters(tipos.filter(t => !t.activo));
  const hayFiltros = search || filtroFormato || filtroPlataforma;

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tipos de contenido</h1>
          <p className="text-[#6b7280] text-sm">{activos.length} formatos activos</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Agregar tipo
          </button>
        )}
      </div>

      {/* Filtros */}
      {!showForm && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tipo..."
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#B3985B] w-44"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {FORMATOS.map(f => (
              <button key={f} onClick={() => setFiltroFormato(filtroFormato === f ? null : f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded border transition-colors ${
                  filtroFormato === f
                    ? FORMATO_COLORS[f]
                    : "border-[#2a2a2a] text-gray-500 hover:border-[#444] hover:text-white"
                }`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "FB", label: "FB", active: "text-blue-400 bg-blue-900/20 border-blue-700/40" },
              { key: "IG", label: "IG", active: "text-pink-400 bg-pink-900/20 border-pink-700/40" },
              { key: "TT", label: "TT", active: "text-cyan-400 bg-cyan-900/20 border-cyan-700/40" },
              { key: "YT", label: "YT", active: "text-red-400 bg-red-900/20 border-red-700/40" },
              { key: "FeedIG", label: "Feed IG", active: "text-pink-300 bg-pink-900/20 border-pink-700/40" },
            ].map(p => (
              <button key={p.key} onClick={() => setFiltroPlataforma(filtroPlataforma === p.key ? null : p.key)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded border transition-colors ${
                  filtroPlataforma === p.key ? p.active : "border-[#2a2a2a] text-gray-500 hover:border-[#444] hover:text-white"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {hayFiltros && (
            <button onClick={() => { setSearch(""); setFiltroFormato(null); setFiltroPlataforma(null); }}
              className="text-[10px] text-gray-600 hover:text-white transition-colors px-1">
              Limpiar ×
            </button>
          )}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
            {editId ? "Editar tipo de contenido" : "Nuevo tipo de contenido"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Carrusel de eventos, Aftermovie, Behind the scenes..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Formato</label>
              <select value={form.formato} onChange={e => setForm(p => ({ ...p, formato: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Día de publicación</label>
              <input value={form.diaSemana} onChange={e => setForm(p => ({ ...p, diaSemana: e.target.value }))}
                placeholder="LUNES o LUNES,VIERNES"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              <p className="text-[10px] text-gray-700 mt-0.5">Varios días: LUNES,VIERNES</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Semana del mes</label>
              <select value={form.semanaDelMes} onChange={e => setForm(p => ({ ...p, semanaDelMes: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Todas las semanas</option>
                <option value="1">1er semana</option>
                <option value="2">2da semana</option>
                <option value="3">3er semana</option>
                <option value="4">4ta semana</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Recurrencia</label>
              <select value={form.recurrencia} onChange={e => setForm(p => ({ ...p, recurrencia: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin definir</option>
                {RECURRENCIAS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cantidad por mes</label>
              <input type="number" value={form.cantMes} onChange={e => setForm(p => ({ ...p, cantMes: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="0" min="0" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Objetivo</label>
              <input value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                placeholder="Ej: Mostrar trabajo, generar comunidad, atraer clientes..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Describir cómo es este tipo de contenido, ejemplos, referencias..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-2 block">Plataformas</label>
              <div className="flex flex-wrap gap-3">
                {PLATAFORMAS.map(plt => (
                  <label key={plt.key} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={form[plt.key]} onChange={e => setForm(p => ({ ...p, [plt.key]: e.target.checked }))}
                      className="accent-[#B3985B]" />
                    <span className="text-gray-400 text-sm group-hover:text-white transition-colors">{plt.label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer group ml-4 pl-4 border-l border-[#2a2a2a]">
                  <input type="checkbox" checked={form.enFeedIG} onChange={e => setForm(p => ({ ...p, enFeedIG: e.target.checked }))}
                    className="accent-pink-500" />
                  <span className="text-pink-400 text-sm group-hover:text-pink-300 transition-colors font-medium">Feed IG</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={saving || !form.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar tipo"}
            </button>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : activos.length === 0 && inactivos.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          {hayFiltros ? (
            <>
              <p className="text-gray-500 text-sm">Sin resultados para los filtros aplicados</p>
              <button onClick={() => { setSearch(""); setFiltroFormato(null); setFiltroPlataforma(null); }}
                className="mt-2 text-[#B3985B] text-xs hover:underline">Limpiar filtros</button>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm">Sin tipos de contenido</p>
              <p className="text-gray-600 text-xs mt-1">Agrega los formatos que usas en tus redes sociales</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activos.map(t => (
            <div key={t.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 hover:border-[#2a2a2a] transition-colors">
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold text-sm">{t.nombre}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${FORMATO_COLORS[t.formato] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                      {t.formato}
                    </span>
                    {t.recurrencia && (
                      <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-2 py-0.5 rounded">{t.recurrencia}</span>
                    )}
                    {t.cantMes && (
                      <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded font-semibold">{t.cantMes}× al mes</span>
                    )}
                    {t.enFeedIG && (
                      <span className="text-[10px] text-pink-400 bg-pink-900/20 border border-pink-900/30 px-2 py-0.5 rounded font-semibold">Feed IG</span>
                    )}
                  </div>

                  {t.objetivo && (
                    <p className="text-gray-400 text-xs mb-1">
                      <span className="text-gray-600">Objetivo: </span>{t.objetivo}
                    </p>
                  )}
                  {t.descripcion && (
                    <p className="text-gray-600 text-xs mb-2 italic">{t.descripcion}</p>
                  )}

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {t.diaSemana && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="text-gray-700">Día:</span>
                        {t.semanaDelMes ? `${SEMANA_LABEL[t.semanaDelMes]} ` : ""}
                        {t.diaSemana.split(",").map(d => d.charAt(0) + d.slice(1).toLowerCase()).join(" y ")}
                      </span>
                    )}
                    {/* Platform badges */}
                    {PLATAFORMAS.filter(p => t[p.key]).map(p => (
                      <span key={p.key} className="text-[10px] text-gray-400 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded font-medium">
                        {p.short}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                  <button onClick={() => toggleActivo(t)} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">Desactivar</button>
                  <button onClick={() => deleteContenido(t.id, t.nombre)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                </div>
              </div>
            </div>
          ))}

          {inactivos.length > 0 && (
            <details className="mt-2">
              <summary className="text-gray-600 text-xs cursor-pointer hover:text-white px-1 py-2 select-none">
                {inactivos.length} tipo{inactivos.length !== 1 ? "s" : ""} inactivo{inactivos.length !== 1 ? "s" : ""}
              </summary>
              <div className="mt-2 space-y-2">
                {inactivos.map(t => (
                  <div key={t.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-5 py-3 flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{t.nombre}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${FORMATO_COLORS[t.formato] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>{t.formato}</span>
                    </div>
                    <button onClick={() => toggleActivo(t)} className="text-xs text-gray-500 hover:text-green-400 transition-colors">Activar</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
