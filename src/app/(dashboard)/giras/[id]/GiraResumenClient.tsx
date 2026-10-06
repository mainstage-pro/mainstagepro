"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import { Combobox } from "@/components/Combobox";
import EstadoGuardado from "@/components/EstadoGuardado";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { useAutoguardado } from "@/hooks/useAutoguardado";
import {
  ESTADOS_GIRA,
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  ROL_PERSONA_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPOS_REGISTRO,
  TIPO_REGISTRO_LABEL,
  TIPO_SHOW_LABEL,
  esGira,
  estadoRegistroLabel,
  fechaInput,
  fmtFechaCorta,
  fmtMoneda,
} from "@/lib/giras";

export interface ShowResumen {
  id: string;
  fecha: string;
  ciudad: string | null;
  venue: string | null;
  estado: string;
  tipoShow: string | null;
  riderEnviado: boolean;
  crew: number;
  avance: number;
  semaforo: string;
  indispensablesAbiertos: number;
  renglones: number;
  /// Equipo cotizado de esta fecha. El total de la gira es la suma de estos.
  equipoTotal: number;
  equipoCotizaciones: number;
  equipoCerrado: boolean;
}

export interface GiraDetalle {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  artistaId: string;
  artistaNombre: string;
  clienteId: string | null;
  riderId: string | null;
  contactoPrincipalId: string | null;
  rolMainstage: string | null;
  moneda: string;
  notas: string | null;
  rider: {
    id: string;
    nombre: string;
    version: number;
    esActivo: boolean;
    formacion: string | null;
    canalesMinimos: number | null;
    mixesMonitor: number | null;
    tiempoSoundcheckMin: number | null;
    lineas: number;
    canales: number;
  } | null;
}

/// El rider contra el que se trabaja la gira, ya resuelto por `riderDeGira`: el
/// enganchado al registro o, si no hay, el vigente del artista.
export interface RiderDeLaGira {
  id: string;
  nombre: string;
  version: number;
  esActivo: boolean;
  /// No está enganchado a la gira: se heredó del artista y puede cambiar sin que
  /// nadie toque este registro.
  heredado: boolean;
}

/// Un venue de la gira y el rider de su casa. No lo generamos nosotros: es un
/// archivo que alguien subió a la ficha del catálogo o al archivero.
export interface VenueRider {
  id: string;
  nombre: string;
  ciudad: string | null;
  /// Cuántas fechas de la gira caen en este lugar.
  shows: number;
  riderCasaUrl: string | null;
  /// Riders de casa que llegaron por fuera y viven en el archivero de la gira.
  archivos: { id: string; nombre: string; url: string }[];
  /// La ficha técnica del catálogo trae datos aunque no haya documento.
  conFichaTecnica: boolean;
}

interface Persona {
  id: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  email: string | null;
}

interface Props {
  gira: GiraDetalle;
  /// El rider que de verdad se imprime (puede ser heredado del artista).
  riderDoc: RiderDeLaGira | null;
  venues: VenueRider[];
  shows: ShowResumen[];
  artistas: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  riders: { id: string; nombre: string; version: number; esActivo: boolean }[];
  personas: Persona[];
  servicios: { clave: string; nombre: string; categoria: string | null }[];
}

interface Form {
  nombre: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  artistaId: string;
  clienteId: string;
  riderId: string;
  contactoPrincipalId: string;
  rolMainstage: string[];
  notas: string;
}

function parseRoles(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="ms-micro">{label}</p>
      <p className="text-[13px] text-white mt-0.5 break-words">{valor || <span className="text-[#555]">—</span>}</p>
    </div>
  );
}

export default function GiraResumenClient({
  gira,
  riderDoc,
  venues,
  shows,
  artistas,
  clientes,
  riders,
  personas,
  servicios,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirm();

  const [form, setForm] = useState<Form>({
    nombre: gira.nombre,
    tipo: gira.tipo,
    estado: gira.estado,
    fechaInicio: fechaInput(gira.fechaInicio),
    fechaFin: fechaInput(gira.fechaFin),
    artistaId: gira.artistaId,
    clienteId: gira.clienteId ?? "",
    riderId: gira.riderId ?? "",
    contactoPrincipalId: gira.contactoPrincipalId ?? "",
    rolMainstage: parseRoles(gira.rolMainstage),
    notas: gira.notas ?? "",
  });
  const [edicion, setEdicion] = useState(false);

  const tour = esGira(form.tipo);

  const cuerpo = useCallback(
    (f: Form) => ({
      nombre: f.nombre.trim(),
      tipo: f.tipo,
      estado: f.estado,
      fechaInicio: f.fechaInicio || null,
      fechaFin: f.fechaFin || null,
      artistaId: f.artistaId,
      clienteId: f.clienteId || null,
      riderId: f.riderId || null,
      contactoPrincipalId: f.contactoPrincipalId || null,
      rolMainstage: f.rolMainstage,
      notas: f.notas,
    }),
    [],
  );

  const auto = useAutoguardado<Form>({
    url: `/api/giras/${gira.id}`,
    valor: form,
    cuerpo,
    activo: edicion,
    validar: (f) => (f.nombre.trim() ? null : tour ? "La gira necesita nombre." : "El show necesita nombre."),
    // Refrescar en cada guardado haría re-render del servidor con cada tecla: la
    // lista y el encabezado se ponen al día cuando se cierra la edición.
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

  // Las fechas de la gira son editables, pero si no cuadran con los shows hay
  // que decirlo: es el error que descuadra viajes y hoteles.
  const derivadas = useMemo(() => {
    if (shows.length === 0) return null;
    return { inicio: shows[0].fecha.slice(0, 10), fin: shows[shows.length - 1].fecha.slice(0, 10) };
  }, [shows]);

  const descuadre =
    derivadas && (form.fechaInicio !== derivadas.inicio || form.fechaFin !== derivadas.fin)
      ? `Los shows van del ${fmtFechaCorta(derivadas.inicio)} al ${fmtFechaCorta(derivadas.fin)}.`
      : null;

  const contacto = personas.find((p) => p.id === form.contactoPrincipalId) ?? null;
  const artista = artistas.find((a) => a.id === form.artistaId) ?? null;
  const cliente = clientes.find((c) => c.id === form.clienteId) ?? null;
  const riderElegido = riders.find((r) => r.id === form.riderId) ?? null;
  // El PDF lo arma el servidor con el rider que ya está guardado: si acabas de
  // elegir otro en la ficha, el botón bajaría el anterior.
  const riderCambiado = (form.riderId || null) !== (gira.riderId ?? null);
  const serviciosElegidos = servicios.filter((s) => form.rolMainstage.includes(s.clave));

  // El equipo de una gira se cobra fecha por fecha; el total global es la suma, y las
  // fechas sin cotizar son justo lo que falta por cerrar.
  const equipo = useMemo(
    () => ({
      total: shows.reduce((s, p) => s + p.equipoTotal, 0),
      sinCotizar: shows.filter((p) => p.equipoCotizaciones === 0).length,
    }),
    [shows],
  );

  async function archivar() {
    const ok = await confirmar({
      title: tour ? "Archivar la gira" : "Archivar el show",
      message: "Deja de aparecer en la lista. Su advance, su crew y sus documentos se conservan.",
      confirmText: "Archivar",
    });
    if (!ok) return;
    const res = await fetch(`/api/giras/${gira.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo archivar.");
      return;
    }
    toast.success(tour ? "Gira archivada" : "Show archivado");
    router.push("/giras/lista");
  }

  function toggleRol(clave: string) {
    setForm((p) => ({
      ...p,
      rolMainstage: p.rolMainstage.includes(clave)
        ? p.rolMainstage.filter((c) => c !== clave)
        : [...p.rolMainstage, clave],
    }));
  }

  return (
    <div className="ms-page space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="ms-card p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <h2 className="ms-section-label">{tour ? "Ficha de la gira" : "Ficha del show"}</h2>
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
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
              {auto.error}
            </p>
          )}

          {edicion ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-3">
                <div>
                  <label className="ms-label block mb-1.5">Nombre</label>
                  <input value={form.nombre} onChange={(e) => set({ nombre: e.target.value })} className="ms-input w-full" />
                </div>
                <div>
                  <label className="ms-label block mb-1.5">Es</label>
                  <select value={form.tipo} onChange={(e) => set({ tipo: e.target.value })} className="ms-input w-full">
                    {TIPOS_REGISTRO.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_REGISTRO_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ms-label block mb-1.5">Estado</label>
                  <select value={form.estado} onChange={(e) => set({ estado: e.target.value })} className="ms-input w-full">
                    {ESTADOS_GIRA.map((e) => (
                      <option key={e} value={e}>
                        {estadoRegistroLabel(e, form.tipo)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${tour ? "" : "hidden"}`}>
                <div>
                  <label className="ms-label block mb-1.5">Primera fecha</label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => set({ fechaInicio: e.target.value })}
                    className="ms-input w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1.5">Última fecha</label>
                  <input
                    type="date"
                    value={form.fechaFin}
                    onChange={(e) => set({ fechaFin: e.target.value })}
                    className="ms-input w-full"
                  />
                </div>
              </div>

              {tour && descuadre && derivadas && (
                <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  <p className="text-amber-300 text-xs flex-1 min-w-0">{descuadre}</p>
                  <button
                    onClick={() => set({ fechaInicio: derivadas.inicio, fechaFin: derivadas.fin })}
                    className="ms-micro text-amber-300 hover:text-white transition-colors shrink-0"
                  >
                    Usar las fechas de los shows
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ms-label block mb-1.5">Artista</label>
                  <Combobox
                    value={form.artistaId}
                    onChange={(v) => set({ artistaId: v })}
                    options={artistas.map((a) => ({ value: a.id, label: a.nombre }))}
                    placeholder="Elige el artista…"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1.5">Cliente que contrata</label>
                  <Combobox
                    value={form.clienteId}
                    onChange={(v) => set({ clienteId: v })}
                    options={clientes.map((c) => ({
                      value: c.id,
                      label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
                    }))}
                    placeholder="Sin cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ms-label block mb-1.5">Rider maestro</label>
                  <select value={form.riderId} onChange={(e) => set({ riderId: e.target.value })} className="ms-input w-full">
                    <option value="">Sin rider ligado</option>
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        v{r.version} · {r.nombre}
                        {r.esActivo ? " (vigente)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ms-label block mb-1.5">Contacto principal del artista</label>
                  <select
                    value={form.contactoPrincipalId}
                    onChange={(e) => set({ contactoPrincipalId: e.target.value })}
                    className="ms-input w-full"
                  >
                    <option value="">Sin contacto</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {ROL_PERSONA_LABEL[p.rol] ?? p.rol}
                      </option>
                    ))}
                  </select>
                  {contacto && (
                    <p className="ms-meta mt-1.5">
                      {[contacto.telefono, contacto.email].filter(Boolean).join(" · ") ||
                        "Sin teléfono ni correo capturado"}
                    </p>
                  )}
                  {personas.length === 0 && (
                    <p className="ms-meta mt-1.5">
                      El artista no tiene personas registradas.{" "}
                      <Link href={`/giras/artista/${gira.artistaId}`} className="ms-link-gold">
                        Capturarlas
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="ms-label block mb-1.5">
                  {tour ? "Lo que asume Mainstage en esta gira" : "Lo que asume Mainstage en este show"}
                </label>
                {servicios.length === 0 ? (
                  <p className="ms-meta">
                    Todavía no hay catálogo de servicios de production management.{" "}
                    <Link href="/giras/servicios" className="ms-link-gold">
                      Armarlo
                    </Link>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {servicios.map((s) => {
                      const activo = form.rolMainstage.includes(s.clave);
                      return (
                        <button
                          key={s.clave}
                          type="button"
                          onClick={() => toggleRol(s.clave)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                            activo
                              ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/40"
                              : "bg-white/5 text-[#9ca3af] border-white/10 hover:text-white"
                          }`}
                        >
                          {s.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="ms-label block mb-1.5">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => set({ notas: e.target.value })}
                  rows={3}
                  placeholder="Acuerdos, pendientes con el manager, lo que no cabe en otro campo…"
                  className="ms-textarea w-full"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button onClick={archivar} className="ms-btn-ghost text-red-400/80 hover:text-red-300">
                  {tour ? "Archivar gira" : "Archivar show"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 min-w-0">
                  <p className="ms-micro">Nombre</p>
                  <p className="text-sm text-white mt-0.5 break-words">{form.nombre}</p>
                </div>
                <Dato label="Es" valor={TIPO_REGISTRO_LABEL[form.tipo] ?? form.tipo} />
                <Dato label="Estado" valor={estadoRegistroLabel(form.estado, form.tipo)} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tour ? (
                  <>
                    <Dato label="Primera fecha" valor={form.fechaInicio ? fmtFechaCorta(form.fechaInicio) : null} />
                    <Dato label="Última fecha" valor={form.fechaFin ? fmtFechaCorta(form.fechaFin) : null} />
                  </>
                ) : (
                  <Dato label="Fecha" valor={shows[0] ? fmtFechaCorta(shows[0].fecha) : null} />
                )}
                <Dato label="Artista" valor={artista?.nombre ?? gira.artistaNombre} />
                <Dato label="Cliente que contrata" valor={cliente ? cliente.empresa || cliente.nombre : null} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Dato
                  label="Rider maestro"
                  valor={
                    riderElegido
                      ? `v${riderElegido.version} · ${riderElegido.nombre}${riderElegido.esActivo ? " (vigente)" : ""}`
                      : null
                  }
                />
                <Dato
                  label="Contacto principal del artista"
                  valor={
                    contacto ? (
                      <>
                        {contacto.nombre}
                        <span className="text-[#6b7280]">
                          {" · "}
                          {ROL_PERSONA_LABEL[contacto.rol] ?? contacto.rol}
                        </span>
                        {[contacto.telefono, contacto.email].filter(Boolean).length > 0 && (
                          <span className="block ms-meta mt-0.5">
                            {[contacto.telefono, contacto.email].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </>
                    ) : null
                  }
                />
              </div>

              {!tour && shows[0] && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link href={`/giras/${gira.id}/show/${shows[0].id}`} className="ms-micro ms-link-gold">
                    La fecha la manda el show →
                  </Link>
                </div>
              )}

              {tour && descuadre && (
                <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  {descuadre}
                </p>
              )}

              <div>
                <p className="ms-micro mb-1.5">
                  {tour ? "Lo que asume Mainstage en esta gira" : "Lo que asume Mainstage en este show"}
                </p>
                {serviciosElegidos.length === 0 ? (
                  <p className="ms-meta">Sin servicios marcados.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {serviciosElegidos.map((s) => (
                      <span
                        key={s.clave}
                        className="text-[11px] px-2.5 py-1 rounded-full border bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/40"
                      >
                        {s.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="ms-micro">Notas</p>
                {form.notas.trim() ? (
                  <p className="text-[13px] text-white mt-0.5 whitespace-pre-wrap">{form.notas}</p>
                ) : (
                  <p className="ms-meta mt-0.5">Sin notas.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="ms-card p-4 h-fit">
          <h2 className="ms-section-label mb-3.5">Rider maestro vigente</h2>
          {riderDoc ? (
            <div className="space-y-2.5">
              <div>
                <p className="text-sm text-white">{riderDoc.nombre}</p>
                <p className="ms-meta mt-0.5">
                  Versión {riderDoc.version}
                  {riderDoc.esActivo ? " · vigente" : " · versión histórica"}
                  {gira.rider?.formacion ? ` · ${gira.rider.formacion}` : ""}
                </p>
              </div>

              {/* Los conteos salen del rider enganchado; de un rider heredado no
                  se leyeron y es mejor no inventar ceros. */}
              {gira.rider && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Renglones", valor: gira.rider.lineas },
                    { label: "Canales", valor: gira.rider.canales },
                    { label: "Mixes", valor: gira.rider.mixesMonitor ?? "—" },
                  ].map((d) => (
                    <div key={d.label} className="ms-card-inset px-2.5 py-2">
                      <p className="ms-micro">{d.label}</p>
                      <p className="text-sm text-white tabular-nums mt-0.5">{d.valor}</p>
                    </div>
                  ))}
                </div>
              )}

              {gira.rider?.tiempoSoundcheckMin && (
                <p className="ms-meta">Soundcheck de {gira.rider.tiempoSoundcheckMin} min.</p>
              )}

              {riderDoc.heredado && (
                <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  {tour ? "Esta gira" : "Este show"} no trae rider enganchado: éste es el vigente de{" "}
                  {gira.artistaNombre} y los documentos salen de él. Si el artista publica otra versión, cambia solo —
                  engánchalo arriba para amarrarlo.
                </p>
              )}

              {!riderDoc.heredado && !riderDoc.esActivo && (
                <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  {tour ? "Esta gira" : "Este show"} quedó amarrado a una versión que ya no es la vigente del artista.
                </p>
              )}

              {riderCambiado && (
                <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  Acabas de cambiar el rider maestro. Recarga la página para que el PDF salga del nuevo.
                </p>
              )}

              {/* El rider del artista en PDF, con sus anexos: es el papel que se
                  le manda al venue y no debería obligar a pasar por Documentos. */}
              <BotonDocumentoGira
                url={`/api/giras/${gira.id}/documentos/rider`}
                label="Rider PDF"
                className="w-full"
              />

              <Link
                href={`/giras/artista/${gira.artistaId}/rider/${riderDoc.id}`}
                className="ms-btn-secondary block w-full text-center"
              >
                Abrir el rider
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="ms-meta">
                No hay rider maestro ligado ni uno vigente del artista. Sin rider no hay de dónde derivar el advance del
                show ni se puede emitir el rider en PDF.
              </p>
              <Link href={`/giras/artista/${gira.artistaId}`} className="ms-btn-secondary block w-full text-center">
                Armar el rider de {gira.artistaNombre}
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ── Riders de la casa ──────────────────────────────────────────────────
          Lo que pone el foro no lo generamos nosotros: es el archivo que alguien
          subió a la ficha del venue o al archivero de la gira. Si de un venue no
          hay nada, se dice y se liga a dónde capturarlo — no hay enlace muerto. */}
      {venues.length > 0 && (
        <section className="ms-card">
          <div className="px-4 pt-3.5 pb-2.5">
            <h2 className="ms-section-label">Riders de los venues</h2>
            <p className="ms-meta mt-0.5">
              La ficha técnica de la casa, como la manda el foro. Es contra este documento que se coteja el rider del
              artista en el advance.
            </p>
          </div>

          {venues.map((v) => (
            <div
              key={v.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-t border-[#1a1a1a]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-white truncate">
                  {v.nombre}
                  {v.ciudad ? <span className="text-[#6b7280]"> · {v.ciudad}</span> : null}
                </p>
                <p className="ms-meta truncate mt-0.5">
                  {v.shows === 1 ? "1 fecha" : `${v.shows} fechas`}
                  {v.riderCasaUrl
                    ? " · rider de casa en el catálogo"
                    : v.archivos.length > 0
                      ? " · rider de casa en el archivero"
                      : v.conFichaTecnica
                        ? " · ficha técnica capturada, sin documento"
                        : " · sin ficha técnica ni rider de casa"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {v.riderCasaUrl && (
                  <a className="ms-btn-secondary" href={v.riderCasaUrl} target="_blank" rel="noreferrer">
                    Rider de casa
                  </a>
                )}
                {v.archivos.map((a) => (
                  <a key={a.id} className="ms-btn-ghost" href={a.url} target="_blank" rel="noreferrer" title={a.nombre}>
                    {v.riderCasaUrl ? "Del archivero" : "Rider de casa"}
                  </a>
                ))}
                <Link href={`/catalogo/venues?venue=${v.id}`} className="ms-btn-ghost">
                  {v.riderCasaUrl || v.archivos.length > 0 ? "Ficha del venue" : "Capturar la ficha"}
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="ms-card">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
          <div>
            <h2 className="ms-section-label">{tour ? "Shows de la gira" : "El show"}</h2>
            <p className="ms-meta mt-0.5">El porcentaje es de renglones indispensables resueltos</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {equipo.total > 0 && (
              <div className="text-right">
                <p className="text-[13px] text-white font-medium tabular-nums">
                  {fmtMoneda(equipo.total, gira.moneda)}
                </p>
                <p className="ms-micro text-gray-600">
                  equipo {tour ? "de la gira" : "del show"}
                  {equipo.sinCotizar > 0 ? ` · ${equipo.sinCotizar} sin cotizar` : ""}
                </p>
              </div>
            )}
            <Link href={`/giras/${gira.id}/shows`} className="ms-micro text-[#B3985B] hover:text-white transition-colors">
              {tour ? "Editar shows →" : "Editar venue y promotor →"}
            </Link>
          </div>
        </div>

        {shows.length === 0 ? (
          <div className="px-4 py-8 text-center border-t border-[#1a1a1a]">
            <p className="ms-meta mb-3">Todavía no hay shows.</p>
            <Link href={`/giras/${gira.id}/shows`} className="ms-btn-primary">
              Agregar el primer show
            </Link>
          </div>
        ) : (
          shows.map((p) => (
            <Link
              key={p.id}
              href={`/giras/${gira.id}/show/${p.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-t border-[#1a1a1a] hover:bg-[#161616] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-white truncate">
                  {fmtFechaCorta(p.fecha)} · {p.ciudad ?? "Sin ciudad"}
                  {p.venue ? ` · ${p.venue}` : " · Sin venue"}
                </p>
                <p className="ms-meta truncate mt-0.5">
                  {p.tipoShow ? `${TIPO_SHOW_LABEL[p.tipoShow] ?? p.tipoShow} · ` : ""}
                  {p.crew} en crew
                  {p.riderEnviado ? " · rider enviado" : " · rider sin enviar"}
                  {p.indispensablesAbiertos > 0 ? ` · ${p.indispensablesAbiertos} indispensables abiertos` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.equipoCotizaciones > 0 ? (
                  <span
                    className="text-[11px] text-gray-300 tabular-nums"
                    title={`${p.equipoCotizaciones} cotización${p.equipoCotizaciones === 1 ? "" : "es"} de equipo${p.equipoCerrado ? " · venta cerrada" : ""}`}
                  >
                    {fmtMoneda(p.equipoTotal, gira.moneda)}
                    {p.equipoCerrado ? <span className="text-green-500 ml-1">✓</span> : null}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-700">sin cotizar</span>
                )}
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_SHOW_COLOR[p.estado] ?? ""}`}>
                  {ESTADO_SHOW_LABEL[p.estado] ?? p.estado}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[p.semaforo] ?? ""}`}>
                  {p.renglones ? `${p.avance}%` : SEMAFORO_LABEL[p.semaforo]}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
