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
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
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
      if (res.ok) {
        setDisponibleFinal(disponible);
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fechaFormateada = equipo?.proyecto?.fechaEvento
    ? new Date(equipo.proyecto.fechaEvento).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#6b7280] text-sm">Cargando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-[#B3985B] text-5xl mb-4">⚠</div>
          <h1 className="text-white text-xl font-semibold mb-2">Enlace no válido</h1>
          <p className="text-[#6b7280] text-sm">
            Este enlace de confirmación no es válido o ya expiró.
          </p>
        </div>
      </div>
    );
  }

  if (submitted && disponibleFinal !== null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className={`text-6xl mb-4 ${disponibleFinal ? "text-green-400" : "text-red-400"}`}>
            {disponibleFinal ? "✓" : "✗"}
          </div>
          <h1 className="text-white text-2xl font-semibold mb-2">
            {disponibleFinal ? "¡Disponibilidad confirmada!" : "Equipo no disponible"}
          </h1>
          <p className="text-[#6b7280] text-sm mb-6">
            {disponibleFinal
              ? `Gracias ${equipo?.proveedor?.nombre ?? ""}. Hemos registrado que el equipo está disponible.`
              : `Gracias por avisarnos, ${equipo?.proveedor?.nombre ?? ""}. Hemos registrado que el equipo no está disponible.`}
          </p>
          {equipo?.proyecto?.nombre && (
            <div className="bg-[#111] border border-[#262626] rounded-lg p-4 text-left">
              <p className="text-[#B3985B] text-xs uppercase tracking-wider mb-1">Proyecto</p>
              <p className="text-white text-sm font-medium">{equipo.proyecto.nombre}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#B3985B] text-xs uppercase tracking-widest mb-2">Mainstage Pro</p>
          <h1 className="text-white text-2xl font-bold mb-1">Consulta de disponibilidad</h1>
          {equipo?.proveedor?.nombre && (
            <p className="text-[#6b7280] text-sm">Hola, {equipo.proveedor.nombre}</p>
          )}
        </div>

        {/* Equipment info card */}
        <div className="bg-[#111] border border-[#262626] rounded-xl p-5 mb-6 space-y-4">
          <p className="text-[#B3985B] text-xs uppercase tracking-wider">Equipo solicitado</p>
          {equipo?.equipo?.descripcion && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Descripción</p>
              <p className="text-white font-semibold">{equipo.equipo.descripcion}</p>
            </div>
          )}
          {equipo?.equipo?.marca && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Marca</p>
              <p className="text-white text-sm">{equipo.equipo.marca}</p>
            </div>
          )}
          {equipo?.equipo?.categoria?.nombre && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Categoría</p>
              <p className="text-white text-sm">{equipo.equipo.categoria.nombre}</p>
            </div>
          )}
          <div className="flex gap-6">
            {equipo?.cantidad != null && (
              <div>
                <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Cantidad</p>
                <p className="text-white font-semibold">{equipo.cantidad}</p>
              </div>
            )}
            {equipo?.dias != null && (
              <div>
                <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Días</p>
                <p className="text-white font-semibold">{equipo.dias}</p>
              </div>
            )}
          </div>
        </div>

        {/* Project info card */}
        <div className="bg-[#111] border border-[#262626] rounded-xl p-5 mb-8 space-y-4">
          <p className="text-[#B3985B] text-xs uppercase tracking-wider">Información del proyecto</p>
          {equipo?.proyecto?.nombre && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Proyecto</p>
              <p className="text-white font-semibold">{equipo.proyecto.nombre}</p>
            </div>
          )}
          {fechaFormateada && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Fecha</p>
              <p className="text-white text-sm capitalize">{fechaFormateada}</p>
            </div>
          )}
          {equipo?.proyecto?.lugarEvento && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Lugar</p>
              <p className="text-white text-sm">{equipo.proyecto.lugarEvento}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleResponder(true)}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Equipo disponible
          </button>
          <button
            onClick={() => handleResponder(false)}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✗ No disponible
          </button>
        </div>

        <p className="text-center text-[#444] text-xs mt-8">Mainstage Pro · Sistema operativo</p>
      </div>
    </div>
  );
}
