"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import {
  ShieldCheck, CheckCircle2, XCircle, Camera, FileText, ExternalLink,
  StickyNote, CalendarClock, ClipboardCheck, X, Trash2,
} from "lucide-react";

interface Archivo { id: string; nombre: string; url: string; tipo: string | null; tamano: number | null }
interface TareaVerif {
  id: string;
  // Presente cuando el ítem es una ocurrencia recurrente archivada en el historial
  // (timestamp de completado). Null/undefined para tareas vivas.
  ocurrenciaAt?: string | null;
  titulo: string;
  tipoOrigen: string | null;
  area: string | null;
  fechaCompletada: string | null;
  requiereEvidencia: boolean | null;
  tipoEvidencia: string | null;
  evidenciaNota: string | null;
  noRealizada: boolean | null;
  motivoNoRealizada: string | null;
  justificacionNoRealizada: string | null;
  estandarMinimo: string | null;
  porqueSeHace: string | null;
  moduloDestino: string | null;
  moduloTexto: string | null;
  moduloDisponible: boolean | null;
  asignadoA: { id: string; name: string } | null;
  archivos: Archivo[];
}

const AREA_LABEL: Record<string, string> = {
  DIRECCION: "Dirección", ADMINISTRACION: "Administración", MARKETING: "Marketing",
  VENTAS: "Comercial", PRODUCCION: "Producción", RRHH: "RRHH", GENERAL: "General",
};
const areaLabel = (a: string | null) => (a ? (AREA_LABEL[a] ?? a) : "Sin área");

const ORIGEN_LABEL: Record<string, string> = { PLAN: "Plan", TAREA: "Tarea", JUNTA: "Junta" };

const MOTIVO_NO_REALIZADA_LABEL: Record<string, string> = {
  NO_NECESARIA: "No fue necesaria",
  NO_SUPE: "No supe cómo hacerla",
  NO_CLARA: "No fue clara",
  OTRO: "Otro motivo",
};

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function VerificacionClient() {
  const toast = useToast();
  const [tareas, setTareas] = useState<TareaVerif[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [responsables, setResponsables] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filtros
  const [fArea, setFArea] = useState("");
  const [fResp, setFResp] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [semana, setSemana] = useState(false);

  // UI
  const [agrupacion, setAgrupacion] = useState<"area" | "responsable">("area");
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fArea) qs.set("area", fArea);
      if (fResp) qs.set("responsableId", fResp);
      if (semana) qs.set("semana", "1");
      else {
        if (fDesde) qs.set("desde", fDesde);
        if (fHasta) qs.set("hasta", fHasta);
      }
      const res = await fetch(`/api/verificacion?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) { setTareas([]); return; }
      const data = await res.json();
      setTareas(data.tareas ?? []);
      setAreas(data.areas ?? []);
      setResponsables(data.responsables ?? []);
    } finally {
      setLoading(false);
    }
  }, [fArea, fResp, fDesde, fHasta, semana]);

  useEffect(() => { cargar(); }, [cargar]);

  // Clave única del ítem: las ocurrencias comparten `id` con su tarea recurrente,
  // así que se distinguen por `ocurrenciaAt`.
  const claveItem = (t: TareaVerif) => (t.ocurrenciaAt ? `${t.id}::${t.ocurrenciaAt}` : t.id);

  async function verificar(t: TareaVerif) {
    const busy = claveItem(t);
    setBusyId(busy);
    try {
      const res = await fetch(`/api/tareas/${t.id}/verificar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "VERIFICAR", ocurrenciaAt: t.ocurrenciaAt ?? undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al verificar"); return; }
      setTareas(prev => prev.filter(x => claveItem(x) !== busy));
      toast.success("Tarea verificada");
    } finally { setBusyId(null); }
  }

  async function rechazar(t: TareaVerif) {
    if (motivo.trim().length === 0) { toast.error("Escribe el motivo de rechazo"); return; }
    const busy = claveItem(t);
    setBusyId(busy);
    try {
      const res = await fetch(`/api/tareas/${t.id}/verificar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "RECHAZAR", motivoRechazo: motivo.trim(), ocurrenciaAt: t.ocurrenciaAt ?? undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al rechazar"); return; }
      setTareas(prev => prev.filter(x => claveItem(x) !== busy));
      setRechazandoId(null); setMotivo("");
      toast.success("Tarea rechazada y devuelta al responsable");
    } finally { setBusyId(null); }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tarea? Se borra por completo (útil para pruebas). No se puede deshacer.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/tareas/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar"); return; }
      setTareas(prev => prev.filter(t => t.id !== id));
      toast.success("Tarea eliminada");
    } finally { setBusyId(null); }
  }

  // Agrupación
  const grupos = tareas.reduce((acc, t) => {
    const key = agrupacion === "area" ? areaLabel(t.area) : (t.asignadoA?.name ?? "Sin responsable");
    (acc[key] ??= []).push(t);
    return acc;
  }, {} as Record<string, TareaVerif[]>);
  const gruposKeys = Object.keys(grupos).sort();

  const hasFilters = fArea || fResp || fDesde || fHasta || semana;

  return (
    <div className="max-w-5xl mx-auto px-3 py-5 pb-24">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-semibold flex items-center gap-1.5">
          <ShieldCheck strokeWidth={2} className="w-3.5 h-3.5" /> Verificación Operativa
        </p>
        <p className="ms-h1 mt-1 text-white">Tareas pendientes de verificación</p>
        <p className="text-gray-500 text-sm mt-1">
          Revisa la evidencia contra el estándar mínimo y verifica o rechaza cada tarea.
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setSemana(s => !s); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            semana ? "bg-[#B3985B]/10 border-[#B3985B]/30 text-[#B3985B]" : "border-[#1e1e1e] text-gray-400 hover:text-gray-200 hover:border-[#333]"
          }`}
        >
          <CalendarClock strokeWidth={1.75} className="w-3.5 h-3.5" /> Esta semana
        </button>

        <select value={fArea} onChange={e => setFArea(e.target.value)}
          className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{areaLabel(a)}</option>)}
        </select>

        <select value={fResp} onChange={e => setFResp(e.target.value)}
          className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]">
          <option value="">Todos los responsables</option>
          {responsables.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {!semana && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)}
              className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]" />
            <span className="text-gray-600 text-xs">→</span>
            <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)}
              className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#B3985B]" />
          </div>
        )}

        {hasFilters && (
          <button onClick={() => { setFArea(""); setFResp(""); setFDesde(""); setFHasta(""); setSemana(false); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Limpiar</button>
        )}

        {/* Toggle agrupación */}
        <div className="ml-auto flex rounded-lg overflow-hidden border border-[#1e1e1e]">
          <button onClick={() => setAgrupacion("area")}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${agrupacion === "area" ? "bg-[#1a1a1a] text-white" : "text-gray-500 hover:text-gray-300"}`}>
            Por área
          </button>
          <div className="w-px bg-[#1e1e1e]" />
          <button onClick={() => setAgrupacion("responsable")}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${agrupacion === "responsable" ? "bg-[#1a1a1a] text-white" : "text-gray-500 hover:text-gray-300"}`}>
            Por responsable
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando tareas…</div>
      ) : tareas.length === 0 ? (
        <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-12 text-center">
          <ClipboardCheck strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-white font-semibold mb-1">No hay tareas por verificar</p>
          <p className="text-gray-500 text-sm">Todo al día. Las tareas completadas con evidencia aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {gruposKeys.map(gk => (
            <div key={gk}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-white">{gk}</span>
                <div className="h-px flex-1 bg-[#1a1a1a]" />
                <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded-full">{grupos[gk].length}</span>
              </div>
              <div className="space-y-2.5">
                {grupos[gk].map(t => {
                  const clave = claveItem(t);
                  return (
                  <VerifRow
                    key={clave}
                    t={t}
                    busy={busyId === clave}
                    rechazando={rechazandoId === clave}
                    motivo={rechazandoId === clave ? motivo : ""}
                    onMotivo={setMotivo}
                    onVerificar={() => verificar(t)}
                    onAbrirRechazo={() => { setRechazandoId(clave); setMotivo(""); }}
                    onCancelarRechazo={() => { setRechazandoId(null); setMotivo(""); }}
                    onConfirmarRechazo={() => rechazar(t)}
                    onEliminar={() => eliminar(t.id)}
                    onLightbox={setLightbox}
                  />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox de fotos */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Evidencia" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function VerifRow({
  t, busy, rechazando, motivo, onMotivo, onVerificar, onAbrirRechazo, onCancelarRechazo, onConfirmarRechazo, onEliminar, onLightbox,
}: {
  t: TareaVerif; busy: boolean; rechazando: boolean; motivo: string;
  onMotivo: (v: string) => void;
  onVerificar: () => void; onAbrirRechazo: () => void; onCancelarRechazo: () => void; onConfirmarRechazo: () => void;
  onEliminar: () => void;
  onLightbox: (url: string) => void;
}) {
  const imagenes = t.archivos.filter(a => (a.tipo ?? "").toLowerCase().startsWith("image/"));
  const otros = t.archivos.filter(a => !(a.tipo ?? "").toLowerCase().startsWith("image/"));

  return (
    <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] text-white font-medium">{t.titulo}</span>
            {t.tipoOrigen && (
              <span className="text-[9px] uppercase tracking-wider text-[#B3985B] border border-[#B3985B]/25 rounded px-1.5 py-0.5">
                {ORIGEN_LABEL[t.tipoOrigen] ?? t.tipoOrigen}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-500">
            {t.asignadoA && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[9px] text-[#B3985B] flex items-center justify-center font-bold">
                  {t.asignadoA.name.charAt(0).toUpperCase()}
                </span>
                {t.asignadoA.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 strokeWidth={1.75} className="w-3 h-3" /> {fmtFecha(t.fechaCompletada)}
            </span>
            <span>{areaLabel(t.area)}</span>
          </div>

          {/* Estándar mínimo */}
          {t.estandarMinimo && (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#161616]">
              <p className="text-[9px] text-[#555] uppercase tracking-widest font-semibold mb-0.5">Estándar mínimo</p>
              <p className="text-[12px] text-[#aaa] leading-relaxed whitespace-pre-wrap">{t.estandarMinimo}</p>
            </div>
          )}

          {/* No realizada: motivo + justificación (en vez de evidencia) */}
          {t.noRealizada && (
            <div className="mt-2.5 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/25">
              <p className="text-[9px] text-amber-400/90 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1.5">
                <XCircle strokeWidth={2} className="w-3 h-3" /> Tarea no realizada
              </p>
              <p className="text-[12px] text-amber-200/90 font-medium mb-1">
                {t.motivoNoRealizada ? (MOTIVO_NO_REALIZADA_LABEL[t.motivoNoRealizada] ?? t.motivoNoRealizada) : "Sin motivo"}
              </p>
              {t.justificacionNoRealizada && (
                <p className="text-[12px] text-[#ccc] leading-relaxed whitespace-pre-wrap">{t.justificacionNoRealizada}</p>
              )}
            </div>
          )}

          {/* Evidencia */}
          {!t.noRealizada && (
          <div className="mt-2.5">
            <p className="text-[9px] text-[#555] uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
              {t.tipoEvidencia === "FOTO" ? <Camera strokeWidth={1.75} className="w-3 h-3" />
                : t.tipoEvidencia === "ARCHIVO" ? <FileText strokeWidth={1.75} className="w-3 h-3" />
                : <StickyNote strokeWidth={1.75} className="w-3 h-3" />}
              Evidencia
            </p>

            {imagenes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagenes.map(a => (
                  <button key={a.id} onClick={() => onLightbox(a.url)}
                    className="block w-16 h-16 rounded-lg overflow-hidden border border-[#222] hover:border-[#B3985B]/50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {otros.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {otros.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#111] border border-[#222] text-[11px] text-[#999] hover:text-white max-w-[200px]">
                    <FileText strokeWidth={1.75} className="w-3 h-3 shrink-0" />
                    <span className="truncate">{a.nombre}</span>
                  </a>
                ))}
              </div>
            )}

            {t.evidenciaNota && (
              <p className="text-[13px] text-[#ccc] leading-relaxed whitespace-pre-wrap bg-[#0a0a0a] border border-[#161616] rounded-lg px-3 py-2">
                {t.evidenciaNota}
              </p>
            )}

            {t.moduloDestino && t.moduloDisponible && (
              <a href={t.moduloDestino} className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-[#B3985B]/80 hover:text-[#B3985B]">
                <ExternalLink strokeWidth={2} className="w-3.5 h-3.5" /> {t.moduloTexto || "Abrir módulo"}
              </a>
            )}

            {imagenes.length === 0 && otros.length === 0 && !t.evidenciaNota && (
              <p className="text-[12px] text-[#555] italic">Sin evidencia adjunta.</p>
            )}
          </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={onVerificar} disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-40">
            <CheckCircle2 strokeWidth={2} className="w-3.5 h-3.5" /> Verificar
          </button>
          {!rechazando && (
            <button onClick={onAbrirRechazo} disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/15 transition-all disabled:opacity-40">
              <XCircle strokeWidth={2} className="w-3.5 h-3.5" /> Rechazar
            </button>
          )}
          {!t.ocurrenciaAt && (
            <button onClick={onEliminar} disabled={busy} title="Eliminar tarea (pruebas)"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e1e1e] text-gray-500 text-xs font-medium hover:text-red-400 hover:border-red-500/25 transition-all disabled:opacity-40">
              <Trash2 strokeWidth={2} className="w-3.5 h-3.5" /> Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Panel de rechazo */}
      {rechazando && (
        <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
          <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-semibold mb-1.5">Motivo del rechazo (obligatorio)</p>
          <textarea
            autoFocus
            value={motivo}
            onChange={e => onMotivo(e.target.value)}
            placeholder="Explica qué faltó o por qué no cumple el estándar…"
            className="w-full bg-[#080808] border border-[#2a1a1a] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-red-500/40 placeholder:text-[#444]"
            rows={2}
          />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={onConfirmarRechazo} disabled={busy || motivo.trim().length === 0}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-all disabled:opacity-40">
              Confirmar rechazo
            </button>
            <button onClick={onCancelarRechazo} className="text-xs text-gray-500 hover:text-gray-300">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
