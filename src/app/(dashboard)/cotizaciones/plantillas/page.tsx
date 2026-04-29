"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

interface Linea {
  id: string; tipo: string; descripcion: string; cantidad: number;
  dias: number; precioUnitario: number; subtotal: number; esIncluido: boolean;
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
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Plantillas de cotización</h1>
          <p className="text-gray-500 text-sm">
            {loading ? "Cargando..." : `${plantillas.length} plantilla${plantillas.length !== 1 ? "s" : ""} activa${plantillas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/crm/tratos" className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          Ir a Tratos →
        </Link>
      </div>

      {/* Tip */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
        <span className="text-base shrink-0 mt-0.5">💡</span>
        <p className="text-gray-500 text-xs">
          Las plantillas se crean desde una cotización existente usando el botón <span className="text-white font-medium">Guardar como plantilla</span>. Puedes cargarlas al crear una cotización nueva para rellenar las líneas automáticamente.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
        </div>
      ) : plantillas.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-gray-500 text-sm">Sin plantillas guardadas</p>
          <p className="text-gray-700 text-xs mt-1">Abre una cotización y usa "Guardar como plantilla" para crear la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plantillas.map(p => {
            const totalPlantilla = p.lineas.filter(l => !l.esIncluido).reduce((s, l) => s + l.subtotal, 0);
            const isOpen = expandida === p.id;

            return (
              <div key={p.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
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
    </div>
  );
}
