"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardList, Palette, Settings2, Music4, Handshake, ClipboardCheck,
  Upload, X, Plus, Link as LinkIcon, ChevronLeft, ChevronRight, FileText, Trash2,
} from "lucide-react";
import {
  SECCIONES_BRIEF,
  serializeBriefDetalle,
  campoVisible,
  camposFaltantes,
  camposFaltantesTotal,
  razonVisible,
  type RespuestasBrief,
  type CampoBrief,
  type SeccionBrief,
} from "@/lib/brief-creativo";

const ICONOS: Record<SeccionBrief["icono"], typeof ClipboardList> = {
  ClipboardList, Palette, Settings2, Music4, Handshake,
};

type ArchivoBrief = { id: string; nombre: string; url: string; tipo: string };
type LinkRef = { label: string; url: string };

function parseLinksLocal(raw: string | undefined): LinkRef[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

// Texto corto de un valor para la pantalla de resumen — no reusa renderCampo
// porque ahí necesitamos lectura, no edición.
function valorResumenTexto(campo: CampoBrief, valor: RespuestasBrief[string]): string {
  if (valor === undefined || valor === "") return "—";
  switch (campo.tipo) {
    case "chips": {
      const ids = Array.isArray(valor) ? valor : [valor as string];
      const labels = ids.map(id => campo.opciones?.find(o => o.id === id)?.label ?? id);
      return labels.length ? labels.join(", ") : "—";
    }
    case "toggle":
      return valor === true ? "Sí" : valor === false ? "No" : "—";
    case "colores":
      return Array.isArray(valor) && valor.length ? `${valor.length} color${valor.length !== 1 ? "es" : ""}` : "—";
    case "referencias": {
      const links = parseLinksLocal(typeof valor === "string" ? valor : undefined);
      return links.length ? `${links.length} link${links.length !== 1 ? "s" : ""}` : "Sin links";
    }
    default:
      return typeof valor === "string" ? valor : "—";
  }
}

interface Props {
  variante: "interno" | "cliente";
  respuestasIniciales: RespuestasBrief;
  archivosEndpoint: string;
  onGuardar: (json: string | null) => void;
  onEnviarFinal?: () => void;
  enviando?: boolean;
}

export default function BriefCreativoForm({
  variante, respuestasIniciales, archivosEndpoint, onGuardar, onEnviarFinal, enviando,
}: Props) {
  const [respuestas, setRespuestas] = useState<RespuestasBrief>(respuestasIniciales);
  const [paso, setPaso] = useState(0);
  const [archivos, setArchivos] = useState<ArchivoBrief[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primerRenderRef = useRef(true);

  useEffect(() => {
    fetch(archivosEndpoint).then(r => r.json()).then(d => setArchivos(d.archivos ?? [])).catch(() => {});
  }, [archivosEndpoint]);

  // Autoguardado con feedback visual: se junta en un solo PATCH ~800ms después
  // del último cambio (en vez de un guardado silencioso por campo en onBlur).
  useEffect(() => {
    if (primerRenderRef.current) { primerRenderRef.current = false; return; }
    setAutoSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onGuardar(serializeBriefDetalle(respuestas));
      setAutoSaveStatus("saved");
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respuestas]);

  function actualizar(campoId: string, valor: string | string[] | boolean | undefined) {
    setRespuestas(prev => ({ ...prev, [campoId]: valor }));
  }

  async function subirArchivo(file: File) {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tipo", "REFERENCIA");
      const res = await fetch(archivosEndpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (data.archivo) setArchivos(prev => [...prev, data.archivo]);
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarArchivo(id: string) {
    await fetch(`${archivosEndpoint}?archivoId=${id}`, { method: "DELETE" });
    setArchivos(prev => prev.filter(a => a.id !== id));
  }

  const esCliente = variante === "cliente";
  const dorado = "#B3985B";
  const totalSecciones = SECCIONES_BRIEF.length;
  const esResumen = esCliente && paso === totalSecciones;
  const seccionActual = paso < totalSecciones ? SECCIONES_BRIEF[paso] : null;
  const IconoActual = seccionActual ? ICONOS[seccionActual.icono] : ClipboardCheck;

  const faltantes = esResumen
    ? camposFaltantesTotal(respuestas).map(f => f.campo)
    : (seccionActual ? camposFaltantes(seccionActual, respuestas) : []);

  const cardCls = esCliente
    ? "bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden"
    : "ms-card overflow-hidden";

  function renderCampo(campo: CampoBrief) {
    if (!campoVisible(campo, respuestas)) return null;
    const valor = respuestas[campo.id];
    const hint = razonVisible(campo);

    const labelEl = (
      <div className="mb-1.5">
        <label className={esCliente ? "text-sm font-medium text-white" : "text-[10px] uppercase tracking-wider text-[#666] block"}>
          {campo.label}
          {campo.requerido && <span className="text-[#B3985B]"> *</span>}
        </label>
        {campo.ayuda && <p className={esCliente ? "text-xs text-[#888] mt-0.5" : "ms-micro mt-0.5"}>{campo.ayuda}</p>}
        {hint && <p className="text-[10px] text-[#B3985B]/80 mt-0.5 italic">{hint}</p>}
      </div>
    );

    const inputCls = esCliente
      ? "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#B3985B] transition-colors"
      : "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[12.5px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50";

    switch (campo.tipo) {
      case "texto":
        return (
          <div key={campo.id}>
            {labelEl}
            <input
              defaultValue={typeof valor === "string" ? valor : ""}
              placeholder={campo.placeholder}
              onBlur={e => actualizar(campo.id, e.target.value || undefined)}
              className={inputCls}
            />
          </div>
        );
      case "textarea":
        return (
          <div key={campo.id}>
            {labelEl}
            <textarea
              defaultValue={typeof valor === "string" ? valor : ""}
              placeholder={campo.placeholder}
              rows={4}
              onBlur={e => actualizar(campo.id, e.target.value || undefined)}
              className={`${inputCls} resize-none`}
            />
          </div>
        );
      case "toggle": {
        return (
          <div key={campo.id}>
            {labelEl}
            <div className="flex gap-2">
              {[{ v: true, label: "Sí" }, { v: false, label: "No" }].map(op => (
                <button
                  key={op.label}
                  type="button"
                  onClick={() => actualizar(campo.id, op.v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    valor === op.v
                      ? "bg-[#B3985B] text-black"
                      : "bg-[#0a0a0a] border border-[#2a2a2a] text-[#777] hover:text-white"
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        );
      }
      case "chips": {
        const seleccionados = campo.multiple
          ? (Array.isArray(valor) ? valor : [])
          : (typeof valor === "string" ? [valor] : []);
        return (
          <div key={campo.id}>
            {labelEl}
            <div className="flex gap-2 flex-wrap">
              {campo.opciones?.map(op => {
                const activo = seleccionados.includes(op.id);
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      if (campo.multiple) {
                        const next = activo ? seleccionados.filter(s => s !== op.id) : [...seleccionados, op.id];
                        actualizar(campo.id, next.length ? next : undefined);
                      } else {
                        actualizar(campo.id, activo ? undefined : op.id);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      activo
                        ? "bg-[#B3985B] border-[#B3985B] text-black"
                        : "bg-[#0a0a0a] border-[#2a2a2a] text-[#999] hover:text-white hover:border-[#444]"
                    }`}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case "colores": {
        const colores = Array.isArray(valor) ? valor : [];
        return (
          <div key={campo.id}>
            {labelEl}
            <div className="flex items-center gap-2 flex-wrap">
              {colores.map((c, i) => (
                <div key={i} className="relative group">
                  <div className="w-9 h-9 rounded-lg border border-[#2a2a2a]" style={{ backgroundColor: c }} />
                  <button
                    type="button"
                    onClick={() => actualizar(campo.id, colores.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#333] text-[#999] hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <label className="w-9 h-9 rounded-lg border border-dashed border-[#333] flex items-center justify-center cursor-pointer hover:border-[#B3985B] transition-colors">
                <Plus size={14} className="text-[#666]" />
                <input
                  type="color"
                  className="sr-only"
                  onChange={e => actualizar(campo.id, [...colores, e.target.value])}
                />
              </label>
            </div>
          </div>
        );
      }
      case "referencias": {
        const links = parseLinksLocal(typeof valor === "string" ? valor : undefined);
        return (
          <div key={campo.id} className="space-y-3">
            {labelEl}
            <div className="space-y-1.5">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <LinkIcon size={13} className="text-[#555] shrink-0" />
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B3985B] hover:underline truncate flex-1">
                    {l.label || l.url}
                  </a>
                  <button type="button" onClick={() => actualizar(campo.id, JSON.stringify(links.filter((_, idx) => idx !== i)))}
                    className="text-[#555] hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <AgregarLink onAdd={(l) => actualizar(campo.id, JSON.stringify([...links, l]))} inputCls={inputCls} />

            <div className="space-y-1.5 pt-1">
              {archivos.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <FileText size={13} className="text-[#555] shrink-0" />
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#ccc] hover:text-white truncate flex-1">
                    {a.nombre}
                  </a>
                  <button type="button" onClick={() => borrarArchivo(a.id)} className="text-[#555] hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={subiendo}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[#999] hover:text-white border border-dashed border-[#2a2a2a] hover:border-[#444] rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
              >
                <Upload size={13} />
                {subiendo ? "Subiendo…" : "Subir archivo (imagen, PDF, video…)"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) subirArchivo(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  }

  function renderResumen() {
    return (
      <div className="space-y-4">
        {SECCIONES_BRIEF.map((s, i) => {
          const Icono2 = ICONOS[s.icono];
          const camposVisibles = s.campos.filter(c => campoVisible(c, respuestas));
          return (
            <div key={s.id} className="border border-[#1e1e1e] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Icono2 size={14} style={{ color: dorado }} /> {s.titulo}
                </p>
                <button type="button" onClick={() => setPaso(i)} className="text-xs text-[#B3985B] hover:underline">
                  Editar
                </button>
              </div>
              <div className="space-y-1">
                {camposVisibles.map(c => (
                  <div key={c.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-[#777] shrink-0">{c.label}</span>
                    <span className="text-white text-right">{valorResumenTexto(c, respuestas[c.id])}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={cardCls}>
        {/* Step tabs + autosave/validación — mismo patrón que el descubrimiento del CRM */}
        <div className={`flex items-center justify-between gap-3 flex-wrap ${esCliente ? "px-5 pt-4 pb-2.5" : "px-4 pt-3 pb-2"} border-b border-[#1a1a1a]`}>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {SECCIONES_BRIEF.map((s, i) => {
              const Icono = ICONOS[s.icono];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPaso(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    paso === i ? "bg-[#B3985B] text-black" : "bg-[#111] text-gray-500 hover:text-white border border-[#222] hover:border-[#444]"
                  }`}
                >
                  <Icono strokeWidth={1.75} className="w-3.5 h-3.5" /> {s.titulo}
                </button>
              );
            })}
            {esCliente && (
              <button
                type="button"
                onClick={() => setPaso(totalSecciones)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  esResumen ? "bg-[#B3985B] text-black" : "bg-[#111] text-gray-500 hover:text-white border border-[#222] hover:border-[#444]"
                }`}
              >
                <ClipboardCheck strokeWidth={1.75} className="w-3.5 h-3.5" /> Resumen
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {autoSaveStatus === "saving" && <span className="text-[10px] text-gray-500">Guardando…</span>}
            {autoSaveStatus === "saved" && <span className="text-[10px] text-emerald-500">Guardado ✓</span>}
            {faltantes.length > 0 ? (
              <span
                title={`Faltan: ${faltantes.map(f => f.label).join(", ")}`}
                className="text-[10px] px-2 py-1 rounded-full bg-amber-900/30 text-amber-300 border border-amber-800/40 whitespace-nowrap cursor-default"
              >
                Faltan {faltantes.length} dato{faltantes.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 whitespace-nowrap">
                {esResumen ? "Brief completo" : "Sección completa"}
              </span>
            )}
          </div>
        </div>

        <div className={`${esCliente ? "p-5 md:p-7" : "p-4"} space-y-5`}>
          {!esResumen && seccionActual && (
            <>
              <div className="flex items-center gap-3">
                <div className={`shrink-0 rounded-xl flex items-center justify-center ${esCliente ? "w-10 h-10 bg-[#B3985B]/10" : "w-8 h-8 bg-[#1a1a1a]"}`}>
                  <IconoActual size={esCliente ? 20 : 16} style={{ color: dorado }} />
                </div>
                <div>
                  <p className={esCliente ? "text-lg font-semibold text-white" : "ms-section-label"}>{seccionActual.titulo}</p>
                  {esCliente && <p className="text-xs text-[#888]">{seccionActual.descripcion}</p>}
                </div>
              </div>
              <div className="space-y-4">
                {seccionActual.campos.map(renderCampo)}
              </div>
            </>
          )}
          {esResumen && (
            <>
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#B3985B]/10 flex items-center justify-center">
                  <ClipboardCheck size={20} style={{ color: dorado }} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Resumen</p>
                  <p className="text-xs text-[#888]">Revisa antes de enviar — puedes editar cualquier sección.</p>
                </div>
              </div>
              {renderResumen()}
            </>
          )}
        </div>
      </div>

      {esCliente ? (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={paso === 0}
            onClick={() => setPaso(p => Math.max(0, p - 1))}
            className="flex items-center gap-1 text-sm text-[#888] hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Atrás
          </button>
          <p className="ms-micro text-[#555]">{esResumen ? "Resumen" : `${paso + 1} / ${totalSecciones}`}</p>
          {esResumen ? (
            <button
              type="button"
              disabled={enviando}
              onClick={() => onEnviarFinal?.()}
              className="text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: dorado, color: "#000" }}
            >
              {enviando ? "Enviando…" : "Enviar brief"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPaso(p => Math.min(totalSecciones, p + 1))}
              className="flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: dorado, color: "#000" }}
            >
              {paso === totalSecciones - 1 ? "Ver resumen" : "Siguiente"} <ChevronRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={paso === 0}
            onClick={() => setPaso(p => Math.max(0, p - 1))}
            className="flex items-center gap-1 text-xs text-[#666] hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            type="button"
            disabled={paso === totalSecciones - 1}
            onClick={() => setPaso(p => Math.min(totalSecciones - 1, p + 1))}
            className="flex items-center gap-1 text-xs text-[#666] hover:text-white disabled:opacity-30 transition-colors"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function AgregarLink({ onAdd, inputCls }: { onAdd: (l: LinkRef) => void; inputCls: string }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  return (
    <div className="flex gap-2">
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre (ej. Show de referencia)" className={`${inputCls} max-w-[40%]`} />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={inputCls} />
      <button
        type="button"
        disabled={!url.trim()}
        onClick={() => { onAdd({ label: label.trim(), url: url.trim() }); setUrl(""); setLabel(""); }}
        className="shrink-0 px-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#999] hover:text-white disabled:opacity-40 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
