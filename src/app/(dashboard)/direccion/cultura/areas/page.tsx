"use client";

import { useState } from "react";
import {
  Target,
  Megaphone,
  Wrench,
  Users,
  Landmark,
  Compass,
  Crown,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  User,
  CalendarClock,
  Zap,
  AlertTriangle,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  ESTADOS_TACTICA,
  ESTADO_OBJETIVO_META,
  KPI_OPCIONES,
  UNIDADES_META,
  formatValorMeta,
} from "@/lib/estrategia";
import { fmtDate } from "@/lib/dates";
import {
  useEstrategia,
  inputCls,
  labelCls,
  btnPrimary,
  btnGhost,
  type AreaDTO,
  type ObjetivoDTO,
  type TacticaDTO,
  type UsuarioLite,
} from "../useEstrategia";
import { Lienzo, Encabezado, Panel, Anillo, Vacio, GOLD, oro } from "../ui";

const ICONO_AREA: Record<string, LucideIcon> = {
  DIRECCION: Crown,
  ADMINISTRACION: Landmark,
  MARKETING: Megaphone,
  VENTAS: Target,
  PRODUCCION: Wrench,
  RRHH: Users,
  GENERAL: Compass,
};

export default function AreasPage() {
  const { data, cargando, error, recargar } = useEstrategia();
  const [abierta, setAbierta] = useState<string | null>(null);

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;

  const areas = data?.areas ?? [];
  const usuarios = data?.usuarios ?? [];

  return (
    <Lienzo ancho="max-w-5xl">
      <Encabezado
        titulo="Áreas, objetivos y tácticas"
        bajada="El propósito dice por qué existe el equipo. Los objetivos dicen qué tiene que lograr, con número y fecha. Las tácticas son lo que alguien hace el lunes — y son las únicas que mueven el avance."
      />

      <div className="space-y-4">
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
    </Lienzo>
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
  const Icono = ICONO_AREA[area.areaPermiso] ?? Compass;

  return (
    <Panel acento={abierta}>
      <div className="flex items-center gap-4">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: oro(0.08), border: `1px solid ${oro(0.24)}` }}
        >
          <Icono strokeWidth={1.6} className="w-[18px] h-[18px]" style={{ color: GOLD }} />
        </div>

        <button onClick={alternar} className="min-w-0 flex-1 text-left">
          <h2 className="text-[17px] font-semibold text-white tracking-tight">{area.nombre}</h2>
          <div className="flex items-center gap-2.5 mt-1 text-[11px] flex-wrap">
            <span className="text-gray-500 flex items-center gap-1.5">
              <User strokeWidth={1.7} className="w-3 h-3" />
              {responsable?.name ?? "sin dueño"}
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-500">
              {area.objetivos.length} {area.objetivos.length === 1 ? "objetivo" : "objetivos"}
            </span>
            {area.enRiesgo > 0 && (
              <span className="text-red-400 flex items-center gap-1.5">
                <AlertTriangle strokeWidth={1.8} className="w-3 h-3" />
                {area.enRiesgo} en riesgo
              </span>
            )}
          </div>
        </button>

        <Anillo pct={area.progreso} tam={44} />

        <button
          className="shrink-0 text-gray-600 hover:text-white transition-colors p-1"
          onClick={alternar}
          aria-label={abierta ? "Cerrar" : "Abrir"}
        >
          {abierta ? (
            <ChevronDown strokeWidth={1.8} className="w-4 h-4" />
          ) : (
            <ChevronRight strokeWidth={1.8} className="w-4 h-4" />
          )}
        </button>
      </div>

      {abierta && (
        <div className="mt-6 space-y-6">
          <div className="pt-1" style={{ borderTop: `1px solid ${oro(0.12)}` }}>
            <div className="flex items-center gap-2 mt-4 mb-1.5">
              <span
                className="text-[10px] font-medium uppercase"
                style={{ color: oro(0.75), letterSpacing: "0.2em" }}
              >
                Propósito del área
              </span>
              {!editandoProp && (
                <button
                  className="text-[11px] hover:underline flex items-center gap-1"
                  style={{ color: GOLD }}
                  onClick={() => setEditandoProp(true)}
                >
                  <Pencil strokeWidth={1.9} className="w-2.5 h-2.5" />
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
              <p className="text-[14px] text-gray-300 leading-[1.75] whitespace-pre-line">
                {area.proposito || "Todavía sin redactar."}
              </p>
            )}
          </div>

          {area.objetivos.length > 0 ? (
            <div className="space-y-3">
              {area.objetivos.map(o => (
                <Objetivo key={o.id} objetivo={o} usuarios={usuarios} recargar={recargar} />
              ))}
            </div>
          ) : (
            !nuevoAbierto && (
              <Vacio
                icono={Target}
                titulo="Esta área no tiene objetivos"
                texto="Sin objetivos no hay forma de saber si el área avanza. Un objetivo es un número con fecha, no una intención."
                accion={
                  <button className={btnPrimary} onClick={() => setNuevoAbierto(true)}>
                    Escribir el primer objetivo
                  </button>
                }
              />
            )
          )}

          {nuevoAbierto ? (
            <FormObjetivo areaId={area.id} cerrar={() => setNuevoAbierto(false)} recargar={recargar} />
          ) : (
            area.objetivos.length > 0 && (
              <button className={btnGhost} onClick={() => setNuevoAbierto(true)}>
                <span className="flex items-center gap-1.5">
                  <Plus strokeWidth={2} className="w-3.5 h-3.5" />
                  Nuevo objetivo
                </span>
              </button>
            )
          )}
        </div>
      )}
    </Panel>
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

  const hechas = objetivo.tacticas.filter(t => t.estado === "COMPLETADO").length;

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{ background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${est.color}` }}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-gray-100 leading-[1.6]">{objetivo.descripcion}</p>

          <div className="flex items-baseline gap-2.5 mt-3 flex-wrap">
            <span className="text-[11px] text-gray-600">{objetivo.metrica}</span>
            <span className="text-[11px] text-gray-600 tabular-nums">
              {formatValorMeta(objetivo.lineaBase, objetivo.unidad)}
            </span>
            <span className="text-gray-700 text-[11px]">→</span>
            <span className="text-lg font-semibold tabular-nums tracking-tight" style={{ color: GOLD }}>
              {formatValorMeta(objetivo.valorMeta, objetivo.unidad)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-600">
            {objetivo.valorActual != null && (
              <span className="tabular-nums">
                Actual {formatValorMeta(objetivo.valorActual, objetivo.unidad)}
              </span>
            )}
            {objetivo.fechaLimite && (
              <span className="flex items-center gap-1.5">
                <CalendarClock strokeWidth={1.7} className="w-3 h-3" />
                {fmtDate(objetivo.fechaLimite, { dateStyle: "medium" })}
              </span>
            )}
            {objetivo.tacticas.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Check strokeWidth={2.2} className="w-3 h-3" />
                {hechas} de {objetivo.tacticas.length} tácticas
              </span>
            )}
            {objetivo.kpiSlug && (
              <span className="flex items-center gap-1.5" style={{ color: oro(0.6) }}>
                <Zap strokeWidth={2} className="w-3 h-3" />
                automático
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <Anillo pct={objetivo.progreso} tam={40} color={est.color} />
          <span
            className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: `${est.color}1f`, color: est.color }}
          >
            {est.label}
          </span>
          <div className="flex gap-1.5">
            <button
              className="text-gray-700 hover:text-white transition-colors"
              onClick={() => setEditando(true)}
              aria-label="Editar objetivo"
            >
              <Pencil strokeWidth={1.8} className="w-3 h-3" />
            </button>
            <button
              className="text-gray-700 hover:text-red-400 transition-colors"
              onClick={borrar}
              aria-label="Dar de baja"
            >
              <Trash2 strokeWidth={1.8} className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {objetivo.tacticas.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {objetivo.tacticas.map(t => (
            <Tactica key={t.id} tactica={t} usuarios={usuarios} recargar={recargar} />
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <input
          className={inputCls}
          placeholder="Nueva táctica: qué se hace concretamente"
          value={nuevaTactica}
          onChange={e => setNuevaTactica(e.target.value)}
          onKeyDown={e => e.key === "Enter" && agregarTactica()}
        />
        <button className={btnGhost} onClick={agregarTactica}>
          <span className="flex items-center gap-1.5">
            <Plus strokeWidth={2} className="w-3.5 h-3.5" />
            Agregar
          </span>
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
      className="rounded-lg px-3 py-2"
      style={
        tactica.vencida
          ? { background: "rgba(69,10,10,0.18)", border: "1px solid rgba(153,27,27,0.38)" }
          : { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: meta?.color, boxShadow: `0 0 6px ${meta?.color}66` }}
        />
        <button onClick={() => setAbierto(!abierto)} className="min-w-0 flex-1 text-left">
          <span
            className={`text-[13px] ${
              tactica.estado === "COMPLETADO" ? "text-gray-600 line-through" : "text-gray-300"
            }`}
          >
            {tactica.descripcion}
          </span>
          {(responsable || tactica.fechaEjecucion) && (
            <span className="text-[11px] text-gray-600 ml-2">
              {responsable?.name}
              {responsable && tactica.fechaEjecucion && " · "}
              {tactica.fechaEjecucion && fmtDate(tactica.fechaEjecucion)}
              {tactica.vencida && <span className="text-red-400"> · vencida</span>}
            </span>
          )}
        </button>
        <select
          className="bg-[#0d0d0d] border border-[#222] text-[11px] rounded px-1.5 py-1 shrink-0"
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
        <div
          className="grid sm:grid-cols-2 gap-2 mt-2.5 pt-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
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
            <button
              className="text-[11px] text-gray-700 hover:text-red-400 flex items-center gap-1.5"
              onClick={borrar}
            >
              <Trash2 strokeWidth={1.8} className="w-3 h-3" />
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
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: oro(0.04), border: `1px solid ${oro(0.34)}` }}
    >
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
