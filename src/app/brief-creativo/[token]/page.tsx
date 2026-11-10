"use client";

import { useEffect, useState, use } from "react";
import { Sparkles, MessageCircle } from "lucide-react";
import { ToastProvider } from "@/components/Toast";
import BriefCreativoForm from "@/components/creative/BriefCreativoForm";
import { parseBriefDetalle } from "@/lib/brief-creativo";

type ProyectoPublico = {
  id: string;
  numero: string;
  nombre: string;
  briefDetalle: string | null;
  formEstado: string | null;
  fechaEntrega: string | null;
  cliente: { nombre: string; empresa: string | null } | null;
  artista: { nombre: string; logoUrl: string | null } | null;
};

export default function BriefCreativoPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [proyecto, setProyecto] = useState<ProyectoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/brief-creativo/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); setLoading(false); return; }
        setProyecto(d.proyecto);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  async function guardarParcial(json: string | null) {
    await fetch(`/api/brief-creativo/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefDetalle: json, final: false }),
    });
  }

  async function enviarFinal() {
    setEnviando(true);
    await fetch(`/api/brief-creativo/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ final: true }),
    });
    setEnviando(false);
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando brief…</p>
    </div>
  );

  if (notFound || !proyecto) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Este link no existe o ha expirado.</p>
        <a href="https://wa.me/524461432565" className="text-[#B3985B] text-sm mt-2 block">Contáctanos por WhatsApp</a>
      </div>
    </div>
  );

  if (enviado) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#B3985B]/15 border border-[#B3985B]/40 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-[#B3985B]" strokeWidth={1.75} />
        </div>
        <h1 className="text-white text-xl font-semibold">¡Gracias, {proyecto.cliente?.nombre ?? proyecto.artista?.nombre ?? ""}!</h1>
        <p className="text-gray-400 text-sm">
          Recibimos el brief de <span className="text-white">{proyecto.nombre}</span>. Nuestro equipo de diseño lo revisará
          y te contactaremos con la propuesta creativa.
        </p>
        <a
          href={`https://wa.me/524461432565?text=${encodeURIComponent(
            `Hola! Acabo de llenar el brief creativo de "${proyecto.nombre}" 🎨`
          )}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> Avisar a mi asesor
        </a>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0a0a]"
           style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
        <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-5">
          <div className="max-w-2xl mx-auto">
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-[0.2em]">Mainstage Creative</p>
            <h1 className="text-white text-xl font-semibold mt-1">{proyecto.nombre}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Cuéntanos qué te imaginas para el show — mientras más detalle, mejor sale el diseño.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 md:p-6">
          <BriefCreativoForm
            variante="cliente"
            respuestasIniciales={parseBriefDetalle(proyecto.briefDetalle)}
            archivosEndpoint={`/api/brief-creativo/${token}/archivos`}
            onGuardar={guardarParcial}
            onEnviarFinal={enviarFinal}
            enviando={enviando}
          />
        </div>
      </div>
    </ToastProvider>
  );
}
