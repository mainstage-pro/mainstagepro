"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import {
  ORIGENES_FALLA,
  ORIGEN_FALLA_LABEL,
  SEVERIDADES_FALLA,
  SEVERIDAD_FALLA_LABEL,
} from "@/lib/falla-equipo";

export type FallaCreada = { id: string; descripcion: string; severidad: string; estado: string };

type UnidadOpcion = { id: string; codigo: string | null };
type ProyectoOpcion = { id: string; numeroProyecto: string; nombre: string };

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Registro de falla de un equipo o unidad. Deliberadamente NO cambia el estado del
// equipo: una falla reportada no lo saca de stock hasta que se decida mandarlo a taller.
export function ReportarFallaModal({
  open,
  equipoId,
  equipoLabel,
  unidadId = null,
  unidades = [],
  proyectoId: proyectoIdFijo = null,
  onClose,
  onSaved,
}: {
  open: boolean;
  equipoId: string;
  equipoLabel: string;
  unidadId?: string | null;
  unidades?: UnidadOpcion[];
  proyectoId?: string | null;
  onClose: () => void;
  onSaved?: (falla: FallaCreada) => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<string>("MODERADA");
  const [origen, setOrigen] = useState<string>(proyectoIdFijo ? "EVENTO" : "BODEGA");
  const [proyectoId, setProyectoId] = useState(proyectoIdFijo ?? "");
  const [unidadSel, setUnidadSel] = useState(unidadId ?? "");
  const [proyectos, setProyectos] = useState<ProyectoOpcion[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFecha(hoyISO());
    setDescripcion("");
    setSeveridad("MODERADA");
    setOrigen(proyectoIdFijo ? "EVENTO" : "BODEGA");
    setProyectoId(proyectoIdFijo ?? "");
    setUnidadSel(unidadId ?? "");
    setError(null);
  }, [open, unidadId, proyectoIdFijo]);

  // El catálogo de proyectos solo hace falta cuando la falla ocurrió en un evento.
  useEffect(() => {
    if (!open || origen !== "EVENTO" || proyectos.length > 0 || proyectoIdFijo) return;
    const desde = new Date();
    desde.setDate(desde.getDate() - 120);
    fetch(`/api/proyectos?fechaDesde=${desde.toISOString().split("T")[0]}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const lista = Array.isArray(d) ? d : d?.proyectos;
        if (Array.isArray(lista)) {
          setProyectos(lista.map((p: ProyectoOpcion) => ({ id: p.id, numeroProyecto: p.numeroProyecto, nombre: p.nombre })));
        }
      })
      .catch(() => {});
  }, [open, origen, proyectos.length, proyectoIdFijo]);

  const puedeGuardar = descripcion.trim().length > 0 && !!fecha && !saving;

  async function guardar() {
    if (!puedeGuardar) return;
    setSaving(true);
    setError(null);
    const r = await fetch("/api/fallas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId,
        unidadId: unidadSel || null,
        fecha,
        descripcion,
        severidad,
        origen,
        proyectoId: origen === "EVENTO" ? proyectoId || null : null,
      }),
    }).catch(() => null);
    setSaving(false);

    if (!r?.ok) {
      const d = await r?.json().catch(() => ({}));
      setError(d?.error ?? "No se pudo registrar la falla");
      return;
    }
    const d = await r.json();
    onSaved?.(d.falla);
    onClose();
  }

  const inputCls =
    "w-full bg-[#0d0d0d] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]";

  return (
    <Modal open={open} onClose={onClose} title="Reportar falla" maxWidth="max-w-lg">
      <div className="space-y-4">
        <p className="text-gray-400 text-sm">
          <span className="text-white font-medium">{equipoLabel}</span>
        </p>

        {unidades.length > 0 && !unidadId && (
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Unidad</label>
            <select value={unidadSel} onChange={(e) => setUnidadSel(e.target.value)} className={inputCls}>
              <option value="">— Todo el equipo —</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.codigo || "Unidad sin código"}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">¿Cuándo falló? *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">¿Dónde falló?</label>
            <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={inputCls}>
              {ORIGENES_FALLA.map((o) => (
                <option key={o} value={o}>{ORIGEN_FALLA_LABEL[o]}</option>
              ))}
            </select>
          </div>
        </div>

        {origen === "EVENTO" && !proyectoIdFijo && (
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Evento (opcional)</label>
            <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className={inputCls}>
              <option value="">— Sin especificar —</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.numeroProyecto} · {p.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] text-gray-500 mb-1 block">¿Qué falló? *</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="No enciende el canal 3, el fader raspa, se calienta al segundo set..."
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-[11px] text-gray-500 mb-1.5 block">Severidad</label>
          <div className="grid grid-cols-3 gap-2">
            {SEVERIDADES_FALLA.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeveridad(s)}
                className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  severidad === s
                    ? "bg-[#1a1a1a] text-white border-[#B3985B]"
                    : "bg-transparent text-gray-400 border-[#333] hover:border-[#555]"
                }`}
              >
                {SEVERIDAD_FALLA_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-600">
          Reportar la falla no cambia el estado del equipo ni lo saca de stock. Desde el tablero
          decides si entra a taller.
        </p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={!puedeGuardar}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black transition-colors disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Registrar falla"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
