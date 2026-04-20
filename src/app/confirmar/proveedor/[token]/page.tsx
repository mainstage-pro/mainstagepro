"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface EquipoData {
  id: string;
  confirmDisponible: boolean | null;
  cantidad: number;
  dias: number;
  equipo: {
    descripcion: string;
    marca: string | null;
    categoria: { nombre: string } | null;
  } | null;
  proyecto: {
    nombre: string;
    fechaEvento: string | null;
    lugarEvento: string | null;
  } | null;
  proveedor: { nombre: string } | null;
}

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

export default function ConfirmarProveedorPage() {
  const { token } = useParams<{ token: string }>();
  const [equipo, setEquipo] = useState<EquipoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [disponibleFinal, setDisponibleFinal] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/confirmar/proveedor/${token}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        setEquipo(data.equipo);
        if (data.equipo?.confirmDisponible !== null && data.equipo?.confirmDisponible !== undefined) {
          setDisponibleFinal(data.equipo.confirmDisponible);
          setSubmitted(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleResponder(disponible: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/confirmar/proveedor/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponible }),
      });
      if (res.ok) { setDisponibleFinal(disponible); setSubmitted(true); }
    } finally {
      setSubmitting(false);
    }
  }

  const fechaFormateada = equipo?.proyecto?.fechaEvento
    ? new Date(equipo.proyecto.fechaEvento).toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FONT }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" style={{ fontFamily: FONT }}>
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-30" draggable={false} />
        <p className="text-white/50 font-semibold mb-2">Enlace no válido</p>
        <p className="text-white/25 text-sm">Este enlace de confirmación no es válido o ya expiró.</p>
      </div>
    </div>
  );

  if (submitted && disponibleFinal !== null) return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" style={{ fontFamily: FONT }}>
      <div className="text-center max-w-sm w-full">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border ${
          disponibleFinal ? "bg-green-900/30 border-green-500/30" : "bg-red-900/20 border-red-500/20"
        }`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               className={disponibleFinal ? "text-green-400" : "text-red-400"}>
            {disponibleFinal
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            }
          </svg>
        </div>
        <h1 className="text-white font-bold text-xl mb-2">
          {disponibleFinal ? "¡Disponibilidad confirmada!" : "Equipo no disponible"}
        </h1>
        <p className="text-white/35 text-sm mb-6 leading-relaxed">
          {disponibleFinal
            ? `Gracias ${equipo?.proveedor?.nombre ?? ""}. Hemos registrado que el equipo está disponible.`
            : `Gracias por avisarnos, ${equipo?.proveedor?.nombre ?? ""}. Hemos registrado que el equipo no está disponible.`}
        </p>
        {equipo?.proyecto?.nombre && (
          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4 text-left">
            <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Proyecto</p>
            <p className="text-white/70 text-sm font-medium">{equipo.proyecto.nombre}</p>
          </div>
        )}
        <p className="text-white/15 text-xs mt-8">Mainstage Pro · Sistema operativo</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black px-6 py-16 flex items-start justify-center" style={{ fontFamily: FONT }}>
      <style>{`
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-40" draggable={false} />
          <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-[0.25em] mb-3">Consulta de disponibilidad</p>
          <h1 className="text-white font-bold text-2xl mb-1" style={{ letterSpacing: "-0.02em" }}>
            ¿Tienes este equipo disponible?
          </h1>
          {equipo?.proveedor?.nombre && (
            <p className="text-white/35 text-sm">Hola, {equipo.proveedor.nombre}</p>
          )}
        </div>

        {/* Equipment info */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 mb-4 space-y-4">
          <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest">Equipo solicitado</p>
          {equipo?.equipo?.descripcion && (
            <div>
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Descripción</p>
              <p className="text-white/85 font-semibold">{equipo.equipo.descripcion}</p>
            </div>
          )}
          {equipo?.equipo?.marca && (
            <div>
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Marca</p>
              <p className="text-white/70 text-sm">{equipo.equipo.marca}</p>
            </div>
          )}
          {equipo?.equipo?.categoria?.nombre && (
            <div>
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Categoría</p>
              <p className="text-white/70 text-sm">{equipo.equipo.categoria.nombre}</p>
            </div>
          )}
          <div className="flex gap-8">
            {equipo?.cantidad != null && (
              <div>
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Cantidad</p>
                <p className="text-white/85 font-bold">{equipo.cantidad}</p>
              </div>
            )}
            {equipo?.dias != null && (
              <div>
                <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Días</p>
                <p className="text-white/85 font-bold">{equipo.dias}</p>
              </div>
            )}
          </div>
        </div>

        {/* Project info */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 mb-8 space-y-4">
          <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest">Información del proyecto</p>
          {equipo?.proyecto?.nombre && (
            <div>
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Proyecto</p>
              <p className="text-white/85 font-semibold">{equipo.proyecto.nombre}</p>
            </div>
          )}
          {fechaFormateada && (
            <div>
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Fecha</p>
              <p className="text-white/70 text-sm capitalize">{fechaFormateada}</p>
            </div>
          )}
          {equipo?.proyecto?.lugarEvento && (
            <div>
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-1">Lugar</p>
              <p className="text-white/70 text-sm">{equipo.proyecto.lugarEvento}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleResponder(true)}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-[#B3985B] hover:bg-[#c9a960] text-black font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(179,152,91,0.15)]"
          >
            {submitting ? "Enviando..." : "Equipo disponible"}
          </button>
          <button
            onClick={() => handleResponder(false)}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-white/50 hover:text-white/70 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            No disponible
          </button>
        </div>

        <p className="text-center text-white/15 text-xs mt-8">Mainstage Pro · Sistema operativo</p>
      </div>
    </div>
  );
}
