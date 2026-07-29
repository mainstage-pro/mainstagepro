"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ActaPublica {
  folio: string;
  ambito?: string;
  colaborador: string;
  puesto: string | null;
  evento?: string | null;
  gravedad: string;
  gravedadLabel: string;
  nivelActaLabel?: string;
  nivelLabel: string;
  fecha: string;
  hechos: string;
  consecuencia: string;
  montoDescuento: number | null;
  descargo: string | null;
  aceptada: boolean;
  aceptadaEn: string | null;
}

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

function fmtFecha(s: string) {
  return new Date(s.length <= 10 ? s + "T12:00:00" : s).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}
function mxn(n: number) { return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" }); }

export default function AcusePage() {
  const { token } = useParams<{ token: string }>();
  const [acta, setActa] = useState<ActaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descargo, setDescargo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [firmada, setFirmada] = useState(false);

  useEffect(() => {
    fetch(`/api/acta/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "No se pudo cargar el acta"); return; }
        setActa(data.acta);
        if (data.acta?.aceptada) setFirmada(true);
      })
      .catch(() => setError("No se pudo cargar el acta"))
      .finally(() => setLoading(false));
  }, [token]);

  async function firmar() {
    if (!nombre.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/acta/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), descargo: descargo.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) setFirmada(true);
      else setError(data.error ?? "No se pudo registrar el acuse");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FONT }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6" style={{ fontFamily: FONT }}>
      <div className="max-w-sm text-center">
        <p className="text-white text-lg font-semibold mb-2">Enlace no disponible</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!acta) return null;

  const gravedadColor = acta.gravedad === "MUY_GRAVE" ? "text-red-400"
    : acta.gravedad === "GRAVE" ? "text-orange-400" : "text-yellow-400";

  return (
    <div className="min-h-screen bg-black text-white py-10 px-4" style={{ fontFamily: FONT }}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Encabezado */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">Acta administrativa</p>
          <p className="text-[#B3985B] text-sm font-semibold">{acta.folio}</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-white text-lg font-semibold">{acta.colaborador}</p>
            {acta.puesto && <p className="text-gray-500 text-sm">{acta.puesto}</p>}
            {acta.evento && <p className="text-[#B3985B] text-xs mt-1">Evento: {acta.evento}</p>}
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className={`font-medium ${gravedadColor}`}>{acta.nivelActaLabel ?? acta.gravedadLabel}</span>
            {acta.ambito !== "EVENTO" && <span className="text-gray-500">{acta.nivelLabel}</span>}
            <span className="text-gray-500">{fmtFecha(acta.fecha)}</span>
          </div>

          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Hechos</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{acta.hechos}</p>
          </div>

          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Consecuencia</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{acta.consecuencia}</p>
          </div>

          {acta.montoDescuento ? (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Descuento aplicable</p>
              <p className="text-sm font-semibold text-[#B3985B]">{mxn(acta.montoDescuento)}</p>
            </div>
          ) : null}
        </div>

        {/* Acuse */}
        {firmada ? (
          <div className="bg-green-900/20 border border-green-800 rounded-2xl p-6 text-center space-y-1">
            <p className="text-green-400 font-semibold">Acuse registrado</p>
            <p className="text-gray-400 text-sm">
              Confirmaste que recibiste esta acta y quedaste enterado.
              {acta.aceptadaEn ? ` (${fmtFecha(acta.aceptadaEn)})` : ""}
            </p>
            {acta.descargo && (
              <div className="text-left pt-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Tu descargo</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{acta.descargo}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              Firmar de enterado no implica aceptar responsabilidad; confirma que recibiste
              y leíste esta acta. Puedes añadir tu versión de los hechos (descargo).
            </p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Descargo (opcional)</label>
              <textarea value={descargo} onChange={e => setDescargo(e.target.value)} rows={3}
                placeholder="Si deseas dejar constancia de tu versión…"
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] resize-y" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Escribe tu nombre para firmar</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <button onClick={firmar} disabled={submitting || !nombre.trim()}
              className="w-full bg-[#B3985B] text-black text-sm font-semibold rounded-lg py-3 hover:bg-[#c9a96a] transition-colors disabled:opacity-40">
              {submitting ? "Registrando…" : "Firmar de enterado"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
