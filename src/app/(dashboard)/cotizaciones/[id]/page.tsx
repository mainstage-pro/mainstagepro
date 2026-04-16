"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPct } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { CopyButton } from "@/components/CopyButton";

interface Linea {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  nivel: string | null;
  jornada: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
  esIncluido: boolean;
  notas: string | null;
}

interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  version: number;
  estado: string;
  nombreEvento: string | null;
  tipoEvento: string | null;
  tipoServicio: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  diasEquipo: number;
  diasOperacion: number;
  notasSecciones: string | null;
  subtotalEquiposBruto: number;
  descuentoTotalPct: number;
  montoDescuento: number;
  subtotalEquiposNeto: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  costosTotalesEstimados: number;
  utilidadEstimada: number;
  porcentajeUtilidad: number;
  planPagos: string | null;
  mainstageTradeData: string | null;
  observaciones: string | null;
  vigenciaDias: number;
  createdAt: string;
  aprobacionToken: string | null;
  aprobacionFecha: string | null;
  aprobacionNombre: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; tipoCliente: string; telefono: string | null };
  trato: { id: string; tipoEvento: string; etapa: string };
  creadaPor: { name: string } | null;
  lineas: Linea[];
  proyecto: { id: string; numeroProyecto: string; estado: string } | null;
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-700 text-gray-300",
  ENVIADA: "bg-blue-900/50 text-blue-300",
  APROBADA: "bg-green-900/50 text-green-300",
  RECHAZADA: "bg-red-900/50 text-red-300",
  VENCIDA: "bg-gray-800 text-gray-500",
  // Legacy display only — not selectable
  EN_REVISION: "bg-yellow-900/50 text-yellow-300",
  AJUSTE_SOLICITADO: "bg-orange-900/50 text-orange-300",
  REENVIADA: "bg-blue-900/50 text-blue-300",
};

const ESTADOS_FLUJO = ["BORRADOR", "ENVIADA", "APROBADA", "RECHAZADA"];

const TIPO_LINEA_LABELS: Record<string, string> = {
  TRANSPORTE: "Transporte",
  COMIDA: "Alimentación",
  HOSPEDAJE: "Hospedaje",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CotizacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [cot, setCot] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [linkAprobacion, setLinkAprobacion] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingTrade, setSavingTrade] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

  async function guardarComoPlantilla() {
    if (!cot) return;
    const nombre = window.prompt("Nombre de la plantilla:", cot.nombreEvento ? `${cot.nombreEvento} - ${cot.tipoEvento ?? ""}` : cot.numeroCotizacion);
    if (!nombre) return;
    setGuardandoPlantilla(true);
    const res = await fetch("/api/plantillas-cotizacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        tipoEvento: cot.tipoEvento ?? null,
        tipoServicio: cot.tipoServicio ?? null,
        cotizacionId: cot.id,
        diasEquipo: cot.diasEquipo,
        diasOperacion: cot.diasOperacion,
        observaciones: cot.observaciones,
        vigenciaDias: cot.vigenciaDias,
        aplicaIva: cot.aplicaIva,
      }),
    });
    setGuardandoPlantilla(false);
    if (res.ok) toast.success("Plantilla guardada");
    else toast.error("Error al guardar plantilla");
  }

  useEffect(() => {
    fetch(`/api/cotizaciones/${id}`)
      .then((r) => r.json())
      .then((d) => { setCot(d.cotizacion); setLoading(false); });
  }, [id]);

  async function cambiarEstado(estado: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Error al cambiar estado");
      } else {
        setCot((prev) => prev ? { ...prev, estado: d.cotizacion?.estado ?? estado } : prev);
        toast.success("Estado actualizado");
      }
    } catch {
      toast.error("Error de conexión al cambiar el estado");
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(plan: object) {
    setSavingPlan(true);
    const res = await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planPagos: JSON.stringify(plan) }),
    });
    if (res.ok) {
      setCot(prev => prev ? { ...prev, planPagos: JSON.stringify(plan) } : prev);
      setEditingPlan(false);
    }
    setSavingPlan(false);
  }

  async function saveTrade(data: object) {
    setSavingTrade(true);
    const res = await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainstageTradeData: JSON.stringify(data) }),
    });
    if (res.ok) {
      setCot(prev => prev ? { ...prev, mainstageTradeData: JSON.stringify(data) } : prev);
    }
    setSavingTrade(false);
  }

  async function duplicar() {
    const ok = await confirm({ message: "¿Duplicar esta cotización? Se creará una copia en estado Borrador.", confirmText: "Duplicar", danger: false });
    if (!ok) return;
    setDuplicando(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}/duplicar`, { method: "POST" });
      const d = await res.json();
      if (res.ok) { toast.success("Cotización duplicada"); router.push(`/cotizaciones/${d.id}`); }
      else toast.error(d.error ?? "Error al duplicar");
    } finally {
      setDuplicando(false);
    }
  }

  async function eliminar() {
    const ok = await confirm({ message: "¿Eliminar esta cotización? Esta acción no se puede deshacer.", danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    setDeleting(true);
    await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
    router.push("/cotizaciones");
  }

  async function aprobar() {
    const ok = await confirm({ message: "¿Aprobar esta cotización y crear el proyecto? El trato pasará a Venta Cerrada.", confirmText: "Aprobar y crear proyecto", danger: false });
    if (!ok) return;
    setAprobando(true);
    const res = await fetch(`/api/cotizaciones/${id}/aprobar`, { method: "POST" });
    const data = await res.json();
    if (data.proyectoId) {
      toast.success("Proyecto creado exitosamente");
      router.push(`/proyectos/${data.proyectoId}`);
    } else {
      toast.error(data.error ?? "Error al crear proyecto");
      setAprobando(false);
    }
  }

  async function generarLinkAprobacion() {
    setGenerandoLink(true);
    const res = await fetch(`/api/cotizaciones/${id}/link-aprobacion`, { method: "POST" });
    const d = await res.json();
    if (d.url) {
      setLinkAprobacion(d.url);
      // Inicializar con token existente si ya tenía
      if (cot && !cot.aprobacionToken) {
        setCot(prev => prev ? { ...prev, estado: "ENVIADA", aprobacionToken: d.token } : prev);
      }
    }
    setGenerandoLink(false);
  }

  async function copiarLink() {
    if (!linkAprobacion) return;
    await navigator.clipboard.writeText(linkAprobacion);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  }

  async function sharePdf() {
    if (!cot) return;
    setSharingPdf(true);
    try {
      const pdfUrl = `/api/cotizaciones/${cot.id}/pdf`;
      const filename = `${cot.numeroCotizacion}${cot.nombreEvento ? `-${cot.nombreEvento.replace(/\s+/g, "-")}` : ""}.pdf`;

      // Solo usar Web Share API en móvil (iOS/Android)
      // En desktop macOS/Windows abre AirDrop/share sheet en lugar de descargar
      const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile && typeof navigator !== "undefined" && navigator.canShare) {
        const res = await fetch(pdfUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
        // Fallback móvil: share URL
        if (navigator.share) {
          await navigator.share({ title: filename, url: window.location.origin + pdfUrl });
          return;
        }
      }

      // Desktop o fallback: descarga directa a carpeta de descargas
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        const a = document.createElement("a");
        a.href = `/api/cotizaciones/${cot.id}/pdf`;
        a.download = `${cot.numeroCotizacion}.pdf`;
        a.click();
      }
    } finally {
      setSharingPdf(false);
    }
  }

  if (loading) return <div className="text-gray-400 text-sm p-6">Cargando...</div>;
  if (!cot) return <div className="text-red-400 text-sm p-6">Cotización no encontrada</div>;

  // Viabilidad recalculada en vivo (ignora valor guardado en BD)
  const costoVivo = cot.lineas
    .filter(l => !l.esIncluido && ["OPERACION_TECNICA", "DJ", "TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo))
    .reduce((s, l) => s + l.subtotal, 0);
  const utilidadViva = cot.total - costoVivo;
  const pctVivo = cot.total > 0 ? utilidadViva / cot.total : 0;
  const semaforo = pctVivo >= 0.55 ? "IDEAL" : pctVivo >= 0.40 ? "REGULAR" : pctVivo >= 0.25 ? "MINIMO" : "RIESGO";
  const semaforoColor = { IDEAL: "text-green-400", REGULAR: "text-yellow-400", MINIMO: "text-orange-400", RIESGO: "text-red-400" }[semaforo];

  const lineasEquipo = cot.lineas.filter((l) => l.tipo === "EQUIPO_PROPIO");
  const lineasExterno = cot.lineas.filter((l) => l.tipo === "EQUIPO_EXTERNO");
  const lineasOp = cot.lineas.filter((l) => l.tipo === "OPERACION_TECNICA" || l.tipo === "DJ");
  const lineasLog = cot.lineas.filter((l) => ["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo));

  const subtotalEquipo = lineasEquipo.reduce((s, l) => s + l.subtotal, 0);
  const subtotalExterno = lineasExterno.reduce((s, l) => s + l.subtotal, 0);
  const subtotalOp = lineasOp.reduce((s, l) => s + l.subtotal, 0);
  const subtotalLog = lineasLog.reduce((s, l) => s + l.subtotal, 0);

  // Notas por sección (guardadas en notasSecciones JSON)
  const notasSecciones: Record<string, string> = cot.notasSecciones
    ? JSON.parse(cot.notasSecciones) : {};

  // Agrupar equipos propios por categoría (usando notas que guardan categoria:NombreCat)
  const equiposPorCat: Record<string, Linea[]> = {};
  for (const l of lineasEquipo) {
    const cat = l.notas?.startsWith("cat:") ? l.notas.slice(4) : "Equipos";
    if (!equiposPorCat[cat]) equiposPorCat[cat] = [];
    equiposPorCat[cat].push(l);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="text-gray-400 text-sm font-mono">{cot.numeroCotizacion}</span>
              <CopyButton value={cot.numeroCotizacion} size="xs" />
            </span>
            <span className="text-gray-500 text-sm">v{cot.version}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[cot.estado] || "bg-gray-700 text-gray-300"}`}>
              {cot.estado}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{cot.nombreEvento || "Sin nombre"}</h1>
          <Link href={`/crm/clientes/${cot.cliente.id}`} className="text-[#B3985B] text-sm hover:underline">
            {cot.cliente.nombre}{cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}
          </Link>
        </div>
        <div className="sm:text-right space-y-2 shrink-0">
          <p className="text-2xl font-bold text-white">{formatCurrency(cot.granTotal)}</p>
          {cot.aplicaIva && <p className="text-gray-400 text-xs">IVA incluido</p>}
          <p className={`text-sm font-medium ${semaforoColor}`}>
            {semaforo} · {formatPct(pctVivo)} margen
          </p>
          <div className="flex gap-2 flex-wrap">
            {cot.estado === "BORRADOR" && (
              <Link
                href={`/cotizaciones/${cot.id}/editar`}
                className="inline-block bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Editar
              </Link>
            )}
            <button
              onClick={duplicar}
              disabled={duplicando}
              className="inline-block bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {duplicando ? "Duplicando..." : "Duplicar"}
            </button>
            <button
              onClick={guardarComoPlantilla}
              disabled={guardandoPlantilla}
              title="Guardar esta cotización como plantilla reutilizable"
              className="inline-block bg-[#1a1a1a] hover:bg-[#222] border border-[#B3985B]/30 text-[#B3985B] text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {guardandoPlantilla ? "Guardando..." : "💾 Plantilla"}
            </button>
            {cot.estado === "APROBADA" && !cot.proyecto && (
              <button
                onClick={aprobar}
                disabled={aprobando}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {aprobando ? "Creando proyecto..." : "✓ Crear proyecto"}
              </button>
            )}
            <a
              href={`/presentacion/${cot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#B3985B]/40 text-[#B3985B] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
              Ver presentación
            </a>
            <button
              onClick={sharePdf}
              disabled={sharingPdf}
              className="inline-flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-60 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {sharingPdf ? (
                <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              )}
              {sharingPdf ? "Preparando..." : "Descargar / Compartir PDF"}
            </button>
            {/* WhatsApp: compartir PDF */}
            {cot.cliente.telefono && (() => {
              const tel = cot.cliente.telefono.replace(/\D/g, "");
              const pdfLink = `${typeof window !== "undefined" ? window.location.origin : ""}/api/cotizaciones/${cot.id}/pdf`;
              const msg = `Hola ${cot.cliente.nombre.split(" ")[0]}, te comparto la cotización ${cot.numeroCotizacion}${cot.nombreEvento ? ` para ${cot.nombreEvento}` : ""}: ${pdfLink}`;
              return (
                <a
                  href={`https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  title="Enviar PDF por WhatsApp al cliente"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  WhatsApp
                </a>
              );
            })()}
          </div>

          {/* Link de aprobación */}
          {cot.estado !== "APROBADA" && cot.estado !== "RECHAZADA" && (
            <div className="mt-2">
              {!linkAprobacion && !cot.aprobacionToken ? (
                <button
                  onClick={generarLinkAprobacion}
                  disabled={generandoLink}
                  className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {generandoLink ? (
                    <span className="w-3.5 h-3.5 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                  )}
                  {generandoLink ? "Generando..." : "Generar link de aprobación"}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {(linkAprobacion || cot.aprobacionToken) && (
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={linkAprobacion ?? `${typeof window !== "undefined" ? window.location.origin : ""}/aprobacion/cotizacion/${cot.aprobacionToken}`}
                        className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-gray-400 text-xs font-mono truncate"
                      />
                      <button
                        onClick={copiarLink}
                        className="shrink-0 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors"
                      >
                        {linkCopiado ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>
                  )}
                  {/* WhatsApp con link de aprobación */}
                  {cot.cliente.telefono && (linkAprobacion || cot.aprobacionToken) && (() => {
                    const tel = cot.cliente.telefono!.replace(/\D/g, "");
                    const url = linkAprobacion ?? `${typeof window !== "undefined" ? window.location.origin : ""}/aprobacion/cotizacion/${cot.aprobacionToken}`;
                    const msg = `Hola ${cot.cliente.nombre.split(" ")[0]}, te comparto la cotización ${cot.numeroCotizacion}${cot.nombreEvento ? ` para ${cot.nombreEvento}` : ""}.\n\nPuedes revisarla y aprobarla desde este link: ${url}`;
                    return (
                      <a
                        href={`https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        Enviar link por WhatsApp
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Badge cuando ya está aprobada por el cliente */}
          {cot.estado === "APROBADA" && cot.aprobacionNombre && (
            <div className="mt-2 flex items-center gap-2 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-green-300 text-xs">Aprobada por {cot.aprobacionNombre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Banner proyecto creado */}
      {cot.proyecto && (
        <Link href={`/proyectos/${cot.proyecto.id}`}
          className="flex items-center justify-between bg-green-900/20 border border-green-700/50 rounded-xl px-4 py-3 hover:bg-green-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-lg">✓</span>
            <div>
              <p className="text-green-300 text-sm font-semibold">Proyecto creado: {cot.proyecto.numeroProyecto}</p>
              <p className="text-green-600 text-xs">Haz clic para abrir el proyecto</p>
            </div>
          </div>
          <span className="text-green-500 text-xs px-2 py-1 bg-green-900/40 rounded-full">{cot.proyecto.estado}</span>
        </Link>
      )}

      {/* Estado flujo */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Estado</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ESTADOS_FLUJO.map((e) => (
            <button key={e} disabled={saving || e === cot.estado} onClick={() => cambiarEstado(e)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                e === cot.estado ? ESTADO_COLORS[e] : "bg-[#1a1a1a] text-gray-500 hover:text-white border border-[#2a2a2a]"
              }`}>
              {e.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="md:col-span-2 space-y-4">
          {/* Info evento */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs mb-0.5">Fecha del evento</p><p className="text-white">{fmtDate(cot.fechaEvento)}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Lugar</p><p className="text-white">{cot.lugarEvento || "—"}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Tipo de evento</p><p className="text-white">{cot.tipoEvento || "—"}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Creado por</p><p className="text-white">{cot.creadaPor?.name || "—"}</p></div>
          </div>

          {/* Equipos propios — subsecciones por categoría */}
          {lineasEquipo.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Equipos Mainstage</h3>
                <Link href="/catalogo/equipos" className="text-[10px] text-[#6b7280] hover:text-[#B3985B] transition-colors">
                  → Ir al catálogo
                </Link>
              </div>
              {Object.entries(equiposPorCat).map(([cat, lins]) => {
                const subTotal = lins.reduce((s, l) => s + l.subtotal, 0);
                const notaCat = notasSecciones[cat];
                return (
                  <div key={cat} className="border-t border-[#1a1a1a]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d]">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{cat}</span>
                      <span className="text-xs text-gray-400 font-medium">{formatCurrency(subTotal)}</span>
                    </div>
                    {notaCat && (
                      <div className="px-4 py-2 bg-[#0a0a0a] border-b border-[#111]">
                        <p className="text-xs text-[#6b7280] italic">{notaCat}</p>
                      </div>
                    )}
                    {lins.map((l) => (
                      <div key={l.id} className={`flex justify-between items-center px-4 py-2 border-b border-[#111] last:border-0 text-sm ${l.esIncluido ? "opacity-50" : ""}`}>
                        <div>
                          <span className={l.esIncluido ? "text-gray-500 italic" : "text-white"}>{l.descripcion}</span>
                          {l.marca && <span className="text-gray-500 text-xs ml-2">{l.marca}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-gray-400 text-xs">
                          {!l.esIncluido && <span>{l.cantidad} × {l.dias}d · {formatCurrency(l.precioUnitario)}</span>}
                          <span className={`font-medium w-24 text-right ${l.esIncluido ? "text-gray-600" : "text-white"}`}>
                            {l.esIncluido ? "INCLUYE" : formatCurrency(l.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal equipos</span>
                <span className="text-white font-bold">{formatCurrency(subtotalEquipo)}</span>
              </div>
              {cot.montoDescuento > 0 && (
                <div className="flex justify-between items-center px-4 py-2 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                  <span className="text-xs text-red-400">Precio preferencial</span>
                  <span className="text-red-400 font-medium text-sm">-{formatCurrency(cot.montoDescuento)}</span>
                </div>
              )}
            </div>
          )}

          {/* Equipos externos */}
          {lineasExterno.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Equipos Adicionales (Terceros)</h3>
              </div>
              {lineasExterno.map((l) => (
                <div key={l.id} className="flex justify-between items-center px-4 py-2 border-t border-[#1a1a1a] text-sm">
                  <div>
                    <span className="text-white">{l.descripcion}</span>
                    {l.marca && <span className="text-gray-500 text-xs ml-2">{l.marca}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 text-xs">
                    <span>{l.cantidad} × {l.dias}d</span>
                    <span className="text-white font-medium w-24 text-right">{formatCurrency(l.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal terceros</span>
                <span className="text-white font-bold">{formatCurrency(subtotalExterno)}</span>
              </div>
            </div>
          )}

          {/* Operación técnica */}
          {lineasOp.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Operación técnica</h3>
              </div>
              {lineasOp.map((l) => (
                <div key={l.id} className="flex justify-between items-center px-4 py-2 border-t border-[#1a1a1a] text-sm">
                  <div>
                    <span className="text-white">{l.descripcion}</span>
                    <span className="text-gray-500 text-xs ml-2">
                      {l.nivel && `${l.nivel} · `}{l.jornada && `${l.jornada} · `}×{l.cantidad}
                    </span>
                  </div>
                  <span className="text-white font-medium">{formatCurrency(l.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal operación</span>
                <span className="text-white font-bold">{formatCurrency(subtotalOp)}</span>
              </div>
            </div>
          )}

          {/* Logística */}
          {lineasLog.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Logística y Viáticos</h3>
              </div>
              {lineasLog.map((l) => (
                <div key={l.id} className="flex justify-between items-center px-4 py-2 border-t border-[#1a1a1a] text-sm">
                  <span className="text-gray-300">{TIPO_LINEA_LABELS[l.tipo] || l.tipo} — {l.descripcion}
                    <span className="text-gray-500 text-xs ml-2">×{l.cantidad} · {l.dias}d</span>
                  </span>
                  <span className="text-white font-medium">{formatCurrency(l.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 border-t border-[#333] bg-[#0d0d0d]">
                <span className="text-xs text-gray-400 font-semibold uppercase">Subtotal logística</span>
                <span className="text-white font-bold">{formatCurrency(subtotalLog)}</span>
              </div>
            </div>
          )}

          {/* ── Plan de pagos ── */}
          {cot.estado !== "APROBADA" && cot.estado !== "RECHAZADA" && (() => {
            type Cuota = { concepto: string; porcentaje: number; diasAntes: number; tipoPago: string };
            const ESQUEMAS: { label: string; key: string; pagos: Cuota[] }[] = [
              { label: "50% + 50%", key: "50_50", pagos: [
                { concepto: "Anticipo 50% — ", porcentaje: 50, diasAntes: -3, tipoPago: "ANTICIPO" },
                { concepto: "Liquidación 50% — ", porcentaje: 50, diasAntes: 1, tipoPago: "LIQUIDACION" },
              ]},
              { label: "30% + 70%", key: "30_70", pagos: [
                { concepto: "Anticipo 30% — ", porcentaje: 30, diasAntes: -3, tipoPago: "ANTICIPO" },
                { concepto: "Liquidación 70% — ", porcentaje: 70, diasAntes: 1, tipoPago: "LIQUIDACION" },
              ]},
              { label: "100% adelanto", key: "100_ADELANTO", pagos: [
                { concepto: "Pago total — ", porcentaje: 100, diasAntes: -3, tipoPago: "ANTICIPO" },
              ]},
              { label: "3 pagos (30/40/30)", key: "3_PAGOS", pagos: [
                { concepto: "Anticipo 30% — ", porcentaje: 30, diasAntes: -7, tipoPago: "ANTICIPO" },
                { concepto: "Segundo pago 40% — ", porcentaje: 40, diasAntes: -3, tipoPago: "LIQUIDACION" },
                { concepto: "Liquidación 30% — ", porcentaje: 30, diasAntes: 1, tipoPago: "LIQUIDACION" },
              ]},
            ];

            let currentPlan: { esquema?: string; pagos?: Cuota[] } | null = null;
            try { currentPlan = cot.planPagos ? JSON.parse(cot.planPagos) : null; } catch { /* noop */ }
            const activeKey = currentPlan?.esquema ?? "50_50";
            const activePagos = currentPlan?.pagos ?? ESQUEMAS[0].pagos;

            return (
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                  <div>
                    <p className="text-white text-sm font-semibold">Plan de pagos</p>
                    <p className="text-gray-600 text-xs mt-0.5">Define las cuotas que se generarán al aprobar la cotización</p>
                  </div>
                  <button onClick={() => setEditingPlan(!editingPlan)}
                    className="text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                    {editingPlan ? "Cerrar" : "Editar"}
                  </button>
                </div>

                {!editingPlan ? (
                  <div className="px-4 py-3 space-y-1.5">
                    {activePagos.map((p, i) => {
                      const pct = `${p.porcentaje}%`;
                      const fechaDesc = p.diasAntes <= 0
                        ? `${Math.abs(p.diasAntes)} días tras aprobar`
                        : p.diasAntes === 1 ? "1 día antes del evento"
                        : `${p.diasAntes} días antes del evento`;
                      const monto = Math.round(cot.granTotal * (p.porcentaje / 100));
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            {p.concepto.replace(" — ", "") || `Pago ${i+1}`}
                            <span className="text-gray-700 ml-2">· {fechaDesc}</span>
                          </span>
                          <span className="text-white font-medium">{pct} · {formatCurrency(monto)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-4 space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {ESQUEMAS.map(s => (
                        <button key={s.key} onClick={() => savePlan({ esquema: s.key, pagos: s.pagos })}
                          disabled={savingPlan}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            activeKey === s.key
                              ? "bg-[#B3985B]/15 border-[#B3985B]/50 text-[#B3985B]"
                              : "border-[#333] text-gray-500 hover:text-white hover:border-[#444]"
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {activePagos.map((p, i) => (
                        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: "1fr 80px 120px" }}>
                          <input
                            defaultValue={p.concepto.replace(" — ", "")}
                            onBlur={e => {
                              const updated = activePagos.map((q, j) => j === i ? { ...q, concepto: `${e.target.value} — ` } : q);
                              savePlan({ esquema: "PERSONALIZADO", pagos: updated });
                            }}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#B3985B]/50"
                          />
                          <div className="relative">
                            <input type="number" min="1" max="100"
                              defaultValue={p.porcentaje}
                              onBlur={e => {
                                const updated = activePagos.map((q, j) => j === i ? { ...q, porcentaje: parseInt(e.target.value) || q.porcentaje } : q);
                                savePlan({ esquema: "PERSONALIZADO", pagos: updated });
                              }}
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#B3985B]/50"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-[10px]">%</span>
                          </div>
                          <select defaultValue={p.diasAntes}
                            onChange={e => {
                              const updated = activePagos.map((q, j) => j === i ? { ...q, diasAntes: parseInt(e.target.value) } : q);
                              savePlan({ esquema: "PERSONALIZADO", pagos: updated });
                            }}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]/50">
                            <option value="-3">3d tras aprobar</option>
                            <option value="-7">7d tras aprobar</option>
                            <option value="-14">14d tras aprobar</option>
                            <option value="30">30d antes evento</option>
                            <option value="15">15d antes evento</option>
                            <option value="7">7d antes evento</option>
                            <option value="1">1d antes evento</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-700">Los montos se calculan automáticamente sobre el gran total al aprobar</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Mainstage Trade ── */}
          {!["APROBADA", "RECHAZADA"].includes(cot.estado) && (() => {
            type TradeData = { activo: boolean; pct: number; entregables: string[] };
            const ENTREGABLES_DEFAULT = [
              { id: "logo_banner", label: "Logo en banner / backdrop del evento" },
              { id: "mencion_maestro", label: "Mención del animador/maestro de ceremonias" },
              { id: "post_instagram", label: "Post en Instagram etiquetando @mainstagepro" },
              { id: "story_instagram", label: "Story en Instagram con tag" },
              { id: "post_facebook", label: "Post en Facebook etiquetando Mainstage Pro" },
              { id: "video_redes", label: "Video del evento para nuestras redes (autorización)" },
              { id: "testimonio_escrito", label: "Testimonio escrito / reseña de Google" },
              { id: "recomendacion_directa", label: "Recomendación activa a 2+ contactos" },
            ];
            let trade: TradeData = { activo: false, pct: 5, entregables: [] };
            try { if (cot.mainstageTradeData) trade = { ...trade, ...JSON.parse(cot.mainstageTradeData) }; } catch { /* noop */ }
            return (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤝</span>
                    <p className="text-white text-sm font-semibold">Mainstage Trade</p>
                    {trade.activo && <span className="text-[10px] bg-[#B3985B]/20 text-[#B3985B] px-2 py-0.5 rounded-full font-medium">Activo — {trade.pct}% desc.</span>}
                  </div>
                  <button
                    onClick={() => {
                      const updated = { ...trade, activo: !trade.activo };
                      saveTrade(updated);
                    }}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${trade.activo ? "border-[#B3985B]/40 text-[#B3985B] bg-[#B3985B]/10 hover:bg-[#B3985B]/20" : "border-[#333] text-gray-400 hover:text-white"}`}>
                    {trade.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mb-4">El cliente recibe un descuento a cambio de visibilidad de marca para Mainstage Pro en su evento.</p>
                {trade.activo && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400 min-w-max">Descuento acordado</label>
                      <div className="flex items-center gap-1">
                        {[3, 5, 7, 10, 15].map(p => (
                          <button key={p} onClick={() => saveTrade({ ...trade, pct: p })}
                            className={`text-xs px-2 py-1 rounded transition-colors ${trade.pct === p ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>
                            {p}%
                          </button>
                        ))}
                      </div>
                      <span className="text-gray-500 text-xs">sobre equipos</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Entregables del cliente</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ENTREGABLES_DEFAULT.map(e => {
                          const selected = trade.entregables.includes(e.id);
                          return (
                            <button key={e.id}
                              onClick={() => {
                                const list = selected ? trade.entregables.filter(x => x !== e.id) : [...trade.entregables, e.id];
                                saveTrade({ ...trade, entregables: list });
                              }}
                              className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${selected ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#333]"}`}>
                              {selected ? "✓ " : ""}{e.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {trade.entregables.length > 0 && (
                      <div className="bg-[#1a1a1a] rounded-lg p-3 text-xs text-gray-400">
                        <p className="text-[#B3985B] font-medium mb-1">Resumen del acuerdo Trade</p>
                        <p>El cliente recibe un {trade.pct}% de descuento en equipos a cambio de:</p>
                        <ul className="mt-1 space-y-0.5 pl-3">
                          {trade.entregables.map(eid => {
                            const e = ENTREGABLES_DEFAULT.find(x => x.id === eid);
                            return e ? <li key={eid}>· {e.label}</li> : null;
                          })}
                        </ul>
                      </div>
                    )}
                    {savingTrade && <p className="text-xs text-gray-600">Guardando...</p>}
                  </div>
                )}
              </div>
            );
          })()}

          {cot.observaciones && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-sm">
              <p className="text-gray-500 text-xs mb-1">Observaciones</p>
              <p className="text-gray-300">{cot.observaciones}</p>
            </div>
          )}

          {/* Eliminar */}
          <div className="pt-2">
            <button onClick={eliminar} disabled={deleting}
              className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">
              {deleting ? "Eliminando..." : "Eliminar cotización"}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Equipos bruto</span><span>{formatCurrency(cot.subtotalEquiposBruto)}</span>
            </div>
            {cot.montoDescuento > 0 && (
              <div className="flex justify-between text-red-400 text-xs">
                <span>Precio preferencial</span>
                <span>-{formatCurrency(cot.montoDescuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-white">
              <span>Equipos neto</span><span>{formatCurrency(cot.subtotalEquiposNeto)}</span>
            </div>
            {subtotalExterno > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Equipos externos</span><span>{formatCurrency(subtotalExterno)}</span>
              </div>
            )}
            {cot.subtotalOperacion > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Operación</span><span>{formatCurrency(cot.subtotalOperacion)}</span>
              </div>
            )}
            {subtotalLog > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Logística</span><span>{formatCurrency(subtotalLog)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-white border-t border-[#333] pt-2">
              <span>Subtotal</span><span>{formatCurrency(cot.total)}</span>
            </div>
            {cot.aplicaIva && (
              <div className="flex justify-between text-gray-400">
                <span>IVA 16%</span><span>{formatCurrency(cot.montoIva)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[#B3985B] text-base border-t border-[#333] pt-2">
              <span>Total</span><span>{formatCurrency(cot.granTotal)}</span>
            </div>
            <div className="border-t border-[#222] pt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Anticipo 50%</span><span className="text-white">{formatCurrency(cot.granTotal * 0.5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidación 50%</span><span className="text-white">{formatCurrency(cot.granTotal * 0.5)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Costos operativos</span><span>{formatCurrency(costoVivo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Utilidad estimada</span>
              <span className={utilidadViva >= 0 ? "text-green-400" : "text-red-400"}>{formatCurrency(utilidadViva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Margen</span>
              <span className={`font-semibold ${semaforoColor}`}>{formatPct(pctVivo)} — {semaforo}</span>
            </div>
          </div>

          <Link href={`/crm/tratos/${cot.trato.id}`}
            className="block bg-[#111] border border-[#222] rounded-xl p-4 text-sm hover:border-[#B3985B] transition-colors">
            <p className="text-gray-500 text-xs mb-1">Trato vinculado</p>
            <p className="text-white">{cot.trato.tipoEvento}</p>
            <p className="text-gray-400 text-xs">{cot.trato.etapa.replace(/_/g, " ")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
