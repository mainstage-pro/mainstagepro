"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, ChevronLeft, ChevronRight, Check, Plus, Trash2 } from "lucide-react";
import {
  AREAS_EVALUABLES,
  SECCIONES_TEXTO,
  labelArea,
  labelMes,
  mesActual,
  reporteListoParaEnviar,
  type KpiRow,
  type ReporteMensualAreaData,
} from "@/lib/reporte-area-mensual";

const GOLD = "#B3985B";

function navMes(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReporteMensualAreaPage() {
  const [mes, setMes] = useState(mesActual());
  const [area, setArea] = useState<string | null>(null);
  const [esDireccion, setEsDireccion] = useState(false);
  const [reporte, setReporte] = useState<ReporteMensualAreaData | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Determina el área del usuario y si es dirección/admin (selector de área).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        const u = json.user ?? json;
        const dir = u.role === "ADMIN" || u.area === "DIRECCION";
        setEsDireccion(dir);
        if (dir) {
          setArea((a) => a ?? AREAS_EVALUABLES[0].id);
        } else if (AREAS_EVALUABLES.some((x) => x.id === u.area)) {
          setArea(u.area);
        } else {
          setArea(null);
          setCargando(false);
        }
      } catch {
        setError("No se pudo identificar tu área.");
        setCargando(false);
      }
    })();
  }, []);

  const cargar = useCallback(async (a: string, m: string) => {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch(`/api/reportes/area-mensual?area=${a}&mes=${m}`);
      const json = await res.json();
      setReporte(json.reporte);
      setPuedeEditar(json.puedeEditar ?? false);
    } catch {
      setError("No se pudo cargar el reporte.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (area) cargar(area, mes);
  }, [area, mes, cargar]);

  const patch = (p: Partial<ReporteMensualAreaData>) => setReporte((r) => (r ? { ...r, ...p } : r));

  const setKpi = (i: number, campo: keyof KpiRow, valor: string) => {
    if (!reporte) return;
    const kpis = reporte.kpis.map((k, idx) => (idx === i ? { ...k, [campo]: valor } : k));
    patch({ kpis });
  };
  const addKpi = () => reporte && patch({ kpis: [...reporte.kpis, { nombre: "", valor: "", meta: "", unidad: "" }] });
  const delKpi = (i: number) => reporte && patch({ kpis: reporte.kpis.filter((_, idx) => idx !== i) });

  const guardar = async (enviar?: boolean) => {
    if (!reporte || !area) return;
    if (enviar) {
      const { ok, faltantes } = reporteListoParaEnviar(reporte);
      if (!ok) {
        setError(`Falta completar: ${faltantes.join(", ")}`);
        return;
      }
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch("/api/reportes/area-mensual", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reporte, area, mes, enviar }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error + (json.faltantes ? `: ${json.faltantes.join(", ")}` : ""));
        return;
      }
      setReporte(json.reporte);
      setAviso(enviar ? "Reporte entregado." : "Guardado.");
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const bloqueado = reporte?.enviado === true;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6" style={{ color: GOLD }} />
            Reporte mensual de área
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            Cierre mensual con estructura estándar. Es la base de la evaluación de dirección.
          </p>
        </div>
        <div className="flex items-center gap-2 ms-card px-2 py-1.5 rounded-lg self-start">
          <button onClick={() => setMes((m) => navMes(m, -1))} className="p-1 hover:text-white text-white/60">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium capitalize min-w-[9rem] text-center">{labelMes(mes)}</span>
          <button onClick={() => setMes((m) => navMes(m, 1))} disabled={mes >= mesActual()} className="p-1 hover:text-white text-white/60 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector de área (solo dirección/admin) */}
      {esDireccion && (
        <div className="flex flex-wrap gap-2">
          {AREAS_EVALUABLES.map((a) => (
            <button
              key={a.id}
              onClick={() => setArea(a.id)}
              className="text-sm px-3 py-1.5 rounded-lg transition"
              style={{
                background: area === a.id ? GOLD : "rgba(255,255,255,0.04)",
                color: area === a.id ? "#111" : "rgba(255,255,255,0.65)",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="ms-card rounded-lg p-3 text-sm text-red-300 border border-red-500/30">{error}</div>}
      {aviso && <div className="ms-card rounded-lg p-3 text-sm text-emerald-300 border border-emerald-500/20">{aviso}</div>}

      {!area && !cargando ? (
        <div className="ms-card rounded-xl p-6 text-sm text-white/50">
          Tu usuario no tiene un área operativa asignada. Pide a dirección que te asigne un área para llenar tu reporte.
        </div>
      ) : cargando || !reporte ? (
        <div className="text-white/40 text-sm py-10 text-center">Cargando…</div>
      ) : (
        <div className="space-y-5">
          {/* Estado */}
          <div className="flex items-center justify-between ms-card rounded-lg px-4 py-2.5">
            <span className="text-sm text-white/60">{labelArea(area!)} · {labelMes(mes)}</span>
            {reporte.enviado ? (
              <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                <Check className="w-3 h-3" /> Entregado
              </span>
            ) : (
              <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-white/5 text-white/40">Borrador</span>
            )}
          </div>

          {/* Resultados */}
          <SeccionTexto id="resultados" reporte={reporte} onChange={patch} disabled={bloqueado || !puedeEditar} />

          {/* KPIs vs meta */}
          <div className="ms-card rounded-xl p-4 space-y-3">
            <div>
              <div className="text-sm font-medium">KPIs vs meta</div>
              <div className="text-xs text-white/40">Los indicadores clave del área este mes y su meta.</div>
            </div>
            <div className="space-y-2">
              {reporte.kpis.length === 0 && <div className="text-xs text-white/30">Sin KPIs. Agrega al menos uno.</div>}
              {reporte.kpis.map((k, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_5rem_4.5rem_auto] gap-2 items-center">
                  <input value={k.nombre} disabled={bloqueado || !puedeEditar} onChange={(e) => setKpi(i, "nombre", e.target.value)} placeholder="Indicador" className="bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-50" />
                  <input value={k.valor} disabled={bloqueado || !puedeEditar} onChange={(e) => setKpi(i, "valor", e.target.value)} placeholder="Valor" className="bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-50" />
                  <input value={k.meta} disabled={bloqueado || !puedeEditar} onChange={(e) => setKpi(i, "meta", e.target.value)} placeholder="Meta" className="bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-50" />
                  <input value={k.unidad} disabled={bloqueado || !puedeEditar} onChange={(e) => setKpi(i, "unidad", e.target.value)} placeholder="Unid." className="bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-50" />
                  <button onClick={() => delKpi(i)} disabled={bloqueado || !puedeEditar} className="p-1.5 text-white/30 hover:text-red-300 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            {!bloqueado && puedeEditar && (
              <button onClick={addKpi} className="text-xs flex items-center gap-1 text-white/60 hover:text-white">
                <Plus className="w-3.5 h-3.5" /> Agregar KPI
              </button>
            )}
          </div>

          {/* Análisis, bloqueos, compromisos */}
          <SeccionTexto id="analisis" reporte={reporte} onChange={patch} disabled={bloqueado || !puedeEditar} />
          <SeccionTexto id="bloqueos" reporte={reporte} onChange={patch} disabled={bloqueado || !puedeEditar} />
          <SeccionTexto id="compromisos" reporte={reporte} onChange={patch} disabled={bloqueado || !puedeEditar} />

          {/* Acciones */}
          {puedeEditar && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Link href="/direccion/reportes" className="text-xs text-white/40 hover:text-white/70">Centro de reportes</Link>
              <div className="flex items-center gap-2">
                {reporte.enviado ? (
                  <button onClick={() => guardar(false)} disabled={guardando} className="text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 disabled:opacity-50">Reabrir</button>
                ) : (
                  <>
                    <button onClick={() => guardar()} disabled={guardando} className="text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80 disabled:opacity-50">{guardando ? "Guardando…" : "Guardar"}</button>
                    <button onClick={() => guardar(true)} disabled={guardando} className="text-sm px-3 py-1.5 rounded-md font-medium disabled:opacity-40" style={{ background: GOLD, color: "#111" }}>Entregar</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeccionTexto({
  id,
  reporte,
  onChange,
  disabled,
}: {
  id: "resultados" | "analisis" | "bloqueos" | "compromisos";
  reporte: ReporteMensualAreaData;
  onChange: (p: Partial<ReporteMensualAreaData>) => void;
  disabled: boolean;
}) {
  const meta = SECCIONES_TEXTO.find((s) => s.id === id)!;
  return (
    <div className="ms-card rounded-xl p-4 space-y-2">
      <div>
        <div className="text-sm font-medium flex items-center gap-1.5">
          {meta.titulo}
          {meta.obligatorio && <span className="text-[10px] text-white/30">obligatorio</span>}
        </div>
        <div className="text-xs text-white/40">{meta.desc}</div>
      </div>
      <textarea
        value={reporte[id]}
        disabled={disabled}
        onChange={(e) => onChange({ [id]: e.target.value })}
        rows={id === "bloqueos" ? 2 : 4}
        placeholder={meta.placeholder}
        className="w-full bg-white/[0.03] border border-white/10 rounded-md px-2.5 py-2 text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 disabled:opacity-60"
      />
    </div>
  );
}
