"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone, Mail, MapPin, ArrowRight, Copy, Check, Compass } from "lucide-react";

// Panel "Siguiente paso" stage-aware: lee la subetapa actual del trato y sus
// pasos configurados (guiones, cadencia, canal) desde la estructura editable en
// BD (GET /api/tratos/[id]/proceso). No hardcodea textos: si la config cambia,
// el panel cambia. Es guía de solo lectura (el checklist accionable vive en
// TareasTratoTab), estilo "Guidance for success" de Salesforce Path.

type Paso = {
  id: string;
  orden: number;
  dia: number;
  diaUrgente: number | null;
  titulo: string;
  objetivo: string;
  guion: string;
  canal: string;
  herramienta: string | null;
  avanzaSubetapaA: string | null;
};

type Subetapa = {
  id: string;
  etapa: string;
  etapaInterna: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  pasos: Paso[];
};

const CANAL_META: Record<string, { label: string; Icon: typeof MessageCircle; color: string }> = {
  WHATSAPP: { label: "WhatsApp", Icon: MessageCircle, color: "text-green-400" },
  LLAMADA: { label: "Llamada", Icon: Phone, color: "text-blue-400" },
  EMAIL: { label: "Email", Icon: Mail, color: "text-amber-400" },
  PRESENCIAL: { label: "Presencial", Icon: MapPin, color: "text-violet-400" },
};

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export default function SiguientePasoPanel({
  tratoId,
  etapaInterna,
  etapaCambiadaEn,
}: {
  tratoId: string;
  etapaInterna: string | null;
  etapaCambiadaEn: string | null;
}) {
  const [subetapa, setSubetapa] = useState<Subetapa | null>(null);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    fetch(`/api/tratos/${tratoId}/proceso`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!vivo) return;
        setSubetapa(d.subetapa ?? null);
        setTelefono(d.telefono ?? null);
      })
      .catch(() => vivo && setSubetapa(null))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [tratoId, etapaInterna]);

  if (loading) {
    return (
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5">
        <div className="h-4 w-40 bg-[#1a1a1a] rounded animate-pulse mb-3" />
        <div className="h-3 w-full bg-[#141414] rounded animate-pulse" />
      </div>
    );
  }

  if (!subetapa || subetapa.pasos.length === 0) return null;

  const offset = diasDesde(etapaCambiadaEn);
  const pasos = [...subetapa.pasos].sort((a, b) => a.orden - b.orden);
  // El "siguiente paso" es el primero cuya cadencia (día) aún no vence; si todos
  // ya vencieron, apunta al último (el más avanzado de la subetapa).
  const idxSiguiente =
    offset == null
      ? 0
      : (() => {
          const i = pasos.findIndex((p) => p.dia >= offset);
          return i === -1 ? pasos.length - 1 : i;
        })();
  const siguiente = pasos[idxSiguiente];

  const num = telefono ? (telefono.replace(/\D/g, "").startsWith("52") ? telefono.replace(/\D/g, "") : `52${telefono.replace(/\D/g, "")}`) : null;

  const copiar = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado((c) => (c === id ? null : c)), 1500);
    } catch {}
  };

  const canalMeta = (canal: string) => CANAL_META[canal] ?? { label: canal, Icon: Compass, color: "text-gray-400" };

  const sm = canalMeta(siguiente.canal);

  return (
    <div className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-2xl overflow-hidden">
      {/* Header: subetapa actual */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#141414]">
        <div className="w-8 h-8 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/25 flex items-center justify-center shrink-0">
          <Compass strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white tracking-tight">Siguiente paso · {subetapa.nombre}</h2>
          {subetapa.descripcion && <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-1">{subetapa.descripcion}</p>}
        </div>
      </div>

      {/* Paso destacado */}
      <div className="p-5 space-y-4">
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2 min-w-0">
              <sm.Icon strokeWidth={1.75} className={`w-4 h-4 shrink-0 ${sm.color}`} />
              <span className="text-sm font-semibold text-white truncate">{siguiente.titulo}</span>
            </div>
            <span className="text-[10px] text-gray-600 shrink-0">
              {siguiente.dia === 0 ? "Ahora" : `Día ${siguiente.dia}`}
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            {siguiente.objetivo && <p className="text-xs text-gray-400">{siguiente.objetivo}</p>}
            {siguiente.guion && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">Guion · {sm.label}</span>
                  <button
                    onClick={() => copiar(siguiente.id, siguiente.guion)}
                    className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
                  >
                    {copiado === siguiente.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copiado === siguiente.id ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">{siguiente.guion}</p>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {siguiente.canal === "WHATSAPP" && num && (
                <a
                  href={`https://wa.me/${num}?text=${encodeURIComponent(siguiente.guion)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-green-900/30 hover:bg-green-800/50 border border-green-700/40 text-green-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  <MessageCircle strokeWidth={1.75} className="w-3.5 h-3.5" /> Enviar WhatsApp
                </a>
              )}
              {siguiente.canal === "LLAMADA" && num && (
                <a
                  href={`tel:+${num}`}
                  className="inline-flex items-center gap-1.5 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-700/40 text-blue-400 text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Phone strokeWidth={1.75} className="w-3.5 h-3.5" /> Llamar
                </a>
              )}
              {siguiente.herramienta && (
                <span className="text-[10px] text-gray-600 border border-[#222] rounded-md px-2 py-1">{siguiente.herramienta}</span>
              )}
            </div>
          </div>
        </div>

        {/* Resto del plan de la subetapa */}
        {pasos.length > 1 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Plan de la subetapa</p>
            <ol className="space-y-1">
              {pasos.map((p, i) => {
                const m = canalMeta(p.canal);
                const esSiguiente = i === idxSiguiente;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-2.5 text-xs rounded-lg px-3 py-2 border ${
                      esSiguiente ? "bg-[#B3985B]/10 border-[#B3985B]/25" : "bg-[#111] border-[#1a1a1a]"
                    }`}
                  >
                    <span className="text-gray-600 tabular-nums shrink-0 w-10">{p.dia === 0 ? "Ahora" : `D+${p.dia}`}</span>
                    <m.Icon strokeWidth={1.75} className={`w-3.5 h-3.5 shrink-0 ${m.color}`} />
                    <span className={`flex-1 min-w-0 truncate ${esSiguiente ? "text-white font-medium" : "text-gray-400"}`}>{p.titulo}</span>
                    {p.avanzaSubetapaA && <ArrowRight strokeWidth={1.75} className="w-3 h-3 text-gray-700 shrink-0" />}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
