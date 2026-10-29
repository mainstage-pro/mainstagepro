"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Combobox } from "@/components/Combobox";
import { GiraDescubrimientoForm, type GiraFechaFila } from "@/components/giras/GiraDescubrimientoForm";
import { useToast } from "@/components/Toast";
import { coincide } from "@/lib/buscar";
import {
  ESTADOS_GIRA,
  ESTADO_GIRA_COLOR,
  TIPO_REGISTRO_COLOR,
  TIPO_REGISTRO_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  esGira,
  estadoRegistroLabel,
  fmtRango,
} from "@/lib/giras";

export interface GiraFila {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  artista: string;
  cliente: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  shows: number;
  showId: string | null;
  venue: string | null;
  ciudades: string[];
  avance: number;
  semaforo: string;
  showsEnRiesgo: number;
}

interface Props {
  giras: GiraFila[];
  artistas: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  venues: { id: string; nombre: string; ciudad: string | null }[];
}

const VACIO = {
  tipo: "SHOW",
  nombre: "",
  artistaId: "",
  artistaNombre: "",
  clienteId: "",
  estado: "PLANEACION",
  fecha: "",
  ciudad: "",
  venueId: "",
  notas: "",
};

export default function ListaGirasClient({ giras, artistas, clientes, venues }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [fechas, setFechas] = useState<GiraFechaFila[]>([]);
  const [nuevoArtista, setNuevoArtista] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tour = esGira(form.tipo);

  const visibles = useMemo(
    () =>
      giras.filter(
        (g) =>
          (!estado || g.estado === estado) &&
          (!tipo || g.tipo === tipo) &&
          (!busqueda.trim() || coincide(busqueda, g.nombre, g.artista, g.cliente, g.venue, ...g.ciudades)),
      ),
    [giras, busqueda, estado, tipo],
  );

  function abrir(tipoNuevo: string) {
    setForm({ ...VACIO, tipo: tipoNuevo });
    setFechas([]);
    setNuevoArtista(false);
    setError(null);
    setAbierto(true);
  }

  async function crear() {
    if (tour && !form.nombre.trim()) {
      setError("Ponle nombre a la gira.");
      return;
    }
    if (!tour && !form.fecha) {
      setError("Un show necesita su fecha.");
      return;
    }
    if (!form.artistaId && !form.artistaNombre.trim()) {
      setError("Elige el artista o regístralo aquí mismo.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/giras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          nombre: form.nombre.trim(),
          artistaId: nuevoArtista ? null : form.artistaId || null,
          artistaNombre: nuevoArtista ? form.artistaNombre.trim() : null,
          clienteId: form.clienteId || null,
          estado: form.estado,
          fecha: tour ? null : form.fecha,
          ciudad: tour ? null : form.ciudad.trim() || null,
          venueId: tour ? null : form.venueId || null,
          shows: tour
            ? fechas.filter((f) => f.fecha).map((f) => ({ fecha: f.fecha, ciudad: f.ciudad.trim() || null, venueId: f.venueId || null }))
            : undefined,
          notas: form.notas.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear el registro.");
        return;
      }
      toast.success(tour ? "Gira creada" : "Show creado");
      router.push(tour ? `/giras/${d.gira.id}/shows` : `/giras/${d.gira.id}/show/${d.show.id}`);
    } catch {
      setError("No se pudo crear el registro.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ms-page">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="ms-h1">Shows de artistas</h1>
          <p className="ms-subtitle mt-1">
            Lo que producimos para un artista —un show suelto o una gira completa— con el avance real de su advance
            técnico
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => abrir("SHOW")} className="ms-btn-primary">
            Nuevo show
          </button>
          <button onClick={() => abrir("GIRA")} className="ms-btn-secondary">
            Nueva gira
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Busca por nombre, artista, cliente, venue o ciudad…"
          className="ms-input flex-1"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="ms-filter-select">
          <option value="">Shows y giras</option>
          <option value="SHOW">Solo shows</option>
          <option value="GIRA">Solo giras</option>
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="ms-filter-select">
          <option value="">Todos los estados</option>
          {ESTADOS_GIRA.map((e) => (
            <option key={e} value={e}>
              {estadoRegistroLabel(e, tipo || "GIRA")}
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="ms-card px-4 py-10 text-center">
          <p className="ms-meta">
            {giras.length === 0 ? "Todavía no hay shows ni giras registrados." : "Nada coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-card divide-y divide-[#1a1a1a]">
          {visibles.map((g) => (
            <Link
              key={g.id}
              href={g.showId ? `/giras/${g.id}/show/${g.showId}` : `/giras/${g.id}`}
              className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 py-3.5 hover:bg-[#161616] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${TIPO_REGISTRO_COLOR[g.tipo] ?? ""}`}
                  >
                    {TIPO_REGISTRO_LABEL[g.tipo] ?? g.tipo}
                  </span>
                  <p className="text-sm text-white truncate">{g.nombre}</p>
                </div>
                <p className="ms-meta truncate mt-0.5">
                  {g.artista}
                  {g.cliente ? ` · ${g.cliente}` : ""}
                  {g.ciudades.length ? ` · ${g.ciudades.join(", ")}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3 md:gap-4 shrink-0 flex-wrap">
                <div className="text-left md:text-right">
                  <p className="text-[13px] text-white tabular-nums">{fmtRango(g.fechaInicio, g.fechaFin)}</p>
                  <p className="ms-micro">
                    {esGira(g.tipo) ? `${g.shows} ${g.shows === 1 ? "show" : "shows"}` : (g.venue ?? "Sin venue")}
                    {g.showsEnRiesgo > 0 ? ` · ${g.showsEnRiesgo} sin resolver` : ""}
                  </p>
                </div>

                <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${ESTADO_GIRA_COLOR[g.estado] ?? ""}`}>
                  {estadoRegistroLabel(g.estado, g.tipo)}
                </span>

                <div className="w-28 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] ${SEMAFORO_COLOR[g.semaforo]?.split(" ")[0] ?? ""}`}>
                      {SEMAFORO_LABEL[g.semaforo] ?? g.semaforo}
                    </span>
                    <span className="text-[11px] text-white tabular-nums">{g.avance}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1a1a1a] mt-1 overflow-hidden">
                    <span
                      className={`block h-full ${
                        g.semaforo === "LISTO" ? "bg-emerald-500" : g.semaforo === "EN_PROCESO" ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${g.avance}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title={tour ? "Nueva gira" : "Nuevo show"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <GiraDescubrimientoForm
            tipo={form.tipo === "GIRA" ? "GIRA" : "SHOW"}
            onTipoChange={(t) => setForm((p) => ({ ...p, tipo: t }))}
            artistas={artistas}
            venues={venues}
            artistaId={form.artistaId}
            onArtistaIdChange={(v) => setForm((p) => ({ ...p, artistaId: v }))}
            artistaNombre={form.artistaNombre}
            onArtistaNombreChange={(v) => setForm((p) => ({ ...p, artistaNombre: v }))}
            nuevoArtista={nuevoArtista}
            onNuevoArtistaToggle={() => setNuevoArtista((v) => !v)}
            nombre={form.nombre}
            onNombreChange={(v) => setForm((p) => ({ ...p, nombre: v }))}
            fecha={form.fecha}
            onFechaChange={(v) => setForm((p) => ({ ...p, fecha: v }))}
            ciudad={form.ciudad}
            onCiudadChange={(v) => setForm((p) => ({ ...p, ciudad: v }))}
            venueId={form.venueId}
            onVenueIdChange={(v) => setForm((p) => ({ ...p, venueId: v }))}
            fechas={fechas}
            onFechasChange={setFechas}
            notas={form.notas}
            onNotasChange={(v) => setForm((p) => ({ ...p, notas: v }))}
          />

          <div>
            <label className="ms-label block mb-1.5">Cliente que contrata (opcional)</label>
            <Combobox
              value={form.clienteId}
              onChange={(v) => setForm((p) => ({ ...p, clienteId: v }))}
              options={clientes.map((c) => ({ value: c.id, label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre }))}
              placeholder="Sin cliente"
            />
          </div>

          <div>
            <label className="ms-label block mb-1.5">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
              className="ms-input w-full"
            >
              {ESTADOS_GIRA.map((e) => (
                <option key={e} value={e}>
                  {estadoRegistroLabel(e, form.tipo)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={crear} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Creando…" : tour ? "Crear y agregar shows" : "Crear show"}
            </button>
            <button onClick={() => setAbierto(false)} className="ms-btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
