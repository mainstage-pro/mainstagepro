"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import MomentosAncla from "@/components/giras/MomentosAncla";
import VenuePicker from "@/components/ui/VenuePicker";
import EstadoGuardado from "@/components/EstadoGuardado";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useAutoguardado } from "@/hooks/useAutoguardado";
import {
  ESTADOS_SHOW,
  ESTADO_SHOW_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPOS_SHOW,
  TIPO_SHOW_LABEL,
  fechaInput,
  fmtFechaCorta,
  fmtMoneda,
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
  /// Renglones de VenueInventario: lo que ya está documentado de este foro.
  conceptos: number;
}

export interface ShowDetalle {
  id: string;
  giraId: string;
  artistaId: string;
  fecha: string;
  ciudad: string | null;
  venueId: string | null;
  venueNombre: string | null;
  estado: string;
  tipoShow: string | null;
  aforoEsperado: number | null;
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
  momentos: number;
  archivos: number;
  /// El rider contra el que se cotejó la ficha del foro: el de la gira si lo tiene,
  /// y si no el vigente del artista.
  rider: { id: string; version: number; nombre: string; deLaGira: boolean } | null;
  // Lo que se cobra y lo que se opera en esta fecha. El proyecto del show no se
  // captura: nace de aprobar o adelantar una de sus cotizaciones.
  proyecto: { id: string; numeroProyecto: string } | null;
  cotizaciones: {
    id: string;
    numeroCotizacion: string;
    nombreCotizacion: string | null;
    estado: string;
    granTotal: number;
    proyecto: { id: string; numeroProyecto: string } | null;
  }[];
}

interface Form {
  fecha: string;
  ciudad: string;
  venueId: string | null;
  venueNombre: string;
  estado: string;
  tipoShow: string;
  aforoEsperado: string;
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
  return (
    <div className="min-w-0">
      <p className="ms-micro">{label}</p>
      <p className="text-[13px] text-white mt-0.5 break-words">{valor || <span className="text-[#555]">—</span>}</p>
    </div>
  );
}

/// Solo pinta lo que el foro tiene capturado: un hueco en la ficha técnica es el
/// dato que hay que ir a conseguir, no un renglón vacío más.
function DatoForo({ label, valor }: { label: string; valor: React.ReactNode }) {
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
  const [edicion, setEdicion] = useState(false);
  const [sellando, setSellando] = useState(false);
  const [cotizando, setCotizando] = useState(false);

  const base = `/giras/${show.giraId}/show/${show.id}`;

  const cuerpo = useCallback(
    (f: Form) => ({
      fecha: f.fecha,
      ciudad: f.ciudad,
      venueId: f.venueId,
      estado: f.estado,
      tipoShow: f.tipoShow || null,
      aforoEsperado: f.aforoEsperado === "" ? null : Number(f.aforoEsperado),
      promotorNombre: f.promotorNombre,
      promotorContacto: f.promotorContacto,
      promotorTelefono: f.promotorTelefono,
      promotorEmail: f.promotorEmail,
      contactoCasaNombre: f.contactoCasaNombre,
      contactoCasaTelefono: f.contactoCasaTelefono,
      contactoCasaEmail: f.contactoCasaEmail,
      notas: f.notas,
    }),
    [],
  );

  const auto = useAutoguardado<Form>({
    url: `/api/gira-shows/${show.id}`,
    valor: form,
    cuerpo,
    activo: edicion,
    validar: (f) => (f.fecha ? null : "El show necesita fecha."),
    // Cambiar fecha, ciudad o venue mueve el encabezado y el orden de la gira; eso
    // se recarga al cerrar la edición, no con cada tecla.
    onGuardado: () => {
      if (!edicion) router.refresh();
    },
    onError: (m) => toast.error(m),
  });

  const sello = auto.pendiente && auto.estado === "guardado" ? "pendiente" : auto.estado;

  function set(patch: Partial<Form>) {
    setForm((p) => ({ ...p, ...patch }));
  }

  function cerrarEdicion() {
    setEdicion(false);
    auto.guardarYa();
  }

  async function sellar(cuerpoSello: Record<string, boolean>, hecho: string) {
    setSellando(true);
    try {
      const res = await fetch(`/api/gira-shows/${show.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoSello),
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

  async function cotizarEquipo() {
    setCotizando(true);
    try {
      const res = await fetch(`/api/gira-shows/${show.id}/cotizacion`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo abrir la cotización.");
        return;
      }
      router.push(`/cotizaciones/nuevo?editId=${d.id}`);
    } catch {
      toast.error("No se pudo abrir la cotización.");
    } finally {
      setCotizando(false);
    }
  }

  const aforoDescuadra =
    form.aforoEsperado !== "" && venue?.capacidadPersonas && Number(form.aforoEsperado) > venue.capacidadPersonas;

  const corriente =
    [venue?.voltajeDisponible, venue?.amperajeTotal ? `${venue.amperajeTotal} A` : null, venue?.fases]
      .filter(Boolean)
      .join(" · ") || null;

  const fichaVacia = venue && !venue.capacidadPersonas && !venue.medidasEscenario && !venue.amperajeTotal;

  return (
    <div className="ms-page space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Arriba de todo: lo que el foro da es contra lo que se lee el rider, y es
              la primera pregunta de cualquier advance. */}
          <section className="ms-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="ms-section-label">Ficha técnica del foro</h3>
              <div className="flex items-center gap-3 flex-wrap">
                {show.rider && (
                  <Link href={`/giras/artista/${show.artistaId}/rider/${show.rider.id}`} className="ms-micro ms-link-gold">
                    Rider maestro v{show.rider.version}
                    {show.rider.deLaGira ? "" : " (del artista)"} →
                  </Link>
                )}
                <Link
                  href={venue ? `/catalogo/venues?venue=${venue.id}` : "/catalogo/venues"}
                  className="ms-micro ms-link-gold"
                >
                  {venue ? "Ficha del venue" : "Catálogo de venues"} →
                </Link>
              </div>
            </div>

            {!venue ? (
              <p className="ms-meta">
                El show no tiene venue del catálogo. Sin foro no hay ficha técnica contra la que cotejar el rider.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-sm text-white">{venue.nombre}</p>
                  <p className="ms-meta">
                    {[
                      [venue.ciudad, venue.estado].filter(Boolean).join(", ") || null,
                      venue.capacidadPersonas ? `${venue.capacidadPersonas.toLocaleString("es-MX")} de capacidad` : null,
                      `${venue.conceptos} ${venue.conceptos === 1 ? "concepto documentado" : "conceptos documentados"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <DatoForo label="Dirección" valor={venue.direccion} />
                  <DatoForo label="Escenario" valor={venue.medidasEscenario} />
                  <DatoForo label="Altura de reja" valor={venue.alturaRejaM ? `${venue.alturaRejaM} m` : null} />
                  <DatoForo label="Corriente" valor={corriente} />
                  <DatoForo label="Tablero" valor={venue.ubicacionTablero} />
                  <DatoForo label="Acceso a escenario" valor={venue.accesoEscenario} />
                  <DatoForo label="Acceso vehicular" valor={venue.accesoVehicular} />
                  <DatoForo label="Punto de descarga" valor={venue.puntoDescarga} />
                  <DatoForo label="Horario de carga" valor={venue.horarioCarga} />
                  <DatoForo label="Camerinos" valor={venue.camerinos} />
                  <DatoForo label="Decibeles" valor={venue.restriccionDecibeles} />
                  <DatoForo label="Horario permitido" valor={venue.restriccionHorario} />
                  <DatoForo label="Restricción de instalación" valor={venue.restriccionInstalacion} />
                  <DatoForo
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

                {(venue.riderCasaUrl || venue.linkMaps) && (
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
                )}

                {fichaVacia && (
                  <p className="ms-meta">
                    El venue está en el catálogo pero su ficha técnica está vacía: es lo que hay que llenar en el advance
                    para que la segunda visita cueste la mitad.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="ms-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="ms-section-label">El show</h3>
              <div className="flex items-center gap-3 shrink-0">
                {(edicion || auto.estado !== "limpio") && (
                  <EstadoGuardado estado={sello} onReintentar={auto.guardarYa} />
                )}
                {edicion ? (
                  <button onClick={cerrarEdicion} className="ms-btn-secondary">
                    Listo
                  </button>
                ) : (
                  <button onClick={() => setEdicion(true)} className="ms-btn-primary">
                    Editar
                  </button>
                )}
              </div>
            </div>

            {auto.error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {auto.error}
              </p>
            )}

            {edicion ? (
              <>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2">
                    <p className="ms-micro text-[#B3985B]">Contacto del venue</p>
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
                  <label className="ms-label block mb-1.5">Notas del show</label>
                  <textarea value={form.notas} onChange={(e) => set({ notas: e.target.value })} rows={3} className="ms-textarea" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Dato label="Fecha" valor={form.fecha ? fmtFechaCorta(form.fecha) : null} />
                  <Dato label="Ciudad" valor={form.ciudad} />
                  <Dato
                    label="Tipo de show"
                    valor={form.tipoShow ? TIPO_SHOW_LABEL[form.tipoShow] ?? form.tipoShow : null}
                  />
                  <Dato label="Estado" valor={ESTADO_SHOW_LABEL[form.estado] ?? form.estado} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 min-w-0">
                    <p className="ms-micro">Venue</p>
                    <p className="text-[13px] text-white mt-0.5 break-words">
                      {form.venueNombre || <span className="text-[#555]">Sin venue del catálogo</span>}
                    </p>
                  </div>
                  <Dato
                    label="Aforo esperado"
                    valor={form.aforoEsperado ? Number(form.aforoEsperado).toLocaleString("es-MX") : null}
                  />
                  {aforoDescuadra && (
                    <div className="min-w-0">
                      <p className="ms-micro">Capacidad del venue</p>
                      <p className="text-amber-300 text-[13px] mt-0.5">
                        {venue?.capacidadPersonas?.toLocaleString("es-MX")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Dato
                    label="Contacto del venue"
                    valor={
                      [form.contactoCasaNombre, form.contactoCasaTelefono, form.contactoCasaEmail]
                        .filter(Boolean)
                        .join(" · ") || null
                    }
                  />
                  <Dato
                    label="Promotor"
                    valor={
                      [form.promotorNombre, form.promotorContacto, form.promotorTelefono, form.promotorEmail]
                        .filter(Boolean)
                        .join(" · ") || null
                    }
                  />
                </div>

                <div>
                  <p className="ms-micro">Notas del show</p>
                  {form.notas.trim() ? (
                    <p className="text-[13px] text-white mt-0.5 whitespace-pre-wrap">{form.notas}</p>
                  ) : (
                    <p className="ms-meta mt-0.5">Sin notas.</p>
                  )}
                </div>
              </>
            )}
          </section>

          <MomentosAncla showId={show.id} editable={edicion} />
        </div>

        <div className="space-y-4">
          <section className="ms-card p-4">
            <h3 className="ms-section-label mb-3">Advance del show</h3>
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
            <h3 className="ms-section-label mb-3">Sellos del show</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] text-white">Rider enviado al venue</p>
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
                { label: "Momentos", valor: show.momentos, href: `${base}/dia` },
                { label: "Archivos", valor: show.archivos, href: `/giras/${show.giraId}/documentos` },
              ].map((d) => (
                <Link key={d.label} href={d.href} className="ms-card-inset px-2.5 py-2 hover:border-[#B3985B]/40 transition-colors">
                  <p className="ms-micro">{d.label}</p>
                  <p className="text-sm text-white tabular-nums mt-0.5">{d.valor}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* El equipo de la gira se cobra fecha por fecha, y el proyecto operativo
              de la fecha sale de ahí: no se captura dos veces el mismo evento. */}
          <section className="ms-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="ms-section-label">Equipo y proyecto</h3>
              <button onClick={cotizarEquipo} disabled={cotizando} className="ms-btn-ghost disabled:opacity-50">
                {cotizando ? "Abriendo…" : "+ Cotizar equipo"}
              </button>
            </div>

            {show.cotizaciones.length === 0 ? (
              <p className="ms-meta">
                Sin cotización de equipo para esta fecha. El total de la gira es la suma de las de cada show.
              </p>
            ) : (
              <div className="space-y-2">
                {show.cotizaciones.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cotizaciones/${c.id}`}
                    className="ms-card-inset px-2.5 py-2 flex items-center justify-between gap-2 hover:border-[#B3985B]/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-white truncate">{c.nombreCotizacion || c.numeroCotizacion}</p>
                      <p className="ms-micro mt-0.5">
                        {c.numeroCotizacion} · {c.estado.toLowerCase()}
                      </p>
                    </div>
                    <p className="text-[13px] text-white tabular-nums shrink-0">{fmtMoneda(c.granTotal)}</p>
                  </Link>
                ))}
              </div>
            )}

            <div className="border-t border-[#1a1a1a] mt-3 pt-2.5">
              {show.proyecto ? (
                <Link href={`/proyectos/${show.proyecto.id}`} className="ms-btn-secondary block w-full text-center">
                  Proyecto {show.proyecto.numeroProyecto} →
                </Link>
              ) : (
                <p className="ms-meta">
                  La fecha se queda con su proyecto operativo cuando se aprueba o se adelanta una de sus cotizaciones.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
