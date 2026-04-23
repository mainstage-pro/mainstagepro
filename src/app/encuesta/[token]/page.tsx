"use client";

import { useEffect, useState, use } from "react";

interface EvaluacionData {
  id: string;
  respondida: boolean;
  proyecto: {
    nombre: string;
    fechaEvento: string;
    cliente: { nombre: string };
  };
}

const CRITERIOS = [
  { key: "satisfaccionGeneral",    label: "Satisfacción general",         desc: "¿Qué tan satisfecho quedaste con el servicio en general?" },
  { key: "calidadServicio",        label: "Calidad del servicio",         desc: "¿Cómo calificarías la calidad técnica del servicio brindado?" },
  { key: "puntualidad",            label: "Puntualidad",                  desc: "¿El equipo llegó y comenzó a tiempo según lo acordado?" },
  { key: "atencionEquipo",         label: "Atención del equipo",          desc: "¿Cómo fue el trato y actitud del personal durante el evento?" },
  { key: "claridadComunicacion",   label: "Claridad en la comunicación",  desc: "¿Fue fácil comunicarse con nosotros antes y durante el evento?" },
  { key: "relacionCalidadPrecio",  label: "Relación calidad-precio",      desc: "¿El servicio justificó la inversión realizada?" },
];

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

export default function EncuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<EvaluacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<Record<string, number | string>>({
    satisfaccionGeneral: 0,
    calidadServicio: 0,
    puntualidad: 0,
    atencionEquipo: 0,
    claridadComunicacion: 0,
    relacionCalidadPrecio: 0,
    probabilidadRecontratacion: 0,
    loMejor: "",
    loMejorable: "",
    comentarioAdicional: "",
  });

  useEffect(() => {
    fetch(`/api/evaluacion-cliente/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setData(d.evaluacion); if (d.evaluacion.respondida) setEnviado(true); }
      })
      .catch(() => setError("Error al cargar el formulario"))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/evaluacion-cliente/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setEnviado(true); }
    else { const d = await res.json(); setError(d.error ?? "Error al enviar"); }
    setSubmitting(false);
  }

  function setScore(key: string, val: number) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function colorBtn(selected: number, n: number) {
    if (selected !== n) return "bg-white/[0.04] text-white/35 hover:bg-white/8 hover:text-white/70 border border-white/6";
    if (n >= 9) return "bg-green-700 text-white border border-green-600";
    if (n >= 7) return "bg-[#B3985B] text-black border border-[#B3985B]";
    if (n >= 5) return "bg-yellow-600 text-black border border-yellow-500";
    return "bg-red-700 text-white border border-red-600";
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FONT }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6" style={{ fontFamily: FONT }}>
      <div className="text-center max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-30" draggable={false} />
        <p className="text-white/50 font-semibold mb-2">Enlace no disponible</p>
        <p className="text-white/25 text-sm">{error}</p>
      </div>
    </div>
  );

  if (enviado) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6" style={{ fontFamily: FONT }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-900/30 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-white font-bold text-xl mb-2">¡Gracias por tu opinión!</h2>
        <p className="text-white/35 text-sm mb-8 leading-relaxed">Tu evaluación fue recibida. Nos ayuda a mejorar para futuros eventos.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Mainstage Pro" className="h-4 mx-auto opacity-20" draggable={false} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black py-16 px-6" style={{ fontFamily: FONT }}>
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="Mainstage Pro" className="h-5 mx-auto mb-8 opacity-40" draggable={false} />
          <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-[0.25em] mb-3">Evaluación del servicio</p>
          <h1 className="text-white font-bold text-2xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            ¿Cómo fue tu experiencia?
          </h1>
          {data && (
            <div className="mt-2">
              <p className="text-[#B3985B] text-sm font-medium">{data.proyecto.nombre}</p>
              <p className="text-white/25 text-xs mt-0.5">
                {data.proyecto.cliente.nombre} · {new Date(data.proyecto.fechaEvento).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          )}
          <p className="text-white/25 text-sm mt-3">Califica del 1 al 10 cada criterio.</p>
        </div>

        {/* Criterios */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {CRITERIOS.map(({ key, label, desc }) => {
              const val = form[key] as number;
              return (
                <div key={key} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-white/85 text-sm font-semibold">{label}</p>
                      <p className="text-white/30 text-xs mt-0.5 leading-snug">{desc}</p>
                    </div>
                    <span className={`text-2xl font-black shrink-0 w-8 text-right leading-none ${
                      val === 0 ? "text-white/15"
                        : val >= 9 ? "text-green-400"
                        : val >= 7 ? "text-[#B3985B]"
                        : val >= 5 ? "text-yellow-400"
                        : "text-red-400"
                    }`} style={{ letterSpacing: "-0.03em" }}>
                      {val === 0 ? "—" : val}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button key={n} onClick={() => setScore(key, n)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${colorBtn(val, n)}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NPS */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
          <p className="text-white/85 text-sm font-semibold mb-1">¿Qué tan probable es que nos recomiendes?</p>
          <p className="text-white/25 text-xs mb-4">1 = muy poco probable · 10 = definitivamente lo haría</p>
          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button key={n} onClick={() => setScore("probabilidadRecontratacion", n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${colorBtn(form.probabilidadRecontratacion as number, n)}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Texto libre */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-white/85 text-sm font-semibold block mb-2">¿Qué fue lo mejor del servicio?</label>
            <textarea value={form.loMejor as string} onChange={e => setForm(p => ({ ...p, loMejor: e.target.value }))}
              rows={3} placeholder="Lo que más te gustó..."
              className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder-white/15 focus:outline-none focus:border-[#B3985B]/50 resize-none transition-colors" />
          </div>
          <div>
            <label className="text-white/85 text-sm font-semibold block mb-2">¿Qué podríamos mejorar?</label>
            <textarea value={form.loMejorable as string} onChange={e => setForm(p => ({ ...p, loMejorable: e.target.value }))}
              rows={3} placeholder="Áreas de oportunidad..."
              className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder-white/15 focus:outline-none focus:border-[#B3985B]/50 resize-none transition-colors" />
          </div>
          <div>
            <label className="text-white/85 text-sm font-semibold block mb-2">Comentario adicional <span className="text-white/25 font-normal">(opcional)</span></label>
            <textarea value={form.comentarioAdicional as string} onChange={e => setForm(p => ({ ...p, comentarioAdicional: e.target.value }))}
              rows={2} placeholder="Cualquier otro comentario..."
              className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder-white/15 focus:outline-none focus:border-[#B3985B]/50 resize-none transition-colors" />
          </div>
        </div>

        {/* Submit */}
        <button onClick={submit} disabled={submitting}
          className="w-full bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-40 text-black font-bold py-4 rounded-xl transition-colors text-sm shadow-[0_0_30px_rgba(179,152,91,0.15)]">
          {submitting ? "Enviando..." : "Enviar evaluación"}
        </button>

        <p className="text-center text-white/15 text-xs pb-4">
          Mainstage Pro · Tu privacidad está protegida
        </p>
      </div>
    </div>
  );
}
