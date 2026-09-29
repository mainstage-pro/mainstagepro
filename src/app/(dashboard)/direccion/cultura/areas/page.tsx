"use client";

import { useState } from "react";
import {
  ESTADOS_TACTICA,
  ESTADO_OBJETIVO_META,
  KPI_OPCIONES,
  UNIDADES_META,
  formatValorMeta,
} from "@/lib/estrategia";
import {
  useEstrategia,
  inputCls,
  labelCls,
  cardCls,
  btnPrimary,
  btnGhost,
  type AreaDTO,
  type ObjetivoDTO,
  type TacticaDTO,
  type UsuarioLite,
} from "../useEstrategia";

export default function AreasPage() {
  const { data, cargando, error, recargar } = useEstrategia();
  const [abierta, setAbierta] = useState<string | null>(null);

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;

  const areas = data?.areas ?? [];
  const usuarios = data?.usuarios ?? [];

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Áreas, objetivos y tácticas</h1>
        <p className="text-sm text-gray-500 mt-1">
          El propósito dice por qué existe el equipo. Los objetivos dicen qué tiene que lograr, con número
          y fecha. Las tácticas son lo que alguien hace el lunes — y son las únicas que mueven el avance.
        </p>
      </div>

      {areas.map(a => (
        <TarjetaArea
          key={a.id}
          area={a}
          usuarios={usuarios}
          abierta={abierta === a.id}
          alternar={() => setAbierta(abierta === a.id ? null : a.id)}
          recargar={recargar}
        />
      ))}
    </div>
  );
}

function TarjetaArea({
  area,
  usuarios,
  abierta,
  alternar,
  recargar,
}: {
  area: AreaDTO;
  usuarios: UsuarioLite[];
  abierta: boolean;
  alternar: () => void;
  recargar: () => void;
}) {
  const [editandoProp, setEditandoProp] = useState(false);
  const [proposito, setProposito] = useState(area.proposito ?? "");
  const [responsableId, setResponsableId] = useState(area.responsableId ?? "");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);

  async function guardarArea() {
    await fetch("/api/direccion/estrategia/areas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: area.id, proposito, responsableId }),
    });
    setEditandoProp(false);
    recargar();
  }

  const responsable = usuarios.find(u => u.id === area.responsableId);

  return (
    <div className={cardCls}>
      <div className="flex items-start gap-3">
        <button onClick={alternar} className="flex-1 text-left">
          <h2 className="text-lg font-semibold text-white">
            {area.nombre}
            <span className="text-gray-600 text-sm font-normal ml-2">
              {area.objetivos.length} objetivos
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Dueño: {responsable?.name ?? "sin asignar"} · avance {area.progreso}%
            {area.enRiesgo > 0 && (
              <span className="text-red-400"> · {area.enRiesgo} en riesgo</span>
            )}
          </p>
        </button>
        <button className={btnGhost} onClick={alternar}>
          {abierta ? "Cerrar" : "Abrir"}
        </button>
      </div>

      <div className="h-1.5 bg-[#1a1a1a] rounded-full mt-3 overflow-hidden">
        <div
          className="h-full bg-[#B3985B] rounded-full transition-all"
          style={{ width: `${area.progreso}%` }}
        />
      </div>

      {abierta && (
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className={labelCls + " mb-0"}>Propósito del área</label>
              {!editandoProp && (
                <button
                  className="text-xs text-[#B3985B] hover:underline"
                  onClick={() => setEditandoProp(true)}
                >
                  editar
                </button>
              )}
            </div>
            {editandoProp ? (
              <div className="space-y-2">
                <textarea
                  className={inputCls}
                  rows={4}
                  value={proposito}
                  onChange={e => setProposito(e.target.value)}
                />
                <div>
                  <label className={labelCls}>Dueño del área</label>
                  <select
                    className={inputCls}
                    value={responsableId}
                    onChange={e => setResponsableId(e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button className={btnPrimary} onClick={guardarArea}>
                    Guardar
                  </button>
                  <button className={btnGhost} onClick={() => setEditandoProp(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {area.proposito || "—"}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {area.objetivos.map(o => (
              <Objetivo key={o.id} objetivo={o} usuarios={usuarios} recargar={recargar} />
            ))}
          </div>

          {nuevoAbierto ? (
            <FormObjetivo
              areaId={area.id}
              cerrar={() => setNuevoAbierto(false)}
              recargar={recargar}
            />
          ) : (
            <button className={btnGhost} onClick={() => setNuevoAbierto(true)}>
              + Nuevo objetivo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Objetivo({
  objetivo,
  usuarios,
  recargar,
}: {
  objetivo: ObjetivoDTO;
  usuarios: UsuarioLite[];
  recargar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nuevaTactica, setNuevaTactica] = useState("");
  const est = ESTADO_OBJETIVO_META[objetivo.estadoCalc];

  async function agregarTactica() {
    const descripcion = nuevaTactica.trim();
    if (!descripcion) return;
    await fetch("/api/direccion/estrategia/tacticas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objetivoId: objetivo.id, descripcion }),
    });
    setNuevaTactica("");
    recargar();
  }

  async function borrar() {
    if (!confirm("¿Dar de baja este objetivo y sus tácticas?")) return;
    await fetch(`/api/direccion/estrategia/objetivos?id=${objetivo.id}`, { method: "DELETE" });
    recargar();
  }

  if (editando) {
    return (
      <FormObjetivo
        areaId={objetivo.areaId}
        objetivo={objetivo}
        cerrar={() => setEditando(false)}
        recargar={recargar}
      />
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm text-gray-200 leading-relaxed">{objetivo.descripcion}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            <span>{objetivo.metrica}</span>
            <span>
              {formatValorMeta(objetivo.lineaBase, objetivo.unidad)} →{" "}
              <span className="text-[#B3985B]">{formatValorMeta(objetivo.valorMeta, objetivo.unidad)}</span>
            </span>
            {objetivo.valorActual != null && (
              <span>Actual: {formatValorMeta(objetivo.valorActual, objetivo.unidad)}</span>
            )}
            {objetivo.fechaLimite && (
              <span>Límite: {new Date(objetivo.fechaLimite).toLocaleDateString("es-MX")}</span>
            )}
            {objetivo.kpiSlug && <span className="text-[#B3985B]/70">automático</span>}
          </div>
        </div>
        <div className="shrink-0 text-right space-y-1.5">
          <span
            className="text-xs px-2 py-0.5 rounded-full block"
            style={{ background: `${est.color}22`, color: est.color }}
          >
            {est.label}
          </span>
          <span className="text-xs text-gray-500 block">{objetivo.progreso}%</span>
          <div className="flex gap-1 justify-end">
            <button className="text-xs text-gray-600 hover:text-white" onClick={() => setEditando(true)}>
              editar
            </button>
            <button className="text-xs text-gray-700 hover:text-red-400" onClick={borrar}>
              baja
            </button>
          </div>
        </div>
      </div>

      <div className="h-1 bg-[#1a1a1a] rounded-full mt-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${objetivo.progreso}%`, background: est.color }}
        />
      </div>

      <div className="mt-3 space-y-1.5">
        {objetivo.tacticas.map(t => (
          <Tactica key={t.id} tactica={t} usuarios={usuarios} recargar={recargar} />
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className={inputCls}
          placeholder="Nueva táctica: qué se hace concretamente"
          value={nuevaTactica}
          onChange={e => setNuevaTactica(e.target.value)}
          onKeyDown={e => e.key === "Enter" && agregarTactica()}
        />
        <button className={btnGhost} onClick={agregarTactica}>
          Agregar
        </button>
      </div>
    </div>
  );
}

function Tactica({
  tactica,
  usuarios,
  recargar,
}: {
  tactica: TacticaDTO;
  usuarios: UsuarioLite[];
  recargar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const meta = ESTADOS_TACTICA.find(e => e.value === tactica.estado);
  const responsable = usuarios.find(u => u.id === tactica.responsableId);

  async function patch(body: Record<string, unknown>) {
    await fetch("/api/direccion/estrategia/tacticas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tactica.id, ...body }),
    });
    recargar();
  }

  async function borrar() {
    await fetch(`/api/direccion/estrategia/tacticas?id=${tactica.id}`, { method: "DELETE" });
    recargar();
  }

  return (
    <div
      className={`rounded-md px-3 py-2 border ${
        tactica.vencida ? "border-red-900/50 bg-red-950/10" : "border-[#1a1a1a] bg-[#111]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta?.color }} />
        <button onClick={() => setAbierto(!abierto)} className="flex-1 text-left">
          <span
            className={`text-sm ${
              tactica.estado === "COMPLETADO" ? "text-gray-500 line-through" : "text-gray-300"
            }`}
          >
            {tactica.descripcion}
          </span>
          {(responsable || tactica.fechaEjecucion) && (
            <span className="text-xs text-gray-600 ml-2">
              {responsable?.name}
              {responsable && tactica.fechaEjecucion && " · "}
              {tactica.fechaEjecucion &&
                new Date(tactica.fechaEjecucion).toLocaleDateString("es-MX")}
              {tactica.vencida && <span className="text-red-400"> · vencida</span>}
            </span>
          )}
        </button>
        <select
          className="bg-[#0d0d0d] border border-[#222] text-xs rounded px-1.5 py-1 shrink-0"
          style={{ color: meta?.color }}
          value={tactica.estado}
          onChange={e => patch({ estado: e.target.value })}
        >
          {ESTADOS_TACTICA.map(e => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {abierto && (
        <div className="grid sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1a1a1a]">
          <div>
            <label className={labelCls}>Responsable</label>
            <select
              className={inputCls}
              value={tactica.responsableId ?? ""}
              onChange={e => patch({ responsableId: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha de ejecución</label>
            <input
              type="date"
              className={inputCls}
              value={tactica.fechaEjecucion?.slice(0, 10) ?? ""}
              onChange={e => patch({ fechaEjecucion: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="text-xs text-gray-700 hover:text-red-400" onClick={borrar}>
              Eliminar táctica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormObjetivo({
  areaId,
  objetivo,
  cerrar,
  recargar,
}: {
  areaId: string;
  objetivo?: ObjetivoDTO;
  cerrar: () => void;
  recargar: () => void;
}) {
  const [descripcion, setDescripcion] = useState(objetivo?.descripcion ?? "");
  const [metrica, setMetrica] = useState(objetivo?.metrica ?? "");
  const [unidad, setUnidad] = useState(objetivo?.unidad ?? "número");
  const [lineaBase, setLineaBase] = useState(objetivo?.lineaBase?.toString() ?? "");
  const [valorMeta, setValorMeta] = useState(objetivo?.valorMeta?.toString() ?? "");
  const [kpiSlug, setKpiSlug] = useState(objetivo?.kpiSlug ?? "");
  const [fechaLimite, setFechaLimite] = useState(objetivo?.fechaLimite?.slice(0, 10) ?? "");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  async function guardar() {
    setGuardando(true);
    setMsg("");
    const body = { descripcion, metrica, unidad, lineaBase, valorMeta, kpiSlug, fechaLimite };
    const res = await fetch("/api/direccion/estrategia/objetivos", {
      method: objetivo ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objetivo ? { id: objetivo.id, ...body } : { areaId, ...body }),
    });
    const d = await res.json();
    setGuardando(false);
    if (!res.ok) return setMsg(d.error ?? "No se pudo guardar");
    cerrar();
    recargar();
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#B3985B]/40 rounded-lg p-4 space-y-3">
      <div>
        <label className={labelCls}>Objetivo (qué se logra, medible y con fecha)</label>
        <textarea
          className={inputCls}
          rows={3}
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>Métrica de éxito</label>
        <input className={inputCls} value={metrica} onChange={e => setMetrica(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div>
          <label className={labelCls}>Unidad</label>
          <select className={inputCls} value={unidad} onChange={e => setUnidad(e.target.value)}>
            {UNIDADES_META.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Línea base</label>
          <input className={inputCls} value={lineaBase} onChange={e => setLineaBase(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Meta</label>
          <input className={inputCls} value={valorMeta} onChange={e => setValorMeta(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Fecha límite</label>
          <input
            type="date"
            className={inputCls}
            value={fechaLimite}
            onChange={e => setFechaLimite(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Fuente</label>
          <select className={inputCls} value={kpiSlug} onChange={e => setKpiSlug(e.target.value)}>
            {KPI_OPCIONES.map(k => (
              <option key={k.slug} value={k.slug}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <div className="flex gap-2">
        <button className={btnPrimary} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button className={btnGhost} onClick={cerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
