"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { BotonDescarga } from "@/components/BotonDescarga";
import { porDia, renglonesDeItinerario, type ItinerarioEvento, type ItinerarioRenglon } from "@/lib/itinerario-operaciones";

const TIPO_LABEL: Record<string, string> = { MONTAJE: "Montaje", EVENTO: "Evento", DESMONTAJE: "Desmontaje" };
const TIPO_CLASE: Record<string, string> = {
  MONTAJE: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  EVENTO: "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/30",
  DESMONTAJE: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

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

const PRESETS: { label: string; rango: () => [string, string] }[] = [
  { label: "Próximos 7 días", rango: () => [hoyISO(), sumarDias(hoyISO(), 7)] },
  { label: "Próximos 30 días", rango: () => [hoyISO(), sumarDias(hoyISO(), 30)] },
  { label: "Este mes", rango: () => [primerDiaMes(), ultimoDiaMes()] },
];

export default function ItinerarioClient() {
  const { success, error } = useToast();
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(sumarDias(hoyISO(), 30));
  const [eventos, setEventos] = useState<ItinerarioEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/proyectos/itinerario?inicio=${inicio}&fin=${fin}`)
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
      .finally(() => setLoading(false));
  }, [inicio, fin, error]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const dias = useMemo(() => porDia(renglonesDeItinerario(eventos)), [eventos]);

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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="ms-h1">Itinerario de operaciones</h1>
          <p className="text-gray-500 text-sm">
            Montaje, evento y desmontaje de todos los proyectos en el período, con responsable y notas.
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
        <div className="space-y-4">
          {dias.map((d) => (
            <div key={d.fecha} className="ms-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white capitalize">{fechaLarga(d.fecha)}</h2>
                <span className="text-xs text-gray-500">
                  {d.renglones.length} jornada{d.renglones.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2">
                {d.renglones.map((r: ItinerarioRenglon, i: number) => (
                  <div
                    key={`${r.proyectoId}-${r.tipo}-${i}`}
                    className="ms-card-inset p-3 flex flex-col sm:flex-row sm:items-start gap-3"
                  >
                    <span
                      className={`shrink-0 self-start text-[10px] font-semibold px-2 py-1 rounded-md border ${TIPO_CLASE[r.tipo]}`}
                    >
                      {TIPO_LABEL[r.tipo]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/proyectos/${r.proyectoId}`}
                        className="text-sm font-medium text-white hover:text-[#B3985B] transition-colors"
                      >
                        {r.nombre}
                        {r.diaLabel ? <span className="text-gray-500"> · {r.diaLabel}</span> : null}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {r.clienteNombre} · {r.numeroProyecto}
                      </div>
                    </div>

                    <div className="sm:w-32 shrink-0 text-xs text-gray-300">
                      {r.horaInicio ?? "Por definir"}
                      {r.horaFin ? ` – ${r.horaFin}` : ""}
                    </div>

                    <div className="sm:w-32 shrink-0 text-xs text-gray-300">
                      {r.responsable ?? <span className="text-gray-600">Sin asignar</span>}
                    </div>

                    <textarea
                      value={notas[r.proyectoId] ?? ""}
                      onChange={(e) => setNotas((prev) => ({ ...prev, [r.proyectoId]: e.target.value }))}
                      onBlur={(e) => guardarNota(r.proyectoId, e.target.value)}
                      placeholder="Notas de esta operación…"
                      rows={1}
                      className="flex-1 min-w-[180px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 resize-none focus:resize-y focus:outline-none focus:border-[#B3985B]/40"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
