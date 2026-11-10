"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardList, Palette, Settings2, Music4, Handshake,
  Upload, X, Plus, Link as LinkIcon, ChevronLeft, ChevronRight, FileText, Trash2,
} from "lucide-react";
import {
  SECCIONES_BRIEF,
  serializeBriefDetalle,
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

function campoVisible(campo: CampoBrief, respuestas: RespuestasBrief): boolean {
  if (!campo.mostrarSi) return true;
  return respuestas[campo.mostrarSi.campoId] === campo.mostrarSi.valor;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(archivosEndpoint).then(r => r.json()).then(d => setArchivos(d.archivos ?? [])).catch(() => {});
  }, [archivosEndpoint]);

  function actualizar(campoId: string, valor: string | string[] | boolean | undefined) {
    const siguiente = { ...respuestas, [campoId]: valor };
    setRespuestas(siguiente);
    onGuardar(serializeBriefDetalle(siguiente));
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

  const seccionActual = SECCIONES_BRIEF[paso];
  const Icono = ICONOS[seccionActual.icono];

  const cardCls = esCliente
    ? "bg-[#111] border border-[#1e1e1e] rounded-2xl"
    : "ms-card";

  function renderCampo(campo: CampoBrief) {
    if (!campoVisible(campo, respuestas)) return null;
    const valor = respuestas[campo.id];

    const labelEl = (
      <div className="mb-1.5">
        <label className={esCliente ? "text-sm font-medium text-white" : "text-[10px] uppercase tracking-wider text-[#666] block"}>
          {campo.label}
        </label>
        {campo.ayuda && <p className={esCliente ? "text-xs text-[#888] mt-0.5" : "ms-micro mt-0.5"}>{campo.ayuda}</p>}
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

  return (
    <div className="space-y-4">
      {esCliente && (
        <div className="flex items-center gap-1.5">
          {SECCIONES_BRIEF.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPaso(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= paso ? "bg-[#B3985B]" : "bg-[#222]"}`}
              aria-label={s.titulo}
            />
          ))}
        </div>
      )}

      <div className={`${cardCls} ${esCliente ? "p-5 md:p-7" : "p-4"} space-y-5`}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 rounded-xl flex items-center justify-center ${esCliente ? "w-10 h-10 bg-[#B3985B]/10" : "w-8 h-8 bg-[#1a1a1a]"}`}>
            <Icono size={esCliente ? 20 : 16} style={{ color: dorado }} />
          </div>
          <div>
            <p className={esCliente ? "text-lg font-semibold text-white" : "ms-section-label"}>{seccionActual.titulo}</p>
            {esCliente && <p className="text-xs text-[#888]">{seccionActual.descripcion}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {seccionActual.campos.map(renderCampo)}
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
          <p className="ms-micro text-[#555]">{paso + 1} / {SECCIONES_BRIEF.length}</p>
          {paso < SECCIONES_BRIEF.length - 1 ? (
            <button
              type="button"
              onClick={() => setPaso(p => Math.min(SECCIONES_BRIEF.length - 1, p + 1))}
              className="flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: dorado, color: "#000" }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={enviando}
              onClick={() => onEnviarFinal?.()}
              className="text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: dorado, color: "#000" }}
            >
              {enviando ? "Enviando…" : "Enviar brief"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          {SECCIONES_BRIEF.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPaso(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                i === paso ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
              }`}
            >
              {s.titulo}
            </button>
          ))}
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
