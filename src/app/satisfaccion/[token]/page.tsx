"use client";

import { useEffect, useState, use } from "react";
import EncuestaSatisfaccionForm from "@/components/EncuestaSatisfaccionForm";
import type { Respuestas } from "@/lib/satisfaccion-form";

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

export default function SatisfaccionTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ nombre: string; puesto: string; periodo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yaRespondida, setYaRespondida] = useState(false);

  useEffect(() => {
    fetch(`/api/rrhh/encuestas-satisfaccion/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const e = d.encuesta;
        setData({ nombre: e.personal.nombre, puesto: e.personal.puesto, periodo: e.periodo });
        if (e.respondida) setYaRespondida(true);
      })
      .catch(() => setError("No se pudo cargar la encuesta"))
      .finally(() => setLoading(false));
  }, [token]);

  const enviar = async (respuestas: Respuestas): Promise<{ ok: boolean; error?: string }> => {
    const r = await fetch(`/api/rrhh/encuestas-satisfaccion/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuestas }),
    });
    if (r.ok) return { ok: true };
    const d = await r.json().catch(() => ({}));
    return { ok: false, error: d.error };
  };

  if (loading) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[#555] text-sm">Cargando...</p>
    </div>
  );

  if (error || !data) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-red-400 text-xl font-bold mb-2">Encuesta no disponible</p>
        <p className="text-[#555] text-sm">{error || "No se encontró la encuesta"}</p>
      </div>
    </div>
  );

  if (yaRespondida) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-white text-xl font-bold mb-2">¡Gracias, {data.nombre}!</h1>
        <p className="text-[#555] text-sm leading-relaxed">Esta encuesta ya fue respondida.</p>
      </div>
    </div>
  );

  return (
    <EncuestaSatisfaccionForm
      nombre={data.nombre}
      puesto={data.puesto}
      periodo={data.periodo}
      onSubmit={enviar}
    />
  );
}
