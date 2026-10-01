"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, LayoutGrid, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

export type EscenarioItem = {
  id: string;
  nombre: string;
  orden: number;
  anchoM: number | null;
  largoM: number | null;
  alturaM: number | null;
  notas: string | null;
  _count: { equipos: number; personal: number; bloques: number; proveedores: number };
};

type Borrador = { nombre: string; anchoM: string; largoM: string; alturaM: string; notas: string };

const CAMPO =
  "w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]";

function aBorrador(e: EscenarioItem): Borrador {
  return {
    nombre: e.nombre,
    anchoM: e.anchoM != null ? String(e.anchoM) : "",
    largoM: e.largoM != null ? String(e.largoM) : "",
    alturaM: e.alturaM != null ? String(e.alturaM) : "",
    notas: e.notas ?? "",
  };
}

function num(v: string) {
  const n = parseFloat(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

export default function PanelEscenarios({
  proyectoId,
  escenarioMedidas,
  onCambio,
}: {
  proyectoId: string;
  escenarioMedidas?: string | null;
  onCambio?: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [escenarios, setEscenarios] = useState<EscenarioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/proyectos/${proyectoId}/escenarios`);
    if (r.ok) {
      const d = await r.json();
      setEscenarios(d.escenarios ?? []);
    }
    setCargando(false);
  }, [proyectoId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- la carga inicial sí viene de fuera de React
  useEffect(() => { cargar(); }, [cargar]);

  async function crear() {
    setCreando(true);
    const r = await fetch(`/api/proyectos/${proyectoId}/escenarios`, { method: "POST" });
    setCreando(false);
    if (!r.ok) { toast.error("No se pudo crear el escenario"); return; }
    await cargar();
    onCambio?.();
  }

  async function guardar(id: string) {
    if (!borrador) return;
    if (!borrador.nombre.trim()) { toast.error("El escenario necesita nombre"); return; }
    setGuardando(true);
    const r = await fetch(`/api/proyectos/${proyectoId}/escenarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: borrador.nombre.trim(),
        anchoM: num(borrador.anchoM),
        largoM: num(borrador.largoM),
        alturaM: num(borrador.alturaM),
        notas: borrador.notas.trim() || null,
      }),
    });
    setGuardando(false);
    if (!r.ok) { toast.error("No se pudo guardar"); return; }
    setAbierto(null);
    setBorrador(null);
    await cargar();
    onCambio?.();
  }

  async function borrar(e: EscenarioItem) {
    const asignado = e._count.equipos + e._count.personal + e._count.bloques + e._count.proveedores;
    const ok = await confirm({
      title: `¿Borrar "${e.nombre}"?`,
      message: asignado
        ? `Lo asignado a este escenario (${asignado}) no se borra: regresa a la lista general del proyecto.`
        : "El escenario se borra junto con su layout.",
      confirmText: "Borrar",
      danger: true,
    });
    if (!ok) return;
    const r = await fetch(`/api/proyectos/${proyectoId}/escenarios/${e.id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("No se pudo borrar"); return; }
    await cargar();
    onCambio?.();
  }

  if (cargando) {
    return (
      <div className="ms-card p-6 flex items-center gap-2 text-xs text-gray-500">
        <Loader2 size={14} className="animate-spin" /> Cargando escenarios…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="ms-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Escenarios</h3>
            <p className="text-[11px] text-gray-500 mt-0.5 max-w-xl">
              Un escenario por área de montaje. Cada uno lleva su propio equipo, crew, logística,
              proveedores y layout. Si el evento tiene un solo escenario no hace falta crear nada.
            </p>
          </div>
          <button onClick={crear} disabled={creando} className="ms-btn-primary shrink-0 text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
            {creando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Agregar escenario
          </button>
        </div>
        {escenarios.length === 0 && escenarioMedidas && (
          <p className="text-[11px] text-gray-600 mt-3 border-t border-[#1a1a1a] pt-3">
            Medidas capturadas en la ficha operativa: <span className="text-gray-400">{escenarioMedidas}</span>.
            El primer escenario las hereda.
          </p>
        )}
      </div>

      {escenarios.map(e => {
        const editando = abierto === e.id;
        return (
          <div key={e.id} className="ms-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{e.nombre}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {e.anchoM && e.largoM ? `${e.anchoM} × ${e.largoM} m` : "Sin medidas"}
                  {e.alturaM ? ` · ${e.alturaM} m de altura` : ""}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
                  <span>{e._count.equipos} equipo{e._count.equipos !== 1 ? "s" : ""}</span>
                  <span>{e._count.personal} de crew</span>
                  <span>{e._count.bloques} bloque{e._count.bloques !== 1 ? "s" : ""}</span>
                  <span>{e._count.proveedores} proveedor{e._count.proveedores !== 1 ? "es" : ""}</span>
                </div>
                {e.notas && <p className="text-[11px] text-gray-600 mt-2 whitespace-pre-wrap">{e.notas}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/proyectos/${proyectoId}/escenarios/${e.id}/layout`}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-300 hover:border-[#B3985B] hover:text-[#B3985B] transition-colors flex items-center gap-1.5"
                >
                  <LayoutGrid size={12} /> Layout
                </Link>
                <button
                  onClick={() => { setAbierto(editando ? null : e.id); setBorrador(editando ? null : aBorrador(e)); }}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
                >
                  {editando ? "Cerrar" : "Editar"}
                </button>
                <button onClick={() => borrar(e)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {editando && borrador && (
              <div className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-4">
                    <label className="ms-label block mb-1">Nombre</label>
                    <input className={CAMPO} value={borrador.nombre} onChange={ev => setBorrador(p => p && ({ ...p, nombre: ev.target.value }))} />
                  </div>
                  <div>
                    <label className="ms-label block mb-1">Ancho (m)</label>
                    <input type="number" step="0.1" min="0" className={CAMPO} value={borrador.anchoM} onChange={ev => setBorrador(p => p && ({ ...p, anchoM: ev.target.value }))} />
                  </div>
                  <div>
                    <label className="ms-label block mb-1">Fondo (m)</label>
                    <input type="number" step="0.1" min="0" className={CAMPO} value={borrador.largoM} onChange={ev => setBorrador(p => p && ({ ...p, largoM: ev.target.value }))} />
                  </div>
                  <div>
                    <label className="ms-label block mb-1">Altura (m)</label>
                    <input type="number" step="0.1" min="0" className={CAMPO} value={borrador.alturaM} onChange={ev => setBorrador(p => p && ({ ...p, alturaM: ev.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="ms-label block mb-1">Notas</label>
                  <textarea rows={2} className={CAMPO} value={borrador.notas} onChange={ev => setBorrador(p => p && ({ ...p, notas: ev.target.value }))} />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => guardar(e.id)} disabled={guardando} className="ms-btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                    {guardando ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
