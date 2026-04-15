"use client";

import { use, useEffect, useState } from "react";

interface PropuestaData {
  candidatoNombre: string;
  puestoTitulo: string;
  puestoArea: string;
  puestoDescripcion: string | null;
  modalidad: string | null;
  tipoContrato: string | null;
  horario: string | null;
  salarioPropuesto: number | null;
  fechaIngresoEstimada: string | null;
  beneficios: string[];
  observaciones: string | null;
  propuestaAceptada: boolean | null;
  etapa: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export default function PropuestaPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PropuestaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [respuesta, setRespuesta] = useState<"aceptada" | "rechazada" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/propuesta/candidato/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData(d);
        if (d.propuestaAceptada === true) setRespuesta("aceptada");
        if (d.propuestaAceptada === false) setRespuesta("rechazada");
        setLoading(false);
      })
      .catch(() => { setError("Error al cargar la propuesta"); setLoading(false); });
  }, [token]);

  async function responder(acepta: boolean) {
    setEnviando(true);
    try {
      const res = await fetch(`/api/propuesta/candidato/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acepta }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setRespuesta(d.propuestaAceptada ? "aceptada" : "rechazada");
        } else {
          setError(d.error ?? "Error al enviar respuesta");
        }
        return;
      }
      setRespuesta(acepta ? "aceptada" : "rechazada");
    } catch {
      setError("Error de conexión");
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg mb-2">Propuesta no encontrada</p>
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  // Already responded — aceptada
  if (respuesta === "aceptada") return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido al equipo, {data.candidatoNombre.split(" ")[0]}!</h1>
          <p className="text-[#B3985B] font-medium">{data.puestoTitulo}</p>
        </div>
        <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-6 text-left space-y-3">
          <p className="text-white font-semibold text-sm">¿Qué sigue?</p>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex gap-3">
              <span className="text-[#B3985B] font-bold shrink-0">1.</span>
              <span>En los próximos días recibirás un <strong className="text-white">borrador de contrato</strong> para tu revisión. Tómate el tiempo necesario para leerlo con calma.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#B3985B] font-bold shrink-0">2.</span>
              <span>Coordinaremos una <strong className="text-white">cita presencial</strong> para formalizar tu incorporación, resolver cualquier duda y presentarte al equipo.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#B3985B] font-bold shrink-0">3.</span>
              <span>Si tienes preguntas antes de esa cita, no dudes en contactarnos. Estamos aquí para que tu llegada sea lo más cómoda posible.</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 text-xs">Mainstage Producciones · mainstagepro.mx</p>
      </div>
    </div>
  );

  // Already responded — rechazada
  if (respuesta === "rechazada") return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mx-auto text-2xl">
          🙏
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white mb-2">Gracias, {data.candidatoNombre.split(" ")[0]}</h1>
          <p className="text-gray-400">Entendemos tu decisión y la respetamos. Fue un placer conocerte y apreciar tu talento.</p>
        </div>
        <p className="text-gray-600 text-sm">Si en el futuro tu situación cambia, con gusto retomamos la conversación.</p>
        <p className="text-gray-700 text-xs">Mainstage Producciones</p>
      </div>
    </div>
  );

  // Show proposal
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold">Mainstage Producciones</p>
          <h1 className="text-2xl font-bold">Propuesta de colaboración</h1>
          <p className="text-gray-400">Hola <strong className="text-white">{data.candidatoNombre.split(" ")[0]}</strong>, preparamos esta propuesta especialmente para ti.</p>
        </div>

        {/* Puesto */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-1">{data.puestoArea}</p>
              <h2 className="text-xl font-bold text-white">{data.puestoTitulo}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-500">
                {data.modalidad && <span className="bg-[#1a1a1a] px-2 py-0.5 rounded">{data.modalidad}</span>}
                {data.tipoContrato && <span className="bg-[#1a1a1a] px-2 py-0.5 rounded">{data.tipoContrato}</span>}
                {data.horario && <span className="bg-[#1a1a1a] px-2 py-0.5 rounded">{data.horario}</span>}
              </div>
            </div>
            {data.salarioPropuesto && (
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500 mb-0.5">Oferta salarial</p>
                <p className="text-xl font-bold text-[#B3985B]">{fmt(data.salarioPropuesto)}</p>
                <p className="text-xs text-gray-600">mensual</p>
              </div>
            )}
          </div>

          {data.puestoDescripcion && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <p className="text-sm text-gray-400 leading-relaxed">{data.puestoDescripcion}</p>
            </div>
          )}
        </div>

        {/* Condiciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.fechaIngresoEstimada && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Fecha de inicio estimada</p>
              <p className="text-white font-semibold">{fmtDate(data.fechaIngresoEstimada)}</p>
            </div>
          )}

          {data.beneficios.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Beneficios adicionales</p>
              <ul className="space-y-1">
                {data.beneficios.map((b, i) => (
                  <li key={i} className="text-sm text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B] shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Mensaje personal */}
        {data.observaciones && (
          <div className="bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-xl p-5">
            <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-2">Mensaje del equipo</p>
            <p className="text-gray-300 text-sm leading-relaxed">{data.observaciones}</p>
          </div>
        )}

        {/* Decisión */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-white font-semibold mb-1">¿Qué decides?</p>
            <p className="text-gray-500 text-sm">Tu respuesta quedará registrada en nuestra plataforma.</p>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => responder(true)}
              disabled={enviando}
              className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors text-sm">
              {enviando ? "..." : "✓ Acepto la propuesta"}
            </button>
            <button
              onClick={() => responder(false)}
              disabled={enviando}
              className="flex-1 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-50 border border-[#333] text-gray-400 hover:text-white font-medium py-3 rounded-xl transition-colors text-sm">
              Declinar
            </button>
          </div>

          <p className="text-gray-700 text-xs text-center">
            Si tienes dudas antes de decidir, escríbenos primero. Queremos que estés seguro/a.
          </p>
        </div>

        <p className="text-center text-gray-700 text-xs">Mainstage Producciones · mainstagepro.mx</p>
      </div>
    </div>
  );
}
