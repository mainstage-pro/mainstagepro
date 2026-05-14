"use client";

import { useEffect, useState, use } from "react";

const CRITERIOS = [
  { key: "claridadInstrucciones", label: "Claridad de instrucciones",    desc: "¿Las instrucciones y tareas que te damos son claras y comprensibles?" },
  { key: "pagosPuntuales",        label: "Puntualidad de pagos",         desc: "¿Tus pagos llegan a tiempo según lo acordado?" },
  { key: "tratoJusto",            label: "Trato justo",                  desc: "¿Sientes que te tratan de forma justa y con respeto?" },
  { key: "organizacion",          label: "Organización",                 desc: "¿Mainstage está bien organizada para que puedas hacer tu trabajo?" },
  { key: "comunicacion",          label: "Comunicación contigo",         desc: "¿La comunicación que tenemos contigo es fluida y a tiempo?" },
  { key: "herramientas",          label: "Herramientas y equipo",        desc: "¿Tienes el equipo y las herramientas que necesitas para trabajar?" },
  { key: "crecimiento",           label: "Oportunidad de crecimiento",   desc: "¿Sientes que puedes aprender y crecer trabajando con Mainstage?" },
  { key: "ambiente",              label: "Ambiente de trabajo",          desc: "¿Cómo calificarías el ambiente general durante los eventos?" },
];

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

function ScoreBtn({ n, selected, onClick }: { n: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: FONT }}
      className={`w-9 h-9 rounded-xl border text-sm font-semibold transition-all ${
        selected
          ? n >= 8 ? "bg-green-700 border-green-500 text-white" : n >= 5 ? "bg-yellow-700 border-yellow-500 text-white" : "bg-red-700 border-red-500 text-white"
          : "border-[#333] text-[#666] hover:border-[#555] hover:text-white"
      }`}
    >
      {n}
    </button>
  );
}

export default function SatisfaccionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ nombre: string; puesto: string; periodo: string; respondida: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [nps, setNps] = useState(0);
  const [loMejor, setLoMejor] = useState("");
  const [loMejorable, setLoMejorable] = useState("");
  const [comentarios, setComentarios] = useState("");

  useEffect(() => {
    fetch(`/api/rrhh/encuestas-satisfaccion/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const e = d.encuesta;
        setData({ nombre: e.personal.nombre, puesto: e.personal.puesto, periodo: e.periodo, respondida: e.respondida });
        if (e.respondida) setEnviado(true);
      })
      .catch(() => setError("No se pudo cargar la encuesta"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    setSubmitting(true);
    const r = await fetch(`/api/rrhh/encuestas-satisfaccion/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scores, probabilidadRecomendar: nps, loMejor, loMejorable, comentarios }),
    });
    if (r.ok) { setEnviado(true); } else { setError("Error al enviar. Intenta de nuevo."); }
    setSubmitting(false);
  };

  const completados = Object.keys(scores).length;
  const listo = completados >= 6 && nps > 0;

  if (loading) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[#555] text-sm">Cargando...</p>
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-red-400 text-xl font-bold mb-2">Error</p>
        <p className="text-[#555] text-sm">{error}</p>
      </div>
    </div>
  );

  if (enviado) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-white text-xl font-bold mb-2">¡Gracias, {data?.nombre}!</h1>
        <p className="text-[#555] text-sm leading-relaxed">
          Tu respuesta ha sido registrada. Tu opinión nos ayuda a mejorar como empresa y como equipo.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-3">Mainstage Pro</p>
          <h1 className="text-white text-2xl font-bold mb-1">Encuesta de Satisfacción</h1>
          <p className="text-[#555] text-sm">{data?.nombre} · {data?.puesto}</p>
          <p className="text-[#333] text-xs mt-1">Período: {data?.periodo}</p>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-sm text-[#777] leading-relaxed">
          Tus respuestas son confidenciales y se usan para mejorar la experiencia de todo el equipo.
          No hay respuestas correctas o incorrectas. Por favor responde con honestidad.
        </div>

        {/* Criterios */}
        {CRITERIOS.map(c => (
          <div key={c.key} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <p className="text-white text-sm font-semibold mb-0.5">{c.label}</p>
            <p className="text-[#555] text-xs mb-4">{c.desc}</p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <ScoreBtn key={n} n={n} selected={scores[c.key] === n} onClick={() => setScores(p => ({ ...p, [c.key]: n }))} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[#444] mt-1.5 px-0.5">
              <span>Muy mal</span><span>Excelente</span>
            </div>
          </div>
        ))}

        {/* NPS */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-0.5">¿Recomendarías trabajar en Mainstage a un amigo? *</p>
          <p className="text-[#555] text-xs mb-4">Del 0 (definitivamente no) al 10 (definitivamente sí)</p>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 11 }, (_, i) => i).map(n => (
              <ScoreBtn key={n} n={n} selected={nps === n} onClick={() => setNps(n)} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#444] mt-1.5 px-0.5">
            <span>No recomendaría</span><span>Totalmente</span>
          </div>
        </div>

        {/* Texto libre */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-white text-sm font-semibold mb-2">¿Qué es lo que más valoras de trabajar en Mainstage?</label>
            <textarea
              value={loMejor}
              onChange={e => setLoMejor(e.target.value)}
              placeholder="Lo que más te gusta, lo que te hace seguir trabajando con nosotros..."
              rows={3}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-semibold mb-2">¿Qué cambiarías o mejorarías?</label>
            <textarea
              value={loMejorable}
              onChange={e => setLoMejorable(e.target.value)}
              placeholder="Algo que te gustaría que cambiara: organización, pagos, comunicación, trato, equipos..."
              rows={3}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-semibold mb-2">Comentarios adicionales (opcional)</label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              placeholder="Cualquier otra cosa que quieras compartir..."
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Enviar */}
        <div className="pb-8">
          <button
            onClick={submit}
            disabled={submitting || !listo}
            className="w-full bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm py-4 rounded-xl transition-all"
          >
            {submitting ? "Enviando..." : "Enviar encuesta"}
          </button>
          {!listo && (
            <p className="text-center text-[#444] text-xs mt-2">
              Completa al menos 6 criterios y la pregunta de recomendación para enviar.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
