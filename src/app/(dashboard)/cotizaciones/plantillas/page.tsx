"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

interface Linea {
  id: string; tipo: string; descripcion: string; cantidad: number;
  dias: number; precioUnitario: number; subtotal: number; esIncluido: boolean;
  // Campos que se preservan al editar aunque no se muestren directamente
  equipoId?: string | null; rolTecnicoId?: string | null; marca?: string | null;
  modelo?: string | null; nivel?: string | null; jornada?: string | null;
  esExterno?: boolean; costoUnitario?: number; notas?: string | null;
}

interface Plantilla {
  id: string; nombre: string; descripcion: string | null;
  tipoEvento: string | null; tipoServicio: string | null;
  diasEquipo: number; diasOperacion: number;
  observaciones: string | null; vigenciaDias: number; aplicaIva: boolean;
  createdAt: string;
  lineas: Linea[];
}

const TIPO_LABELS: Record<string, string> = {
  EQUIPO_PROPIO: "Equipo propio", EQUIPO_EXTERNO: "Equipo externo",
  OPERACION_TECNICA: "Técnico", DJ: "DJ", TRANSPORTE: "Transporte",
  COMIDA: "Comida", HOSPEDAJE: "Hospedaje", OTRO: "Otro",
};

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetch("/api/plantillas-cotizacion")
      .then(r => r.json())
      .then(d => setPlantillas(d.plantillas ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function eliminar(id: string, nombre: string) {
    const ok = await confirm({ message: `¿Archivar la plantilla "${nombre}"? Dejará de aparecer en las opciones.`, confirmText: "Archivar", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/plantillas-cotizacion/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlantillas(prev => prev.filter(p => p.id !== id));
      toast.success("Plantilla archivada");
    } else {
      toast.error("Error al archivar");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="ms-h1">Plantillas de cotización</h1>
          <p className="text-gray-500 text-sm">
            {loading ? "Cargando..." : `${plantillas.length} plantilla${plantillas.length !== 1 ? "s" : ""} activa${plantillas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/crm/tratos" className="ms-btn-primary">
          Ir a Tratos →
        </Link>
      </div>

      {/* Tip */}
      <div className="ms-card px-4 py-3 mb-4 flex items-start gap-3">
        <span className="text-base shrink-0 mt-0.5">💡</span>
        <p className="text-gray-500 text-xs">
          Las plantillas se crean desde una cotización con <span className="text-white font-medium">Guardar como plantilla</span> y se cargan al crear una cotización nueva con <span className="text-white font-medium">Cargar plantilla</span>. Solo guardan los equipos/conceptos cotizados, nunca el cliente ni los datos del evento. Editarlas aquí <span className="text-white font-medium">no modifica</span> la cotización original.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 ms-card animate-pulse" />)}
        </div>
      ) : plantillas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-gray-500 text-sm">Sin plantillas guardadas</p>
          <p className="text-gray-700 text-xs mt-1">Abre una cotización y usa &quot;Guardar como plantilla&quot; para crear la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plantillas.map(p => {
            const totalPlantilla = p.lineas.filter(l => !l.esIncluido).reduce((s, l) => s + l.subtotal, 0);
            const isOpen = expandida === p.id;

            return (
              <div key={p.id} className="ms-table-wrapper">
                {/* Cabecera */}
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#151515] transition-colors text-left"
                  onClick={() => setExpandida(isOpen ? null : p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-medium text-sm">{p.nombre}</p>
                      {p.tipoEvento && (
                        <span className="text-[10px] bg-[#1e1e1e] text-gray-500 px-2 py-0.5 rounded">{p.tipoEvento}</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      {p.lineas.length} línea{p.lineas.length !== 1 ? "s" : ""}
                      {totalPlantilla > 0 && <span className="ml-2 text-[#B3985B]">{formatCurrency(totalPlantilla)} base</span>}
                      {p.descripcion && <span className="ml-2">· {p.descripcion}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <p className="text-gray-600 text-[10px]">Vigencia {p.vigenciaDias}d</p>
                      <p className="text-gray-600 text-[10px]">{new Date(p.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setEditando(structuredClone(p)); }}
                      className="text-[#666] hover:text-[#B3985B] text-xs transition-colors px-2 py-1"
                      title="Editar plantilla"
                    >
                      Editar
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); eliminar(p.id, p.nombre); }}
                      className="text-[#333] hover:text-red-400 text-xs transition-colors px-2 py-1"
                      title="Archivar plantilla"
                    >
                      Archivar
                    </button>
                    <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Detalle expandible */}
                {isOpen && (
                  <div className="border-t border-[#1a1a1a] px-4 py-3">
                    {p.lineas.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-4">Sin líneas en esta plantilla</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-xs">
                          <thead>
                            <tr className="text-gray-600 border-b border-[#1a1a1a]">
                              <th className="text-left pb-2 font-semibold">Descripción</th>
                              <th className="text-left pb-2 font-semibold hidden sm:table-cell">Tipo</th>
                              <th className="text-right pb-2 font-semibold">Cant.</th>
                              <th className="text-right pb-2 font-semibold hidden sm:table-cell">Días</th>
                              <th className="text-right pb-2 font-semibold">P. Unit.</th>
                              <th className="text-right pb-2 font-semibold">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#111]">
                            {p.lineas.map(l => (
                              <tr key={l.id} className={l.esIncluido ? "opacity-50" : ""}>
                                <td className="py-2 text-white">{l.descripcion} {l.esIncluido && <span className="text-[10px] text-gray-600">(incluido)</span>}</td>
                                <td className="py-2 text-gray-500 hidden sm:table-cell">{TIPO_LABELS[l.tipo] ?? l.tipo}</td>
                                <td className="py-2 text-right text-gray-400">{l.cantidad}</td>
                                <td className="py-2 text-right text-gray-400 hidden sm:table-cell">{l.dias}</td>
                                <td className="py-2 text-right text-gray-400">{formatCurrency(l.precioUnitario)}</td>
                                <td className="py-2 text-right text-white font-medium">{l.esIncluido ? "—" : formatCurrency(l.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-[#1e1e1e]">
                              <td colSpan={4} className="pt-2 text-gray-500 text-xs hidden sm:table-cell">Total base (sin incluidos)</td>
                              <td colSpan={2} className="pt-2 text-right text-[#B3985B] font-semibold">{formatCurrency(totalPlantilla)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Configuración */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#1a1a1a]">
                      {[
                        { label: "Días equipo", value: p.diasEquipo },
                        { label: "Días operación", value: p.diasOperacion },
                        { label: "Vigencia", value: `${p.vigenciaDias}d` },
                        { label: "IVA", value: p.aplicaIva ? "Sí" : "No" },
                      ].map(k => (
                        <div key={k.label} className="bg-[#0d0d0d] rounded-lg px-3 py-2 text-center">
                          <p className="text-gray-600 text-[10px]">{k.label}</p>
                          <p className="text-white text-xs font-semibold">{k.value}</p>
                        </div>
                      ))}
                    </div>

                    {p.observaciones && (
                      <p className="text-gray-600 text-xs mt-3 pt-3 border-t border-[#1a1a1a]">{p.observaciones}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <EditarPlantillaModal
          plantilla={editando}
          onClose={() => setEditando(null)}
          onSaved={(actualizada) => {
            setPlantillas(prev => prev.map(p => p.id === actualizada.id ? actualizada : p));
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function EditarPlantillaModal({ plantilla, onClose, onSaved }: {
  plantilla: Plantilla;
  onClose: () => void;
  onSaved: (p: Plantilla) => void;
}) {
  const [form, setForm] = useState<Plantilla>(plantilla);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function setLinea(id: string, patch: Partial<Linea>) {
    setForm(f => ({
      ...f,
      lineas: f.lineas.map(l => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        next.subtotal = next.esIncluido ? 0 : (Number(next.precioUnitario) || 0) * (Number(next.cantidad) || 0) * (Number(next.dias) || 0);
        return next;
      }),
    }));
  }

  function eliminarLinea(id: string) {
    setForm(f => ({ ...f, lineas: f.lineas.filter(l => l.id !== id) }));
  }

  function agregarLinea() {
    setForm(f => ({
      ...f,
      lineas: [...f.lineas, {
        id: `nueva-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tipo: "OTRO", descripcion: "", cantidad: 1, dias: 1,
        precioUnitario: 0, subtotal: 0, esIncluido: false,
      }],
    }));
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error("La plantilla necesita un nombre"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/plantillas-cotizacion/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          descripcion: form.descripcion,
          tipoEvento: form.tipoEvento,
          diasEquipo: form.diasEquipo,
          diasOperacion: form.diasOperacion,
          vigenciaDias: form.vigenciaDias,
          aplicaIva: form.aplicaIva,
          observaciones: form.observaciones,
          lineas: form.lineas,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error al guardar"); setSaving(false); return; }
      const { plantilla: actualizada } = await res.json();
      toast.success("Plantilla actualizada");
      onSaved(actualizada);
    } catch (e) {
      toast.error(`Error de conexión: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  }

  const totalBase = form.lineas.filter(l => !l.esIncluido).reduce((s, l) => s + (Number(l.subtotal) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-semibold">Editar plantilla</h2>
            <p className="text-gray-600 text-xs mt-0.5">Los cambios solo afectan a la plantilla, no a la cotización original.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Datos generales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-gray-500 text-xs mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-500 text-xs mb-1">Descripción</label>
              <input
                value={form.descripcion ?? ""}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Categoría (opcional)</label>
              <input
                value={form.tipoEvento ?? ""}
                onChange={e => setForm(f => ({ ...f, tipoEvento: e.target.value }))}
                placeholder="Musical, Social, Empresarial…"
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Vigencia (días)</label>
              <input
                type="number" min={0}
                value={form.vigenciaDias}
                onChange={e => setForm(f => ({ ...f, vigenciaDias: Number(e.target.value) }))}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Días equipo</label>
              <input
                type="number" min={0}
                value={form.diasEquipo}
                onChange={e => setForm(f => ({ ...f, diasEquipo: Number(e.target.value) }))}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Días operación</label>
              <input
                type="number" min={0}
                value={form.diasOperacion}
                onChange={e => setForm(f => ({ ...f, diasOperacion: Number(e.target.value) }))}
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mt-2">
              <input
                type="checkbox"
                checked={form.aplicaIva}
                onChange={e => setForm(f => ({ ...f, aplicaIva: e.target.checked }))}
                className="accent-[#B3985B]"
              />
              Aplica IVA
            </label>
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Equipos / conceptos</p>
              <button onClick={agregarLinea} className="text-[#B3985B] hover:text-[#c9a96a] text-xs font-medium">+ Agregar línea</button>
            </div>
            {form.lineas.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6 border border-dashed border-[#222] rounded-lg">Sin líneas. Agrega una para empezar.</p>
            ) : (
              <div className="space-y-2">
                {form.lineas.map(l => (
                  <div key={l.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <input
                        value={l.descripcion}
                        onChange={e => setLinea(l.id, { descripcion: e.target.value })}
                        placeholder="Descripción"
                        className="flex-1 bg-[#111] border border-[#222] rounded px-2 py-1.5 text-white text-xs focus:border-[#B3985B]/50 outline-none"
                      />
                      <span className="text-[10px] text-gray-600 shrink-0 mt-1.5">{TIPO_LABELS[l.tipo] ?? l.tipo}</span>
                      <button onClick={() => eliminarLinea(l.id)} className="text-[#444] hover:text-red-400 text-xs shrink-0 mt-1" title="Quitar línea">✕</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <label className="flex items-center gap-1 text-[10px] text-gray-600">
                        Cant.
                        <input type="number" min={0} value={l.cantidad}
                          onChange={e => setLinea(l.id, { cantidad: Number(e.target.value) })}
                          className="w-16 bg-[#111] border border-[#222] rounded px-2 py-1 text-white text-xs outline-none" />
                      </label>
                      <label className="flex items-center gap-1 text-[10px] text-gray-600">
                        Días
                        <input type="number" min={0} value={l.dias}
                          onChange={e => setLinea(l.id, { dias: Number(e.target.value) })}
                          className="w-16 bg-[#111] border border-[#222] rounded px-2 py-1 text-white text-xs outline-none" />
                      </label>
                      <label className="flex items-center gap-1 text-[10px] text-gray-600">
                        P. Unit.
                        <input type="number" min={0} value={l.precioUnitario}
                          onChange={e => setLinea(l.id, { precioUnitario: Number(e.target.value) })}
                          className="w-24 bg-[#111] border border-[#222] rounded px-2 py-1 text-white text-xs outline-none" />
                      </label>
                      <label className="flex items-center gap-1 text-[10px] text-gray-600">
                        <input type="checkbox" checked={l.esIncluido}
                          onChange={e => setLinea(l.id, { esIncluido: e.target.checked })}
                          className="accent-[#B3985B]" />
                        Incluido
                      </label>
                      <span className="ml-auto text-xs text-white font-medium">{l.esIncluido ? "—" : formatCurrency(l.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-500 text-xs mb-1">Observaciones</label>
            <textarea
              value={form.observaciones ?? ""}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:border-[#B3985B]/50 outline-none resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#1e1e1e] flex items-center justify-between shrink-0">
          <p className="text-gray-500 text-xs">Total base: <span className="text-[#B3985B] font-semibold">{formatCurrency(totalBase)}</span></p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="px-6 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
