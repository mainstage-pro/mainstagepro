"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tipo { id: string; nombre: string; formato: string }
interface Publicacion {
  id: string; fecha: string; tipo: Tipo | null; tipoId: string | null;
  formato: string | null; objetivo: string | null; descripcion: string | null;
  copy: string | null; enFacebook: boolean; enInstagram: boolean; enTiktok: boolean; enYoutube: boolean;
  materialLink: string | null; colaboradores: string | null; estado: string; comentarios: string | null;
  alcance: number | null; impresiones: number | null; interacciones: number | null; seguidoresGanados: number | null;
}

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "LISTO", "PUBLICADO", "CANCELADO"];
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:   "bg-gray-800 text-gray-400",
  EN_PROCESO:  "bg-blue-900/40 text-blue-300",
  LISTO:       "bg-yellow-900/40 text-yellow-300",
  PUBLICADO:   "bg-green-900/40 text-green-300",
  CANCELADO:   "bg-red-900/40 text-red-400 line-through",
};
const FORMATO_COLORS: Record<string, string> = {
  POST: "text-blue-400", REEL: "text-purple-400", STORIE: "text-pink-400", TIK_TOK: "text-cyan-400",
};

const PLATAFORMAS = [
  { key: "enFacebook", label: "FB" },
  { key: "enInstagram", label: "IG" },
  { key: "enTiktok", label: "TT" },
  { key: "enYoutube", label: "YT" },
] as const;

function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${names[parseInt(m) - 1]} ${y}`;
}

const FORM_EMPTY = {
  fecha: "", tipoId: "", formato: "", objetivo: "", descripcion: "", copy: "",
  enFacebook: false, enInstagram: false, enTiktok: false, enYoutube: false,
  materialLink: "", colaboradores: "", estado: "PENDIENTE", comentarios: "",
};

export default function MarketingCalendarioPage() {
  const [mes, setMes] = useState(toMes(new Date()));
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"tabla" | "calendario">("tabla");

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

  function openCreate(fecha?: string) {
    setForm({ ...FORM_EMPTY, fecha: fecha ?? "" });
    setEditId(null);
    setShowForm(true);
    setSelectedId(null);
  }

  function openEdit(p: Publicacion) {
    setForm({
      fecha: p.fecha.slice(0, 10),
      tipoId: p.tipoId ?? "",
      formato: p.formato ?? "",
      objetivo: p.objetivo ?? "",
      descripcion: p.descripcion ?? "",
      copy: p.copy ?? "",
      enFacebook: p.enFacebook,
      enInstagram: p.enInstagram,
      enTiktok: p.enTiktok,
      enYoutube: p.enYoutube,
      materialLink: p.materialLink ?? "",
      colaboradores: p.colaboradores ?? "",
      estado: p.estado,
      comentarios: p.comentarios ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
    setSelectedId(null);
  }

  function cancelForm() { setForm(FORM_EMPTY); setEditId(null); setShowForm(false); }

  async function save() {
    if (!form.fecha) return;
    setSaving(true);
    const payload = {
      fecha: form.fecha,
      tipoId: form.tipoId || null,
      formato: form.formato || null,
      objetivo: form.objetivo || null,
      descripcion: form.descripcion || null,
      copy: form.copy || null,
      enFacebook: form.enFacebook,
      enInstagram: form.enInstagram,
      enTiktok: form.enTiktok,
      enYoutube: form.enYoutube,
      materialLink: form.materialLink || null,
      colaboradores: form.colaboradores || null,
      estado: form.estado,
      comentarios: form.comentarios || null,
    };
    if (editId) {
      await fetch(`/api/marketing/publicaciones/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/marketing/publicaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function quickEstado(id: string, estado: string) {
    await fetch(`/api/marketing/publicaciones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
    await load();
  }

  async function deletePub(id: string) {
    if (!confirm("¿Eliminar esta publicación?")) return;
    await fetch(`/api/marketing/publicaciones/${id}`, { method: "DELETE" });
    setSelectedId(null);
    await load();
  }

  // Seleccionar tipo auto-completa formato
  function onTipoChange(tipoId: string) {
    const tipo = tipos.find(t => t.id === tipoId);
    setForm(p => ({ ...p, tipoId, formato: tipo?.formato ?? p.formato }));
  }

  // Stats del mes
  const publicadas = publicaciones.filter(p => p.estado === "PUBLICADO").length;
  const pendientes = publicaciones.filter(p => p.estado === "PENDIENTE" || p.estado === "EN_PROCESO").length;
  const canceladas = publicaciones.filter(p => p.estado === "CANCELADO").length;

  // Agrupar por día para vista tabla
  const porDia = publicaciones.reduce((acc, p) => {
    const dia = p.fecha.slice(0, 10);
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(p);
    return acc;
  }, {} as Record<string, Publicacion[]>);
  const diasOrdenados = Object.keys(porDia).sort();

  // Vista calendario — generar días del mes
  const [year, month] = mes.split("-").map(Number);
  const diasMes: (null | string)[] = [];
  const primerDia = new Date(year, month - 1, 1).getDay();
  for (let i = 0; i < (primerDia === 0 ? 6 : primerDia - 1); i++) diasMes.push(null);
  const totalDias = new Date(year, month, 0).getDate();
  for (let d = 1; d <= totalDias; d++) {
    diasMes.push(`${mes}-${String(d).padStart(2, "0")}`);
  }

  const selected = selectedId ? publicaciones.find(p => p.id === selectedId) : null;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Calendario de contenido</h1>
          <p className="text-[#6b7280] text-sm">{publicaciones.length} publicaciones · {mesLabel(mes)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/marketing/contenidos" className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors">
            Tipos de contenido
          </Link>
          <button
            onClick={() => setViewMode(v => v === "tabla" ? "calendario" : "tabla")}
            className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors">
            Vista: {viewMode === "tabla" ? "Tabla" : "Calendario"}
          </button>
          <button onClick={() => openCreate()}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Publicación
          </button>
        </div>
      </div>

      {/* Nav mes */}
      <div className="flex items-center gap-3">
        <button onClick={() => {
          const d = new Date(`${mes}-01`);
          d.setMonth(d.getMonth() - 1);
          setMes(toMes(d));
        }} className="text-gray-500 hover:text-white text-sm px-2 py-1 transition-colors">←</button>
        <span className="text-white font-medium text-sm">{mesLabel(mes)}</span>
        <button onClick={() => {
          const d = new Date(`${mes}-01`);
          d.setMonth(d.getMonth() + 1);
          setMes(toMes(d));
        }} className="text-gray-500 hover:text-white text-sm px-2 py-1 transition-colors">→</button>
        <button onClick={() => setMes(toMes(new Date()))} className="text-xs text-gray-600 hover:text-white transition-colors ml-2">Hoy</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: publicaciones.length, color: "text-white" },
          { label: "Publicadas", value: publicadas, color: "text-green-400" },
          { label: "Pendientes", value: pendientes, color: "text-yellow-400" },
          { label: "Canceladas", value: canceladas, color: "text-red-400" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{editId ? "Editar publicación" : "Nueva publicación"}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de contenido</label>
              <select value={form.tipoId} onChange={e => onTipoChange(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin tipo</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Formato</label>
              <select value={form.formato} onChange={e => setForm(p => ({ ...p, formato: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                <option value="">Sin formato</option>
                {["POST","REEL","STORIE","TIK_TOK"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Objetivo</label>
              <input value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                placeholder="Ej: Engagement, branding..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                {ESTADOS.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Colaboradores</label>
              <input value={form.colaboradores} onChange={e => setForm(p => ({ ...p, colaboradores: e.target.value }))}
                placeholder="Fotógrafo, editor..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="De qué trata esta publicación..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Copy / Texto de la publicación</label>
              <textarea value={form.copy} onChange={e => setForm(p => ({ ...p, copy: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Texto que irá en la publicación..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link de material</label>
              <input value={form.materialLink} onChange={e => setForm(p => ({ ...p, materialLink: e.target.value }))}
                placeholder="Drive, Dropbox..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Plataformas</label>
              <div className="flex gap-3 mt-2">
                {PLATAFORMAS.map(plt => (
                  <label key={plt.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form[plt.key]} onChange={e => setForm(p => ({ ...p, [plt.key]: e.target.checked }))}
                      className="accent-[#B3985B]" />
                    <span className="text-gray-400 text-sm">{plt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !form.fecha}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
            </button>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : publicaciones.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-gray-600 text-sm">Sin publicaciones para {mesLabel(mes)}</p>
          <button onClick={() => openCreate()} className="mt-2 text-[#B3985B] text-sm hover:underline">Agregar la primera</button>
        </div>
      ) : viewMode === "tabla" ? (
        <div className="space-y-4">
          {diasOrdenados.map(dia => (
            <div key={dia} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="text-sm text-white font-medium">
                  {new Date(dia + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <button onClick={() => openCreate(dia)} className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors">+ agregar</button>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {porDia[dia].map(p => (
                  <div key={p.id}
                    className={`px-5 py-3 flex items-start gap-4 hover:bg-[#141414] cursor-pointer transition-colors ${selectedId === p.id ? "bg-[#141414]" : ""}`}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {p.tipo && <span className="text-white text-sm font-medium">{p.tipo.nombre}</span>}
                        {p.formato && <span className={`text-[10px] font-semibold ${FORMATO_COLORS[p.formato] ?? "text-gray-400"}`}>{p.formato}</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado] ?? "bg-gray-800 text-gray-400"}`}>
                          {p.estado.replace("_"," ")}
                        </span>
                      </div>
                      {p.descripcion && <p className="text-gray-500 text-xs truncate">{p.descripcion}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {PLATAFORMAS.map(plt => p[plt.key as keyof Publicacion] && (
                          <span key={plt.key} className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{plt.label}</span>
                        ))}
                        {p.colaboradores && <span className="text-[10px] text-gray-600">· {p.colaboradores}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {ESTADOS.filter(s => s !== p.estado && s !== "CANCELADO").slice(0, 2).map(s => (
                        <button key={s} onClick={e => { e.stopPropagation(); quickEstado(p.id, s); }}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-500 hover:text-white transition-colors">
                          → {s.replace("_"," ")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Panel detalle seleccionado */}
          {selected && (
            <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{selected.tipo?.nombre ?? "Sin tipo"}</p>
                  <p className="text-gray-500 text-xs">{new Date(selected.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(selected)} className="text-xs text-[#B3985B] hover:text-white px-3 py-1.5 border border-[#B3985B]/40 rounded-lg transition-colors">Editar</button>
                  <button onClick={() => deletePub(selected.id)} className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-800/40 rounded-lg transition-colors">Eliminar</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {selected.objetivo && <div><span className="text-gray-600">Objetivo: </span><span className="text-white">{selected.objetivo}</span></div>}
                {selected.colaboradores && <div><span className="text-gray-600">Colaboradores: </span><span className="text-white">{selected.colaboradores}</span></div>}
                {selected.copy && (
                  <div className="col-span-2 bg-[#0d0d0d] rounded-lg p-3">
                    <p className="text-gray-600 mb-1">Copy:</p>
                    <p className="text-white">{selected.copy}</p>
                  </div>
                )}
                {selected.materialLink && (
                  <div className="col-span-2"><span className="text-gray-600">Material: </span>
                    <a href={selected.materialLink} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] hover:underline">{selected.materialLink}</a>
                  </div>
                )}
                {selected.comentarios && <div className="col-span-2"><span className="text-gray-600">Comentarios: </span><span className="text-gray-400">{selected.comentarios}</span></div>}
              </div>
              {/* Métricas */}
              {(selected.alcance || selected.impresiones || selected.interacciones || selected.seguidoresGanados) && (
                <div className="border-t border-[#1a1a1a] pt-3">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Métricas</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { k: "alcance", label: "Alcance", v: selected.alcance },
                      { k: "impresiones", label: "Impresiones", v: selected.impresiones },
                      { k: "interacciones", label: "Interacciones", v: selected.interacciones },
                      { k: "seguidoresGanados", label: "Nuevos seg.", v: selected.seguidoresGanados },
                    ].filter(m => m.v !== null).map(m => (
                      <div key={m.k} className="bg-[#0d0d0d] rounded-lg p-2 text-center">
                        <p className="text-white font-semibold">{m.v?.toLocaleString()}</p>
                        <p className="text-gray-600 text-[10px]">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Vista calendario */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs text-gray-600 font-semibold">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-[#1a1a1a]" style={{ gridAutoRows: "minmax(80px, auto)" }}>
            {diasMes.map((dia, i) => {
              const pubs = dia ? (porDia[dia] ?? []) : [];
              const today = dia === new Date().toISOString().slice(0, 10);
              return (
                <div key={i} className={`p-1.5 min-h-[80px] relative ${!dia ? "bg-[#0a0a0a]" : "hover:bg-[#141414] cursor-pointer"} ${today ? "bg-[#0f0f0f]" : ""}`}
                  onClick={() => dia && openCreate(dia)}>
                  {dia && (
                    <>
                      <span className={`text-xs font-medium block mb-1 ${today ? "text-[#B3985B]" : "text-gray-600"}`}>
                        {parseInt(dia.slice(8))}
                      </span>
                      <div className="space-y-0.5">
                        {pubs.slice(0, 3).map(p => (
                          <div key={p.id}
                            onClick={e => { e.stopPropagation(); setSelectedId(p.id); }}
                            className={`text-[9px] px-1.5 py-0.5 rounded truncate cursor-pointer ${ESTADO_COLORS[p.estado] ?? "bg-gray-800 text-gray-400"}`}>
                            {p.tipo?.nombre ?? p.formato ?? "—"}
                          </div>
                        ))}
                        {pubs.length > 3 && <p className="text-[9px] text-gray-600">+{pubs.length - 3}</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
