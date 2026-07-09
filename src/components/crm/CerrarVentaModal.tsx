"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";

type CotizacionSel = {
  id: string;
  numeroCotizacion: string;
  nombreCotizacion: string | null;
  nombreEvento: string | null;
  opcionLetra: string | null;
  grupoId: string | null;
  granTotal: number;
  estado: string;
  proyecto: { id: string; numeroProyecto: string } | null;
};

const ESTADOS_ACTIVOS = ["BORRADOR", "ENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO", "REENVIADA"];

export function CerrarVentaModal({
  tratoId,
  open,
  onClose,
  onDone,
  preseleccion,
}: {
  tratoId: string;
  open: boolean;
  onClose: () => void;
  onDone: (result: { proyectos: { id: string; numeroProyecto: string }[] }) => void;
  // Si se pasa, solo estas cotizaciones vienen preseleccionadas; si no, todas las que no tienen proyecto.
  preseleccion?: string[];
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [cotizaciones, setCotizaciones] = useState<CotizacionSel[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/tratos/${tratoId}`, { cache: "no-store" });
        const d = await res.json();
        if (cancelado) return;
        const cots: CotizacionSel[] = (d.trato?.cotizaciones ?? []).filter(
          (c: CotizacionSel) => ESTADOS_ACTIVOS.includes(c.estado) || c.estado === "APROBADA",
        );
        setCotizaciones(cots);
        // Preseleccionar: si viene `preseleccion`, solo esas (sin proyecto aún);
        // si no, todas las que aún no tienen proyecto.
        const sinProyecto = cots.filter((c) => !c.proyecto);
        const base = preseleccion
          ? sinProyecto.filter((c) => preseleccion.includes(c.id))
          : sinProyecto;
        setSeleccion(new Set(base.map((c) => c.id)));
      } catch {
        if (!cancelado) toast.error("No se pudieron cargar las cotizaciones");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [open, tratoId, toast, preseleccion]);

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function confirmar() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/tratos/${tratoId}/cerrar-venta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacionIds: [...seleccion] }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Error al cerrar la venta");
        setGuardando(false);
        return;
      }
      const nProy = d.count ?? 0;
      toast.success(nProy > 0 ? `Venta cerrada · ${nProy} proyecto${nProy !== 1 ? "s" : ""} generado${nProy !== 1 ? "s" : ""}` : "Venta cerrada");
      onDone({ proyectos: d.proyectos ?? [] });
    } catch {
      toast.error("Error de conexión");
      setGuardando(false);
    }
  }

  const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`;
  const nuevas = cotizaciones.filter((c) => !c.proyecto && seleccion.has(c.id));
  const sumaSel = nuevas.reduce((s, c) => s + (c.granTotal ?? 0), 0);
  const hayCotizaciones = cotizaciones.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Cerrar venta y generar proyectos" maxWidth="max-w-xl">
      {loading ? (
        <p className="text-gray-500 text-sm py-6 text-center">Cargando cotizaciones...</p>
      ) : !hayCotizaciones ? (
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Este trato no tiene cotizaciones. Se marcará como <span className="text-green-400 font-semibold">Venta Cerrada</span> sin generar proyectos.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-[#2a2a2a]">Cancelar</button>
            <button onClick={confirmar} disabled={guardando} className="px-4 py-2 rounded-xl text-sm font-bold bg-green-700/30 border border-green-700/50 text-green-300 hover:bg-green-700/40 disabled:opacity-40">
              {guardando ? "Cerrando..." : "Cerrar venta"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400 text-xs">
            Selecciona las cotizaciones que se aprueban. Se generará un proyecto de evento por cada una. Las cotizaciones activas no seleccionadas se marcarán como rechazadas.
          </p>

          <div className="space-y-2">
            {cotizaciones.map((c) => {
              const yaTiene = !!c.proyecto;
              const marcada = yaTiene || seleccion.has(c.id);
              const titulo = c.nombreCotizacion || c.nombreEvento || `Cotización ${c.numeroCotizacion}`;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={yaTiene}
                  onClick={() => !yaTiene && toggle(c.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-all flex items-start gap-3 ${
                    yaTiene
                      ? "bg-green-950/20 border-green-900/40 cursor-default"
                      : marcada
                        ? "bg-[#B3985B]/10 border-[#B3985B]/40"
                        : "bg-[#111] border-[#2a2a2a] hover:border-[#444]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                    marcada ? (yaTiene ? "bg-green-600 border-green-500" : "bg-[#B3985B] border-[#B3985B]") : "border-[#444]"
                  }`}>
                    {marcada && <span className="text-[10px] text-black font-bold">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white text-sm font-medium truncate">
                        {c.opcionLetra && c.grupoId ? `[${c.opcionLetra}] ` : ""}{titulo}
                      </span>
                      <span className="text-[#B3985B] text-xs font-semibold shrink-0">{fmt(c.granTotal)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {c.numeroCotizacion}
                      {yaTiene && <span className="text-green-500"> · ✓ Proyecto {c.proyecto!.numeroProyecto} generado</span>}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {sumaSel > 0 && (
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-gray-400">Total a cerrar ({nuevas.length} proyecto{nuevas.length !== 1 ? "s" : ""})</span>
              <span className="text-white font-bold">{fmt(sumaSel)}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-[#2a2a2a]">Cancelar</button>
            <button
              onClick={confirmar}
              disabled={guardando || nuevas.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[#B3985B] text-black hover:bg-[#c9a96a] disabled:opacity-40"
            >
              {guardando ? "Cerrando..." : nuevas.length > 0 ? `Cerrar venta · ${nuevas.length} proyecto${nuevas.length !== 1 ? "s" : ""}` : "Selecciona una cotización"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
