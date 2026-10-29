"use client";

import { Plus, Trash2 } from "lucide-react";
import { Combobox } from "@/components/Combobox";

export interface GiraFechaFila {
  fecha: string;
  ciudad: string;
  venueId: string;
}

export function filaGiraVacia(): GiraFechaFila {
  return { fecha: "", ciudad: "", venueId: "" };
}

interface Artista { id: string; nombre: string }
interface VenueOpcion { id: string; nombre: string; ciudad: string | null }

interface Props {
  tipo: "SHOW" | "GIRA";
  onTipoChange: (t: "SHOW" | "GIRA") => void;
  artistas: Artista[];
  venues: VenueOpcion[];
  artistaId: string;
  onArtistaIdChange: (v: string) => void;
  artistaNombre: string;
  onArtistaNombreChange: (v: string) => void;
  nuevoArtista: boolean;
  onNuevoArtistaToggle: () => void;
  nombre: string;
  onNombreChange: (v: string) => void;
  // Único para SHOW
  fecha: string;
  onFechaChange: (v: string) => void;
  ciudad: string;
  onCiudadChange: (v: string) => void;
  venueId: string;
  onVenueIdChange: (v: string) => void;
  // Repetible para GIRA
  fechas: GiraFechaFila[];
  onFechasChange: (fechas: GiraFechaFila[]) => void;
  notas: string;
  onNotasChange: (v: string) => void;
}

/**
 * Captura de gira/show reusable: el tipo decide si se pide una fecha única
 * (show) o una lista repetible de (fecha, ciudad, venue) que se convierte en
 * un GiraShow por fila al confirmar (ver POST /api/giras, campo `shows`).
 */
export function GiraDescubrimientoForm({
  tipo, onTipoChange, artistas, venues,
  artistaId, onArtistaIdChange, artistaNombre, onArtistaNombreChange,
  nuevoArtista, onNuevoArtistaToggle,
  nombre, onNombreChange,
  fecha, onFechaChange, ciudad, onCiudadChange, venueId, onVenueIdChange,
  fechas, onFechasChange,
  notas, onNotasChange,
}: Props) {
  const venueOptions = venues.map(v => ({ value: v.id, label: v.ciudad ? `${v.nombre} — ${v.ciudad}` : v.nombre }));

  function actualizarFila(i: number, cambios: Partial<GiraFechaFila>) {
    onFechasChange(fechas.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  }

  function quitarFila(i: number) {
    onFechasChange(fechas.filter((_, idx) => idx !== i));
  }

  function agregarFila() {
    onFechasChange([...fechas, filaGiraVacia()]);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="ms-label block mb-1.5">Qué vas a registrar</label>
        <div className="flex gap-2">
          {(["SHOW", "GIRA"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onTipoChange(t)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                tipo === t ? "border-[#B3985B] bg-[#B3985B]/10 text-white" : "border-[#333] text-gray-400 hover:text-white"
              }`}
            >
              {t === "SHOW" ? "Show" : "Gira"}
            </button>
          ))}
        </div>
        <p className="ms-micro mt-1.5">
          {tipo === "GIRA"
            ? "Varias fechas bajo un mismo alcance: agrega cada fecha, ciudad y venue aquí mismo."
            : "Una sola fecha. Si todavía no la tienes, elige Gira."}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="ms-label">Artista</label>
          <button type="button" onClick={onNuevoArtistaToggle} className="ms-micro text-[#B3985B] hover:text-white transition-colors">
            {nuevoArtista ? "Elegir del catálogo" : "Registrar uno nuevo"}
          </button>
        </div>
        {nuevoArtista ? (
          <input
            value={artistaNombre}
            onChange={e => onArtistaNombreChange(e.target.value)}
            placeholder="Nombre del artista o banda"
            className="ms-input w-full"
          />
        ) : (
          <Combobox
            value={artistaId}
            onChange={v => onArtistaIdChange(v)}
            options={artistas.map(a => ({ value: a.id, label: a.nombre }))}
            placeholder="Busca el artista…"
          />
        )}
      </div>

      {tipo === "GIRA" ? (
        <>
          <div>
            <label className="ms-label block mb-1.5">Nombre de la gira *</label>
            <input
              value={nombre}
              onChange={e => onNombreChange(e.target.value)}
              placeholder="ej. aquihay aquihay — Octubre 2026"
              className="ms-input w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="ms-label">Fechas de la gira</label>
              <button type="button" onClick={agregarFila} className="ms-micro text-[#B3985B] hover:text-white transition-colors flex items-center gap-1">
                <Plus strokeWidth={2} className="w-3 h-3" /> Agregar fecha
              </button>
            </div>
            {fechas.length === 0 ? (
              <p className="ms-micro">Sin fechas todavía. Puedes agregarlas después desde la gira.</p>
            ) : (
              <div className="space-y-2">
                {fechas.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                    <input
                      type="date"
                      value={f.fecha}
                      onChange={e => actualizarFila(i, { fecha: e.target.value })}
                      className="ms-input"
                    />
                    <Combobox
                      value={f.venueId}
                      onChange={v => actualizarFila(i, { venueId: v })}
                      options={venueOptions}
                      placeholder="Venue"
                    />
                    <input
                      value={f.ciudad}
                      onChange={e => actualizarFila(i, { ciudad: e.target.value })}
                      placeholder="Ciudad"
                      className="ms-input"
                    />
                    <button
                      type="button"
                      onClick={() => quitarFila(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 strokeWidth={1.75} className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="ms-label block mb-1.5">Nombre del show (opcional)</label>
            <input
              value={nombre}
              onChange={e => onNombreChange(e.target.value)}
              placeholder="Se arma con artista, ciudad y fecha"
              className="ms-input w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ms-label block mb-1.5">Venue (opcional)</label>
              <Combobox value={venueId} onChange={onVenueIdChange} options={venueOptions} placeholder="Por definir" />
            </div>
            <div>
              <label className="ms-label block mb-1.5">Ciudad</label>
              <input
                value={ciudad}
                onChange={e => onCiudadChange(e.target.value)}
                placeholder="Se hereda del venue"
                className="ms-input w-full"
              />
            </div>
          </div>
          <div>
            <label className="ms-label block mb-1.5">Fecha del show *</label>
            <input type="date" value={fecha} onChange={e => onFechaChange(e.target.value)} className="ms-input w-full" />
          </div>
        </>
      )}

      <div>
        <label className="ms-label block mb-1.5">Información relevante (opcional)</label>
        <textarea
          value={notas}
          onChange={e => onNotasChange(e.target.value)}
          placeholder="Lo que hay que saber antes de armar la propuesta: expectativas del cliente, restricciones, antecedentes…"
          rows={3}
          className="ms-input w-full resize-none"
        />
      </div>
    </div>
  );
}
