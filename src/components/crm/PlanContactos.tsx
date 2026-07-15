"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

// ─── Constantes compartidas ──────────────────────────────────────────────────
export const CONTACTOS_INBOUND = [
  { num: 1, label: "Presentación",            objetivo: "Primer contacto. Preséntate y da a conocer quién es Mainstage Pro." },
  { num: 2, label: "Generación de confianza", objetivo: "Comparte trabajo, referencias, casos de éxito relevantes al perfil del cliente." },
  { num: 3, label: "Orientar a información",  objetivo: "Hacer preguntas clave para obtener info suficiente para cotizar." },
];

export const CONTACTOS_OUTBOUND = [
  { num: 1, label: "Presentación de Mainstage Pro", objetivo: "Dar a conocer la empresa, servicios y diferenciadores clave." },
  { num: 2, label: "Generación de confianza #1",    objetivo: "Portfolio, reseñas, casos de éxito relevantes al sector del prospecto." },
  { num: 3, label: "Generación de confianza #2",    objetivo: "Seguimiento proactivo. Nuevo material, estadísticas, mantener presencia." },
  { num: 4, label: "Prospección de evento",         objetivo: "Preguntar si tienen algún evento próximo que podamos atender o cotizar." },
  { num: 5, label: "Propuesta de reunión",          objetivo: "Invitar a una reunión para conocernos y detectar oportunidades en conjunto." },
];

export type ContactoPaso = { num: number; label: string; objetivo: string };
export type NotaSeg = { texto: string; fecha: string };
export type SegItem = { num: number; fecha: string; nota: string };

const COPY_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// ─── Plan de contactos (pasos con checkbox) ──────────────────────────────────
export function PlanContactosSteps({
  contactos,
  esOutbound,
  pasosMarcados,
  onToggle,
  onMarcarTodos,
}: {
  contactos: ContactoPaso[];
  esOutbound: boolean;
  pasosMarcados: number[];
  onToggle: (num: number) => void;
  onMarcarTodos: () => void;
}) {
  const completados = pasosMarcados.filter(n => contactos.some(c => c.num === n)).length;
  const total = contactos.length;
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;

  return (
    <div className={`rounded-xl p-5 ${esOutbound ? "bg-[#0a1a0f] border border-emerald-900/40" : "bg-[#111a0a] border border-amber-900/30"}`}>
      {/* Progreso */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{esOutbound ? "🗺️" : "📋"}</span>
          <p className="text-base font-bold text-white">
            Plan de contactos {esOutbound ? "outbound" : "inbound"}
          </p>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${completados === total ? (esOutbound ? "text-emerald-400" : "text-amber-400") : "text-gray-500"}`}>
          {completados}/{total}
        </span>
      </div>
      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${esOutbound ? "bg-emerald-600" : "bg-amber-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className={`text-xs mb-4 leading-relaxed ${esOutbound ? "text-emerald-600" : "text-amber-600"}`}>
        {esOutbound
          ? "Sigue este orden para construir confianza y generar interés de forma progresiva."
          : "El cliente ya llegó con intención. Estos contactos ayudan a calificar y avanzar al descubrimiento."}
      </p>

      <div className="space-y-2">
        {contactos.map((c) => {
          const marcado = pasosMarcados.includes(c.num);
          return (
            <button
              key={c.num}
              type="button"
              onClick={() => onToggle(c.num)}
              className={`w-full text-left rounded-xl p-4 border transition-all ${
                marcado
                  ? esOutbound
                    ? "bg-emerald-950/40 border-emerald-700/50"
                    : "bg-amber-950/30 border-amber-700/40"
                  : "bg-[#111] border-[#1e1e1e] hover:border-[#333]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  marcado
                    ? esOutbound ? "bg-emerald-700/60 text-emerald-200" : "bg-amber-700/60 text-amber-200"
                    : esOutbound ? "bg-emerald-900/40 text-emerald-600" : "bg-amber-900/40 text-amber-600"
                }`}>
                  {marcado ? "✓" : c.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold mb-0.5 ${
                    marcado ? (esOutbound ? "text-emerald-300 line-through" : "text-amber-300 line-through") : "text-white"
                  }`}>{c.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{c.objetivo}</p>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  marcado
                    ? esOutbound ? "bg-emerald-600 border-emerald-500" : "bg-amber-600 border-amber-500"
                    : "border-[#444]"
                }`}>
                  {marcado && <span className="text-[9px] text-black font-bold">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Marcar todos */}
      {completados !== total && (
        <button
          type="button"
          onClick={onMarcarTodos}
          className="mt-3 w-full py-2 text-[11px] text-gray-600 hover:text-white border border-dashed border-[#2a2a2a] hover:border-[#444] rounded-xl transition-colors"
        >
          ✓ Marcar todos como realizados
        </button>
      )}
    </div>
  );
}

// ─── Material para compartir ─────────────────────────────────────────────────
export function MaterialCompartir({
  tipoEvento,
  esOutbound,
}: {
  tipoEvento: string | null;
  esOutbound: boolean;
}) {
  const toast = useToast();
  const origin = typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app";

  const materiales = [
    { id: "servicios",   label: "📋 Presentación de Servicios",          url: `${origin}/presentacion/servicios` },
    { id: "inventario",  label: "🎛 Catálogo de Inventario",              url: `${origin}/presentacion/inventario` },
    { id: "musical",     label: "🎸 Presentación Eventos Musicales",      url: `${origin}/presentacion/evento/musical` },
    { id: "social",      label: "🎊 Presentación Eventos Sociales",       url: `${origin}/presentacion/evento/social` },
    { id: "empresarial", label: "🏢 Presentación Eventos Empresariales",  url: `${origin}/presentacion/evento/empresarial` },
    { id: "galeria",     label: "📸 Galería de Eventos",                  url: `${origin}/presentacion/galeria` },
  ];

  // Colocar la presentación del tipo de evento seleccionado al principio si existe
  const eventoMapping: Record<string, string> = { MUSICAL: "musical", SOCIAL: "social", EMPRESARIAL: "empresarial" };
  const tipoId = tipoEvento ? eventoMapping[tipoEvento] : undefined;
  if (tipoId) {
    const idx = materiales.findIndex(m => m.id === tipoId);
    if (idx > -1) {
      const [item] = materiales.splice(idx, 1);
      materiales.unshift(item);
    }
  }

  return (
    <div className="pt-2 pb-2">
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${esOutbound ? "text-emerald-500" : "text-[#B3985B]"}`}>Material para compartir</p>
      <div className="flex flex-col gap-2">
        {materiales.map((m, i) => (
          <div key={m.url} className="flex items-center gap-2">
            <a href={m.url} target="_blank" rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-left transition-colors ${
                i === 0
                  ? (esOutbound ? "bg-emerald-900/10 border-emerald-700/30 hover:bg-emerald-900/20" : "bg-[#B3985B]/10 border-[#B3985B]/30 hover:bg-[#B3985B]/20")
                  : "bg-[#111] border-[#2a2a2a] hover:border-[#444]"
              }`}>
              <span className={`text-sm font-medium ${i === 0 ? "text-white" : "text-gray-300"}`}>{m.label}</span>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(m.url);
                toast.success("Enlace copiado al portapapeles");
              }}
              className={`shrink-0 flex items-center gap-1.5 border rounded-lg px-3 py-2 transition-colors ${
                i === 0
                  ? (esOutbound ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/40" : "bg-[#B3985B]/20 border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/30")
                  : "bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#555]"
              }`}
            >
              {COPY_ICON}<span className="text-[10px] uppercase font-bold">Copiar</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Notas de seguimiento (multi-entrada con fecha y hora) ───────────────────
export function NotasSeguimiento({
  notas,
  onAdd,
  esOutbound,
}: {
  notas: NotaSeg[];
  onAdd: (texto: string) => void | Promise<void>;
  esOutbound: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  async function agregar() {
    const t = texto.trim();
    if (!t) return;
    setSaving(true);
    await onAdd(t);
    setTexto("");
    setSaving(false);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("es-MX", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div>
      <p className="text-base font-bold text-white mb-1">Notas de seguimiento</p>
      <p className="text-xs text-gray-500 mb-3">Registra respuestas, avances, solicitudes o cualquier dato relevante.</p>

      {notas.length > 0 && (
        <div className="space-y-2 mb-3">
          {[...notas].reverse().map((n, i) => (
            <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-600 mb-1 tabular-nums">{fmt(n.fecha)}</p>
              <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{n.texto}</p>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={3}
        placeholder="Escribe una nota de seguimiento..."
        className={`w-full bg-[#111] border hover:border-[#333] rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none placeholder-gray-700 transition-colors ${
          esOutbound ? "border-[#222] focus:border-emerald-700/60" : "border-[#222] focus:border-amber-700/60"
        }`}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={agregar}
          disabled={saving || !texto.trim()}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
            esOutbound
              ? "bg-emerald-700/20 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-700/30"
              : "bg-[#B3985B] text-black hover:bg-[#c9a96a]"
          }`}
        >
          {saving ? "Guardando..." : "Agregar nota"}
        </button>
      </div>
    </div>
  );
}

// ─── Seguimientos (registro 1/2/3 antes del descubrimiento) ──────────────────
export function SeguimientosTracker({
  seguimientos,
  maxSlots,
  esOutbound,
  saving,
  onMarcar,
  onAgregarSlot,
  onPasarDescubrimiento,
  onMarcarPerdida,
  labelContinuar = "🔍 Pasar a descubrimiento →",
}: {
  seguimientos: SegItem[];
  maxSlots: number;
  esOutbound: boolean;
  saving: boolean;
  onMarcar: (num: number, nota: string) => void | Promise<void>;
  onAgregarSlot: () => void;
  onPasarDescubrimiento: (saltar: boolean) => void;
  onMarcarPerdida: (motivo: string) => void | Promise<void>;
  labelContinuar?: string;
}) {
  const [nota, setNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mostrarPerdida, setMostrarPerdida] = useState(false);

  const hechos = seguimientos.length;
  const proximoNum = hechos + 1;
  const todosHechos = hechos >= maxSlots;

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  async function registrar() {
    const t = nota.trim();
    if (!t) return;
    await onMarcar(proximoNum, t);
    setNota("");
  }

  return (
    <div className={`rounded-2xl p-5 border ${esOutbound ? "bg-[#0a1a0f] border-emerald-900/40" : "bg-[#1a1206] border-amber-900/40"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">📌</span>
          <p className="text-base font-bold text-white">Seguimientos del prospecto</p>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${todosHechos ? (esOutbound ? "text-emerald-400" : "text-amber-400") : "text-gray-500"}`}>
          {hechos}/{maxSlots}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Registra cada contacto antes de pasar al descubrimiento. Al 3.º seguimiento puedes marcar la venta como perdida o agregar más.
      </p>

      {/* Seguimientos ya registrados */}
      <div className="space-y-2 mb-3">
        {Array.from({ length: maxSlots }).map((_, i) => {
          const num = i + 1;
          const item = seguimientos.find(s => s.num === num);
          const esProximo = num === proximoNum;
          return (
            <div
              key={num}
              className={`rounded-xl p-3 border ${
                item
                  ? esOutbound ? "bg-emerald-950/40 border-emerald-700/50" : "bg-amber-950/30 border-amber-700/40"
                  : esProximo ? "bg-[#111] border-[#333]" : "bg-[#0d0d0d] border-[#1a1a1a] opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  item
                    ? esOutbound ? "bg-emerald-700/60 text-emerald-200" : "bg-amber-700/60 text-amber-200"
                    : "bg-[#1e1e1e] text-gray-500"
                }`}>
                  {item ? "✓" : num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${item ? "text-white" : "text-gray-400"}`}>
                    Seguimiento {num}
                    {item && <span className="text-[10px] text-gray-500 font-normal ml-2 tabular-nums">{fmt(item.fecha)}</span>}
                  </p>
                  {item && <p className="text-gray-300 text-xs mt-1 whitespace-pre-wrap leading-relaxed">{item.nota}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registrar el próximo seguimiento */}
      {!todosHechos && (
        <div className="mb-3">
          <textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            rows={2}
            placeholder={`¿Cómo estuvo el seguimiento ${proximoNum}? Respuesta, interés, próximos pasos...`}
            className={`w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none placeholder-gray-700 transition-colors ${
              esOutbound ? "focus:border-emerald-700/60" : "focus:border-amber-700/60"
            }`}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={registrar}
              disabled={saving || !nota.trim()}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
                esOutbound
                  ? "bg-emerald-700/20 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-700/30"
                  : "bg-[#B3985B] text-black hover:bg-[#c9a96a]"
              }`}
            >
              {saving ? "Guardando..." : `Registrar seguimiento ${proximoNum}`}
            </button>
          </div>
        </div>
      )}

      {/* Al completar los 3: marcar perdida o agregar seguimiento */}
      {todosHechos && !mostrarPerdida && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setMostrarPerdida(true)}
            className="py-2.5 rounded-xl text-xs font-bold bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            ✕ Marcar como perdida
          </button>
          <button
            onClick={onAgregarSlot}
            className="py-2.5 rounded-xl text-xs font-bold bg-[#111] border border-[#2a2a2a] text-gray-300 hover:border-[#444] transition-colors"
          >
            + Agregar seguimiento
          </button>
        </div>
      )}

      {/* Formulario de motivo de pérdida */}
      {mostrarPerdida && (
        <div className="mb-3 p-3 rounded-xl border border-red-800/40 bg-red-900/10">
          <p className="text-red-300 text-xs font-semibold mb-2">Motivo de la pérdida</p>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={2}
            placeholder="Precio, tiempo, eligió a otro proveedor, sin presupuesto..."
            className="w-full bg-[#111] border border-red-900/40 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-red-700/60 placeholder-gray-700"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setMostrarPerdida(false); setMotivo(""); }} className="px-3 py-2 text-xs text-gray-500 hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => onMarcarPerdida(motivo.trim())}
              disabled={saving || !motivo.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-700/30 border border-red-700/50 text-red-200 hover:bg-red-700/40 transition-colors disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Confirmar pérdida"}
            </button>
          </div>
        </div>
      )}

      {/* Pasar a descubrimiento / saltar */}
      <div className="pt-3 border-t border-[#1e1e1e]">
        <button
          onClick={() => onPasarDescubrimiento(false)}
          disabled={saving}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
            esOutbound
              ? "bg-emerald-700/20 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-700/30"
              : "bg-violet-700/20 border border-violet-700/40 text-violet-300 hover:bg-violet-700/30"
          }`}
        >
          {labelContinuar}
        </button>
        {hechos === 0 && (
          <div className="flex justify-center mt-2">
            <button onClick={() => onPasarDescubrimiento(true)} disabled={saving} className="text-[11px] text-gray-600 hover:text-white transition-colors">
              Saltar seguimiento e ir directo al descubrimiento →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
