"use client";
import { useState } from "react";
import {
  CampanaBrief,
  OBJETIVOS_BRIEF,
  OBJETIVO_BRIEF_LABEL,
  HERRAMIENTAS_LABEL,
  LANZAMIENTO_LABEL,
  KPIS_POR_OBJETIVO,
  HerramientasVenta,
  ChecklistLanzamiento,
  isBriefCompleto,
} from "@/lib/campana-brief";

const INPUT =
  "w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]";
const LABEL = "block text-xs text-white/40 mb-1";

function Section({
  n,
  title,
  hint,
  children,
  defaultOpen = false,
  done,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  done?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
      >
        <span className="text-[10px] w-5 h-5 rounded-full bg-[#B3985B]/15 text-[#B3985B] flex items-center justify-center shrink-0">
          {n}
        </span>
        <span className="text-xs font-medium text-white/80 flex-1">{title}</span>
        {done && <span className="text-[10px] text-green-400">✓</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
          <polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>
      {open && (
        <div className="p-3 space-y-3">
          {hint && <p className="text-[11px] text-white/30 -mt-0.5">{hint}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
        checked ? "border-[#B3985B]/40 bg-[#B3985B]/10 text-white" : "border-white/10 text-white/40 hover:border-white/20"
      }`}
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
          checked ? "bg-[#B3985B] text-black" : "border border-white/20"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

export function BriefEditor({ value, onChange }: { value: CampanaBrief; onChange: (b: CampanaBrief) => void }) {
  const b = value;
  const set = (patch: Partial<CampanaBrief>) => onChange({ ...b, ...patch });
  const kpisSugeridos = b.objetivo ? KPIS_POR_OBJETIVO[b.objetivo] ?? [] : [];

  return (
    <div className="space-y-2">
      {/* 1. Datos generales */}
      <Section n={1} title="Datos generales" hint="Nombre, fechas y presupuesto se toman de la campaña." defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Marca</label>
            <input className={INPUT} value={b.marca} onChange={(e) => set({ marca: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Responsable</label>
            <input className={INPUT} value={b.responsable} onChange={(e) => set({ responsable: e.target.value })} />
          </div>
        </div>
      </Section>

      {/* 2. Objetivo */}
      <Section n={2} title="Objetivo" hint="Un solo objetivo por campaña." done={!!b.objetivo}>
        <div className="flex gap-2 flex-wrap">
          {OBJETIVOS_BRIEF.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => set({ objetivo: o })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                b.objetivo === o
                  ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"
              }`}
            >
              {OBJETIVO_BRIEF_LABEL[o]}
            </button>
          ))}
        </div>
      </Section>

      {/* 3. Audiencia */}
      <Section n={3} title="Audiencia">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className={LABEL}>Ubicación</label>
            <input className={INPUT} value={b.ubicacion} onChange={(e) => set({ ubicacion: e.target.value })} placeholder="Ciudades, radio…" />
          </div>
          <div>
            <label className={LABEL}>Edad mín.</label>
            <input type="number" className={INPUT} value={b.edadMin} onChange={(e) => set({ edadMin: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Edad máx.</label>
            <input type="number" className={INPUT} value={b.edadMax} onChange={(e) => set({ edadMax: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Intereses</label>
          <textarea rows={2} className={`${INPUT} resize-none`} value={b.intereses} onChange={(e) => set({ intereses: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Públicos personalizados</label>
            <textarea rows={2} className={`${INPUT} resize-none`} value={b.publicosPersonalizados} onChange={(e) => set({ publicosPersonalizados: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Exclusiones</label>
            <textarea rows={2} className={`${INPUT} resize-none`} value={b.exclusiones} onChange={(e) => set({ exclusiones: e.target.value })} />
          </div>
        </div>
      </Section>

      {/* 4. Creatividad */}
      <Section n={4} title="Creatividad" hint="Mínimo 2 variantes de copy.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Formato</label>
            <input className={INPUT} value={b.formato} onChange={(e) => set({ formato: e.target.value })} placeholder="Video, imagen, carrusel…" />
          </div>
          <div>
            <label className={LABEL}>CTA</label>
            <input className={INPUT} value={b.cta} onChange={(e) => set({ cta: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Destino del clic</label>
          <input className={INPUT} value={b.destinoClic} onChange={(e) => set({ destinoClic: e.target.value })} placeholder="WhatsApp, formulario, landing…" />
        </div>
        <div className="space-y-2">
          <label className={LABEL}>Variantes de copy</label>
          {b.copies.map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <textarea
                rows={2}
                className={`${INPUT} resize-none`}
                value={c}
                onChange={(e) => set({ copies: b.copies.map((x, j) => (j === i ? e.target.value : x)) })}
                placeholder={`Variante ${i + 1}`}
              />
              {b.copies.length > 2 && (
                <button
                  type="button"
                  onClick={() => set({ copies: b.copies.filter((_, j) => j !== i) })}
                  className="text-white/25 hover:text-red-400 px-2 py-2 text-xs shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ copies: [...b.copies, ""] })}
            className="text-xs text-[#B3985B] hover:underline"
          >
            + Agregar variante
          </button>
        </div>
      </Section>

      {/* 5. Bloque condicional según objetivo */}
      {(b.objetivo === "LEADS" || b.objetivo === "MENSAJES" || b.objetivo === "CONVERSION") && (
        <Section n={5} title={`Específico de ${OBJETIVO_BRIEF_LABEL[b.objetivo]}`} defaultOpen>
          {b.objetivo === "LEADS" && (
            <>
              <div>
                <label className={LABEL}>Preguntas del formulario</label>
                <textarea rows={2} className={`${INPUT} resize-none`} value={b.leads.preguntas} onChange={(e) => set({ leads: { ...b.leads, preguntas: e.target.value } })} />
              </div>
              <div>
                <label className={LABEL}>Mensaje de bienvenida</label>
                <textarea rows={2} className={`${INPUT} resize-none`} value={b.leads.mensajeBienvenida} onChange={(e) => set({ leads: { ...b.leads, mensajeBienvenida: e.target.value } })} />
              </div>
              <div>
                <label className={LABEL}>Destino del lead</label>
                <input className={INPUT} value={b.leads.destinoLead} onChange={(e) => set({ leads: { ...b.leads, destinoLead: e.target.value } })} placeholder="CRM, WhatsApp, hoja…" />
              </div>
            </>
          )}
          {b.objetivo === "MENSAJES" && (
            <>
              <div>
                <label className={LABEL}>Script de apertura</label>
                <textarea rows={2} className={`${INPUT} resize-none`} value={b.mensajes.scriptApertura} onChange={(e) => set({ mensajes: { ...b.mensajes, scriptApertura: e.target.value } })} />
              </div>
              <div>
                <label className={LABEL}>Preguntas de calificación</label>
                <textarea rows={2} className={`${INPUT} resize-none`} value={b.mensajes.preguntasCalificacion} onChange={(e) => set({ mensajes: { ...b.mensajes, preguntasCalificacion: e.target.value } })} />
              </div>
            </>
          )}
          {b.objetivo === "CONVERSION" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Landing</label>
                <input className={INPUT} value={b.conversion.landing} onChange={(e) => set({ conversion: { ...b.conversion, landing: e.target.value } })} />
              </div>
              <div>
                <label className={LABEL}>Evento de pixel (conversión)</label>
                <input className={INPUT} value={b.conversion.eventoPixel} onChange={(e) => set({ conversion: { ...b.conversion, eventoPixel: e.target.value } })} placeholder="Lead, Purchase…" />
              </div>
            </div>
          )}
        </Section>
      )}

      {/* 6. Atención al prospecto */}
      <Section n={6} title="Atención al prospecto (SLA)">
        <div className="space-y-2">
          {b.atencion.map((et, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr_1fr] gap-2 items-center">
              <span className="text-xs text-white/50">{et.etapa}</span>
              <input
                className={INPUT}
                value={et.responsable}
                placeholder="Responsable"
                onChange={(e) => set({ atencion: b.atencion.map((x, j) => (j === i ? { ...x, responsable: e.target.value } : x)) })}
              />
              <input
                className={INPUT}
                value={et.accion}
                placeholder="Acción"
                onChange={(e) => set({ atencion: b.atencion.map((x, j) => (j === i ? { ...x, accion: e.target.value } : x)) })}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 7. Herramientas de venta */}
      <Section n={7} title="Herramientas de venta requeridas">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(HERRAMIENTAS_LABEL) as (keyof HerramientasVenta)[]).map((k) => (
            <Check
              key={k}
              checked={b.herramientas[k]}
              onChange={(v) => set({ herramientas: { ...b.herramientas, [k]: v } })}
              label={HERRAMIENTAS_LABEL[k]}
            />
          ))}
        </div>
      </Section>

      {/* 8. KPIs */}
      <Section n={8} title="KPIs a medir" hint={b.objetivo ? "Sugeridos según el objetivo." : "Elige un objetivo para ver los KPIs sugeridos."}>
        <div className="flex gap-2 flex-wrap">
          {kpisSugeridos.map((k) => {
            const on = b.kpis.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => set({ kpis: on ? b.kpis.filter((x) => x !== k) : [...b.kpis, k] })}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  on ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                }`}
              >
                {k}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 9. Checklist de lanzamiento */}
      <Section n={9} title="Checklist de lanzamiento" hint="Define si el brief está completo." done={isBriefCompleto(b)} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LANZAMIENTO_LABEL) as (keyof ChecklistLanzamiento)[]).map((k) => (
            <Check
              key={k}
              checked={b.lanzamiento[k]}
              onChange={(v) => set({ lanzamiento: { ...b.lanzamiento, [k]: v } })}
              label={LANZAMIENTO_LABEL[k]}
            />
          ))}
        </div>
        <div
          className={`mt-1 text-xs px-3 py-2 rounded-lg ${
            isBriefCompleto(b) ? "bg-green-900/20 text-green-300" : "bg-yellow-900/15 text-yellow-300/80"
          }`}
        >
          {isBriefCompleto(b) ? "Brief completo — la campaña puede lanzarse." : "Brief incompleto — no podrá ponerse en ejecución."}
        </div>
      </Section>
    </div>
  );
}
