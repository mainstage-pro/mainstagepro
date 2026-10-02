"use client";

/**
 * Viajes y hotel de la gira. Dos listas que se leen juntas porque se arman el
 * mismo día: el hotel con su rooming (un renglón por persona, nunca un cuarto
 * sin dueño) y los traslados en orden de salida.
 */

import { useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { coincide } from "@/lib/buscar";
import {
  TIPOS_HABITACION,
  TIPOS_VIAJE,
  TIPO_HABITACION_LABEL,
  TIPO_VIAJE_LABEL,
  claveRooming,
  fechaHoraInput,
  fechaInput,
  fmtFechaCorta,
  fmtFechaHora,
  fmtMoneda,
  partirClaveRooming,
} from "@/lib/giras";

export interface RoomingFila {
  id: string;
  hospedajeId: string | null;
  showId: string | null;
  crewId: string | null;
  personaId: string | null;
  nombreLibre: string | null;
  habitacion: string | null;
  tipoHabitacion: string | null;
  comparteCon: string | null;
  notas: string | null;
  orden: number;
  crew: {
    id: string;
    funcion: string;
    origen: string;
    nombreLibre: string | null;
    tecnico: { nombre: string } | null;
    persona: { nombre: string } | null;
  } | null;
  persona: { id: string; nombre: string; rol: string } | null;
}

export interface HospedajeFila {
  id: string;
  ciudad: string | null;
  hotelNombre: string;
  direccion: string | null;
  telefono: string | null;
  linkMaps: string | null;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  confirmacion: string | null;
  costoTotal: number | null;
  notas: string | null;
  roomings: RoomingFila[];
}

export interface ViajeFila {
  id: string;
  showId: string | null;
  crewId: string | null;
  tipo: string;
  concepto: string | null;
  origen: string | null;
  destino: string | null;
  salida: Date | string | null;
  llegada: Date | string | null;
  operador: string | null;
  identificador: string | null;
  reserva: string | null;
  costo: number | null;
  esGrupal: boolean;
  notas: string | null;
  orden: number;
}

export interface OcupanteCandidato {
  /// Clave compuesta «crew:<id>» o «persona:<id>»: el cuarto se le asigna al
  /// renglón del crew cuando existe, y al integrante del artista cuando no.
  valor: string;
  etiqueta: string;
  grupo: string;
}

export interface CrewLigero {
  id: string;
  nombre: string;
  funcion: string;
}

export interface ShowLigero {
  id: string;
  fecha: Date | string;
  ciudad: string | null;
}

interface Props {
  giraId: string;
  hospedajesIniciales: HospedajeFila[];
  viajesIniciales: ViajeFila[];
  ocupantes: OcupanteCandidato[];
  crew: CrewLigero[];
  shows: ShowLigero[];
}

const DEMORA_GUARDADO = 700;

/// Nombre con el que se lee un cuarto en la lista del hotel.
function nombreOcupante(r: RoomingFila): string {
  if (r.crew) {
    return r.crew.tecnico?.nombre ?? r.crew.persona?.nombre ?? r.crew.nombreLibre ?? "Sin nombre";
  }
  return r.persona?.nombre ?? r.nombreLibre ?? "Sin asignar";
}

export default function LogisticaClient({
  giraId,
  hospedajesIniciales,
  viajesIniciales,
  ocupantes,
  crew,
  shows,
}: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const [hospedajes, setHospedajes] = useState<HospedajeFila[]>(hospedajesIniciales);
  const [viajes, setViajes] = useState<ViajeFila[]>(viajesIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());
  const [destino, setDestino] = useState<Record<string, string>>({});

  const pendientes = useRef(new Map<string, { url: string; campos: Record<string, unknown> }>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // ── Guardado por renglón, igual que en el advance ───────────────────────────
  async function descargar(clave: string) {
    const trabajo = pendientes.current.get(clave);
    pendientes.current.delete(clave);
    const t = timers.current.get(clave);
    if (t) clearTimeout(t);
    timers.current.delete(clave);
    if (!trabajo) return;

    const res = await fetch(trabajo.url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trabajo.campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el renglón");
      return;
    }
    setGuardados((prev) => new Set(prev).add(clave));
    setTimeout(
      () =>
        setGuardados((prev) => {
          const s = new Set(prev);
          s.delete(clave);
          return s;
        }),
      1500,
    );
  }

  function programar(clave: string, url: string, campos: Record<string, unknown>, inmediato = false) {
    const previo = pendientes.current.get(clave);
    pendientes.current.set(clave, { url, campos: { ...(previo?.campos ?? {}), ...campos } });
    const t = timers.current.get(clave);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(clave);
      return;
    }
    timers.current.set(clave, setTimeout(() => void descargar(clave), DEMORA_GUARDADO));
  }

  // ── Hoteles ────────────────────────────────────────────────────────────────
  function editarHotel(hospedajeId: string, campos: Partial<HospedajeFila>, inmediato = false) {
    setHospedajes((prev) => prev.map((h) => (h.id === hospedajeId ? { ...h, ...campos } : h)));
    programar(`hotel:${hospedajeId}`, `/api/gira-hospedajes/${hospedajeId}`, campos, inmediato);
  }

  async function agregarHotel() {
    setTrabajando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/hospedajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelNombre: "Hotel por definir" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el hotel");
        return;
      }
      setHospedajes((prev) => [...prev, d.hospedaje]);
    } finally {
      setTrabajando(false);
    }
  }

  async function quitarHotel(h: HospedajeFila) {
    const ok = await confirmar({
      message:
        `¿Quitar ${h.hotelNombre} de la gira?` +
        (h.roomings.length ? ` Se van con él los ${h.roomings.length} cuartos de su rooming.` : ""),
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-hospedajes/${h.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el hotel");
      return;
    }
    setHospedajes((prev) => prev.filter((x) => x.id !== h.id));
  }

  // ── Rooming ────────────────────────────────────────────────────────────────
  function editarCuarto(hospedajeId: string, roomingId: string, campos: Record<string, unknown>, inmediato = false) {
    setHospedajes((prev) =>
      prev.map((h) =>
        h.id === hospedajeId
          ? { ...h, roomings: h.roomings.map((r) => (r.id === roomingId ? ({ ...r, ...campos } as RoomingFila) : r)) }
          : h,
      ),
    );
    programar(`cuarto:${roomingId}`, `/api/gira-roomings/${roomingId}`, campos, inmediato);
  }

  async function agregarCuarto(hospedajeId: string, extra: Record<string, unknown> = {}) {
    const res = await fetch(`/api/giras/${giraId}/roomings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospedajeId, ...extra }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar el cuarto");
      return;
    }
    setHospedajes((prev) =>
      prev.map((h) => (h.id === hospedajeId ? { ...h, roomings: [...h.roomings, d.rooming] } : h)),
    );
  }

  async function quitarCuarto(hospedajeId: string, r: RoomingFila) {
    const ok = await confirmar({
      message: `¿Quitar el cuarto de ${nombreOcupante(r)}?`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-roomings/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el cuarto");
      return;
    }
    setHospedajes((prev) =>
      prev.map((h) => (h.id === hospedajeId ? { ...h, roomings: h.roomings.filter((x) => x.id !== r.id) } : h)),
    );
  }

  /// Asignar desde la lista de pendientes: un renglón, un botón. El hotel se
  /// elige en el propio renglón para no mover a nadie sin decir a dónde.
  async function asignarPendiente(crewId: string) {
    const hospedajeId = destino[crewId];
    if (!hospedajeId) {
      toast.error("Elige el hotel antes de asignar");
      return;
    }
    await agregarCuarto(hospedajeId, { crewId });
    setDestino((prev) => {
      const c = { ...prev };
      delete c[crewId];
      return c;
    });
  }

  // ── Viajes ─────────────────────────────────────────────────────────────────
  function editarViaje(viajeId: string, campos: Partial<ViajeFila>, inmediato = false) {
    setViajes((prev) => prev.map((v) => (v.id === viajeId ? ({ ...v, ...campos } as ViajeFila) : v)));
    programar(`viaje:${viajeId}`, `/api/gira-viajes/${viajeId}`, campos, inmediato);
  }

  async function agregarViaje() {
    setTrabajando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/viajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: filtroTipo || "VUELO" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el traslado");
        return;
      }
      setViajes((prev) => [...prev, d.viaje]);
    } finally {
      setTrabajando(false);
    }
  }

  async function quitarViaje(v: ViajeFila) {
    const ok = await confirmar({
      message: `¿Quitar este traslado (${TIPO_VIAJE_LABEL[v.tipo] ?? v.tipo}${
        v.origen || v.destino ? ` ${v.origen ?? "?"} → ${v.destino ?? "?"}` : ""
      })?`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-viajes/${v.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el traslado");
      return;
    }
    setViajes((prev) => prev.filter((x) => x.id !== v.id));
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const cuartos = useMemo(() => hospedajes.flatMap((h) => h.roomings), [hospedajes]);
  const costoHotel = useMemo(() => hospedajes.reduce((s, h) => s + (h.costoTotal ?? 0), 0), [hospedajes]);
  const costoViajes = useMemo(() => viajes.reduce((s, v) => s + (v.costo ?? 0), 0), [viajes]);

  // Quién del crew no aparece en ningún rooming: es la lista que hay que cerrar
  // antes de salir de viaje.
  const sinCuarto = useMemo(() => {
    const conCuarto = new Set(cuartos.map((r) => r.crewId).filter((x): x is string => !!x));
    return crew.filter((c) => !conCuarto.has(c.id));
  }, [crew, cuartos]);

  const opcionesOcupante: ComboboxOption[] = useMemo(
    () => [{ value: "", label: "— Sin asignar —" }, ...ocupantes.map((o) => ({ value: o.valor, label: o.etiqueta, group: o.grupo }))],
    [ocupantes],
  );

  const opcionesCrew: ComboboxOption[] = useMemo(
    () => [
      { value: "", label: "— Todo el grupo —" },
      ...crew.map((c) => ({ value: c.id, label: `${c.nombre} — ${c.funcion}`, group: "Crew de la gira" })),
    ],
    [crew],
  );

  const hotelesVisibles = useMemo(() => {
    if (!busqueda.trim()) return hospedajes;
    return hospedajes.filter(
      (h) =>
        coincide(h.hotelNombre, busqueda) ||
        coincide(h.ciudad ?? "", busqueda) ||
        coincide(h.confirmacion ?? "", busqueda) ||
        h.roomings.some((r) => coincide(nombreOcupante(r), busqueda) || coincide(r.habitacion ?? "", busqueda)),
    );
  }, [hospedajes, busqueda]);

  const viajesVisibles = useMemo(() => {
    return viajes.filter((v) => {
      if (filtroTipo && v.tipo !== filtroTipo) return false;
      if (!busqueda.trim()) return true;
      return (
        coincide(v.concepto ?? "", busqueda) ||
        coincide(v.origen ?? "", busqueda) ||
        coincide(v.destino ?? "", busqueda) ||
        coincide(v.operador ?? "", busqueda) ||
        coincide(v.identificador ?? "", busqueda) ||
        coincide(v.reserva ?? "", busqueda)
      );
    });
  }, [viajes, filtroTipo, busqueda]);

  const tiposPresentes = TIPOS_VIAJE.filter((t) => viajes.some((v) => v.tipo === t));

  return (
    <div className="space-y-6">
      {/* Tablero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Hoteles</p>
          <p className="text-white text-lg font-semibold">{hospedajes.length}</p>
          <p className="ms-meta">{fmtMoneda(costoHotel)} de hospedaje</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Cuartos asignados</p>
          <p className="text-white text-lg font-semibold">{cuartos.length}</p>
          <p className="ms-meta">{cuartos.filter((r) => !r.habitacion?.trim()).length} sin número de habitación</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Crew sin cuarto</p>
          <p className={`text-lg font-semibold ${sinCuarto.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {sinCuarto.length}
          </p>
          <p className="ms-meta">de {crew.length} personas en la gira</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Traslados</p>
          <p className="text-white text-lg font-semibold">{viajes.length}</p>
          <p className="ms-meta">{fmtMoneda(costoViajes)} de transporte</p>
        </div>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar hotel, ciudad, persona, vuelo o reserva…"
        className="ms-input-search w-full md:max-w-md"
      />

      {/* ── Hoteles y rooming ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="ms-h2">Hotel y rooming</h2>
            <p className="ms-meta">Un renglón por persona: el cuarto siempre tiene dueño.</p>
          </div>
          <button onClick={() => void agregarHotel()} disabled={trabajando} className="ms-btn-primary disabled:opacity-50">
            + Hotel
          </button>
        </div>

        {sinCuarto.length > 0 && hospedajes.length > 0 && (
          <div className="ms-card-deep p-3 space-y-2">
            <p className="ms-section-label">Falta asignarles cuarto</p>
            {sinCuarto.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-white min-w-[200px]">{c.nombre}</span>
                <span className="ms-meta min-w-[140px]">{c.funcion}</span>
                <select
                  value={destino[c.id] ?? ""}
                  onChange={(e) => setDestino((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="ms-input-inline"
                >
                  <option value="">— ¿En qué hotel? —</option>
                  {hospedajes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hotelNombre}
                      {h.ciudad ? ` · ${h.ciudad}` : ""}
                    </option>
                  ))}
                </select>
                <button onClick={() => void asignarPendiente(c.id)} className="ms-btn-secondary">
                  Asignar
                </button>
              </div>
            ))}
          </div>
        )}

        {hotelesVisibles.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-gray-400">
              {hospedajes.length === 0
                ? "Todavía no hay hoteles en la gira. Agrega uno y reparte el rooming desde ahí."
                : "Ningún hotel coincide con la búsqueda."}
            </p>
          </div>
        ) : (
          hotelesVisibles.map((h) => (
            <div key={h.id} className="ms-card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="ms-label block mb-1">Hotel</label>
                  <input
                    value={h.hotelNombre}
                    onChange={(e) => editarHotel(h.id, { hotelNombre: e.target.value })}
                    className="ms-input-inline w-full"
                  />
                  {guardados.has(`hotel:${h.id}`) && <span className="ms-micro text-emerald-400">guardado</span>}
                </div>
                <div>
                  <label className="ms-label block mb-1">Ciudad</label>
                  <input
                    value={h.ciudad ?? ""}
                    onChange={(e) => editarHotel(h.id, { ciudad: e.target.value })}
                    className="ms-input-inline w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1">Check in</label>
                  <input
                    type="date"
                    value={fechaInput(h.checkIn)}
                    onChange={(e) => editarHotel(h.id, { checkIn: e.target.value || null }, true)}
                    className="ms-input-inline w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1">Check out</label>
                  <input
                    type="date"
                    value={fechaInput(h.checkOut)}
                    onChange={(e) => editarHotel(h.id, { checkOut: e.target.value || null }, true)}
                    className="ms-input-inline w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1">Confirmación</label>
                  <input
                    value={h.confirmacion ?? ""}
                    onChange={(e) => editarHotel(h.id, { confirmacion: e.target.value })}
                    placeholder="folio del hotel"
                    className="ms-input-inline w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1">Teléfono</label>
                  <input
                    value={h.telefono ?? ""}
                    onChange={(e) => editarHotel(h.id, { telefono: e.target.value })}
                    className="ms-input-inline w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1">Costo total</label>
                  <input
                    type="number"
                    value={h.costoTotal ?? ""}
                    onChange={(e) => editarHotel(h.id, { costoTotal: e.target.value === "" ? null : Number(e.target.value) })}
                    className="ms-input-inline w-full"
                  />
                </div>
                <div>
                  <label className="ms-label block mb-1">Dirección</label>
                  <input
                    value={h.direccion ?? ""}
                    onChange={(e) => editarHotel(h.id, { direccion: e.target.value })}
                    className="ms-input-inline w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="ms-label block mb-1">Link de mapa</label>
                  <input
                    value={h.linkMaps ?? ""}
                    onChange={(e) => editarHotel(h.id, { linkMaps: e.target.value })}
                    placeholder="https://maps.app.goo.gl/…"
                    className="ms-input-inline w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="ms-label block mb-1">Notas</label>
                  <input
                    value={h.notas ?? ""}
                    onChange={(e) => editarHotel(h.id, { notas: e.target.value })}
                    className="ms-input-inline w-full"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="ms-section-label">
                  Rooming · {h.roomings.length} cuartos
                  {h.checkIn || h.checkOut ? ` · ${fmtFechaCorta(h.checkIn)} → ${fmtFechaCorta(h.checkOut)}` : ""}
                </span>
                <button onClick={() => void agregarCuarto(h.id)} className="ms-btn-ghost">
                  + Cuarto
                </button>
                <button
                  onClick={() => void quitarHotel(h)}
                  className="ms-btn-ghost text-red-400/80 hover:text-red-300 ml-auto"
                >
                  Quitar hotel
                </button>
              </div>

              {h.roomings.length === 0 ? (
                <p className="ms-micro">
                  Sin rooming. Agrega un cuarto y elige a quién se le da: la lista del hotel se arma de a uno.
                </p>
              ) : (
                <div className="ms-table-wrapper overflow-x-auto">
                  <table className="min-w-[1080px] w-full">
                    <thead className="ms-thead">
                      <tr>
                        <th className="ms-th w-[260px]">Ocupante</th>
                        <th className="ms-th w-[140px]">Habitación</th>
                        <th className="ms-th w-[150px]">Tipo</th>
                        <th className="ms-th w-[200px]">Comparte con</th>
                        <th className="ms-th w-[160px]">Noche de</th>
                        <th className="ms-th w-[200px]">Notas</th>
                        <th className="ms-th w-[40px]" />
                      </tr>
                    </thead>
                    <tbody>
                      {h.roomings.map((r) => (
                        <tr key={r.id} className="ms-tr align-top">
                          <td className="ms-td">
                            <Combobox
                              value={claveRooming(r)}
                              onChange={(v) => editarCuarto(h.id, r.id, { asignado: v || null, ...partirClaveRooming(v) }, true)}
                              options={opcionesOcupante}
                              placeholder="¿Quién duerme aquí?"
                              className="ms-input-inline w-full"
                            />
                            {!r.crewId && !r.personaId && (
                              <input
                                value={r.nombreLibre ?? ""}
                                onChange={(e) => editarCuarto(h.id, r.id, { nombreLibre: e.target.value })}
                                placeholder="o escribe el nombre"
                                className="ms-input-inline w-full mt-1"
                              />
                            )}
                            {guardados.has(`cuarto:${r.id}`) && <span className="ms-micro text-emerald-400">guardado</span>}
                            {r.crew && <p className="ms-micro mt-0.5">{r.crew.funcion}</p>}
                          </td>
                          <td className="ms-td">
                            <input
                              value={r.habitacion ?? ""}
                              onChange={(e) => editarCuarto(h.id, r.id, { habitacion: e.target.value })}
                              placeholder="núm."
                              className="ms-input-inline w-full"
                            />
                          </td>
                          <td className="ms-td">
                            <select
                              value={r.tipoHabitacion ?? ""}
                              onChange={(e) => editarCuarto(h.id, r.id, { tipoHabitacion: e.target.value || null }, true)}
                              className="ms-input-inline w-full"
                            >
                              <option value="">— Sin definir —</option>
                              {TIPOS_HABITACION.map((t) => (
                                <option key={t} value={t} className="bg-[#111] text-white">
                                  {TIPO_HABITACION_LABEL[t]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="ms-td">
                            <input
                              value={r.comparteCon ?? ""}
                              onChange={(e) => editarCuarto(h.id, r.id, { comparteCon: e.target.value })}
                              className="ms-input-inline w-full"
                            />
                          </td>
                          <td className="ms-td">
                            <select
                              value={r.showId ?? ""}
                              onChange={(e) => editarCuarto(h.id, r.id, { showId: e.target.value || null }, true)}
                              className="ms-input-inline w-full"
                            >
                              <option value="">Toda la estancia</option>
                              {shows.map((p) => (
                                <option key={p.id} value={p.id} className="bg-[#111] text-white">
                                  {fmtFechaCorta(p.fecha)}
                                  {p.ciudad ? ` · ${p.ciudad}` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="ms-td">
                            <input
                              value={r.notas ?? ""}
                              onChange={(e) => editarCuarto(h.id, r.id, { notas: e.target.value })}
                              className="ms-input-inline w-full"
                            />
                          </td>
                          <td className="ms-td text-right">
                            <button
                              onClick={() => void quitarCuarto(h.id, r)}
                              className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                              title="Quitar el cuarto"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* ── Viajes ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="ms-h2">Viajes y traslados</h2>
            <p className="ms-meta">
              En orden de salida. Un traslado grupal es el de la van que lleva a todos: no se repite por persona.
            </p>
          </div>
          <button onClick={() => void agregarViaje()} disabled={trabajando} className="ms-btn-primary disabled:opacity-50">
            + Traslado
          </button>
        </div>

        {tiposPresentes.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setFiltroTipo("")} className={!filtroTipo ? "ms-filter-select-active" : "ms-filter-select"}>
              Todos ({viajes.length})
            </button>
            {tiposPresentes.map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo((f) => (f === t ? "" : t))}
                className={filtroTipo === t ? "ms-filter-select-active" : "ms-filter-select"}
              >
                {TIPO_VIAJE_LABEL[t]} ({viajes.filter((v) => v.tipo === t).length})
              </button>
            ))}
          </div>
        )}

        {viajesVisibles.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-gray-400">
              {viajes.length === 0
                ? "Todavía no hay traslados. Agrega el primer vuelo o la van del día de montaje."
                : "Ningún traslado coincide con el filtro."}
            </p>
          </div>
        ) : (
          <div className="ms-table-wrapper overflow-x-auto">
            <table className="min-w-[1720px] w-full">
              <thead className="ms-thead">
                <tr>
                  <th className="ms-th w-[140px]">Tipo</th>
                  <th className="ms-th w-[200px]">Concepto</th>
                  <th className="ms-th w-[160px]">Origen</th>
                  <th className="ms-th w-[160px]">Destino</th>
                  <th className="ms-th w-[190px]">Sale</th>
                  <th className="ms-th w-[190px]">Llega</th>
                  <th className="ms-th w-[150px]">Operador</th>
                  <th className="ms-th w-[120px]">Vuelo / unidad</th>
                  <th className="ms-th w-[130px]">Reserva</th>
                  <th className="ms-th w-[110px]">Costo</th>
                  <th className="ms-th w-[70px]">Grupal</th>
                  <th className="ms-th w-[220px]">Quién viaja</th>
                  <th className="ms-th w-[170px]">Show</th>
                  <th className="ms-th w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {viajesVisibles.map((v) => (
                  <tr key={v.id} className="ms-tr align-top">
                    <td className="ms-td">
                      <select
                        value={v.tipo}
                        onChange={(e) => editarViaje(v.id, { tipo: e.target.value }, true)}
                        className="ms-input-inline w-full"
                      >
                        {TIPOS_VIAJE.map((t) => (
                          <option key={t} value={t} className="bg-[#111] text-white">
                            {TIPO_VIAJE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                      {guardados.has(`viaje:${v.id}`) && <span className="ms-micro text-emerald-400">guardado</span>}
                    </td>
                    <td className="ms-td">
                      <input
                        value={v.concepto ?? ""}
                        onChange={(e) => editarViaje(v.id, { concepto: e.target.value })}
                        placeholder="ej. Llegada del crew"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={v.origen ?? ""}
                        onChange={(e) => editarViaje(v.id, { origen: e.target.value })}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={v.destino ?? ""}
                        onChange={(e) => editarViaje(v.id, { destino: e.target.value })}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        type="datetime-local"
                        value={fechaHoraInput(v.salida)}
                        onChange={(e) => editarViaje(v.id, { salida: e.target.value || null }, true)}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        type="datetime-local"
                        value={fechaHoraInput(v.llegada)}
                        onChange={(e) => editarViaje(v.id, { llegada: e.target.value || null }, true)}
                        className="ms-input-inline w-full"
                      />
                      {v.salida && v.llegada && <p className="ms-micro mt-0.5">{fmtFechaHora(v.llegada)}</p>}
                    </td>
                    <td className="ms-td">
                      <input
                        value={v.operador ?? ""}
                        onChange={(e) => editarViaje(v.id, { operador: e.target.value })}
                        placeholder="aerolínea"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={v.identificador ?? ""}
                        onChange={(e) => editarViaje(v.id, { identificador: e.target.value })}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        value={v.reserva ?? ""}
                        onChange={(e) => editarViaje(v.id, { reserva: e.target.value })}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <input
                        type="number"
                        value={v.costo ?? ""}
                        onChange={(e) => editarViaje(v.id, { costo: e.target.value === "" ? null : Number(e.target.value) })}
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td text-center">
                      <input
                        type="checkbox"
                        checked={v.esGrupal}
                        onChange={(e) =>
                          editarViaje(
                            v.id,
                            // Al volverse grupal el renglón deja de ser de una persona:
                            // si se quedara el crewId, el vuelo del grupo parecería de uno.
                            e.target.checked ? { esGrupal: true, crewId: null } : { esGrupal: false },
                            true,
                          )
                        }
                        className="accent-[#B3985B]"
                      />
                    </td>
                    <td className="ms-td">
                      <Combobox
                        value={v.crewId ?? ""}
                        onChange={(nuevo) => editarViaje(v.id, { crewId: nuevo || null, esGrupal: nuevo ? false : v.esGrupal }, true)}
                        options={opcionesCrew}
                        placeholder="Todo el grupo"
                        className="ms-input-inline w-full"
                      />
                    </td>
                    <td className="ms-td">
                      <select
                        value={v.showId ?? ""}
                        onChange={(e) => editarViaje(v.id, { showId: e.target.value || null }, true)}
                        className="ms-input-inline w-full"
                      >
                        <option value="">Sin show</option>
                        {shows.map((p) => (
                          <option key={p.id} value={p.id} className="bg-[#111] text-white">
                            {fmtFechaCorta(p.fecha)}
                            {p.ciudad ? ` · ${p.ciudad}` : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="ms-td text-right">
                      <button
                        onClick={() => void quitarViaje(v)}
                        className="text-red-400/70 hover:text-red-300 transition-colors px-1"
                        title="Quitar el traslado"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="ms-micro">
        Cada celda se guarda sola al dejar de escribir. Quitar un hotel se lleva su rooming; quitar a alguien del crew no
        borra sus cuartos ni sus vuelos.
      </p>
    </div>
  );
}
