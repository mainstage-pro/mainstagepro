"use client";

import { useEffect, useState } from "react";
import { KPI_OPCIONES, UNIDADES_META, formatValorMeta } from "@/lib/estrategia";
import {
  useEstrategia,
  inputCls,
  labelCls,
  cardCls,
  btnPrimary,
  btnGhost,
  type IndicadorDTO,
} from "../useEstrategia";

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
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Meta global del periodo</h1>
          <p className="text-sm text-gray-500 mt-1">
            El norte cuantitativo del año. Todo objetivo de área debe poder explicarse contra esta meta;
            si no, sobra.
          </p>
        </div>
        {!editando && (
          <div className="flex gap-2 ml-auto shrink-0">
            <button className={btnGhost} onClick={releerFinanzas} disabled={guardando}>
              Releer de finanzas
            </button>
            <button className={btnPrimary} onClick={() => setEditando(true)}>
              Editar
            </button>
          </div>
        )}
      </div>

      {msg && <div className="text-sm text-[#B3985B]">{msg}</div>}

      {editando ? (
        <div className={`${cardCls} space-y-3`}>
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
                className="text-xs text-[#B3985B] hover:underline"
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
                + agregar
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
                        ✕
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
        </div>
      ) : (
        <>
          <div className={cardCls}>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30">
              Periodo {m.periodo}
            </span>
            <h2 className="text-2xl font-semibold text-white mt-3">{m.titulo}</h2>
            {m.descripcion && (
              <p className="text-sm text-gray-400 mt-3 leading-relaxed whitespace-pre-line">
                {m.descripcion}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-3">
              {new Date(m.fechaInicio).toLocaleDateString("es-MX")} —{" "}
              {new Date(m.fechaFin).toLocaleDateString("es-MX")}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {m.indicadores.map(ind => {
              const pct =
                ind.valorMeta && ind.valorActual != null
                  ? Math.min(100, Math.round((ind.valorActual / ind.valorMeta) * 100))
                  : null;
              return (
                <div key={ind.id} className={cardCls}>
                  <p className="text-sm text-gray-400">{ind.nombre}</p>
                  <p className="text-2xl font-semibold text-white mt-2">
                    {formatValorMeta(ind.valorMeta, ind.unidad)}
                  </p>
                  <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                    <p>Línea base: {formatValorMeta(ind.lineaBase, ind.unidad)}</p>
                    <p>
                      Actual: {formatValorMeta(ind.valorActual, ind.unidad)}
                      {pct !== null && <span className="text-[#B3985B]"> · {pct}%</span>}
                    </p>
                    {ind.kpiSlug && <p className="text-[#B3985B]/70">Lectura automática</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
