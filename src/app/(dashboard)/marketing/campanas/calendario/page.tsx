"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { BriefEditor } from "@/components/BriefEditor";
import { CampanaBrief, defaultBrief, parseBrief, isBriefCompleto } from "@/lib/campana-brief";
import { Megaphone, Target, Rocket, ChevronRight, ChevronLeft } from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface TipoCampana {
  id: string; nombre: string; objetivo: string; objetivoMeta: string;
  formato: string; recurrencia: string; canal: string;
  duracionDias: number; presupuestoEstimado: number | null; color: string; activo: boolean;
  cta: string; copyReferencia: string | null; pixelEvento: string | null;
  publicoEdadMin: number; publicoEdadMax: number; publicoGenero: string; ubicaciones: string;
  briefTemplate: string | null;
}
interface Anuncio {
  id: string; nombre: string; formato: string; titular: string | null;
  copy: string | null; cta: string | null; urlDestino: string | null; estado: string;
}
interface Resultado {
  id: string; fecha: string; impresiones: number; alcance: number; clics: number;
  leads: number; gastado: number; cpm: number | null; cpc: number | null; cpl: number | null;
  frecuencia: number | null; notas: string | null;
}
interface Ejecucion {
  id: string; tipoId: string | null; tipo: TipoCampana | null;
  nombre: string; objetivo: string | null; canal: string | null; color: string | null;
  fechaInicio: string; fechaFin: string; estado: string;
  presupuesto: number | null; notas: string | null; mes: string;
  audiencia: string | null; ubicaciones: string | null;
  idMetaAds: string | null; brief: string | null; briefCompleto: boolean;
  anuncios: Anuncio[]; resultados: Resultado[];
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const ESTADOS = ["PLANIFICADA", "EN_EJECUCION", "COMPLETADA", "CANCELADA"];
const ESTADO_LABEL: Record<string, string> = {
  PLANIFICADA: "Planificada", EN_EJECUCION: "En ejecución", COMPLETADA: "Completada", CANCELADA: "Cancelada",
};
const ESTADO_COLOR: Record<string, string> = {
  PLANIFICADA: "bg-gray-800 text-gray-400",
  EN_EJECUCION: "bg-blue-900/40 text-blue-300",
  COMPLETADA: "bg-green-900/40 text-green-300",
  CANCELADA: "bg-red-900/40 text-red-400",
};
const CANAL_LABEL: Record<string, string> = {
  META: "Meta", EMAIL: "Email", WHATSAPP: "WhatsApp", GOOGLE: "Google", ORGANICO: "Orgánico", TODOS: "Todos",
};
const FORMATO_OPTIONS = ["IMAGEN", "VIDEO", "CARRUSEL", "REEL", "HISTORIA", "COLECCION"];
const FORMATO_LABEL: Record<string, string> = {
  IMAGEN: "Imagen", VIDEO: "Video", CARRUSEL: "Carrusel", REEL: "Reel", HISTORIA: "Historia", COLECCION: "Colección",
};
const CTA_OPTIONS = ["MAS_INFORMACION", "CONTACTAR", "ENVIAR_MENSAJE", "COTIZAR", "REGISTRARSE", "VER_MAS", "COMPRAR", "DESCARGAR"];
const CTA_LABEL: Record<string, string> = {
  MAS_INFORMACION: "Más información", CONTACTAR: "Contactar", ENVIAR_MENSAJE: "Enviar mensaje",
  COTIZAR: "Cotizar", REGISTRARSE: "Registrarse", VER_MAS: "Ver más", COMPRAR: "Comprar", DESCARGAR: "Descargar",
};
const UBICACION_OPTIONS = ["FEED_IG", "FEED_FB", "STORIES_IG", "STORIES_FB", "REELS_IG", "REELS_FB", "EXPLORE_IG"];
const UBICACION_LABEL: Record<string, string> = {
  FEED_IG: "Feed IG", FEED_FB: "Feed FB", STORIES_IG: "Stories IG", STORIES_FB: "Stories FB",
  REELS_IG: "Reels IG", REELS_FB: "Reels FB", EXPLORE_IG: "Explorar IG",
};
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// ─── Helpers ────────────────────────────────────────────────────────────────
function toMes(d: Date) { return d.toISOString().slice(0, 7); }
function mesLabel(mes: string) { const [y, m] = mes.split("-"); return `${MESES[parseInt(m) - 1]} ${y}`; }
function parseFecha(f: string) { return new Date(f.slice(0, 10) + "T12:00:00"); }
function formatDate(f: string) { const d = parseFecha(f); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; }
function diffDias(ini: string, fin: string) {
  return Math.round((parseFecha(fin).getTime() - parseFecha(ini).getTime()) / 86400000) + 1;
}
function money(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function num(n: number) { return new Intl.NumberFormat("es-MX").format(n); }

// Métricas acumuladas de una campaña a partir de sus resultados por periodo.
function agg(rs: Resultado[]) {
  const gastado = rs.reduce((a, b) => a + b.gastado, 0);
  const leads = rs.reduce((a, b) => a + b.leads, 0);
  const clics = rs.reduce((a, b) => a + b.clics, 0);
  const alcance = rs.reduce((a, b) => a + b.alcance, 0);
  const impresiones = rs.reduce((a, b) => a + b.impresiones, 0);
  return {
    gastado, leads, clics, alcance, impresiones,
    cpl: leads > 0 ? gastado / leads : null,
    cpc: clics > 0 ? gastado / clics : null,
    cpm: impresiones > 0 ? (gastado / impresiones) * 1000 : null,
  };
}

const INPUT = "w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]";
const INPUT_SM = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]";

type Vista = "lista" | "calendario";

const WIZARD_EMPTY = {
  tipoId: "", nombre: "", objetivo: "INFORMATIVO", canal: "META",
  fechaInicio: "", fechaFin: "", presupuesto: "", audiencia: "", ubicaciones: "",
  anuncioNombre: "", anuncioFormato: "IMAGEN", anuncioCopy: "", anuncioCta: "MAS_INFORMACION", anuncioUrl: "",
};

export default function CampanasDashboard() {
  const confirm = useConfirm();
  const toast = useToast();
  const [mes, setMes] = useState(toMes(new Date()));
  const [ejecuciones, setEjecuciones] = useState<Ejecucion[]>([]);
  const [tipos, setTipos] = useState<TipoCampana[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("lista");

  // Wizard de alta
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [wf, setWf] = useState(WIZARD_EMPTY);
  const [launching, setLaunching] = useState(false);

  // Detalle
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = ejecuciones.find(e => e.id === detailId) ?? null;

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

  // ── Wizard ──────────────────────────────────────────────────────────────
  function openWizard() {
    setWf({ ...WIZARD_EMPTY, fechaInicio: `${mes}-01` });
    setStep(1); setShowWizard(true);
  }
  function pickTipo(tipoId: string) {
    const t = tipos.find(x => x.id === tipoId);
    if (!t) { setWf(f => ({ ...f, tipoId: "" })); return; }
    const ini = wf.fechaInicio || `${mes}-01`;
    const finDate = new Date(parseFecha(ini));
    finDate.setDate(finDate.getDate() + t.duracionDias - 1);
    setWf(f => ({
      ...f, tipoId,
      nombre: f.nombre || t.nombre,
      objetivo: t.objetivo,
      canal: t.canal,
      presupuesto: f.presupuesto || (t.presupuestoEstimado?.toString() ?? ""),
      fechaFin: finDate.toISOString().slice(0, 10),
      audiencia: f.audiencia || `${t.publicoEdadMin}–${t.publicoEdadMax} años · ${t.publicoGenero === "TODOS" ? "Todos" : t.publicoGenero.toLowerCase()}`,
      ubicaciones: f.ubicaciones || t.ubicaciones,
      anuncioNombre: f.anuncioNombre || `${t.nombre} — Anuncio 1`,
      anuncioFormato: t.formato || "IMAGEN",
      anuncioCopy: f.anuncioCopy || t.copyReferencia || "",
      anuncioCta: t.cta || "MAS_INFORMACION",
    }));
  }
  function setIni(ini: string) {
    setWf(f => {
      const t = tipos.find(x => x.id === f.tipoId);
      if (t && ini) {
        const fin = new Date(ini + "T12:00:00");
        fin.setDate(fin.getDate() + t.duracionDias - 1);
        return { ...f, fechaInicio: ini, fechaFin: fin.toISOString().slice(0, 10) };
      }
      return { ...f, fechaInicio: ini };
    });
  }
  const canNext = step === 1 ? true : step === 2 ? (!!wf.nombre.trim() && !!wf.fechaInicio && !!wf.fechaFin) : true;

  async function launch() {
    if (!wf.nombre.trim() || !wf.fechaInicio || !wf.fechaFin) { toast.error("Falta nombre o fechas."); return; }
    setLaunching(true);
    const tipoSel = tipos.find(t => t.id === wf.tipoId);
    const res = await fetch("/api/marketing/ejecuciones", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipoId: wf.tipoId || null,
        nombre: wf.nombre.trim(),
        objetivo: wf.objetivo || null,
        canal: wf.canal || null,
        color: tipoSel?.color ?? null,
        fechaInicio: wf.fechaInicio, fechaFin: wf.fechaFin,
        estado: "PLANIFICADA",
        presupuesto: wf.presupuesto || null,
        audiencia: wf.audiencia || null,
        ubicaciones: wf.ubicaciones || null,
        mes,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al crear la campaña"); setLaunching(false); return;
    }
    const { ejecucion } = await res.json();
    // Crear el primer anuncio si el usuario capturó creativo.
    if (ejecucion?.id && (wf.anuncioNombre.trim() || wf.anuncioCopy.trim())) {
      await fetch(`/api/marketing/ejecuciones/${ejecucion.id}/anuncios`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: wf.anuncioNombre.trim() || `${wf.nombre.trim()} — Anuncio 1`,
          formato: wf.anuncioFormato, copy: wf.anuncioCopy, cta: wf.anuncioCta, urlDestino: wf.anuncioUrl,
        }),
      }).catch(() => {});
    }
    setShowWizard(false); setLaunching(false);
    await load();
    toast.success("Campaña creada. Captura resultados y ajusta el brief cuando la lances.");
    setDetailId(ejecucion?.id ?? null);
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  async function patchEstado(id: string, estado: string) {
    const res = await fetch(`/api/marketing/ejecuciones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    const { ejecucion } = await res.json();
    setEjecuciones(prev => prev.map(e => e.id === id ? { ...e, ...ejecucion } : e));
  }
  async function del(e: Ejecucion) {
    if (!await confirm({ message: `¿Eliminar "${e.nombre}" y sus resultados?`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/marketing/ejecuciones/${e.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setEjecuciones(prev => prev.filter(x => x.id !== e.id));
    setDetailId(null);
  }
  function refreshOne(updated: Ejecucion) {
    setEjecuciones(prev => prev.map(e => e.id === updated.id ? updated : e));
  }
  function colorOf(e: Ejecucion) { return e.color ?? e.tipo?.color ?? "#B3985B"; }

  // ── Stats globales del mes ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = ejecuciones.flatMap(e => e.resultados);
    const m = agg(all);
    return {
      total: ejecuciones.length,
      activas: ejecuciones.filter(e => e.estado === "EN_EJECUCION").length,
      invertido: m.gastado,
      leads: m.leads,
      cpl: m.cpl,
      presupuesto: ejecuciones.reduce((s, e) => s + (e.presupuesto ?? 0), 0),
    };
  }, [ejecuciones]);

  // ── Calendario ──────────────────────────────────────────────────────────────
  const [year, month] = mes.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  function ejecucionesEnDia(day: number): Ejecucion[] {
    return ejecuciones.filter(e => {
      const iniMes = e.fechaInicio.slice(0, 7), finMes = e.fechaFin.slice(0, 7);
      if (!(iniMes <= mes && finMes >= mes)) return false;
      const ini = iniMes === mes ? parseFecha(e.fechaInicio).getDate() : 1;
      const fin = finMes === mes ? parseFecha(e.fechaFin).getDate() : daysInMonth;
      return day >= ini && day <= fin;
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Publicidad</p>
          <h1 className="ms-h1">Campañas</h1>
          <p className="text-white/35 text-xs mt-1">Lanza, opera y mide tus campañas en un solo lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketing/publicidad?vista=plantillas" className="text-xs text-white/35 hover:text-white/70 transition-colors px-2 py-1">
            Plantillas →
          </Link>
          <button onClick={openWizard}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#B3985B] text-black hover:bg-[#c9a96a] transition-colors flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5" /> Lanzar campaña
          </button>
        </div>
      </div>

      {/* Mes + vista */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setMes(toMes(new Date(year, month - 2, 1)))}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-white font-medium text-sm w-36 text-center">{mesLabel(mes)}</span>
          <button onClick={() => setMes(toMes(new Date(year, month, 1)))}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-white/50 hover:text-white transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 ms-card rounded-lg p-1">
          {(["lista", "calendario"] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`text-xs px-3 py-1 rounded-md transition-colors capitalize ${vista === v ? "bg-[#B3985B] text-black font-semibold" : "text-white/40 hover:text-white"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {!loading && ejecuciones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Campañas", value: stats.total },
            { label: "En ejecución", value: stats.activas },
            { label: "Invertido", value: stats.invertido > 0 ? money(stats.invertido) : "—" },
            { label: "Leads", value: stats.leads > 0 ? num(stats.leads) : "—" },
            { label: "CPL", value: stats.cpl != null ? money(stats.cpl) : "—" },
          ].map(s => (
            <div key={s.label} className="ms-card px-4 py-3">
              <p className="text-white/30 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-lg mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="text-white/30 text-sm text-center py-16">Cargando…</div>}

      {/* Empty */}
      {!loading && ejecuciones.length === 0 && (
        <div className="ms-empty-state space-y-3">
          <div className="flex justify-center opacity-20"><Megaphone strokeWidth={1.75} className="w-8 h-8" /></div>
          <p className="text-white/40 text-sm">Sin campañas en {mesLabel(mes)}</p>
          <button onClick={openWizard}
            className="text-xs px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold hover:bg-[#c9a96a] transition-colors">
            Lanzar primera campaña
          </button>
          {tipos.length === 0 && (
            <p className="text-white/25 text-xs">
              Tip: crea <Link href="/marketing/publicidad?vista=plantillas" className="text-[#B3985B] hover:underline">plantillas</Link> para prellenar todo con un clic.
            </p>
          )}
        </div>
      )}

      {/* Lista */}
      {!loading && vista === "lista" && ejecuciones.length > 0 && (
        <div className="space-y-3">
          {ejecuciones.map(e => {
            const color = colorOf(e);
            const m = agg(e.resultados);
            const dias = diffDias(e.fechaInicio, e.fechaFin);
            return (
              <button key={e.id} onClick={() => setDetailId(e.id)}
                className="w-full text-left ms-table-wrapper hover:border-white/20 transition-colors overflow-hidden">
                <div style={{ height: 3, background: color }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{e.nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span>
                        {e.tipo && <span className="text-xs text-white/25 border border-white/[0.07] rounded-full px-2 py-0.5">{e.tipo.nombre}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/35 flex-wrap">
                        <span>{formatDate(e.fechaInicio)} → {formatDate(e.fechaFin)}</span>
                        <span>{dias} día{dias !== 1 ? "s" : ""}</span>
                        {e.canal && <span>{CANAL_LABEL[e.canal] ?? e.canal}</span>}
                        {e.presupuesto ? <span>{money(e.presupuesto)}</span> : null}
                        <span className="text-white/25">{e.anuncios.length} anuncio{e.anuncios.length !== 1 ? "s" : ""}</span>
                      </div>
                      {e.resultados.length > 0 && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-white/50">Invertido <b className="text-white/80">{money(m.gastado)}</b></span>
                          <span className="text-white/50">Leads <b className="text-white/80">{m.leads}</b></span>
                          {m.cpl != null && <span className="text-white/50">CPL <b className="text-[#B3985B]">{money(m.cpl)}</b></span>}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/25 shrink-0 mt-1" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Calendario */}
      {!loading && vista === "calendario" && (
        <div className="ms-card overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-7 border-b border-white/[0.05]">
              {DIAS_ES.map(d => <div key={d} className="py-2.5 text-center text-xs text-white/25 font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e-${i}`} className="border-b border-r border-white/[0.04] min-h-[80px] bg-[#0d0d0d]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;
                const camps = ejecucionesEnDia(day);
                return (
                  <div key={day} className={`border-b border-r border-white/[0.04] min-h-[80px] p-1.5 ${isToday ? "bg-[#B3985B]/[0.04]" : ""}`}>
                    <p className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-[#B3985B] text-black font-bold" : "text-white/30"}`}>{day}</p>
                    <div className="space-y-0.5">
                      {camps.slice(0, 3).map(c => (
                        <div key={c.id} onClick={() => setDetailId(c.id)}
                          className="text-xs px-1.5 py-0.5 rounded cursor-pointer truncate"
                          style={{ background: `${colorOf(c)}22`, color: colorOf(c), fontSize: "10px" }}>
                          {c.nombre}
                        </div>
                      ))}
                      {camps.length > 3 && <p className="text-white/25 text-[10px] px-1">+{camps.length - 3} más</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Wizard de alta ─────────────────────────────────────────────────── */}
      <Modal open={showWizard} onClose={() => setShowWizard(false)} title="Lanzar campaña">
        <div className="space-y-5">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold shrink-0 ${step >= n ? "bg-[#B3985B] text-black" : "bg-white/10 text-white/40"}`}>{n}</div>
                <span className={`text-xs ${step >= n ? "text-white" : "text-white/30"}`}>
                  {n === 1 ? "Base" : n === 2 ? "Esenciales" : "Creativo"}
                </span>
                {n < 3 && <div className={`flex-1 h-px ${step > n ? "bg-[#B3985B]" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>

          {/* Paso 1: Base (plantilla) */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-white/40">Elige una plantilla para prellenar objetivo, audiencia, ubicaciones y creativo. Puedes empezar desde cero.</p>
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                <button onClick={() => pickTipo("")}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${wf.tipoId === "" ? "border-[#B3985B] bg-[#B3985B]/5" : "border-white/10 hover:border-white/20"}`}>
                  <p className="text-white text-sm font-medium">Desde cero</p>
                  <p className="text-white/35 text-xs">Configura todo manualmente</p>
                </button>
                {tipos.filter(t => t.activo !== false).map(t => (
                  <button key={t.id} onClick={() => pickTipo(t.id)}
                    className={`text-left px-4 py-3 rounded-lg border transition-colors ${wf.tipoId === t.id ? "border-[#B3985B] bg-[#B3985B]/5" : "border-white/10 hover:border-white/20"}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                      <p className="text-white text-sm font-medium">{t.nombre}</p>
                    </div>
                    <p className="text-white/35 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Target className="w-3 h-3" /> {FORMATO_LABEL[t.formato] ?? t.formato} · {t.duracionDias} días
                      {t.presupuestoEstimado ? ` · ${money(t.presupuestoEstimado)}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 2: Esenciales */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-1">Nombre de la campaña *</label>
                <input value={wf.nombre} onChange={e => setWf(f => ({ ...f, nombre: e.target.value }))} className={INPUT} placeholder="Ej: Eventos musicales — Verano 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Fecha inicio *</label>
                  <input type="date" value={wf.fechaInicio} onChange={e => setIni(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Fecha fin *</label>
                  <input type="date" value={wf.fechaFin} onChange={e => setWf(f => ({ ...f, fechaFin: e.target.value }))} className={INPUT} />
                </div>
              </div>
              {wf.fechaInicio && wf.fechaFin && (
                <p className="text-white/30 text-xs -mt-2">Duración: {diffDias(wf.fechaInicio, wf.fechaFin)} días</p>
              )}
              <div>
                <label className="block text-xs text-white/40 mb-1">Presupuesto (MXN)</label>
                <input type="number" min={0} value={wf.presupuesto} onChange={e => setWf(f => ({ ...f, presupuesto: e.target.value }))} className={INPUT} placeholder="Opcional" />
              </div>
              <details className="group">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 select-none">▸ Avanzado: audiencia y ubicaciones</summary>
                <div className="space-y-3 mt-3 pl-1">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Audiencia</label>
                    <input value={wf.audiencia} onChange={e => setWf(f => ({ ...f, audiencia: e.target.value }))} className={INPUT} placeholder="Ej: 25–55 años · Querétaro · intereses en eventos" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Ubicaciones</label>
                    <div className="flex flex-wrap gap-1.5">
                      {UBICACION_OPTIONS.map(u => {
                        const sel = wf.ubicaciones.split(",").map(s => s.trim()).includes(u);
                        return (
                          <button key={u} type="button"
                            onClick={() => setWf(f => {
                              const cur = f.ubicaciones.split(",").map(s => s.trim()).filter(Boolean);
                              const next = sel ? cur.filter(x => x !== u) : [...cur, u];
                              return { ...f, ubicaciones: next.join(",") };
                            })}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-white/10 text-white/40 hover:text-white"}`}>
                            {UBICACION_LABEL[u]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Paso 3: Creativo */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-white/40">Define el primer anuncio. Puedes agregar más y capturar el brief completo después, desde el detalle de la campaña.</p>
              <div>
                <label className="block text-xs text-white/40 mb-1">Nombre del anuncio</label>
                <input value={wf.anuncioNombre} onChange={e => setWf(f => ({ ...f, anuncioNombre: e.target.value }))} className={INPUT} placeholder="Ej: Anuncio 1 — Video testimonial" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Formato</label>
                  <Combobox value={wf.anuncioFormato} onChange={v => setWf(f => ({ ...f, anuncioFormato: v }))}
                    options={FORMATO_OPTIONS.map(v => ({ value: v, label: FORMATO_LABEL[v] }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Botón (CTA)</label>
                  <Combobox value={wf.anuncioCta} onChange={v => setWf(f => ({ ...f, anuncioCta: v }))}
                    options={CTA_OPTIONS.map(v => ({ value: v, label: CTA_LABEL[v] }))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Copy / texto principal</label>
                <textarea value={wf.anuncioCopy} onChange={e => setWf(f => ({ ...f, anuncioCopy: e.target.value }))} rows={3} className={`${INPUT} resize-none`} placeholder="Texto del anuncio…" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">URL / destino</label>
                <input value={wf.anuncioUrl} onChange={e => setWf(f => ({ ...f, anuncioUrl: e.target.value }))} className={INPUT} placeholder="https://… o formulario" />
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => step > 1 ? setStep(step - 1) : setShowWizard(false)}
              className="text-xs text-white/40 hover:text-white px-3 py-2 transition-colors">
              {step > 1 ? "← Atrás" : "Cancelar"}
            </button>
            {step < 3 ? (
              <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext}
                className="text-xs font-semibold px-5 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-40 transition-opacity">
                Siguiente →
              </button>
            ) : (
              <button onClick={launch} disabled={launching}
                className="text-xs font-semibold px-5 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-40 transition-opacity flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5" /> {launching ? "Creando…" : "Crear campaña"}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Detalle de campaña ─────────────────────────────────────────────── */}
      {detail && (
        <CampanaDetail
          key={detail.id}
          ejecucion={detail}
          onClose={() => setDetailId(null)}
          onChange={refreshOne}
          onPatchEstado={patchEstado}
          onDelete={del}
        />
      )}
    </div>
  );
}

// ─── Detalle: config editable + anuncios + resultados + brief ────────────────
function CampanaDetail({
  ejecucion, onClose, onChange, onPatchEstado, onDelete,
}: {
  ejecucion: Ejecucion;
  onClose: () => void;
  onChange: (e: Ejecucion) => void;
  onPatchEstado: (id: string, estado: string) => void;
  onDelete: (e: Ejecucion) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const e = ejecucion;
  const m = agg(e.resultados);

  const [editData, setEditData] = useState(false);
  const [edit, setEdit] = useState({
    nombre: e.nombre, fechaInicio: e.fechaInicio.slice(0, 10), fechaFin: e.fechaFin.slice(0, 10),
    presupuesto: e.presupuesto?.toString() ?? "", audiencia: e.audiencia ?? "", notas: e.notas ?? "",
  });
  const [savingData, setSavingData] = useState(false);

  const [showBrief, setShowBrief] = useState(false);
  const [brief, setBrief] = useState<CampanaBrief>(parseBrief(e.brief));
  const [savingBrief, setSavingBrief] = useState(false);

  const [showAnuncio, setShowAnuncio] = useState(false);
  const [anuncioForm, setAnuncioForm] = useState({ nombre: "", formato: "IMAGEN", copy: "", cta: "MAS_INFORMACION", urlDestino: "" });
  const [savingAnuncio, setSavingAnuncio] = useState(false);

  const [showResultado, setShowResultado] = useState(false);
  const [resForm, setResForm] = useState({ fecha: new Date().toISOString().split("T")[0], gastado: "", leads: "", clics: "", alcance: "", impresiones: "", notas: "" });
  const [savingRes, setSavingRes] = useState(false);

  async function patch(body: Record<string, unknown>): Promise<Ejecucion | null> {
    const res = await fetch(`/api/marketing/ejecuciones/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return null; }
    const { ejecucion } = await res.json();
    onChange(ejecucion); return ejecucion;
  }

  async function saveData() {
    setSavingData(true);
    const r = await patch({
      nombre: edit.nombre, fechaInicio: edit.fechaInicio, fechaFin: edit.fechaFin,
      presupuesto: edit.presupuesto || null, audiencia: edit.audiencia || null, notas: edit.notas || null,
    });
    setSavingData(false);
    if (r) setEditData(false);
  }

  async function saveBrief() {
    setSavingBrief(true);
    await patch({ brief: JSON.stringify(brief) });
    setSavingBrief(false);
    toast.success("Brief guardado");
  }

  async function setEstado(estado: string) {
    if (estado === "EN_EJECUCION" && !isBriefCompleto(brief)) {
      toast.error("Completa el checklist de lanzamiento del brief antes de poner en ejecución.");
      setShowBrief(true); return;
    }
    onPatchEstado(e.id, estado);
  }

  async function addAnuncio() {
    if (!anuncioForm.nombre.trim() && !anuncioForm.copy.trim()) { toast.error("Agrega nombre o copy"); return; }
    setSavingAnuncio(true);
    const res = await fetch(`/api/marketing/ejecuciones/${e.id}/anuncios`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...anuncioForm, nombre: anuncioForm.nombre.trim() || "Anuncio" }),
    });
    setSavingAnuncio(false);
    if (!res.ok) { toast.error("Error al crear anuncio"); return; }
    const { anuncio } = await res.json();
    onChange({ ...e, anuncios: [...e.anuncios, anuncio] });
    setAnuncioForm({ nombre: "", formato: "IMAGEN", copy: "", cta: "MAS_INFORMACION", urlDestino: "" });
    setShowAnuncio(false);
  }
  async function delAnuncio(id: string) {
    const res = await fetch(`/api/marketing/ejecuciones/${e.id}/anuncios`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anuncioId: id }),
    });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    onChange({ ...e, anuncios: e.anuncios.filter(a => a.id !== id) });
  }

  async function addResultado() {
    setSavingRes(true);
    const res = await fetch(`/api/marketing/ejecuciones/${e.id}/resultados`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resForm),
    });
    setSavingRes(false);
    if (!res.ok) { toast.error("Error al guardar resultado"); return; }
    const { resultado } = await res.json();
    onChange({ ...e, resultados: [resultado, ...e.resultados] });
    setResForm({ fecha: new Date().toISOString().split("T")[0], gastado: "", leads: "", clics: "", alcance: "", impresiones: "", notas: "" });
    setShowResultado(false);
  }
  async function delResultado(id: string) {
    const res = await fetch(`/api/marketing/ejecuciones/${e.id}/resultados`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resultadoId: id }),
    });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    onChange({ ...e, resultados: e.resultados.filter(r => r.id !== id) });
  }

  const presUsado = e.presupuesto && e.presupuesto > 0 ? (m.gastado / e.presupuesto) * 100 : null;

  return (
    <Modal open onClose={onClose} title={e.nombre} maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Estado + acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          {ESTADOS.map(s => (
            <button key={s} onClick={() => setEstado(s)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${e.estado === s ? ESTADO_COLOR[s] : "text-white/25 border border-white/[0.07] hover:text-white hover:border-white/20"}`}>
              {ESTADO_LABEL[s]}
            </button>
          ))}
          <span className="ml-auto" />
          <button onClick={() => onDelete(e)} className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1 transition-colors">Eliminar</button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Invertido", value: money(m.gastado), sub: presUsado != null ? `${presUsado.toFixed(0)}% del presupuesto` : (e.presupuesto ? money(e.presupuesto) : null) },
            { label: "Leads", value: String(m.leads), sub: m.cpl != null ? `CPL ${money(m.cpl)}` : null },
            { label: "Clics", value: num(m.clics), sub: m.cpc != null ? `CPC ${money(m.cpc)}` : null },
            { label: "Alcance", value: num(m.alcance), sub: m.cpm != null ? `CPM ${money(m.cpm)}` : null },
          ].map(k => (
            <div key={k.label} className="ms-card px-3 py-2.5">
              <p className="text-white/30 text-[10px] uppercase tracking-wide">{k.label}</p>
              <p className="text-white text-lg font-semibold">{k.value}</p>
              {k.sub && <p className="text-white/35 text-[10px] mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>
        {presUsado != null && (
          <div className="w-full bg-[#222] rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${presUsado > 90 ? "bg-red-500" : presUsado > 70 ? "bg-yellow-500" : "bg-[#B3985B]"}`} style={{ width: `${Math.min(100, presUsado)}%` }} />
          </div>
        )}

        {/* Config */}
        <div className="ms-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 uppercase tracking-wider">Configuración</p>
            <button onClick={() => setEditData(v => !v)} className="text-xs text-[#B3985B] hover:text-white transition-colors">{editData ? "Cancelar" : "Editar"}</button>
          </div>
          {!editData ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Info label="Fechas" value={`${formatDate(e.fechaInicio)} → ${formatDate(e.fechaFin)} · ${diffDias(e.fechaInicio, e.fechaFin)} días`} />
              <Info label="Objetivo" value={e.objetivo ?? "—"} />
              <Info label="Canal" value={e.canal ? (CANAL_LABEL[e.canal] ?? e.canal) : "—"} />
              <Info label="Presupuesto" value={e.presupuesto ? money(e.presupuesto) : "—"} />
              <Info label="Audiencia" value={e.audiencia ?? "—"} />
              <Info label="Ubicaciones" value={e.ubicaciones ? e.ubicaciones.split(",").map(u => UBICACION_LABEL[u.trim()] ?? u.trim()).join(", ") : "—"} />
              {e.notas && <div className="col-span-2"><Info label="Notas" value={e.notas} /></div>}
            </div>
          ) : (
            <div className="space-y-3">
              <input value={edit.nombre} onChange={ev => setEdit(f => ({ ...f, nombre: ev.target.value }))} className={INPUT} placeholder="Nombre" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={edit.fechaInicio} onChange={ev => setEdit(f => ({ ...f, fechaInicio: ev.target.value }))} className={INPUT} />
                <input type="date" value={edit.fechaFin} onChange={ev => setEdit(f => ({ ...f, fechaFin: ev.target.value }))} className={INPUT} />
              </div>
              <input type="number" min={0} value={edit.presupuesto} onChange={ev => setEdit(f => ({ ...f, presupuesto: ev.target.value }))} className={INPUT} placeholder="Presupuesto (MXN)" />
              <input value={edit.audiencia} onChange={ev => setEdit(f => ({ ...f, audiencia: ev.target.value }))} className={INPUT} placeholder="Audiencia" />
              <textarea value={edit.notas} onChange={ev => setEdit(f => ({ ...f, notas: ev.target.value }))} rows={2} className={`${INPUT} resize-none`} placeholder="Notas" />
              <button onClick={saveData} disabled={savingData}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-40">
                {savingData ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>

        {/* Anuncios */}
        <div className="ms-table-wrapper">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Anuncios ({e.anuncios.length})</p>
            <button onClick={() => setShowAnuncio(v => !v)} className="text-xs text-[#B3985B] hover:text-white transition-colors">{showAnuncio ? "Cancelar" : "+ Agregar"}</button>
          </div>
          {showAnuncio && (
            <div className="p-4 bg-[#0d0d0d] border-b border-white/[0.05] space-y-3">
              <input value={anuncioForm.nombre} onChange={ev => setAnuncioForm(f => ({ ...f, nombre: ev.target.value }))} className={INPUT_SM} placeholder="Nombre del anuncio" />
              <div className="grid grid-cols-2 gap-3">
                <Combobox value={anuncioForm.formato} onChange={v => setAnuncioForm(f => ({ ...f, formato: v }))} options={FORMATO_OPTIONS.map(v => ({ value: v, label: FORMATO_LABEL[v] }))} className={INPUT_SM} />
                <Combobox value={anuncioForm.cta} onChange={v => setAnuncioForm(f => ({ ...f, cta: v }))} options={CTA_OPTIONS.map(v => ({ value: v, label: CTA_LABEL[v] }))} className={INPUT_SM} />
              </div>
              <textarea value={anuncioForm.copy} onChange={ev => setAnuncioForm(f => ({ ...f, copy: ev.target.value }))} rows={2} className={`${INPUT_SM} resize-none`} placeholder="Copy / texto principal" />
              <input value={anuncioForm.urlDestino} onChange={ev => setAnuncioForm(f => ({ ...f, urlDestino: ev.target.value }))} className={INPUT_SM} placeholder="URL / destino" />
              <button onClick={addAnuncio} disabled={savingAnuncio} className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-40">{savingAnuncio ? "Guardando…" : "Guardar anuncio"}</button>
            </div>
          )}
          {e.anuncios.length === 0 ? (
            <div className="p-5 text-center text-white/30 text-xs">Sin anuncios todavía</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {e.anuncios.map(a => (
                <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-xs font-medium">{a.nombre}</p>
                      <span className="text-[10px] text-white/30 border border-white/[0.07] rounded-full px-1.5 py-0.5">{FORMATO_LABEL[a.formato] ?? a.formato}</span>
                      {a.cta && <span className="text-[10px] text-[#B3985B]/70">{CTA_LABEL[a.cta] ?? a.cta}</span>}
                    </div>
                    {a.copy && <p className="text-white/40 text-xs mt-1 leading-relaxed">{a.copy}</p>}
                    {a.urlDestino && <p className="text-white/25 text-[10px] mt-0.5 truncate">{a.urlDestino}</p>}
                  </div>
                  <button onClick={() => delAnuncio(a.id)} className="text-white/25 hover:text-red-400 text-sm transition-colors">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="ms-table-wrapper">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Resultados por periodo</p>
            <button onClick={() => setShowResultado(v => !v)} className="text-xs text-[#B3985B] hover:text-white transition-colors">{showResultado ? "Cancelar" : "+ Agregar"}</button>
          </div>
          {showResultado && (
            <div className="p-4 bg-[#0d0d0d] border-b border-white/[0.05]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div><label className="text-[10px] text-white/40 block mb-1">Fecha</label><input type="date" value={resForm.fecha} onChange={ev => setResForm(f => ({ ...f, fecha: ev.target.value }))} className={INPUT_SM} /></div>
                <div><label className="text-[10px] text-white/40 block mb-1">Gastado ($)</label><input type="number" value={resForm.gastado} onChange={ev => setResForm(f => ({ ...f, gastado: ev.target.value }))} className={INPUT_SM} placeholder="0" /></div>
                <div><label className="text-[10px] text-white/40 block mb-1">Leads</label><input type="number" value={resForm.leads} onChange={ev => setResForm(f => ({ ...f, leads: ev.target.value }))} className={INPUT_SM} placeholder="0" /></div>
                <div><label className="text-[10px] text-white/40 block mb-1">Clics</label><input type="number" value={resForm.clics} onChange={ev => setResForm(f => ({ ...f, clics: ev.target.value }))} className={INPUT_SM} placeholder="0" /></div>
                <div><label className="text-[10px] text-white/40 block mb-1">Alcance</label><input type="number" value={resForm.alcance} onChange={ev => setResForm(f => ({ ...f, alcance: ev.target.value }))} className={INPUT_SM} placeholder="0" /></div>
                <div><label className="text-[10px] text-white/40 block mb-1">Impresiones</label><input type="number" value={resForm.impresiones} onChange={ev => setResForm(f => ({ ...f, impresiones: ev.target.value }))} className={INPUT_SM} placeholder="0" /></div>
              </div>
              <button onClick={addResultado} disabled={savingRes} className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-40">{savingRes ? "Guardando…" : "Guardar resultado"}</button>
            </div>
          )}
          {e.resultados.length === 0 ? (
            <div className="p-5 text-center text-white/30 text-xs">Sin resultados registrados</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-xs">
              <thead><tr className="border-b border-white/[0.05]">
                {["Fecha", "Gastado", "Leads", "CPL", "Clics", "CPC", "Alcance", "CPM", ""].map(h => (
                  <th key={h} className="text-left text-white/30 font-medium px-3 py-2 uppercase tracking-wide text-[10px]">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {e.resultados.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-white/50">{formatDate(r.fecha)}</td>
                    <td className="px-3 py-2 text-white font-medium">{money(r.gastado)}</td>
                    <td className="px-3 py-2 text-white">{r.leads}</td>
                    <td className="px-3 py-2 text-white/40">{r.cpl != null ? money(r.cpl) : "—"}</td>
                    <td className="px-3 py-2 text-white">{num(r.clics)}</td>
                    <td className="px-3 py-2 text-white/40">{r.cpc != null ? money(r.cpc) : "—"}</td>
                    <td className="px-3 py-2 text-white/40">{num(r.alcance)}</td>
                    <td className="px-3 py-2 text-white/40">{r.cpm != null ? money(r.cpm) : "—"}</td>
                    <td className="px-3 py-2"><button onClick={() => delResultado(r.id)} className="text-white/25 hover:text-red-400 transition-colors">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        {/* Brief (avanzado) */}
        <div className="ms-table-wrapper">
          <button onClick={() => setShowBrief(v => !v)} className="w-full flex items-center justify-between px-4 py-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">Brief y checklist de lanzamiento</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${isBriefCompleto(brief) ? "bg-green-900/30 text-green-300" : "bg-yellow-900/20 text-yellow-300/80"}`}>
              {isBriefCompleto(brief) ? "Completo" : "Incompleto"}
            </span>
          </button>
          {showBrief && (
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
              <p className="text-[11px] text-white/30">Necesario para poner la campaña en ejecución.</p>
              <BriefEditor value={brief} onChange={setBrief} />
              <button onClick={saveBrief} disabled={savingBrief} className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-40">{savingBrief ? "Guardando…" : "Guardar brief"}</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/25 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-white/70">{value}</p>
    </div>
  );
}
