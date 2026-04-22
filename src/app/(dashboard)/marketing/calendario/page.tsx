"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";

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

type Vista = "calendario" | "proximas" | "parrilla" | "tipo" | "feed";

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
const ESTADO_DOT: Record<string, string> = {
  PENDIENTE: "bg-gray-600", EN_PROCESO: "bg-blue-400", LISTO: "bg-yellow-400",
  PUBLICADO: "bg-green-400", CANCELADO: "bg-red-400",
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

// Palette to visually distinguish content types in the calendar
const TIPO_PALETA = [
  { bg: "bg-blue-900/50",   text: "text-blue-200",   dot: "bg-blue-400" },
  { bg: "bg-purple-900/50", text: "text-purple-200", dot: "bg-purple-400" },
  { bg: "bg-pink-900/50",   text: "text-pink-200",   dot: "bg-pink-400" },
  { bg: "bg-teal-900/50",   text: "text-teal-200",   dot: "bg-teal-400" },
  { bg: "bg-orange-900/50", text: "text-orange-200", dot: "bg-orange-400" },
  { bg: "bg-cyan-900/50",   text: "text-cyan-200",   dot: "bg-cyan-400" },
  { bg: "bg-lime-900/50",   text: "text-lime-200",   dot: "bg-lime-400" },
  { bg: "bg-rose-900/50",   text: "text-rose-200",   dot: "bg-rose-400" },
];

function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}
function parseDate(fecha: string): Date {
  return new Date(fecha.slice(0, 10) + "T12:00:00");
}

const FORM_EMPTY = {
  fecha: "", tipoId: "", descripcion: "", copy: "",
  enFacebook: false, enInstagram: false, enTiktok: false, enYoutube: false,
  materialLink: "", portadaUrl: "", colaboradores: "", estado: "PENDIENTE", comentarios: "",
};

export default function MarketingCalendarioPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [mes, setMes] = useState(toMes(new Date()));
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("parrilla");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [showNueva, setShowNueva] = useState(false);
  const [nuevaForm, setNuevaForm] = useState({ fecha: new Date().toISOString().slice(0, 10), tipoId: "", descripcion: "", copy: "", enFacebook: false, enInstagram: false, enTiktok: false, enYoutube: false });
  const [guardandoNueva, setGuardandoNueva] = useState(false);
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

  useEffect(() => { setLoading(true); load(); }, [mes]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const res = await fetch(`/api/marketing/publicaciones/${editId}`, {
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
    if (res.ok) {
      const { publicacion } = await res.json();
      setPublicaciones(prev => prev.map(p => p.id === editId ? publicacion : p));
    }
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
    if (!await confirm({ message: "¿Eliminar esta publicación?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/marketing/publicaciones/${id}`, { method: "DELETE" });
    setPublicaciones(prev => prev.filter(p => p.id !== id));
    setExpandedId(null);
    setEditId(null);
  }

  /** Drag-to-reschedule: update fecha optimistically */
  async function handleDateChange(id: string, fecha: string) {
    setPublicaciones(prev => prev.map(p => p.id === id ? { ...p, fecha } : p));
    await fetch(`/api/marketing/publicaciones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha }),
    });
  }

  async function eliminarMes() {
    if (!await confirm({ message: `¿Eliminar las ${publicaciones.length} publicaciones de ${mesLabel(mes)}?\n\nEsta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar todo" })) return;
    setGenerating(true);
    await Promise.all(publicaciones.map(p =>
      fetch(`/api/marketing/publicaciones/${p.id}`, { method: "DELETE" })
    ));
    setPublicaciones([]);
    setGenerating(false);
  }

  /** Smart generation: if current month already has publications, auto-advance to next month */
  async function generarMes() {
    let targetMes = mes;

    if (publicaciones.length > 0) {
      // Auto-advance to next month
      const d = new Date(`${mes}-15`);
      d.setMonth(d.getMonth() + 1);
      targetMes = toMes(d);
    }

    setGenerating(true);
    const res = await fetch("/api/marketing/publicaciones/generar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: targetMes }),
    });
    const d = await res.json();
    setGenerating(false);

    if (d.creadas) {
      toast.success(`✓ ${d.creadas} publicaciones generadas para ${mesLabel(targetMes)}`);
      // Navigate to the generated month
      if (targetMes !== mes) setMes(targetMes);
      else await load();
    } else {
      toast.error("No se generaron publicaciones — revisa la estrategia de contenidos");
    }
  }

  function openNueva(fechaInicial?: string) {
    setNuevaForm({
      fecha: fechaInicial ?? (mes + "-01"),
      tipoId: "", descripcion: "", copy: "",
      enFacebook: false, enInstagram: false, enTiktok: false, enYoutube: false,
    });
    setShowNueva(true);
  }

  function onNuevaTipoChange(tipoId: string) {
    const tipo = tipos.find(t => t.id === tipoId);
    setNuevaForm(p => ({
      ...p, tipoId,
      enFacebook: tipo?.enFacebook ?? p.enFacebook,
      enInstagram: tipo?.enInstagram ?? p.enInstagram,
      enTiktok: tipo?.enTiktok ?? p.enTiktok,
      enYoutube: tipo?.enYoutube ?? p.enYoutube,
    }));
  }

  async function crearPublicacion() {
    if (!nuevaForm.fecha) { toast.error("La fecha es obligatoria"); return; }
    setGuardandoNueva(true);
    const res = await fetch("/api/marketing/publicaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: nuevaForm.fecha,
        tipoId: nuevaForm.tipoId || null,
        descripcion: nuevaForm.descripcion || null,
        copy: nuevaForm.copy || null,
        enFacebook: nuevaForm.enFacebook,
        enInstagram: nuevaForm.enInstagram,
        enTiktok: nuevaForm.enTiktok,
        enYoutube: nuevaForm.enYoutube,
        estado: "PENDIENTE",
      }),
    });
    if (res.ok) {
      const { publicacion } = await res.json();
      const newMes = nuevaForm.fecha.slice(0, 7);
      if (newMes !== mes) {
        setMes(newMes);
      } else {
        setPublicaciones(prev => [...prev, publicacion].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      }
      toast.success("Publicación agregada");
      setShowNueva(false);
    } else {
      toast.error("Error al crear publicación");
    }
    setGuardandoNueva(false);
  }

  // Build tipo → palette color map (stable across renders for the same set of tipos)
  const tipoColorMap: Record<string, typeof TIPO_PALETA[0]> = {};
  tipos.forEach((t, i) => { tipoColorMap[t.id] = TIPO_PALETA[i % TIPO_PALETA.length]; });

  const publicadas = publicaciones.filter(p => p.estado === "PUBLICADO").length;
  const pendientes = publicaciones.filter(p => p.estado === "PENDIENTE" || p.estado === "EN_PROCESO").length;
  const listas = publicaciones.filter(p => p.estado === "LISTO").length;
  const sorted = [...publicaciones].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const porTipo: Record<string, Publicacion[]> = {};
  const sinTipo: Publicacion[] = [];
  for (const p of publicaciones) {
    if (p.tipo) {
      if (!porTipo[p.tipo.id]) porTipo[p.tipo.id] = [];
      porTipo[p.tipo.id].push(p);
    } else { sinTipo.push(p); }
  }

  const feedPosts = sorted.filter(p => p.tipo?.enFeedIG === true);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Calendario de contenido</h1>
          <p className="text-[#6b7280] text-sm">{publicaciones.length} publicaciones · {mesLabel(mes)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href="/marketing/contenidos"
            className="bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-gray-400 text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
            Estrategia
          </Link>
          {publicaciones.length > 0 && (
            <button onClick={eliminarMes} disabled={generating}
              className="bg-[#1a1a1a] border border-red-900/40 hover:bg-red-900/20 text-red-500 text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
              Borrar mes
            </button>
          )}
          <button onClick={generarMes} disabled={generating}
            className="bg-[#1a1a1a] border border-[#B3985B]/40 hover:bg-[#B3985B]/10 text-[#B3985B] text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
            {generating ? "Generando..." : "⚡ Generar mes"}
          </button>
          <button onClick={() => openNueva()}
            className="bg-[#B3985B] hover:bg-[#d4b068] text-black text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
            + Nueva
          </button>
        </div>
      </div>

      {/* Nav mes + vista selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() - 1); setMes(toMes(d)); }}
          className="text-gray-500 hover:text-white text-sm w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a1a] transition-colors">←</button>
        <span className="text-white font-semibold text-sm min-w-[150px] text-center">{mesLabel(mes)}</span>
        <button onClick={() => { const d = new Date(`${mes}-15`); d.setMonth(d.getMonth() + 1); setMes(toMes(d)); }}
          className="text-gray-500 hover:text-white text-sm w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a1a] transition-colors">→</button>
        <button onClick={() => setMes(toMes(new Date()))}
          className="text-xs text-gray-600 hover:text-white transition-colors">Hoy</button>

        <div className="ml-auto flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {([["calendario","Calendario"],["proximas","Próximas"],["parrilla","Parrilla"],["tipo","Por tipo"],["feed","Feed IG"]] as [Vista,string][]).map(([v, label]) => (
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

      {/* ── Modal: Editar publicación ── */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={cancelEdit} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Editar publicación</h3>
              <button onClick={cancelEdit} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select value={form.tipoId} onChange={e => onTipoChange(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">Sin tipo</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Estado</label>
                  <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                  <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="De qué trata esta publicación..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-gray-500 mb-1 block">Copy / Texto</label>
                  <textarea value={form.copy} onChange={e => setForm(p => ({ ...p, copy: e.target.value }))} rows={3}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                    placeholder="Texto que irá en la publicación..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">URL portada</label>
                  <input value={form.portadaUrl} onChange={e => setForm(p => ({ ...p, portadaUrl: e.target.value }))}
                    placeholder="https://... (imagen de portada)"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Link de material</label>
                  <input value={form.materialLink} onChange={e => setForm(p => ({ ...p, materialLink: e.target.value }))}
                    placeholder="Drive, Dropbox..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Colaboradores</label>
                  <input value={form.colaboradores} onChange={e => setForm(p => ({ ...p, colaboradores: e.target.value }))}
                    placeholder="@usuario1, @usuario2..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                  <input value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))}
                    placeholder="Observaciones..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
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
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
                <button onClick={saveEdit} disabled={saving}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Contenido principal ── */}
      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : vista === "calendario" ? (
        <VistaCalendario
          publicaciones={sorted}
          mes={mes}
          tipoColorMap={tipoColorMap}
          openEdit={openEdit}
          deletePub={deletePub}
          onDateChange={handleDateChange}
          openNueva={openNueva}
        />
      ) : vista === "proximas" ? (
        <VistaProximas
          publicaciones={sorted}
          openEdit={openEdit}
          deletePub={deletePub}
          quickEstado={quickEstado}
          onNueva={openNueva}
          onGenerar={generarMes}
          generating={generating}
          mesLabel={mesLabel(mes)}
        />
      ) : publicaciones.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center space-y-3">
          <p className="text-gray-500 text-sm">Sin publicaciones para {mesLabel(mes)}</p>
          <p className="text-gray-600 text-xs">Usa &ldquo;⚡ Generar mes&rdquo; para crear automáticamente las publicaciones del mes</p>
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

      {/* ── Modal nueva publicación ── */}
      {showNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={e => { if (e.target === e.currentTarget) setShowNueva(false); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <div>
                <h3 className="text-white font-semibold">Nueva publicación</h3>
                <p className="text-gray-600 text-xs mt-0.5">Agrega una publicación fuera de la estrategia programada</p>
              </div>
              <button onClick={() => setShowNueva(false)} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha <span className="text-red-400">*</span></label>
                  <input type="date" value={nuevaForm.fecha} onChange={e => setNuevaForm(p => ({ ...p, fecha: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo de contenido</label>
                  <select value={nuevaForm.tipoId} onChange={e => onNuevaTipoChange(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Personalizado —</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción / tema</label>
                <input value={nuevaForm.descripcion} onChange={e => setNuevaForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="¿De qué trata esta publicación?"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Copy (opcional)</label>
                <textarea value={nuevaForm.copy} onChange={e => setNuevaForm(p => ({ ...p, copy: e.target.value }))} rows={2}
                  placeholder="Texto de la publicación..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Plataformas</label>
                <div className="flex gap-4">
                  {PLATAFORMAS.map(plt => (
                    <label key={plt.key} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={nuevaForm[plt.key]} onChange={e => setNuevaForm(p => ({ ...p, [plt.key]: e.target.checked }))} className="accent-[#B3985B]" />
                      <span className="text-gray-400 text-sm">{plt.short}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={crearPublicacion} disabled={guardandoNueva}
                  className="flex-1 bg-[#B3985B] hover:bg-[#d4b068] disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {guardandoNueva ? "Guardando..." : "Agregar publicación"}
                </button>
                <button onClick={() => setShowNueva(false)}
                  className="px-4 text-sm text-gray-500 hover:text-white border border-[#333] rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vista Calendario (cuadrícula mensual con drag & drop) ───────────────────
function VistaCalendario({ publicaciones, mes, tipoColorMap, openEdit, deletePub, onDateChange, openNueva }: {
  publicaciones: Publicacion[];
  mes: string;
  tipoColorMap: Record<string, typeof TIPO_PALETA[0]>;
  openEdit: (p: Publicacion) => void;
  deletePub: (id: string) => void;
  onDateChange: (id: string, fecha: string) => void;
  openNueva: (fecha?: string) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const [year, month] = mes.split("-").map(Number);
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const totalDays = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Group publications by date
  const byDate: Record<string, Publicacion[]> = {};
  for (const p of publicaciones) {
    const key = p.fecha.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(p);
  }

  // Build calendar cells
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  if (publicaciones.length === 0) {
    return (
      <div className="space-y-3">
        <CalendarGrid weeks={weeks} year={year} month={month} today={today} byDate={{}} tipoColorMap={tipoColorMap}
          draggedId={null} dragOverDate={null} setDraggedId={() => {}} setDragOverDate={() => {}}
          openEdit={openEdit} deletePub={deletePub} onDateChange={onDateChange} openNueva={openNueva} />
        <div className="text-center py-4 text-gray-600 text-sm">
          Sin publicaciones · haz click en cualquier día para agregar una o usa ⚡ Generar mes
        </div>
      </div>
    );
  }

  return (
    <CalendarGrid
      weeks={weeks} year={year} month={month} today={today} byDate={byDate} tipoColorMap={tipoColorMap}
      draggedId={draggedId} dragOverDate={dragOverDate}
      setDraggedId={setDraggedId} setDragOverDate={setDragOverDate}
      openEdit={openEdit} deletePub={deletePub} onDateChange={onDateChange} openNueva={openNueva}
    />
  );
}

function CalendarGrid({ weeks, year, month, today, byDate, tipoColorMap, draggedId, dragOverDate, setDraggedId, setDragOverDate, openEdit, deletePub, onDateChange, openNueva }: {
  weeks: (number | null)[][];
  year: number; month: number; today: string;
  byDate: Record<string, Publicacion[]>;
  tipoColorMap: Record<string, typeof TIPO_PALETA[0]>;
  draggedId: string | null; dragOverDate: string | null;
  setDraggedId: (id: string | null) => void;
  setDragOverDate: (d: string | null) => void;
  openEdit: (p: Publicacion) => void;
  deletePub: (id: string) => void;
  onDateChange: (id: string, fecha: string) => void;
  openNueva: (fecha?: string) => void;
}) {
  return (
    <div className="space-y-1">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
          <div key={d} className="text-center text-[11px] text-[#555] uppercase font-semibold py-2 tracking-wider">{d}</div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div className="border border-[#1e1e1e] rounded-2xl overflow-hidden">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${wi < weeks.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}>
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="bg-[#0a0a0a] min-h-[110px] border-r border-[#1a1a1a] last:border-r-0" />;
              }

              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const pubs = byDate[dateStr] ?? [];
              const isToday = dateStr === today;
              const isDragTarget = dragOverDate === dateStr;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[110px] p-1.5 border-r border-[#1a1a1a] last:border-r-0 relative group transition-colors cursor-pointer
                    ${isToday ? "bg-[#B3985B]/5" : "bg-[#0d0d0d] hover:bg-[#111]"}
                    ${isDragTarget ? "!bg-[#B3985B]/10 ring-1 ring-inset ring-[#B3985B]/40" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOverDate(dateStr); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null); }}
                  onDrop={e => {
                    e.preventDefault();
                    if (draggedId) { onDateChange(draggedId, dateStr); setDraggedId(null); setDragOverDate(null); }
                  }}
                  onClick={() => openNueva(dateStr)}
                >
                  {/* Day number */}
                  <div className={`text-[11px] font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? "bg-[#B3985B] text-black" : "text-[#666] group-hover:text-[#888]"}`}>
                    {day}
                  </div>

                  {/* Publication chips */}
                  <div className="space-y-0.5">
                    {pubs.map(p => {
                      const paleta = tipoColorMap[p.tipoId ?? ""] ?? { bg: "bg-[#1a1a1a]", text: "text-gray-400", dot: "bg-gray-600" };
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={e => { e.stopPropagation(); setDraggedId(p.id); }}
                          onDragEnd={() => { setDraggedId(null); setDragOverDate(null); }}
                          onClick={e => { e.stopPropagation(); openEdit(p); }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing
                            group/chip transition-opacity
                            ${paleta.bg} ${paleta.text}
                            ${draggedId === p.id ? "opacity-30" : ""}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ESTADO_DOT[p.estado] ?? "bg-gray-600"}`} />
                          <span className="truncate text-[10px] font-medium leading-snug flex-1">
                            {p.tipo?.nombre ?? p.formato ?? "—"}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); deletePub(p.id); }}
                            className="opacity-0 group-hover/chip:opacity-100 hover:text-red-400 ml-0.5 shrink-0 leading-none text-[12px] transition-opacity"
                          >×</button>
                        </div>
                      );
                    })}
                  </div>

                  {/* "+" hint on hover (empty day) */}
                  {pubs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-[#333] text-lg">+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap pt-1 px-1">
        <span className="text-[10px] text-[#444] uppercase tracking-wider">Estado:</span>
        {Object.entries(ESTADO_DOT).map(([estado, dotClass]) => (
          <div key={estado} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="text-[10px] text-[#555]">{ESTADO_LABEL[estado]}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-[#444]">Arrastra para reagendar · Click para editar · × para eliminar</span>
      </div>
    </div>
  );
}

// ─── Vista Próximas ──────────────────────────────────────────────────────────
function VistaProximas({ publicaciones, openEdit, deletePub, quickEstado, onNueva, onGenerar, generating, mesLabel }: {
  publicaciones: Publicacion[];
  openEdit: (p: Publicacion) => void;
  deletePub: (id: string) => void;
  quickEstado: (id: string, estado: string) => void;
  onNueva: () => void;
  onGenerar: () => void;
  generating: boolean;
  mesLabel: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [verPublicadas, setVerPublicadas] = useState(false);

  const porPublicar = publicaciones.filter(p => !["PUBLICADO", "CANCELADO"].includes(p.estado));
  const publicadas  = publicaciones.filter(p => p.estado === "PUBLICADO");

  if (publicaciones.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center space-y-3">
        <p className="text-gray-500 text-sm">Sin publicaciones programadas para {mesLabel}</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <button onClick={onGenerar} disabled={generating}
            className="bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-sm px-5 py-2 rounded-lg hover:bg-[#B3985B]/20 transition-colors disabled:opacity-50">
            {generating ? "Generando..." : "⚡ Generar desde estrategia"}
          </button>
          <button onClick={onNueva}
            className="bg-[#1a1a1a] border border-[#333] text-gray-400 text-sm px-5 py-2 rounded-lg hover:text-white transition-colors">
            + Publicación manual
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {porPublicar.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-8 text-center space-y-2">
          <p className="text-green-400 text-sm font-medium">✓ Todo publicado para {mesLabel}</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B3985B]" />
            <span className="text-white text-sm font-semibold">Por publicar</span>
            <span className="text-gray-600 text-xs">{porPublicar.length}</span>
          </div>
          <div className="divide-y divide-[#181818]">
            {porPublicar.map(p => {
              const d = parseDate(p.fecha);
              const fechaStr = p.fecha.slice(0, 10);
              const isToday = fechaStr === today;
              const isPast  = fechaStr < today;
              const formato = p.formato ?? p.tipo?.formato ?? null;
              return (
                <div key={p.id} className={`px-4 py-3 flex items-center gap-3 hover:bg-[#141414] transition-colors ${isToday ? "bg-[#B3985B]/5" : ""}`}>
                  <div className="shrink-0 text-center w-12">
                    {isToday && <p className="text-[8px] text-[#B3985B] uppercase font-bold tracking-wider leading-none mb-0.5">Hoy</p>}
                    <p className={`text-lg font-bold leading-none ${isToday ? "text-[#B3985B]" : isPast ? "text-red-400/70" : "text-white"}`}>{d.getDate()}</p>
                    <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                    <p className="text-[#444] text-[9px]">{MESES[d.getMonth()].slice(0,3)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-medium">{p.tipo?.nombre ?? <span className="text-gray-600 italic">Sin tipo</span>}</span>
                      {formato && <span className={`text-[10px] font-bold ${FORMATO_COLORS[formato] ?? "text-gray-600"}`}>{formato}</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                      {isPast && !isToday && <span className="text-[10px] text-red-400 font-medium">⚠ Atrasada</span>}
                    </div>
                    {p.descripcion && <p className="text-gray-500 text-[10px] mt-0.5 truncate">{p.descripcion}</p>}
                    <div className="flex gap-1 mt-1">
                      {PLATAFORMAS.filter(plt => p[plt.key]).map(plt => (
                        <span key={plt.key} className="text-[9px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{plt.short}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.estado === "PENDIENTE" && (
                      <button onClick={() => quickEstado(p.id, "EN_PROCESO")}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] text-blue-400 hover:bg-blue-900/20 transition-colors">Iniciar</button>
                    )}
                    {p.estado === "EN_PROCESO" && (
                      <button onClick={() => quickEstado(p.id, "LISTO")}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] text-yellow-400 hover:bg-yellow-900/20 transition-colors">Listo</button>
                    )}
                    {p.estado === "LISTO" && (
                      <button onClick={() => quickEstado(p.id, "PUBLICADO")}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] text-green-400 hover:bg-green-900/20 transition-colors">Publicar ✓</button>
                    )}
                    <button onClick={() => openEdit(p)}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-[#B3985B] hover:border-[#B3985B]/40 transition-colors">Editar</button>
                    <button onClick={() => deletePub(p.id)}
                      className="text-[10px] px-2 py-1.5 rounded-lg text-gray-700 hover:text-red-400 transition-colors">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {publicadas.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <button onClick={() => setVerPublicadas(v => !v)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#111] transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500/60" />
              <span className="text-gray-500 text-sm">Ya publicadas</span>
              <span className="text-gray-700 text-xs">{publicadas.length}</span>
            </div>
            <span className="text-gray-600 text-xs">{verPublicadas ? "▲ Ocultar" : "▼ Ver"}</span>
          </button>
          {verPublicadas && (
            <div className="divide-y divide-[#1a1a1a] border-t border-[#1a1a1a]">
              {publicadas.map(p => {
                const d = parseDate(p.fecha);
                return (
                  <div key={p.id} className="px-4 py-2.5 flex items-center gap-3 opacity-60 hover:opacity-90 transition-opacity">
                    <div className="shrink-0 text-center w-12">
                      <p className="text-green-500 text-base font-bold leading-none">{d.getDate()}</p>
                      <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-400 text-xs">{p.tipo?.nombre ?? "Sin tipo"}</span>
                      {p.descripcion && <span className="text-gray-600 text-[10px] ml-2">{p.descripcion}</span>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-900/40 text-green-300 shrink-0">Publicada</span>
                    <button onClick={() => openEdit(p)} className="text-[10px] text-gray-700 hover:text-[#B3985B] transition-colors shrink-0">Editar</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista Parrilla (tabla) ──────────────────────────────────────────────────
function VistaParrilla({ publicaciones, expandedId, editId, setExpandedId, openEdit, deletePub, quickEstado }: {
  publicaciones: Publicacion[]; expandedId: string | null; editId: string | null;
  setExpandedId: (id: string | null) => void;
  openEdit: (p: Publicacion) => void; deletePub: (id: string) => void;
  quickEstado: (id: string, estado: string) => void;
}) {
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const tiposUnicos = Array.from(new Map(publicaciones.filter(p => p.tipo).map(p => [p.tipo!.id, p.tipo!])).values());
  const filtered = filtroTipo ? publicaciones.filter(p => p.tipoId === filtroTipo) : publicaciones;

  return (
    <div className="space-y-3">
      {tiposUnicos.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFiltroTipo(null)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${filtroTipo === null ? "bg-[#B3985B]/20 border-[#B3985B] text-[#B3985B]" : "border-[#2a2a2a] text-gray-500 hover:border-[#444]"}`}>
            Todos
          </button>
          {tiposUnicos.map(t => (
            <button key={t.id} onClick={() => setFiltroTipo(filtroTipo === t.id ? null : t.id)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${filtroTipo === t.id ? "bg-[#B3985B]/20 border-[#B3985B] text-[#B3985B]" : "border-[#2a2a2a] text-gray-500 hover:border-[#444]"}`}>
              {t.nombre}
            </button>
          ))}
        </div>
      )}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[72px_80px_1fr_1fr_80px_100px] gap-2 px-4 py-2 border-b border-[#1a1a1a] text-[10px] text-gray-600 uppercase tracking-wider">
          <span>Fecha</span><span>Formato</span><span>Tipo / Descripción</span><span>Copy</span>
          <span className="text-center">Plataformas</span><span className="text-center">Estado</span>
        </div>
        <div className="divide-y divide-[#181818]">
          {filtered.map(p => {
            const d = parseDate(p.fecha);
            const formato = p.formato ?? p.tipo?.formato ?? null;
            return (
              <div key={p.id}>
                <div className={`grid grid-cols-[72px_80px_1fr_1fr_80px_100px] gap-2 px-4 py-2.5 items-center hover:bg-[#141414] cursor-pointer transition-colors ${expandedId === p.id ? "bg-[#141414]" : ""} ${editId === p.id ? "opacity-50" : ""}`}
                  onClick={() => { if (editId !== p.id) setExpandedId(expandedId === p.id ? null : p.id); }}>
                  <div>
                    <p className="text-white text-sm font-bold leading-none">{d.getDate()}</p>
                    <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                    <p className="text-[#444] text-[9px]">{MESES[d.getMonth()].slice(0,3)}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${FORMATO_COLORS[formato ?? ""] ?? "text-gray-600"}`}>{formato ?? "—"}</span>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{p.tipo?.nombre ?? <span className="text-gray-600 italic">Sin tipo</span>}</p>
                    {p.descripcion && <p className="text-gray-500 text-[10px] truncate">{p.descripcion}</p>}
                  </div>
                  <div className="min-w-0">
                    {p.copy ? <p className="text-gray-400 text-[10px] truncate">{p.copy}</p> : <span className="text-gray-700 text-[9px] italic">—</span>}
                  </div>
                  <div className="flex gap-1 justify-center flex-wrap" onClick={e => e.stopPropagation()}>
                    {PLATAFORMAS.filter(plt => p[plt.key]).map(plt => (
                      <span key={plt.key} className="text-[9px] text-gray-500 bg-[#1a1a1a] px-1 rounded">{plt.short}</span>
                    ))}
                  </div>
                  <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                    <select value={p.estado} onChange={e => quickEstado(p.id, e.target.value)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border-0 focus:outline-none cursor-pointer ${ESTADO_COLORS[p.estado]}`}
                      style={{ appearance: "none", WebkitAppearance: "none" }}>
                      {ESTADOS.map(e => <option key={e} value={e} className="bg-[#111] text-white text-xs">{ESTADO_LABEL[e]}</option>)}
                    </select>
                  </div>
                </div>
                {expandedId === p.id && editId !== p.id && (
                  <div className="px-4 pb-3 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {p.portadaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.portadaUrl} alt="Portada" className="w-full max-w-[200px] aspect-square object-cover rounded-lg border border-[#2a2a2a]" />
                      )}
                      {p.copy && (
                        <div className={`${p.portadaUrl ? "md:col-span-2" : "md:col-span-3"} bg-[#111] rounded-lg p-3 border border-[#1e1e1e]`}>
                          <p className="text-gray-600 mb-1 text-[10px] uppercase">Copy</p>
                          <p className="text-white whitespace-pre-wrap">{p.copy}</p>
                        </div>
                      )}
                      {p.materialLink && (
                        <div><p className="text-gray-600 mb-1 text-[10px] uppercase">Material</p>
                          <a href={p.materialLink} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] hover:underline break-all">{p.materialLink}</a>
                        </div>
                      )}
                      {p.colaboradores && <div><p className="text-gray-600 mb-1 text-[10px] uppercase">Colaboradores</p><p className="text-white">{p.colaboradores}</p></div>}
                      {p.comentarios && <div className="md:col-span-2"><p className="text-gray-600 mb-1 text-[10px] uppercase">Notas</p><p className="text-gray-400">{p.comentarios}</p></div>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openEdit(p)} className="text-xs text-[#B3985B] hover:text-white px-3 py-1.5 border border-[#B3985B]/40 rounded-lg transition-colors">Editar</button>
                      <button onClick={() => deletePub(p.id)} className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-900/30 rounded-lg transition-colors">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Vista Por Tipo ──────────────────────────────────────────────────────────
function VistaPorTipo({ porTipo, sinTipo, expandedId, editId, setExpandedId, openEdit, deletePub, quickEstado }: {
  porTipo: Record<string, Publicacion[]>; sinTipo: Publicacion[];
  expandedId: string | null; editId: string | null;
  setExpandedId: (id: string | null) => void;
  openEdit: (p: Publicacion) => void; deletePub: (id: string) => void;
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
                    <div className={`px-5 py-3 flex items-start gap-4 cursor-pointer hover:bg-[#141414] transition-colors ${expandedId === p.id ? "bg-[#141414]" : ""} ${editId === p.id ? "opacity-50" : ""}`}
                      onClick={() => { if (editId !== p.id) setExpandedId(expandedId === p.id ? null : p.id); }}>
                      <div className="shrink-0 text-center w-12">
                        <p className="text-white text-lg font-bold leading-none">{d.getDate()}</p>
                        <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                        <p className="text-[#444] text-[9px]">{MESES[d.getMonth()].slice(0,3)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                          {p.descripcion && <span className="text-gray-400 text-xs truncate max-w-xs">{p.descripcion}</span>}
                        </div>
                      </div>
                      {p.portadaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.portadaUrl} alt="" className="w-8 h-8 object-cover rounded border border-[#2a2a2a] shrink-0" onClick={e => e.stopPropagation()} />
                      )}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {p.estado === "PENDIENTE" && <button onClick={() => quickEstado(p.id, "EN_PROCESO")} className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-blue-300 transition-colors">Iniciar</button>}
                        {p.estado === "EN_PROCESO" && <button onClick={() => quickEstado(p.id, "LISTO")} className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-yellow-300 transition-colors">Listo</button>}
                        {p.estado === "LISTO" && <button onClick={() => quickEstado(p.id, "PUBLICADO")} className="text-[10px] px-2 py-1 rounded bg-[#1a1a1a] text-gray-500 hover:text-green-300 transition-colors">Publicar</button>}
                      </div>
                    </div>
                    {expandedId === p.id && editId !== p.id && (
                      <div className="px-5 pb-4 bg-[#0d0d0d] border-t border-[#1a1a1a] space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
                          {p.portadaUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.portadaUrl} alt="Portada" className="w-full max-w-[160px] aspect-square object-cover rounded-lg border border-[#2a2a2a]" />
                          )}
                          {p.copy && <div className="md:col-span-2 bg-[#111] rounded-lg p-3 border border-[#1e1e1e]"><p className="text-gray-600 mb-1 text-[10px] uppercase">Copy</p><p className="text-white whitespace-pre-wrap">{p.copy}</p></div>}
                          {p.materialLink && <div><p className="text-gray-600 mb-1 text-[10px] uppercase">Material</p><a href={p.materialLink} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] hover:underline break-all">{p.materialLink}</a></div>}
                          {p.colaboradores && <div><p className="text-gray-600 mb-1 text-[10px] uppercase">Colaboradores</p><p className="text-white">{p.colaboradores}</p></div>}
                          {p.comentarios && <div className="md:col-span-2"><p className="text-gray-600 mb-1 text-[10px] uppercase">Notas</p><p className="text-gray-400">{p.comentarios}</p></div>}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => openEdit(p)} className="text-xs text-[#B3985B] hover:text-white px-3 py-1.5 border border-[#B3985B]/40 rounded-lg transition-colors">Editar</button>
                          <button onClick={() => deletePub(p.id)} className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-900/30 rounded-lg transition-colors">Eliminar</button>
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
          <div className="px-5 py-3 border-b border-[#1a1a1a]"><h3 className="text-gray-500 font-medium text-sm">Sin tipo asignado</h3></div>
          <div className="divide-y divide-[#1a1a1a]">
            {[...sinTipo].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => {
              const d = parseDate(p.fecha);
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-[#141414] transition-colors" onClick={() => openEdit(p)}>
                  <div className="shrink-0 text-center w-12">
                    <p className="text-white text-lg font-bold leading-none">{d.getDate()}</p>
                    <p className="text-gray-600 text-[9px] uppercase">{DIAS_ES[d.getDay()]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
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
function VistaFeedIG({ feedPosts, openEdit }: { feedPosts: Publicacion[]; openEdit: (p: Publicacion) => void }) {
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
      <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden border border-[#1e1e1e]">
        {feedPosts.map(p => {
          const d = parseDate(p.fecha);
          return (
            <div key={p.id} className="relative aspect-square group cursor-pointer overflow-hidden bg-[#111]" onClick={() => openEdit(p)}>
              {p.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.portadaUrl} alt={p.tipo?.nombre ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#141414]">
                  <span className="text-[10px] text-gray-700 font-bold uppercase">{p.tipo?.nombre ?? "Post"}</span>
                  <span className="text-[9px] text-gray-800">{d.getDate()} {MESES[d.getMonth()].slice(0,3)}</span>
                </div>
              )}
              {(p.formato ?? p.tipo?.formato) === "REEL" && (
                <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-0.5">
                  <span className="text-[8px] text-purple-400 font-bold">▶ REEL</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                <p className="text-white text-[10px] font-semibold text-center">{p.tipo?.nombre ?? "Post"}</p>
                <p className="text-gray-400 text-[9px]">{d.getDate()} {MESES[d.getMonth()].slice(0,3)}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full mt-1 ${ESTADO_COLORS[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
              </div>
              <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                p.estado === "PUBLICADO" ? "bg-green-400" : p.estado === "LISTO" ? "bg-yellow-400" :
                p.estado === "EN_PROCESO" ? "bg-blue-400" : "bg-gray-600"}`} />
            </div>
          );
        })}
        {Array.from({ length: (3 - (feedPosts.length % 3)) % 3 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-[#0d0d0d]" />
        ))}
      </div>
    </div>
  );
}
