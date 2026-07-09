"use client";

import { useEffect, useMemo, useState } from "react";

interface CotizacionLite {
  id: string;
  numeroCotizacion: string;
  opcionLetra: string;
  estado: string;
  nombreEvento: string | null;
  proyecto: {
    id: string;
    numeroProyecto: string;
    nombre: string;
  } | null;
}

interface TratoLite {
  id: string;
  nombreEvento: string | null;
  etapa: string;
  cotizaciones: CotizacionLite[];
}

const ESTADOS_APROBADOS = ["APROBADA"];

function estadoLabel(e: string) {
  return e === "APROBADA" ? "Aprobada" : e === "ENVIADA" ? "Enviada" : e.charAt(0) + e.slice(1).toLowerCase();
}

export default function DocumentosClienteModal({ trato }: { trato: TratoLite }) {
  const [open, setOpen] = useState(false);
  const [selectedCotId, setSelectedCotId] = useState<string>("");
  const [anticipoCxcId, setAnticipoCxcId] = useState<string | null>(null);
  const [cargandoAnticipo, setCargandoAnticipo] = useState(false);

  // La tarjeta aparece cuando la venta está cerrada o hay una cotización aprobada.
  const hayAprobada = trato.cotizaciones.some(c => ESTADOS_APROBADOS.includes(c.estado));
  const visible = trato.etapa === "VENTA_CERRADA" || hayAprobada;

  // Cotización por defecto: aprobada → con proyecto → primera.
  const cotDefault = useMemo(() => {
    return (
      trato.cotizaciones.find(c => ESTADOS_APROBADOS.includes(c.estado)) ??
      trato.cotizaciones.find(c => c.proyecto) ??
      trato.cotizaciones[0]
    );
  }, [trato.cotizaciones]);

  useEffect(() => {
    if (open && !selectedCotId && cotDefault) setSelectedCotId(cotDefault.id);
  }, [open, selectedCotId, cotDefault]);

  const selectedCot = trato.cotizaciones.find(c => c.id === selectedCotId) ?? cotDefault ?? null;
  const proyecto = selectedCot?.proyecto ?? null;

  // Buscar la cuenta por cobrar del anticipo para el proyecto seleccionado.
  useEffect(() => {
    if (!open || !proyecto) {
      setAnticipoCxcId(null);
      return;
    }
    let cancel = false;
    setCargandoAnticipo(true);
    setAnticipoCxcId(null);
    fetch(`/api/cuentas-cobrar?proyectoId=${proyecto.id}&tipoPago=ANTICIPO`)
      .then(r => (r.ok ? r.json() : []))
      .then((cuentas: Array<{ id: string }>) => {
        if (cancel) return;
        setAnticipoCxcId(Array.isArray(cuentas) && cuentas.length > 0 ? cuentas[0].id : null);
      })
      .catch(() => { if (!cancel) setAnticipoCxcId(null); })
      .finally(() => { if (!cancel) setCargandoAnticipo(false); });
    return () => { cancel = true; };
  }, [open, proyecto?.id]);

  if (!visible) return null;

  const abrir = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const docs: Array<{
    key: string;
    label: string;
    desc: string;
    icon: string;
    enabled: boolean;
    hint?: string;
    onClick?: () => void;
  }> = [
    {
      key: "contrato",
      label: "Contrato",
      desc: "Contrato de servicios con anticipo y saldo",
      icon: "📄",
      enabled: !!selectedCot,
      onClick: () => selectedCot && abrir(`/api/contratos/${trato.id}/pdf?cotizacionId=${selectedCot.id}`),
    },
    {
      key: "listado",
      label: "Listado de equipos",
      desc: "Relación de equipos incluidos",
      icon: "📋",
      enabled: !!selectedCot,
      onClick: () => selectedCot && abrir(`/api/cotizaciones/${selectedCot.id}/listado-equipos-pdf`),
    },
    {
      key: "responsiva",
      label: "Carta responsiva",
      desc: proyecto ? "Responsiva para el recinto / sede" : "Disponible al crear el proyecto",
      icon: "🛡️",
      enabled: !!proyecto,
      hint: proyecto ? undefined : "Requiere proyecto",
      onClick: () => proyecto && abrir(`/api/proyectos/${proyecto.id}/carta-responsiva?preview=1`),
    },
    {
      key: "nota",
      label: "Nota de cobro del anticipo",
      desc: cargandoAnticipo
        ? "Buscando anticipo…"
        : anticipoCxcId
        ? "Nota con datos bancarios para el anticipo"
        : proyecto
        ? "No hay anticipo registrado en el proyecto"
        : "Disponible al crear el proyecto",
      icon: "💳",
      enabled: !!anticipoCxcId,
      hint: !proyecto ? "Requiere proyecto" : !anticipoCxcId && !cargandoAnticipo ? "Sin anticipo" : undefined,
      onClick: () => anticipoCxcId && abrir(`/api/cuentas-cobrar/${anticipoCxcId}/nota`),
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-sm font-semibold rounded-xl hover:bg-[#B3985B]/15 hover:border-[#B3985B]/50 transition-colors flex items-center justify-center gap-2"
      >
        📨 Documentos para el cliente
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-[#1a1a1a]">
              <div>
                <h3 className="text-white font-bold text-base">Documentos para el cliente</h3>
                <p className="text-gray-500 text-xs mt-0.5">Descarga y envía lo necesario para cerrar</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-white transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Selector de cotización */}
            {trato.cotizaciones.length > 0 && (
              <div className="px-5 pt-4">
                <label className="text-[10px] text-gray-600 uppercase tracking-wider">Cotización</label>
                <select
                  value={selectedCotId}
                  onChange={e => setSelectedCotId(e.target.value)}
                  className="mt-1 w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/40"
                >
                  {trato.cotizaciones.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#111]">
                      {c.numeroCotizacion} · Opción {c.opcionLetra} — {estadoLabel(c.estado)}
                      {c.proyecto ? " · con proyecto" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Documentos */}
            <div className="px-5 py-4 space-y-2">
              {docs.map(doc => (
                <button
                  key={doc.key}
                  onClick={doc.onClick}
                  disabled={!doc.enabled}
                  className={`w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl border transition-colors ${
                    doc.enabled
                      ? "bg-[#141414] border-[#242424] hover:border-[#B3985B]/40 hover:bg-[#181818]"
                      : "bg-[#0f0f0f] border-[#161616] opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="text-lg shrink-0">{doc.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{doc.label}</span>
                      {doc.hint && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 shrink-0">
                          {doc.hint}
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-gray-500 truncate">{doc.desc}</span>
                  </span>
                  {doc.enabled && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#B3985B] shrink-0">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Acción interna: comisión */}
            {selectedCot && (
              <div className="px-5 pb-5 pt-1 border-t border-[#1a1a1a]">
                <a
                  href={`/cotizaciones/${selectedCot.id}/comision`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#c9a96a] transition-colors mt-3"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                  Ver comisión (interno)
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
