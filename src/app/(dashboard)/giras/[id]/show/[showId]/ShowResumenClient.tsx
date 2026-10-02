"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HoraInput from "@/components/ui/HoraInput";
import VenuePicker from "@/components/ui/VenuePicker";
import { useToast } from "@/components/Toast";
import {
  ESTADOS_SHOW,
  ESTADO_SHOW_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPOS_SHOW,
  TIPO_SHOW_LABEL,
  fechaInput,
  fmtFechaCorta,
  type ResumenAdvance,
} from "@/lib/giras";

export interface VenueFicha {
  id: string;
  nombre: string;
  ciudad: string | null;
  estado: string | null;
  direccion: string | null;
  linkMaps: string | null;
  capacidadPersonas: number | null;
  medidasEscenario: string | null;
  alturaRejaM: number | null;
  voltajeDisponible: string | null;
  amperajeTotal: number | null;
  fases: string | null;
  ubicacionTablero: string | null;
  accesoEscenario: string | null;
  accesoVehicular: string | null;
  puntoDescarga: string | null;
  horarioCarga: string | null;
  camerinos: string | null;
  restriccionDecibeles: string | null;
  restriccionHorario: string | null;
  restriccionInstalacion: string | null;
  contactoTecnicoNombre: string | null;
  contactoTecnicoTelefono: string | null;
  contactoTecnicoEmail: string | null;
  riderCasaUrl: string | null;
  notasTecnicas: string | null;
}

export interface ShowDetalle {
  id: string;
  giraId: string;
  fecha: string;
  ciudad: string | null;
  venueId: string | null;
  venueNombre: string | null;
  estado: string;
  tipoShow: string | null;
  aforoEsperado: number | null;
  horaLoadIn: string | null;
  horaMontaje: string | null;
  horaLineCheck: string | null;
  horaSoundcheck: string | null;
  horaDoors: string | null;
  horaShow: string | null;
  horaFin: string | null;
  horaLoadOut: string | null;
  curfew: string | null;
  promotorNombre: string | null;
  promotorContacto: string | null;
  promotorTelefono: string | null;
  promotorEmail: string | null;
  contactoCasaNombre: string | null;
  contactoCasaTelefono: string | null;
  contactoCasaEmail: string | null;
  notas: string | null;
  riderEnviadoEn: string | null;
  advanceCerradoEn: string | null;
  crew: number;
  bloques: number;
  archivos: number;
}

/// El orden es la jornada real: así se lee como un day sheet, no como un formulario.
const HORARIOS: { campo: keyof Form; label: string }[] = [
  { campo: "horaLoadIn", label: "Load in" },
  { campo: "horaMontaje", label: "Montaje" },
  { campo: "horaLineCheck", label: "Line check" },
  { campo: "horaSoundcheck", label: "Soundcheck" },
  { campo: "horaDoors", label: "Apertura de puertas" },
  { campo: "horaShow", label: "Show" },
  { campo: "horaFin", label: "Fin del show" },
  { campo: "horaLoadOut", label: "Load out" },
  { campo: "curfew", label: "Curfew" },
];

interface Form {
  fecha: string;
  ciudad: string;
  venueId: string | null;
  venueNombre: string;
  estado: string;
  tipoShow: string;
  aforoEsperado: string;
  horaLoadIn: string;
  horaMontaje: string;
  horaLineCheck: string;
  horaSoundcheck: string;
  horaDoors: string;
  horaShow: string;
  horaFin: string;
  horaLoadOut: string;
  curfew: string;
  promotorNombre: string;
  promotorContacto: string;
  promotorTelefono: string;
  promotorEmail: string;
  contactoCasaNombre: string;
  contactoCasaTelefono: string;
  contactoCasaEmail: string;
  notas: string;
}

function aForm(s: ShowDetalle): Form {
  return {
    fecha: fechaInput(s.fecha),
    ciudad: s.ciudad ?? "",
    venueId: s.venueId,
    venueNombre: s.venueNombre ?? "",
    estado: s.estado,
    tipoShow: s.tipoShow ?? "",
    aforoEsperado: s.aforoEsperado?.toString() ?? "",
    horaLoadIn: s.horaLoadIn ?? "",
    horaMontaje: s.horaMontaje ?? "",
    horaLineCheck: s.horaLineCheck ?? "",
    horaSoundcheck: s.horaSoundcheck ?? "",
    horaDoors: s.horaDoors ?? "",
    horaShow: s.horaShow ?? "",
    horaFin: s.horaFin ?? "",
    horaLoadOut: s.horaLoadOut ?? "",
    curfew: s.curfew ?? "",
    promotorNombre: s.promotorNombre ?? "",
    promotorContacto: s.promotorContacto ?? "",
    promotorTelefono: s.promotorTelefono ?? "",
    promotorEmail: s.promotorEmail ?? "",
    contactoCasaNombre: s.contactoCasaNombre ?? "",
    contactoCasaTelefono: s.contactoCasaTelefono ?? "",
    contactoCasaEmail: s.contactoCasaEmail ?? "",
    notas: s.notas ?? "",
  };
}

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="min-w-0">
      <p className="ms-micro">{label}</p>
      <p className="text-[13px] text-white mt-0.5 break-words">{valor}</p>
    </div>
  );
}

export default function ShowResumenClient({
  show,
  venue,
  advance,
}: {
  show: ShowDetalle;
  venue: VenueFicha | null;
  advance: ResumenAdvance;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Form>(aForm(show));
  const [guardando, setGuardando] = useState(false);
  const [sellando, setSellando] = useState(false);

  const base = `/giras/${show.giraId}/show/${show.id}`;

  function set(patch: Partial<Form>) {
    setForm((p) => ({ ...p, ...patch }));
  }

  async function guardar() {
    if (!form.fecha) {
      toast.error("La plaza necesita fecha.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/gira-shows/${show.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: form.fecha,
          ciudad: form.ciudad,
          venueId: form.venueId,
          estado: form.estado,
          tipoShow: form.tipoShow || null,
          aforoEsperado: form.aforoEsperado === "" ? null : Number(form.aforoEsperado),
          horaLoadIn: form.horaLoadIn,
          horaMontaje: form.horaMontaje,
          horaLineCheck: form.horaLineCheck,
          horaSoundcheck: form.horaSoundcheck,
          horaDoors: form.horaDoors,
          horaShow: form.horaShow,
          horaFin: form.horaFin,
          horaLoadOut: form.horaLoadOut,
          curfew: form.curfew,
          promotorNombre: form.promotorNombre,
          promotorContacto: form.promotorContacto,
          promotorTelefono: form.promotorTelefono,
          promotorEmail: form.promotorEmail,
          contactoCasaNombre: form.contactoCasaNombre,
          contactoCasaTelefono: form.contactoCasaTelefono,
          contactoCasaEmail: form.contactoCasaEmail,
          notas: form.notas,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar la plaza.");
        return;
      }
      toast.success("Plaza actualizada");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar la plaza.");
    } finally {
      setGuardando(false);
    }
  }

  async function sellar(cuerpo: Record<string, boolean>, hecho: string) {
    setSellando(true);
    try {
      const res = await fetch(`/api/gira-shows/${show.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        toast.error("No se pudo registrar.");
        return;
      }
      toast.success(hecho);
      router.refresh();
    } catch {
      toast.error("No se pudo registrar.");
    } finally {
      setSellando(false);
    }
  }

  const aforoDescuadra =
    form.aforoEsperado !== "" && venue?.capacidadPersonas && Number(form.aforoEsperado) > venue.capacidadPersonas;

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ms-h2">La plaza</h2>
        <button onClick={guardar} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="ms-card p-4 lg:col-span-2 space-y-3">
          <h3 className="ms-section-label">Identidad del show</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="ms-label block mb-1.5">Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => set({ fecha: e.target.value })} className="ms-input" />
            </div>
            <div>
              <label className="ms-label block mb-1.5">Ciudad</label>
              <input value={form.ciudad} onChange={(e) => set({ ciudad: e.target.value })} className="ms-input" />
            </div>
            <div>
              <label className="ms-label block mb-1.5">Tipo de show</label>
              <select value={form.tipoShow} onChange={(e) => set({ tipoShow: e.target.value })} className="ms-input">
                <option value="">Sin definir</option>
                {TIPOS_SHOW.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_SHOW_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label block mb-1.5">Estado</label>
              <select value={form.estado} onChange={(e) => set({ estado: e.target.value })} className="ms-input">
                {ESTADOS_SHOW.map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_SHOW_LABEL[e]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
            <VenuePicker
              label="Venue"
              value={form.venueNombre}
              venueId={form.venueId}
              onChange={(nombre, venueId, v) =>
                set({ venueNombre: nombre, venueId, ...(v?.ciudad && !form.ciudad ? { ciudad: v.ciudad } : {}) })
              }
            />
            <div>
              <label className="ms-label block mb-1.5">Aforo esperado</label>
              <input
                type="number"
                min={0}
                value={form.aforoEsperado}
                onChange={(e) => set({ aforoEsperado: e.target.value })}
                className="ms-input"
              />
              {aforoDescuadra && (
                <p className="text-amber-300 text-[11px] mt-1">
                  La capacidad del venue en catálogo es {venue?.capacidadPersonas?.toLocaleString("es-MX")}.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="ms-section-label pt-1">Horarios ancla</h3>
            <p className="ms-meta mt-0.5 mb-2">
              Son el esqueleto del día. El minuto a minuto se desglosa en{" "}
              <Link href={`${base}/dia`} className="ms-link-gold">
                Día del show
              </Link>
              .
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {HORARIOS.map((h) => (
                <div key={h.campo}>
                  <label className="ms-label block mb-1.5">{h.label}</label>
                  <HoraInput
                    value={form[h.campo] as string}
                    onChange={(v) => set({ [h.campo]: v } as Partial<Form>)}
                    className="ms-input"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-2">
              <p className="ms-micro text-[#B3985B]">Contacto de la casa</p>
              <input
                value={form.contactoCasaNombre}
                onChange={(e) => set({ contactoCasaNombre: e.target.value })}
                placeholder="Nombre"
                className="ms-input"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={form.contactoCasaTelefono}
                  onChange={(e) => set({ contactoCasaTelefono: e.target.value })}
                  placeholder="Teléfono"
                  className="ms-input"
                />
                <input
                  value={form.contactoCasaEmail}
                  onChange={(e) => set({ contactoCasaEmail: e.target.value })}
                  placeholder="Correo"
                  className="ms-input"
                />
              </div>
              {venue?.contactoTecnicoNombre && form.contactoCasaNombre !== venue.contactoTecnicoNombre && (
                <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  <p className="text-amber-300 text-[11px] flex-1 min-w-0">
                    En el catálogo del venue el contacto técnico es {venue.contactoTecnicoNombre}.
                  </p>
                  <button
                    onClick={() =>
                      set({
                        contactoCasaNombre: venue.contactoTecnicoNombre ?? "",
                        contactoCasaTelefono: venue.contactoTecnicoTelefono ?? form.contactoCasaTelefono,
                        contactoCasaEmail: venue.contactoTecnicoEmail ?? form.contactoCasaEmail,
                      })
                    }
                    className="ms-micro text-amber-300 hover:text-white transition-colors shrink-0"
                  >
                    Usar ese
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="ms-micro text-[#B3985B]">Promotor</p>
              <input
                value={form.promotorNombre}
                onChange={(e) => set({ promotorNombre: e.target.value })}
                placeholder="Empresa o promotor"
                className="ms-input"
              />
              <input
                value={form.promotorContacto}
                onChange={(e) => set({ promotorContacto: e.target.value })}
                placeholder="Persona de contacto"
                className="ms-input"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={form.promotorTelefono}
                  onChange={(e) => set({ promotorTelefono: e.target.value })}
                  placeholder="Teléfono"
                  className="ms-input"
                />
                <input
                  value={form.promotorEmail}
                  onChange={(e) => set({ promotorEmail: e.target.value })}
                  placeholder="Correo"
                  className="ms-input"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="ms-label block mb-1.5">Notas de la plaza</label>
            <textarea value={form.notas} onChange={(e) => set({ notas: e.target.value })} rows={3} className="ms-textarea" />
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={guardar} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </section>

        <div className="space-y-4">
          <section className="ms-card p-4">
            <h3 className="ms-section-label mb-3">Advance de la plaza</h3>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[advance.semaforo] ?? ""}`}>
                {SEMAFORO_LABEL[advance.semaforo] ?? advance.semaforo}
              </span>
              <p className="text-2xl font-bold text-white tabular-nums">{advance.avance}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-[#1a1a1a] mt-2 overflow-hidden">
              <span
                className={`block h-full ${
                  advance.semaforo === "LISTO"
                    ? "bg-emerald-500"
                    : advance.semaforo === "EN_PROCESO"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${advance.avance}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="ms-card-inset px-2.5 py-2">
                <p className="ms-micro">Indispensables</p>
                <p className="text-sm text-white tabular-nums mt-0.5">
                  {advance.indispensablesResueltas}/{advance.indispensablesTotal}
                </p>
              </div>
              <div className="ms-card-inset px-2.5 py-2">
                <p className="ms-micro">Renglones abiertos</p>
                <p className="text-sm text-white tabular-nums mt-0.5">{advance.abiertas}</p>
              </div>
            </div>
            <Link href={`${base}/advance`} className="ms-btn-secondary block w-full text-center mt-3">
              {advance.total === 0 ? "Armar el advance" : "Trabajar el advance"}
            </Link>
          </section>

          <section className="ms-card p-4">
            <h3 className="ms-section-label mb-3">Sellos de la plaza</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] text-white">Rider enviado a la casa</p>
                  <p className="ms-meta mt-0.5">
                    {show.riderEnviadoEn ? fmtFechaCorta(show.riderEnviadoEn) : "Todavía no sale"}
                  </p>
                </div>
                <button
                  onClick={() => sellar({ riderEnviado: !show.riderEnviadoEn }, show.riderEnviadoEn ? "Sello quitado" : "Rider marcado como enviado")}
                  disabled={sellando}
                  className="ms-btn-ghost shrink-0 disabled:opacity-50"
                >
                  {show.riderEnviadoEn ? "Quitar sello" : "Marcar rider enviado"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#1a1a1a] pt-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-white">Advance cerrado</p>
                  <p className="ms-meta mt-0.5">
                    {show.advanceCerradoEn ? fmtFechaCorta(show.advanceCerradoEn) : "Sigue abierto"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    sellar({ advanceCerrado: !show.advanceCerradoEn }, show.advanceCerradoEn ? "Advance reabierto" : "Advance cerrado")
                  }
                  disabled={sellando}
                  className="ms-btn-ghost shrink-0 disabled:opacity-50"
                >
                  {show.advanceCerradoEn ? "Reabrir" : "Cerrar advance"}
                </button>
              </div>
            </div>

            {show.advanceCerradoEn && advance.indispensablesResueltas < advance.indispensablesTotal && (
              <p className="text-amber-300 text-[11px] bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 mt-3">
                El advance quedó cerrado con {advance.indispensablesTotal - advance.indispensablesResueltas} renglones
                indispensables sin resolver.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Crew", valor: show.crew, href: `/giras/${show.giraId}/crew` },
                { label: "Bloques", valor: show.bloques, href: `${base}/dia` },
                { label: "Archivos", valor: show.archivos, href: `/giras/${show.giraId}/documentos` },
              ].map((d) => (
                <Link key={d.label} href={d.href} className="ms-card-inset px-2.5 py-2 hover:border-[#B3985B]/40 transition-colors">
                  <p className="ms-micro">{d.label}</p>
                  <p className="text-sm text-white tabular-nums mt-0.5">{d.valor}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="ms-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="ms-section-label">Ficha técnica del foro</h3>
          <Link href="/catalogo/venues" className="ms-micro text-[#B3985B] hover:text-white transition-colors">
            Editar en el catálogo de venues →
          </Link>
        </div>

        {!venue ? (
          <p className="ms-meta">
            La plaza no tiene venue del catálogo. Sin foro no hay ficha técnica contra la que cotejar el rider.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Dato label="Venue" valor={venue.nombre} />
              <Dato
                label="Ubicación"
                valor={[venue.ciudad, venue.estado].filter(Boolean).join(", ") || null}
              />
              <Dato label="Capacidad" valor={venue.capacidadPersonas?.toLocaleString("es-MX")} />
              <Dato label="Escenario" valor={venue.medidasEscenario} />
              <Dato label="Altura de reja" valor={venue.alturaRejaM ? `${venue.alturaRejaM} m` : null} />
              <Dato
                label="Corriente"
                valor={
                  [venue.voltajeDisponible, venue.amperajeTotal ? `${venue.amperajeTotal} A` : null, venue.fases]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              <Dato label="Tablero" valor={venue.ubicacionTablero} />
              <Dato label="Acceso a escenario" valor={venue.accesoEscenario} />
              <Dato label="Acceso vehicular" valor={venue.accesoVehicular} />
              <Dato label="Punto de descarga" valor={venue.puntoDescarga} />
              <Dato label="Horario de carga" valor={venue.horarioCarga} />
              <Dato label="Camerinos" valor={venue.camerinos} />
              <Dato label="Decibeles" valor={venue.restriccionDecibeles} />
              <Dato label="Horario permitido" valor={venue.restriccionHorario} />
              <Dato label="Restricción de instalación" valor={venue.restriccionInstalacion} />
              <Dato
                label="Contacto técnico"
                valor={
                  [venue.contactoTecnicoNombre, venue.contactoTecnicoTelefono, venue.contactoTecnicoEmail]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
            </div>

            {venue.notasTecnicas && (
              <div>
                <p className="ms-micro">Notas técnicas</p>
                <p className="text-[13px] text-white mt-0.5 whitespace-pre-wrap">{venue.notasTecnicas}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {venue.riderCasaUrl && (
                <a href={venue.riderCasaUrl} target="_blank" rel="noopener noreferrer" className="ms-btn-secondary">
                  Rider de la casa
                </a>
              )}
              {venue.linkMaps && (
                <a href={venue.linkMaps} target="_blank" rel="noopener noreferrer" className="ms-btn-secondary">
                  Ubicación en mapas
                </a>
              )}
            </div>

            {!venue.capacidadPersonas && !venue.medidasEscenario && !venue.amperajeTotal && (
              <p className="ms-meta">
                El venue está en el catálogo pero su ficha técnica está vacía: es lo que hay que llenar en el advance para
                que la segunda visita cueste la mitad.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
