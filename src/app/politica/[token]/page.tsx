"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PoliticaData {
  titulo: string;
  categoria: string;
  version: number;
  html: string;
  aceptado: boolean;
  aceptadoNombre: string | null;
  aceptadoEn: string | null;
  personalNombre: string | null;
}

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

export default function PoliticaAcusePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PoliticaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch(`/api/acuse-politica/${token}`, { cache: "no-store" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo cargar el documento");
      setLoading(false);
      return;
    }
    const d = await res.json();
    setData(d);
    if (d.personalNombre && !d.aceptado) setNombre(d.personalNombre);
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  async function aceptar() {
    if (!nombre.trim() || !acepto) return;
    setSubmitting(true);
    const res = await fetch(`/api/acuse-politica/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (res.ok) { await load(); }
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo registrar el acuse");
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FONT }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6" style={{ fontFamily: FONT }}>
      <div className="text-center">
        <p className="text-[#B3985B] text-lg font-semibold mb-2">MAINSTAGE PRODUCCIONES</p>
        <p className="text-gray-400 text-sm">{error || "Documento no encontrado"}</p>
      </div>
    </div>
  );

  const fmtFecha = (s: string | null) =>
    s ? new Date(s).toLocaleString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: FONT }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <p className="text-[#B3985B] text-sm font-semibold tracking-widest">MAINSTAGE PRODUCCIONES</p>
          <h1 className="text-2xl font-bold mt-2">{data.titulo}</h1>
          <p className="text-gray-500 text-sm mt-1">{data.categoria} · versión {data.version}</p>
        </div>

        <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-6 md:p-8">
          <div className="politica-contenido text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: data.html }} />
        </div>

        {data.aceptado ? (
          <div className="bg-green-900/20 border border-green-800/40 rounded-2xl p-6 text-center">
            <p className="text-green-400 font-semibold">Documento firmado de conformidad</p>
            <p className="text-gray-400 text-sm mt-2">Firmado por <span className="text-white">{data.aceptadoNombre}</span></p>
            <p className="text-gray-600 text-xs mt-1">{fmtFecha(data.aceptadoEn)}</p>
          </div>
        ) : (
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-6 space-y-4">
            <p className="text-sm text-gray-300">Confirma que has leído y estás de acuerdo con la presente política.</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Escribe tu nombre completo" />
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 accent-[#B3985B]" />
              <span>He leído esta política, entiendo su contenido y me comprometo a cumplirla.</span>
            </label>
            <button onClick={aceptar} disabled={submitting || !nombre.trim() || !acepto}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm py-3 rounded-xl transition-colors">
              {submitting ? "Registrando..." : "Acepto y me comprometo a cumplirla"}
            </button>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs">Documento interno · Uso exclusivo del equipo Mainstage</p>
      </div>

      <style jsx global>{`
        .politica-contenido h1 { font-size: 1.5rem; font-weight: 700; margin: 1.2rem 0 0.6rem; color: #fff; }
        .politica-contenido h2 { font-size: 1.2rem; font-weight: 700; margin: 1.1rem 0 0.5rem; color: #B3985B; }
        .politica-contenido h3 { font-size: 1.05rem; font-weight: 600; margin: 1rem 0 0.4rem; color: #fff; }
        .politica-contenido p { margin: 0.5rem 0; }
        .politica-contenido ul, .politica-contenido ol { margin: 0.5rem 0 0.5rem 1.25rem; }
        .politica-contenido ul { list-style: disc; }
        .politica-contenido ol { list-style: decimal; }
        .politica-contenido li { margin: 0.2rem 0; }
        .politica-contenido a { color: #B3985B; text-decoration: underline; }
        .politica-contenido strong { color: #fff; font-weight: 600; }
        .politica-contenido blockquote { border-left: 3px solid #B3985B; padding-left: 0.9rem; margin: 0.6rem 0; color: #cbd5e1; }
        .politica-contenido table { width: 100%; border-collapse: collapse; margin: 0.6rem 0; font-size: 0.85rem; }
        .politica-contenido th, .politica-contenido td { border: 1px solid #333; padding: 0.4rem 0.6rem; text-align: left; }
        .politica-contenido code { background: #1a1a1a; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85em; }
        .politica-contenido hr { border: none; border-top: 1px solid #222; margin: 1rem 0; }
      `}</style>
    </div>
  );
}
