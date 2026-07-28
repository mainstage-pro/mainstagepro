"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Snapshot {
  tipo: "OFERTA" | "ACUERDO";
  personaNombre: string;
  puestoNombre: string;
  area: string;
}
interface AcuseData {
  tipo: "OFERTA" | "ACUERDO";
  aceptado: boolean;
  aceptadoNombre: string | null;
  aceptadoEn: string | null;
  snapshot: Snapshot;
}

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';
const TIPO_LABEL: Record<string, string> = { OFERTA: "Oferta de trabajo", ACUERDO: "Acuerdo laboral" };

export default function AcusePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<AcuseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acepto, setAcepto] = useState(false);

  async function load() {
    const res = await fetch(`/api/acuse/${token}`, { cache: "no-store" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo cargar el documento");
      setLoading(false);
      return;
    }
    const d = await res.json();
    setData(d);
    if (d.snapshot?.personaNombre && !d.aceptado) setNombre(d.snapshot.personaNombre);
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  async function aceptar() {
    if (!nombre.trim() || !acepto) return;
    setSubmitting(true);
    const res = await fetch(`/api/acuse/${token}`, {
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
          <h1 className="text-2xl font-bold mt-2">{TIPO_LABEL[data.tipo]}</h1>
          <p className="text-gray-500 text-sm mt-1">{data.snapshot.personaNombre} · {data.snapshot.puestoNombre} · {data.snapshot.area}</p>
        </div>

        <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl overflow-hidden">
          <iframe src={`/api/acuse/${token}/pdf`} className="w-full h-[70vh] bg-white" title="Documento" />
        </div>

        {data.aceptado ? (
          <div className="bg-green-900/20 border border-green-800/40 rounded-2xl p-6 text-center">
            <p className="text-green-400 font-semibold">Documento recibido de conformidad</p>
            <p className="text-gray-400 text-sm mt-2">Aceptado por <span className="text-white">{data.aceptadoNombre}</span></p>
            <p className="text-gray-600 text-xs mt-1">{fmtFecha(data.aceptadoEn)}</p>
          </div>
        ) : (
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-6 space-y-4">
            <p className="text-sm text-gray-300">Confirma que has leído y recibes de conformidad el presente documento.</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Escribe tu nombre completo" />
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 accent-[#B3985B]" />
              <span>He leído el documento y lo recibo de conformidad. Entiendo su contenido y estoy de acuerdo con las condiciones aquí descritas.</span>
            </label>
            <button onClick={aceptar} disabled={submitting || !nombre.trim() || !acepto}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm py-3 rounded-xl transition-colors">
              {submitting ? "Registrando..." : "Acepto y recibo de conformidad"}
            </button>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs">Documento confidencial · Uso exclusivo de las partes</p>
      </div>
    </div>
  );
}
