"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

interface TipoCampana {
  id: string; nombre: string; objetivo: string; objetivoMeta: string;
  formato: string; recurrencia: string; canal: string;
  duracionDias: number; presupuestoEstimado: number | null; color: string; activo: boolean;
  cta: string; copyReferencia: string | null; pixelEvento: string | null;
  publicoEdadMin: number; publicoEdadMax: number; publicoGenero: string; ubicaciones: string;
}
interface EjecucionCampana {
  id: string; tipoId: string | null; tipo: TipoCampana | null;
  nombre: string; objetivo: string | null; canal: string | null; color: string | null;
  fechaInicio: string; fechaFin: string;
  estado: string; presupuesto: number | null; notas: string | null; mes: string;
  idMetaAds: string | null;
  alcance: number | null; impresiones: number | null; clics: number | null;
  ctr: number | null; cantResultados: number | null; costoResultado: number | null;
}

const ESTADOS  = ["PLANIFICADA", "EN_EJECUCION", "COMPLETADA", "CANCELADA"];
const ESTADO_LABEL: Record<string, string> = {
  PLANIFICADA: "Planificada", EN_EJECUCION: "En ejecución", COMPLETADA: "Completada", CANCELADA: "Cancelada",
};
const ESTADO_COLOR: Record<string, string> = {
  PLANIFICADA:   "bg-gray-800 text-gray-400",
  EN_EJECUCION:  "bg-blue-900/40 text-blue-300",
  COMPLETADA:    "bg-green-900/40 text-green-300",
  CANCELADA:     "bg-red-900/40 text-red-400",
};
const OBJ_LABEL: Record<string, string> = {
  LEADS: "Leads", BRANDING: "Branding", VENTAS: "Ventas",
  REACTIVACION: "Reactivación", LANZAMIENTO: "Lanzamiento", EDUCACION: "Educación",
};
const CANAL_LABEL: Record<string, string> = {
  META: "Meta", EMAIL: "Email", WHATSAPP: "WhatsApp",
  GOOGLE: "Google", ORGANICO: "Orgánico", TODOS: "Todos",
};
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}
function parseFecha(f: string) { return new Date(f.slice(0, 10) + "T12:00:00"); }
function formatDate(f: string) {
  const d = parseFecha(f);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`;
}
function diffDias(ini: string, fin: string) {
  const a = parseFecha(ini), b = parseFecha(fin);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

type Vista = "timeline" | "calendario" | "tipo";

const FORM_EMPTY = {
  tipoId: "", nombre: "", objetivo: "INFORMATIVO", canal: "META",
  fechaInicio: "", fechaFin: "", estado: "PLANIFICADA",
  presupuesto: "", notas: "", idMetaAds: "",
  alcance: "", impresiones: "", clics: "", ctr: "", cantResultados: "", costoResultado: "",
};

export default function CalendarioCampanasPage() {
  const confirm = useConfirm();
  const [mes, setMes]               = useState(toMes(new Date()));
  const [ejecuciones, setEjecuciones] = useState<EjecucionCampana[]>([]);
  const [tipos, setTipos]           = useState<TipoCampana[]>([]);
  const [loading, setLoading]       = useState(true);
  const [vista, setVista]           = useState<Vista>("timeline");
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState(FORM_EMPTY);
  const [saving, setSaving]         = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [eRes, tRes] = await Promise.all([
      fetch(`/api/marketing/ejecuciones?mes=${mes}`),
      fetch("/api/marketing/tipos-campana"),
    ]);
    const [eData, tData] = await Promise.all([eRes.json(), tRes.json()]);
    setEjecuciones(eData.ejecuciones ?? []);
    setTipos(tData.tipos ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [mes]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a tipo is selected in the form, prefill data
  function onTipoChange(tipoId: string) {
    const t = tipos.find(t => t.id === tipoId);
    if (!t) { setForm(f => ({ ...f, tipoId })); return; }
    const ini = form.fechaInicio || `${mes}-01`;
    const iniDate = parseFecha(ini);
    const finDate = new Date(iniDate);
    finDate.setDate(finDate.getDate() + t.duracionDias - 1);
    const fin = finDate.toISOString().slice(0, 10);
    setForm(f => ({
      ...f, tipoId,
      nombre: f.nombre || t.nombre,
      objetivo: t.objetivo,
      canal: t.canal,
      presupuesto: f.presupuesto || (t.presupuestoEstimado?.toString() ?? ""),
      fechaFin: fin,
      // No sobreescribir resultados ni idMetaAds
    }));
  }

  function startNew() {
    setForm({ ...FORM_EMPTY, fechaInicio: `${mes}-01` });
    setEditId(null); setShowForm(true);
  }

  function startEdit(e: EjecucionCampana) {
    setForm({
      tipoId: e.tipoId ?? "",
      nombre: e.nombre,
      objetivo: e.objetivo ?? "INFORMATIVO",
      canal: e.canal ?? "META",
      fechaInicio: e.fechaInicio.slice(0, 10),
      fechaFin: e.fechaFin.slice(0, 10),
      estado: e.estado,
      presupuesto: e.presupuesto?.toString() ?? "",
      notas: e.notas ?? "",
      idMetaAds: e.idMetaAds ?? "",
      alcance: e.alcance?.toString() ?? "",
      impresiones: e.impresiones?.toString() ?? "",
      clics: e.clics?.toString() ?? "",
      ctr: e.ctr?.toString() ?? "",
      cantResultados: e.cantResultados?.toString() ?? "",
      costoResultado: e.costoResultado?.toString() ?? "",
    });
    setEditId(e.id); setShowForm(true); setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() { setForm(FORM_EMPTY); setEditId(null); setShowForm(false); }

  async function save() {
    if (!form.nombre.trim() || !form.fechaInicio || !form.fechaFin) return;
    setSaving(true);
    const tipoSeleccionado = tipos.find(t => t.id === form.tipoId);
    const payload = {
      tipoId: form.tipoId || null,
      nombre: form.nombre.trim(),
      objetivo: form.objetivo || null,
      canal: form.canal || null,
      color: tipoSeleccionado?.color ?? null,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      estado: form.estado,
      presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
      notas: form.notas || null,
      mes,
      idMetaAds: form.idMetaAds || null,
      alcance: form.alcance ? parseInt(form.alcance) : null,
      impresiones: form.impresiones ? parseInt(form.impresiones) : null,
      clics: form.clics ? parseInt(form.clics) : null,
      ctr: form.ctr ? parseFloat(form.ctr) : null,
      cantResultados: form.cantResultados ? parseInt(form.cantResultados) : null,
      costoResultado: form.costoResultado ? parseFloat(form.costoResultado) : null,
    };
    const url    = editId ? `/api/marketing/ejecuciones/${editId}` : "/api/marketing/ejecuciones";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    cancelForm(); await load(); setSaving(false);
  }

  async function patchEstado(id: string, estado: string) {
    await fetch(`/api/marketing/ejecuciones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
    });
    setEjecuciones(prev => prev.map(e => e.id === id ? { ...e, estado } : e));
  }

  async function del(e: EjecucionCampana) {
    if (!await confirm({ message: `¿Eliminar "${e.nombre}"?`, danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/marketing/ejecuciones/${e.id}`, { method: "DELETE" });
    setEjecuciones(prev => prev.filter(x => x.id !== e.id));
  }

  function colorOf(e: EjecucionCampana) {
    return e.color ?? e.tipo?.color ?? "#B3985B";
  }

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const [year, month] = mes.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow    = new Date(year, month - 1, 1).getDay(); // 0=Sun

  function ejecucionesEnDia(day: number): EjecucionCampana[] {
    return ejecuciones.filter(e => {
      const ini = parseFecha(e.fechaInicio).getDate();
      const fin = parseFecha(e.fechaFin).getDate();
      // Only within same month for simplicity
      const iniMes = e.fechaInicio.slice(0, 7);
      const finMes = e.fechaFin.slice(0, 7);
      const inRange = (iniMes <= mes && finMes >= mes);
      if (!inRange) return false;
      const effectiveIni = iniMes === mes ? ini : 1;
      const effectiveFin = finMes === mes ? fin : daysInMonth;
      return day >= effectiveIni && day <= effectiveFin;
    });
  }

  // ── Grouped by tipo ──────────────────────────────────────────────────────────
  const porTipo: Record<string, EjecucionCampana[]> = {};
  const sinTipo: EjecucionCampana[] = [];
  for (const e of ejecuciones) {
    if (e.tipoId && e.tipo) { (porTipo[e.tipoId] = porTipo[e.tipoId] || []).push(e); }
    else sinTipo.push(e);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const presupuestoTotal = ejecuciones.reduce((s, e) => s + (e.presupuesto ?? 0), 0);

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Publicidad</p>
          <h1 className="text-xl font-semibold text-white">Calendario de campañas</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketing/campanas" className="text-xs text-white/35 hover:text-white/70 transition-colors px-2 py-1">
            Tipos de campaña →
          </Link>
          <button onClick={startNew}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 transition-opacity">
            + Programar campaña
          </button>
        </div>
      </div>

      {/* Mes selector + vistas */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const d = new Date(year, month - 2, 1);
            setMes(toMes(d));
          }} className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-white/50 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-white font-medium text-sm w-36 text-center">{mesLabel(mes)}</span>
          <button onClick={() => {
            const d = new Date(year, month, 1);
            setMes(toMes(d));
          }} className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-white/50 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Vista selector */}
        <div className="flex items-center gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {(["timeline","calendario","tipo"] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`text-xs px-3 py-1 rounded-md transition-colors capitalize ${vista === v ? "bg-[#B3985B] text-black font-semibold" : "text-white/40 hover:text-white"}`}>
              {v === "timeline" ? "Timeline" : v === "calendario" ? "Calendario" : "Por tipo"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && ejecuciones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Campañas", value: ejecuciones.length },
            { label: "En ejecución", value: ejecuciones.filter(e => e.estado === "EN_EJECUCION").length },
            { label: "Completadas", value: ejecuciones.filter(e => e.estado === "COMPLETADA").length },
            { label: "Presupuesto", value: presupuestoTotal > 0 ? `$${presupuestoTotal.toLocaleString("es-MX")}` : "—" },
          ].map(s => (
            <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
              <p className="text-white/30 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-lg mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">{editId ? "Editar campaña" : "Programar campaña"}</h2>

          {/* Tipo selector */}
          {!editId && (
            <div>
              <label className="block text-xs text-white/40 mb-1">Tipo de campaña</label>
              <Combobox
                value={form.tipoId}
                onChange={v => onTipoChange(v)}
                options={[{ value: "", label: "— Personalizada (sin tipo) —" }, ...tipos.filter(t => t.activo !== false).map(t => ({ value: t.id, label: t.nombre }))]}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
              />
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Nombre de la campaña *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
              placeholder="Ej: Campaña verano 2026" />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Fecha inicio *</label>
              <input type="date" value={form.fechaInicio}
                onChange={e => {
                  const ini = e.target.value;
                  setForm(f => {
                    const tipo = tipos.find(t => t.id === f.tipoId);
                    if (tipo && ini) {
                      const iniDate = new Date(ini + "T12:00:00");
                      const finDate = new Date(iniDate);
                      finDate.setDate(finDate.getDate() + tipo.duracionDias - 1);
                      return { ...f, fechaInicio: ini, fechaFin: finDate.toISOString().slice(0, 10) };
                    }
                    return { ...f, fechaInicio: ini };
                  });
                }}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Fecha fin *</label>
              <input type="date" value={form.fechaFin} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          {form.fechaInicio && form.fechaFin && (
            <p className="text-white/30 text-xs -mt-2">
              Duración: {diffDias(form.fechaInicio, form.fechaFin)} días
            </p>
          )}

          {/* Estado + Presupuesto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Estado</label>
              <Combobox
                value={form.estado}
                onChange={v => setForm(f => ({ ...f, estado: v }))}
                options={ESTADOS.map(s => ({ value: s, label: ESTADO_LABEL[s] }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Presupuesto (MXN)</label>
              <input type="number" min={0} value={form.presupuesto}
                onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                placeholder="Opcional" />
            </div>
          </div>

          {/* ID Meta Ads + Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">ID campaña en Meta Ads</label>
              <input value={form.idMetaAds} onChange={e => setForm(f => ({ ...f, idMetaAds: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                placeholder="Opcional, para tracking" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Notas</label>
              <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                placeholder="Creatividades, segmentación…" />
            </div>
          </div>

          {/* Resultados (solo si edición de campaña activa o completada) */}
          {editId && (form.estado === "EN_EJECUCION" || form.estado === "COMPLETADA") && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-white/40 uppercase tracking-wider">Resultados Meta Ads</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/30 mb-1">Alcance</label>
                  <input type="number" min={0} value={form.alcance}
                    onChange={e => setForm(f => ({ ...f, alcance: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-white/30 mb-1">Impresiones</label>
                  <input type="number" min={0} value={form.impresiones}
                    onChange={e => setForm(f => ({ ...f, impresiones: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-white/30 mb-1">Clics</label>
                  <input type="number" min={0} value={form.clics}
                    onChange={e => setForm(f => ({ ...f, clics: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-white/30 mb-1">CTR (%)</label>
                  <input type="number" min={0} step={0.01} value={form.ctr}
                    onChange={e => setForm(f => ({ ...f, ctr: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs text-white/30 mb-1">Resultados / leads</label>
                  <input type="number" min={0} value={form.cantResultados}
                    onChange={e => setForm(f => ({ ...f, cantResultados: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-white/30 mb-1">Costo por resultado ($)</label>
                  <input type="number" min={0} step={0.01} value={form.costoResultado}
                    onChange={e => setForm(f => ({ ...f, costoResultado: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                    placeholder="0.00" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={cancelForm} className="text-xs px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !form.nombre.trim() || !form.fechaInicio || !form.fechaFin}
              className="text-xs font-semibold px-5 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-50 transition-opacity">
              {saving ? "Guardando…" : editId ? "Guardar cambios" : "Programar"}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-white/30 text-sm text-center py-16">Cargando…</div>}

      {!loading && ejecuciones.length === 0 && !showForm && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center space-y-3">
          <div className="text-3xl opacity-20">📅</div>
          <p className="text-white/40 text-sm">Sin campañas en {mesLabel(mes)}</p>
          <button onClick={startNew}
            className="text-xs px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold hover:opacity-85 transition-opacity">
            + Programar primera campaña
          </button>
          {tipos.length === 0 && (
            <p className="text-white/25 text-xs">
              Primero crea <Link href="/marketing/campanas" className="text-[#B3985B] hover:underline">tipos de campaña</Link> para poder programarlas.
            </p>
          )}
        </div>
      )}

      {/* ── Vista Timeline ────────────────────────────────────────────────────── */}
      {!loading && vista === "timeline" && ejecuciones.length > 0 && (
        <div className="space-y-3">
          {ejecuciones.map(e => {
            const color  = colorOf(e);
            const dias   = diffDias(e.fechaInicio, e.fechaFin);
            const expanded = expandedId === e.id;
            // Progress within month
            const today = new Date();
            const ini   = parseFecha(e.fechaInicio);
            const fin   = parseFecha(e.fechaFin);
            const total = fin.getTime() - ini.getTime();
            const elapsed = Math.max(0, Math.min(total, today.getTime() - ini.getTime()));
            const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
            const isActive = e.estado === "EN_EJECUCION";

            return (
              <div key={e.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden transition-all duration-200">
                {/* Color bar top */}
                <div style={{ height: 3, background: color }} />

                <div className="p-4">
                  {/* Row 1: nombre + estado + acciones */}
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setExpandedId(expanded ? null : e.id)}
                          className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors text-left">
                          {e.nombre}
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[e.estado]}`}>
                          {ESTADO_LABEL[e.estado]}
                        </span>
                        {e.tipo && (
                          <span className="text-xs text-white/25 border border-white/[0.07] rounded-full px-2 py-0.5">
                            {e.tipo.nombre}
                          </span>
                        )}
                      </div>

                      {/* Row 2: fechas + duración + canal */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/35 flex-wrap">
                        <span>{formatDate(e.fechaInicio)} → {formatDate(e.fechaFin)}</span>
                        <span>{dias} día{dias !== 1 ? "s" : ""}</span>
                        {e.canal && <span>{CANAL_LABEL[e.canal] ?? e.canal}</span>}
                        {e.presupuesto && <span>${e.presupuesto.toLocaleString("es-MX")} MXN</span>}
                      </div>

                      {/* Timeline bar */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: `${e.estado === "COMPLETADA" ? 100 : e.estado === "PLANIFICADA" ? 0 : pct}%`, background: color }} />
                        </div>
                        <span className="text-white/20 text-xs shrink-0">
                          {e.estado === "COMPLETADA" ? "100%" : e.estado === "PLANIFICADA" ? "—" : `${pct}%`}
                        </span>
                      </div>

                      {/* Day spans visual */}
                      {(() => {
                        const totalDias = daysInMonth;
                        const iniDay = Math.max(1, parseFecha(e.fechaInicio).getDate());
                        const finDay = Math.min(totalDias, parseFecha(e.fechaFin).getDate());
                        const left   = ((iniDay - 1) / totalDias) * 100;
                        const width  = ((finDay - iniDay + 1) / totalDias) * 100;
                        return (
                          <div className="mt-1.5 relative h-1 rounded-full bg-white/[0.04]">
                            <div className="absolute top-0 h-full rounded-full opacity-40"
                                 style={{ left: `${left}%`, width: `${width}%`, background: color }} />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Quick estado buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {ESTADOS.filter(s => s !== e.estado).slice(0, 2).map(s => (
                        <button key={s} onClick={() => patchEstado(e.id, s)}
                          className="text-xs text-white/25 hover:text-white/70 px-2 py-1 rounded transition-colors whitespace-nowrap hidden sm:block">
                          → {ESTADO_LABEL[s].split(" ")[0]}
                        </button>
                      ))}
                      <button onClick={() => setExpandedId(expanded ? null : e.id)}
                        className="text-white/25 hover:text-white p-1 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points={expanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-3">
                      {e.tipo && (
                        <div className="flex gap-3 text-xs text-white/30 flex-wrap">
                          {e.tipo.copyReferencia && (
                            <p className="italic text-white/40 text-xs leading-relaxed">"{e.tipo.copyReferencia}"</p>
                          )}
                        </div>
                      )}
                      {e.notas && <p className="text-white/45 text-xs leading-relaxed">{e.notas}</p>}

                      {/* Resultados */}
                      {(e.alcance || e.impresiones || e.clics || e.cantResultados) && (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          {[
                            { label:"Alcance", value: e.alcance?.toLocaleString("es-MX") },
                            { label:"Impresiones", value: e.impresiones?.toLocaleString("es-MX") },
                            { label:"Clics", value: e.clics?.toLocaleString("es-MX") },
                            { label:"CTR", value: e.ctr ? `${e.ctr}%` : null },
                            { label:"Resultados", value: e.cantResultados?.toLocaleString("es-MX") },
                            { label:"Costo/resultado", value: e.costoResultado ? `$${e.costoResultado.toLocaleString("es-MX")}` : null },
                          ].filter(s => s.value).map(s => (
                            <div key={s.label}>
                              <p className="text-white/25 text-[10px]">{s.label}</p>
                              <p className="text-white/70 text-xs font-medium">{s.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {e.idMetaAds && (
                        <p className="text-white/25 text-xs">ID Meta Ads: <span className="text-white/40 font-mono">{e.idMetaAds}</span></p>
                      )}

                      {/* Estado selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/30 text-xs">Estado:</span>
                        {ESTADOS.map(s => (
                          <button key={s} onClick={() => patchEstado(e.id, s)}
                            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${e.estado === s ? ESTADO_COLOR[s] : "text-white/25 border border-white/[0.07] hover:text-white hover:border-white/20"}`}>
                            {ESTADO_LABEL[s]}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => startEdit(e)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors">
                          Editar / Resultados
                        </button>
                        <button onClick={() => del(e)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-900/30 text-red-500/50 hover:text-red-400 hover:border-red-800/50 transition-colors">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vista Calendario ──────────────────────────────────────────────────── */}
      {!loading && vista === "calendario" && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <div className="min-w-[420px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.05]">
            {DIAS_ES.map(d => (
              <div key={d} className="py-2.5 text-center text-xs text-white/25 font-medium">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-white/[0.04] min-h-[80px] bg-[#0d0d0d]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;
              const camps = ejecucionesEnDia(day);
              return (
                <div key={day}
                     className={`border-b border-r border-white/[0.04] min-h-[80px] p-1.5 ${isToday ? "bg-[#B3985B]/[0.04]" : ""}`}>
                  <p className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-[#B3985B] text-black font-bold" : "text-white/30"}`}>
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {camps.slice(0, 3).map(c => (
                      <div key={c.id} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                           className="text-xs px-1.5 py-0.5 rounded cursor-pointer truncate"
                           style={{ background: `${colorOf(c)}22`, color: colorOf(c), fontSize: "10px" }}>
                        {c.nombre}
                      </div>
                    ))}
                    {camps.length > 3 && (
                      <p className="text-white/25 text-[10px] px-1">+{camps.length - 3} más</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* ── Vista Por tipo ────────────────────────────────────────────────────── */}
      {!loading && vista === "tipo" && ejecuciones.length > 0 && (
        <div className="space-y-4">
          {Object.entries(porTipo).map(([tipoId, execs]) => {
            const tipo = tipos.find(t => t.id === tipoId);
            return (
              <div key={tipoId} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
                  <div className="w-3 h-3 rounded-full" style={{ background: tipo?.color ?? "#B3985B" }} />
                  <p className="text-white text-sm font-medium">{tipo?.nombre ?? "Sin tipo"}</p>
                  <span className="text-white/25 text-xs ml-auto">{execs.length} ejecución{execs.length !== 1 ? "es" : ""}</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {execs.map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{e.nombre}</p>
                        <p className="text-white/30 text-xs">{formatDate(e.fechaInicio)} → {formatDate(e.fechaFin)} · {diffDias(e.fechaInicio, e.fechaFin)} días</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR[e.estado]}`}>
                        {ESTADO_LABEL[e.estado]}
                      </span>
                      <div className="flex gap-1">
                        {ESTADOS.filter(s => s !== e.estado).slice(0, 1).map(s => (
                          <button key={s} onClick={() => patchEstado(e.id, s)}
                            className="text-xs text-white/25 hover:text-white px-2 py-0.5 rounded transition-colors">
                            → {ESTADO_LABEL[s].split(" ")[0]}
                          </button>
                        ))}
                        <button onClick={() => startEdit(e)} className="text-xs text-white/25 hover:text-white px-2 py-0.5 rounded transition-colors">Editar</button>
                        <button onClick={() => del(e)} className="text-xs text-white/25 hover:text-red-400 px-2 py-0.5 rounded transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {sinTipo.length > 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <p className="text-white text-sm font-medium">Sin tipo asignado</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {sinTipo.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-white text-xs">{e.nombre}</p>
                      <p className="text-white/30 text-xs">{formatDate(e.fechaInicio)} → {formatDate(e.fechaFin)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span>
                    <button onClick={() => del(e)} className="text-xs text-white/25 hover:text-red-400 px-2 py-0.5 rounded transition-colors">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
