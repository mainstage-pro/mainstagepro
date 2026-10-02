"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { coincide } from "@/lib/buscar";
import {
  ESTADOS_GIRA,
  ESTADO_GIRA_COLOR,
  ESTADO_GIRA_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  fmtRango,
} from "@/lib/giras";

export interface GiraFila {
  id: string;
  nombre: string;
  estado: string;
  artista: string;
  cliente: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  shows: number;
  ciudades: string[];
  avance: number;
  semaforo: string;
  showsEnRiesgo: number;
}

interface Props {
  giras: GiraFila[];
  artistas: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
}

const VACIO = {
  nombre: "",
  artistaId: "",
  artistaNombre: "",
  clienteId: "",
  estado: "PLANEACION",
  fechaInicio: "",
  fechaFin: "",
};

export default function ListaGirasClient({ giras, artistas, clientes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [nuevoArtista, setNuevoArtista] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibles = useMemo(
    () =>
      giras.filter(
        (g) =>
          (!estado || g.estado === estado) &&
          (!busqueda.trim() || coincide(busqueda, g.nombre, g.artista, g.cliente, ...g.ciudades)),
      ),
    [giras, busqueda, estado],
  );

  async function crear() {
    if (!form.nombre.trim()) {
      setError("Ponle nombre a la gira.");
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
          nombre: form.nombre.trim(),
          artistaId: nuevoArtista ? null : form.artistaId || null,
          artistaNombre: nuevoArtista ? form.artistaNombre.trim() : null,
          clienteId: form.clienteId || null,
          estado: form.estado,
          fechaInicio: form.fechaInicio || null,
          fechaFin: form.fechaFin || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear la gira.");
        return;
      }
      toast.success("Gira creada");
      router.push(`/giras/${d.gira.id}/shows`);
    } catch {
      setError("No se pudo crear la gira.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ms-page">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="ms-h1">Giras</h1>
          <p className="ms-subtitle mt-1">Las giras que gestionamos, con el avance real de su advance técnico</p>
        </div>
        <button
          onClick={() => {
            setForm(VACIO);
            setNuevoArtista(false);
            setError(null);
            setAbierto(true);
          }}
          className="ms-btn-primary"
        >
          Nueva gira
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Busca por gira, artista, cliente o ciudad…"
          className="ms-input flex-1"
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="ms-filter-select">
          <option value="">Todos los estados</option>
          {ESTADOS_GIRA.map((e) => (
            <option key={e} value={e}>
              {ESTADO_GIRA_LABEL[e]}
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="ms-card px-4 py-10 text-center">
          <p className="ms-meta">
            {giras.length === 0 ? "Todavía no hay giras registradas." : "Ninguna gira coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-card divide-y divide-[#1a1a1a]">
          {visibles.map((g) => (
            <Link
              key={g.id}
              href={`/giras/${g.id}`}
              className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 py-3.5 hover:bg-[#161616] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{g.nombre}</p>
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
                    {g.shows} {g.shows === 1 ? "show" : "shows"}
                    {g.showsEnRiesgo > 0 ? ` · ${g.showsEnRiesgo} sin resolver` : ""}
                  </p>
                </div>

                <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${ESTADO_GIRA_COLOR[g.estado] ?? ""}`}>
                  {ESTADO_GIRA_LABEL[g.estado] ?? g.estado}
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

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Nueva gira" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="ms-label block mb-1.5">Nombre de la gira</label>
            <input
              autoFocus
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="ej. aquihay aquihay — Octubre 2026"
              className="ms-input w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="ms-label">Artista</label>
              <button
                type="button"
                onClick={() => setNuevoArtista((v) => !v)}
                className="ms-micro text-[#B3985B] hover:text-white transition-colors"
              >
                {nuevoArtista ? "Elegir del catálogo" : "Registrar uno nuevo"}
              </button>
            </div>
            {nuevoArtista ? (
              <input
                value={form.artistaNombre}
                onChange={(e) => setForm((p) => ({ ...p, artistaNombre: e.target.value }))}
                placeholder="Nombre del artista o banda"
                className="ms-input w-full"
              />
            ) : (
              <Combobox
                value={form.artistaId}
                onChange={(v) => setForm((p) => ({ ...p, artistaId: v }))}
                options={artistas.map((a) => ({ value: a.id, label: a.nombre }))}
                placeholder="Busca el artista…"
              />
            )}
          </div>

          <div>
            <label className="ms-label block mb-1.5">Cliente que contrata (opcional)</label>
            <Combobox
              value={form.clienteId}
              onChange={(v) => setForm((p) => ({ ...p, clienteId: v }))}
              options={clientes.map((c) => ({ value: c.id, label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre }))}
              placeholder="Sin cliente"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="ms-label block mb-1.5">Primera fecha</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
                className="ms-input w-full"
              />
            </div>
            <div>
              <label className="ms-label block mb-1.5">Última fecha</label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))}
                className="ms-input w-full"
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
                    {ESTADO_GIRA_LABEL[e]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={crear} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Creando…" : "Crear y agregar shows"}
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
