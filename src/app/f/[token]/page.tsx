"use client";

import { useEffect, useState, use } from "react";
import { ClipboardList, MessageCircle } from "lucide-react";
import DiscoveryForm from "@/components/crm/DiscoveryForm";
import { ToastProvider } from "@/components/Toast";

// Página pública del descubrimiento del cliente (link por token).
// Renderiza EXACTAMENTE el mismo formulario que ve el vendedor internamente
// (DiscoveryForm) en "modo cliente": mismos pasos, campos y estética, pero
// ocultando lo interno (propuesta, Trade, render) y guardando vía /api/f/[token].

const SERVICIO_LABELS: Record<string, string> = {
  PRODUCCION_TECNICA: "Producción técnica", RENTA: "Renta de equipo", DIRECCION_TECNICA: "Dirección técnica",
};
const EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};

export default function FormProspectoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [trato, setTrato] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completado, setCompletado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [huerfano, setHuerfano] = useState(false);
  // Datos de contacto para links huérfanos (sin trato previo).
  const [contacto, setContacto] = useState({ nombre: "", whatsapp: "", correo: "", momentoContratacion: "" });

  useEffect(() => {
    fetch(`/api/f/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); setLoading(false); return; }
        if (d.huerfano) setHuerfano(true);
        if (d.completado) setCompletado(true);
        if (d.trato) setTrato(d.trato);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  // ── Pantalla de carga ──
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando formulario…</p>
    </div>
  );

  // ── Enviado con éxito ──
  if (enviado) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-600/40 flex items-center justify-center mx-auto text-3xl">✓</div>
        <h1 className="text-white text-xl font-semibold">¡Gracias por tu tiempo!</h1>
        <p className="text-gray-400 text-sm">
          Hemos recibido tu información. Nuestro equipo la revisará y te contactará pronto con una propuesta personalizada.
        </p>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 mt-2">
          <p className="text-gray-500 text-xs mb-3">Avisa a tu asesor que ya llenaste el formulario</p>
          <a
            href={`https://wa.me/524461432565?text=${encodeURIComponent(
              `Hola! Soy ${trato?.cliente?.nombre || contacto.nombre || "tu cliente"} y acabo de completar el formulario de información para mi evento. Ya pueden revisarlo 🎉`
            )}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.984-1.31A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
            Notificar a mi asesor
          </a>
        </div>
      </div>
    </div>
  );

  // ── Ya completado previamente — opción de actualizar ──
  if (completado && trato) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/40 flex items-center justify-center mx-auto"><ClipboardList strokeWidth={1.75} className="w-6 h-6 text-[#B3985B]" /></div>
        <h1 className="text-white text-lg font-semibold">Ya enviaste este formulario</h1>
        <p className="text-gray-400 text-sm">¿Cambió algo? Puedes actualizar tu información cuando quieras.</p>
        <button
          onClick={() => { setCompletado(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="w-full py-3 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/40 text-[#B3985B] text-sm font-semibold hover:bg-[#B3985B]/20 transition-colors"
        >
          Actualizar mi información →
        </button>
        <a
          href={`https://wa.me/524461432565?text=${encodeURIComponent(
            `Hola, soy ${trato.cliente?.nombre ?? "tu cliente"} y tengo dudas sobre mi evento`
          )}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-sm text-green-500 hover:text-green-400 transition-colors"
        >
          <MessageCircle strokeWidth={1.75} className="w-4 h-4" /> Contactar a mi asesor por WhatsApp
        </a>
      </div>
    </div>
  );

  // ── Completado sin trato (link huérfano ya usado) o no encontrado ──
  if (completado || notFound || !trato) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          {completado ? "Este formulario ya fue enviado. ¡Gracias!" : "Este formulario no existe o ha expirado."}
        </p>
        <a href="https://wa.me/524461432565" className="text-[#B3985B] text-sm mt-2 block">Contáctanos por WhatsApp</a>
      </div>
    </div>
  );

  const subtitulo = trato.rutaEntrada === "RIDER_DIRECTO"
    ? "Información del evento"
    : `${SERVICIO_LABELS[trato.tipoServicio ?? ""] ?? "Formulario de descubrimiento"}${trato.tipoEvento ? ` · ${EVENTO_LABELS[trato.tipoEvento] ?? trato.tipoEvento}` : ""}`;

  return (
    // ToastProvider: DiscoveryForm usa useToast(), que lanza sin provider.
    // La ruta pública /f no está bajo el layout de (dashboard), así que lo
    // montamos aquí para que el formulario funcione en el link del cliente.
    <ToastProvider>
    <div className="min-h-screen bg-[#0a0a0a]"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      {/* Header */}
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Mainstage Pro</p>
            <p className="text-white text-sm font-semibold mt-0.5">{subtitulo}</p>
          </div>
          {trato.cliente?.nombre && (
            <p className="text-gray-500 text-[10px] text-right shrink-0">Para: {trato.cliente.nombre}</p>
          )}
        </div>
      </div>

      {/* Formulario — idéntico al que ve el vendedor, en modo cliente */}
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <DiscoveryForm
          clientMode
          token={token}
          huerfano={huerfano}
          contacto={contacto}
          setContacto={setContacto}
          id={trato.id ?? ""}
          trato={trato}
          setTrato={setTrato}
          onComplete={() => { setEnviado(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      </div>
    </div>
    </ToastProvider>
  );
}
