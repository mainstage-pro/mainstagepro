"use client";

/**
 * El advance de una fecha: el rider punto por punto contra la casa y el promotor.
 *
 * Por renglón solo hay DOS decisiones y las dos se toman con un clic, sin abrir
 * nada: quién lo cubre (`CUBIERTO_POR`) y cómo va esa gestión (`ESTADOS_ADVANCE`).
 * Todo lo demás es contexto de apoyo. Aquí no hay proveedor ni costo a propósito:
 * el equipo de tercero se captura una sola vez en el rider del proyecto y de ahí
 * se derivan el proveedor y su cuenta por pagar (`src/lib/proveedor-equipos.ts`).
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  CUBIERTO_POR,
  CUBIERTO_POR_COLOR,
  CUBIERTO_POR_CORTO,
  CUBIERTO_POR_LABEL,
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  ESTADOS_ADVANCE,
  ESTADOS_RESUELTOS,
  ESTADO_ADVANCE_COLOR,
  ESTADO_ADVANCE_CORTO,
  ESTADO_ADVANCE_LABEL,
  PRIORIDADES,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  resumirAdvance,
} from "@/lib/giras";

export interface LineaAdvance {
  id: string;
  riderLineaId: string | null;
  disciplina: string;
  concepto: string;
  cantidadPedida: number;
  prioridad: string;
  ofrecidoCasa: string | null;
  cantidadCasa: number;
  cubiertoPor: string;
  pedirAlPromotor: boolean;
  estado: string;
  notas: string | null;
  orden: number;
  riderLinea: {
    id: string;
    concepto: string;
    cantidad: number;
    prioridad: string;
    preferido: string | null;
    aceptables: string | null;
  } | null;
}

interface Props {
  showId: string;
  giraId: string;
  venue: { id: string; nombre: string; itemsInventario: number } | null;
  tieneRider: boolean;
  lineasIniciales: LineaAdvance[];
}

type Campos = Partial<Record<keyof LineaAdvance, unknown>>;

const DEMORA_GUARDADO = 700;

/// Las figuras que de verdad se eligen. `POR_DEFINIR` es la ausencia de decisión
/// (ninguna pastilla prendida) y `NO_APLICA` tiene su propio botón, para que
/// descartar un renglón cueste un clic y no se quede eternamente por definir.
const QUIEN_CUBRE = CUBIERTO_POR.filter((c) => c !== "POR_DEFINIR" && c !== "NO_APLICA");

export default function AdvanceTabla({ showId, giraId, venue, tieneRider, lineasIniciales }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [lineas, setLineas] = useState<LineaAdvance[]>(lineasIniciales);
  const [filtroDisciplina, setFiltroDisciplina] = useState("");
  // Arranca escondiendo lo descartado: el trabajo del día es lo que sí pedimos.
  const [ocultarNoAplica, setOcultarNoAplica] = useState(true);
  const [soloAbiertas, setSoloAbiertas] = useState(false);
  const [soloIndispensables, setSoloIndispensables] = useState(false);
  const [soloPromotor, setSoloPromotor] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [guardadas, setGuardadas] = useState<Set<string>>(new Set());
  const [nuevo, setNuevo] = useState<{ disciplina: string; concepto: string; cantidad: string; prioridad: string } | null>(
    null,
  );

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // ── Guardado por renglón (PATCH, nunca un PUT que recree el advance) ───────
  async function descargar(lineaId: string) {
    const campos = pendientes.current.get(lineaId);
    pendientes.current.delete(lineaId);
    const t = timers.current.get(lineaId);
    if (t) clearTimeout(t);
    timers.current.delete(lineaId);
    if (!campos) return;

    const res = await fetch(`/api/show-rider-lineas/${lineaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el renglón");
      return;
    }
    // No se reemplaza la fila con la respuesta: el usuario puede seguir escribiendo.
    setGuardadas((prev) => new Set(prev).add(lineaId));
    setTimeout(
      () =>
        setGuardadas((prev) => {
          const s = new Set(prev);
          s.delete(lineaId);
          return s;
        }),
      1500,
    );
  }

  function editar(lineaId: string, campos: Campos, inmediato = false) {
    setLineas((prev) => prev.map((l) => (l.id === lineaId ? ({ ...l, ...campos } as LineaAdvance) : l)));
    pendientes.current.set(lineaId, { ...(pendientes.current.get(lineaId) ?? {}), ...campos });
    const t = timers.current.get(lineaId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(lineaId);
      return;
    }
    timers.current.set(lineaId, setTimeout(() => void descargar(lineaId), DEMORA_GUARDADO));
  }

  async function descargarTodo() {
    await Promise.all([...pendientes.current.keys()].map((id) => descargar(id)));
  }

  async function recargar() {
    const res = await fetch(`/api/gira-shows/${showId}/advance`);
    if (!res.ok) return;
    const d = await res.json();
    setLineas(d.lineas ?? []);
  }

  // ── Las tres acciones ──────────────────────────────────────────────────────
  async function accion(clave: "sembrar" | "precargar" | "volcar") {
    await descargarTodo();
    setTrabajando(clave);
    setAviso(null);
    try {
      const res = await fetch(`/api/gira-shows/${showId}/advance/${clave}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo completar la acción");
        return;
      }
      if (clave === "sembrar") {
        setAviso(
          `Rider «${d.riderNombre}»: se agregaron ${d.agregadas} conceptos, ${d.existentes} ya estaban` +
            (d.vinculadas ? `, ${d.vinculadas} capturados a mano quedaron ligados al rider` : "") +
            ".",
        );
        await recargar();
      } else if (clave === "precargar") {
        setAviso(
          `Se precargaron ${d.precargadas} renglones con lo que ya sabíamos del foro; ` +
            `${d.respetadas} ya tenían captura y no se tocaron; ${d.sinCoincidencia} sin dato del venue.`,
        );
        await recargar();
      } else {
        setAviso(
          `Ficha del venue actualizada: ${d.creadas} conceptos nuevos, ${d.actualizadas} actualizados` +
            (d.omitidas ? `, ${d.omitidas} omitidos por no tener texto del venue` : "") +
            ".",
        );
      }
    } finally {
      setTrabajando(null);
    }
  }

  async function agregarRenglon() {
    if (!nuevo || !nuevo.concepto.trim()) return;
    const res = await fetch(`/api/gira-shows/${showId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disciplina: nuevo.disciplina,
        concepto: nuevo.concepto,
        cantidadPedida: Number(nuevo.cantidad) || 1,
        prioridad: nuevo.prioridad,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar");
      return;
    }
    setLineas((prev) => [...prev, d.linea]);
    setNuevo({ disciplina: nuevo.disciplina, concepto: "", cantidad: "1", prioridad: nuevo.prioridad });
  }

  async function quitar(l: LineaAdvance) {
    const ok = await confirm({
      message: `¿Quitar «${l.concepto}» del advance de este show? El rider maestro no se toca.`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/show-rider-lineas/${l.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el renglón");
      return;
    }
    setLineas((prev) => prev.filter((x) => x.id !== l.id));
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const resumen = useMemo(() => resumirAdvance(lineas), [lineas]);
  const noAplicaTotal = useMemo(() => lineas.filter((l) => l.cubiertoPor === "NO_APLICA").length, [lineas]);
  const alPromotor = useMemo(() => lineas.filter((l) => l.pedirAlPromotor).length, [lineas]);
  const sinDecidir = useMemo(() => lineas.filter((l) => l.cubiertoPor === "POR_DEFINIR").length, [lineas]);

  const disciplinasPresentes = DISCIPLINAS.filter((d) => lineas.some((l) => l.disciplina === d));

  const visibles = lineas.filter((l) => {
    const noAplica = l.cubiertoPor === "NO_APLICA";
    if (ocultarNoAplica && noAplica) return false;
    if (filtroDisciplina && l.disciplina !== filtroDisciplina) return false;
    if (soloIndispensables && l.prioridad !== "INDISPENSABLE") return false;
    if (soloPromotor && !l.pedirAlPromotor) return false;
    if (soloAbiertas && (noAplica || ESTADOS_RESUELTOS.includes(l.estado))) return false;
    return true;
  });

  const grupos = disciplinasPresentes
    .map((d) => ({ disciplina: d, filas: visibles.filter((l) => l.disciplina === d) }))
    .filter((g) => g.filas.length > 0);

  return (
    <div className="space-y-4">
      {/* Semáforo y acciones */}
      <div className="ms-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <p className="ms-label mb-1">Estado del advance</p>
            <span className={`ms-badge ${SEMAFORO_COLOR[resumen.semaforo]}`}>{SEMAFORO_LABEL[resumen.semaforo]}</span>
            <p className="ms-meta mt-1">{resumen.avance}% de lo indispensable</p>
          </div>
          <div>
            <p className="ms-label mb-1">Indispensables cerrados</p>
            <p className="text-white text-lg font-semibold">
              {resumen.indispensablesResueltas}
              <span className="text-[#555] text-sm"> / {resumen.indispensablesTotal}</span>
            </p>
            <p className="ms-meta">de {resumen.total} renglones en total</p>
          </div>
          <div>
            <p className="ms-label mb-1">Renglones por cerrar</p>
            <p className={`text-lg font-semibold ${resumen.abiertas > 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {resumen.abiertas}
            </p>
            <p className="ms-meta">{sinDecidir} sin decidir quién lo cubre</p>
          </div>
          <div>
            <p className="ms-label mb-1">Para pedirle al promotor</p>
            <p className="text-white text-lg font-semibold">{alPromotor}</p>
            <p className="ms-meta">renglones marcados</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void accion("sembrar")}
            disabled={trabajando !== null}
            className="ms-btn-primary disabled:opacity-50"
          >
            {trabajando === "sembrar" ? "Armando…" : "Armar advance desde el rider maestro"}
          </button>
          <button
            onClick={() => void accion("precargar")}
            disabled={trabajando !== null || !venue}
            className="ms-btn-secondary disabled:opacity-50"
            title={venue ? undefined : "Este show no tiene venue asignado"}
          >
            {trabajando === "precargar" ? "Precargando…" : "Precargar lo que ofrece el venue"}
          </button>
          <button
            onClick={() => void accion("volcar")}
            disabled={trabajando !== null || !venue}
            className="ms-btn-secondary disabled:opacity-50"
            title={venue ? undefined : "Este show no tiene venue asignado"}
          >
            {trabajando === "volcar" ? "Guardando…" : "Guardar lo aprendido en la ficha del venue"}
          </button>
          <button
            onClick={() =>
              setNuevo((n) =>
                n ? null : { disciplina: filtroDisciplina || "AUDIO", concepto: "", cantidad: "1", prioridad: "IMPORTANTE" },
              )
            }
            className="ms-btn-ghost"
          >
            {nuevo ? "Cerrar" : "+ Renglón que no viene del rider"}
          </button>
        </div>

        {!tieneRider && (
          <p className="text-xs text-amber-300">
            La gira no tiene rider maestro asignado: la siembra usará el rider activo del artista.
          </p>
        )}
        {venue && (
          <p className="ms-meta">
            Ficha técnica de {venue.nombre}: {venue.itemsInventario} conceptos documentados ·{" "}
            <Link href="/directorio/venues" className="ms-link-gold">
              abrir ficha del venue
            </Link>
          </p>
        )}
        {aviso && <p className="text-xs text-emerald-300">{aviso}</p>}
      </div>

      {/* Renglón libre */}
      {nuevo && (
        <div className="ms-card-deep p-3 grid grid-cols-1 md:grid-cols-[160px_1fr_90px_160px_auto] gap-2 items-end">
          <div>
            <label className="ms-label block mb-1">Departamento</label>
            <select
              value={nuevo.disciplina}
              onChange={(e) => setNuevo({ ...nuevo, disciplina: e.target.value })}
              className="ms-input-inline w-full"
            >
              {DISCIPLINAS.map((d) => (
                <option key={d} value={d}>
                  {DISCIPLINA_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ms-label block mb-1">Concepto</label>
            <input
              value={nuevo.concepto}
              onChange={(e) => setNuevo({ ...nuevo, concepto: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void agregarRenglon();
              }}
              placeholder="ej. Riser de batería 2×2 m"
              className="ms-input-inline w-full"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Cantidad</label>
            <input
              type="number"
              min={1}
              value={nuevo.cantidad}
              onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })}
              className="ms-input-inline w-full"
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Prioridad</label>
            <select
              value={nuevo.prioridad}
              onChange={(e) => setNuevo({ ...nuevo, prioridad: e.target.value })}
              className="ms-input-inline w-full"
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {PRIORIDAD_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void agregarRenglon()}
            disabled={!nuevo.concepto.trim()}
            className="ms-btn-primary disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFiltroDisciplina("")}
          className={!filtroDisciplina ? "ms-filter-select-active" : "ms-filter-select"}
        >
          Todas ({lineas.length})
        </button>
        {disciplinasPresentes.map((d) => (
          <button
            key={d}
            onClick={() => setFiltroDisciplina((f) => (f === d ? "" : d))}
            className={filtroDisciplina === d ? "ms-filter-select-active" : "ms-filter-select"}
          >
            {DISCIPLINA_LABEL[d]} ({lineas.filter((l) => l.disciplina === d).length})
          </button>
        ))}
        <span className="h-4 w-px bg-[#1e1e1e]" aria-hidden />
        <button
          onClick={() => setOcultarNoAplica((v) => !v)}
          className={ocultarNoAplica ? "ms-filter-select-active" : "ms-filter-select"}
          title="Esconde los renglones marcados «no aplica aquí» para trabajar solo sobre lo vivo"
        >
          Solo lo que sí pedimos{noAplicaTotal > 0 ? ` (${noAplicaTotal} fuera)` : ""}
        </button>
        <button
          onClick={() => setSoloAbiertas((v) => !v)}
          className={soloAbiertas ? "ms-filter-select-active" : "ms-filter-select"}
        >
          Solo lo que falta cerrar
        </button>
        <button
          onClick={() => setSoloIndispensables((v) => !v)}
          className={soloIndispensables ? "ms-filter-select-active" : "ms-filter-select"}
        >
          Solo indispensables
        </button>
        <button
          onClick={() => setSoloPromotor((v) => !v)}
          className={soloPromotor ? "ms-filter-select-active" : "ms-filter-select"}
        >
          Solo lo del promotor
        </button>
      </div>

      {/* Renglones */}
      {grupos.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            {lineas.length === 0
              ? "El advance está vacío. Ármalo desde el rider maestro para tener una fila por concepto."
              : "Ningún renglón cumple el filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => (
            <div key={g.disciplina} className="ms-card overflow-hidden">
              <div className="bg-[#0d0d0d] border-b border-[#1e1e1e] px-4 py-2">
                <span className="ms-section-label">{DISCIPLINA_LABEL[g.disciplina]}</span>
                <span className="ms-meta ml-2">{g.filas.length} conceptos</span>
              </div>
              {g.filas.map((l) => (
                <Fila key={l.id} linea={l} guardada={guardadas.has(l.id)} onEditar={editar} onQuitar={quitar} />
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="ms-micro">
        Todo se guarda solo. Por renglón solo hay dos decisiones: quién lo cubre y cómo va. El advance de este show es
        independiente del rider maestro: editar aquí nunca cambia el rider del artista.{" "}
        <Link href={`/giras/${giraId}/advance`} className="ms-link-gold">
          Ver el cotejo de todos los shows →
        </Link>
      </p>
    </div>
  );
}

// ── Pastilla de decisión ─────────────────────────────────────────────────────
// Un clic = una decisión guardada. Mismo criterio que los roles técnicos del
// proyecto: el control vive en el renglón, no en un modal ni en una acción masiva.

function Pastilla({
  activo,
  color,
  titulo,
  onClick,
  children,
}: {
  activo: boolean;
  color: string;
  titulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-pressed={activo}
      className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
        activo ? color : "border-[#1e1e1e] bg-[#0d0d0d] text-[#6b7280] hover:text-white hover:border-[#333]"
      }`}
    >
      {children}
    </button>
  );
}

// ── Renglón ──────────────────────────────────────────────────────────────────

function Fila({
  linea: l,
  guardada,
  onEditar,
  onQuitar,
}: {
  linea: LineaAdvance;
  guardada: boolean;
  onEditar: (id: string, campos: Campos, inmediato?: boolean) => void;
  onQuitar: (l: LineaAdvance) => Promise<void>;
}) {
  const noAplica = l.cubiertoPor === "NO_APLICA";
  const cerrada = ESTADOS_RESUELTOS.includes(l.estado);
  const sinDecidir = l.cubiertoPor === "POR_DEFINIR";

  // Se avisa sobre la fila cuando difiere del rider maestro, pero la fila manda:
  // el usuario decide si adopta el dato de la fuente o se queda con el suyo.
  const difiere: string[] = [];
  if (l.riderLinea) {
    if (l.riderLinea.cantidad !== l.cantidadPedida) difiere.push(`el rider pide ${l.riderLinea.cantidad}`);
    if (l.riderLinea.prioridad !== l.prioridad)
      difiere.push(`en el rider es ${PRIORIDAD_LABEL[l.riderLinea.prioridad]?.toLowerCase()}`);
    if (l.riderLinea.concepto.trim() !== l.concepto.trim()) difiere.push(`en el rider dice «${l.riderLinea.concepto}»`);
  }

  /// Elegir quién cubre. Volver a picar la misma pastilla lo regresa a "por
  /// definir": una decisión se puede deshacer sin tener que buscar otro control.
  function elegirCubre(valor: string) {
    const destino = l.cubiertoPor === valor ? "POR_DEFINIR" : valor;
    const campos: Campos = { cubiertoPor: destino };
    // Si lo va a poner el promotor, por definición hay que pedírselo; y a lo que
    // no aplica en esta fecha no se le pide nada.
    if (destino === "PROMOTOR") campos.pedirAlPromotor = true;
    if (destino === "NO_APLICA") campos.pedirAlPromotor = false;
    onEditar(l.id, campos, true);
  }

  // Lo descartado se colapsa a un renglón tachado: deja de pesar en la lectura
  // pero sigue a la vista y se recupera con un clic.
  if (noAplica) {
    return (
      <div className="px-4 py-2 border-b border-[#141414] last:border-0 border-l-2 border-l-[#1a1a1a] flex items-center gap-2">
        <span className="text-sm text-[#555] line-through truncate flex-1 min-w-0">{l.concepto}</span>
        <span className={`ms-badge shrink-0 ${CUBIERTO_POR_COLOR.NO_APLICA}`}>{CUBIERTO_POR_LABEL.NO_APLICA}</span>
        <button
          onClick={() => onEditar(l.id, { cubiertoPor: "POR_DEFINIR" }, true)}
          className="ms-micro ms-link-gold underline shrink-0"
        >
          sí aplica
        </button>
        <button
          onClick={() => void onQuitar(l)}
          className="text-[#444] hover:text-red-400 transition-colors shrink-0"
          title="Quitar renglón del advance"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={`px-4 py-3 border-b border-[#141414] last:border-0 border-l-2 space-y-2 ${
        cerrada
          ? "border-l-emerald-700/60"
          : l.prioridad === "INDISPENSABLE"
            ? "border-l-red-800/60"
            : "border-l-[#1e1e1e]"
      }`}
    >
      {/* Qué pide el rider */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={l.concepto}
          onChange={(e) => onEditar(l.id, { concepto: e.target.value })}
          className="ms-input-inline flex-1 min-w-[180px]"
        />
        <span className="ms-label">pide</span>
        <input
          type="number"
          min={0}
          value={l.cantidadPedida}
          onChange={(e) => onEditar(l.id, { cantidadPedida: Number(e.target.value) })}
          className="ms-input-inline w-16"
        />
        <select
          value={l.prioridad}
          onChange={(e) => onEditar(l.id, { prioridad: e.target.value }, true)}
          className={`ms-input-inline border ${PRIORIDAD_COLOR[l.prioridad]}`}
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p} className="bg-[#111] text-white">
              {PRIORIDAD_LABEL[p]}
            </option>
          ))}
        </select>
        {guardada && <span className="ms-micro text-emerald-400">guardado</span>}
        <button
          onClick={() => void onQuitar(l)}
          className="text-[#444] hover:text-red-400 transition-colors ml-auto"
          title="Quitar renglón del advance"
        >
          ✕
        </button>
      </div>

      {/* Las dos decisiones */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`ms-label mr-0.5 ${sinDecidir ? "text-amber-400" : ""}`}>Quién lo cubre</span>
          {QUIEN_CUBRE.map((c) => (
            <Pastilla
              key={c}
              activo={l.cubiertoPor === c}
              color={CUBIERTO_POR_COLOR[c]}
              titulo={CUBIERTO_POR_LABEL[c]}
              onClick={() => elegirCubre(c)}
            >
              {CUBIERTO_POR_CORTO[c]}
            </Pastilla>
          ))}
          <Pastilla
            activo={false}
            color={CUBIERTO_POR_COLOR.NO_APLICA}
            titulo={`${CUBIERTO_POR_LABEL.NO_APLICA} — sale de la lista viva sin borrarse`}
            onClick={() => elegirCubre("NO_APLICA")}
          >
            No aplica
          </Pastilla>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ms-label mr-0.5">Cómo va</span>
          {ESTADOS_ADVANCE.map((e) => (
            <Pastilla
              key={e}
              activo={l.estado === e}
              color={ESTADO_ADVANCE_COLOR[e]}
              titulo={ESTADO_ADVANCE_LABEL[e]}
              onClick={() => onEditar(l.id, { estado: e }, true)}
            >
              {ESTADO_ADVANCE_CORTO[e]}
            </Pastilla>
          ))}
        </div>

        <label
          className="flex items-center gap-1.5 cursor-pointer select-none"
          title="Entra en la lista que se le manda al promotor. Es distinto de lo que la casa ya tiene: esto es lo que hay que arrancarle."
        >
          <input
            type="checkbox"
            checked={l.pedirAlPromotor}
            onChange={(e) => onEditar(l.id, { pedirAlPromotor: e.target.checked }, true)}
            className="accent-[#B3985B] w-4 h-4"
          />
          <span className={`text-[11px] ${l.pedirAlPromotor ? "text-sky-300" : "text-[#6b7280]"}`}>
            Pedírselo al promotor
          </span>
        </label>
      </div>

      {/* Lo que contesta la casa y la nota de la llamada */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="ms-label">Tiene el venue</span>
        <input
          value={l.ofrecidoCasa ?? ""}
          onChange={(e) => onEditar(l.id, { ofrecidoCasa: e.target.value })}
          placeholder="qué contesta el contra-rider…"
          className="ms-input-inline flex-1 min-w-[160px]"
        />
        <input
          type="number"
          min={0}
          value={l.cantidadCasa}
          onChange={(e) => onEditar(l.id, { cantidadCasa: Number(e.target.value) })}
          className="ms-input-inline w-16"
          title="Cuántas piezas tiene el venue"
        />
        <span className="ms-label">Nota</span>
        <input
          value={l.notas ?? ""}
          onChange={(e) => onEditar(l.id, { notas: e.target.value })}
          placeholder="qué quedó dicho…"
          className="ms-input-inline flex-1 min-w-[160px]"
        />
      </div>

      {l.riderLinea?.preferido && <p className="ms-micro">Prefiere: {l.riderLinea.preferido}</p>}

      {difiere.length > 0 && (
        <p className="ms-micro text-amber-300">
          Difiere del rider maestro: {difiere.join(" · ")}.
          <button
            onClick={() =>
              onEditar(
                l.id,
                {
                  cantidadPedida: l.riderLinea!.cantidad,
                  prioridad: l.riderLinea!.prioridad,
                  concepto: l.riderLinea!.concepto,
                },
                true,
              )
            }
            className="ms-link-gold ml-2 underline"
          >
            usar el del rider
          </button>
        </p>
      )}
    </div>
  );
}
