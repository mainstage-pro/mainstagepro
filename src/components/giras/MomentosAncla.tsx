"use client";

/**
 * Los horarios del día dentro de la ficha del show.
 *
 * Sale el día completo en orden: los ocho momentos de siempre —load in, montaje,
 * line check, soundcheck, puertas, show, load out, curfew— y también lo que se
 * agregó a esta fecha (el meet and greet, la prensa, el cambio de escenario),
 * porque un horario que no aparece en la ficha es un horario que nadie ve.
 *
 * El renglón se agrega y se detalla —responsable, lugar, notas— en la pestaña
 * "Día del show"; aquí se lee el día y se corrige la hora.
 *
 * No es un panel heredado de solo lectura: cuando la ficha está en edición, la
 * hora se escribe aquí mismo y se guarda sola.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { useToast } from "@/components/Toast";
import HoraInput from "@/components/ui/HoraInput";
import { MOMENTOS_PLANTILLA, TIPO_BLOQUE_COLOR, duracionBloque, fmtDuracion, ordenarBloques } from "@/lib/giras";
import { esRango } from "@/lib/show-momentos";
import { fmt24to12, fmtRango } from "@/lib/hora";

export interface MomentoAncla {
  id: string;
  llave: string | null;
  titulo: string;
  hora: string | null;
  horaFin: string | null;
  tipo: string;
  esAncla: boolean;
  orden: number;
}

interface Props {
  showId: string;
  editable: boolean;
}

const DEMORA_GUARDADO = 700;

export default function MomentosAncla({ showId, editable }: Props) {
  const toast = useToast();
  const pathname = usePathname();

  const [momentos, setMomentos] = useState<MomentoAncla[] | null>(null);
  const [resembrando, setResembrando] = useState(false);

  const pendientes = useRef(new Map<string, Record<string, unknown>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/gira-shows/${showId}/momentos`);
    if (!res.ok) {
      setMomentos([]);
      return;
    }
    const d = await res.json();
    setMomentos((d.momentos ?? []) as MomentoAncla[]);
  }, [showId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // El GET siembra el esqueleto la primera vez. Si alguien borró anclas en el
  // día del show, aquí se vuelven a pedir de un clic: nada se resiembra solo.
  async function reponerFaltantes(llaves: string[]) {
    setResembrando(true);
    try {
      for (const llave of llaves) {
        const res = await fetch(`/api/gira-shows/${showId}/momentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ llave }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(d.error ?? "No se pudo reponer el horario");
          break;
        }
      }
      await cargar();
    } finally {
      setResembrando(false);
    }
  }

  async function descargar(momentoId: string) {
    const campos = pendientes.current.get(momentoId);
    pendientes.current.delete(momentoId);
    const t = timers.current.get(momentoId);
    if (t) clearTimeout(t);
    timers.current.delete(momentoId);
    if (!campos) return;

    const res = await fetch(`/api/show-momentos/${momentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar la hora");
    }
  }

  function editar(momentoId: string, campos: Record<string, unknown>) {
    setMomentos((prev) =>
      (prev ?? []).map((m) => (m.id === momentoId ? ({ ...m, ...campos } as MomentoAncla) : m)),
    );
    pendientes.current.set(momentoId, { ...(pendientes.current.get(momentoId) ?? {}), ...campos });
    const t = timers.current.get(momentoId);
    if (t) clearTimeout(t);
    timers.current.set(momentoId, setTimeout(() => void descargar(momentoId), DEMORA_GUARDADO));
  }

  // La liga al minuto a minuto se arma desde la URL: el componente solo conoce
  // el show, no la gira, y la ficha siempre cuelga de /show/[showId].
  const hrefDia = useMemo(() => {
    const ancla = `/show/${showId}`;
    const i = pathname.indexOf(ancla);
    const base = i >= 0 ? pathname.slice(0, i + ancla.length) : pathname.replace(/\/$/, "");
    return `${base}/dia`;
  }, [pathname, showId]);

  // El día completo y en orden, no solo el esqueleto: el que lee la ficha quiere
  // ver también el meet and greet que se agregó para esta fecha.
  const dia = useMemo(() => ordenarBloques(momentos ?? []), [momentos]);

  const faltantes = useMemo(() => {
    const estan = new Set(dia.map((m) => m.llave).filter((l): l is string => !!l));
    return MOMENTOS_PLANTILLA.filter((p) => !estan.has(p.llave));
  }, [dia]);

  const conHora = dia.filter((m) => !!m.hora).length;

  return (
    <section className="ms-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="ms-section-label">Horarios del día</h3>
          <p className="ms-meta mt-0.5">
            Los horarios de siempre y lo que se agregó a esta fecha, en orden. Un momento nuevo —meet and greet, prensa,
            cambio de escenario— se agrega en el día del show.
          </p>
        </div>
        <Link href={hrefDia} className="ms-btn-ghost shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap">
          <ListOrdered className="w-3.5 h-3.5" />
          Día del show
        </Link>
      </div>

      {momentos === null ? (
        <p className="ms-meta">Cargando los horarios…</p>
      ) : dia.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">El día del show no tiene esqueleto.</p>
          {editable && (
            <button
              onClick={() => void reponerFaltantes(MOMENTOS_PLANTILLA.map((p) => p.llave))}
              disabled={resembrando}
              className="ms-btn-secondary mt-3 disabled:opacity-50"
            >
              {resembrando ? "Armando…" : "Armar los horarios de siempre"}
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a1a]">
          {dia.map((m) => {
            const rango = esRango(m.llave);
            const dura = fmtDuracion(duracionBloque(m.hora, m.horaFin));
            return (
              <div
                key={m.id}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3 py-2 items-center"
              >
                <div className="min-w-0">
                  <p className={`text-[13px] truncate ${TIPO_BLOQUE_COLOR[m.tipo] ?? "text-white"}`}>
                    {m.titulo}
                    {!m.esAncla && <span className="ms-micro text-[#555] ml-1.5">de esta fecha</span>}
                  </p>
                  {rango && dura !== "—" && <p className="ms-micro">dura {dura}</p>}
                </div>

                {editable ? (
                  <div className="flex items-center gap-1.5">
                    <HoraInput
                      value={m.hora}
                      onChange={(v) => editar(m.id, { hora: v || null })}
                      size="sm"
                      className="ms-input-inline w-[108px]"
                    />
                    {rango && (
                      <>
                        <span className="text-[#555] text-xs">→</span>
                        <HoraInput
                          value={m.horaFin}
                          onChange={(v) => editar(m.id, { horaFin: v || null })}
                          size="sm"
                          className="ms-input-inline w-[108px]"
                          placeholder="fin"
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-white tabular-nums sm:text-right">
                    {rango ? fmtRango(m.hora, m.horaFin) || "—" : fmt24to12(m.hora) || "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {momentos !== null && dia.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="ms-micro">
            {conHora} de {dia.length} con hora.
            {editable ? " Cada hora se guarda sola." : ""}
          </p>
          {editable && faltantes.length > 0 && (
            <button
              onClick={() => void reponerFaltantes(faltantes.map((p) => p.llave))}
              disabled={resembrando}
              className="ms-badge ms-badge-gold hover:text-white transition-colors disabled:opacity-50"
              title={`Faltan del esqueleto: ${faltantes.map((p) => p.titulo).join(", ")}`}
            >
              + Reponer {faltantes.length} horario{faltantes.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
