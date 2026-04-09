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
    if (selected !== n) return "bg-[#1a1a1a] text-gray-400 hover:bg-[#252525] hover:text-white";
    if (n >= 9) return "bg-green-600 text-white";
    if (n >= 7) return "bg-[#B3985B] text-black";
    if (n >= 5) return "bg-yellow-600 text-black";
    return "bg-red-700 text-white";
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <p className="text-white font-semibold mb-2">Enlace no disponible</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (enviado) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-900/30 border border-green-700/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-green-400 text-2xl">✓</span>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">¡Gracias por tu opinión!</h2>
        <p className="text-gray-500 text-sm">Tu evaluación fue recibida. Nos ayuda a mejorar para futuros eventos.</p>
        <div className="mt-6 pt-5 border-t border-[#1a1a1a]">
          <div className="w-8 h-8 bg-[#B3985B] rounded-sm flex items-center justify-center mx-auto mb-2">
            <span className="text-black font-bold text-xs">M</span>
          </div>
          <p className="text-[#555] text-xs">Mainstage Pro</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pb-2">
          <div className="w-10 h-10 bg-[#B3985B] rounded-sm flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-bold text-sm">M</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">Evaluación del servicio</h1>
          {data && (
            <div>
              <p className="text-[#B3985B] font-medium">{data.proyecto.nombre}</p>
              <p className="text-gray-500 text-sm">
                {data.proyecto.cliente.nombre} · {new Date(data.proyecto.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          )}
          <p className="text-gray-600 text-sm pt-1">Tu opinión es muy valiosa para nosotros. Califica del 1 al 10 cada criterio.</p>
        </div>

        {/* Criterios */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#1a1a1a]">
            {CRITERIOS.map(({ key, label, desc }) => {
              const val = form[key] as number;
              return (
                <div key={key} className="px-5 py-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-white text-sm font-medium">{label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                    </div>
                    <span className={`text-2xl font-bold shrink-0 w-8 text-right ${val === 0 ? "text-gray-700" : val >= 9 ? "text-green-400" : val >= 7 ? "text-[#B3985B]" : val >= 5 ? "text-yellow-400" : "text-red-400"}`}>
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
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-white text-sm font-medium mb-1">¿Qué tan probable es que nos recomiendes?</p>
          <p className="text-gray-500 text-xs mb-4">1 = muy poco probable · 10 = definitivamente lo haría</p>
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
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-white text-sm font-medium block mb-1">¿Qué fue lo mejor del servicio?</label>
            <textarea value={form.loMejor as string} onChange={e => setForm(p => ({ ...p, loMejor: e.target.value }))}
              rows={3} placeholder="Lo que más te gustó..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>
          <div>
            <label className="text-white text-sm font-medium block mb-1">¿Qué podríamos mejorar?</label>
            <textarea value={form.loMejorable as string} onChange={e => setForm(p => ({ ...p, loMejorable: e.target.value }))}
              rows={3} placeholder="Áreas de oportunidad..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>
          <div>
            <label className="text-white text-sm font-medium block mb-1">Comentario adicional (opcional)</label>
            <textarea value={form.comentarioAdicional as string} onChange={e => setForm(p => ({ ...p, comentarioAdicional: e.target.value }))}
              rows={2} placeholder="Cualquier otro comentario..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none" />
          </div>
        </div>

        {/* Submit */}
        <button onClick={submit} disabled={submitting}
          className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold py-3.5 rounded-xl transition-colors text-sm">
          {submitting ? "Enviando..." : "Enviar evaluación"}
        </button>
        <p className="text-center text-gray-600 text-xs pb-4">
          Mainstage Pro · Tu privacidad está protegida
        </p>
      </div>
    </div>
  );
}
