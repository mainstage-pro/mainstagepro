"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PersonalData {
  id: string;
  confirmRespuesta: string | null;
  jornada: string | null;
  responsabilidad: string | null;
  tarifaAcordada: number | null;
  proyecto: {
    nombre: string;
    fechaEvento: string | null;
    lugarEvento: string | null;
  } | null;
  tecnico: { nombre: string } | null;
  rolTecnico: { nombre: string } | null;
}

export default function ConfirmarTecnicoPage() {
  const { token } = useParams<{ token: string }>();
  const [personal, setPersonal] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [respuestaFinal, setRespuestaFinal] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/confirmar/tecnico/${token}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setPersonal(data.personal);
        if (data.personal?.confirmRespuesta) {
          setRespuestaFinal(data.personal.confirmRespuesta);
          setSubmitted(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleResponder(respuesta: "CONFIRMADO" | "RECHAZADO") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/confirmar/tecnico/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta }),
      });
      if (res.ok) {
        setRespuestaFinal(respuesta);
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fechaFormateada = personal?.proyecto?.fechaEvento
    ? new Date(personal.proyecto.fechaEvento).toLocaleDateString("es-MX", {
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

  if (submitted && respuestaFinal) {
    const esConfirmado = respuestaFinal === "CONFIRMADO";
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className={`text-6xl mb-4 ${esConfirmado ? "text-green-400" : "text-red-400"}`}>
            {esConfirmado ? "✓" : "✗"}
          </div>
          <h1 className="text-white text-2xl font-semibold mb-2">
            {esConfirmado ? "¡Participación confirmada!" : "Participación rechazada"}
          </h1>
          <p className="text-[#6b7280] text-sm mb-6">
            {esConfirmado
              ? `Gracias ${personal?.tecnico?.nombre ?? ""}. Tu participación ha sido registrada. Nos pondremos en contacto contigo con más detalles.`
              : `Gracias por avisarnos, ${personal?.tecnico?.nombre ?? ""}. Hemos registrado que no podrás participar en este proyecto.`}
          </p>
          {personal?.proyecto?.nombre && (
            <div className="bg-[#111] border border-[#262626] rounded-lg p-4 text-left">
              <p className="text-[#B3985B] text-xs uppercase tracking-wider mb-1">Proyecto</p>
              <p className="text-white text-sm font-medium">{personal.proyecto.nombre}</p>
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
          <h1 className="text-white text-2xl font-bold mb-1">Invitación a proyecto</h1>
          {personal?.tecnico?.nombre && (
            <p className="text-[#6b7280] text-sm">Hola, {personal.tecnico.nombre}</p>
          )}
        </div>

        {/* Project info card */}
        <div className="bg-[#111] border border-[#262626] rounded-xl p-5 mb-6 space-y-4">
          {personal?.proyecto?.nombre && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Proyecto</p>
              <p className="text-white font-semibold">{personal.proyecto.nombre}</p>
            </div>
          )}
          {fechaFormateada && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Fecha</p>
              <p className="text-white text-sm capitalize">{fechaFormateada}</p>
            </div>
          )}
          {personal?.proyecto?.lugarEvento && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Lugar</p>
              <p className="text-white text-sm">{personal.proyecto.lugarEvento}</p>
            </div>
          )}
        </div>

        {/* Role info card */}
        <div className="bg-[#111] border border-[#262626] rounded-xl p-5 mb-8 space-y-4">
          {personal?.rolTecnico?.nombre && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Rol</p>
              <p className="text-white text-sm">{personal.rolTecnico.nombre}</p>
            </div>
          )}
          {personal?.jornada && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Jornada</p>
              <p className="text-white text-sm">{personal.jornada}</p>
            </div>
          )}
          {personal?.tarifaAcordada != null && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Tarifa</p>
              <p className="text-[#B3985B] font-semibold">
                ${personal.tarifaAcordada.toLocaleString("es-MX")} MXN
              </p>
            </div>
          )}
          {personal?.responsabilidad && (
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-0.5">Responsabilidad</p>
              <p className="text-white text-sm">{personal.responsabilidad}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleResponder("CONFIRMADO")}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Confirmo mi participación
          </button>
          <button
            onClick={() => handleResponder("RECHAZADO")}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-red-700 hover:bg-red-600 active:bg-red-800 text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✗ No puedo participar
          </button>
        </div>

        <p className="text-center text-[#444] text-xs mt-8">Mainstage Pro · Sistema operativo</p>
      </div>
    </div>
  );
}
