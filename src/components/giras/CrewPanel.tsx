"use client";

/**
 * Quién va a la gira y de dónde sale. Sirve en dos alcances con la misma tabla:
 * la lista completa de la gira y el crew de una plaza. Un renglón sin plaza
 * viaja toda la gira; con plaza es refuerzo de ese día, y el alcance se cambia
 * desde el propio renglón.
 */

import { useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { coincide } from "@/lib/buscar";
import {
  ORIGENES_CREW,
  ORIGEN_CREW_LABEL,
  clavePersona,
  fmtFechaCorta,
  nombreCrew,
  partirClavePersona,
} from "@/lib/giras";
import { fmt24to12 } from "@/lib/hora";

export interface CrewFila {
  id: string;
  showId: string | null;
  origen: string;
  tecnicoId: string | null;
  personaId: string | null;
  nombreLibre: string | null;
  funcion: string;
  rolTecnicoId: string | null;
  telefono: string | null;
  email: string | null;
  llamado: string | null;
  notas: string | null;
  tecnico: { id: string; nombre: string; celular: string | null } | null;
  persona: { id: string; nombre: string; rol: string; telefono: string | null; email: string | null } | null;
  rolTecnico: { id: string; nombre: string; disciplina: string | null } | null;
  show: { id: string; fecha: Date | string; ciudad: string | null } | null;
}

export interface CandidatoPersonaUI {
  valor: string;
  etiqueta: string;
  grupo: string;
}

export interface PlazaCrew {
  id: string;
  fecha: Date | string;
  ciudad: string | null;
}

interface Props {
  giraId: string;
  /// GIRA = toda la gira; SHOW = el crew que trabaja esa plaza.
  alcance: "GIRA" | "SHOW";
  showId?: string;
  crewInicial: CrewFila[];
  personas: CandidatoPersonaUI[];
  roles: { id: string; nombre: string; disciplina: string | null }[];
  plazas?: PlazaCrew[];
}

type Campos = Partial<Record<keyof CrewFila, unknown>>;

const DEMORA_GUARDADO = 700;

interface Nuevo {
  persona: string;
  nombreLibre: string;
  funcion: string;
  origen: string;
  rolTecnicoId: string;
}

const NUEVO: Nuevo = { persona: "", nombreLibre: "", funcion: "", origen: "MAINSTAGE", rolTecnicoId: "" };

export default function CrewPanel({
  giraId,
  alcance,
  showId,
  crewInicial,
  personas,
  roles,
  plazas = [],
}: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [crew, setCrew] = useState<CrewFila[]>(crewInicial);
  const [busqueda, setBusqueda] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadas, setGuardadas] = useState<Set<string>>(new Set());

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // ── Guardado por renglón ───────────────────────────────────────────────────
  async function descargar(id: string) {
    const campos = pendientes.current.get(id);
    pendientes.current.delete(id);
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    if (!campos) return;

    const res = await fetch(`/api/gira-crew/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el renglón");
      return;
    }
    setGuardadas((prev) => new Set(prev).add(id));
    setTimeout(
      () =>
        setGuardadas((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        }),
      1500,
    );
  }

  function editar(id: string, campos: Campos, inmediato = false) {
    setCrew((prev) => prev.map((c) => (c.id === id ? ({ ...c, ...campos } as CrewFila) : c)));
    pendientes.current.set(id, { ...(pendientes.current.get(id) ?? {}), ...campos });
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(id);
      return;
    }
    timers.current.set(id, setTimeout(() => void descargar(id), DEMORA_GUARDADO));
  }

  /// Al elegir persona del selector se reescriben los dos ids y el nombre libre
  /// se limpia: la fila tiene una sola identidad.
  function elegirPersona(fila: CrewFila, valor: string) {
    const { tecnicoId, personaId } = partirClavePersona(valor);
    const candidato = personas.find((p) => p.valor === valor);
    editar(
      fila.id,
      {
        tecnicoId,
        personaId,
        nombreLibre: null,
        // El include no regresa hasta el PATCH; se pinta el nombre del candidato
        // para que la celda no quede vacía mientras guarda.
        tecnico: tecnicoId ? { id: tecnicoId, nombre: candidato?.etiqueta.split(" — ")[0] ?? "", celular: null } : null,
        persona: personaId
          ? {
              id: personaId,
              nombre: candidato?.etiqueta.split(" — ")[0] ?? "",
              rol: fila.persona?.rol ?? "OTRO",
              telefono: null,
              email: null,
            }
          : null,
      },
      true,
    );
  }

  async function agregar() {
    if (!nuevo) return;
    if (!nuevo.persona && !nuevo.nombreLibre.trim()) {
      toast.error("Elige a alguien del catálogo o escribe el nombre.");
      return;
    }
    setGuardando(true);
    try {
      const { tecnicoId, personaId } = partirClavePersona(nuevo.persona);
      const res = await fetch(`/api/giras/${giraId}/crew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: alcance === "SHOW" ? showId : null,
          origen: nuevo.origen,
          tecnicoId,
          personaId,
          nombreLibre: nuevo.persona ? null : nuevo.nombreLibre,
          funcion: nuevo.funcion,
          rolTecnicoId: nuevo.rolTecnicoId || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo sumar a la persona");
        return;
      }
      setCrew((prev) => [...prev, d.miembro]);
      setNuevo({ ...NUEVO, origen: nuevo.origen });
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(fila: CrewFila) {
    const ok = await confirmar({
      title: "Dar de baja del crew",
      message: `${nombreCrew(fila)} deja de aparecer en el crew de la gira. Su cuarto y sus viajes se quedan en la logística.`,
      confirmText: "Dar de baja",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-crew/${fila.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo dar de baja");
      return;
    }
    setCrew((prev) => prev.filter((c) => c.id !== fila.id));
    toast.success("Fuera del crew");
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const opcionesPersona: ComboboxOption[] = useMemo(
    () => [
      { value: "", label: "— Nombre escrito a mano —" },
      ...personas.map((p) => ({ value: p.valor, label: p.etiqueta, group: p.grupo })),
    ],
    [personas],
  );

  const opcionesRol: ComboboxOption[] = useMemo(
    () => [
      { value: "", label: "— Sin rol del tabulador —" },
      ...roles.map((r) => ({ value: r.id, label: r.nombre, group: r.disciplina ?? "Otros" })),
    ],
    [roles],
  );

  const origenesPresentes = ORIGENES_CREW.filter((o) => crew.some((c) => c.origen === o));

  const visibles = crew.filter((c) => {
    if (filtroOrigen && c.origen !== filtroOrigen) return false;
    if (busqueda && !coincide(busqueda, nombreCrew(c), c.funcion, c.rolTecnico?.nombre, c.telefono, c.email)) return false;
    return true;
  });

  const deLaGira = visibles.filter((c) => !c.showId);
  const deLaPlaza = visibles.filter((c) => c.showId);

  const grupos =
    alcance === "SHOW"
      ? [
          { titulo: "Viaja toda la gira", filas: deLaGira },
          { titulo: "Solo esta plaza", filas: deLaPlaza },
        ].filter((g) => g.filas.length > 0)
      : [{ titulo: "", filas: visibles }];

  return (
    <div className="space-y-4">
      {/* Métricas y acciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Personas</p>
          <p className="text-white text-xl font-semibold">{crew.length}</p>
          <p className="ms-meta">{alcance === "SHOW" ? "trabajan esta plaza" : "en el crew de la gira"}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">De Mainstage</p>
          <p className="text-white text-xl font-semibold">{crew.filter((c) => c.origen === "MAINSTAGE").length}</p>
          <p className="ms-meta">{crew.filter((c) => c.origen === "ARTISTA").length} del artista</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Sin función definida</p>
          <p
            className={`text-xl font-semibold ${
              crew.filter((c) => c.funcion === "Por definir").length ? "text-amber-300" : "text-emerald-300"
            }`}
          >
            {crew.filter((c) => c.funcion === "Por definir").length}
          </p>
          <p className="ms-meta">la función es lo que se olvida</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Sin teléfono</p>
          <p className={`text-xl font-semibold ${crew.filter((c) => !c.telefono).length ? "text-amber-300" : "text-emerald-300"}`}>
            {crew.filter((c) => !c.telefono).length}
          </p>
          <p className="ms-meta">el día del show se llama, no se escribe</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] text-xs">⌕</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, función o rol…"
            className="ms-input-search"
          />
        </div>
        <button onClick={() => setFiltroOrigen("")} className={!filtroOrigen ? "ms-filter-select-active" : "ms-filter-select"}>
          Todos ({crew.length})
        </button>
        {origenesPresentes.map((o) => (
          <button
            key={o}
            onClick={() => setFiltroOrigen((f) => (f === o ? "" : o))}
            className={filtroOrigen === o ? "ms-filter-select-active" : "ms-filter-select"}
          >
            {ORIGEN_CREW_LABEL[o]} ({crew.filter((c) => c.origen === o).length})
          </button>
        ))}
        <button onClick={() => setNuevo((n) => (n ? null : NUEVO))} className="ms-btn-ghost ml-auto">
          {nuevo ? "Cerrar" : alcance === "SHOW" ? "+ Sumar a esta plaza" : "+ Sumar al crew"}
        </button>
      </div>

      {/* Renglón nuevo */}
      {nuevo && (
        <div className="ms-card-deep p-3 grid grid-cols-1 lg:grid-cols-[220px_1fr_1fr_180px_auto] gap-2 items-end">
          <div>
            <label className="ms-label block mb-1">Del catálogo</label>
            <Combobox
              value={nuevo.persona}
              onChange={(v) => setNuevo({ ...nuevo, persona: v })}
              options={opcionesPersona}
              placeholder="Técnico o integrante…"
              className="w-full"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">…o nombre a mano</label>
            <input
              value={nuevo.nombreLibre}
              onChange={(e) => setNuevo({ ...nuevo, nombreLibre: e.target.value })}
              disabled={!!nuevo.persona}
              placeholder="ej. Jorge (técnico de la casa)"
              className="ms-input-inline w-full disabled:opacity-40"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Función</label>
            <input
              value={nuevo.funcion}
              onChange={(e) => setNuevo({ ...nuevo, funcion: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void agregar();
              }}
              placeholder="ej. Ingeniero de monitores"
              className="ms-input-inline w-full"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Origen</label>
            <select
              value={nuevo.origen}
              onChange={(e) => setNuevo({ ...nuevo, origen: e.target.value })}
              className="ms-input-inline w-full"
            >
              {ORIGENES_CREW.map((o) => (
                <option key={o} value={o}>
                  {ORIGEN_CREW_LABEL[o]}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => void agregar()} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
            {guardando ? "Sumando…" : "Sumar"}
          </button>
        </div>
      )}

      {/* Tabla */}
      {visibles.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            {crew.length === 0
              ? alcance === "SHOW"
                ? "Nadie asignado todavía. El crew que viaja toda la gira se suma desde la pestaña Crew de la gira."
                : "El crew está vacío. Suma a la primera persona para armar la lista que viaja."
              : "Nadie cumple el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="min-w-[1360px] w-full">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[230px]">Persona</th>
                <th className="ms-th w-[150px]">Origen</th>
                <th className="ms-th w-[200px]">Función</th>
                <th className="ms-th w-[200px]">Rol del tabulador</th>
                <th className="ms-th w-[140px]">Teléfono</th>
                <th className="ms-th w-[180px]">Correo</th>
                <th className="ms-th w-[120px]">Llamado</th>
                <th className="ms-th w-[180px]">{alcance === "SHOW" ? "Aplica a" : "Plaza"}</th>
                <th className="ms-th w-[180px]">Notas</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.titulo || "todos"}>
                {g.titulo && (
                  <tr>
                    <td colSpan={10} className="bg-[#0d0d0d] border-y border-[#1e1e1e] px-4 py-2">
                      <span className="ms-section-label">{g.titulo}</span>
                      <span className="ms-meta ml-2">{g.filas.length} personas</span>
                    </td>
                  </tr>
                )}
                {g.filas.map((c) => (
                  <tr key={c.id} className="ms-tr align-top">
                    <td className="ms-td">
                      {c.tecnicoId || c.personaId ? (
                        <Combobox
                          value={clavePersona(c)}
                          onChange={(v) => (v ? elegirPersona(c, v) : editar(c.id, { tecnicoId: null, personaId: null }, true))}
                          options={opcionesPersona}
                          placeholder="Elegir persona…"
                          className="w-full"
                        />
                      ) : (
                        <input
                          value={c.nombreLibre ?? ""}
                          onChange={(e) => editar(c.id, { nombreLibre: e.target.value })}
                          placeholder="Nombre…"
                          className="ms-input-inline w-full"
                        />
                      )}
                      {guardadas.has(c.id) && <span className="ms-micro text-emerald-400">guardado</span>}
                    </td>
                    <td className="ms-td">
                      <select
                        value={c.origen}
                        onChange={(e) => editar(c.id, { origen: e.target.value }, true)}
                        className="ms-input-inline w-full"
                      >
                        {ORIGENES_CREW.map((o) => (
                          <option key={o} value={o}>
                            {ORIGEN_CREW_LABEL[o]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <input
                        value={c.funcion}
                        onChange={(e) => editar(c.id, { funcion: e.target.value })}
                        placeholder="ej. FOH"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <Combobox
                        value={c.rolTecnicoId ?? ""}
                        onChange={(v) => editar(c.id, { rolTecnicoId: v || null }, true)}
                        options={opcionesRol}
                        placeholder="Elegir rol…"
                        className="w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={c.telefono ?? ""}
                        onChange={(e) => editar(c.id, { telefono: e.target.value })}
                        placeholder={c.tecnico?.celular ?? c.persona?.telefono ?? "—"}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={c.email ?? ""}
                        onChange={(e) => editar(c.id, { email: e.target.value })}
                        placeholder={c.persona?.email ?? "—"}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={c.llamado ?? ""}
                        onChange={(e) => editar(c.id, { llamado: e.target.value })}
                        placeholder="ej. 10:00"
                        title={fmt24to12(c.llamado) || undefined}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <select
                        value={c.showId ?? ""}
                        onChange={(e) => editar(c.id, { showId: e.target.value || null }, true)}
                        className="ms-input-inline w-full"
                      >
                        <option value="">Toda la gira</option>
                        {alcance === "SHOW" && showId && !plazas.length && (
                          <option value={showId}>Solo esta plaza</option>
                        )}
                        {plazas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {fmtFechaCorta(p.fecha)} · {p.ciudad ?? "Sin ciudad"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td">
                      <input
                        value={c.notas ?? ""}
                        onChange={(e) => editar(c.id, { notas: e.target.value })}
                        placeholder="…"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td text-right">
                      <button
                        onClick={() => void quitar(c)}
                        className="text-[#555] hover:text-red-400 transition-colors"
                        title="Dar de baja del crew"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <p className="ms-micro">
        Cada celda se guarda sola al dejar de escribir. El teléfono y el correo de la fila mandan sobre los del catálogo:
        en gira la gente usa otro número.
      </p>
    </div>
  );
}
