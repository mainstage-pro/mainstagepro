"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EvaluacionData {
  respondida: boolean;
  proyecto: {
    nombre: string;
    fechaEvento: string | null;
    cliente: { nombre: string } | null;
  };
}

type Campo =
  | "satisfaccionGeneral"
  | "calidadServicio"
  | "puntualidad"
  | "atencionEquipo"
  | "claridadComunicacion"
  | "relacionCalidadPrecio"
  | "probabilidadRecontratacion";

const CRITERIOS: { key: Campo; label: string; descripcion: string; emoji: string }[] = [
  {
    key: "satisfaccionGeneral",
    label: "Satisfacción general",
    descripcion: "¿Qué tan satisfecho quedaste con el resultado del evento?",
    emoji: "⭐",
  },
  {
    key: "calidadServicio",
    label: "Calidad del servicio",
    descripcion: "¿El servicio brindado estuvo a la altura de lo que esperabas?",
    emoji: "🎯",
  },
  {
    key: "puntualidad",
    label: "Puntualidad",
    descripcion: "¿El equipo llegó y cumplió los tiempos acordados?",
    emoji: "⏱️",
  },
  {
    key: "atencionEquipo",
    label: "Atención del equipo",
    descripcion: "¿El equipo de Mainstage Pro fue amable, profesional y servicial?",
    emoji: "🤝",
  },
  {
    key: "claridadComunicacion",
    label: "Comunicación",
    descripcion: "¿La comunicación antes y durante el evento fue clara y oportuna?",
    emoji: "💬",
  },
  {
    key: "relacionCalidadPrecio",
    label: "Relación calidad-precio",
    descripcion: "¿Sientes que recibiste un buen servicio en relación con lo que pagaste?",
    emoji: "💎",
  },
];

const NPS_KEY = "probabilidadRecontratacion";

// ─── Star Rating Component ─────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  max = 10,
}: {
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = hover !== null ? n <= hover : value !== null ? n <= value : false;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            className={`w-9 h-9 rounded-xl text-base font-semibold transition-all duration-100 border ${
              active
                ? n <= 4
                  ? "bg-red-500 border-red-500 text-white scale-105"
                  : n <= 6
                  ? "bg-yellow-400 border-yellow-400 text-white scale-105"
                  : n <= 8
                  ? "bg-blue-500 border-blue-500 text-white scale-105"
                  : "bg-green-500 border-green-500 text-white scale-105"
                : "bg-gray-100 border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-200"
            }`}
            aria-label={`Calificación ${n}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function ScoreLabel({ value }: { value: number | null }) {
  if (value === null) return null;
  const label =
    value <= 4 ? "Necesita mejorar" :
    value <= 6 ? "Regular" :
    value <= 8 ? "Bueno" :
    "Excelente";
  const color =
    value <= 4 ? "text-red-500" :
    value <= 6 ? "text-yellow-500" :
    value <= 8 ? "text-blue-500" :
    "text-green-500";
  return <span className={`text-xs font-semibold ${color} ml-1`}>{label}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EvaluacionPublicaPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionData | null>(null);
  const [yaRespondida, setYaRespondida] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Form state
  const [nombreCliente, setNombreCliente] = useState("");
  const [scores, setScores] = useState<Record<Campo, number | null>>({
    satisfaccionGeneral: null,
    calidadServicio: null,
    puntualidad: null,
    atencionEquipo: null,
    claridadComunicacion: null,
    relacionCalidadPrecio: null,
    probabilidadRecontratacion: null,
  });
  const [loMejor, setLoMejor] = useState("");
  const [loMejorable, setLoMejorable] = useState("");
  const [comentarioAdicional, setComentarioAdicional] = useState("");

  // Load evaluation
  useEffect(() => {
    fetch(`/api/evaluacion-cliente/${token}`)
      .then((r) => {
        if (r.status === 404) { setError("Este link de evaluación no es válido o ya expiró."); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.evaluacion?.respondida) setYaRespondida(true);
        setEvaluacion(d.evaluacion);
      })
      .catch(() => setError("No pudimos cargar el formulario. Por favor intenta de nuevo."))
      .finally(() => setLoading(false));
  }, [token]);

  function setScore(key: Campo, val: number) {
    setScores((prev) => ({ ...prev, [key]: val }));
  }

  const criteriosCompletos = CRITERIOS.every((c) => scores[c.key] !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!criteriosCompletos) return;
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = {
        ...scores,
        probabilidadRecontratacion: scores.probabilidadRecontratacion,
        loMejor: loMejor.trim() || null,
        loMejorable: loMejorable.trim() || null,
        comentarioAdicional: [
          nombreCliente.trim() ? `Nombre: ${nombreCliente.trim()}` : "",
          comentarioAdicional.trim(),
        ].filter(Boolean).join("\n\n") || null,
      };

      const res = await fetch(`/api/evaluacion-cliente/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) { setYaRespondida(true); return; }
      if (!res.ok) { setError("Hubo un error al enviar. Por favor intenta de nuevo."); return; }
      setEnviado(true);
    } catch {
      setError("Error de conexión. Por favor intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-gray-900 font-semibold text-lg mb-2">Link inválido</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Ya respondida ──────────────────────────────────────────────────────────

  if (yaRespondida) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-gray-900 font-semibold text-lg mb-2">Ya recibimos tu evaluación</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Esta evaluación ya fue respondida. ¡Gracias por tu tiempo!
          </p>
          <div className="mt-6">
            <p className="text-[#B3985B] text-xs font-semibold">Mainstage Pro</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Enviado con éxito ──────────────────────────────────────────────────────

  if (enviado) {
    const nombre = nombreCliente.trim();
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#B3985B]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-3">
            {nombre ? `¡Gracias, ${nombre}!` : "¡Gracias!"}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Tu evaluación fue recibida. Nos ayuda a seguir mejorando para darte un servicio excepcional en cada evento.
          </p>
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-[#B3985B] text-xs font-bold">M</span>
            </div>
            <span className="text-gray-700 text-sm font-semibold">Mainstage Pro</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Formulario ─────────────────────────────────────────────────────────────

  const proyecto = evaluacion?.proyecto;
  const clienteNombre = proyecto?.cliente?.nombre ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center shrink-0">
            <span className="text-[#B3985B] text-sm font-bold">M</span>
          </div>
          <div>
            <p className="text-gray-900 text-sm font-bold leading-tight">Mainstage Pro</p>
            <p className="text-gray-400 text-[10px]">Evaluación de servicio</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
          <div className="w-14 h-14 bg-[#B3985B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎤</span>
          </div>
          <h1 className="text-gray-900 font-bold text-lg mb-1">Tu opinión nos ayuda a seguir mejorando</h1>
          <p className="text-gray-500 text-sm">Solo toma 2 minutos. Tu experiencia es muy valiosa para nosotros.</p>

          {proyecto && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
              <p className="text-gray-800 font-semibold text-sm">{proyecto.nombre}</p>
              {clienteNombre && (
                <p className="text-gray-500 text-xs">{clienteNombre}</p>
              )}
              {proyecto.fechaEvento && (
                <p className="text-gray-400 text-xs">{fmtDate(proyecto.fechaEvento)}</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre opcional */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <label className="block text-gray-700 font-semibold text-sm mb-2">
              ¿Cuál es tu nombre? <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              placeholder="Escribe tu nombre aquí..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#B3985B] transition-colors placeholder:text-gray-300"
            />
          </div>

          {/* Criterios de calificación */}
          {CRITERIOS.map((c, i) => (
            <div key={c.key} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xl">{c.emoji}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-gray-800 font-semibold text-sm">{c.label}</p>
                    {scores[c.key] !== null && (
                      <span className="text-sm font-bold text-gray-700">{scores[c.key]}/10</span>
                    )}
                    <ScoreLabel value={scores[c.key]} />
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{c.descripcion}</p>
                </div>
              </div>
              <StarRating value={scores[c.key]} onChange={(v) => setScore(c.key, v)} />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">Muy malo</span>
                <span className="text-[10px] text-gray-400">Excelente</span>
              </div>
            </div>
          ))}

          {/* NPS */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-xl">🔄</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-800 font-semibold text-sm">Probabilidad de recontratación</p>
                  {scores[NPS_KEY] !== null && (
                    <span className="text-sm font-bold text-gray-700">{scores[NPS_KEY]}/10</span>
                  )}
                  <ScoreLabel value={scores[NPS_KEY]} />
                </div>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                  ¿Qué tan probable es que vuelvas a contratar a Mainstage Pro o nos recomiendes con alguien?
                </p>
              </div>
            </div>
            <StarRating value={scores[NPS_KEY]} onChange={(v) => setScore(NPS_KEY as Campo, v)} />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">Nada probable</span>
              <span className="text-[10px] text-gray-400">Muy probable</span>
            </div>
          </div>

          {/* Lo mejor / Lo mejorable */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-1.5">
                ✨ ¿Qué fue lo que más te gustó? <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={loMejor}
                onChange={(e) => setLoMejor(e.target.value)}
                rows={3}
                placeholder="Cuéntanos qué estuvo genial..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#B3985B] transition-colors resize-none placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-1.5">
                🔧 ¿Qué podríamos mejorar? <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={loMejorable}
                onChange={(e) => setLoMejorable(e.target.value)}
                rows={3}
                placeholder="Toda retroalimentación es bienvenida..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#B3985B] transition-colors resize-none placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-1.5">
                💬 Comentarios adicionales <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={comentarioAdicional}
                onChange={(e) => setComentarioAdicional(e.target.value)}
                rows={3}
                placeholder="¿Hay algo más que quieras que sepamos?"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#B3985B] transition-colors resize-none placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pb-8">
            {!criteriosCompletos && (
              <p className="text-center text-gray-400 text-xs mb-3">
                Por favor califica todos los criterios para poder enviar
              </p>
            )}
            <button
              type="submit"
              disabled={!criteriosCompletos || enviando}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96e] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors text-sm shadow-sm"
            >
              {enviando ? "Enviando evaluación..." : "Enviar evaluación ✓"}
            </button>
            <p className="text-center text-gray-400 text-[10px] mt-3">
              Tus respuestas son confidenciales y solo las verá el equipo de Mainstage Pro.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
