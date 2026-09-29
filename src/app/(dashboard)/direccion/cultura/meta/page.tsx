"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Gauge, Zap, CalendarRange, Plus, X } from "lucide-react";
import { KPI_OPCIONES, UNIDADES_META, formatValorMeta } from "@/lib/estrategia";
import {
  useEstrategia,
  inputCls,
  labelCls,
  btnPrimary,
  btnGhost,
  type IndicadorDTO,
} from "../useEstrategia";
import { Lienzo, Encabezado, Panel, Anillo, Rotulo, GOLD, oro } from "../ui";

type IndicadorForm = Omit<IndicadorDTO, "id" | "orden"> & { id?: string };

export default function MetaPage() {
  const { data, cargando, error, recargar } = useEstrategia();
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [indicadores, setIndicadores] = useState<IndicadorForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const m = data?.meta;
    if (!m) return;
    setTitulo(m.titulo);
    setPeriodo(m.periodo);
    setDescripcion(m.descripcion ?? "");
    setFechaInicio(m.fechaInicio.slice(0, 10));
    setFechaFin(m.fechaFin.slice(0, 10));
    setIndicadores(m.indicadores.map(({ orden: _orden, ...rest }) => rest));
  }, [data?.meta]);

  async function guardar() {
    setGuardando(true);
    setMsg("");
    const res = await fetch("/api/direccion/estrategia/meta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, periodo, descripcion, fechaInicio, fechaFin, indicadores }),
    });
    const d = await res.json();
    setGuardando(false);
    if (!res.ok) return setMsg(d.error ?? "No se pudo guardar");
    setEditando(false);
    recargar();
  }

  async function releerFinanzas() {
    setGuardando(true);
    const res = await fetch("/api/direccion/estrategia/meta", { method: "PUT" });
    const d = await res.json();
    setGuardando(false);
    setMsg(res.ok ? `${d.actualizados} indicadores releídos del ${d.anio}.` : d.error);
    recargar();
  }

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;
  if (!data?.meta) return <div className="p-6 text-gray-500 text-sm">Sin meta capturada.</div>;

  const m = data.meta;

  return (
    <Lienzo>
      <Encabezado
        titulo="Meta global del periodo"
        bajada="El norte cuantitativo del año. Todo objetivo de área debe poder explicarse contra esta meta; si no, sobra."
        acciones={
          !editando ? (
            <>
              <button className={btnGhost} onClick={releerFinanzas} disabled={guardando}>
                <span className="flex items-center gap-1.5">
                  <RefreshCw strokeWidth={1.8} className={`w-3.5 h-3.5 ${guardando ? "animate-spin" : ""}`} />
                  Releer de finanzas
                </span>
              </button>
              <button className={btnPrimary} onClick={() => setEditando(true)}>
                Editar
              </button>
            </>
          ) : undefined
        }
      />

      {msg && <div className="text-sm" style={{ color: GOLD }}>{msg}</div>}

      {editando ? (
        <Panel acento className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Periodo</label>
              <input className={inputCls} value={periodo} onChange={e => setPeriodo(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Inicio</label>
              <input
                type="date"
                className={inputCls}
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Fin</label>
              <input
                type="date"
                className={inputCls}
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Meta en una línea</label>
            <input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Por qué esta meta</label>
            <textarea
              className={inputCls}
              rows={4}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className={labelCls + " mb-0"}>Indicadores</label>
              <button
                className="text-xs hover:underline flex items-center gap-1"
                style={{ color: GOLD }}
                onClick={() =>
                  setIndicadores([
                    ...indicadores,
                    {
                      nombre: "",
                      unidad: "%",
                      lineaBase: null,
                      valorMeta: null,
                      valorActual: null,
                      kpiSlug: null,
                    },
                  ])
                }
              >
                <Plus strokeWidth={2.2} className="w-3 h-3" />
                agregar
              </button>
            </div>
            <div className="space-y-2">
              {indicadores.map((ind, i) => {
                const set = (patch: Partial<IndicadorForm>) =>
                  setIndicadores(indicadores.map((x, ix) => (ix === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        placeholder="Nombre del indicador"
                        value={ind.nombre}
                        onChange={e => set({ nombre: e.target.value })}
                      />
                      <button
                        className="text-gray-600 hover:text-red-400 px-1 shrink-0"
                        onClick={() => setIndicadores(indicadores.filter((_, ix) => ix !== i))}
                      >
                        <X strokeWidth={2} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <select
                        className={inputCls}
                        value={ind.unidad}
                        onChange={e => set({ unidad: e.target.value })}
                      >
                        {UNIDADES_META.map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <input
                        className={inputCls}
                        placeholder="Línea base"
                        value={ind.lineaBase ?? ""}
                        onChange={e => set({ lineaBase: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                      <input
                        className={inputCls}
                        placeholder="Meta"
                        value={ind.valorMeta ?? ""}
                        onChange={e => set({ valorMeta: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                      <input
                        className={inputCls}
                        placeholder="Actual"
                        value={ind.valorActual ?? ""}
                        onChange={e => set({ valorActual: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                      <select
                        className={inputCls}
                        value={ind.kpiSlug ?? ""}
                        onChange={e => set({ kpiSlug: e.target.value || null })}
                      >
                        {KPI_OPCIONES.map(k => (
                          <option key={k.slug} value={k.slug}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button className={btnPrimary} onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button className={btnGhost} onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </Panel>
      ) : (
        <>
          <Panel acento>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: oro(0.12), color: GOLD, border: `1px solid ${oro(0.3)}` }}
              >
                Periodo {m.periodo}
              </span>
              <span className="text-[11px] text-gray-600 flex items-center gap-1.5">
                <CalendarRange strokeWidth={1.7} className="w-3.5 h-3.5" />
                {new Date(m.fechaInicio).toLocaleDateString("es-MX", { dateStyle: "medium" })} —{" "}
                {new Date(m.fechaFin).toLocaleDateString("es-MX", { dateStyle: "medium" })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-[32px] font-semibold text-white mt-4 leading-[1.15] tracking-tight">
              {m.titulo}
            </h2>
            {m.descripcion && (
              <p className="text-[15px] text-gray-400 mt-4 leading-[1.75] whitespace-pre-line">
                {m.descripcion}
              </p>
            )}
          </Panel>

          <div className="space-y-4">
            <Rotulo icono={Gauge}>Indicadores que miden el periodo</Rotulo>
            <div className="grid sm:grid-cols-3 gap-4">
              {m.indicadores.map(ind => {
                const pct =
                  ind.valorMeta && ind.valorActual != null
                    ? Math.min(100, Math.round((ind.valorActual / ind.valorMeta) * 100))
                    : null;
                const sinMeta = ind.valorMeta == null;
                return (
                  <Panel key={ind.id}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 leading-snug">{ind.nombre}</p>
                        <p
                          className="text-[26px] font-semibold mt-2 tracking-tight tabular-nums"
                          style={{ color: sinMeta ? "rgba(255,255,255,0.28)" : "#fff" }}
                        >
                          {sinMeta ? "Sin meta" : formatValorMeta(ind.valorMeta, ind.unidad)}
                        </p>
                      </div>
                      {pct !== null && <Anillo pct={pct} tam={46} />}
                    </div>

                    <div className="mt-4 pt-3.5 space-y-1.5" style={{ borderTop: `1px solid ${oro(0.1)}` }}>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-600">Línea base</span>
                        <span className="text-gray-400 tabular-nums">
                          {formatValorMeta(ind.lineaBase, ind.unidad)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-600">Actual</span>
                        <span className="text-gray-400 tabular-nums">
                          {formatValorMeta(ind.valorActual, ind.unidad)}
                        </span>
                      </div>
                      {ind.kpiSlug && (
                        <p
                          className="text-[10px] flex items-center gap-1.5 pt-1"
                          style={{ color: oro(0.6) }}
                        >
                          <Zap strokeWidth={2} className="w-3 h-3" />
                          Lectura automática de finanzas
                        </p>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>
        </>
      )}
    </Lienzo>
  );
}
