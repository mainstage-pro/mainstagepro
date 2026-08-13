"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { MESES, type CalendarioDef, type Entrada } from "@/lib/calendarios";

const inputCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] focus:outline-none";
const labelCls = "block text-[11px] uppercase tracking-wider text-gray-500 mb-1";

const SERVICIOS = ["RENTA", "PRODUCCION_TECNICA", "DIRECCION_TECNICA", "MULTISERVICIO"];
const SERVICIO_LABEL: Record<string, string> = {
  RENTA: "Renta", PRODUCCION_TECNICA: "Producción técnica",
  DIRECCION_TECNICA: "Dirección técnica", MULTISERVICIO: "Multiservicio",
};

export interface TipoEventoOpt { slug: string; nombre: string; emoji?: string | null }

export default function EntradaModal({
  open, onClose, cal, entrada, initialMes, initialDia, tiposEvento = [], onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cal: CalendarioDef;
  entrada?: Entrada | null;
  initialMes?: number;   // 1-12 al crear desde un día
  initialDia?: number | null;
  tiposEvento?: TipoEventoOpt[];
  onSaved: () => void;
}) {
  const editing = !!entrada;
  const [tipo, setTipo] = useState(cal.tipos[0].key);
  const [icono, setIcono] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [mesInicio, setMesInicio] = useState(1);
  const [diaInicio, setDiaInicio] = useState<string>("");
  const [esRango, setEsRango] = useState(false);
  const [mesFin, setMesFin] = useState(1);
  const [diaFin, setDiaFin] = useState<string>("");
  const [recurrente, setRecurrente] = useState(true);
  const [anio, setAnio] = useState<string>(String(new Date().getFullYear()));
  const [ideas, setIdeas] = useState("");
  const [tipoEventoSlug, setTipoEventoSlug] = useState("");
  const [servicio, setServicio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tipoActual = useMemo(() => cal.tipos.find(t => t.key === tipo) ?? cal.tipos[0], [cal, tipo]);

  useEffect(() => {
    if (!open) return;
    if (entrada) {
      setTipo(entrada.tipo); setIcono(entrada.icono ?? ""); setTitulo(entrada.titulo);
      setDescripcion(entrada.descripcion ?? "");
      setMesInicio(entrada.mesInicio); setDiaInicio(entrada.diaInicio?.toString() ?? "");
      setEsRango(entrada.mesFin != null);
      setMesFin(entrada.mesFin ?? entrada.mesInicio); setDiaFin(entrada.diaFin?.toString() ?? "");
      setRecurrente(entrada.anio == null); setAnio(String(entrada.anio ?? new Date().getFullYear()));
      setIdeas(entrada.ideas ?? "");
      setTipoEventoSlug(entrada.tipoEventoSlug ?? ""); setServicio(entrada.servicio ?? "");
    } else {
      const t0 = cal.tipos[0];
      setTipo(t0.key); setIcono(""); setTitulo(""); setDescripcion("");
      setMesInicio(initialMes ?? new Date().getMonth() + 1);
      setDiaInicio(initialDia != null ? String(initialDia) : "");
      setEsRango(!!t0.periodo); setMesFin(initialMes ?? new Date().getMonth() + 1); setDiaFin("");
      setRecurrente(true); setAnio(String(new Date().getFullYear()));
      setIdeas(""); setTipoEventoSlug(""); setServicio("");
    }
    setError("");
  }, [open, entrada, cal, initialMes, initialDia]);

  async function guardar() {
    if (!titulo.trim()) { setError("Escribe un título"); return; }
    setSaving(true); setError("");
    const payload = {
      calendario: cal.key,
      tipo, icono: icono.trim() || null, titulo: titulo.trim(), descripcion: descripcion.trim() || null,
      mesInicio, diaInicio: diaInicio || null,
      mesFin: esRango ? mesFin : null, diaFin: esRango ? (diaFin || null) : null,
      anio: recurrente ? null : Number(anio),
      ideas: ideas.trim() || null,
      tipoEventoSlug: cal.ligaTipoEvento ? (tipoEventoSlug || null) : null,
      servicio: cal.ligaServicio ? (servicio || null) : null,
    };
    try {
      const url = editing ? `/api/calendarios/entradas/${entrada!.id}` : "/api/calendarios/entradas";
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      onSaved(); onClose();
    } catch {
      setError("No se pudo guardar");
    } finally { setSaving(false); }
  }

  async function eliminar() {
    if (!entrada) return;
    if (!confirm("¿Eliminar esta entrada?")) return;
    setSaving(true);
    try {
      await fetch(`/api/calendarios/entradas/${entrada.id}`, { method: "DELETE" });
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar entrada" : `Nueva en ${cal.nombre}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Tipo (chips) */}
        <div>
          <label className={labelCls}>Tipo</label>
          <div className="flex flex-wrap gap-1.5">
            {cal.tipos.map(t => (
              <button key={t.key} type="button"
                onClick={() => { setTipo(t.key); if (t.periodo && !esRango) setEsRango(true); }}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${tipo === t.key ? "text-white" : "text-gray-400 border-[#2a2a2a] hover:text-white"}`}
                style={tipo === t.key ? { borderColor: t.color, backgroundColor: t.color + "22" } : undefined}>
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-16">
            <label className={labelCls}>Emoji</label>
            <input value={icono} onChange={e => setIcono(e.target.value)} maxLength={4} className={`${inputCls} text-center text-lg`} placeholder="✨" />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Título</label>
            <input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} placeholder="Nombre de la temporada / fecha / hito" />
          </div>
        </div>

        {/* Fechas */}
        <div className="rounded-lg border border-[#1e1e1e] p-3 space-y-3">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={esRango} onChange={e => setEsRango(e.target.checked)} className="accent-[#B3985B]" />
            Abarca un periodo (temporada de varios meses/días)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{esRango ? "Desde — mes" : "Mes"}</label>
              <select value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))} className={inputCls}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Día {esRango ? "" : "(opcional)"}</label>
              <input type="number" min={1} max={31} value={diaInicio} onChange={e => setDiaInicio(e.target.value)} className={inputCls} placeholder={esRango ? "1" : "—"} />
            </div>
          </div>
          {esRango && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Hasta — mes</label>
                <select value={mesFin} onChange={e => setMesFin(Number(e.target.value))} className={inputCls}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Día (opcional)</label>
                <input type="number" min={1} max={31} value={diaFin} onChange={e => setDiaFin(e.target.value)} className={inputCls} placeholder="—" />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={recurrente} onChange={e => setRecurrente(e.target.checked)} className="accent-[#B3985B]" />
            Se repite cada año
          </label>
          {!recurrente && (
            <input type="number" value={anio} onChange={e => setAnio(e.target.value)} className={`${inputCls} w-32`} placeholder="Año" />
          )}
        </div>

        {cal.ligaTipoEvento && (
          <div>
            <label className={labelCls}>Tipo de evento relacionado (opcional)</label>
            <select value={tipoEventoSlug} onChange={e => setTipoEventoSlug(e.target.value)} className={inputCls}>
              <option value="">— Sin ligar —</option>
              {tiposEvento.map(t => <option key={t.slug} value={t.slug}>{t.emoji ? `${t.emoji} ` : ""}{t.nombre}</option>)}
            </select>
          </div>
        )}
        {cal.ligaServicio && (
          <div>
            <label className={labelCls}>Servicio relacionado (opcional)</label>
            <select value={servicio} onChange={e => setServicio(e.target.value)} className={inputCls}>
              <option value="">— Sin ligar —</option>
              {SERVICIOS.map(s => <option key={s} value={s}>{SERVICIO_LABEL[s]}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>{cal.ideasLabel}</label>
          <textarea value={ideas} onChange={e => setIdeas(e.target.value)} rows={3} className={inputCls}
            placeholder="Anota ideas para desarrollar más adelante…" />
        </div>
        <div>
          <label className={labelCls}>Descripción (opcional)</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className={inputCls} />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {editing ? (
            <button onClick={eliminar} disabled={saving} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="ms-btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={saving}
              className="text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: tipoActual.color }}>
              {saving ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
