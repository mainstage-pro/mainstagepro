"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Link2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { MODULOS_ACCESO, buscarModuloAcceso, type AccesoModulo } from "@/lib/nav";

interface Props {
  destino: string;
  texto: string;
  onChange: (destino: string, texto: string) => void;
  onClear: () => void;
}

// Selector de "Acceso directo" de una tarea: un módulo del sidebar (mismo nombre
// e icono) y, opcionalmente, una de sus secciones/pestañas internas — o bien un
// enlace externo. Reutilizable en creación (NuevaTareaModal) y edición (TaskModal).
export default function AccesoDirectoField({ destino, texto, onChange, onClear }: Props) {
  const esExterno = /^https?:\/\//i.test(destino);
  const [modo, setModo] = useState<"interno" | "externo">(esExterno ? "externo" : "interno");
  useEffect(() => { setModo(/^https?:\/\//i.test(destino) ? "externo" : "interno"); }, [destino]);

  // ── Selector de módulo (popover con drill-down a secciones) ──
  const [abierto, setAbierto] = useState(false);
  const [expandido, setExpandido] = useState<AccesoModulo | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setAbierto(false); setExpandido(null); }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [abierto]);

  const sel = !esExterno && destino ? buscarModuloAcceso(destino) : null;
  const IconoSel = sel?.modulo.icon;

  function cerrar() { setAbierto(false); setExpandido(null); }
  function elegirModulo(m: AccesoModulo) {
    if (m.secciones.length === 0) { onChange(m.href, m.label); cerrar(); }
    else setExpandido(m);
  }

  // ── Enlace externo: estado local mientras se escribe ──
  const [url, setUrl] = useState(esExterno ? destino : "");
  const [txt, setTxt] = useState(esExterno ? texto : "");
  useEffect(() => {
    if (/^https?:\/\//i.test(destino)) { setUrl(destino); setTxt(texto); }
  }, [destino, texto]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-[#444] uppercase tracking-widest font-semibold">Acceso directo</p>
        {destino && (
          <button type="button" onClick={onClear} className="text-[10px] text-[#444] hover:text-red-400 transition-colors">Quitar</button>
        )}
      </div>

      {/* Toggle Módulo / Enlace */}
      <div className="flex rounded-lg overflow-hidden border border-[#1a1a1a] mb-2">
        <button
          type="button"
          onClick={() => setModo("interno")}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-all ${
            modo === "interno" ? "bg-[#1a1a1a] text-white" : "text-[#444] hover:text-[#777]"
          }`}
        >
          <ExternalLink strokeWidth={2} className="w-3 h-3" /> Módulo
        </button>
        <div className="w-px bg-[#1a1a1a]" />
        <button
          type="button"
          onClick={() => setModo("externo")}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-all ${
            modo === "externo" ? "bg-[#1a1a1a] text-[#B3985B]" : "text-[#444] hover:text-[#777]"
          }`}
        >
          <Link2 strokeWidth={2} className="w-3 h-3" /> Enlace
        </button>
      </div>

      {modo === "interno" ? (
        <div className="relative" ref={ref}>
          {/* Trigger */}
          <button
            type="button"
            onClick={() => { setAbierto(o => !o); setExpandido(null); }}
            className="w-full flex items-center gap-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-left focus:outline-none hover:border-[#2a2a2a] transition-colors"
          >
            {sel ? (
              <>
                {IconoSel && <IconoSel className="w-3.5 h-3.5 text-[#B3985B] shrink-0" />}
                <span className="flex-1 min-w-0 truncate text-white">
                  {sel.modulo.label}
                  {sel.seccion && <span className="text-[#666]"> · {sel.seccion.label}</span>}
                </span>
              </>
            ) : (
              <span className="flex-1 text-[#555]">— Sin módulo —</span>
            )}
            <ChevronRight className={`w-3.5 h-3.5 text-[#555] shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`} />
          </button>

          {/* Popover */}
          {abierto && (
            <div className="absolute z-[90] left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#242424] bg-[#0d0d0d] shadow-2xl shadow-black/70 py-1">
              {expandido ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandido(null)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] text-[#888] hover:text-white border-b border-[#181818]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> {expandido.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onChange(expandido.href, expandido.label); cerrar(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[#151515]"
                  >
                    {expandido.icon && <expandido.icon className="w-3.5 h-3.5 text-[#B3985B] shrink-0" />}
                    <span className="flex-1 text-white/90">Todo el módulo</span>
                    {destino === expandido.href && <Check className="w-3.5 h-3.5 text-[#B3985B]" />}
                  </button>
                  {expandido.secciones.map(s => (
                    <button
                      key={s.href}
                      type="button"
                      onClick={() => { onChange(s.href, s.label); cerrar(); }}
                      className="w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-xs text-left hover:bg-[#151515]"
                    >
                      <span className="flex-1 text-[#bbb]">{s.label}</span>
                      {destino === s.href && <Check className="w-3.5 h-3.5 text-[#B3985B]" />}
                    </button>
                  ))}
                </div>
              ) : (
                MODULOS_ACCESO.map(g => (
                  <div key={g.seccion}>
                    <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest text-[#3a3a3a] font-semibold">{g.seccion}</p>
                    {g.modulos.map(m => {
                      const activo = destino === m.href || m.secciones.some(s => s.href === destino);
                      const Icono = m.icon;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => elegirModulo(m)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[#151515]"
                        >
                          {Icono && <Icono className={`w-3.5 h-3.5 shrink-0 ${activo ? "text-[#B3985B]" : "text-[#666]"}`} />}
                          <span className={`flex-1 truncate ${activo ? "text-white" : "text-[#ccc]"}`}>{m.label}</span>
                          {m.secciones.length > 0
                            ? <ChevronRight className="w-3.5 h-3.5 text-[#444]" />
                            : activo && <Check className="w-3.5 h-3.5 text-[#B3985B]" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onBlur={() => {
              const v = url.trim();
              if (v) onChange(v, txt.trim());
              else if (destino) onClear();
            }}
            placeholder="https://drive.google.com/…"
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]"
          />
          <input
            value={txt}
            onChange={e => setTxt(e.target.value)}
            onBlur={() => { const v = url.trim(); if (v) onChange(v, txt.trim()); }}
            placeholder="Texto del botón (opcional)"
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]"
          />
        </div>
      )}
    </div>
  );
}
