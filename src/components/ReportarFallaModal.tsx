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
type EquipoOpcion = { id: string; label: string; categoria: string | null };

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Registro de falla de un equipo o unidad. Deliberadamente NO cambia el estado del
// equipo: una falla reportada no lo saca de stock hasta que se decida mandarlo a taller.
export function ReportarFallaModal({
  open,
  equipoId = null,
  equipoLabel = "",
  unidadId = null,
  unidades = [],
  proyectoId: proyectoIdFijo = null,
  onClose,
  onSaved,
}: {
  open: boolean;
  // Sin equipoId el modal pide elegir el equipo: así se puede reportar una falla de
  // cualquier equipo sin tener que llegar antes a su ficha.
  equipoId?: string | null;
  equipoLabel?: string;
  unidadId?: string | null;
  unidades?: UnidadOpcion[];
  proyectoId?: string | null;
  onClose: () => void;
  onSaved?: (falla: FallaCreada) => void;
}) {
  const [equipoSel, setEquipoSel] = useState(equipoId ?? "");
  const [equipos, setEquipos] = useState<EquipoOpcion[]>([]);
  const [busqueda, setBusqueda] = useState("");
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
    setEquipoSel(equipoId ?? "");
    setBusqueda("");
    setError(null);
  }, [open, unidadId, proyectoIdFijo, equipoId]);

  // El catálogo de equipos solo se baja cuando hay que elegir uno.
  useEffect(() => {
    if (!open || equipoId || equipos.length > 0) return;
    fetch("/api/equipos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.equipos)) return;
        setEquipos(
          d.equipos.map((e: { id: string; descripcion: string; marca: string | null; modelo: string | null; categoria: { nombre: string } | null }) => ({
            id: e.id,
            label: [e.descripcion, [e.marca, e.modelo].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
            categoria: e.categoria?.nombre ?? null,
          })),
        );
      })
      .catch(() => {});
  }, [open, equipoId, equipos.length]);

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

  const puedeGuardar = descripcion.trim().length > 0 && !!fecha && !!equipoSel && !saving;

  async function guardar() {
    if (!puedeGuardar) return;
    setSaving(true);
    setError(null);
    const r = await fetch("/api/fallas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId: equipoSel,
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
        {equipoId ? (
          <p className="text-gray-400 text-sm">
            <span className="text-white font-medium">{equipoLabel}</span>
          </p>
        ) : (
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">¿Qué equipo falló? *</label>
            {equipoSel ? (
              <div className="flex items-center justify-between gap-2 bg-[#0d0d0d] border border-[#B3985B]/40 rounded-lg px-3 py-2">
                <span className="text-white text-sm truncate">
                  {equipos.find((e) => e.id === equipoSel)?.label ?? "Equipo seleccionado"}
                </span>
                <button
                  type="button"
                  onClick={() => { setEquipoSel(""); setBusqueda(""); }}
                  className="text-[11px] text-gray-500 hover:text-white transition-colors shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Busca por nombre, marca o modelo..."
                  className={inputCls}
                  autoFocus
                />
                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-[#222] divide-y divide-[#1a1a1a]">
                  {equipos.length === 0 ? (
                    <p className="text-[#555] text-xs px-3 py-3">Cargando equipos…</p>
                  ) : (
                    (() => {
                      const q = busqueda.trim().toLowerCase();
                      const filtrados = (q ? equipos.filter((e) => e.label.toLowerCase().includes(q)) : equipos).slice(0, 40);
                      if (filtrados.length === 0) {
                        return <p className="text-[#555] text-xs px-3 py-3">Ningún equipo coincide con “{busqueda}”</p>;
                      }
                      return filtrados.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setEquipoSel(e.id)}
                          className="w-full text-left px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
                        >
                          <span className="block text-sm text-white truncate">{e.label}</span>
                          {e.categoria && <span className="block text-[10px] text-[#555]">{e.categoria}</span>}
                        </button>
                      ));
                    })()
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
