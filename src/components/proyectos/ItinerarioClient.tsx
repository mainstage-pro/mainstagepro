"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { BotonDescarga } from "@/components/BotonDescarga";
import { fmt24to12 } from "@/lib/hora";
import {
  porDia,
  renglonesDeItinerario,
  mapaColoresEventos,
  type ItinerarioEvento,
  type ItinerarioRenglon,
  type GrupoEvento,
  type CampoEditableItinerario,
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

/**
 * Input de hora editable en línea; mantiene lo escrito hasta que el blur confirma el guardado.
 * El llamador debe pasar `key={valor}` para que un valor nuevo desde el servidor (otra
 * recarga) remonte el input en vez de pelear con lo que el usuario esté escribiendo.
 */
function HoraInput({ valor, onGuardar }: { valor: string | null; onGuardar: (v: string) => void }) {
  const [v, setV] = useState(valor ?? "");
  return (
    <input
      type="time"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== (valor ?? "")) onGuardar(v);
      }}
      className="w-28 shrink-0 bg-transparent text-gray-200 font-medium text-xs border border-transparent rounded-md px-1.5 py-0.5 -ml-1.5 focus:border-[#B3985B]/40 focus:bg-[#1a1a1a] outline-none [color-scheme:dark] hover:border-[#2a2a2a]"
    />
  );
}

function TarjetaEvento({
  grupo,
  color,
  nota,
  onNotaChange,
  onNotaGuardar,
  onHoraGuardar,
}: {
  grupo: GrupoEvento;
  color: { accent: string; bg: string };
  nota: string;
  onNotaChange: (v: string) => void;
  onNotaGuardar: (v: string) => void;
  onHoraGuardar: (campo: CampoEditableItinerario, fecha: string, valor: string) => void;
}) {
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
        {grupo.checkpoints.map((c, i) => (
          <div key={`${c.etiqueta}-${i}`} className="px-4 py-2 flex items-center gap-3 text-xs">
            {c.campo ? (
              <HoraInput key={c.hora ?? ""} valor={c.hora} onGuardar={(v) => onHoraGuardar(c.campo!, c.fecha, v)} />
            ) : (
              <span
                className={`w-28 shrink-0 ${c.pendiente ? "text-gray-600 italic" : "text-gray-200 font-medium"}`}
              >
                {horaDisplay(c)}
              </span>
            )}
            <span className="flex-1 min-w-0 text-gray-300">
              {c.etiqueta}
              {c.diaLabel ? <span className="text-gray-600"> · {c.diaLabel}</span> : null}
            </span>
            {c.nota ? <span className="text-gray-500 truncate max-w-[40%]">{c.nota}</span> : null}
          </div>
        ))}
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

export default function ItinerarioClient() {
  const { success, error } = useToast();
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(sumarDias(hoyISO(), 30));
  const [eventos, setEventos] = useState<ItinerarioEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cargar = useCallback(
    (opts?: { silencioso?: boolean }) => {
      if (!opts?.silencioso) setLoading(true);
      return fetch(`/api/proyectos/itinerario?inicio=${inicio}&fin=${fin}`)
        .then((r) => r.json())
        .then((d) => {
          setEventos(d.eventos ?? []);
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

  const dias = useMemo(() => porDia(renglonesDeItinerario(eventos)), [eventos]);
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="ms-h1">Itinerario de operaciones</h1>
          <p className="text-gray-500 text-sm">
            Llamado, montaje, horarios del evento y desmontaje de todos los proyectos en el período.
          </p>
        </div>
        <BotonDescarga
          url={`/api/proyectos/itinerario/pdf?inicio=${inicio}&fin=${fin}`}
          filename={`Itinerario-Operaciones-${inicio}-a-${fin}.pdf`}
          titulo="Itinerario de operaciones"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B3985B] text-black hover:bg-[#c9a96a] transition-colors whitespace-nowrap"
        >
          Descargar PDF
        </BotonDescarga>
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
          Sin operaciones agendadas en este período.
        </div>
      ) : (
        <div className="space-y-5">
          {dias.map((d) => (
            <div key={d.fecha} className="ms-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white capitalize">{fechaLarga(d.fecha)}</h2>
                <span className="text-xs text-gray-500">
                  {d.grupos.length} evento{d.grupos.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-3">
                {d.grupos.map((g) => (
                  <TarjetaEvento
                    key={g.proyectoId}
                    grupo={g}
                    color={colores[g.proyectoId]}
                    nota={notas[g.proyectoId] ?? ""}
                    onNotaChange={(v) => setNotas((prev) => ({ ...prev, [g.proyectoId]: v }))}
                    onNotaGuardar={(v) => guardarNota(g.proyectoId, v)}
                    onHoraGuardar={(campo, fecha, valor) => guardarHora(g.proyectoId, campo, fecha, valor)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
