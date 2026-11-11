"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { BotonDescarga } from "@/components/BotonDescarga";
import { fmt24to12 } from "@/lib/hora";
import HoraInput from "@/components/ui/HoraInput";
import ActividadItinerarioModal from "@/components/proyectos/ActividadItinerarioModal";
import {
  porDia,
  renglonesDeItinerario,
  mapaColoresEventos,
  eventoDeSueltas,
  ID_SUELTAS,
  type ActividadSuelta,
  type ItinerarioEvento,
  type ItinerarioRenglon,
  type GrupoEvento,
  type CampoEditableItinerario,
  type CategoriaCheckpoint,
} from "@/lib/itinerario-operaciones";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function primerDiaMes() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
}
function ultimoDiaMes() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function fechaLarga(fecha: string) {
  return new Date(`${fecha}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function horaDisplay(r: Pick<ItinerarioRenglon, "hora" | "horaFin" | "pendiente">) {
  if (r.pendiente || !r.hora) return "Por definir";
  const ini = fmt24to12(r.hora) || r.hora;
  if (!r.horaFin) return ini;
  const fin = fmt24to12(r.horaFin) || r.horaFin;
  return `${ini} – ${fin}`;
}

const PRESETS: { label: string; rango: () => [string, string] }[] = [
  { label: "Próximos 7 días", rango: () => [hoyISO(), sumarDias(hoyISO(), 7)] },
  { label: "Próximos 30 días", rango: () => [hoyISO(), sumarDias(hoyISO(), 30)] },
  { label: "Este mes", rango: () => [primerDiaMes(), ultimoDiaMes()] },
];

const HORA_INPUT_CLASS =
  "w-28 shrink-0 bg-transparent text-gray-200 font-medium text-xs border border-transparent rounded-md px-1.5 py-0.5 -ml-1.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] outline-none hover:border-[#2a2a2a]";

/** Nota libre de un checkpoint; se guarda al salir del campo, igual que la hora. */
function NotaInput({
  valor,
  placeholder,
  className = "flex-1 text-gray-500",
  onGuardar,
}: {
  valor: string;
  placeholder?: string;
  className?: string;
  onGuardar: (v: string) => void;
}) {
  const [text, setText] = useState(valor);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(valor);
  }, [valor]);
  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (text !== valor) onGuardar(text);
      }}
      className={`min-w-0 bg-transparent text-xs border border-transparent rounded-md px-1.5 py-0.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] focus:text-gray-200 outline-none hover:border-[#2a2a2a] placeholder:text-gray-600 ${className}`}
    />
  );
}

/** Fecha del bloque de Montaje/Desmontaje; cambiarla lo vuelve "día aparte" (o lo revierte si coincide con el día natural). */
function FechaBloqueInput({ valor, onGuardar }: { valor: string; onGuardar: (v: string) => void }) {
  return (
    <input
      type="date"
      value={valor}
      onChange={(e) => {
        if (e.target.value) onGuardar(e.target.value);
      }}
      className="bg-transparent text-gray-500 text-[11px] border border-transparent rounded px-1 py-0.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] focus:text-gray-300 outline-none [color-scheme:dark] hover:border-[#2a2a2a]"
    />
  );
}

/** Fecha propia de un renglón (Montaje/Desmontaje); limpiarla la revierte a la fecha del bloque. */
function FechaRenglonInput({ valor, onGuardar }: { valor: string; onGuardar: (v: string) => void }) {
  return (
    <input
      type="date"
      value={valor}
      onChange={(e) => onGuardar(e.target.value)}
      className="w-[7.5rem] shrink-0 bg-transparent text-gray-500 text-[11px] border border-transparent rounded px-1 py-0.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] focus:text-gray-300 outline-none [color-scheme:dark] hover:border-[#2a2a2a]"
    />
  );
}

/** "2 eventos · 1 actividad suelta" — las sueltas no cuentan como evento. */
function conteoDia(grupos: GrupoEvento[]) {
  const eventos = grupos.filter((g) => g.proyectoId !== ID_SUELTAS).length;
  const sueltas = grupos.find((g) => g.proyectoId === ID_SUELTAS)?.checkpoints.length ?? 0;
  const partes: string[] = [];
  if (eventos) partes.push(`${eventos} evento${eventos === 1 ? "" : "s"}`);
  if (sueltas) partes.push(`${sueltas} suelta${sueltas === 1 ? "" : "s"}`);
  return partes.join(" · ");
}

const ETIQUETA_CATEGORIA: Partial<Record<CategoriaCheckpoint, string>> = {
  MONTAJE: "Montaje",
  DESMONTAJE: "Desmontaje",
};

/** Agrupa checkpoints contiguos de la misma categoría — ya vienen ordenados así. */
function agruparPorCategoria(checkpoints: ItinerarioRenglon[]) {
  const grupos: { categoria: CategoriaCheckpoint; items: ItinerarioRenglon[] }[] = [];
  checkpoints.forEach((c) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.categoria === c.categoria) ultimo.items.push(c);
    else grupos.push({ categoria: c.categoria, items: [c] });
  });
  return grupos;
}

function TarjetaEvento({
  grupo,
  color,
  nota,
  onNotaChange,
  onNotaGuardar,
  onHoraGuardar,
  onNotaCheckpointGuardar,
  onFechaBloqueGuardar,
  onFechaCheckpointGuardar,
  onAgregar,
  onQuitarBloque,
}: {
  grupo: GrupoEvento;
  color: { accent: string; bg: string };
  nota: string;
  onNotaChange: (v: string) => void;
  onNotaGuardar: (v: string) => void;
  onHoraGuardar: (campo: CampoEditableItinerario, fecha: string, valor: string) => void;
  onNotaCheckpointGuardar: (campo: CampoEditableItinerario, valor: string) => void;
  onFechaBloqueGuardar: (categoria: "MONTAJE" | "DESMONTAJE", valor: string) => void;
  onFechaCheckpointGuardar: (campo: CampoEditableItinerario, valor: string) => void;
  onAgregar: () => void;
  onQuitarBloque: (bloqueId: string, etiqueta: string) => void;
}) {
  const grupos = useMemo(() => agruparPorCategoria(grupo.checkpoints), [grupo.checkpoints]);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${color.accent}40` }}>
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap"
        style={{ backgroundColor: `${color.accent}1a` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.accent }} />
          <Link
            href={`/proyectos/${grupo.proyectoId}`}
            className="text-sm font-semibold text-white hover:text-[#B3985B] transition-colors truncate"
          >
            {grupo.nombre}
          </Link>
          <span className="text-xs text-gray-500 truncate">
            {grupo.clienteNombre} · {grupo.numeroProyecto}
          </span>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {grupo.responsable ?? <span className="text-gray-600">Sin responsable asignado</span>}
        </span>
      </div>

      <div className="divide-y divide-[#2a2a2a]">
        {grupos.map((g, gi) => (
          <div key={`${g.categoria}-${gi}`}>
            {(g.categoria === "MONTAJE" || g.categoria === "DESMONTAJE") && (
              <div className="px-4 pt-2 flex items-center gap-2 text-[11px] text-gray-500">
                <span className="uppercase tracking-wide">{ETIQUETA_CATEGORIA[g.categoria]}</span>
                <FechaBloqueInput
                  valor={g.items[0].fecha}
                  onGuardar={(v) => onFechaBloqueGuardar(g.categoria as "MONTAJE" | "DESMONTAJE", v)}
                />
              </div>
            )}
            {g.items.map((c, i) => (
              <div key={`${c.etiqueta}-${i}`} className="px-4 py-2 flex items-center gap-3 text-xs">
                {c.campo ? (
                  <HoraInput
                    value={c.hora}
                    onChange={(v) => onHoraGuardar(c.campo!, c.fecha, v)}
                    size="sm"
                    className={HORA_INPUT_CLASS}
                  />
                ) : (
                  <span
                    className={`w-28 shrink-0 ${c.pendiente ? "text-gray-600 italic" : "text-gray-200 font-medium"}`}
                  >
                    {horaDisplay(c)}
                  </span>
                )}
                <span className="w-36 shrink-0 text-gray-300">
                  {c.etiqueta}
                  {c.diaLabel ? <span className="text-gray-600"> · {c.diaLabel}</span> : null}
                </span>
                {c.campo && g.categoria !== "EVENTO" ? (
                  <FechaRenglonInput
                    valor={c.fecha}
                    onGuardar={(v) => onFechaCheckpointGuardar(c.campo!, v)}
                  />
                ) : null}
                {c.campo ? (
                  <NotaInput
                    valor={c.notaEditable ?? ""}
                    placeholder={c.nota ?? "Nota…"}
                    onGuardar={(v) => onNotaCheckpointGuardar(c.campo!, v)}
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-gray-500 truncate">
                    {[c.nota, c.responsableRenglon].filter(Boolean).join(" · ")}
                  </span>
                )}
                {c.bloqueId ? (
                  <button
                    type="button"
                    title="Quitar de la logística del proyecto"
                    onClick={() => onQuitarBloque(c.bloqueId!, c.etiqueta)}
                    className="shrink-0 text-gray-600 hover:text-red-400 text-sm leading-none px-1"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="px-4 py-1.5">
        <button
          type="button"
          onClick={onAgregar}
          className="text-[11px] text-gray-500 hover:text-[#B3985B] transition-colors"
        >
          + Actividad en este proyecto
        </button>
      </div>

      <div className="px-4 py-2.5 bg-[#161616]">
        <textarea
          value={nota}
          onChange={(e) => onNotaChange(e.target.value)}
          onBlur={(e) => onNotaGuardar(e.target.value)}
          placeholder="Notas operativas de este evento…"
          rows={1}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 resize-none focus:resize-y focus:outline-none focus:border-[#B3985B]/40"
        />
      </div>
    </div>
  );
}

/** Actividades sueltas del día: editables en línea, y se pueden integrar a un proyecto. */
function TarjetaSueltas({
  grupo,
  onGuardar,
  onQuitar,
  onIntegrar,
}: {
  grupo: GrupoEvento;
  onGuardar: (id: string, campo: keyof ActividadSuelta, valor: string) => void;
  onQuitar: (id: string, titulo: string) => void;
  onIntegrar: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#3a3a3a] overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2.5 bg-[#151515]">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-500" />
        <span className="text-sm font-semibold text-gray-300">Actividades sueltas</span>
        <span className="text-xs text-gray-600">Sin proyecto</span>
      </div>
      <div className="divide-y divide-[#2a2a2a]">
        {grupo.checkpoints.map((c) => {
          const id = c.actividadId!;
          return (
            <div key={id} className="px-4 py-2 flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 shrink-0">
                <HoraInput
                  value={c.hora}
                  onChange={(v) => onGuardar(id, "horaInicio", v)}
                  size="sm"
                  placeholder="Hora"
                  className="w-20 bg-transparent text-gray-200 font-medium text-xs border border-transparent rounded-md px-1.5 py-0.5 -ml-1.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] outline-none hover:border-[#2a2a2a]"
                />
                <span className="text-gray-600">–</span>
                <HoraInput
                  value={c.horaFin}
                  onChange={(v) => onGuardar(id, "horaFin", v)}
                  size="sm"
                  placeholder="Fin"
                  className="w-20 bg-transparent text-gray-400 text-xs border border-transparent rounded-md px-1.5 py-0.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] outline-none hover:border-[#2a2a2a]"
                />
              </div>
              <NotaInput
                valor={c.etiqueta}
                className="w-40 shrink-0 text-gray-200 font-medium"
                onGuardar={(v) => onGuardar(id, "titulo", v)}
              />
              <NotaInput
                valor={c.responsableRenglon ?? ""}
                placeholder="Responsable…"
                className="w-28 shrink-0 text-gray-400"
                onGuardar={(v) => onGuardar(id, "responsable", v)}
              />
              <NotaInput
                valor={c.nota ?? ""}
                placeholder="Nota…"
                className="flex-1 text-gray-500"
                onGuardar={(v) => onGuardar(id, "nota", v)}
              />
              <button
                type="button"
                onClick={() => onIntegrar(id)}
                className="shrink-0 px-2 py-0.5 rounded-md text-[11px] text-[#B3985B] border border-[#B3985B]/30 hover:bg-[#B3985B]/10 transition-colors"
              >
                Integrar a proyecto
              </button>
              <button
                type="button"
                title="Quitar actividad"
                onClick={() => onQuitar(id, c.etiqueta)}
                className="shrink-0 text-gray-600 hover:text-red-400 text-sm leading-none px-1"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ModalActividad = { fecha: string; proyectoId?: string; integrar?: ActividadSuelta };

export default function ItinerarioClient() {
  const { success, error } = useToast();
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(sumarDias(hoyISO(), 30));
  const [eventos, setEventos] = useState<ItinerarioEvento[]>([]);
  const [sueltas, setSueltas] = useState<ActividadSuelta[]>([]);
  const [modal, setModal] = useState<ModalActividad | null>(null);
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cargar = useCallback(
    (opts?: { silencioso?: boolean }) => {
      if (!opts?.silencioso) setLoading(true);
      return fetch(`/api/proyectos/itinerario?inicio=${inicio}&fin=${fin}`)
        .then((r) => r.json())
        .then((d) => {
          setEventos(d.eventos ?? []);
          setSueltas(d.sueltas ?? []);
          const n: Record<string, string> = {};
          (d.eventos ?? []).forEach((ev: ItinerarioEvento) => {
            n[ev.proyectoId] = ev.notasOperativas ?? "";
          });
          setNotas(n);
        })
        .catch(() => error("No se pudo cargar el itinerario"))
        .finally(() => {
          if (!opts?.silencioso) setLoading(false);
        });
    },
    [inicio, fin, error],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const dias = useMemo(() => {
    const grupoSueltas = eventoDeSueltas(sueltas);
    return porDia(renglonesDeItinerario(grupoSueltas ? [...eventos, grupoSueltas] : eventos));
  }, [eventos, sueltas]);
  const colores = useMemo(() => mapaColoresEventos(eventos), [eventos]);

  async function guardarNota(proyectoId: string, valor: string) {
    try {
      const r = await fetch("/api/proyectos/itinerario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId, notasOperativas: valor }),
      });
      if (!r.ok) throw new Error();
      success("Nota guardada");
    } catch {
      error("No se pudo guardar la nota");
    }
  }

  // Edita el checkpoint directamente en el proyecto (mismo campo que su página de detalle);
  // se recarga en silencio porque un solo cambio puede mover la hora de otro checkpoint
  // derivado (p.ej. "Fin de montaje" cuando se mueve "Inicio de montaje").
  async function guardarHora(proyectoId: string, campo: CampoEditableItinerario, fecha: string, valor: string) {
    try {
      const r = await fetch("/api/proyectos/itinerario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId, campo, fecha, valor }),
      });
      if (!r.ok) throw new Error();
      success("Hora guardada");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo guardar la hora");
    }
  }

  async function guardarNotaCheckpoint(proyectoId: string, campo: CampoEditableItinerario, valor: string) {
    try {
      const r = await fetch("/api/proyectos/itinerario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId, notaCampo: campo, valor }),
      });
      if (!r.ok) throw new Error();
      success("Nota guardada");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo guardar la nota");
    }
  }

  // Cambiar la fecha de un bloque lo vuelve "día aparte" (o lo revierte si coincide con
  // el día natural del evento); se recarga porque puede mover la tarjeta a otro día.
  async function guardarFechaBloque(proyectoId: string, categoria: "MONTAJE" | "DESMONTAJE", valor: string) {
    try {
      const r = await fetch("/api/proyectos/itinerario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId, fechaCampo: categoria === "MONTAJE" ? "montaje" : "desmontaje", valor }),
      });
      if (!r.ok) throw new Error();
      success("Fecha guardada");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo guardar la fecha");
    }
  }

  // Fecha propia de un renglón de Montaje/Desmontaje (ej. llamado la noche antes);
  // vacío la revierte a la fecha del bloque. Se recarga porque puede mover el renglón a otro día.
  async function guardarFechaCheckpoint(proyectoId: string, campo: CampoEditableItinerario, valor: string) {
    try {
      const r = await fetch("/api/proyectos/itinerario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId, fechaRenglon: campo, valor }),
      });
      if (!r.ok) throw new Error();
      success("Fecha guardada");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo guardar la fecha");
    }
  }

  async function guardarSuelta(id: string, campo: keyof ActividadSuelta, valor: string) {
    if (campo === "titulo" && !valor.trim()) {
      error("La actividad no puede quedar vacía");
      await cargar({ silencioso: true });
      return;
    }
    try {
      const r = await fetch(`/api/proyectos/itinerario/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!r.ok) throw new Error();
      success("Guardado");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo guardar");
    }
  }

  async function quitarSuelta(id: string, titulo: string) {
    if (!confirm(`¿Quitar "${titulo}" del itinerario?`)) return;
    try {
      const r = await fetch(`/api/proyectos/itinerario/actividades/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      success("Actividad quitada");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo quitar");
    }
  }

  async function quitarBloque(bloqueId: string, etiqueta: string) {
    if (!confirm(`¿Quitar "${etiqueta}" de la logística general del proyecto?`)) return;
    try {
      const r = await fetch(`/api/proyectos/itinerario/bloques/${bloqueId}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      success("Quitada de la logística");
      await cargar({ silencioso: true });
    } catch {
      error("No se pudo quitar");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="ms-h1">Itinerario de operaciones</h1>
          <p className="text-gray-500 text-sm">
            Llamado, montaje, horarios del evento y desmontaje de todos los proyectos en el período.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setModal({ fecha: inicio > hoyISO() ? inicio : hoyISO() })}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors whitespace-nowrap"
        >
          + Actividad
        </button>
        <BotonDescarga
          url={`/api/proyectos/itinerario/pdf?inicio=${inicio}&fin=${fin}`}
          filename={`Itinerario-Operaciones-${inicio}-a-${fin}.pdf`}
          titulo="Itinerario de operaciones"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B3985B] text-black hover:bg-[#c9a96a] transition-colors whitespace-nowrap"
        >
          Descargar PDF
        </BotonDescarga>
        </div>
      </div>

      <div className="ms-card p-4 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white"
        />
        <span className="text-gray-500 text-xs">al</span>
        <input
          type="date"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white"
        />
        <div className="flex gap-1.5 ml-auto">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const [i, f] = p.rango();
                setInicio(i);
                setFin(f);
              }}
              className="px-2.5 py-1 rounded-lg text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ms-card p-8 text-center text-sm text-gray-500">Cargando…</div>
      ) : dias.length === 0 ? (
        <div className="ms-card p-8 text-center text-sm text-gray-500">
          Sin operaciones agendadas en este período. Usa “+ Actividad” para agregar una.
        </div>
      ) : (
        <div className="space-y-5">
          {dias.map((d) => (
            <div key={d.fecha} className="ms-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white capitalize">{fechaLarga(d.fecha)}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {conteoDia(d.grupos)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModal({ fecha: d.fecha })}
                    className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors"
                  >
                    + Actividad
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {d.grupos.map((g) =>
                  g.proyectoId === ID_SUELTAS ? (
                    <TarjetaSueltas
                      key={g.proyectoId}
                      grupo={g}
                      onGuardar={guardarSuelta}
                      onQuitar={quitarSuelta}
                      onIntegrar={(id) => {
                        const a = sueltas.find((x) => x.id === id);
                        if (a) setModal({ fecha: a.fecha, integrar: a });
                      }}
                    />
                  ) : (
                  <TarjetaEvento
                    key={g.proyectoId}
                    grupo={g}
                    color={colores[g.proyectoId]}
                    nota={notas[g.proyectoId] ?? ""}
                    onNotaChange={(v) => setNotas((prev) => ({ ...prev, [g.proyectoId]: v }))}
                    onNotaGuardar={(v) => guardarNota(g.proyectoId, v)}
                    onHoraGuardar={(campo, fecha, valor) => guardarHora(g.proyectoId, campo, fecha, valor)}
                    onNotaCheckpointGuardar={(campo, valor) => guardarNotaCheckpoint(g.proyectoId, campo, valor)}
                    onFechaBloqueGuardar={(categoria, valor) => guardarFechaBloque(g.proyectoId, categoria, valor)}
                    onFechaCheckpointGuardar={(campo, valor) => guardarFechaCheckpoint(g.proyectoId, campo, valor)}
                    onAgregar={() => setModal({ fecha: d.fecha, proyectoId: g.proyectoId })}
                    onQuitarBloque={quitarBloque}
                  />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ActividadItinerarioModal
          eventos={eventos}
          fechaInicial={modal.fecha}
          proyectoInicial={modal.proyectoId}
          integrar={modal.integrar}
          onClose={() => setModal(null)}
          onGuardado={(msg) => {
            setModal(null);
            success(msg);
            cargar({ silencioso: true });
          }}
        />
      )}
    </div>
  );
}
