"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, PartyPopper } from "lucide-react";

// ─── 5 preguntas fijas ────────────────────────────────────────────────────────

const PREGUNTAS: { key: string; pregunta: string }[] = [
  {
    key: "satisfaccionGeneral",
    pregunta: "¿Qué tan satisfecho quedaste con el resultado del evento?",
  },
  {
    key: "calidadServicio",
    pregunta: "¿El servicio brindado estuvo a la altura de lo que esperabas?",
  },
  {
    key: "puntualidad",
    pregunta: "¿El equipo cumplió con los tiempos y horarios acordados?",
  },
  {
    key: "atencionEquipo",
    pregunta: "¿El trato y la atención del equipo fue profesional y amable?",
  },
  {
    key: "probabilidadRecontratacion",
    pregunta: "¿Volverías a contratar nuestros servicios?",
  },
];

// Escala de emojis — 1 a 5 (se mapea a 1-10 al guardar × 2)
const OPCIONES = [
  { valor: 1, emoji: "😞", label: "Muy mal" },
  { valor: 2, emoji: "😕", label: "Mal" },
  { valor: 3, emoji: "😐", label: "Regular" },
  { valor: 4, emoji: "😊", label: "Bien" },
  { valor: 5, emoji: "😄", label: "Excelente" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProyectoInfo {
  nombre: string;
  fechaEvento: string | null;
  cliente: { nombre: string } | null;
}

type Scores = Record<string, number | null>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvaluacionPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [yaRespondida, setYaRespondida] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null);

  const [scores, setScores] = useState<Scores>(() =>
    Object.fromEntries(PREGUNTAS.map((p) => [p.key, null]))
  );
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    fetch(`/api/evaluacion-cliente/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.respondida) { setYaRespondida(true); setProyecto(d.proyecto); }
        else setProyecto(d.proyecto);
      })
      .catch(() => setError("No pudimos cargar el formulario. Verifica el enlace."))
      .finally(() => setLoading(false));
  }, [token]);

  const completo = PREGUNTAS.every((p) => scores[p.key] !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!completo) return;
    setEnviando(true);
    try {
      // Mapeamos escala 1-5 → 2-10 para guardar en los campos existentes (1-10)
      const toDb = (v: number | null) => v !== null ? v * 2 : null;

      const body = {
        satisfaccionGeneral:       toDb(scores.satisfaccionGeneral),
        calidadServicio:           toDb(scores.calidadServicio),
        puntualidad:               toDb(scores.puntualidad),
        atencionEquipo:            toDb(scores.atencionEquipo),
        claridadComunicacion:      null,
        relacionCalidadPrecio:     null,
        probabilidadRecontratacion: toDb(scores.probabilidadRecontratacion),
        loMejor:                   null,
        loMejorable:               null,
        comentarioAdicional:       comentario.trim() || null,
      };

      const res = await fetch(`/api/evaluacion-cliente/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Ocurrió un error al enviar. Intenta de nuevo.");
        return;
      }
      setEnviado(true);
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !proyecto) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle strokeWidth={1.75} className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-white font-bold text-lg mb-2">Enlace no válido</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Ya respondida ────────────────────────────────────────────────────────────

  if (yaRespondida) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 strokeWidth={1.75} className="w-9 h-9 text-[#B3985B]" />
          </div>
          <h1 className="text-white font-bold text-xl mb-2">¡Ya enviaste tu evaluación!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Gracias por tomarte el tiempo de evaluarnos
            {proyecto?.cliente?.nombre ? `, ${proyecto.cliente.nombre}` : ""}.
            Tu opinión es muy importante para nosotros.
          </p>
          <Logo />
        </div>
      </div>
    );
  }

  // ── Enviado con éxito ────────────────────────────────────────────────────────

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-5"><PartyPopper strokeWidth={1.75} className="w-12 h-12 text-[#B3985B]" /></div>
          <h1 className="text-white font-bold text-xl mb-3">¡Muchas gracias!</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            Recibimos tu evaluación
            {proyecto?.cliente?.nombre ? `, ${proyecto.cliente.nombre}` : ""}.
          </p>
          <p className="text-gray-600 text-xs mb-8">
            Tu opinión nos ayuda a seguir mejorando cada evento.
          </p>
          <Logo />
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center shrink-0">
            <span className="text-[#B3985B] text-sm font-bold">M</span>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Mainstage Pro</p>
            <p className="text-gray-600 text-[10px]">Evaluación del servicio</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-lg mx-auto px-4 py-7 space-y-5">

          {/* Intro card */}
          <div className="bg-gradient-to-br from-[#B3985B]/10 to-[#0d0d0d] border border-[#B3985B]/20 rounded-2xl p-6">
            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">
              Evaluación del servicio
            </p>
            <h1 className="text-white text-lg font-bold mb-1">
              {proyecto?.nombre ?? "Tu evento"}
            </h1>
            {proyecto?.cliente?.nombre && (
              <p className="text-gray-400 text-sm">Hola, {proyecto.cliente.nombre}</p>
            )}
            <p className="text-gray-500 text-xs mt-3 leading-relaxed">
              Tu opinión nos importa. Responde estas 5 preguntas — toma menos de un minuto.
            </p>
          </div>

          {/* Preguntas */}
          {PREGUNTAS.map((p, idx) => {
            const val = scores[p.key];
            return (
              <div key={p.key} className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#B3985B]/15 border border-[#B3985B]/30 text-[#B3985B] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-white text-sm font-medium leading-snug">{p.pregunta}</p>
                  </div>
                </div>
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between gap-2">
                    {OPCIONES.map((op) => {
                      const selected = val === op.valor;
                      return (
                        <button
                          key={op.valor}
                          type="button"
                          onClick={() => setScores((prev) => ({ ...prev, [p.key]: op.valor }))}
                          className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                            selected
                              ? "border-[#B3985B] bg-[#B3985B]/10 scale-105"
                              : "border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#3a3a3a] hover:bg-[#161616]"
                          }`}
                        >
                          <span
                            className={`text-2xl transition-all ${selected ? "scale-110" : "grayscale opacity-60"}`}
                          >
                            {op.emoji}
                          </span>
                          <span
                            className={`text-[9px] font-medium hidden sm:block ${
                              selected ? "text-[#B3985B]" : "text-gray-700"
                            }`}
                          >
                            {op.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Comentarios */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
              <h2 className="text-white text-sm font-medium">¿Quieres agregar algo más?</h2>
              <p className="text-gray-500 text-xs mt-0.5">Opcional — cualquier comentario, sugerencia o detalle que quieras compartir.</p>
            </div>
            <div className="px-5 py-5">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                placeholder="Escribe aquí lo que quieras..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none transition-colors placeholder:text-gray-700 leading-relaxed"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="pb-8 space-y-3">
            {!completo && (
              <p className="text-center text-gray-700 text-xs">
                Responde las {PREGUNTAS.length} preguntas para poder enviar
              </p>
            )}
            <button
              type="submit"
              disabled={!completo || enviando}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              {enviando ? "Enviando..." : "Enviar evaluación ✓"}
            </button>
            <p className="text-center text-gray-700 text-[10px]">
              Tu opinión es confidencial y nos ayuda a mejorar.
            </p>
          </div>

        </div>
      </form>
    </div>
  );
}

// ─── Logo footer ──────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-6 h-6 rounded-md bg-[#111] border border-[#2a2a2a] flex items-center justify-center">
        <span className="text-[#B3985B] text-xs font-bold">M</span>
      </div>
      <span className="text-gray-500 text-sm font-semibold">Mainstage Pro</span>
    </div>
  );
}
