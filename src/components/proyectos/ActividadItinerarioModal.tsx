"use client";

import { useMemo, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import HoraInput from "@/components/ui/HoraInput";
import type { ItinerarioEvento, ActividadSuelta } from "@/lib/itinerario-operaciones";

type Seccion = "MONTAJE" | "EVENTO" | "DESMONTAJE";

const SECCIONES: { value: Seccion; label: string }[] = [
  { value: "MONTAJE", label: "Montaje" },
  { value: "EVENTO", label: "Evento" },
  { value: "DESMONTAJE", label: "Desmontaje" },
];

const SUELTA = "";

/** Días del evento de un proyecto, leídos de sus checkpoints de "Inicio del evento". */
function diasDelEvento(ev: ItinerarioEvento): string[] {
  return ev.checkpoints.filter((c) => c.campo === "inicioEvento").map((c) => c.fecha).sort();
}

/** Sección natural según la fecha: antes del evento = montaje, después = desmontaje. */
function seccionSugerida(ev: ItinerarioEvento | undefined, fecha: string): Seccion {
  if (!ev) return "EVENTO";
  const dias = diasDelEvento(ev);
  if (!dias.length) return "EVENTO";
  if (fecha < dias[0]) return "MONTAJE";
  if (fecha > dias[dias.length - 1]) return "DESMONTAJE";
  return "EVENTO";
}

const INPUT =
  "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#B3985B]/50";
const LABEL = "block text-[11px] uppercase tracking-wide text-gray-500 mb-1";

/**
 * Alta de una actividad desde el itinerario. Puede quedar suelta o ir directo a la
 * Logística general de un proyecto. En modo "integrar" parte de una suelta y el
 * proyecto es obligatorio.
 */
export default function ActividadItinerarioModal({
  eventos,
  fechaInicial,
  proyectoInicial,
  integrar,
  onClose,
  onGuardado,
}: {
  eventos: ItinerarioEvento[];
  fechaInicial: string;
  proyectoInicial?: string;
  /** Actividad suelta que se va a integrar a un proyecto. */
  integrar?: ActividadSuelta;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [fecha, setFecha] = useState(integrar?.fecha ?? fechaInicial);
  const [horaInicio, setHoraInicio] = useState(integrar?.horaInicio ?? "");
  const [horaFin, setHoraFin] = useState(integrar?.horaFin ?? "");
  const [titulo, setTitulo] = useState(integrar?.titulo ?? "");
  const [nota, setNota] = useState(integrar?.nota ?? "");
  const [responsable, setResponsable] = useState(integrar?.responsable ?? "");
  const [proyectoId, setProyectoId] = useState(proyectoInicial ?? SUELTA);
  const [seccion, setSeccion] = useState<Seccion>(() =>
    seccionSugerida(
      eventos.find((e) => e.proyectoId === proyectoInicial),
      integrar?.fecha ?? fechaInicial,
    ),
  );
  const [seccionTocada, setSeccionTocada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los proyectos que operan ese día van primero; el resto del período, después.
  const opciones = useMemo<ComboboxOption[]>(() => {
    const ese = eventos.filter((e) => e.checkpoints.some((c) => c.fecha === fecha));
    const otros = eventos.filter((e) => !ese.includes(e));
    const op = (e: ItinerarioEvento, group: string): ComboboxOption => ({
      value: e.proyectoId,
      label: `${e.nombre} · ${e.clienteNombre}`,
      group,
    });
    return [
      ...(integrar ? [] : [{ value: SUELTA, label: "Suelta (sin proyecto)" }]),
      ...ese.map((e) => op(e, "Operan ese día")),
      ...otros.map((e) => op(e, "Otros en el período")),
    ];
  }, [eventos, fecha, integrar]);

  function elegirProyecto(id: string) {
    setProyectoId(id);
    if (!seccionTocada) setSeccion(seccionSugerida(eventos.find((e) => e.proyectoId === id), fecha));
  }
  function cambiarFecha(v: string) {
    setFecha(v);
    if (!seccionTocada) setSeccion(seccionSugerida(eventos.find((e) => e.proyectoId === proyectoId), v));
  }

  async function guardar() {
    if (!fecha) return setError("Falta la fecha");
    if (!titulo.trim()) return setError("Escribe la actividad");
    if (integrar && !proyectoId) return setError("Elige el proyecto");
    setError(null);
    setGuardando(true);
    try {
      const r = await fetch("/api/proyectos/itinerario/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          horaInicio: horaInicio || null,
          horaFin: horaFin || null,
          titulo,
          nota,
          responsable,
          proyectoId: proyectoId || null,
          seccion: proyectoId ? seccion : null,
          actividadId: integrar?.id ?? null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar");
      const proyecto = eventos.find((e) => e.proyectoId === proyectoId);
      onGuardado(
        proyecto
          ? `Agregada a la logística de ${proyecto.nombre}`
          : "Actividad suelta agregada",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg my-auto rounded-2xl border border-[#1c1c1c] bg-[#0a0a0a] shadow-2xl shadow-black/80 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#141414]">
          <h2 className="text-sm font-semibold text-white">
            {integrar ? "Integrar a un proyecto" : "Nueva actividad"}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={LABEL}>Actividad</label>
            <input
              autoFocus={!integrar}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ej. Recoger pantallas con proveedor"
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => cambiarFecha(e.target.value)}
                className={`${INPUT} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label className={LABEL}>Inicio</label>
              <HoraInput value={horaInicio} onChange={setHoraInicio} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fin (opcional)</label>
              <HoraInput value={horaFin} onChange={setHoraFin} className={INPUT} placeholder="—" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Responsable</label>
              <input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Opcional"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Nota</label>
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" className={INPUT} />
            </div>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-3 space-y-3">
            <div>
              <label className={LABEL}>{integrar ? "Proyecto" : "¿Pertenece a un proyecto?"}</label>
              <Combobox
                value={proyectoId}
                onChange={(v) => elegirProyecto(v)}
                options={opciones}
                placeholder="Busca el proyecto…"
                className={INPUT}
              />
            </div>
            {proyectoId ? (
              <div>
                <label className={LABEL}>Sección de la logística general</label>
                <div className="flex gap-1.5">
                  {SECCIONES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setSeccion(s.value);
                        setSeccionTocada(true);
                      }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        seccion === s.value
                          ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10"
                          : "border-[#2a2a2a] text-gray-400 hover:border-[#B3985B]/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">
                  Queda como un renglón más de la Logística general del proyecto.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-600">
                Se queda en el itinerario como actividad suelta. Puedes integrarla a un proyecto después.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#141414]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-[#2a2a2a] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B3985B] text-black hover:bg-[#c9a96a] disabled:opacity-50"
          >
            {guardando ? "Guardando…" : integrar ? "Integrar" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
