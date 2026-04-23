"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPct } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { CopyButton } from "@/components/CopyButton";
import VersionHistorial from "@/components/VersionHistorial";

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
  equipo?: { imagenUrl: string | null } | null;
}

interface OpcionHermana {
  id: string;
  numeroCotizacion: string;
  opcionLetra: string;
  estado: string;
  granTotal: number;
}

interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  version: number;
  opcionLetra: string;
  grupoId: string | null;
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
  descuentoVolumenPct: number;
  descuentoB2bPct: number;
  descuentoMultidiaPct: number;
  descuentoPatrocinioPct: number;
  descuentoFamilyFriendsPct: number;
  descuentoEspecialPct: number;
  descuentoEspecialNota: string | null;
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
  tradeToken: string | null;
  aprobacionToken: string | null;
  aprobacionFecha: string | null;
  aprobacionNombre: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; tipoCliente: string; telefono: string | null };
  trato: { id: string; tipoEvento: string; etapa: string; tradeCalificado: boolean; familyAndFriends: boolean; realizarRender: boolean; ideasReferencias: string | null; notas: string | null; lugarEstimado: string | null };
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
  const [presentacionToken, setPresentacionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [linkAprobacion, setLinkAprobacion] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [presCopiado, setPresCopiado] = useState(false);
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [renderTel, setRenderTel] = useState<string>(() => typeof window !== "undefined" ? localStorage.getItem("renderTelefono") ?? "" : "");
  const [renderFecha, setRenderFecha] = useState("");
  const [renderNotas, setRenderNotas] = useState("");
  const [editingPlan, setEditingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingTrade, setSavingTrade] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [opciones, setOpciones] = useState<OpcionHermana[]>([]);
  const [creandoOpcion, setCreandoOpcion] = useState(false);

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
    fetch(`/api/cotizaciones/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setCot(d.cotizacion); setOpciones(d.opciones ?? []); setPresentacionToken(d.presentacionToken ?? null); setLoading(false); });
  }, [id]);

  async function crearNuevaOpcion() {
    setCreandoOpcion(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}/nueva-opcion`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        toast.success(`Opción ${d.opcionLetra} creada — ${d.numeroCotizacion}`);
        router.push(`/cotizaciones/nuevo?editId=${d.id}`);
      } else {
        toast.error(d.error ?? "Error al crear opción");
      }
    } finally {
      setCreandoOpcion(false);
    }
  }

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

  async function saveTrade(data: object, extra?: Record<string, unknown>) {
    setSavingTrade(true);
    const body: Record<string, unknown> = { mainstageTradeData: JSON.stringify(data), ...extra };
    const res = await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setCot(prev => prev ? { ...prev, mainstageTradeData: JSON.stringify(data), tradeToken: d.cotizacion?.tradeToken ?? prev.tradeToken, ...extra } : prev);
    }
    setSavingTrade(false);
  }

  async function generarTradeToken() {
    setSavingTrade(true);
    const res = await fetch(`/api/cotizaciones/${id}/trade-token`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setCot(prev => prev ? { ...prev, tradeToken: d.token } : prev);
    }
    setSavingTrade(false);
  }

  async function aplicarNivelTrade() {
    if (!cot) return;
    setSavingTrade(true);
    try {
      let trade = JSON.parse(cot.mainstageTradeData ?? "{}");
      const nivelAplicado = trade.nivelSeleccionado;
      trade = { ...trade, nivelAplicado, activo: true };
      await saveTrade(trade);
      toast.success(`Nivel ${nivelAplicado} aplicado — ${trade.pct}% descuento`);
    } finally {
      setSavingTrade(false);
    }
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
      if (cot && !cot.aprobacionToken) {
        setCot(prev => prev ? { ...prev, estado: "ENVIADA", aprobacionToken: d.token } : prev);
      }
      // Auto-generar trade token si el trato califica y aún no tiene token
      if (cot?.trato.tradeCalificado && !cot.tradeToken) {
        const trResp = await fetch(`/api/cotizaciones/${id}/trade-token`, { method: "POST" });
        if (trResp.ok) {
          const trData = await trResp.json();
          setCot(prev => prev ? { ...prev, tradeToken: trData.token } : prev);
        }
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

  if (loading) return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="h-8 w-64 bg-[#1a1a1a] rounded-lg animate-pulse" />
      <div className="h-5 w-48 bg-[#1a1a1a] rounded animate-pulse" />
      <div className="h-12 w-full bg-[#1a1a1a] rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-[#111] border border-[#1e1e1e] rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
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

  const LETRAS_LABELS = ["A", "B", "C", "D", "E"];
  const letrasUsadas = new Set(opciones.map(o => o.opcionLetra));
  const siguienteLetra = LETRAS_LABELS.find(l => !letrasUsadas.has(l));
  const tieneOpciones = opciones.length > 1 || (opciones.length === 1 && cot.grupoId);

  const renderEquipos = cot.lineas
    .filter(l => !["TRANSPORTE", "COMIDA", "HOSPEDAJE"].includes(l.tipo))
    .map(l => `• ${l.cantidad > 1 ? `${l.cantidad}x ` : ""}${l.descripcion}${l.marca ? ` (${l.marca})` : ""}`)
    .join("\n");

  const buildRenderMsg = () => [
      `🎬 *Solicitud de Render — Mainstage Pro*`,
      ``,
      `📋 *Evento:* ${cot.nombreEvento ?? "Sin nombre"} · ${cot.tipoEvento ?? cot.trato.tipoEvento ?? ""}`,
      `📍 *Venue:* ${cot.lugarEvento ?? cot.trato.lugarEstimado ?? "Por confirmar"}`,
      cot.fechaEvento ? `📅 *Fecha de evento:* ${new Date(cot.fechaEvento).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : null,
      renderFecha ? `⏰ *Render necesario para:* ${new Date(renderFecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}` : null,
      ``,
      `🎛️ *Rider de equipos:*`,
      renderEquipos || "Ver cotización adjunta",
      cot.trato.ideasReferencias ? [``, `💡 *Ideas / Referencias:*`, cot.trato.ideasReferencias].join("\n") : null,
      cot.trato.notas ? [``, `📝 *Notas del trato:*`, cot.trato.notas].join("\n") : null,
      renderNotas ? [``, `🗒️ *Notas adicionales:*`, renderNotas].join("\n") : null,
      ``,
      `📎 *Cotización:* ${cot.numeroCotizacion} · ${cot.cliente.nombre}`,
  ].filter(Boolean).join("\n");

  const CARLOS_LUNA_TEL = "524428633023";
  const enviarRenderWhatsApp = () => {
    const msg = buildRenderMsg();
    window.open(`https://wa.me/${CARLOS_LUNA_TEL}?text=${encodeURIComponent(msg)}`, "_blank");
    setShowRenderModal(false);
  };

  return (
    <>
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Tabs de opciones */}
      {(tieneOpciones || opciones.length > 0) && (
        <div className="flex items-center gap-1 flex-wrap">
          {opciones.map(op => (
            <Link
              key={op.id}
              href={`/cotizaciones/${op.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${op.id === id
                ? "bg-[#B3985B] text-black border-[#B3985B]"
                : "bg-[#111] text-gray-400 border-[#222] hover:border-[#B3985B]/40 hover:text-white"
              }`}
            >
              <span className="font-bold">Opción {op.opcionLetra}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${op.id === id ? "bg-black/20 text-black/70" : ESTADO_COLORS[op.estado] ?? "bg-gray-700 text-gray-400"}`}>
                {op.estado}
              </span>
              <span className={`text-xs ${op.id === id ? "text-black/80" : "text-gray-500"}`}>
                {formatCurrency(op.granTotal)}
              </span>
            </Link>
          ))}
          {siguienteLetra && opciones.length < 5 && (
            <button
              onClick={crearNuevaOpcion}
              disabled={creandoOpcion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-dashed border-[#333] text-gray-600 hover:text-[#B3985B] hover:border-[#B3985B]/40 transition-colors disabled:opacity-40"
              title={`Crear Opción ${siguienteLetra} (copia editable de esta cotización)`}
            >
              <span className="text-base leading-none">+</span>
              {creandoOpcion ? "Creando..." : `Opción ${siguienteLetra}`}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">

        {/* Fila 1: metadata */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs font-mono">{cot.numeroCotizacion}</span>
            <CopyButton value={cot.numeroCotizacion} size="xs" />
          </span>
          {cot.grupoId && (
            <span className="text-[11px] font-bold text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/30 px-2 py-0.5 rounded-full">
              Opción {cot.opcionLetra}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${ESTADO_COLORS[cot.estado] || "bg-gray-700 text-gray-300"}`}>
            {cot.estado}
          </span>
          {cot.creadaPor && (
            <span className="text-gray-600 text-xs">· {cot.creadaPor.name}</span>
          )}
        </div>

        {/* Fila 2: título + total */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight">{cot.nombreEvento || "Sin nombre"}</h1>
            <Link href={`/crm/clientes/${cot.cliente.id}`} className="text-[#B3985B] text-sm hover:underline">
              {cot.cliente.nombre}{cot.cliente.empresa ? ` · ${cot.cliente.empresa}` : ""}
            </Link>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(cot.granTotal)}</p>
            {cot.aplicaIva && <p className="text-gray-500 text-[11px]">IVA incluido</p>}
            <p className={`text-sm font-medium ${semaforoColor}`}>{semaforo} · {formatPct(pctVivo)} margen</p>
          </div>
        </div>

        {/* Fila 3: acciones principales */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#1a1a1a]">
          {cot.estado === "BORRADOR" && (
            <Link href={`/cotizaciones/${cot.id}/editar`}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </Link>
          )}
          <a href={`/presentacion/${cot.id}${presentacionToken ? `?token=${presentacionToken}` : ""}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#B3985B]/30 hover:border-[#B3985B]/60 text-[#B3985B] text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
            Presentación
          </a>
          <Link href={`/contratos/${cot.trato.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] hover:border-[#555] text-gray-300 hover:text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Contrato
          </Link>
          <button onClick={sharePdf} disabled={sharingPdf}
            className="flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-60 text-black text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
            {sharingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            )}
            {sharingPdf ? "Descargando..." : "Descargar PDF"}
          </button>
          {cot.cliente.telefono && (() => {
            const tel = cot.cliente.telefono.replace(/\D/g, "");
            const pdfLink = `${typeof window !== "undefined" ? window.location.origin : ""}/api/cotizaciones/${cot.id}/pdf`;
            const msg = `Hola ${cot.cliente.nombre.split(" ")[0]}, te comparto la cotización ${cot.numeroCotizacion}${cot.nombreEvento ? ` para ${cot.nombreEvento}` : ""}: ${pdfLink}`;
            return (
              <a href={`https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                WhatsApp
              </a>
            );
          })()}
          {cot.estado === "APROBADA" && !cot.proyecto && (
            <button onClick={aprobar} disabled={aprobando}
              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
              {aprobando ? "Creando..." : "✓ Crear proyecto"}
            </button>
          )}
        </div>

        {/* Fila 4: acciones secundarias */}
        <div className="flex items-center gap-4 flex-wrap">
          {siguienteLetra && opciones.length < 5 && (
            <button onClick={crearNuevaOpcion} disabled={creandoOpcion}
              className="flex items-center gap-1 text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/30 hover:border-[#B3985B]/60 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
              <span className="text-sm leading-none">+</span>
              {creandoOpcion ? "Creando..." : `Opción ${siguienteLetra}`}
            </button>
          )}
          <button onClick={duplicar} disabled={duplicando}
            className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-40">
            {duplicando ? "Duplicando..." : "Duplicar"}
          </button>
          <button onClick={guardarComoPlantilla} disabled={guardandoPlantilla}
            className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors disabled:opacity-40">
            {guardandoPlantilla ? "Guardando..." : "Guardar como plantilla"}
          </button>
        </div>

        {/* Link de aprobación */}
        {cot.estado !== "APROBADA" && cot.estado !== "RECHAZADA" && (
          <div className="border-t border-[#1a1a1a] pt-3">
            {!linkAprobacion && !cot.aprobacionToken ? (
              <button onClick={generarLinkAprobacion} disabled={generandoLink}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition-colors">
                {generandoLink ? (
                  <span className="w-3 h-3 border border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                )}
                {generandoLink ? "Generando..." : "Generar link de aprobación para el cliente"}
              </button>
            ) : (
              <div className="space-y-2">
                {(linkAprobacion || cot.aprobacionToken) && (
                  <div className="flex gap-2">
                    <input readOnly
                      value={linkAprobacion ?? `${typeof window !== "undefined" ? window.location.origin : ""}/aprobacion/cotizacion/${cot.aprobacionToken}`}
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-gray-400 text-xs font-mono truncate" />
                    <button onClick={copiarLink}
                      className="shrink-0 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors">
                      {linkCopiado ? "✓ Copiado" : "Copiar"}
                    </button>
                  </div>
                )}
                {cot.cliente.telefono && (linkAprobacion || cot.aprobacionToken) && (() => {
                  const tel = cot.cliente.telefono!.replace(/\D/g, "");
                  const url = linkAprobacion ?? `${typeof window !== "undefined" ? window.location.origin : ""}/aprobacion/cotizacion/${cot.aprobacionToken}`;
                  const msg = `Hola ${cot.cliente.nombre.split(" ")[0]}, te comparto la cotización ${cot.numeroCotizacion}${cot.nombreEvento ? ` para ${cot.nombreEvento}` : ""}.\n\nPuedes revisarla y aprobarla desde este link: ${url}`;
                  return (
                    <a href={`https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-green-400 hover:text-green-300 text-xs transition-colors">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      Enviar link por WhatsApp al cliente
                    </a>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── Solicitar Render ── */}
        {cot.trato.realizarRender && cot.lineas.length > 0 && (
          <div className="border-t border-[#1a1a1a] pt-3">
            <button
              onClick={() => setShowRenderModal(true)}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-xs transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              Solicitar render al equipo de diseño
            </button>
          </div>
        )}

        {/* Links copiables — siempre visibles */}
        <div className="border-t border-[#1a1a1a] pt-3 space-y-2">
          <p className="text-[10px] text-[#555] uppercase tracking-wider font-semibold">Links</p>
          {presentacionToken && (() => {
            const presUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/presentacion/${cot.id}?token=${presentacionToken}`;
            return (
              <div className="flex gap-2 items-center">
                <span className="text-[10px] text-gray-600 w-20 shrink-0">Presentación</span>
                <input readOnly value={presUrl} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-gray-400 text-xs font-mono truncate" />
                <button onClick={async () => { await navigator.clipboard.writeText(presUrl); setPresCopiado(true); setTimeout(() => setPresCopiado(false), 2000); }}
                  className="shrink-0 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                  {presCopiado ? "✓" : "Copiar"}
                </button>
              </div>
            );
          })()}
          {(linkAprobacion || cot.aprobacionToken) && (() => {
            const aprobUrl = linkAprobacion ?? `${typeof window !== "undefined" ? window.location.origin : ""}/aprobacion/cotizacion/${cot.aprobacionToken}`;
            return (
              <div className="flex gap-2 items-center">
                <span className="text-[10px] text-gray-600 w-20 shrink-0">Aprobación</span>
                <input readOnly value={aprobUrl} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-gray-400 text-xs font-mono truncate" />
                <button onClick={async () => { await navigator.clipboard.writeText(aprobUrl); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000); }}
                  className="shrink-0 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                  {linkCopiado ? "✓" : "Copiar"}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Badge aprobada */}
        {cot.estado === "APROBADA" && cot.aprobacionNombre && (
          <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2">
            <span className="text-green-400 text-sm">✓</span>
            <span className="text-green-300 text-xs">Aprobada por {cot.aprobacionNombre}</span>
          </div>
        )}
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
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs mb-0.5">Fecha</p><p className="text-white">{fmtDate(cot.fechaEvento)}</p></div>
            <div><p className="text-gray-500 text-xs mb-0.5">Tipo</p><p className="text-white">{cot.tipoEvento || "—"}</p></div>
            <div className="col-span-2"><p className="text-gray-500 text-xs mb-0.5">Lugar</p><p className="text-white">{cot.lugarEvento || "—"}</p></div>
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
                        <div className="flex items-center gap-2.5 min-w-0">
                          {l.equipo?.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.equipo.imagenUrl} alt="" className="w-8 h-8 object-contain rounded shrink-0 opacity-75" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src="/logo-icon.png" alt="" className="w-8 h-8 object-contain shrink-0 opacity-15" />
                          )}
                          <div>
                          <span className={l.esIncluido ? "text-gray-500 italic" : "text-white"}>{l.descripcion}</span>
                          {l.marca && <span className="text-gray-500 text-xs ml-2">{l.marca}</span>}
                          </div>
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
              {cot.montoDescuento > 0 && (() => {
                // Desglosar cada tipo de descuento individualmente
                const sb = cot.subtotalEquiposBruto;
                const rows: { label: string; pct: number; monto: number; color: string }[] = [];

                if ((cot.descuentoB2bPct ?? 0) > 0)
                  rows.push({ label: `Descuento B2B (${Math.round(cot.descuentoB2bPct * 100)}%)`, pct: cot.descuentoB2bPct, monto: sb * cot.descuentoB2bPct, color: "text-blue-400" });
                if ((cot.descuentoVolumenPct ?? 0) > 0)
                  rows.push({ label: `Descuento por volumen (${Math.round(cot.descuentoVolumenPct * 100)}%)`, pct: cot.descuentoVolumenPct, monto: sb * cot.descuentoVolumenPct, color: "text-red-400" });
                if ((cot.descuentoMultidiaPct ?? 0) > 0)
                  rows.push({ label: `Descuento multi-día (${Math.round(cot.descuentoMultidiaPct * 100)}%)`, pct: cot.descuentoMultidiaPct, monto: sb * cot.descuentoMultidiaPct, color: "text-red-400" });
                if ((cot.descuentoFamilyFriendsPct ?? 0) > 0)
                  rows.push({ label: `Family & Friends (${Math.round(cot.descuentoFamilyFriendsPct * 100)}%)`, pct: cot.descuentoFamilyFriendsPct, monto: sb * cot.descuentoFamilyFriendsPct, color: "text-red-400" });
                if ((cot.descuentoEspecialPct ?? 0) > 0)
                  rows.push({ label: `Descuento especial (${Math.round(cot.descuentoEspecialPct * 100)}%)${cot.descuentoEspecialNota ? ` · ${cot.descuentoEspecialNota}` : ""}`, pct: cot.descuentoEspecialPct, monto: sb * cot.descuentoEspecialPct, color: "text-red-400" });

                // Trade (de mainstageTradeData)
                let tradeRow: { label: string; monto: number } | null = null;
                try {
                  const td = cot.mainstageTradeData ? JSON.parse(cot.mainstageTradeData) : {};
                  if (td.nivelSeleccionado && td.pct && td.activo) {
                    const NLBL: Record<number, string> = { 1: "Base", 2: "Estratégico", 3: "Premium" };
                    tradeRow = {
                      label: `Mainstage Trade · ${NLBL[td.nivelSeleccionado] ?? ""}  (${td.pct}%)`,
                      monto: Math.round(sb * (td.pct / 100) * 100) / 100,
                    };
                  }
                } catch { /* noop */ }

                return (
                  <>
                    {rows.map(r => (
                      <div key={r.label} className="flex justify-between items-center px-4 py-2 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                        <span className={`text-xs ${r.color}`}>{r.label}</span>
                        <span className={`${r.color} font-medium text-sm`}>-{formatCurrency(r.monto)}</span>
                      </div>
                    ))}
                    {tradeRow && (
                      <div className="flex justify-between items-center px-4 py-2 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                        <span className="text-xs text-[#B3985B]">{tradeRow.label}</span>
                        <span className="text-[#B3985B] font-medium text-sm">-{formatCurrency(tradeRow.monto)}</span>
                      </div>
                    )}
                    {rows.length === 0 && !tradeRow && (
                      <div className="flex justify-between items-center px-4 py-2 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                        <span className="text-xs text-red-400">Descuento</span>
                        <span className="text-red-400 font-medium text-sm">-{formatCurrency(cot.montoDescuento)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
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
                        <div key={i} className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_80px_120px]">
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
                          <Combobox
                            value={String(p.diasAntes)}
                            onChange={v => {
                              const updated = activePagos.map((q, j) => j === i ? { ...q, diasAntes: parseInt(v) } : q);
                              savePlan({ esquema: "PERSONALIZADO", pagos: updated });
                            }}
                            options={[{ value: "-3", label: "3d tras aprobar" }, { value: "-7", label: "7d tras aprobar" }, { value: "-14", label: "14d tras aprobar" }, { value: "30", label: "30d antes evento" }, { value: "15", label: "15d antes evento" }, { value: "7", label: "7d antes evento" }, { value: "1", label: "1d antes evento" }]}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]/50"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-700">Los montos se calculan automáticamente sobre el gran total al aprobar</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Mainstage Trade — link para compartir ── */}
          {cot.trato.tradeCalificado && !["APROBADA", "RECHAZADA"].includes(cot.estado) && (() => {
            let tradeNivel: number | null = null;
            let tradePct: number | null = null;
            try {
              const td = cot.mainstageTradeData ? JSON.parse(cot.mainstageTradeData) : {};
              tradeNivel = td.nivelSeleccionado ?? null;
              tradePct = td.pct ?? null;
            } catch { /* noop */ }
            const tradeUrl = cot.tradeToken
              ? `${typeof window !== "undefined" ? window.location.origin : ""}/trade/${cot.tradeToken}`
              : null;
            const NIVEL_LABEL: Record<number, string> = { 1: "Base", 2: "Estratégico", 3: "Premium" };
            return (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🤝</span>
                    <p className="text-white text-sm font-semibold">Mainstage Trade</p>
                  </div>
                  {tradeNivel && (
                    <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full font-medium">
                      ✓ Nivel {tradeNivel} · {NIVEL_LABEL[tradeNivel]} · {tradePct}% aplicado
                    </span>
                  )}
                  {!tradeNivel && cot.tradeToken && (
                    <span className="text-[10px] bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded-full">Esperando selección</span>
                  )}
                </div>

                {!tradeNivel && !cot.tradeToken && (
                  <button
                    onClick={generarTradeToken}
                    disabled={savingTrade}
                    className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-[#B3985B] hover:border-[#B3985B]/40 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                    {savingTrade ? "Generando…" : "Generar link de propuesta Trade"}
                  </button>
                )}

                {!tradeNivel && tradeUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Comparte este enlace con el cliente para que elija su nivel de colaboración:</p>
                    <div className="flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-400 flex-1 truncate">{tradeUrl}</span>
                      <CopyButton value={tradeUrl} />
                    </div>
                    {cot.cliente.telefono && (
                      <a
                        href={`https://wa.me/${cot.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${cot.cliente.nombre}, te comparto la propuesta de colaboración Mainstage Trade para tu evento. Elige tu nivel y obtén un descuento adicional:\n\n${tradeUrl}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors">
                        <span>📱</span> Enviar por WhatsApp
                      </a>
                    )}
                  </div>
                )}

                {tradeNivel && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">El cliente seleccionó Nivel {tradeNivel} ({NIVEL_LABEL[tradeNivel]}). El descuento del {tradePct}% ya está aplicado en la cotización.</p>
                    <button
                      onClick={async () => {
                        setSavingTrade(true);
                        try {
                          const td = JSON.parse(cot.mainstageTradeData ?? "{}");
                          const tradeMontoAplicado = Math.round(cot.subtotalEquiposBruto * ((td.pct ?? 0) / 100) * 100) / 100;
                          // Revertir descuento trade del montoDescuento
                          const res = await fetch(`/api/cotizaciones/${id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              mainstageTradeData: JSON.stringify({ ...td, nivelSeleccionado: null, nivelAplicado: null, activo: false }),
                            }),
                          });
                          if (res.ok) {
                            const d = await res.json();
                            setCot(prev => prev ? { ...prev, mainstageTradeData: d.cotizacion?.mainstageTradeData ?? prev.mainstageTradeData } : prev);
                            toast.success("Selección Trade eliminada");
                          }
                        } finally { setSavingTrade(false); }
                      }}
                      disabled={savingTrade}
                      className="text-[10px] text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/60 px-2 py-1 rounded-lg transition-colors shrink-0 disabled:opacity-40"
                    >
                      Eliminar selección
                    </button>
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

          <VersionHistorial entidad="cotizacion" entidadId={cot.id} />
        </div>
      </div>
    </div>

    {/* ── Modal Solicitar Render ── */}
    {showRenderModal && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) setShowRenderModal(false); }}>
        <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-sm">Solicitar Render</h3>
            </div>
            <button onClick={() => setShowRenderModal(false)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3 space-y-1">
            <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Info que se enviará</p>
            <p className="text-gray-300 text-xs"><span className="text-gray-600">Evento:</span> {cot.nombreEvento ?? "—"} · {cot.tipoEvento ?? cot.trato.tipoEvento}</p>
            <p className="text-gray-300 text-xs"><span className="text-gray-600">Venue:</span> {cot.lugarEvento ?? cot.trato.lugarEstimado ?? "Por confirmar"}</p>
            <p className="text-gray-300 text-xs"><span className="text-gray-600">Equipos:</span> {cot.lineas.filter(l => !["TRANSPORTE","COMIDA","HOSPEDAJE"].includes(l.tipo)).length} líneas de rider</p>
            {cot.trato.ideasReferencias && <p className="text-gray-300 text-xs"><span className="text-gray-600">Referencias:</span> ✓</p>}
          </div>

          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-2">
            <p className="text-[11px] text-gray-500">📲 Se enviará a <span className="text-white font-medium">Carlos Luna</span> vía WhatsApp</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fecha de entrega del render *</label>
              <input
                type="date"
                value={renderFecha}
                onChange={e => setRenderFecha(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-600/60"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notas adicionales para el render</label>
              <textarea
                value={renderNotas}
                onChange={e => setRenderNotas(e.target.value)}
                rows={2}
                placeholder="Estilo visual, paleta de colores, referencias específicas..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-600/60 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowRenderModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              onClick={enviarRenderWhatsApp}
              disabled={!renderFecha}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Enviar por WhatsApp
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
