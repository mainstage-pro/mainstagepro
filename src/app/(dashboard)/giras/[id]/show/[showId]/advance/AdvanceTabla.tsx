"use client";

/**
 * El advance de una fecha: el rider punto por punto contra la casa y el promotor.
 *
 * Por renglón solo hay DOS decisiones y las dos se toman con un clic, sin abrir
 * nada: quién lo cubre (`CUBIERTO_POR`) y cómo va esa gestión (`ESTADOS_ADVANCE`).
 * Todo lo demás es contexto de apoyo. Aquí no hay proveedor ni costo a propósito:
 * el equipo de tercero se captura una sola vez en el rider del proyecto y de ahí
 * se derivan el proveedor y su cuenta por pagar (`src/lib/proveedor-equipos.ts`).
 *
 * La lista pesa lo que le falta: un renglón ya cerrado se colapsa a una línea y
 * solo lo abierto muestra sus controles, porque un rider de 60 conceptos con todos
 * los controles desplegados no se puede leer al teléfono. Y «Sacar del advance»
 * apaga el concepto en el rider maestro, no en esta fecha: el rider es la
 * transcripción literal del documento y trae renglones que no se cotejan con el
 * jefe técnico del foro, así que esa decisión se toma una vez y vale para todas
 * las fechas.
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

/// Un concepto del rider que se decidió que no se coteja. No tiene renglón de
/// trabajo en ninguna fecha; se lee del rider maestro para poder regresarlo.
export interface ConceptoFuera {
  id: string;
  disciplina: string;
  concepto: string;
  cantidad: number;
}

interface Props {
  showId: string;
  giraId: string;
  venue: { id: string; nombre: string; itemsInventario: number } | null;
  tieneRider: boolean;
  lineasIniciales: LineaAdvance[];
  fueraIniciales: ConceptoFuera[];
}

type Campos = Partial<Record<keyof LineaAdvance, unknown>>;

const DEMORA_GUARDADO = 700;

/// Las figuras que de verdad se eligen. `POR_DEFINIR` es la ausencia de decisión
/// (ninguna pastilla prendida) y `NO_APLICA` tiene su propio botón, para que
/// descartar un renglón cueste un clic y no se quede eternamente por definir.
const QUIEN_CUBRE = CUBIERTO_POR.filter((c) => c !== "POR_DEFINIR" && c !== "NO_APLICA");

export default function AdvanceTabla({
  showId,
  giraId,
  venue,
  tieneRider,
  lineasIniciales,
  fueraIniciales,
}: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [lineas, setLineas] = useState<LineaAdvance[]>(lineasIniciales);
  const [fuera, setFuera] = useState<ConceptoFuera[]>(fueraIniciales);
  const [verFuera, setVerFuera] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
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
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

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
            (d.alineadas ? `, ${d.alineadas} se cerraron solos porque el rider ya dice quién los pone` : "") +
            (d.omitidas ? `, ${d.omitidas} no bajaron porque están fuera del advance` : "") +
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

  function alternarDetalle(id: string) {
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  // ── Curaduría: qué conceptos del rider se cotejan y cuáles no ─────────────

  /// Apaga el concepto en el rider maestro. Alcanza a todas las fechas porque la
  /// pregunta «¿esto se coteja con la casa?» no cambia de una plaza a otra.
  async function sacarDelAdvance(l: LineaAdvance) {
    if (!l.riderLinea) {
      await quitar(l);
      return;
    }
    const ok = await confirm({
      message:
        `¿Sacar «${l.concepto}» del advance?\n\n` +
        "Se quita de TODAS las fechas de la gira y no volverá a bajar del rider. " +
        "El rider maestro conserva el concepto: solo deja de cotejarse con la casa.",
      danger: true,
      confirmText: "Sacar del advance",
    });
    if (!ok) return;

    const res = await fetch(`/api/artista-rider-lineas/${l.riderLinea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enAdvance: false }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo sacar el concepto del advance");
      return;
    }
    setLineas((prev) => prev.filter((x) => x.riderLinea?.id !== l.riderLinea!.id));
    setFuera((prev) => [
      ...prev,
      { id: l.riderLinea!.id, disciplina: l.disciplina, concepto: l.riderLinea!.concepto, cantidad: l.riderLinea!.cantidad },
    ]);
    toast.success(
      `«${l.concepto}» salió del advance en ${d.fechas} ${d.fechas === 1 ? "fecha" : "fechas"}` +
        (d.conCaptura ? ` (${d.conCaptura} con captura)` : ""),
    );
  }

  async function regresarAlAdvance(c: ConceptoFuera) {
    const res = await fetch(`/api/artista-rider-lineas/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enAdvance: true }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo regresar el concepto");
      return;
    }
    setFuera((prev) => prev.filter((x) => x.id !== c.id));
    await recargar();
    toast.success(`«${c.concepto}» regresó al advance en ${d.fechas} ${d.fechas === 1 ? "fecha" : "fechas"}`);
  }

  // ── Selección múltiple (solo para quitar de un jalón) ─────────────────────
  function alternarSeleccion(id: string) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function seleccionarVarios(ids: string[], marcar: boolean) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      for (const id of ids) {
        if (marcar) s.add(id);
        else s.delete(id);
      }
      return s;
    });
  }

  function salirDeSeleccion() {
    setModoSeleccion(false);
    setSeleccion(new Set());
  }

  async function quitarSeleccionados() {
    const ids = [...seleccion];
    if (!ids.length) return;
    const ok = await confirm({
      message: `¿Quitar ${ids.length} ${ids.length === 1 ? "concepto" : "conceptos"} del advance de este show? El rider maestro no se toca.`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-shows/${showId}/advance`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      toast.error("No se pudieron quitar los renglones");
      return;
    }
    setLineas((prev) => prev.filter((l) => !seleccion.has(l.id)));
    setSeleccion(new Set());
  }

  /// La primera pasada de curaduría sobre un rider recién transcrito: el ruido se
  /// va en una sola operación en vez de dos clics por concepto por fecha.
  async function sacarSeleccionadosDelAdvance() {
    const elegidas = lineas.filter((l) => seleccion.has(l.id) && l.riderLinea);
    if (!elegidas.length) {
      toast.error("Los conceptos capturados a mano no vienen del rider: quítalos con «Quitar del advance»");
      return;
    }
    const ok = await confirm({
      message:
        `¿Sacar ${elegidas.length} ${elegidas.length === 1 ? "concepto" : "conceptos"} del advance?\n\n` +
        "Se quitan de TODAS las fechas de la gira y no volverán a bajar del rider. " +
        "El rider maestro los conserva: solo dejan de cotejarse con la casa.",
      danger: true,
      confirmText: "Sacar del advance",
    });
    if (!ok) return;

    const fallidas: string[] = [];
    for (const l of elegidas) {
      const res = await fetch(`/api/artista-rider-lineas/${l.riderLinea!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enAdvance: false }),
      });
      if (!res.ok) fallidas.push(l.concepto);
    }
    setSeleccion(new Set());
    salirDeSeleccion();
    await recargar();
    setFuera((prev) => [
      ...prev,
      ...elegidas
        .filter((l) => !fallidas.includes(l.concepto))
        .map((l) => ({
          id: l.riderLinea!.id,
          disciplina: l.disciplina,
          concepto: l.riderLinea!.concepto,
          cantidad: l.riderLinea!.cantidad,
        })),
    ]);
    if (fallidas.length) toast.error(`No se pudieron sacar: ${fallidas.join(", ")}`);
    else toast.success(`${elegidas.length} conceptos salieron del advance en toda la gira`);
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
        <span className="h-4 w-px bg-[#1e1e1e]" aria-hidden />
        <button
          onClick={() => (modoSeleccion ? salirDeSeleccion() : setModoSeleccion(true))}
          className={modoSeleccion ? "ms-filter-select-active" : "ms-filter-select"}
          title="Palomear varios conceptos para quitarlos de un jalón"
        >
          {modoSeleccion ? "Salir de selección" : "Seleccionar varios"}
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
              <div className="bg-[#0d0d0d] border-b border-[#1e1e1e] px-4 py-2 flex items-center gap-2">
                {modoSeleccion && (
                  <input
                    type="checkbox"
                    checked={g.filas.every((l) => seleccion.has(l.id))}
                    onChange={(e) => seleccionarVarios(g.filas.map((l) => l.id), e.target.checked)}
                    className="accent-[#B3985B] w-4 h-4"
                    title="Seleccionar todo el departamento"
                  />
                )}
                <span className="ms-section-label">{DISCIPLINA_LABEL[g.disciplina]}</span>
                <span className="ms-meta ml-2">{g.filas.length} conceptos</span>
              </div>
              {g.filas.map((l) => (
                <Fila
                  key={l.id}
                  linea={l}
                  guardada={guardadas.has(l.id)}
                  onEditar={editar}
                  onQuitar={quitar}
                  onSacar={sacarDelAdvance}
                  seleccionable={modoSeleccion}
                  seleccionada={seleccion.has(l.id)}
                  onSeleccionar={alternarSeleccion}
                  detalleAbierto={abiertas.has(l.id)}
                  onAlternarDetalle={alternarDetalle}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Lo que se decidió que no se coteja. Vive en el rider, no en la fecha. */}
      {fuera.length > 0 && (
        <div className="ms-card overflow-hidden">
          <button
            onClick={() => setVerFuera((v) => !v)}
            className="w-full bg-[#0d0d0d] border-b border-[#1e1e1e] px-4 py-2 flex items-center gap-2 text-left hover:bg-[#111] transition-colors"
          >
            <span className="ms-section-label">Fuera del advance ({fuera.length})</span>
            <span className="ms-meta ml-2 flex-1 min-w-0 truncate">
              el rider los pide, pero no se cotejan con la casa en ninguna fecha
            </span>
            <span className="text-[#555] shrink-0">{verFuera ? "▴" : "▾"}</span>
          </button>
          {verFuera &&
            fuera.map((c) => (
              <div
                key={c.id}
                className="px-4 py-2 border-b border-[#141414] last:border-0 flex items-center gap-2"
              >
                <span className="ms-label shrink-0 w-24 truncate">{DISCIPLINA_LABEL[c.disciplina] ?? c.disciplina}</span>
                <span className="text-sm text-[#6b7280] truncate flex-1 min-w-0">{c.concepto}</span>
                <span className="ms-meta shrink-0">{c.cantidad}</span>
                <button onClick={() => void regresarAlAdvance(c)} className="ms-micro ms-link-gold underline shrink-0">
                  regresar al advance
                </button>
              </div>
            ))}
        </div>
      )}

      {modoSeleccion && seleccion.size > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-[#333] bg-[#0d0d0d]/95 px-4 py-2 shadow-lg backdrop-blur">
          <span className="text-sm text-white">
            {seleccion.size} {seleccion.size === 1 ? "concepto seleccionado" : "conceptos seleccionados"}
          </span>
          <button onClick={() => setSeleccion(new Set())} className="ms-btn-ghost">
            Limpiar
          </button>
          <button
            onClick={() => void sacarSeleccionadosDelAdvance()}
            className="ms-btn-secondary ml-auto"
            title="Deja de cotejarlos con la casa en todas las fechas de la gira. El rider maestro los conserva."
          >
            Sacar del advance (toda la gira)
          </button>
          <button
            onClick={() => void quitarSeleccionados()}
            className="ms-btn-danger"
            title="Borra el renglón solo en esta fecha. El rider los vuelve a bajar en la próxima siembra."
          >
            Quitar de esta fecha
          </button>
        </div>
      )}

      <p className="ms-micro">
        Todo se guarda solo. Por renglón solo hay dos decisiones: quién lo cubre y cómo va; lo que ya está cerrado se
        colapsa a una línea. «Sacar del advance» apaga el concepto en el rider maestro y vale para todas las fechas;
        editar el renglón aquí nunca cambia el rider.{" "}
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
  onSacar,
  seleccionable,
  seleccionada,
  onSeleccionar,
  detalleAbierto,
  onAlternarDetalle,
}: {
  linea: LineaAdvance;
  guardada: boolean;
  onEditar: (id: string, campos: Campos, inmediato?: boolean) => void;
  onQuitar: (l: LineaAdvance) => Promise<void>;
  onSacar: (l: LineaAdvance) => Promise<void>;
  seleccionable: boolean;
  seleccionada: boolean;
  onSeleccionar: (id: string) => void;
  detalleAbierto: boolean;
  onAlternarDetalle: (id: string) => void;
}) {
  const noAplica = l.cubiertoPor === "NO_APLICA";
  const cerrada = ESTADOS_RESUELTOS.includes(l.estado);
  const sinDecidir = l.cubiertoPor === "POR_DEFINIR";
  const tieneCaptura = !!(l.ofrecidoCasa?.trim() || l.notas?.trim() || l.cantidadCasa > 0);
  const mostrarCaptura = detalleAbierto || tieneCaptura;

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
  const casilla = seleccionable ? (
    <input
      type="checkbox"
      checked={seleccionada}
      onChange={() => onSeleccionar(l.id)}
      className="accent-[#B3985B] w-4 h-4 shrink-0"
      title="Seleccionar para quitarlo en lote"
    />
  ) : null;

  if (noAplica) {
    return (
      <div className="px-4 py-2 border-b border-[#141414] last:border-0 border-l-2 border-l-[#1a1a1a] flex items-center gap-2">
        {casilla}
        <span className="text-sm text-[#555] line-through truncate flex-1 min-w-0">{l.concepto}</span>
        <span className={`ms-badge shrink-0 ${CUBIERTO_POR_COLOR.NO_APLICA}`}>{CUBIERTO_POR_LABEL.NO_APLICA}</span>
        <button
          onClick={() => onEditar(l.id, { cubiertoPor: "POR_DEFINIR" }, true)}
          className="ms-micro ms-link-gold underline shrink-0"
        >
          sí aplica
        </button>
        {/* Si no aplica en ninguna plaza, el lugar de la decisión es el rider. */}
        {l.riderLinea && (
          <button
            onClick={() => void onSacar(l)}
            className="ms-micro text-[#555] hover:text-amber-300 underline shrink-0"
            title="Dejar de cotejarlo en todas las fechas de la gira"
          >
            en ninguna fecha
          </button>
        )}
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

  // Un renglón ya cerrado no es trabajo pendiente: se colapsa a una línea para
  // que la lista pese lo que falta y no lo que ya se resolvió. Abre con un clic.
  if (cerrada && !detalleAbierto) {
    return (
      <div className="px-4 py-2 border-b border-[#141414] last:border-0 border-l-2 border-l-emerald-700/60 flex items-center gap-2">
        {casilla}
        <button
          onClick={() => onAlternarDetalle(l.id)}
          className="text-sm text-[#9ca3af] hover:text-white truncate flex-1 min-w-0 text-left transition-colors"
          title="Abrir el renglón"
        >
          {l.concepto}
        </button>
        <span className="ms-meta shrink-0">{l.cantidadPedida}</span>
        <span className={`ms-badge shrink-0 ${CUBIERTO_POR_COLOR[l.cubiertoPor]}`}>
          {CUBIERTO_POR_CORTO[l.cubiertoPor]}
        </span>
        <span className={`ms-badge shrink-0 ${ESTADO_ADVANCE_COLOR[l.estado]}`}>{ESTADO_ADVANCE_CORTO[l.estado]}</span>
        <button
          onClick={() => onAlternarDetalle(l.id)}
          className="text-[#555] hover:text-white transition-colors shrink-0"
          title="Abrir el renglón"
        >
          ▾
        </button>
      </div>
    );
  }

  return (
    <div
      className={`px-4 py-3 border-b border-[#141414] last:border-0 border-l-2 space-y-2 ${
        seleccionada ? "bg-[#B3985B]/5 " : ""
      }${
        cerrada
          ? "border-l-emerald-700/60"
          : l.prioridad === "INDISPENSABLE"
            ? "border-l-red-800/60"
            : "border-l-[#1e1e1e]"
      }`}
    >
      {/* Qué pide el rider */}
      <div className="flex flex-wrap items-center gap-2">
        {casilla}
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
          onClick={() => onAlternarDetalle(l.id)}
          className="text-[#555] hover:text-white transition-colors ml-auto"
          title={detalleAbierto ? "Cerrar el detalle" : "Respuesta del venue, nota de la llamada y curaduría"}
        >
          {detalleAbierto ? "▴" : "▾"}
        </button>
        <button
          onClick={() => void onQuitar(l)}
          className="text-[#444] hover:text-red-400 transition-colors"
          title="Quitar renglón del advance de esta fecha"
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

      {/* Lo que contesta la casa y la nota de la llamada. Se esconde mientras esté
          vacío: en un rider de 60 conceptos son 120 campos en blanco que no dicen
          nada. En cuanto tiene algo capturado se queda a la vista sin pedir clic. */}
      {mostrarCaptura && (
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
      )}

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

      {/* La curaduría vive detrás del detalle a propósito: saca el concepto de
          todas las fechas, así que no debe quedar a un clic de distancia. */}
      {detalleAbierto && l.riderLinea && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => void onSacar(l)}
            className="ms-micro text-[#6b7280] hover:text-amber-300 underline"
          >
            Sacar del advance
          </button>
          <span className="ms-micro text-[#444]">
            deja de cotejarse en todas las fechas; el rider maestro conserva el concepto
          </span>
        </div>
      )}
    </div>
  );
}
