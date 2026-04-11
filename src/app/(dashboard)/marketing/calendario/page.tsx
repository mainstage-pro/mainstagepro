"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tipo {
  id: string; nombre: string; formato: string;
  enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean; enFeedIG: boolean;
}
interface Publicacion {
  id: string; fecha: string; tipo: Tipo | null; tipoId: string | null;
  formato: string | null; objetivo: string | null; descripcion: string | null;
  copy: string | null; enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean;
  materialLink: string | null; portadaUrl: string | null; colaboradores: string | null;
  estado: string; comentarios: string | null;
  alcance: number | null; impresiones: number | null; interacciones: number | null; seguidoresGanados: number | null;
}

type Vista = "parrilla" | "tipo" | "feed";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "LISTO", "PUBLICADO", "CANCELADO"];
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", LISTO: "Listo", PUBLICADO: "Publicado", CANCELADO: "Cancelado",
};
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:   "bg-gray-800 text-gray-400",
  EN_PROCESO:  "bg-blue-900/40 text-blue-300",
  LISTO:       "bg-yellow-900/40 text-yellow-300",
  PUBLICADO:   "bg-green-900/40 text-green-300",
  CANCELADO:   "bg-red-900/40 text-red-400",
};
const FORMATO_COLORS: Record<string, string> = {
  POST: "text-blue-400", REEL: "text-purple-400", STORIE: "text-pink-400", TIK_TOK: "text-cyan-400",
};
const PLATAFORMAS = [
  { key: "enFacebook" as const, short: "FB" },
  { key: "enInstagram" as const, short: "IG" },
  { key: "enTiktok" as const, short: "TT" },
  { key: "enYoutube" as const, short: "YT" },
];
const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}
/** Safe date parse: works whether fecha is "2026-04-06" or "2026-04-06T06:00:00.000Z" */
function parseDate(fecha: string): Date {
  return new Date(fecha.slice(0, 10) + "T12:00:00");
}

const FORM_EMPTY = {
  fecha: "", tipoId: "", descripcion: "", copy: "",
  enFacebook: false, enInstagram: false, enTiktok: false, enYoutube: false,
  materialLink: "", portadaUrl: "", colaboradores: "", estado: "PENDIENTE", comentarios: "",
};

export default function MarketingCalendarioPage() {
  const [mes, setMes] = useState(toMes(new Date()));
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("parrilla");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    const [pRes, tRes] = await Promise.all([
      fetch(`/api/marketing/publicaciones?mes=${mes}`),
      fetch("/api/marketing/contenidos"),
    ]);
    const [pData, tData] = await Promise.all([pRes.json(), tRes.json()]);
    setPublicaciones(pData.publicaciones ?? []);
    setTipos(tData.tipos ?? []);
    setLoading(false);
  }

  useEffect(() => { setLoading(true); load(); }, [mes]);

  function openEdit(p: Publicacion) {
    setForm({
      fecha: p.fecha.slice(0, 10),
      tipoId: p.tipoId ?? "",
      descripcion: p.descripcion ?? "",
      copy: p.copy ?? "",
      enFacebook: p.enFacebook, enInstagram: p.enInstagram,
      enTiktok: p.enTiktok, enYoutube: p.enYoutube,
      materialLink: p.materialLink ?? "",
      portadaUrl: p.portadaUrl ?? "",
      colaboradores: p.colaboradores ?? "",
      estado: p.estado,
      comentarios: p.comentarios ?? "",
    });
    setEditId(p.id);
    setExpandedId(null);
  }

  function cancelEdit() { setForm(FORM_EMPTY); setEditId(null); }

  function onTipoChange(tipoId: string) {
    const tipo = tipos.find(t => t.id === tipoId);
    setForm(p => ({
      ...p, tipoId,
      enFacebook: tipo?.enFacebook ?? p.enFacebook,
      enInstagram: tipo?.enInstagram ?? p.enInstagram,
      enTiktok: tipo?.enTiktok ?? p.enTiktok,
      enYoutube: tipo?.enYoutube ?? p.enYoutube,
    }));
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    await fetch(`/api/marketing/publicaciones/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: form.fecha, tipoId: form.tipoId || null,
        descripcion: form.descripcion || null, copy: form.copy || null,
        enFacebook: form.enFacebook, enInstagram: form.enInstagram,
        enTiktok: form.enTiktok, enYoutube: form.enYoutube,
        materialLink: form.materialLink || null,
        portadaUrl: form.portadaUrl || null,
        colaboradores: form.colaboradores || null,
        estado: form.estado, comentarios: form.comentarios || null,
      }),
    });
    await load();
    cancelEdit();
    setSaving(false);
  }

  async function quickEstado(id: string, estado: string) {
    await fetch(`/api/marketing/publicaciones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setPublicaciones(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  }

  async function deletePub(id: string) {
    if (!confirm("¿Eliminar esta publicación?")) return;
    await fetch(`/api/marketing/publicaciones/${id}`, { method: "DELETE" });
    setExpandedId(null);
    setEditId(null);
    await load();
  }

  async function eliminarMes() {
    if (!confirm(`¿Eliminar las ${publicaciones.length} publicaciones de ${mesLabel(mes)}?\n\nEsta acción no se puede deshacer.`)) return;
    setGenerating(true);
    await Promise.all(publicaciones.map(p =>
      fetch(`/api/marketing/publicaciones/${p.id}`, { method: "DELETE" })
    ));
    await load();
    setGenerating(false);
  }

  async function generarMes() {
    if (publicaciones.length > 0) {
      if (!confirm(`Ya hay ${publicaciones.length} publicaciones en ${mesLabel(mes)}.\n\n¿Generar más publicaciones adicionales de todos modos?`)) return;
    } else {
      if (!confirm(`¿Generar publicaciones automáticamente para ${mesLabel(mes)}?`)) return;
    }
    setGenerating(true);
    const res = await fetch("/api/marketing/publicaciones/generar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes }),
    });
    const d = await res.json();
    await load();
    setGenerating(false);
    if (d.creadas) alert(`✓ Se generaron ${d.creadas} publicaciones para ${mesLabel(mes)}`);
  }

  const publicadas = publicaciones.filter(p => p.estado === "PUBLICADO").length;
  const pendientes = publicaciones.filter(p => p.estado === "PENDIENTE" || p.estado === "EN_PROCESO").length;
  const listas = publicaciones.filter(p => p.estado === "LISTO").length;

  const sorted = [...publicaciones].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Group by tipo
  const porTipo: Record<string, Publicacion[]> = {};
  const sinTipo: Publicacion[] = [];
  for (const p of publicaciones) {
    if (p.tipo) {
      if (!porTipo[p.tipo.id]) porTipo[p.tipo.id] = [];
      porTipo[p.tipo.id].push(p);
    } else {
      sinTipo.push(p);
    }
  }

  // Feed IG: solo tipos marcados como enFeedIG
  const feedPosts = sorted.filter(p => p.tipo?.enFeedIG === true);

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Calendario de contenido</h1>
          <p className="text-[#6b7280] text-sm">{publicaciones.length} publicaciones · {mesLabel(mes)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href="/marketing/contenidos"
            className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-400 text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
            Tipos de contenido
          </Link>
          {publicaciones.length > 0 && (
            <button onClick={eliminarMes} disabled={generating}
              className="bg-[#1a1a1a] border border-red-900/40 hover:bg-red-900/20 text-red-500 text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
              🗑 Borrar mes
            </button>
          )}
          <button onClick={generarMes} disabled={generating}
            className="bg-[#1a1a1a] border border-[#B3985B]/40 hover:bg-[#B3985B]/10 text-[#B3985B] text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
            {generating ? "Generando..." : "⚡ Generar mes"}
          </button>
        </div>
      </div>

      {/* Nav mes */}
      <div className="flex items-center gap-3">
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
          className="text-gray-500 hover:text-white text-sm w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a1a] transition-colors">←</button>
        <span className="text-white font-semibold text-sm min-w-[140px] text-center">{mesLabel(mes)}</span>
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
          className="text-gray-500 hover:text-white text-sm w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a1a] transition-colors">→</button>
        <button onClick={() => setMes(toMes(new Date()))}
          className="text-xs text-gray-600 hover:text-white transition-colors ml-1">Hoy</button>

        {/* Vista selector */}
        <div className="ml-auto flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {([["parrilla","Parrilla"],["tipo","Por tipo"],["feed","Feed IG"]] as [Vista,string][]).map(([v, label]) => (
            <button key={v} onClick={() => setVista(v)}
              className={`text-xs px-3 py-1 rounded transition-colors ${vista === v ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: publicaciones.length, color: "text-white" },
          { label: "Publicadas", value: publicadas, color: "text-green-400" },
          { label: "En proceso", value: pendientes, color: "text-blue-400" },
          { label: "Listas", value: listas, color: "text-yellow-400" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 md:p-4">
            <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Edit form inline */}
      {editId && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Editando publicación</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={form.tipoId} onChange={e => onTipoChange(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin tipo</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="De qué trata esta publicación..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Copy / Texto</label>
              <textarea value={form.copy} onChange={e => setForm(p => ({ ...p, copy: e.target.value }))} rows={3}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Texto que irá en la publicación..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">URL portada</label>
              <input value={form.portadaUrl} onChange={e => setForm(p => ({ ...p, portadaUrl: e.target.value }))}
                placeholder="https://... (imagen de portada)"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link de material</label>
              <input value={form.materialLink} onChange={e => setForm(p => ({ ...p, materialLink: e.target.value }))}
                placeholder="Drive, Dropbox..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Colaboradores</label>
              <input value={form.colaboradores} onChange={e => setForm(p => ({ ...p, colaboradores: e.target.value }))}
                placeholder="@usuario1, @usuario2..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <input value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))}
                placeholder="Observaciones..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            {/* Preview portada si hay URL */}
            {form.portadaUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.portadaUrl} alt="Portada" className="w-16 h-16 object-cover rounded-lg border border-[#2a2a2a]" />
                <span className="text-gray-600 text-xs">Vista previa portada</span>
              </div>
            )}
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500 mb-2 block">Plataformas</label>
              <div className="flex gap-4">
                {PLATAFORMAS.map(plt => (
                  <label key={plt.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form[plt.key]} onChange={e => setForm(p => ({ ...p, [plt.key]: e.target.checked }))}
                      className="accent-[#B3985B]" />
                    <span className="text-gray-400 text-sm">{plt.short}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveEdit} disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : publicaciones.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center space-y-3">
          <p className="text-gray-500 text-sm">Sin publicaciones para {mesLabel(mes)}</p>
          <p className="text-gray-600 text-xs">Usa "⚡ Generar mes" para crear automáticamente las publicaciones del mes</p>
          <button onClick={generarMes} disabled={generating}
            className="mt-2 bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-sm px-5 py-2 rounded-lg hover:bg-[#B3985B]/20 transition-colors disabled:opacity-50">
            {generating ? "Generando..." : "⚡ Generar publicaciones"}
          </button>
        </div>
      ) : vista === "parrilla" ? (
        <VistaParrilla
          publicaciones={sorted}
          expandedId={expandedId}
          editId={editId}
          setExpandedId={setExpandedId}
          openEdit={openEdit}
          deletePub={deletePub}
          quickEstado={quickEstado}
        />
      ) : vista === "tipo" ? (
        <VistaPorTipo
          porTipo={porTipo}
          sinTipo={sinTipo}
          expandedId={expandedId}
          editId={editId}
          setExpandedId={setExpandedId}
          openEdit={openEdit}
          deletePub={deletePub}
          quickEstado={quickEstado}
        />
      ) : (
        <VistaFeedIG feedPosts={feedPosts} openEdit={openEdit} />
      )}
    </div>
  );
}

// ─── Vista Parrilla (tabla) ──────────────────────────────────────────────────
function VistaParrilla({ publicaciones, expandedId, editId, setExpandedId, openEdit, deletePub, quickEstado }: {
  publicaciones: Publicacion[];
  expandedId: string | null;
  editId: string | null;
  setExpandedId: (id: string | null) => void;
  openEdit: (p: Publicacion) => void;
  deletePub: (id: string) => void;
  quickEstado: (id: string, estado: string) => void;
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[60px_80px_1fr_80px_80px_100px_60px] gap-2 px-4 py-2 border-b border-[#1a1a1a] text-[10px] text-gray-600 uppercase tracking-wider">
        <span>Fecha</span>
        <span>Formato</span>
        <span>Tipo / Descripción</span>
        <span className="text-center">Plataformas</span>
        <span className="text-center">Estado</span>
        <span></span>
        <span></span>
      </div>

      <div className="divide-y divide-[#181818]">
        {publicaciones.map(p => {
          const d = parseDate(p.fecha);
          const formato = p.formato ?? p.tipo?.formato ?? null;
          return (
            <div key={p.id}>
              <div
                className={`grid grid-cols-[60px_80px_1fr_80px_80px_100px_60px] gap-2 px-4 py-2.5 items-center hover:bg-[#141414] cursor-pointer transition-colors ${expandedId === p.id ? "bg-[#141414]" : ""} ${editId === p.id ? "opacity-50" : ""}`}
                onClick={() => { if (editId !== p.id) setExpandedId(expandedId === p.id ? null : p.id); }}>

                {/* Fecha */}
                <div>
                  <p className="text-[#B3985B] text-base font-bold leading-none">{d.getDate()}</p>
                  <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                </div>

                {/* Formato */}
                <span className={`text-[10px] font-bold ${FORMATO_COLORS[formato ?? ""] ?? "text-gray-600"}`}>
                  {formato ?? "—"}
                </span>

                {/* Tipo / Desc */}
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.tipo?.nombre ?? <span className="text-gray-600 italic">Sin tipo</span>}</p>
                  {p.descripcion && <p className="text-gray-500 text-[10px] truncate">{p.descripcion}</p>}
                </div>

                {/* Plataformas */}
                <div className="flex gap-1 justify-center flex-wrap" onClick={e => e.stopPropagation()}>
                  {PLATAFORMAS.filter(plt => p[plt.key]).map(plt => (
                    <span key={plt.key} className="text-[9px] text-gray-500 bg-[#1a1a1a] px-1 rounded">{plt.short}</span>
                  ))}
                </div>

                {/* Estado badge */}
                <div className="flex justify-center">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado]}`}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </div>

                {/* Portada thumbnail */}
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                  {p.portadaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.portadaUrl} alt="" className="w-10 h-10 object-cover rounded border border-[#2a2a2a]" />
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-[#2a2a2a] flex items-center justify-center">
                      <span className="text-[8px] text-gray-700">IMG</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                  {p.estado === "PENDIENTE" && (
                    <button onClick={() => quickEstado(p.id, "EN_PROCESO")}
                      className="text-[9px] px-1.5 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-blue-300 transition-colors whitespace-nowrap">
                      Iniciar
                    </button>
                  )}
                  {p.estado === "EN_PROCESO" && (
                    <button onClick={() => quickEstado(p.id, "LISTO")}
                      className="text-[9px] px-1.5 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-yellow-300 transition-colors">
                      Listo
                    </button>
                  )}
                  {p.estado === "LISTO" && (
                    <button onClick={() => quickEstado(p.id, "PUBLICADO")}
                      className="text-[9px] px-1.5 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-green-300 transition-colors">
                      Publicar
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded row */}
              {expandedId === p.id && editId !== p.id && (
                <div className="px-4 pb-3 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                  <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {p.portadaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.portadaUrl} alt="Portada" className="w-full max-w-[200px] aspect-square object-cover rounded-lg border border-[#2a2a2a]" />
                    )}
                    {p.copy && (
                      <div className={`${p.portadaUrl ? "md:col-span-2" : "md:col-span-3"} bg-[#111] rounded-lg p-3 border border-[#1e1e1e]`}>
                        <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Copy</p>
                        <p className="text-white whitespace-pre-wrap">{p.copy}</p>
                      </div>
                    )}
                    {p.materialLink && (
                      <div>
                        <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Material</p>
                        <a href={p.materialLink} target="_blank" rel="noopener noreferrer"
                          className="text-[#B3985B] hover:underline break-all">{p.materialLink}</a>
                      </div>
                    )}
                    {p.colaboradores && (
                      <div>
                        <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Colaboradores</p>
                        <p className="text-white">{p.colaboradores}</p>
                      </div>
                    )}
                    {p.comentarios && (
                      <div>
                        <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Notas</p>
                        <p className="text-gray-400">{p.comentarios}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(p)}
                      className="text-xs text-[#B3985B] hover:text-white px-3 py-1.5 border border-[#B3985B]/40 rounded-lg transition-colors">
                      Editar
                    </button>
                    <button onClick={() => deletePub(p.id)}
                      className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-900/30 rounded-lg transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista Por Tipo (original, fixed) ───────────────────────────────────────
function VistaPorTipo({ porTipo, sinTipo, expandedId, editId, setExpandedId, openEdit, deletePub, quickEstado }: {
  porTipo: Record<string, Publicacion[]>;
  sinTipo: Publicacion[];
  expandedId: string | null;
  editId: string | null;
  setExpandedId: (id: string | null) => void;
  openEdit: (p: Publicacion) => void;
  deletePub: (id: string) => void;
  quickEstado: (id: string, estado: string) => void;
}) {
  return (
    <div className="space-y-6">
      {Object.entries(porTipo).map(([tipoId, pubs]) => {
        const tipo = pubs[0]?.tipo;
        if (!tipo) return null;
        return (
          <div key={tipoId} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-3">
              <span className={`text-[10px] font-bold ${FORMATO_COLORS[tipo.formato] ?? "text-gray-400"}`}>{tipo.formato}</span>
              <h3 className="text-white font-semibold text-sm">{tipo.nombre}</h3>
              <span className="text-gray-600 text-xs">{pubs.length} publicación{pubs.length !== 1 ? "es" : ""}</span>
              <div className="ml-auto flex gap-1">
                {PLATAFORMAS.filter(p => tipo[p.key]).map(p => (
                  <span key={p.key} className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{p.short}</span>
                ))}
              </div>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {[...pubs].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => {
                const d = parseDate(p.fecha);
                return (
                  <div key={p.id}>
                    <div
                      className={`px-5 py-3 flex items-start gap-4 cursor-pointer hover:bg-[#141414] transition-colors ${expandedId === p.id ? "bg-[#141414]" : ""} ${editId === p.id ? "opacity-50" : ""}`}
                      onClick={() => { if (editId !== p.id) setExpandedId(expandedId === p.id ? null : p.id); }}>
                      <div className="shrink-0 text-center w-10">
                        <p className="text-[#B3985B] text-lg font-bold leading-none">{d.getDate()}</p>
                        <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado]}`}>
                            {ESTADO_LABEL[p.estado]}
                          </span>
                          {p.descripcion && <span className="text-gray-400 text-xs truncate max-w-xs">{p.descripcion}</span>}
                        </div>
                        {!p.descripcion && !p.copy && (
                          <p className="text-gray-700 text-xs mt-0.5 italic">Sin descripción · click para completar</p>
                        )}
                      </div>
                      {/* Portada mini */}
                      {p.portadaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.portadaUrl} alt="" className="w-8 h-8 object-cover rounded border border-[#2a2a2a] shrink-0" onClick={e => e.stopPropagation()} />
                      )}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {p.estado === "PENDIENTE" && (
                          <button onClick={() => quickEstado(p.id, "EN_PROCESO")}
                            className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-blue-300 transition-colors">Iniciar</button>
                        )}
                        {p.estado === "EN_PROCESO" && (
                          <button onClick={() => quickEstado(p.id, "LISTO")}
                            className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-yellow-300 transition-colors">Listo</button>
                        )}
                        {p.estado === "LISTO" && (
                          <button onClick={() => quickEstado(p.id, "PUBLICADO")}
                            className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-green-300 transition-colors">Publicar</button>
                        )}
                      </div>
                    </div>
                    {expandedId === p.id && editId !== p.id && (
                      <div className="px-5 pb-4 bg-[#0d0d0d] border-t border-[#1a1a1a] space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
                          {p.portadaUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.portadaUrl} alt="Portada" className="w-full max-w-[160px] aspect-square object-cover rounded-lg border border-[#2a2a2a]" />
                          )}
                          {p.copy && (
                            <div className="md:col-span-2 bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
                              <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Copy</p>
                              <p className="text-white whitespace-pre-wrap">{p.copy}</p>
                            </div>
                          )}
                          {p.materialLink && (
                            <div>
                              <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Material</p>
                              <a href={p.materialLink} target="_blank" rel="noopener noreferrer"
                                className="text-[#B3985B] hover:underline break-all">{p.materialLink}</a>
                            </div>
                          )}
                          {p.colaboradores && (
                            <div>
                              <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Colaboradores</p>
                              <p className="text-white">{p.colaboradores}</p>
                            </div>
                          )}
                          {p.comentarios && (
                            <div className="md:col-span-2">
                              <p className="text-gray-600 mb-1 text-[10px] uppercase tracking-wider">Notas</p>
                              <p className="text-gray-400">{p.comentarios}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => openEdit(p)}
                            className="text-xs text-[#B3985B] hover:text-white px-3 py-1.5 border border-[#B3985B]/40 rounded-lg transition-colors">Editar</button>
                          <button onClick={() => deletePub(p.id)}
                            className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-900/30 rounded-lg transition-colors">Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {sinTipo.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <h3 className="text-gray-500 font-medium text-sm">Sin tipo asignado</h3>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {[...sinTipo].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => {
              const d = parseDate(p.fecha);
              return (
                <div key={p.id}
                  className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-[#141414] transition-colors"
                  onClick={() => openEdit(p)}>
                  <div className="shrink-0 text-center w-10">
                    <p className="text-[#B3985B] text-lg font-bold leading-none">{d.getDate()}</p>
                    <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado]}`}>
                      {ESTADO_LABEL[p.estado]}
                    </span>
                    {p.descripcion && <span className="text-gray-400 text-xs ml-2">{p.descripcion}</span>}
                  </div>
                  <span className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">Editar →</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vista Feed IG ───────────────────────────────────────────────────────────
function VistaFeedIG({ feedPosts, openEdit }: {
  feedPosts: Publicacion[];
  openEdit: (p: Publicacion) => void;
}) {
  if (feedPosts.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
        <p className="text-gray-500 text-sm">No hay publicaciones de tipo POST este mes</p>
        <p className="text-gray-600 text-xs mt-1">Agrega portadas a tus publicaciones POST para verlas aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-[#0d0d0d] border-2 border-[#0d0d0d]" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">mainstage_pro</p>
          <p className="text-gray-600 text-[10px]">Preview feed Instagram · {feedPosts.length} posts</p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden border border-[#1e1e1e]">
        {feedPosts.map(p => {
          const d = parseDate(p.fecha);
          return (
            <div key={p.id}
              className="relative aspect-square group cursor-pointer overflow-hidden bg-[#111]"
              onClick={() => openEdit(p)}>
              {p.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.portadaUrl} alt={p.tipo?.nombre ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#141414]">
                  <span className="text-[10px] text-gray-700 font-bold uppercase">{p.tipo?.nombre ?? "Post"}</span>
                  <span className="text-[9px] text-gray-800">{d.getDate()} {MESES[d.getMonth()].slice(0,3)}</span>
                  <span className="text-[8px] text-gray-800 italic">Sin portada</span>
                </div>
              )}
              {/* Badge formato en esquina superior izquierda */}
              {(p.formato ?? p.tipo?.formato) === "REEL" && (
                <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-0.5">
                  <span className="text-[8px] text-purple-400 font-bold">▶ REEL</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                <p className="text-white text-[10px] font-semibold text-center leading-tight">{p.tipo?.nombre ?? "Post"}</p>
                <p className="text-gray-400 text-[9px]">{d.getDate()} {MESES[d.getMonth()].slice(0,3)}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full mt-1 ${ESTADO_COLORS[p.estado]}`}>
                  {ESTADO_LABEL[p.estado]}
                </span>
                <span className="text-[#B3985B] text-[9px] mt-1">Editar →</span>
              </div>

              {/* Estado dot */}
              <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                p.estado === "PUBLICADO" ? "bg-green-400" :
                p.estado === "LISTO" ? "bg-yellow-400" :
                p.estado === "EN_PROCESO" ? "bg-blue-400" : "bg-gray-600"
              }`} />
            </div>
          );
        })}
        {/* Fill remaining cells to complete last row */}
        {Array.from({ length: (3 - (feedPosts.length % 3)) % 3 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-[#0d0d0d]" />
        ))}
      </div>

      <p className="text-gray-700 text-[10px] text-center">
        Los cuadros con borde punteado no tienen portada · haz click en cualquiera para agregar una
      </p>
    </div>
  );
}
