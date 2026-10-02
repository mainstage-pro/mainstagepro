"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import {
  CUBIERTO_POR,
  CUBIERTO_POR_LABEL,
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  ESTADOS_ADVANCE,
  ESTADO_ADVANCE_COLOR,
  ESTADO_ADVANCE_LABEL,
  PRIORIDADES,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  fmtMoneda,
  resumirAdvance,
} from "@/lib/giras";
import type { ProveedorCandidato } from "@/lib/advance-gira";

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
  cantidadCubierta: number;
  proveedorId: string | null;
  costoEstimado: number | null;
  costoConfirmado: number | null;
  estado: string;
  aprobadoPorArtista: boolean;
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
  ciudad: string | null;
  venue: { id: string; nombre: string; itemsInventario: number } | null;
  tieneRider: boolean;
  lineasIniciales: LineaAdvance[];
  proveedores: ProveedorCandidato[];
}

type Campos = Partial<Record<keyof LineaAdvance, unknown>>;

const DEMORA_GUARDADO = 700;

export default function AdvanceTabla({
  showId,
  giraId,
  ciudad,
  venue,
  tieneRider,
  lineasIniciales,
  proveedores,
}: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [lineas, setLineas] = useState<LineaAdvance[]>(lineasIniciales);
  const [filtroDisciplina, setFiltroDisciplina] = useState("");
  const [soloFaltantes, setSoloFaltantes] = useState(false);
  const [soloIndispensables, setSoloIndispensables] = useState(false);
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
    setTimeout(() => setGuardadas((prev) => {
      const s = new Set(prev);
      s.delete(lineaId);
      return s;
    }), 1500);
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
            (d.omitidas ? `, ${d.omitidas} omitidos por no tener texto de la casa` : "") +
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
      message: `¿Quitar «${l.concepto}» del advance de esta plaza? El rider maestro no se toca.`,
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
  const costoEstimado = useMemo(() => lineas.reduce((s, l) => s + (l.costoEstimado ?? 0), 0), [lineas]);
  const costoConfirmado = useMemo(() => lineas.reduce((s, l) => s + (l.costoConfirmado ?? 0), 0), [lineas]);
  const piezasFaltantes = useMemo(
    () => lineas.reduce((s, l) => s + Math.max(0, l.cantidadPedida - l.cantidadCubierta), 0),
    [lineas],
  );

  const opcionesProveedor: ComboboxOption[] = useMemo(
    () => [
      { value: "", label: "— Sin proveedor —" },
      ...proveedores.map((p) => ({
        value: p.id,
        label: p.empresa && p.empresa !== p.nombre ? `${p.nombre} — ${p.empresa}` : p.nombre,
        group: p.enLaCiudad ? `En ${ciudad ?? "la plaza"}` : "Otras plazas",
      })),
    ],
    [proveedores, ciudad],
  );

  const disciplinasPresentes = DISCIPLINAS.filter((d) => lineas.some((l) => l.disciplina === d));

  const visibles = lineas.filter((l) => {
    if (filtroDisciplina && l.disciplina !== filtroDisciplina) return false;
    if (soloIndispensables && l.prioridad !== "INDISPENSABLE") return false;
    if (soloFaltantes && l.cantidadPedida - l.cantidadCubierta <= 0) return false;
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
            <p className="ms-label mb-1">Indispensables resueltos</p>
            <p className="text-white text-lg font-semibold">
              {resumen.indispensablesResueltas}
              <span className="text-[#555] text-sm"> / {resumen.indispensablesTotal}</span>
            </p>
            <p className="ms-meta">{resumen.abiertas} renglones abiertos de {resumen.total}</p>
          </div>
          <div>
            <p className="ms-label mb-1">Piezas por conseguir</p>
            <p className={`text-lg font-semibold ${piezasFaltantes > 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {piezasFaltantes}
            </p>
            <p className="ms-meta">pedido menos cubierto</p>
          </div>
          <div>
            <p className="ms-label mb-1">Costo del faltante</p>
            <p className="text-white text-lg font-semibold">{fmtMoneda(costoEstimado)}</p>
            <p className="ms-meta">confirmado {fmtMoneda(costoConfirmado)}</p>
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
            {trabajando === "precargar" ? "Precargando…" : "Precargar lo que ofrece la casa"}
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
              setNuevo((n) => (n ? null : { disciplina: filtroDisciplina || "AUDIO", concepto: "", cantidad: "1", prioridad: "IMPORTANTE" }))
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
            Ficha de casa de {venue.nombre}: {venue.itemsInventario} conceptos documentados ·{" "}
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
            <label className="ms-label block mb-1">Disciplina</label>
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
          <button onClick={() => void agregarRenglon()} disabled={!nuevo.concepto.trim()} className="ms-btn-primary disabled:opacity-50">
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
          onClick={() => setSoloFaltantes((v) => !v)}
          className={soloFaltantes ? "ms-filter-select-active" : "ms-filter-select"}
        >
          Solo lo que falta
        </button>
        <button
          onClick={() => setSoloIndispensables((v) => !v)}
          className={soloIndispensables ? "ms-filter-select-active" : "ms-filter-select"}
        >
          Solo indispensables
        </button>
      </div>

      {/* Tabla */}
      {grupos.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            {lineas.length === 0
              ? "El advance está vacío. Ármalo desde el rider maestro para tener una fila por concepto."
              : "Ningún renglón cumple el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="min-w-[1680px] w-full">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[260px]">Concepto</th>
                <th className="ms-th w-[70px]">Pide</th>
                <th className="ms-th w-[130px]">Prioridad</th>
                <th className="ms-th w-[260px]">Ofrece la casa</th>
                <th className="ms-th w-[70px]">Casa</th>
                <th className="ms-th w-[170px]">Cubierto por</th>
                <th className="ms-th w-[70px]">Cubre</th>
                <th className="ms-th w-[70px]">Falta</th>
                <th className="ms-th w-[210px]">Proveedor</th>
                <th className="ms-th w-[110px]">Costo est.</th>
                <th className="ms-th w-[110px]">Costo conf.</th>
                <th className="ms-th w-[160px]">Estado</th>
                <th className="ms-th w-[60px]">Artista</th>
                <th className="ms-th w-[200px]">Notas</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.disciplina}>
                <tr>
                  <td colSpan={15} className="bg-[#0d0d0d] border-y border-[#1e1e1e] px-4 py-2">
                    <span className="ms-section-label">{DISCIPLINA_LABEL[g.disciplina]}</span>
                    <span className="ms-meta ml-2">{g.filas.length} conceptos</span>
                  </td>
                </tr>
                {g.filas.map((l) => (
                  <Fila
                    key={l.id}
                    linea={l}
                    guardada={guardadas.has(l.id)}
                    opcionesProveedor={opcionesProveedor}
                    onEditar={editar}
                    onQuitar={quitar}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <p className="ms-micro">
        Cada celda se guarda sola al dejar de escribir. El advance de esta plaza es independiente del rider maestro:
        editar aquí nunca cambia el rider del artista.{" "}
        <Link href={`/giras/${giraId}/advance`} className="ms-link-gold">
          Ver el cotejo de todas las plazas →
        </Link>
      </p>
    </div>
  );
}

// ── Renglón ──────────────────────────────────────────────────────────────────

function Fila({
  linea: l,
  guardada,
  opcionesProveedor,
  onEditar,
  onQuitar,
}: {
  linea: LineaAdvance;
  guardada: boolean;
  opcionesProveedor: ComboboxOption[];
  onEditar: (id: string, campos: Campos, inmediato?: boolean) => void;
  onQuitar: (l: LineaAdvance) => Promise<void>;
}) {
  const falta = l.cantidadPedida - l.cantidadCubierta;

  // Se avisa sobre la fila cuando difiere del rider maestro, pero la fila manda:
  // el usuario decide si adopta el dato de la fuente o se queda con el suyo.
  const difiere: string[] = [];
  if (l.riderLinea) {
    if (l.riderLinea.cantidad !== l.cantidadPedida) difiere.push(`el rider pide ${l.riderLinea.cantidad}`);
    if (l.riderLinea.prioridad !== l.prioridad)
      difiere.push(`en el rider es ${PRIORIDAD_LABEL[l.riderLinea.prioridad]?.toLowerCase()}`);
    if (l.riderLinea.concepto.trim() !== l.concepto.trim()) difiere.push(`en el rider dice «${l.riderLinea.concepto}»`);
  }

  return (
    <>
      <tr className="ms-tr align-top">
        <td className="ms-td">
          <input
            value={l.concepto}
            onChange={(e) => onEditar(l.id, { concepto: e.target.value })}
            className="ms-input-inline w-full"
          />
          {guardada && <span className="ms-micro text-emerald-400">guardado</span>}
          {l.riderLinea?.preferido && <p className="ms-micro mt-0.5">Prefiere: {l.riderLinea.preferido}</p>}
        </td>
        <td className="ms-td">
          <input
            type="number"
            min={0}
            value={l.cantidadPedida}
            onChange={(e) => onEditar(l.id, { cantidadPedida: Number(e.target.value) })}
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td">
          <select
            value={l.prioridad}
            onChange={(e) => onEditar(l.id, { prioridad: e.target.value }, true)}
            className={`ms-input-inline w-full border ${PRIORIDAD_COLOR[l.prioridad]}`}
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p} className="bg-[#111] text-white">
                {PRIORIDAD_LABEL[p]}
              </option>
            ))}
          </select>
        </td>
        <td className="ms-td">
          <input
            value={l.ofrecidoCasa ?? ""}
            onChange={(e) => onEditar(l.id, { ofrecidoCasa: e.target.value })}
            placeholder="qué responde el contra-rider…"
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td">
          <input
            type="number"
            min={0}
            value={l.cantidadCasa}
            onChange={(e) => onEditar(l.id, { cantidadCasa: Number(e.target.value) })}
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td">
          <select
            value={l.cubiertoPor}
            onChange={(e) => onEditar(l.id, { cubiertoPor: e.target.value }, true)}
            className="ms-input-inline w-full"
          >
            {CUBIERTO_POR.map((c) => (
              <option key={c} value={c}>
                {CUBIERTO_POR_LABEL[c]}
              </option>
            ))}
          </select>
        </td>
        <td className="ms-td">
          <input
            type="number"
            min={0}
            value={l.cantidadCubierta}
            onChange={(e) => onEditar(l.id, { cantidadCubierta: Number(e.target.value) })}
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td">
          <span
            className={`inline-block min-w-[2rem] text-center px-2 py-1 rounded-lg text-sm font-semibold ${
              falta > 0 ? "bg-red-500/10 text-red-300 border border-red-500/30" : "text-[#555]"
            }`}
          >
            {falta > 0 ? falta : "—"}
          </span>
        </td>
        <td className="ms-td">
          <Combobox
            value={l.proveedorId ?? ""}
            onChange={(v) => onEditar(l.id, { proveedorId: v || null }, true)}
            options={opcionesProveedor}
            placeholder="Elegir proveedor…"
            className="w-full"
          />
        </td>
        <td className="ms-td">
          <input
            type="number"
            step="0.01"
            value={l.costoEstimado ?? ""}
            onChange={(e) => onEditar(l.id, { costoEstimado: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="0"
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td">
          <input
            type="number"
            step="0.01"
            value={l.costoConfirmado ?? ""}
            onChange={(e) => onEditar(l.id, { costoConfirmado: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="0"
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td">
          <select
            value={l.estado}
            onChange={(e) => onEditar(l.id, { estado: e.target.value }, true)}
            className={`ms-input-inline w-full border ${ESTADO_ADVANCE_COLOR[l.estado]}`}
          >
            {ESTADOS_ADVANCE.map((e) => (
              <option key={e} value={e} className="bg-[#111] text-white">
                {ESTADO_ADVANCE_LABEL[e]}
              </option>
            ))}
          </select>
        </td>
        <td className="ms-td text-center">
          <input
            type="checkbox"
            checked={l.aprobadoPorArtista}
            onChange={(e) => onEditar(l.id, { aprobadoPorArtista: e.target.checked }, true)}
            className="accent-[#B3985B] w-4 h-4"
            title="Aprobado por el artista"
          />
        </td>
        <td className="ms-td">
          <input
            value={l.notas ?? ""}
            onChange={(e) => onEditar(l.id, { notas: e.target.value })}
            placeholder="…"
            className="ms-input-inline w-full"
          />
        </td>
        <td className="ms-td text-right">
          <button onClick={() => void onQuitar(l)} className="text-[#555] hover:text-red-400 transition-colors" title="Quitar renglón">
            ✕
          </button>
        </td>
      </tr>
      {difiere.length > 0 && (
        <tr>
          <td colSpan={15} className="px-4 pb-2 pt-0 bg-[#0d0d0d]/40">
            <span className="ms-micro text-amber-300">
              Difiere del rider maestro: {difiere.join(" · ")}.
            </span>
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
              className="ms-micro ms-link-gold ml-2 underline"
            >
              usar el del rider
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
