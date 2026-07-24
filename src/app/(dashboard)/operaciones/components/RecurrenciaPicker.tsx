"use client";
import { useState } from "react";
import {
  parsearRecurrencia,
  formatearRecurrencia,
  diasMesEfectivos,
  type RecurrenciaConfig,
} from "@/lib/recurrencia";

interface Props {
  value: string | null;               // JSON de RecurrenciaConfig o null
  onChange: (rawJson: string | null) => void;
  onClose?: () => void;
}

type Tipo = "diario" | "semanal" | "mensual" | "anual";

// L M M J V S D (empezando en lunes para la UI)
const DOW: { n: number; l: string; full: string }[] = [
  { n: 1, l: "L", full: "Lunes" },
  { n: 2, l: "M", full: "Martes" },
  { n: 3, l: "M", full: "Miércoles" },
  { n: 4, l: "J", full: "Jueves" },
  { n: 5, l: "V", full: "Viernes" },
  { n: 6, l: "S", full: "Sábado" },
  { n: 0, l: "D", full: "Domingo" },
];
const ORDS: { n: number; l: string }[] = [
  { n: 1, l: "1º" },
  { n: 2, l: "2º" },
  { n: 3, l: "3º" },
  { n: 4, l: "4º" },
  { n: 5, l: "Último" },
];
const TIPOS: { t: Tipo; l: string }[] = [
  { t: "diario", l: "Día" },
  { t: "semanal", l: "Semana" },
  { t: "mensual", l: "Mes" },
  { t: "anual", l: "Año" },
];
const PRESETS_SEMANA: { l: string; dias: number[] }[] = [
  { l: "L–V", dias: [1, 2, 3, 4, 5] },
  { l: "Fin de semana", dias: [0, 6] },
  { l: "Todos", dias: [0, 1, 2, 3, 4, 5, 6] },
];

function parse(json: string | null): RecurrenciaConfig | null {
  if (!json) return null;
  try {
    const c = JSON.parse(json);
    return c && c.tipo ? c : null;
  } catch {
    return null;
  }
}

function defaultCfg(tipo: Tipo, prev?: RecurrenciaConfig): RecurrenciaConfig {
  switch (tipo) {
    case "diario":
      return { tipo, cada: prev?.cada ?? 1 };
    case "semanal":
      return { tipo, cada: prev?.cada ?? 1, diasSemana: prev?.diasSemana?.length ? prev.diasSemana : [new Date().getDay()] };
    case "mensual":
      return { tipo, cada: prev?.cada ?? 1, diaMes: prev?.diaMes ?? new Date().getDate() };
    case "anual":
      return { tipo, cada: prev?.cada ?? 1 };
  }
}

export default function RecurrenciaPicker({ value, onChange, onClose }: Props) {
  const initial = parse(value);
  const [cfg, setCfg] = useState<RecurrenciaConfig>(
    initial ?? { tipo: "semanal", cada: 1, diasSemana: [new Date().getDay()] }
  );
  const [mensualModo, setMensualModo] = useState<"dia" | "posicion">(
    initial?.semanaMes?.length ? "posicion" : "dia"
  );
  const [nl, setNl] = useState("");
  const [nlMsg, setNlMsg] = useState<{ txt: string; ok: boolean } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const preview = formatearRecurrencia(cfg);

  // ── Lenguaje natural ──────────────────────────────────────────────
  function aplicarLocal(): boolean {
    const local = parsearRecurrencia(nl.trim().toLowerCase());
    if (local) {
      setCfg(local);
      setMensualModo(local.semanaMes?.length ? "posicion" : "dia");
      setNlMsg({ txt: `Entendido: ${formatearRecurrencia(local)}`, ok: true });
      return true;
    }
    return false;
  }

  async function interpretar() {
    if (!nl.trim()) return;
    setNlMsg(null);
    if (aplicarLocal()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/tareas/interpretar-recurrencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: nl.trim() }),
      });
      const data = await res.json();
      if (data?.tipo === "recurrencia" && data.cfg) {
        setCfg(data.cfg);
        setMensualModo(data.cfg.semanaMes?.length ? "posicion" : "dia");
        setNlMsg({ txt: `Entendido: ${data.display ?? formatearRecurrencia(data.cfg)}`, ok: true });
      } else if (data?.tipo === "fecha") {
        setNlMsg({ txt: "Eso parece una fecha única, no una recurrencia. Usa la pestaña “Fija”.", ok: false });
      } else {
        setNlMsg({ txt: data?.error ?? "No entendí esa recurrencia. Prueba con el selector.", ok: false });
      }
    } catch {
      setNlMsg({ txt: "Error de conexión al interpretar.", ok: false });
    } finally {
      setAiLoading(false);
    }
  }

  // ── Helpers de edición manual ─────────────────────────────────────
  function setTipo(t: Tipo) {
    setCfg(prev => defaultCfg(t, prev));
    if (t === "mensual") setMensualModo(cfg.semanaMes?.length ? "posicion" : "dia");
    setNlMsg(null);
  }
  function setCada(n: number) {
    setCfg(c => ({ ...c, cada: Math.max(1, Math.min(60, n || 1)) }));
  }
  function toggleDiaSemana(n: number) {
    setCfg(c => {
      const s = new Set(c.diasSemana ?? []);
      if (s.has(n)) s.delete(n); else s.add(n);
      return { ...c, diasSemana: [...s].sort((a, b) => a - b) };
    });
  }
  function setPresetSemana(dias: number[]) {
    setCfg(c => ({ ...c, diasSemana: [...dias].sort((a, b) => a - b) }));
  }
  function toggleDiaMes(n: number) {
    setCfg(c => {
      const cur = new Set(diasMesEfectivos(c));
      if (cur.has(n)) cur.delete(n); else cur.add(n);
      const arr = [...cur].sort((a, b) => a - b);
      const next: RecurrenciaConfig = { ...c };
      delete next.diaMes;
      if (arr.length <= 1) { next.diaMes = arr[0] ?? new Date().getDate(); delete next.diasMes; }
      else { next.diasMes = arr; }
      return next;
    });
  }
  function toggleOrdinal(n: number) {
    setCfg(c => {
      const s = new Set(c.semanaMes ?? []);
      if (s.has(n)) s.delete(n); else s.add(n);
      const arr = [...s].sort((a, b) => a - b);
      return { ...c, semanaMes: arr.length ? arr : [1] };
    });
  }
  function setPosicionDia(n: number) {
    setCfg(c => ({ ...c, diasSemana: [n] }));
  }
  function switchMensualModo(modo: "dia" | "posicion") {
    setMensualModo(modo);
    setCfg(c => {
      if (modo === "posicion") {
        return { tipo: "mensual", cada: c.cada, semanaMes: c.semanaMes?.length ? c.semanaMes : [1], diasSemana: c.diasSemana?.length ? [c.diasSemana[0]] : [1] };
      }
      return { tipo: "mensual", cada: c.cada, diaMes: c.diaMes ?? new Date().getDate() };
    });
  }

  const diasMesSel = new Set(diasMesEfectivos(cfg));
  const inp = "bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg text-white focus:outline-none focus:border-[#B3985B]";

  return (
    <div className="space-y-3">
      {/* ── Lenguaje natural ── */}
      <div>
        <div className="flex gap-1.5">
          <input
            value={nl}
            onChange={e => { setNl(e.target.value); setNlMsg(null); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); interpretar(); } if (e.key === "Escape") onClose?.(); }}
            placeholder="Escríbelo: cada viernes y domingo…"
            className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs placeholder:text-[#444] ${inp}`}
          />
          <button
            type="button"
            onClick={interpretar}
            disabled={!nl.trim() || aiLoading}
            title="Interpretar con IA"
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#B3985B]/15 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/25 disabled:opacity-40 transition-all"
          >
            {aiLoading ? "…" : "✦"}
          </button>
        </div>
        {nlMsg && (
          <p className={`text-[10px] mt-1 ${nlMsg.ok ? "text-green-500" : "text-[#B3985B]"}`}>{nlMsg.txt}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[#161616]" />
        <span className="text-[9px] text-[#333] uppercase tracking-widest">o configúralo</span>
        <div className="h-px flex-1 bg-[#161616]" />
      </div>

      {/* ── Tipo ── */}
      <div className="flex rounded-lg overflow-hidden border border-[#1a1a1a]">
        {TIPOS.map((x, i) => (
          <button
            key={x.t}
            type="button"
            onClick={() => setTipo(x.t)}
            className={`flex-1 py-1.5 text-[11px] font-medium transition-all ${i > 0 ? "border-l border-[#1a1a1a]" : ""} ${
              cfg.tipo === x.t ? "bg-[#1a1a1a] text-[#B3985B]" : "text-[#555] hover:text-[#999]"
            }`}
          >
            {x.l}
          </button>
        ))}
      </div>

      {/* ── "Cada N …" ── */}
      <div className="flex items-center gap-2 text-xs text-[#888]">
        <span>Cada</span>
        <input
          type="number"
          min={1}
          max={60}
          value={cfg.cada}
          onChange={e => setCada(parseInt(e.target.value, 10))}
          className={`w-14 px-2 py-1 text-center text-xs ${inp}`}
        />
        <span>
          {cfg.tipo === "diario" && (cfg.cada === 1 ? "día" : "días")}
          {cfg.tipo === "semanal" && (cfg.cada === 1 ? "semana" : "semanas")}
          {cfg.tipo === "mensual" && (cfg.cada === 1 ? "mes" : "meses")}
          {cfg.tipo === "anual" && (cfg.cada === 1 ? "año" : "años")}
        </span>
      </div>

      {/* ── Semanal ── */}
      {cfg.tipo === "semanal" && (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1">
            {DOW.map(d => {
              const sel = (cfg.diasSemana ?? []).includes(d.n);
              return (
                <button
                  key={d.n}
                  type="button"
                  title={d.full}
                  onClick={() => toggleDiaSemana(d.n)}
                  className={`aspect-square rounded-md text-[11px] font-semibold border transition-all ${
                    sel ? "bg-[#B3985B] border-[#B3985B] text-[#0a0a0a]" : "border-[#1e1e1e] text-[#555] hover:text-[#aaa] hover:border-[#2a2a2a]"
                  }`}
                >
                  {d.l}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESETS_SEMANA.map(p => (
              <button
                key={p.l}
                type="button"
                onClick={() => setPresetSemana(p.dias)}
                className="px-2 py-0.5 rounded text-[10px] border border-[#1e1e1e] text-[#555] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all"
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Mensual ── */}
      {cfg.tipo === "mensual" && (
        <div className="space-y-2">
          <div className="flex rounded-lg overflow-hidden border border-[#1a1a1a]">
            <button
              type="button"
              onClick={() => switchMensualModo("dia")}
              className={`flex-1 py-1 text-[11px] font-medium transition-all ${mensualModo === "dia" ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#999]"}`}
            >
              Por día
            </button>
            <button
              type="button"
              onClick={() => switchMensualModo("posicion")}
              className={`flex-1 py-1 text-[11px] font-medium border-l border-[#1a1a1a] transition-all ${mensualModo === "posicion" ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#999]"}`}
            >
              Por posición
            </button>
          </div>

          {mensualModo === "dia" ? (
            <div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(n => {
                  const sel = diasMesSel.has(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleDiaMes(n)}
                      className={`aspect-square rounded-md text-[10px] font-medium border transition-all ${
                        sel ? "bg-[#B3985B] border-[#B3985B] text-[#0a0a0a]" : "border-[#161616] text-[#555] hover:text-[#aaa] hover:border-[#2a2a2a]"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-[#444] mt-1">Selecciona uno o varios días (ej. 1 y 15).</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {ORDS.map(o => {
                  const sel = (cfg.semanaMes ?? []).includes(o.n);
                  return (
                    <button
                      key={o.n}
                      type="button"
                      onClick={() => toggleOrdinal(o.n)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                        sel ? "bg-[#B3985B] border-[#B3985B] text-[#0a0a0a]" : "border-[#1e1e1e] text-[#555] hover:text-[#aaa]"
                      }`}
                    >
                      {o.l}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DOW.map(d => {
                  const sel = (cfg.diasSemana ?? [])[0] === d.n;
                  return (
                    <button
                      key={d.n}
                      type="button"
                      title={d.full}
                      onClick={() => setPosicionDia(d.n)}
                      className={`aspect-square rounded-md text-[11px] font-semibold border transition-all ${
                        sel ? "bg-[#B3985B] border-[#B3985B] text-[#0a0a0a]" : "border-[#1e1e1e] text-[#555] hover:text-[#aaa]"
                      }`}
                    >
                      {d.l}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-[#444]">Ej. “primer viernes”, “último día hábil”.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Preview + acciones ── */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2" strokeLinecap="round">
          <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span className="text-xs text-[#B3985B] flex-1 leading-tight">{preview || "—"}</span>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => onChange(JSON.stringify(cfg))}
          className="font-medium text-[#B3985B] hover:underline"
        >
          Aplicar
        </button>
        <button type="button" onClick={() => onClose?.()} className="text-[#555] hover:text-white transition-colors">
          Cancelar
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto text-red-400/80 hover:text-red-400 transition-colors"
          >
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}
