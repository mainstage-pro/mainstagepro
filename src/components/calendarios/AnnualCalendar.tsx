"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CALENDARIOS, MESES, MESES_CORTOS, colorEntrada, esRango, etiquetaFecha, ordenCronologico,
  tipoDef, type CalendarioKey, type Entrada,
} from "@/lib/calendarios";
import EntradaModal, { type TipoEventoOpt } from "./EntradaModal";
import CrearTareaModal from "./CrearTareaModal";

const DIAS_INI = ["L", "M", "M", "J", "V", "S", "D"];

function mesData(year: number, month: number) {
  const primerDia = new Date(year, month, 1).getDay();
  const dias = new Date(year, month + 1, 0).getDate();
  return { offset: primerDia === 0 ? 6 : primerDia - 1, dias };
}

// ¿La entrada-periodo cubre (mes0, dia) en el año mostrado?
function cubreDia(e: Entrada, mes0: number, dia: number): boolean {
  if (!esRango(e)) return false;
  const ini = (e.mesInicio - 1) * 32 + (e.diaInicio ?? 1);
  const finMes = (e.mesFin ?? e.mesInicio) - 1;
  const finDia = e.diaFin ?? new Date(2001, finMes + 1, 0).getDate();
  const fin = finMes * 32 + finDia;
  const val = mes0 * 32 + dia;
  return val >= ini && val <= fin;
}

export default function AnnualCalendar({ calendario }: { calendario: CalendarioKey }) {
  const cal = CALENDARIOS[calendario];
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [tiposEvento, setTiposEvento] = useState<TipoEventoOpt[]>([]);

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Entrada | null>(null);
  const [initFecha, setInitFecha] = useState<{ mes: number; dia: number | null }>({ mes: 1, dia: null });
  const [tareaFor, setTareaFor] = useState<Entrada | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/calendarios/entradas?calendario=${cal.key}`, { cache: "no-store" });
    const d = await r.json();
    setEntradas(d.entradas ?? []);
    setLoading(false);
  }, [cal.key]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (!cal.ligaTipoEvento) return;
    fetch("/api/tipos-evento").then(r => r.json()).then(d => {
      setTiposEvento((d.tipos ?? []).map((t: { slug: string; nombre: string; emoji?: string }) => ({ slug: t.slug, nombre: t.nombre, emoji: t.emoji })));
    }).catch(() => {});
  }, [cal.ligaTipoEvento]);

  const periodos = useMemo(() => entradas.filter(esRango).sort((a, b) => ordenCronologico(a) - ordenCronologico(b)), [entradas]);
  const puntos = useMemo(() => entradas.filter(e => !esRango(e)), [entradas]);
  const ordenadas = useMemo(() => [...entradas].sort((a, b) => ordenCronologico(a) - ordenCronologico(b)), [entradas]);

  // Puntos por (mes,dia) para pintar en las mini-vistas.
  const puntosPorDia = useMemo(() => {
    const map: Record<string, Entrada[]> = {};
    for (const e of puntos) {
      const key = `${e.mesInicio - 1}-${e.diaInicio ?? 1}`;
      (map[key] ??= []).push(e);
    }
    return map;
  }, [puntos]);

  function abrirNueva(mes = new Date().getMonth() + 1, dia: number | null = null) {
    setEditando(null); setInitFecha({ mes, dia }); setModalOpen(true);
  }
  function abrirEdicion(e: Entrada) { setEditando(e); setModalOpen(true); }

  function fechaTareaDefault(e: Entrada): string | null {
    if (!e.diaInicio) return null;
    const y = e.anio ?? anio;
    return `${y}-${String(e.mesInicio).padStart(2, "0")}-${String(e.diaInicio).padStart(2, "0")}`;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="ms-h1">Calendario {cal.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">{cal.descripcion}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-1">
            <button onClick={() => setAnio(a => a - 1)} className="px-2 py-1 text-gray-400 hover:text-white text-sm">←</button>
            <span className="px-2 text-white font-semibold text-sm tabular-nums">{anio}</span>
            <button onClick={() => setAnio(a => a + 1)} className="px-2 py-1 text-gray-400 hover:text-white text-sm">→</button>
          </div>
          <button onClick={() => abrirNueva()} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            + Nueva entrada
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {cal.tipos.map(t => (
          <div key={t.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="text-xs text-gray-400">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Línea de tiempo de temporadas */}
      {periodos.length > 0 && (
        <div className="ms-card p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#B3985B] font-bold mb-3">Temporadas del año</p>
          <div className="grid grid-cols-12 gap-px mb-2">
            {MESES_CORTOS.map(m => (
              <div key={m} className="text-center text-[10px] text-gray-600 uppercase">{m}</div>
            ))}
          </div>
          <div className="space-y-1.5">
            {periodos.map(e => {
              const desde = (e.mesInicio - 1) + ((e.diaInicio ?? 1) - 1) / 31;
              const finMes = (e.mesFin ?? e.mesInicio) - 1;
              const finDiaMax = new Date(2001, finMes + 1, 0).getDate();
              const hasta = finMes + (e.diaFin ?? finDiaMax) / finDiaMax;
              const left = (desde / 12) * 100;
              const width = Math.max(((hasta - desde) / 12) * 100, 4);
              const color = colorEntrada(cal, e);
              return (
                <div key={e.id} className="relative h-8">
                  <div className="absolute inset-0 grid grid-cols-12 gap-px pointer-events-none">
                    {Array.from({ length: 12 }).map((_, i) => <div key={i} className="border-r border-[#161616]" />)}
                  </div>
                  <button onClick={() => abrirEdicion(e)}
                    className="absolute top-0 h-8 rounded-md flex items-center px-2 text-[11px] font-medium text-white truncate hover:brightness-110 transition-all"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color + "cc", border: `1px solid ${color}` }}
                    title={`${e.titulo} · ${etiquetaFecha(e)}`}>
                    {e.icono ? `${e.icono} ` : ""}{e.titulo}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mini-meses (vista año) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MESES.map((nombreMes, m) => {
          const { offset, dias } = mesData(anio, m);
          const celdas = Math.ceil((offset + dias) / 7) * 7;
          return (
            <div key={m} className="ms-card p-3">
              <p className="text-xs font-semibold text-white mb-2">{nombreMes}</p>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DIAS_INI.map((d, i) => <div key={i} className="text-center text-[9px] text-gray-600">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: celdas }).map((_, i) => {
                  const dia = i - offset + 1;
                  const valido = dia >= 1 && dia <= dias;
                  if (!valido) return <div key={i} />;
                  const pts = puntosPorDia[`${m}-${dia}`] ?? [];
                  const periodo = periodos.find(e => cubreDia(e, m, dia));
                  const bg = periodo ? colorEntrada(cal, periodo) + "26" : undefined;
                  return (
                    <button key={i}
                      onClick={() => pts.length === 1 ? abrirEdicion(pts[0]) : abrirNueva(m + 1, dia)}
                      className="relative aspect-square rounded-[4px] flex items-center justify-center text-[10px] text-gray-400 hover:bg-[#1c1c1c] transition-colors"
                      style={bg ? { backgroundColor: bg } : undefined}
                      title={pts.map(p => p.titulo).join(", ")}>
                      <span>{dia}</span>
                      {pts.length > 0 && (
                        <span className="absolute bottom-0.5 flex gap-0.5">
                          {pts.slice(0, 3).map(p => (
                            <span key={p.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: colorEntrada(cal, p) }} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista gestionable */}
      <div className="ms-table-wrapper">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Entradas del calendario</p>
          <span className="text-xs text-gray-600">{entradas.length}</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-600 text-sm">Cargando…</div>
        ) : ordenadas.length === 0 ? (
          <div className="p-8 text-center text-gray-600 text-sm">
            Sin entradas todavía. <button onClick={() => abrirNueva()} className="text-[#B3985B] hover:underline">Crea la primera</button>.
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {ordenadas.map(e => {
              const td = tipoDef(cal, e.tipo);
              const color = colorEntrada(cal, e);
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#141414] transition-colors group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: color + "22", border: `1px solid ${color}55` }}>
                    {e.icono || "•"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => abrirEdicion(e)} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors text-left">{e.titulo}</button>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color + "22", color }}>{td.label}</span>
                      {e.tipoEventoSlug && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400">{e.tipoEventoSlug}</span>}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{etiquetaFecha(e)}</p>
                    {e.ideas && <p className="text-gray-600 text-xs mt-1 line-clamp-2 whitespace-pre-wrap">{e.ideas}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setTareaFor(e)} className="text-[11px] text-gray-400 hover:text-[#B3985B] px-2 py-1 rounded border border-[#2a2a2a] hover:border-[#B3985B]/40 transition-colors">+ Tarea</button>
                    <button onClick={() => abrirEdicion(e)} className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded border border-[#2a2a2a] transition-colors">Editar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EntradaModal
        open={modalOpen} onClose={() => setModalOpen(false)} cal={cal}
        entrada={editando} initialMes={initFecha.mes} initialDia={initFecha.dia}
        tiposEvento={tiposEvento} onSaved={cargar}
      />
      <CrearTareaModal
        open={!!tareaFor} onClose={() => setTareaFor(null)} tag={cal.tag}
        defaultTitle={tareaFor ? tareaFor.titulo : ""}
        defaultDate={tareaFor ? fechaTareaDefault(tareaFor) : null}
      />
    </div>
  );
}
