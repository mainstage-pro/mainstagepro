'use client';
import React from 'react';

const TA = "w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/40 resize-none leading-relaxed";
const LB = "block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1.5";

export interface ReporteAnalisisSectionProps {
  title?: string;
  analisis:    string; onAnalisis:    (v: string) => void;
  propuesta1:  string; onPropuesta1:  (v: string) => void;
  propuesta2:  string; onPropuesta2:  (v: string) => void;
  propuesta3:  string; onPropuesta3:  (v: string) => void;
  comentarios: string; onComentarios: (v: string) => void;
  saving?: boolean;
  footer?: React.ReactNode;
  ph?: { analisis?: string; propuesta1?: string; propuesta2?: string; propuesta3?: string; comentarios?: string; };
}

export function ReporteAnalisisSection({
  title = 'Análisis y propuestas de mejora',
  analisis, onAnalisis, propuesta1, onPropuesta1, propuesta2, onPropuesta2,
  propuesta3, onPropuesta3, comentarios, onComentarios,
  saving, footer, ph = {},
}: ReporteAnalisisSectionProps) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#B3985B]">{title}</h3>
        {saving && <span className="text-[10px] text-[#555] animate-pulse">Guardando…</span>}
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className={LB}>Análisis del período</label>
          <textarea value={analisis} onChange={e => onAnalisis(e.target.value)} rows={5}
            placeholder={ph.analisis ?? '¿Qué creció? ¿Qué bajó? ¿Por qué? Describe los factores clave…'} className={TA} />
        </div>
        <div>
          <label className={LB}>Propuesta de mejora 1</label>
          <textarea value={propuesta1} onChange={e => onPropuesta1(e.target.value)} rows={2}
            placeholder={ph.propuesta1 ?? 'Primera acción de mejora…'} className={TA} />
        </div>
        <div>
          <label className={LB}>Propuesta de mejora 2</label>
          <textarea value={propuesta2} onChange={e => onPropuesta2(e.target.value)} rows={2}
            placeholder={ph.propuesta2 ?? 'Segunda acción de mejora…'} className={TA} />
        </div>
        <div>
          <label className={LB}>Propuesta de mejora 3</label>
          <textarea value={propuesta3} onChange={e => onPropuesta3(e.target.value)} rows={2}
            placeholder={ph.propuesta3 ?? 'Tercera acción de mejora…'} className={TA} />
        </div>
        <div>
          <label className={LB}>Comentarios finales</label>
          <textarea value={comentarios} onChange={e => onComentarios(e.target.value)} rows={3}
            placeholder={ph.comentarios ?? 'Observaciones adicionales, contexto externo, compromisos para el próximo período…'} className={TA} />
        </div>
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-[#1e1e1e] flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}
