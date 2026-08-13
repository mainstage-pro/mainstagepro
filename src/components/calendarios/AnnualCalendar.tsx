"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CALENDARIOS, MESES, MESES_CORTOS, colorEntrada, esRango, etiquetaFecha, ordenCronologico,
  tipoDef, type CalendarioKey, type Entrada,
} from "@/lib/calendarios";
import EntradaModal, { type TipoEventoOpt } from "./EntradaModal";
import CrearTareaModal from "./CrearTareaModal";

type Vista = "anio" | "mes" | "semana";

const DIAS_INI = ["L", "M", "M", "J", "V", "S", "D"];
const DIAS_LARGO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function mesData(year: number, month: number) {
  const primerDia = new Date(year, month, 1).getDay();
  const dias = new Date(year, month + 1, 0).getDate();
  return { offset: primerDia === 0 ? 6 : primerDia - 1, dias };
}

// Lunes de la semana que contiene a d.
function inicioSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}

// ¿La entrada-periodo cubre (mes0, dia)? (sin validar año)
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
  const hoy = useMemo(() => new Date(), []);
  const [vista, setVista] = useState<Vista>("anio");
  const [cursor, setCursor] = useState<Date>(new Date());
  const anio = cursor.getFullYear();

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

  const delAnio = useMemo(() => entradas.filter(e => e.anio == null || e.anio === anio), [entradas, anio]);
  const periodos = useMemo(() => delAnio.filter(esRango).sort((a, b) => ordenCronologico(a) - ordenCronologico(b)), [delAnio]);
  const puntos = useMemo(() => delAnio.filter(e => !esRango(e)), [delAnio]);
  const ordenadas = useMemo(() => [...delAnio].sort((a, b) => ordenCronologico(a) - ordenCronologico(b)), [delAnio]);

  const puntosPorDia = useMemo(() => {
    const map: Record<string, Entrada[]> = {};
    for (const e of puntos) {
      const key = `${e.mesInicio - 1}-${e.diaInicio ?? 1}`;
      (map[key] ??= []).push(e);
    }
    return map;
  }, [puntos]);

  // Temporada actual y siguiente respecto a HOY (para el resumen de Administrativo).
  const periodosHoy = useMemo(
    () => entradas.filter(e => (e.anio == null || e.anio === hoy.getFullYear()) && esRango(e)),
    [entradas, hoy],
  );
  const { tempActual, tempSiguiente, diasParaSiguiente } = useMemo(() => {
    const hoyVal = hoy.getMonth() * 32 + hoy.getDate();
    const rango = (e: Entrada) => {
      const ini = (e.mesInicio - 1) * 32 + (e.diaInicio ?? 1);
      const fm = (e.mesFin ?? e.mesInicio) - 1;
      const fd = e.diaFin ?? new Date(2001, fm + 1, 0).getDate();
      return { ini, fin: fm * 32 + fd };
    };
    const conR = periodosHoy.map(e => ({ e, ...rango(e) }));
    const actual = conR.find(x => hoyVal >= x.ini && hoyVal <= x.fin)?.e ?? null;
    const futuros = conR.filter(x => x.ini > hoyVal && x.e.id !== actual?.id).sort((a, b) => a.ini - b.ini);
    let sig = futuros[0]?.e ?? null;
    if (!sig) {
      const rest = conR.filter(x => x.e.id !== actual?.id).sort((a, b) => a.ini - b.ini);
      sig = rest[0]?.e ?? null;
    }
    let dias: number | null = null;
    if (sig) {
      const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      let d = new Date(hoy.getFullYear(), sig.mesInicio - 1, sig.diaInicio ?? 1);
      if (d < h0) d = new Date(hoy.getFullYear() + 1, sig.mesInicio - 1, sig.diaInicio ?? 1);
      dias = Math.round((d.getTime() - h0.getTime()) / 86400000);
    }
    return { tempActual: actual, tempSiguiente: sig, diasParaSiguiente: dias };
  }, [periodosHoy, hoy]);

  function puntosDe(m0: number, dia: number) { return puntosPorDia[`${m0}-${dia}`] ?? []; }
  function periodoDe(m0: number, dia: number) { return periodos.find(e => cubreDia(e, m0, dia)); }

  function abrirNueva(mes = new Date().getMonth() + 1, dia: number | null = null) {
    setEditando(null); setInitFecha({ mes, dia }); setModalOpen(true);
  }
  function abrirEdicion(e: Entrada) { setEditando(e); setModalOpen(true); }

  function fechaTareaDefault(e: Entrada): string | null {
    if (!e.diaInicio) return null;
    const y = e.anio ?? anio;
    return `${y}-${String(e.mesInicio).padStart(2, "0")}-${String(e.diaInicio).padStart(2, "0")}`;
  }

  // ── Navegación por vista ──────────────────────────────────────────────────
  function mover(dir: number) {
    const d = new Date(cursor);
    if (vista === "anio") d.setFullYear(d.getFullYear() + dir);
    else if (vista === "mes") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  }
  function irAMes(m0: number) { setCursor(new Date(anio, m0, 1)); setVista("mes"); }

  const tituloPeriodo = (() => {
    if (vista === "anio") return String(anio);
    if (vista === "mes") return `${MESES[cursor.getMonth()]} ${anio}`;
    const ini = inicioSemana(cursor);
    const fin = new Date(ini); fin.setDate(fin.getDate() + 6);
    const mismoMes = ini.getMonth() === fin.getMonth();
    return mismoMes
      ? `${ini.getDate()}–${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]} ${anio}`
      : `${ini.getDate()} ${MESES_CORTOS[ini.getMonth()]} – ${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]} ${anio}`;
  })();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="ms-h1">Calendario {cal.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">{cal.descripcion}</p>
        </div>
        <button onClick={() => abrirNueva()} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors self-start sm:self-auto">
          + Nueva entrada
        </button>
      </div>

      {/* Controles: vista + navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-1 w-fit">
          {(["anio", "mes", "semana"] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === v ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}>
              {v === "anio" ? "Año" : v === "mes" ? "Mes" : "Semana"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date())} className="ms-btn-secondary text-sm">Hoy</button>
          <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-1">
            <button onClick={() => mover(-1)} className="px-2 py-1 text-gray-400 hover:text-white text-sm">←</button>
            <span className="px-2 text-white font-semibold text-sm tabular-nums min-w-[9rem] text-center">{tituloPeriodo}</span>
            <button onClick={() => mover(1)} className="px-2 py-1 text-gray-400 hover:text-white text-sm">→</button>
          </div>
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

      {/* Temporada actual / siguiente (calendarios con temporadas) */}
      {periodosHoy.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { rot: "Temporada actual", e: tempActual, badge: null as string | null },
            { rot: "Siguiente temporada", e: tempSiguiente, badge: diasParaSiguiente != null ? `en ${diasParaSiguiente} día${diasParaSiguiente === 1 ? "" : "s"}` : null },
          ]).map(({ rot, e, badge }) => {
            const color = e ? colorEntrada(cal, e) : "#333";
            return (
              <div key={rot} className="ms-card p-4 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: color + "22", border: `1px solid ${color}55` }}>
                  {e?.icono || "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-bold">{rot}</p>
                  <p className="text-white font-semibold truncate">{e ? e.titulo : "Sin definir"}</p>
                  {e && <p className="text-xs text-gray-500 truncate">{etiquetaFecha(e)}{badge ? ` · ${badge}` : ""}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vista === "anio" && <VistaAnio />}
      {vista === "mes" && <VistaMes />}
      {vista === "semana" && <VistaSemana />}

      {/* Lista gestionable (siempre visible) */}
      <div className="ms-table-wrapper">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Entradas del calendario · {anio}</p>
          <span className="text-xs text-gray-600">{ordenadas.length}</span>
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

  // ── VISTA AÑO ───────────────────────────────────────────────────────────────
  function VistaAnio() {
    return (
      <>
        {/* Mini-meses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MESES.map((nombreMes, m) => {
            const { offset, dias } = mesData(anio, m);
            const celdas = Math.ceil((offset + dias) / 7) * 7;
            return (
              <div key={m} className="ms-card p-3">
                <button onClick={() => irAMes(m)} className="text-xs font-semibold text-white hover:text-[#B3985B] mb-2 transition-colors">{nombreMes}</button>
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {DIAS_INI.map((d, i) => <div key={i} className="text-center text-[9px] text-gray-600">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: celdas }).map((_, i) => {
                    const dia = i - offset + 1;
                    const valido = dia >= 1 && dia <= dias;
                    if (!valido) return <div key={i} />;
                    const pts = puntosDe(m, dia);
                    const periodo = periodoDe(m, dia);
                    const esHoy = hoy.getFullYear() === anio && hoy.getMonth() === m && hoy.getDate() === dia;
                    const primary = pts[0] ? colorEntrada(cal, pts[0]) : null;
                    const style: React.CSSProperties | undefined = primary
                      ? { backgroundColor: primary, color: "#0d0d0d" }
                      : periodo
                        ? { backgroundColor: colorEntrada(cal, periodo) + "3d", color: "#e5e5e5" }
                        : undefined;
                    return (
                      <button key={i}
                        onClick={() => pts.length === 1 ? abrirEdicion(pts[0]) : abrirNueva(m + 1, dia)}
                        className={`relative aspect-square rounded-md flex items-center justify-center text-[10px] transition-transform ${primary ? "font-bold shadow-md hover:scale-110" : periodo ? "font-medium hover:brightness-125" : "text-gray-500 hover:bg-[#1c1c1c]"} ${esHoy ? "ring-2 ring-[#B3985B]" : ""}`}
                        style={style}
                        title={pts.map(p => p.titulo).join(", ") || periodo?.titulo || ""}>
                        <span>{dia}</span>
                        {pts.length > 1 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0d0d0d] text-[#B3985B] text-[8px] font-bold flex items-center justify-center border border-[#B3985B]/60">{pts.length}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // ── VISTA MES ─────────────────────────────────────────────────────────────
  function VistaMes() {
    const m = cursor.getMonth();
    const { offset, dias } = mesData(anio, m);
    const celdas = Math.ceil((offset + dias) / 7) * 7;
    return (
      <div className="ms-card p-3 md:p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_LARGO.map((d, i) => <div key={i} className="text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: celdas }).map((_, i) => {
            const dia = i - offset + 1;
            const valido = dia >= 1 && dia <= dias;
            if (!valido) return <div key={i} className="min-h-[92px] rounded-lg bg-[#0b0b0b]" />;
            const pts = puntosDe(m, dia);
            const periodo = periodoDe(m, dia);
            const esHoy = hoy.getFullYear() === anio && hoy.getMonth() === m && hoy.getDate() === dia;
            const bg = periodo ? colorEntrada(cal, periodo) + "1f" : undefined;
            return (
              <div key={i}
                className="min-h-[92px] rounded-lg border border-[#1a1a1a] p-1.5 hover:border-[#2a2a2a] transition-colors flex flex-col group/cell"
                style={bg ? { backgroundColor: bg } : undefined}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${esHoy ? "bg-[#B3985B] text-black rounded-full w-5 h-5 flex items-center justify-center font-semibold" : "text-gray-400"}`}>{dia}</span>
                  <button onClick={() => abrirNueva(m + 1, dia)} className="text-gray-600 hover:text-[#B3985B] text-sm leading-none opacity-0 group-hover/cell:opacity-100 transition-opacity" title="Nueva entrada">+</button>
                </div>
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {periodo && (
                    <button onClick={() => abrirEdicion(periodo)} className="w-full truncate text-left text-[10px] px-1 py-0.5 rounded"
                      style={{ backgroundColor: colorEntrada(cal, periodo) + "33", color: colorEntrada(cal, periodo) }}>
                      {periodo.icono ? `${periodo.icono} ` : ""}{periodo.titulo}
                    </button>
                  )}
                  {pts.map(p => (
                    <button key={p.id} onClick={() => abrirEdicion(p)} className="w-full truncate text-left text-[10px] px-1 py-0.5 rounded flex items-center gap-1 hover:brightness-125"
                      style={{ backgroundColor: colorEntrada(cal, p) + "22", color: colorEntrada(cal, p) }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: colorEntrada(cal, p) }} />
                      <span className="truncate">{p.icono ? `${p.icono} ` : ""}{p.titulo}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── VISTA SEMANA ──────────────────────────────────────────────────────────
  function VistaSemana() {
    const ini = inicioSemana(cursor);
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ini); d.setDate(d.getDate() + i); return d;
    });
    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {dias.map((d, i) => {
          const m0 = d.getMonth();
          const dia = d.getDate();
          const yr = d.getFullYear();
          const pts = (yr === anio) ? puntosDe(m0, dia) : [];
          const periodo = (yr === anio) ? periodoDe(m0, dia) : undefined;
          const esHoy = hoy.getFullYear() === yr && hoy.getMonth() === m0 && hoy.getDate() === dia;
          return (
            <div key={i} className={`ms-card p-2 min-h-[180px] flex flex-col ${esHoy ? "ring-1 ring-[#B3985B]" : ""}`}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1a1a1a]">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{DIAS_LARGO[i]}</p>
                  <p className={`text-sm font-semibold ${esHoy ? "text-[#B3985B]" : "text-white"}`}>{dia} {MESES_CORTOS[m0]}</p>
                </div>
                <button onClick={() => abrirNueva(m0 + 1, dia)} className="text-gray-600 hover:text-[#B3985B] text-base leading-none" title="Nueva entrada">+</button>
              </div>
              <div className="space-y-1 flex-1">
                {periodo && (
                  <button onClick={() => abrirEdicion(periodo)} className="w-full text-left text-[11px] px-2 py-1 rounded-md"
                    style={{ backgroundColor: colorEntrada(cal, periodo) + "33", color: colorEntrada(cal, periodo) }}>
                    {periodo.icono ? `${periodo.icono} ` : ""}{periodo.titulo}
                  </button>
                )}
                {pts.map(p => (
                  <button key={p.id} onClick={() => abrirEdicion(p)} className="w-full text-left text-[11px] px-2 py-1 rounded-md hover:brightness-125 transition-all"
                    style={{ backgroundColor: colorEntrada(cal, p) + "22", color: colorEntrada(cal, p), border: `1px solid ${colorEntrada(cal, p)}44` }}>
                    {p.icono ? `${p.icono} ` : ""}{p.titulo}
                  </button>
                ))}
                {!periodo && pts.length === 0 && (
                  <button onClick={() => abrirNueva(m0 + 1, dia)} className="w-full h-full min-h-[80px] rounded-md text-gray-700 hover:text-gray-500 hover:bg-[#131313] transition-colors text-xs">
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
