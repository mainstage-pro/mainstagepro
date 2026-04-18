"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CxCItem {
  id: string;
  concepto: string;
  monto: number;
  montoCobrado: number;
  estado: string;
  fechaCompromiso: string;
  tipoPago: string;
  cliente: { id: string; nombre: string; telefono: string | null };
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
  cotizacion: { id: string; numeroCotizacion: string } | null;
}

interface CxPItem {
  id: string;
  concepto: string;
  monto: number;
  estado: string;
  fechaCompromiso: string;
  tipoAcreedor: string;
  tecnico: { id: string; nombre: string; celular: string | null } | null;
  proveedor: { id: string; nombre: string; telefono: string | null } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-900/40 text-yellow-400",
  PARCIAL: "bg-blue-900/40 text-blue-400",
  LIQUIDADO: "bg-green-900/40 text-green-400",
  VENCIDO: "bg-red-900/40 text-red-400",
};

const TIPO_LABELS: Record<string, string> = {
  ANTICIPO: "Anticipo",
  LIQUIDACION: "Liquidación",
  TOTAL: "Total",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function waMsgCobro(nombre: string, monto: number, concepto: string): string {
  return encodeURIComponent(
    `Hola ${nombre}, te escribimos de Mainstage Pro para recordarte que tienes un pago pendiente de ${formatCurrency(monto)} correspondiente a ${concepto}. Quedamos al pendiente para coordinar el pago. Gracias.`
  );
}

function waMsgPago(nombre: string, monto: number, concepto: string): string {
  return encodeURIComponent(
    `Hola ${nombre}, te informamos que tu pago de ${formatCurrency(monto)} por ${concepto} ha sido procesado. Gracias.`
  );
}

// ── Modal Confirmar Cobro ──────────────────────────────────────────────────────

interface ConfirmarModal {
  id: string;
  tipo: "cobro" | "pago";
  concepto: string;
  monto: number;
  nombre: string;
}

// ── Tipos para el modal de nuevo registro ────────────────────────────────────
interface NuevoRegistroForm {
  tipo: "cxc" | "cxp";
  concepto: string;
  monto: string;
  fechaCompromiso: string;
  tipoPago: string;
  // CxC
  clienteNombre: string;
  clienteId: string;
  // CxP
  tipoAcreedor: string;
  acreedorNombre: string;
  notas: string;
}

const NUEVO_REGISTRO_EMPTY: NuevoRegistroForm = {
  tipo: "cxc",
  concepto: "",
  monto: "",
  fechaCompromiso: new Date().toISOString().split("T")[0],
  tipoPago: "OTRO",
  clienteNombre: "",
  clienteId: "",
  tipoAcreedor: "OTRO",
  acreedorNombre: "",
  notas: "",
};

export default function CobrosPagosPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"cobrar" | "pagar">("cobrar");
  const [cxc, setCxc] = useState<CxCItem[]>([]);
  const [cxp, setCxp] = useState<CxPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ConfirmarModal | null>(null);
  const [modalMonto, setModalMonto] = useState("");
  const [modalNotas, setModalNotas] = useState("");
  const [modalFecha, setModalFecha] = useState(new Date().toISOString().split("T")[0]);
  const [confirmando, setConfirmando] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "liquidados">("pendientes");
  // Nuevo registro
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState<NuevoRegistroForm>({ ...NUEVO_REGISTRO_EMPTY });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string; empresa: string | null }>>([]);
  const [clienteQuery, setClienteQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rp] = await Promise.all([
      fetch("/api/cuentas-cobrar").then(r => r.json()),
      fetch("/api/cuentas-pagar").then(r => r.json()),
    ]);
    setCxc(Array.isArray(rc) ? rc : []);
    setCxp(Array.isArray(rp) ? rp : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then(d => setClientes(d.clientes ?? [])).catch(() => {});
  }, []);

  async function guardarNuevo() {
    if (!nuevoForm.concepto || !nuevoForm.monto || !nuevoForm.fechaCompromiso) return;
    setGuardandoNuevo(true);
    try {
      if (nuevoForm.tipo === "cxc") {
        if (!nuevoForm.clienteId) { toast.error("Selecciona un cliente"); setGuardandoNuevo(false); return; }
        await fetch("/api/cuentas-cobrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteId: nuevoForm.clienteId,
            concepto: nuevoForm.concepto,
            monto: nuevoForm.monto,
            fechaCompromiso: nuevoForm.fechaCompromiso,
            tipoPago: nuevoForm.tipoPago,
          }),
        });
      } else {
        await fetch("/api/cuentas-pagar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipoAcreedor: nuevoForm.tipoAcreedor,
            concepto: nuevoForm.acreedorNombre
              ? `${nuevoForm.acreedorNombre} — ${nuevoForm.concepto}`
              : nuevoForm.concepto,
            monto: nuevoForm.monto,
            fechaCompromiso: nuevoForm.fechaCompromiso,
            notas: nuevoForm.notas || null,
          }),
        });
      }
      setShowNuevo(false);
      setNuevoForm({ ...NUEVO_REGISTRO_EMPTY });
      setClienteQuery("");
      await load();
    } finally {
      setGuardandoNuevo(false);
    }
  }

  const hoy = new Date();

  // Apply overdue status locally
  const enrichCxC = (c: CxCItem) => ({
    ...c,
    esVencida: c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy,
  });
  const enrichCxP = (c: CxPItem) => ({
    ...c,
    esVencida: c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy,
  });

  const cxcList = cxc.map(enrichCxC).filter(c => {
    if (filtro === "pendientes") return c.estado !== "LIQUIDADO";
    if (filtro === "liquidados") return c.estado === "LIQUIDADO";
    return true;
  });
  const cxpList = cxp.map(enrichCxP).filter(c => {
    if (filtro === "pendientes") return c.estado !== "LIQUIDADO";
    if (filtro === "liquidados") return c.estado === "LIQUIDADO";
    return true;
  });

  // Metrics
  const cxcPend = cxc.filter(c => c.estado === "PENDIENTE").reduce((s, c) => s + c.monto, 0);
  const cxcVenc = cxc.filter(c => c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy).reduce((s, c) => s + c.monto, 0);
  const cxcCobr = cxc.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);
  const cxpPend = cxp.filter(c => c.estado === "PENDIENTE").reduce((s, c) => s + c.monto, 0);
  const cxpVenc = cxp.filter(c => c.estado !== "LIQUIDADO" && new Date(c.fechaCompromiso) < hoy).reduce((s, c) => s + c.monto, 0);
  const cxpPagd = cxp.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);

  function openModal(item: CxCItem | CxPItem, tipo: "cobro" | "pago") {
    const nombre = tipo === "cobro"
      ? (item as CxCItem).cliente.nombre
      : ((item as CxPItem).tecnico?.nombre ?? (item as CxPItem).proveedor?.nombre ?? "Beneficiario");
    setModal({ id: item.id, tipo, concepto: item.concepto, monto: item.monto, nombre });
    setModalMonto(String(item.monto));
    setModalNotas("");
    setModalFecha(new Date().toISOString().split("T")[0]);
  }

  async function confirmar() {
    if (!modal) return;
    setConfirmando(true);
    const endpoint = modal.tipo === "cobro"
      ? `/api/cuentas-cobrar/${modal.id}/pagar`
      : `/api/cuentas-pagar/${modal.id}/pagar`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: parseFloat(modalMonto) || modal.monto, fecha: modalFecha, notas: modalNotas }),
    });
    await load();
    setModal(null);
    setConfirmando(false);
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Cobros y Pagos</h1>
          <p className="text-[#6b7280] text-sm">Cuentas por cobrar y por pagar</p>
        </div>
        <button
          onClick={() => { setNuevoForm({ ...NUEVO_REGISTRO_EMPTY }); setClienteQuery(""); setShowNuevo(true); }}
          className="px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] transition-colors">
          + Nuevo registro
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Por cobrar</p>
          <p className="text-yellow-400 text-lg font-semibold">{formatCurrency(cxcPend)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Cobro vencido</p>
          <p className="text-red-400 text-lg font-semibold">{formatCurrency(cxcVenc)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Cobrado</p>
          <p className="text-green-400 text-lg font-semibold">{formatCurrency(cxcCobr)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Por pagar</p>
          <p className="text-yellow-400 text-lg font-semibold">{formatCurrency(cxpPend)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Pago vencido</p>
          <p className="text-red-400 text-lg font-semibold">{formatCurrency(cxpVenc)}</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-wider mb-1">Pagado</p>
          <p className="text-green-400 text-lg font-semibold">{formatCurrency(cxpPagd)}</p>
        </div>
      </div>

      {/* Tabs + filtro */}
      <div className="flex items-center justify-between mb-4 border-b border-[#1a1a1a] pb-0">
        <div className="flex gap-1">
          {([["cobrar", "Por Cobrar", cxc.length], ["pagar", "Por Pagar", cxp.length]] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === key
                  ? "text-[#B3985B] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#B3985B]"
                  : "text-[#555] hover:text-[#888]"
              }`}>
              {label}
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${tab === key ? "bg-[#B3985B]/15 text-[#B3985B]" : "bg-[#1a1a1a] text-[#444]"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 pb-2">
          {([["pendientes", "Pendientes"], ["liquidados", "Liquidados"], ["todos", "Todos"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                filtro === key ? "bg-[#B3985B]/15 text-[#B3985B]" : "text-[#555] hover:text-white"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : tab === "cobrar" ? (
        // ── CxC Cards ──
        <div className="space-y-2">
          {cxcList.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
              <p className="text-[#6b7280] text-sm">Sin cuentas por cobrar</p>
            </div>
          ) : cxcList.map(c => (
            <div key={c.id} className={`bg-[#111] border rounded-xl px-4 py-3 ${c.esVencida ? "border-red-900/40" : "border-[#1e1e1e]"}`}>
              <div className="flex items-start gap-3">
                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link href={`/crm/clientes/${c.cliente.id}`}
                      className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
                      {c.cliente.nombre}
                    </Link>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] ?? "bg-gray-800 text-gray-400"}`}>
                      {c.estado}
                    </span>
                    <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                      {TIPO_LABELS[c.tipoPago] ?? c.tipoPago}
                    </span>
                    {c.esVencida && <span className="text-[10px] text-red-400 font-medium">⚠ Vencida</span>}
                  </div>
                  <p className="text-[#9ca3af] text-xs">{c.concepto}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {c.proyecto && (
                      <Link href={`/proyectos/${c.proyecto.id}`}
                        className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
                        {c.proyecto.numeroProyecto} · {c.proyecto.nombre}
                      </Link>
                    )}
                    {c.cotizacion && (
                      <Link href={`/cotizaciones/${c.cotizacion.id}`}
                        className="text-[10px] font-mono text-[#555] hover:text-[#B3985B] transition-colors">
                        {c.cotizacion.numeroCotizacion}
                      </Link>
                    )}
                    <span className={`text-[10px] ${c.esVencida ? "text-red-400" : "text-[#555]"}`}>
                      Vence: {fmtDate(c.fechaCompromiso)}
                    </span>
                    {c.montoCobrado > 0 && c.estado !== "LIQUIDADO" && (
                      <span className="text-[10px] text-blue-400">
                        Abonado: {formatCurrency(c.montoCobrado)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Monto */}
                <div className="text-right shrink-0">
                  <p className="text-white font-semibold text-base">{formatCurrency(c.monto)}</p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#1a1a1a] flex-wrap">
                {c.estado !== "LIQUIDADO" && (
                  <button onClick={() => openModal(c, "cobro")}
                    className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#d4b068] px-3 py-1.5 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Confirmar cobro
                  </button>
                )}
                {c.estado !== "LIQUIDADO" && c.cliente.telefono && (
                  <a
                    href={`https://wa.me/${c.cliente.telefono.replace(/\D/g, "")}?text=${waMsgCobro(c.cliente.nombre, c.monto, c.concepto)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-400 border border-green-900/40 hover:border-green-600 px-3 py-1.5 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {c.estado === "LIQUIDADO" && (
                  <a href={`/api/cuentas-cobrar/${c.id}/recibo`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Recibo PDF
                  </a>
                )}
                {c.estado === "LIQUIDADO" && c.cliente.telefono && (
                  <a
                    href={`https://wa.me/${c.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${c.cliente.nombre}, adjunto el recibo de tu pago de ${formatCurrency(c.monto)} por ${c.concepto}. Gracias por tu confianza en Mainstage Pro.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-400/70 border border-green-900/30 hover:border-green-600/50 px-3 py-1.5 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                    </svg>
                    Enviar recibo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ── CxP Cards ──
        <div className="space-y-2">
          {cxpList.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
              <p className="text-[#6b7280] text-sm">Sin cuentas por pagar</p>
            </div>
          ) : cxpList.map(c => {
            const beneficiario = c.proveedor?.nombre ?? c.tecnico?.nombre ?? "—";
            const telefono = c.proveedor?.telefono ?? c.tecnico?.celular ?? null;
            return (
              <div key={c.id} className={`bg-[#111] border rounded-xl px-4 py-3 ${c.esVencida ? "border-red-900/40" : "border-[#1e1e1e]"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white text-sm font-medium">{beneficiario}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] ?? "bg-gray-800 text-gray-400"}`}>
                        {c.estado}
                      </span>
                      <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full capitalize">
                        {c.tipoAcreedor === "TECNICO" ? "Técnico" : c.tipoAcreedor === "PROVEEDOR" ? "Proveedor" : c.tipoAcreedor}
                      </span>
                      {c.esVencida && <span className="text-[10px] text-red-400 font-medium">⚠ Vencida</span>}
                    </div>
                    <p className="text-[#9ca3af] text-xs">{c.concepto}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {c.proyecto && (
                        <Link href={`/proyectos/${c.proyecto.id}`}
                          className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
                          {c.proyecto.numeroProyecto} · {c.proyecto.nombre}
                        </Link>
                      )}
                      <span className={`text-[10px] ${c.esVencida ? "text-red-400" : "text-[#555]"}`}>
                        Vence: {fmtDate(c.fechaCompromiso)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-semibold text-base">{formatCurrency(c.monto)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#1a1a1a] flex-wrap">
                  {c.estado !== "LIQUIDADO" && (
                    <button onClick={() => openModal(c, "pago")}
                      className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#d4b068] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Marcar pagado
                    </button>
                  )}
                  {telefono && (
                    <a
                      href={`https://wa.me/${telefono.replace(/\D/g, "")}?text=${c.estado === "LIQUIDADO"
                        ? waMsgPago(beneficiario, c.monto, c.concepto)
                        : encodeURIComponent(`Hola ${beneficiario}, te contactamos de Mainstage Pro respecto al pago de ${formatCurrency(c.monto)} por ${c.concepto}.`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-400 border border-green-900/40 hover:border-green-600 px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  {c.estado === "LIQUIDADO" && (
                    <span className="text-xs text-green-400/60 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Pagado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-1">
              {modal.tipo === "cobro" ? "Confirmar cobro" : "Confirmar pago"}
            </h3>
            <p className="text-gray-500 text-xs mb-4">{modal.concepto} · {modal.nombre}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto recibido / pagado</label>
                <input
                  type="number"
                  value={modalMonto}
                  onChange={e => setModalMonto(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                />
                <p className="text-[10px] text-gray-600 mt-1">Total: {formatCurrency(modal.monto)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={modalFecha}
                  onChange={e => setModalFecha(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
                <input
                  value={modalNotas}
                  onChange={e => setModalNotas(e.target.value)}
                  placeholder="Método de pago, referencia..."
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={confirmar} disabled={confirmando}
                className="flex-1 bg-[#B3985B] hover:bg-[#d4b068] disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {confirmando ? "Guardando..." : modal.tipo === "cobro" ? "Confirmar cobro" : "Confirmar pago"}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 text-sm text-gray-500 hover:text-white border border-[#333] rounded-xl transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo registro manual ── */}
      {showNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowNuevo(false); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-base">Nuevo registro</h3>
              <button onClick={() => setShowNuevo(false)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            {/* Tipo */}
            <div className="flex gap-2">
              {([["cxc", "Cuenta por cobrar"], ["cxp", "Cuenta por pagar"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setNuevoForm(p => ({ ...p, tipo: v }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${nuevoForm.tipo === v ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-[#222] text-gray-500 hover:border-[#333] hover:text-white"}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Campos comunes */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
                <input value={nuevoForm.concepto} onChange={e => setNuevoForm(p => ({ ...p, concepto: e.target.value }))}
                  placeholder="Ej: Anticipo evento bodas, Renta equipo…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto *</label>
                  <input type="number" value={nuevoForm.monto} onChange={e => setNuevoForm(p => ({ ...p, monto: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fecha compromiso *</label>
                  <input type="date" value={nuevoForm.fechaCompromiso} onChange={e => setNuevoForm(p => ({ ...p, fechaCompromiso: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>

              {/* CxC — cliente */}
              {nuevoForm.tipo === "cxc" && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cliente *</label>
                    <input value={clienteQuery} onChange={e => { setClienteQuery(e.target.value); setNuevoForm(p => ({ ...p, clienteId: "" })); }}
                      placeholder="Buscar cliente…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    {clienteQuery.length >= 2 && !nuevoForm.clienteId && (
                      <div className="mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg max-h-40 overflow-y-auto">
                        {clientes.filter(c => (c.nombre + (c.empresa ?? "")).toLowerCase().includes(clienteQuery.toLowerCase())).slice(0, 8).map(c => (
                          <button key={c.id} onClick={() => { setNuevoForm(p => ({ ...p, clienteId: c.id, clienteNombre: c.nombre })); setClienteQuery(c.nombre + (c.empresa ? ` · ${c.empresa}` : "")); }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors">
                            {c.nombre}{c.empresa ? <span className="text-gray-600"> · {c.empresa}</span> : null}
                          </button>
                        ))}
                      </div>
                    )}
                    {nuevoForm.clienteId && <p className="text-[11px] text-[#B3985B] mt-1">✓ {clienteQuery}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                    <select value={nuevoForm.tipoPago} onChange={e => setNuevoForm(p => ({ ...p, tipoPago: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="ANTICIPO">Anticipo</option>
                      <option value="LIQUIDACION">Liquidación</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </>
              )}

              {/* CxP — acreedor */}
              {nuevoForm.tipo === "cxp" && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">A quién se le paga</label>
                    <input value={nuevoForm.acreedorNombre} onChange={e => setNuevoForm(p => ({ ...p, acreedorNombre: e.target.value }))}
                      placeholder="Nombre del proveedor, persona o empresa…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Notas</label>
                    <input value={nuevoForm.notas} onChange={e => setNuevoForm(p => ({ ...p, notas: e.target.value }))}
                      placeholder="Opcional…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowNuevo(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={guardarNuevo} disabled={guardandoNuevo || !nuevoForm.concepto || !nuevoForm.monto}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] disabled:opacity-40 transition-colors">
                {guardandoNuevo ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
