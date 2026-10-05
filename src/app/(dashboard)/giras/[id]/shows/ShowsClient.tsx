"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VenuePicker from "@/components/ui/VenuePicker";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  ESTADOS_SHOW,
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPOS_SHOW,
  TIPO_SHOW_LABEL,
  diasRestantes,
  fechaInput,
  fmtDiasRestantes,
  fmtFechaCorta,
} from "@/lib/giras";

export interface ShowEditable {
  id: string;
  fecha: string;
  ciudad: string | null;
  venueId: string | null;
  venueNombre: string | null;
  venueCapacidad: number | null;
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
  riderEnviado: boolean;
  crew: number;
  bloques: number;
  renglones: number;
  avance: number;
  semaforo: string;
  indispensablesAbiertos: number;
}

/// Lo que es del lugar y no de la fecha: tres noches en el mismo foro comparten
/// promotor y contacto del venue, así que se capturan una vez por venue.
interface VenueBorrador {
  venueId: string | null;
  venueNombre: string;
  ciudad: string;
  promotorNombre: string;
  promotorContacto: string;
  promotorTelefono: string;
  promotorEmail: string;
  contactoCasaNombre: string;
  contactoCasaTelefono: string;
  contactoCasaEmail: string;
}

/// Lo que cambia de una función a otra aunque el foro sea el mismo.
interface ShowBorrador {
  fecha: string;
  tipoShow: string;
  estado: string;
  aforoEsperado: string;
  notas: string;
}

interface Grupo {
  clave: string;
  venueId: string | null;
  venueNombre: string | null;
  ciudad: string | null;
  shows: ShowEditable[];
}

const VENUE_NUEVO: VenueBorrador = {
  venueId: null,
  venueNombre: "",
  ciudad: "",
  promotorNombre: "",
  promotorContacto: "",
  promotorTelefono: "",
  promotorEmail: "",
  contactoCasaNombre: "",
  contactoCasaTelefono: "",
  contactoCasaEmail: "",
};

const SHOW_NUEVO: ShowBorrador = {
  fecha: "",
  tipoShow: "HEADLINE",
  estado: "POR_CONFIRMAR",
  aforoEsperado: "",
  notas: "",
};

/**
 * Los shows se agrupan por el venue del catálogo. Un show sin venue ligado es su
 * propio grupo: dos fechas sueltas en la misma ciudad no son el mismo foro
 * mientras nadie lo diga, y adivinarlo mezclaría promotores distintos.
 */
function agrupar(shows: ShowEditable[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const s of shows) {
    const clave = s.venueId ?? `suelto:${s.id}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.shows.push(s);
    else
      grupos.set(clave, {
        clave,
        venueId: s.venueId,
        venueNombre: s.venueNombre,
        ciudad: s.ciudad,
        shows: [s],
      });
  }
  return [...grupos.values()];
}

function venueDe(s: ShowEditable): VenueBorrador {
  return {
    venueId: s.venueId,
    venueNombre: s.venueNombre ?? "",
    ciudad: s.ciudad ?? "",
    promotorNombre: s.promotorNombre ?? "",
    promotorContacto: s.promotorContacto ?? "",
    promotorTelefono: s.promotorTelefono ?? "",
    promotorEmail: s.promotorEmail ?? "",
    contactoCasaNombre: s.contactoCasaNombre ?? "",
    contactoCasaTelefono: s.contactoCasaTelefono ?? "",
    contactoCasaEmail: s.contactoCasaEmail ?? "",
  };
}

function showDe(s: ShowEditable): ShowBorrador {
  return {
    fecha: fechaInput(s.fecha),
    tipoShow: s.tipoShow ?? "",
    estado: s.estado,
    aforoEsperado: s.aforoEsperado?.toString() ?? "",
    notas: s.notas ?? "",
  };
}

function cuerpoVenue(b: VenueBorrador) {
  return {
    venueId: b.venueId,
    ciudad: b.ciudad,
    promotorNombre: b.promotorNombre,
    promotorContacto: b.promotorContacto,
    promotorTelefono: b.promotorTelefono,
    promotorEmail: b.promotorEmail,
    contactoCasaNombre: b.contactoCasaNombre,
    contactoCasaTelefono: b.contactoCasaTelefono,
    contactoCasaEmail: b.contactoCasaEmail,
  };
}

function cuerpoShow(b: ShowBorrador) {
  return {
    fecha: b.fecha,
    tipoShow: b.tipoShow || null,
    estado: b.estado,
    aforoEsperado: b.aforoEsperado === "" ? null : Number(b.aforoEsperado),
    notas: b.notas,
  };
}

function tituloGrupo(g: Grupo): string {
  const nombre = g.venueNombre ?? "Sin venue";
  return g.ciudad ? `${nombre} · ${g.ciudad}` : nombre;
}

function rangoGrupo(g: Grupo): string {
  const fechas = g.shows.map((s) => s.fecha);
  const primera = fmtFechaCorta(fechas[0]);
  const ultima = fmtFechaCorta(fechas[fechas.length - 1]);
  return primera === ultima ? primera : `${primera} – ${ultima}`;
}

export default function ShowsClient({ giraId, shows }: { giraId: string; shows: ShowEditable[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirm();

  const grupos = useMemo(() => agrupar(shows), [shows]);

  const [venueAbierto, setVenueAbierto] = useState<string | null>(null);
  const [borradorVenue, setBorradorVenue] = useState<VenueBorrador>(VENUE_NUEVO);

  const [showAbierto, setShowAbierto] = useState<string | null>(null);
  const [borradorShow, setBorradorShow] = useState<ShowBorrador>(SHOW_NUEVO);

  const [fechaEn, setFechaEn] = useState<string | null>(null);
  const [fechaNueva, setFechaNueva] = useState("");

  const [venueNuevo, setVenueNuevo] = useState<(VenueBorrador & ShowBorrador) | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [plegados, setPlegados] = useState<Set<string>>(new Set());

  function alternarPliegue(clave: string) {
    setPlegados((prev) => {
      const siguiente = new Set(prev);
      if (!siguiente.delete(clave)) siguiente.add(clave);
      return siguiente;
    });
  }

  function desplegar(clave: string) {
    setPlegados((prev) => {
      if (!prev.has(clave)) return prev;
      const siguiente = new Set(prev);
      siguiente.delete(clave);
      return siguiente;
    });
  }

  function cerrarTodo() {
    setVenueAbierto(null);
    setShowAbierto(null);
    setFechaEn(null);
    setVenueNuevo(null);
  }

  function abrirVenue(g: Grupo) {
    cerrarTodo();
    setVenueAbierto(g.clave);
    setBorradorVenue(venueDe(g.shows[0]));
  }

  function abrirShow(s: ShowEditable) {
    cerrarTodo();
    setShowAbierto(s.id);
    setBorradorShow(showDe(s));
  }

  function abrirFecha(g: Grupo) {
    cerrarTodo();
    desplegar(g.clave);
    setFechaEn(g.clave);
    setFechaNueva("");
  }

  /// El venue vive repartido en sus shows: cambiar el promotor del Lunario tiene
  /// que alcanzar a las tres noches, o la segunda llamaría a quien ya no es.
  async function guardarVenue(g: Grupo) {
    setGuardando(true);
    try {
      const cuerpo = cuerpoVenue(borradorVenue);
      const respuestas = await Promise.all(
        g.shows.map((s) =>
          fetch(`/api/gira-shows/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpo),
          }),
        ),
      );
      if (respuestas.some((r) => !r.ok)) {
        toast.error("No se pudo guardar el venue.");
        return;
      }
      toast.success(g.shows.length > 1 ? `Venue actualizado en sus ${g.shows.length} shows` : "Venue actualizado");
      setVenueAbierto(null);
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el venue.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarShow(id: string) {
    if (!borradorShow.fecha) {
      toast.error("El show necesita fecha.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/gira-shows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoShow(borradorShow)),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar el show.");
        return;
      }
      toast.success("Show actualizado");
      setShowAbierto(null);
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el show.");
    } finally {
      setGuardando(false);
    }
  }

  async function crear(cuerpo: Record<string, unknown>, exito: string) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/shows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el show.");
        return;
      }
      toast.success(exito);
      cerrarTodo();
      router.refresh();
    } catch {
      toast.error("No se pudo agregar el show.");
    } finally {
      setGuardando(false);
    }
  }

  /// Otra función en un venue que ya existe: el foro, el promotor y el contacto
  /// del venue se heredan del show anterior; lo único que se pregunta es el día.
  function agregarFecha(g: Grupo) {
    if (!fechaNueva) {
      toast.error("El show necesita fecha.");
      return;
    }
    const ultimo = g.shows[g.shows.length - 1];
    crear(
      {
        ...cuerpoVenue(venueDe(ultimo)),
        fecha: fechaNueva,
        tipoShow: ultimo.tipoShow,
        aforoEsperado: ultimo.aforoEsperado,
        estado: "POR_CONFIRMAR",
      },
      "Show agregado al venue",
    );
  }

  function agregarVenue() {
    if (!venueNuevo?.fecha) {
      toast.error("El show necesita fecha.");
      return;
    }
    crear({ ...cuerpoVenue(venueNuevo), ...cuerpoShow(venueNuevo) }, "Venue agregado");
  }

  async function quitar(s: ShowEditable, g: Grupo) {
    const arrastra = s.renglones > 0 || s.crew > 0 || s.bloques > 0;
    const ok = await confirmar({
      title: "Quitar el show",
      message: arrastra
        ? `Se borran también sus ${s.renglones} renglones de advance, ${s.crew} de crew y ${s.bloques} bloques del día. No se puede deshacer.`
        : g.shows.length === 1
          ? "Es el único show de este venue, así que el venue sale del registro. No se puede deshacer."
          : "El show se borra del registro. No se puede deshacer.",
      confirmText: "Quitar show",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-shows/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el show.");
      return;
    }
    toast.success("Show eliminado");
    setShowAbierto(null);
    router.refresh();
  }

  function camposVenue(b: VenueBorrador, set: (patch: Partial<VenueBorrador>) => void) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
          <VenuePicker
            label="Venue del catálogo"
            value={b.venueNombre}
            venueId={b.venueId}
            onChange={(nombre, venueId, venue) =>
              set({
                venueNombre: nombre,
                venueId,
                // La ciudad sigue siendo editable; solo se siembra si estaba vacía.
                ...(venue?.ciudad && !b.ciudad ? { ciudad: venue.ciudad } : {}),
              })
            }
          />
          <div>
            <label className="ms-label block mb-1.5">Ciudad</label>
            <input
              value={b.ciudad}
              onChange={(e) => set({ ciudad: e.target.value })}
              placeholder="ej. Monterrey"
              className="ms-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="ms-micro text-[#B3985B]">Promotor</p>
            <input
              value={b.promotorNombre}
              onChange={(e) => set({ promotorNombre: e.target.value })}
              placeholder="Empresa o promotor"
              className="ms-input"
            />
            <input
              value={b.promotorContacto}
              onChange={(e) => set({ promotorContacto: e.target.value })}
              placeholder="Persona de contacto"
              className="ms-input"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={b.promotorTelefono}
                onChange={(e) => set({ promotorTelefono: e.target.value })}
                placeholder="Teléfono"
                className="ms-input"
              />
              <input
                value={b.promotorEmail}
                onChange={(e) => set({ promotorEmail: e.target.value })}
                placeholder="Correo"
                className="ms-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="ms-micro text-[#B3985B]">Contacto del venue</p>
            <input
              value={b.contactoCasaNombre}
              onChange={(e) => set({ contactoCasaNombre: e.target.value })}
              placeholder="Nombre"
              className="ms-input"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={b.contactoCasaTelefono}
                onChange={(e) => set({ contactoCasaTelefono: e.target.value })}
                placeholder="Teléfono"
                className="ms-input"
              />
              <input
                value={b.contactoCasaEmail}
                onChange={(e) => set({ contactoCasaEmail: e.target.value })}
                placeholder="Correo"
                className="ms-input"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function camposShow(b: ShowBorrador, set: (patch: Partial<ShowBorrador>) => void) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="ms-label block mb-1.5">Fecha</label>
            <input type="date" value={b.fecha} onChange={(e) => set({ fecha: e.target.value })} className="ms-input" />
          </div>
          <div>
            <label className="ms-label block mb-1.5">Tipo de show</label>
            <select value={b.tipoShow} onChange={(e) => set({ tipoShow: e.target.value })} className="ms-input">
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
            <select value={b.estado} onChange={(e) => set({ estado: e.target.value })} className="ms-input">
              {ESTADOS_SHOW.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_SHOW_LABEL[e]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ms-label block mb-1.5">Aforo esperado</label>
            <input
              type="number"
              min={0}
              value={b.aforoEsperado}
              onChange={(e) => set({ aforoEsperado: e.target.value })}
              placeholder="Personas"
              className="ms-input"
            />
          </div>
        </div>

        <div>
          <label className="ms-label block mb-1.5">Notas del show</label>
          <textarea value={b.notas} onChange={(e) => set({ notas: e.target.value })} rows={2} className="ms-textarea" />
        </div>
      </div>
    );
  }

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ms-h2">Shows por venue</h2>
          <p className="ms-subtitle mt-0.5">
            La unidad es el show; el venue solo los agrupa: tres noches en el Lunario son un venue y tres shows. El
            promotor y el contacto del venue se capturan una vez por venue; la fecha, el estado y el advance son de
            cada show.
          </p>
        </div>
        <button
          onClick={() => {
            cerrarTodo();
            setVenueNuevo({ ...VENUE_NUEVO, ...SHOW_NUEVO });
          }}
          className="ms-btn-primary"
        >
          Agregar venue
        </button>
      </div>

      {venueNuevo && (
        <section className="ms-card border-[#B3985B]/30 p-4 space-y-3">
          <h3 className="ms-section-label">Venue nuevo</h3>
          {camposVenue(venueNuevo, (patch) => setVenueNuevo((v) => (v ? { ...v, ...patch } : v)))}
          <div className="border-t border-[#1a1a1a] pt-3">
            <p className="ms-micro text-[#B3985B] mb-2">Primer show</p>
            {camposShow(venueNuevo, (patch) => setVenueNuevo((v) => (v ? { ...v, ...patch } : v)))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={agregarVenue} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Agregando…" : "Agregar venue"}
            </button>
            <button onClick={() => setVenueNuevo(null)} className="ms-btn-ghost">
              Cancelar
            </button>
          </div>
        </section>
      )}

      {grupos.length === 0 && !venueNuevo ? (
        <div className="ms-card px-4 py-10 text-center">
          <p className="ms-meta">Todavía no hay venues. Agrega el primero para empezar el advance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map((g, i) => {
            const editandoVenue = venueAbierto === g.clave;
            const plegado = plegados.has(g.clave);
            return (
              <section
                key={g.clave}
                className={`ms-card overflow-hidden ${editandoVenue ? "border-[#B3985B]/30" : ""}`}
              >
                <div
                  className={`relative flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 bg-[#161616] px-4 py-3 ${
                    plegado && !editandoVenue ? "" : "border-b border-[#232323]"
                  }`}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B3985B]" />

                  <button
                    onClick={() => alternarPliegue(g.clave)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`w-3.5 h-3.5 shrink-0 text-[#B3985B] transition-transform ${plegado ? "" : "rotate-90"}`}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span className="text-[10px] font-semibold text-[#B3985B]/50 tabular-nums shrink-0 w-4">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white tracking-tight truncate group-hover:text-[#B3985B] transition-colors">
                        {tituloGrupo(g)}
                      </span>
                      <span className="block ms-meta truncate mt-0.5">
                        <span className="text-[#B3985B]/70 font-medium">
                          {g.shows.length === 1 ? "1 show" : `${g.shows.length} shows`}
                        </span>
                        {` · ${rangoGrupo(g)}`}
                        {g.shows[0].promotorNombre ? ` · ${g.shows[0].promotorNombre}` : ""}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-3 flex-wrap shrink-0">
                    {/* Sin venue del catálogo no hay a qué agrupar: cada fecha suelta
                        seguiría siendo su propia tarjeta y nadie entendería por qué. */}
                    {g.venueId && (
                      <button
                        onClick={() => (fechaEn === g.clave ? setFechaEn(null) : abrirFecha(g))}
                        className="ms-micro font-medium text-[#B3985B] hover:text-white transition-colors"
                      >
                        + Agregar show
                      </button>
                    )}
                    <button
                      onClick={() => (editandoVenue ? setVenueAbierto(null) : abrirVenue(g))}
                      className="ms-micro text-[#6b7280] hover:text-white transition-colors"
                    >
                      {editandoVenue ? "Cerrar" : "Editar venue"}
                    </button>
                  </div>
                </div>

                {editandoVenue && (
                  <div className="px-4 pb-4 pt-4 border-b border-[#1a1a1a]">
                    {camposVenue(borradorVenue, (patch) => setBorradorVenue((b) => ({ ...b, ...patch })))}
                    <div className="flex flex-wrap items-center gap-2 mt-3.5">
                      <button
                        onClick={() => guardarVenue(g)}
                        disabled={guardando}
                        className="ms-btn-primary disabled:opacity-50"
                      >
                        {guardando ? "Guardando…" : "Guardar venue"}
                      </button>
                      <button onClick={() => setVenueAbierto(null)} className="ms-btn-ghost">
                        Cancelar
                      </button>
                      {g.shows.length > 1 && (
                        <p className="ms-micro text-[#6b7280]">Se aplica a los {g.shows.length} shows del venue.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className={plegado ? "hidden" : ""}>
                  {g.shows.map((s) => {
                    const abierto = showAbierto === s.id;
                    const dias = diasRestantes(s.fecha);
                    return (
                      <div
                        key={s.id}
                        className={`border-b border-[#171717] last:border-b-0 ${abierto ? "bg-[#0d0d0d]" : "hover:bg-[#141414] transition-colors"}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 ml-[18px] border-l border-[#B3985B]/20 pl-5 pr-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white tabular-nums truncate">
                              {fmtFechaCorta(s.fecha)}
                            </p>
                            <p className="ms-meta truncate mt-0.5">
                              {fmtDiasRestantes(dias)}
                              {s.tipoShow ? ` · ${TIPO_SHOW_LABEL[s.tipoShow] ?? s.tipoShow}` : ""}
                              {s.aforoEsperado ? ` · ${s.aforoEsperado.toLocaleString("es-MX")} pax` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_SHOW_COLOR[s.estado] ?? ""}`}
                            >
                              {ESTADO_SHOW_LABEL[s.estado] ?? s.estado}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[s.semaforo] ?? ""}`}
                            >
                              {s.renglones ? `Advance ${s.avance}%` : SEMAFORO_LABEL[s.semaforo]}
                            </span>
                            <Link
                              href={`/giras/${giraId}/show/${s.id}`}
                              className="ms-micro text-[#B3985B] hover:text-white transition-colors"
                            >
                              Abrir show →
                            </Link>
                            <button
                              onClick={() => (abierto ? setShowAbierto(null) : abrirShow(s))}
                              className="ms-micro text-[#6b7280] hover:text-white transition-colors"
                            >
                              {abierto ? "Cerrar" : "Editar"}
                            </button>
                          </div>
                        </div>

                        {abierto && (
                          <div className="ml-[18px] border-l border-[#B3985B]/20 pl-5 pr-4 pb-4 pt-1">
                            {camposShow(borradorShow, (patch) => setBorradorShow((b) => ({ ...b, ...patch })))}
                            <div className="flex flex-wrap items-center gap-2 mt-3.5">
                              <button
                                onClick={() => guardarShow(s.id)}
                                disabled={guardando}
                                className="ms-btn-primary disabled:opacity-50"
                              >
                                {guardando ? "Guardando…" : "Guardar show"}
                              </button>
                              <button onClick={() => setShowAbierto(null)} className="ms-btn-ghost">
                                Cancelar
                              </button>
                              <button
                                onClick={() => quitar(s, g)}
                                className="ms-btn-ghost text-red-400/80 hover:text-red-300 ml-auto"
                              >
                                Quitar show
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {fechaEn === g.clave && (
                  <div className="flex flex-wrap items-end gap-2 ml-[18px] border-l border-l-[#B3985B]/20 border-t border-t-[#1a1a1a] pl-5 pr-4 py-3">
                    <div>
                      <label className="ms-label block mb-1.5">Otra fecha en {g.venueNombre ?? "este venue"}</label>
                      <input
                        type="date"
                        value={fechaNueva}
                        onChange={(e) => setFechaNueva(e.target.value)}
                        className="ms-input"
                      />
                    </div>
                    <button
                      onClick={() => agregarFecha(g)}
                      disabled={guardando}
                      className="ms-btn-primary disabled:opacity-50"
                    >
                      {guardando ? "Agregando…" : "Agregar show"}
                    </button>
                    <button onClick={() => setFechaEn(null)} className="ms-btn-ghost">
                      Cancelar
                    </button>
                    <p className="ms-micro text-[#6b7280] w-full">
                      Hereda el venue, el promotor y el contacto del venue. El advance de la fecha nueva se arma aparte.
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
