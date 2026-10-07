"use client";

/**
 * El advance de una fecha, departamento por departamento.
 *
 * La unidad es el REPARTO, no el equipo. Un renglón es un bloque del departamento
 * con una sola respuesta a "quién lo pone": «PA y consola de FOH → el venue»,
 * «microfonía y monitores → el artista», «2 IEM extra → nosotros, falta
 * conseguirlos». Es como se negocia al teléfono con el jefe técnico del foro, y es
 * lo que el advance anterior no dejaba hacer: bajaba una fila por concepto del
 * rider a cada una de las cinco plazas y nadie recorre doscientas cincuenta filas.
 *
 * Cada tarjeta trae las tres cosas juntas para que nada se quede fuera: lo que
 * pide el rider, lo que el foro tiene registrado en su ficha (cruzado por concepto
 * canónico, porque el rider pide «line array» y el foro contesta «KARA I») y el
 * reparto que se está armando. Un punto del rider sin renglón de reparto se marca
 * en ámbar: ese es el único error que de verdad cuesta caro en sitio.
 *
 * Aquí no hay proveedor ni costo a propósito: el equipo de tercero se captura una
 * sola vez en el rider del proyecto y de ahí se derivan el proveedor y su cuenta
 * por pagar (`src/lib/proveedor-equipos.ts`).
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  CUBIERTO_POR,
  CUBIERTO_POR_COLOR,
  CUBIERTO_POR_CORTO,
  CUBIERTO_POR_LABEL,
  ESTADOS_ADVANCE,
  ESTADO_ADVANCE_COLOR,
  ESTADO_ADVANCE_CORTO,
  ESTADO_ADVANCE_LABEL,
  PRIORIDADES,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  UNIDADES_RIDER,
  UNIDAD_RIDER_LABEL,
  resumirAdvance,
} from "@/lib/giras";
import type { DisciplinaAdvance, PanelAdvance, PuntoRider, RepartoFila } from "@/lib/advance-gira";

interface Props {
  showId: string;
  giraId: string;
  panel: PanelAdvance;
}

const DEMORA_GUARDADO = 700;

/// Las figuras que de verdad se eligen. `POR_DEFINIR` es la ausencia de decisión
/// (ninguna pastilla prendida) y `NO_APLICA` tiene su propio botón, para que
/// descartar un renglón cueste un clic y no se quede eternamente por definir.
const QUIEN_PONE = CUBIERTO_POR.filter((c) => c !== "POR_DEFINIR" && c !== "NO_APLICA");

function cantidadTexto(cantidad: number | null, unidad: string | null): string {
  if (cantidad === null) return unidad ? (UNIDAD_RIDER_LABEL[unidad] ?? unidad) : "";
  return unidad ? `${cantidad} ${UNIDAD_RIDER_LABEL[unidad] ?? unidad}` : String(cantidad);
}

function abierto(r: { estado: string; cubiertoPor: string }): boolean {
  if (r.cubiertoPor === "NO_APLICA") return false;
  return r.estado !== "CONFIRMADO" && r.estado !== "SUSTITUCION_APROBADA";
}

export default function AdvanceDisciplinas({ showId, giraId, panel }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [disciplinas, setDisciplinas] = useState<DisciplinaAdvance[]>(panel.disciplinas);
  const [abiertas, setAbiertas] = useState<Set<string>>(
    // Arranca abierto lo que tiene trabajo pendiente: si todo está cerrado, la
    // pantalla es un resumen y no hay por qué desplegar nada.
    new Set(panel.disciplinas.filter((d) => d.abiertos > 0 || d.sinRepartir > 0).map((d) => d.disciplina)),
  );
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const todos = disciplinas.flatMap((d) => d.repartos);
  const resumen = resumirAdvance(todos);

  function parche(disciplina: string, fn: (d: DisciplinaAdvance) => DisciplinaAdvance) {
    setDisciplinas((ds) => ds.map((d) => (d.disciplina === disciplina ? fn(d) : d)));
  }

  /// Recalcula los contadores de la tarjeta. Se hacen en el cliente para que el
  /// semáforo se mueva en el mismo clic: esperar al servidor para ver si el
  /// departamento ya cerró vuelve la pantalla intransitable al teléfono.
  function recontar(d: DisciplinaAdvance): DisciplinaAdvance {
    const repartidos = new Set(d.repartos.map((r) => r.riderLineaId).filter(Boolean));
    const puntos = d.puntos.map((p) => ({ ...p, repartido: repartidos.has(p.id) ? Math.max(1, p.repartido) : 0 }));
    return {
      ...d,
      puntos,
      sinRepartir: puntos.filter((p) => p.repartido === 0).length,
      abiertos: d.repartos.filter(abierto).length,
    };
  }

  function marcarGuardado(id: string) {
    setGuardados((g) => new Set(g).add(id));
    setTimeout(() => setGuardados((g) => {
      const s = new Set(g);
      s.delete(id);
      return s;
    }), 1500);
  }

  /// Escribe el campo en pantalla de inmediato y manda el PATCH con demora: el
  /// texto se captura al teléfono y un fetch por tecla no se sostiene.
  function editar(disciplina: string, id: string, campos: Partial<RepartoFila>, inmediato = false) {
    parche(disciplina, (d) =>
      recontar({ ...d, repartos: d.repartos.map((r) => (r.id === id ? { ...r, ...campos } : r)) }),
    );

    const clave = `${id}|${Object.keys(campos).join(",")}`;
    const previo = timers.current.get(clave);
    if (previo) clearTimeout(previo);

    const enviar = async () => {
      timers.current.delete(clave);
      const res = await fetch(`/api/show-advance-repartos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error ?? "No se pudo guardar el renglón");
        return;
      }
      marcarGuardado(id);
    };

    if (inmediato) void enviar();
    else timers.current.set(clave, setTimeout(enviar, DEMORA_GUARDADO));
  }

  async function agregar(disciplina: string, datos: Partial<RepartoFila> & { descripcion: string }) {
    setTrabajando(`nuevo-${disciplina}`);
    try {
      const res = await fetch(`/api/gira-shows/${showId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplina, ...datos }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo agregar el renglón");
        return;
      }
      parche(disciplina, (d) => recontar({ ...d, repartos: [...d.repartos, json.reparto as RepartoFila] }));
    } finally {
      setTrabajando(null);
    }
  }

  async function quitar(disciplina: string, r: RepartoFila) {
    const ok = await confirm({
      title: "Quitar el renglón",
      message: `«${r.descripcion}» se borra de esta fecha. Si venía del rider lo puedes volver a bajar con «Bajar lo que falta».`,
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;

    setTrabajando(r.id);
    try {
      const res = await fetch(`/api/show-advance-repartos/${r.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo quitar el renglón");
        return;
      }
      parche(disciplina, (d) => recontar({ ...d, repartos: d.repartos.filter((x) => x.id !== r.id) }));
    } finally {
      setTrabajando(null);
    }
  }

  /// Baja de golpe los puntos del rider de este departamento que todavía no tienen
  /// renglón. Es idempotente: no duplica ni pisa lo ya escrito.
  async function sembrar(disciplina: string) {
    setTrabajando(`sembrar-${disciplina}`);
    try {
      const res = await fetch(`/api/gira-shows/${showId}/advance/sembrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplina }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo bajar el rider");
        return;
      }
      toast.success(`${json.agregados} renglones bajados del rider`);
      const panelNuevo: PanelAdvance = await (await fetch(`/api/gira-shows/${showId}/advance`)).json();
      setDisciplinas(panelNuevo.disciplinas);
    } finally {
      setTrabajando(null);
    }
  }

  /// Un punto del rider se convierte en renglón de reparto con sus cantidades y
  /// especificaciones ya puestas: el reparto se negocia, no se vuelve a capturar.
  function repartirPunto(disciplina: string, p: PuntoRider) {
    const delForo = p.enElForo.length > 0;
    return agregar(disciplina, {
      riderLineaId: p.id,
      descripcion: p.concepto,
      cantidad: p.cantidad,
      unidad: p.unidad,
      especificaciones: p.especificaciones,
      prioridad: p.prioridad,
      // Si el foro ya lo tiene en su ficha, el renglón nace apuntando a la casa:
      // falta confirmarlo, no averiguar quién lo pone.
      cubiertoPor: delForo ? "CASA" : "POR_DEFINIR",
      estado: "PENDIENTE",
    } as Partial<RepartoFila> & { descripcion: string });
  }

  async function volcar() {
    const ok = await confirm({
      title: "Guardar en la ficha del foro",
      message:
        "Lo que quedó confirmado como del venue se escribe en su ficha técnica, para que la próxima gira arranque con lo que ya aprendimos. Lo pendiente no se vuelca.",
      confirmText: "Guardar en el foro",
    });
    if (!ok) return;

    setTrabajando("volcar");
    try {
      const res = await fetch(`/api/gira-shows/${showId}/advance/volcar`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo guardar en la ficha del foro");
        return;
      }
      toast.success(`Ficha del foro: ${json.creadas} nuevos, ${json.actualizadas} actualizados`);
    } finally {
      setTrabajando(null);
    }
  }

  const sinRepartirTotal = disciplinas.reduce((s, d) => s + d.sinRepartir, 0);

  return (
    <div className="space-y-5">
      {/* Semáforo de la fecha */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Cómo va la fecha</p>
          <span className={`ms-badge ${SEMAFORO_COLOR[resumen.semaforo]}`}>
            {SEMAFORO_LABEL[resumen.semaforo]} {resumen.avance}%
          </span>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Renglones por cerrar</p>
          <p className={`text-xl font-semibold ${resumen.abiertas > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {resumen.abiertas}
            <span className="text-xs text-[#8b8f97] font-normal"> de {resumen.total}</span>
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Del rider sin repartir</p>
          <p className={`text-xl font-semibold ${sinRepartirTotal > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {sinRepartirTotal}
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Ficha del foro</p>
          {panel.venueId ? (
            <Link href={`/giras/venues/${panel.venueId}`} className="ms-link-gold text-sm">
              {panel.venueNombre} · {panel.itemsForo} renglones
            </Link>
          ) : (
            <p className="text-sm text-[#8b8f97]">Sin venue asignado</p>
          )}
        </div>
      </div>

      {!panel.riderId && (
        <div className="ms-card p-4">
          <p className="text-sm text-amber-300">
            Esta gira no tiene rider maestro y el artista no tiene rider activo, así que no hay nada que cotejar. El
            reparto se puede escribir a mano de todos modos.
          </p>
        </div>
      )}

      {disciplinas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            Ni el rider pide nada ni el foro tiene ficha técnica. Transcribe el rider del artista o captura el
            inventario del venue y este advance se arma solo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disciplinas.map((d) => (
            <TarjetaDisciplina
              key={d.disciplina}
              d={d}
              desplegada={abiertas.has(d.disciplina)}
              trabajando={trabajando}
              guardados={guardados}
              onDesplegar={() =>
                setAbiertas((s) => {
                  const n = new Set(s);
                  if (n.has(d.disciplina)) n.delete(d.disciplina);
                  else n.add(d.disciplina);
                  return n;
                })
              }
              onSembrar={() => sembrar(d.disciplina)}
              onRepartir={(p) => repartirPunto(d.disciplina, p)}
              onAgregar={(datos) => agregar(d.disciplina, datos)}
              onEditar={(id, campos, inmediato) => editar(d.disciplina, id, campos, inmediato)}
              onQuitar={(r) => quitar(d.disciplina, r)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {panel.venueId && (
          <button type="button" onClick={volcar} disabled={trabajando === "volcar"} className="ms-btn-secondary">
            {trabajando === "volcar" ? "Guardando…" : "Guardar lo del venue en su ficha"}
          </button>
        )}
        <Link href={`/giras/${giraId}/advance`} className="ms-link-gold text-xs">
          Ver el advance de toda la gira »
        </Link>
      </div>
    </div>
  );
}

// ── Una tarjeta por departamento ─────────────────────────────────────────────

function TarjetaDisciplina({
  d,
  desplegada,
  trabajando,
  guardados,
  onDesplegar,
  onSembrar,
  onRepartir,
  onAgregar,
  onEditar,
  onQuitar,
}: {
  d: DisciplinaAdvance;
  desplegada: boolean;
  trabajando: string | null;
  guardados: Set<string>;
  onDesplegar: () => void;
  onSembrar: () => void;
  onRepartir: (p: PuntoRider) => void;
  onAgregar: (datos: Partial<RepartoFila> & { descripcion: string }) => void;
  onEditar: (id: string, campos: Partial<RepartoFila>, inmediato?: boolean) => void;
  onQuitar: (r: RepartoFila) => void;
}) {
  const [verRider, setVerRider] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [texto, setTexto] = useState("");

  return (
    <div className="ms-card overflow-hidden">
      <button
        type="button"
        onClick={onDesplegar}
        className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[#8b8f97] text-xs">{desplegada ? "▾" : "▸"}</span>
          <span className="text-white font-semibold">{d.label}</span>
          <span className="ms-micro text-[#8b8f97]">
            {d.repartos.length} {d.repartos.length === 1 ? "renglón" : "renglones"}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 shrink-0">
          {d.sinRepartir > 0 && (
            <span className="ms-badge ms-badge-amber">{d.sinRepartir} del rider sin repartir</span>
          )}
          {d.abiertos > 0 ? (
            <span className="ms-badge ms-badge-amber">{d.abiertos} por cerrar</span>
          ) : (
            d.repartos.length > 0 && <span className="ms-badge ms-badge-emerald">cerrado</span>
          )}
        </span>
      </button>

      {desplegada && (
        <div className="border-t border-[#1e1e1e] px-4 py-4 space-y-4">
          {/* Lo que pide el rider contra lo que el foro tiene. Es el cotejo: de
              aquí sale que nada se quede fuera. */}
          {d.puntos.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setVerRider((v) => !v)}
                  className="ms-section-label hover:text-[#B3985B]"
                >
                  {verRider ? "▾" : "▸"} Lo que pide el rider ({d.puntos.length})
                </button>
                {d.sinRepartir > 0 && (
                  <button
                    type="button"
                    onClick={onSembrar}
                    disabled={trabajando === `sembrar-${d.disciplina}`}
                    className="ms-btn-secondary text-xs"
                  >
                    {trabajando === `sembrar-${d.disciplina}`
                      ? "Bajando…"
                      : `Bajar lo que falta (${d.sinRepartir})`}
                  </button>
                )}
              </div>

              {(verRider || d.sinRepartir > 0) && (
                <div className="space-y-1.5">
                  {d.puntos
                    .filter((p) => verRider || p.repartido === 0)
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-lg border px-3 py-2 ${
                          p.repartido === 0
                            ? "border-amber-500/30 bg-amber-500/[0.06]"
                            : "border-[#1a1a1a] bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-white">
                              {cantidadTexto(p.cantidad, p.unidad)} {p.concepto}
                              <span className={`ms-badge ml-2 ${PRIORIDAD_COLOR[p.prioridad]}`}>
                                {PRIORIDAD_LABEL[p.prioridad]}
                              </span>
                            </p>
                            {p.especificaciones && <p className="ms-micro text-[#8b8f97]">{p.especificaciones}</p>}
                            {p.enElForo.length > 0 ? (
                              <p className="ms-micro text-emerald-300">
                                El foro tiene: {p.enElForo.map((i) => i.texto).join(" · ")}
                              </p>
                            ) : (
                              <p className="ms-micro text-[#555]">El foro no tiene nada registrado para esto</p>
                            )}
                          </div>
                          {p.repartido === 0 ? (
                            <button
                              type="button"
                              onClick={() => onRepartir(p)}
                              className="ms-btn-secondary text-xs shrink-0"
                            >
                              Repartir
                            </button>
                          ) : (
                            <span className="ms-badge ms-badge-emerald shrink-0">repartido</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Lo que el foro tiene y no contesta a ningún punto del rider. Muchas
              veces es la solución de otro renglón, así que se muestra igual. */}
          {d.foroSuelto.length > 0 && (
            <div className="space-y-1.5">
              <p className="ms-section-label">El foro también tiene ({d.foroSuelto.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {d.foroSuelto.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    title="Agregarlo al reparto como algo que pone el venue"
                    onClick={() =>
                      onAgregar({
                        descripcion: i.concepto,
                        cantidad: i.cantidad,
                        especificaciones: [i.marca, i.modelo].filter(Boolean).join(" ") || null,
                        cubiertoPor: "CASA",
                        estado: "CONFIRMADO",
                        prioridad: "DESEABLE",
                      })
                    }
                    className="rounded-lg border border-[#1a1a1a] bg-white/[0.02] px-2 py-1 text-[11px] text-gray-400 hover:border-[#B3985B]/40 hover:text-white"
                  >
                    + {i.texto}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* El reparto: quién pone qué */}
          <div className="space-y-2">
            <p className="ms-section-label">Quién pone qué</p>

            {d.repartos.length === 0 ? (
              <p className="ms-micro text-[#8b8f97]">
                Todavía no hay reparto en este departamento. Baja lo que pide el rider o escribe un renglón libre.
              </p>
            ) : (
              <div className="space-y-2">
                {d.repartos.map((r) => (
                  <FilaReparto
                    key={r.id}
                    r={r}
                    guardado={guardados.has(r.id)}
                    trabajando={trabajando === r.id}
                    onEditar={(campos, inmediato) => onEditar(r.id, campos, inmediato)}
                    onQuitar={() => onQuitar(r)}
                  />
                ))}
              </div>
            )}

            {nuevo ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Qué es: «2 IEM extra», «PA y consola de FOH»…"
                  className="ms-input flex-1 min-w-[240px] text-sm"
                />
                <button
                  type="button"
                  disabled={!texto.trim() || trabajando === `nuevo-${d.disciplina}`}
                  onClick={() => {
                    onAgregar({ descripcion: texto.trim() });
                    setTexto("");
                    setNuevo(false);
                  }}
                  className="ms-btn-primary text-xs"
                >
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTexto("");
                    setNuevo(false);
                  }}
                  className="ms-btn-ghost text-xs"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setNuevo(true)} className="ms-btn-ghost text-xs">
                + Renglón libre
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Un renglón del reparto ───────────────────────────────────────────────────

function FilaReparto({
  r,
  guardado,
  trabajando,
  onEditar,
  onQuitar,
}: {
  r: RepartoFila;
  guardado: boolean;
  trabajando: boolean;
  onEditar: (campos: Partial<RepartoFila>, inmediato?: boolean) => void;
  onQuitar: () => void;
}) {
  const cerrado = !abierto(r);
  const [detalle, setDetalle] = useState(false);

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 space-y-2 ${
        r.cubiertoPor === "NO_APLICA"
          ? "border-[#1a1a1a] bg-white/[0.01] opacity-60"
          : cerrado
            ? "border-emerald-500/25 bg-emerald-500/[0.05]"
            : r.prioridad === "INDISPENSABLE"
              ? "border-red-500/25 bg-red-500/[0.04]"
              : "border-[#1e1e1e] bg-white/[0.02]"
      }`}
    >
      {/* Qué es: descripción, cantidad y unidad */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={r.cantidad ?? ""}
          onChange={(e) => onEditar({ cantidad: e.target.value === "" ? null : Number(e.target.value) })}
          type="number"
          min={0}
          placeholder="—"
          className="ms-input-inline w-16 text-sm text-center"
          title="Cantidad"
        />
        <select
          value={r.unidad ?? ""}
          onChange={(e) => onEditar({ unidad: e.target.value || null }, true)}
          className="ms-filter-select text-xs"
          title="Unidad"
        >
          <option value="">sin unidad</option>
          {UNIDADES_RIDER.map((u) => (
            <option key={u} value={u}>
              {UNIDAD_RIDER_LABEL[u] ?? u}
            </option>
          ))}
        </select>
        <input
          value={r.descripcion}
          onChange={(e) => onEditar({ descripcion: e.target.value })}
          placeholder="Qué es"
          className="ms-input-inline flex-1 min-w-[180px] text-sm text-white"
        />
        <select
          value={r.prioridad}
          onChange={(e) => onEditar({ prioridad: e.target.value }, true)}
          className={`ms-filter-select text-xs ${PRIORIDAD_COLOR[r.prioridad]}`}
          title="Prioridad"
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {PRIORIDAD_LABEL[p]}
            </option>
          ))}
        </select>
        {guardado && <span className="ms-micro text-emerald-400">guardado</span>}
      </div>

      {/* Las dos decisiones, cada una con un clic */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <span className="ms-micro text-[#8b8f97] mr-1">Lo pone</span>
          {QUIEN_PONE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onEditar({ cubiertoPor: r.cubiertoPor === c ? "POR_DEFINIR" : c }, true)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                r.cubiertoPor === c
                  ? CUBIERTO_POR_COLOR[c]
                  : "border-[#1e1e1e] text-[#8b8f97] hover:border-[#B3985B]/40 hover:text-white"
              }`}
            >
              {CUBIERTO_POR_CORTO[c] ?? CUBIERTO_POR_LABEL[c]}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onEditar({ cubiertoPor: r.cubiertoPor === "NO_APLICA" ? "POR_DEFINIR" : "NO_APLICA" }, true)
            }
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              r.cubiertoPor === "NO_APLICA"
                ? "border-[#333] bg-white/5 text-[#8b8f97]"
                : "border-[#1e1e1e] text-[#555] hover:border-[#333] hover:text-[#8b8f97]"
            }`}
            title="No aplica en esta fecha"
          >
            no aplica
          </button>
        </div>

        {r.cubiertoPor !== "NO_APLICA" && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="ms-micro text-[#8b8f97] mr-1">Cómo va</span>
            {ESTADOS_ADVANCE.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onEditar({ estado: e }, true)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  r.estado === e
                    ? ESTADO_ADVANCE_COLOR[e]
                    : "border-[#1e1e1e] text-[#8b8f97] hover:border-[#B3985B]/40 hover:text-white"
                }`}
              >
                {ESTADO_ADVANCE_CORTO[e] ?? ESTADO_ADVANCE_LABEL[e]}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setDetalle((v) => !v)}
          className="ms-micro text-[#8b8f97] hover:text-[#B3985B] ml-auto"
        >
          {detalle ? "menos" : "especificaciones y notas"}
        </button>
        <button
          type="button"
          onClick={onQuitar}
          disabled={trabajando}
          className="ms-micro text-[#555] hover:text-red-400"
        >
          quitar
        </button>
      </div>

      {/* Lo que falta hacer para cerrarlo se muestra siempre que haya algo escrito:
          es la nota que se lee antes de la llamada, no un detalle plegable. */}
      {(detalle || r.porConseguir) && (
        <input
          value={r.porConseguir ?? ""}
          onChange={(e) => onEditar({ porConseguir: e.target.value })}
          placeholder="Qué falta para cerrarlo: «pedirle 4 wedges al promotor»…"
          className="ms-input-inline w-full text-xs text-amber-200"
        />
      )}

      {detalle && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={r.especificaciones ?? ""}
            onChange={(e) => onEditar({ especificaciones: e.target.value })}
            placeholder="Especificaciones: marca, modelo, alternativas aceptables"
            className="ms-input-inline w-full text-xs"
          />
          <input
            value={r.notas ?? ""}
            onChange={(e) => onEditar({ notas: e.target.value })}
            placeholder="Notas de la llamada"
            className="ms-input-inline w-full text-xs"
          />
        </div>
      )}
    </div>
  );
}
