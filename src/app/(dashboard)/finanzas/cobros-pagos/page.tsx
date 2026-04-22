"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmpresaItem {
  id: string;
  nombre: string;
  giro: string | null;
  telefono: string | null;
  correo: string | null;
  sitioWeb: string | null;
  notas: string | null;
  datosFiscales: string | null;
  cuentaBancaria: string | null;
  tipo: string;
  contactosCliente: { id: string; nombre: string; telefono: string | null; correo: string | null }[];
  contactosProveedor: { id: string; nombre: string; telefono: string | null; correo: string | null }[];
}

interface CxCItem {
  id: string;
  concepto: string;
  monto: number;
  montoCobrado: number;
  estado: string;
  fechaCompromiso: string;
  tipoPago: string;
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  empresa: { id: string; nombre: string; telefono: string | null } | null;
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
  empresa: { id: string; nombre: string; telefono: string | null } | null;
  socio: { id: string; nombre: string; email: string | null } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
}

interface MovDirecto {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string;
  monto: number;
  metodoPago: string;
  referencia: string | null;
  notas: string | null;
  cliente: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
  categoria: { id: string; nombre: string } | null;
  cuentaOrigen: { nombre: string } | null;
  cuentaDestino: { nombre: string } | null;
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
  // CxC / CxP — empresa o contacto individual
  empresaId: string;
  clienteId: string;    // solo si se selecciona contacto individual en CxC
  proveedorId: string;  // solo si se selecciona contacto individual en CxP
  tecnicoId: string;    // técnico freelancer
  acreedorNombre: string;
  notas: string;
  // Ambos
  proyectoId: string;
}

const NUEVO_REGISTRO_EMPTY: NuevoRegistroForm = {
  tipo: "cxc",
  concepto: "",
  monto: "",
  fechaCompromiso: new Date().toISOString().split("T")[0],
  tipoPago: "OTRO",
  empresaId: "",
  clienteId: "",
  proveedorId: "",
  tecnicoId: "",
  acreedorNombre: "",
  notas: "",
  proyectoId: "",
};

// ── Helpers programación semanal ─────────────────────────────────────────────
function lunesDeSemanaLocal(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function miercolesDeSeamana(lunesIso: string): string {
  const d = new Date(lunesIso + "T12:00:00");
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}
function fmtSemana(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}
function fmtDiaSemana(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
}

interface SemanaOpCobro {
  id: string; concepto: string; monto: number; montoCobrado: number; estado: string; tipoPago: string;
  cliente: { nombre: string; telefono: string | null };
  proyecto: { nombre: string; numeroProyecto: string } | null;
}
interface SemanaOpPago {
  id: string; concepto: string; monto: number; estado: string; tipoAcreedor: string;
  tecnico: { nombre: string; celular: string | null } | null;
  proveedor: { nombre: string; telefono: string | null } | null;
  socio: { nombre: string; email: string | null } | null;
  proyecto: { nombre: string; numeroProyecto: string } | null;
}
interface SemanaOpLocal {
  lunesIso: string;
  miercolesIso: string;
  totalCobros: number;
  totalPagos: number;
  cobros: SemanaOpCobro[];
  pagos: SemanaOpPago[];
}

function generarEstructuraSemanas(lunesHoy: string, cuantas = 10): SemanaOpLocal[] {
  const semanas: SemanaOpLocal[] = [];
  const base = new Date(lunesHoy + "T12:00:00");
  // 2 semanas atrás + semana actual + 7 semanas adelante
  base.setDate(base.getDate() - 14);
  for (let i = 0; i < cuantas; i++) {
    const lunes = new Date(base);
    lunes.setDate(lunes.getDate() + i * 7);
    const lunesIso = lunes.toISOString().slice(0, 10);
    semanas.push({ lunesIso, miercolesIso: miercolesDeSeamana(lunesIso), totalCobros: 0, totalPagos: 0, cobros: [], pagos: [] });
  }
  return semanas;
}

export default function CobrosPagosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pageTab, setPageTab] = useState<"cobros" | "programacion">("cobros");
  const [tab, setTab] = useState<"cobrar" | "pagar" | "directos">("cobrar");
  const [movDirectos, setMovDirectos] = useState<MovDirecto[]>([]);
  // Programación semanal
  const [semanasOp, setSemanasOp] = useState<SemanaOpLocal[]>([]);
  const [semanaIdx, setSemanaIdx] = useState(0);
  const [loadingSemana, setLoadingSemana] = useState(false);
  const [cxc, setCxc] = useState<CxCItem[]>([]);
  const [cxp, setCxp] = useState<CxPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ConfirmarModal | null>(null);
  const [modalMonto, setModalMonto] = useState("");
  const [modalNotas, setModalNotas] = useState("");
  const [modalFecha, setModalFecha] = useState(new Date().toISOString().split("T")[0]);
  const [modalCuentaId, setModalCuentaId] = useState("");
  const [modalMetodoPago, setModalMetodoPago] = useState("TRANSFERENCIA");
  const [confirmando, setConfirmando] = useState(false);
  const [anulando, setAnulando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "liquidados">("pendientes");
  const [cuentas, setCuentas] = useState<Array<{ id: string; nombre: string; banco: string | null }>>([]);
  // Nuevo registro
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState<NuevoRegistroForm>({ ...NUEVO_REGISTRO_EMPTY });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string; empresa: string | null }>>([]);
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string; empresa: string | null }>>([]);
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [proyectos, setProyectos] = useState<Array<{ id: string; nombre: string; numeroProyecto: string; estado: string }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nombre: string; celular: string | null }>>([]);
  const [empresaQuery, setEmpresaQuery] = useState("");
  const [tecnicoQuery, setTecnicoQuery] = useState("");
  const [showNuevoTecnico, setShowNuevoTecnico] = useState(false);
  const [nuevoTecnicoForm, setNuevoTecnicoForm] = useState({ nombre: "", celular: "" });
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<"cxc" | "cxp_emp" | "cxp_tec" | null>(null);
  // Editar CxC / CxP
  const [editModal, setEditModal] = useState<{ id: string; tipo: "cxc" | "cxp"; concepto: string; monto: number; fechaCompromiso: string } | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [editConcepto, setEditConcepto] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [editMotivo, setEditMotivo] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  // Recibos de técnicos
  const [showReciboModal, setShowReciboModal] = useState(false);
  const [reciboGrupos, setReciboGrupos] = useState<Array<{ key: string; nombre: string; items: CxPItem[] }>>([]);
  const [reciboSeleccionados, setReciboSeleccionados] = useState<Record<string, Set<string>>>({});

  async function cargarProgramacion() {
    if (semanasOp.length > 0) return;
    setLoadingSemana(true);
    const hoy = new Date().toISOString().slice(0, 10);
    const lunesHoy = lunesDeSemanaLocal(hoy);
    // Siempre genera estructura de semanas aunque la API no tenga datos
    const estructura = generarEstructuraSemanas(lunesHoy, 10);
    try {
      const r = await fetch("/api/finanzas/semana");
      const d = await r.json();
      const apiSemanas: SemanaOpLocal[] = d.semanas ?? [];
      // Merge: sobrescribe las semanas que la API devuelva con sus cobros/pagos
      for (const api of apiSemanas) {
        const match = estructura.find(s => s.lunesIso === api.lunesIso);
        if (match) {
          match.cobros = api.cobros;
          match.pagos = api.pagos;
          match.totalCobros = api.totalCobros;
          match.totalPagos = api.totalPagos;
        } else {
          estructura.push(api);
        }
      }
      estructura.sort((a, b) => a.lunesIso.localeCompare(b.lunesIso));
    } catch { /* muestra la estructura vacía de todas formas */ }
    setSemanasOp(estructura);
    const idx = estructura.findIndex(s => s.lunesIso === lunesHoy);
    setSemanaIdx(idx >= 0 ? idx : 2); // fallback al índice 2 (semana actual en el array)
    setLoadingSemana(false);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rp, rm] = await Promise.all([
      fetch("/api/cuentas-cobrar", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/cuentas-pagar", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/movimientos?directos=true", { cache: "no-store" }).then(r => r.json()),
    ]);
    setCxc(Array.isArray(rc) ? rc : []);
    setCxp(Array.isArray(rp) ? rp : []);
    setMovDirectos(rm.movimientos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/clientes", { cache: "no-store" }).then(r => r.json()).then(d => setClientes(d.clientes ?? [])).catch(() => {});
    fetch("/api/cuentas", { cache: "no-store" }).then(r => r.json()).then(d => setCuentas(d.cuentas ?? [])).catch(() => {});
    fetch("/api/proveedores", { cache: "no-store" }).then(r => r.json()).then(d => setProveedores(d.proveedores ?? [])).catch(() => {});
    fetch("/api/empresas", { cache: "no-store" }).then(r => r.json()).then(d => setEmpresas(d.empresas ?? [])).catch(() => {});
    fetch("/api/tecnicos", { cache: "no-store" }).then(r => r.json()).then(d => setTecnicos(d.tecnicos ?? [])).catch(() => {});
    fetch("/api/proyectos", { cache: "no-store" }).then(r => r.json()).then(d => setProyectos((d.proyectos ?? []).filter((p: { estado: string }) => p.estado !== "CANCELADO"))).catch(() => {});
  }, []);

  async function guardarNuevo() {
    if (!nuevoForm.concepto || !nuevoForm.monto || !nuevoForm.fechaCompromiso) return;
    setGuardandoNuevo(true);
    try {
      if (nuevoForm.tipo === "cxc") {
        if (!nuevoForm.empresaId && !nuevoForm.clienteId) { toast.error("Selecciona una empresa o cliente"); setGuardandoNuevo(false); return; }
        await fetch("/api/cuentas-cobrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresaId: nuevoForm.empresaId || null,
            clienteId: nuevoForm.clienteId || null,
            proyectoId: nuevoForm.proyectoId || null,
            concepto: nuevoForm.concepto,
            monto: nuevoForm.monto,
            fechaCompromiso: nuevoForm.fechaCompromiso,
            tipoPago: nuevoForm.tipoPago,
            notas: nuevoForm.notas || null,
          }),
        });
      } else {
        await fetch("/api/cuentas-pagar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresaId: nuevoForm.empresaId || null,
            proveedorId: nuevoForm.proveedorId || null,
            tecnicoId: nuevoForm.tecnicoId || null,
            concepto: nuevoForm.acreedorNombre
              ? `${nuevoForm.acreedorNombre} — ${nuevoForm.concepto}`
              : nuevoForm.concepto,
            monto: nuevoForm.monto,
            fechaCompromiso: nuevoForm.fechaCompromiso,
            notas: nuevoForm.notas || null,
            proyectoId: nuevoForm.proyectoId || null,
          }),
        });
      }
      setShowNuevo(false);
      setNuevoForm({ ...NUEVO_REGISTRO_EMPTY });
      setEmpresaQuery("");
      setTecnicoQuery("");
      setShowNuevoTecnico(false);
      setNuevoTecnicoForm({ nombre: "", celular: "" });
      setDropdownOpen(null);
      await load();
    } finally {
      setGuardandoNuevo(false);
    }
  }

  // Compare YYYY-MM-DD strings to avoid UTC-vs-local timezone mismatch.
  // Dates from DB come as ISO strings (UTC midnight). Using < hoyStr means
  // "vencida" only when the commitment date is strictly before today's date.
  const _d = new Date();
  const hoyStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;

  const isVencida = (fechaCompromiso: string, estado: string) =>
    estado !== "LIQUIDADO" && fechaCompromiso.substring(0, 10) < hoyStr;

  // Apply overdue status locally
  const enrichCxC = (c: CxCItem) => ({ ...c, esVencida: isVencida(c.fechaCompromiso, c.estado) });
  const enrichCxP = (c: CxPItem) => ({ ...c, esVencida: isVencida(c.fechaCompromiso, c.estado) });

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
  const cxcVenc = cxc.filter(c => isVencida(c.fechaCompromiso, c.estado)).reduce((s, c) => s + c.monto, 0);
  const cxcCobr = cxc.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);
  const cxpPend = cxp.filter(c => c.estado === "PENDIENTE").reduce((s, c) => s + c.monto, 0);
  const cxpVenc = cxp.filter(c => isVencida(c.fechaCompromiso, c.estado)).reduce((s, c) => s + c.monto, 0);
  const cxpPagd = cxp.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);

  function openModal(item: CxCItem | CxPItem, tipo: "cobro" | "pago") {
    const cxcItem = item as CxCItem;
    const nombre = tipo === "cobro"
      ? (cxcItem.empresa?.nombre ?? cxcItem.cliente?.nombre ?? "Cliente")
      : ((item as CxPItem).socio?.nombre ?? (item as CxPItem).empresa?.nombre ?? (item as CxPItem).tecnico?.nombre ?? (item as CxPItem).proveedor?.nombre ?? "Beneficiario");
    setModal({ id: item.id, tipo, concepto: item.concepto, monto: item.monto, nombre });
    setModalMonto(String(item.monto));
    setModalNotas("");
    setModalFecha(new Date().toISOString().split("T")[0]);
    setModalCuentaId("");
    setModalMetodoPago("TRANSFERENCIA");
  }

  function openEdit(item: CxCItem | CxPItem, tipo: "cxc" | "cxp") {
    setEditModal({ id: item.id, tipo, concepto: item.concepto, monto: item.monto, fechaCompromiso: item.fechaCompromiso.slice(0, 10) });
    setEditMonto(String(item.monto));
    setEditConcepto(item.concepto);
    setEditFecha(item.fechaCompromiso.slice(0, 10));
    setEditMotivo("");
  }

  async function guardarEdit() {
    if (!editModal) return;
    const nuevoMonto = parseFloat(editMonto);
    const montoChanged = nuevoMonto !== editModal.monto;
    if (montoChanged && editMotivo.trim().length < 5) {
      toast.error("El motivo del ajuste debe tener al menos 5 caracteres");
      return;
    }
    setGuardandoEdit(true);
    const body: Record<string, unknown> = {};
    if (editConcepto !== editModal.concepto) body.concepto = editConcepto;
    if (editFecha !== editModal.fechaCompromiso) body.fechaCompromiso = editFecha;
    if (montoChanged) { body.monto = nuevoMonto; body.motivo = editMotivo.trim(); }
    const endpoint = editModal.tipo === "cxc"
      ? `/api/cuentas-cobrar/${editModal.id}`
      : `/api/cuentas-pagar/${editModal.id}`;
    const res = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success("Registro actualizado");
      await load();
      setEditModal(null);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al guardar");
    }
    setGuardandoEdit(false);
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
      body: JSON.stringify({
        monto: parseFloat(modalMonto) || modal.monto,
        fecha: modalFecha,
        notas: modalNotas,
        cuentaId: modalCuentaId || undefined,
        metodoPago: modalMetodoPago,
      }),
    });
    await load();
    setModal(null);
    setConfirmando(false);
    toast.success(modal.tipo === "cobro" ? "Cobro registrado" : "Pago registrado");
  }

  async function anular(id: string, tipo: "cobro" | "pago") {
    const label = tipo === "cobro" ? "cobro" : "pago";
    if (!await confirm({ message: `¿Anular este ${label}? El movimiento financiero asociado será eliminado y el registro volverá a estado Pendiente.`, danger: true, confirmText: "Anular" })) return;
    setAnulando(id);
    const endpoint = tipo === "cobro"
      ? `/api/cuentas-cobrar/${id}/anular`
      : `/api/cuentas-pagar/${id}/anular`;
    const res = await fetch(endpoint, { method: "POST" });
    if (res.ok) {
      toast.success("Registro anulado — vuelve a estado Pendiente");
      await load();
    } else {
      toast.error("Error al anular");
    }
    setAnulando(null);
  }

  async function eliminar(id: string, tipo: "cxc" | "cxp", liquidado: boolean) {
    const msg = liquidado
      ? `Este registro ya está liquidado. ¿Eliminar de todas formas? Esta acción no se puede deshacer.`
      : `¿Eliminar este registro? Esta acción no se puede deshacer.`;
    if (!await confirm({ message: msg, danger: true, confirmText: "Eliminar" })) return;
    const endpoint = tipo === "cxc"
      ? `/api/cuentas-cobrar/${id}`
      : `/api/cuentas-pagar/${id}`;
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      toast.success("Registro eliminado");
      await load();
    } else {
      toast.error("Error al eliminar");
    }
  }

  function openReciboModal() {
    const pendientes = cxp.filter(c => c.estado !== "LIQUIDADO");
    const gruposMap: Record<string, { nombre: string; tipo: string; items: CxPItem[] }> = {};
    for (const c of pendientes) {
      const key = c.socio?.id ?? c.tecnico?.id ?? c.proveedor?.id ?? `otro:${c.concepto}`;
      if (!gruposMap[key]) {
        const nombre = c.socio?.nombre ?? c.tecnico?.nombre ?? c.proveedor?.nombre ?? c.concepto;
        const tipo = c.tipoAcreedor === "SOCIO" ? "Socio"
          : c.tipoAcreedor === "TECNICO" ? "Técnico"
          : c.tipoAcreedor === "PERSONAL_INTERNO" ? "Nómina"
          : c.tipoAcreedor === "PROVEEDOR" ? "Proveedor"
          : "Otro";
        gruposMap[key] = { nombre, tipo, items: [] };
      }
      gruposMap[key].items.push(c);
    }
    const grupos = Object.entries(gruposMap).map(([key, g]) => ({ key, ...g }));
    const sel: Record<string, Set<string>> = {};
    for (const g of grupos) sel[g.key] = new Set(g.items.map(i => i.id));
    setReciboGrupos(grupos as Array<{ key: string; nombre: string; items: CxPItem[] }>);
    setReciboSeleccionados(sel);
    setShowReciboModal(true);
  }

  function toggleReciboItem(grupoKey: string, itemId: string) {
    setReciboSeleccionados(prev => {
      const set = new Set(prev[grupoKey] ?? []);
      if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
      return { ...prev, [grupoKey]: set };
    });
  }

  function generarReciboTecnico(grupoKey: string) {
    const ids = Array.from(reciboSeleccionados[grupoKey] ?? []);
    if (ids.length === 0) return;
    window.open(`/api/recibos/tecnico?ids=${ids.join(",")}`, "_blank");
  }

  const semanaActual = semanasOp[semanaIdx];
  const ESTADO_SEM: Record<string, string> = { PENDIENTE: "text-yellow-400", LIQUIDADO: "text-green-400", VENCIDO: "text-red-400", PARCIAL: "text-blue-400" };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">

      {/* Page-level tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1a1a1a] pb-0">
        {([["cobros", "Cobros y Pagos"], ["programacion", "Programación Semanal"]] as const).map(([key, label]) => (
          <button key={key}
            onClick={() => { setPageTab(key); if (key === "programacion") cargarProgramacion(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${pageTab === key ? "border-[#B3985B] text-white" : "border-transparent text-[#6b7280] hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Programación Semanal ── */}
      {pageTab === "programacion" && (
        <div className="space-y-5">
          {loadingSemana ? (
            <div className="text-sm text-gray-600 py-8 text-center">Cargando programación...</div>
          ) : (
            <>
              {/* Navegación semanas */}
              <div className="flex items-center justify-between">
                <button onClick={() => setSemanaIdx(i => Math.max(0, i - 1))} disabled={semanaIdx === 0}
                  className="px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white disabled:opacity-30 text-sm transition-colors">← Anterior</button>
                <div className="text-center">
                  <p className="text-white font-medium text-sm capitalize">
                    {semanaActual ? fmtSemana(semanaActual.lunesIso) : ""}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {semanaActual ? `al ${fmtSemana(semanaActual.miercolesIso)}` : ""}
                  </p>
                </div>
                <button onClick={() => setSemanaIdx(i => Math.min(semanasOp.length - 1, i + 1))} disabled={semanaIdx === semanasOp.length - 1}
                  className="px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white disabled:opacity-30 text-sm transition-colors">Siguiente →</button>
              </div>

              {/* KPIs semana */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Cobros esta semana</p>
                  <p className={`text-xl font-semibold ${semanaActual && semanaActual.totalCobros > 0 ? "text-green-400" : "text-gray-600"}`}>
                    {semanaActual ? formatCurrency(semanaActual.totalCobros) : "$0"}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">{semanaActual?.cobros.length ?? 0} registros · Lunes y Miércoles</p>
                </div>
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pagos esta semana</p>
                  <p className={`text-xl font-semibold ${semanaActual && semanaActual.totalPagos > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                    {semanaActual ? formatCurrency(semanaActual.totalPagos) : "$0"}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">{semanaActual?.pagos.length ?? 0} registros · Miércoles</p>
                </div>
              </div>

              {/* Sección cobros — siempre visible */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Cobros</p>
                    <p className="text-gray-600 text-[10px] mt-0.5 capitalize">
                      {semanaActual ? `Lunes ${fmtDiaSemana(semanaActual.lunesIso)} y Miércoles ${fmtDiaSemana(semanaActual.miercolesIso)}` : ""}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400/60" />
                </div>
                {semanaActual && semanaActual.cobros.length > 0 ? (
                  <div className="divide-y divide-[#1a1a1a]">
                    {semanaActual.cobros.map(c => (
                      <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{c.cliente.nombre}</p>
                          <p className="text-gray-500 text-xs truncate">{c.concepto}{c.proyecto ? ` · ${c.proyecto.numeroProyecto}` : ""}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-600 capitalize">{c.tipoPago === "ANTICIPO" ? "Anticipo" : c.tipoPago === "LIQUIDACION" ? "Liquidación" : c.tipoPago}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-green-400 font-semibold text-sm">{formatCurrency(c.monto)}</p>
                          <p className={`text-[10px] ${ESTADO_SEM[c.estado] ?? "text-gray-400"}`}>{c.estado}</p>
                          {c.cliente.telefono && (
                            <a href={`https://wa.me/${c.cliente.telefono.replace(/\D/g, "")}?text=${waMsgCobro(c.cliente.nombre, c.monto, c.concepto)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-green-500/70 hover:text-green-400 transition-colors">WhatsApp →</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-gray-700 text-sm">Sin cobros programados esta semana</p>
                    <p className="text-gray-700 text-xs mt-1">Los cobros con fecha de compromiso en esta semana aparecerán aquí</p>
                  </div>
                )}
              </div>

              {/* Sección pagos — siempre visible */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Pagos</p>
                    <p className="text-gray-600 text-[10px] mt-0.5 capitalize">
                      {semanaActual ? `Miércoles ${fmtDiaSemana(semanaActual.miercolesIso)}` : ""}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                </div>

                {/* Agrupados por tipo */}
                {semanaActual && semanaActual.pagos.length > 0 ? (() => {
                  const tecnicos = semanaActual.pagos.filter(p => p.tipoAcreedor === "TECNICO");
                  const proveedores = semanaActual.pagos.filter(p => p.tipoAcreedor === "PROVEEDOR");
                  const otros = semanaActual.pagos.filter(p => p.tipoAcreedor !== "TECNICO" && p.tipoAcreedor !== "PROVEEDOR");
                  return (
                    <div className="divide-y divide-[#1a1a1a]">
                      {[
                        { label: "Técnicos", items: tecnicos, color: "text-blue-400" },
                        { label: "Proveedores", items: proveedores, color: "text-purple-400" },
                        { label: "Otros", items: otros, color: "text-yellow-400" },
                      ].filter(g => g.items.length > 0).map(grupo => (
                        <div key={grupo.label}>
                          <p className="px-4 py-2 text-[10px] text-gray-600 uppercase tracking-wider font-semibold bg-[#0d0d0d]">{grupo.label}</p>
                          {grupo.items.map(p => {
                            const nombre = p.socio?.nombre ?? p.tecnico?.nombre ?? p.proveedor?.nombre ?? "Sin nombre";
                            const tel = p.tecnico?.celular ?? p.proveedor?.telefono ?? null;
                            return (
                              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 border-t border-[#1a1a1a]">
                                <div className="min-w-0 flex-1">
                                  <p className="text-white text-sm font-medium truncate">{nombre}</p>
                                  <p className="text-gray-500 text-xs truncate">{p.concepto}{p.proyecto ? ` · ${p.proyecto.numeroProyecto}` : ""}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`font-semibold text-sm ${grupo.color}`}>{formatCurrency(p.monto)}</p>
                                  <p className={`text-[10px] ${ESTADO_SEM[p.estado] ?? "text-gray-400"}`}>{p.estado}</p>
                                  {tel && (
                                    <a href={`https://wa.me/${tel.replace(/\D/g, "")}?text=${waMsgPago(nombre, p.monto, p.concepto)}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="text-[10px] text-green-500/70 hover:text-green-400 transition-colors">WhatsApp →</a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-gray-700 text-sm">Sin pagos programados esta semana</p>
                    <p className="text-gray-700 text-xs mt-1">Los pagos a técnicos, proveedores y otros con fecha en esta semana aparecerán aquí</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Cobros y Pagos ── */}
      {pageTab === "cobros" && <>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Cobros y Pagos</h1>
          <p className="text-[#6b7280] text-sm">Cuentas por cobrar y por pagar</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openReciboModal}
            className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm font-medium hover:border-[#B3985B] hover:text-[#B3985B] transition-colors">
            Recibos técnicos
          </button>
          <button
            onClick={() => { setNuevoForm({ ...NUEVO_REGISTRO_EMPTY }); setEmpresaQuery(""); setShowNuevo(true); }}
            className="px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] transition-colors">
            + Nuevo registro
          </button>
        </div>
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
          {([["cobrar", "Por Cobrar", cxcList.length], ["pagar", "Por Pagar", cxpList.length], ["directos", "Movimientos directos", movDirectos.length]] as const).map(([key, label, count]) => (
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
                    {c.empresa ? (
                      <Link href={`/catalogo/empresas`}
                        className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
                        {c.empresa.nombre}
                      </Link>
                    ) : c.cliente ? (
                      <Link href={`/crm/clientes/${c.cliente.id}`}
                        className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors">
                        {c.cliente.nombre}
                      </Link>
                    ) : (
                      <span className="text-white text-sm font-medium">—</span>
                    )}
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
                  <>
                    <button onClick={() => openModal(c, "cobro")}
                      className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#d4b068] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confirmar cobro
                    </button>
                    <button onClick={() => openEdit(c, "cxc")}
                      className="flex items-center gap-1.5 text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  </>
                )}
                {(() => {
                  const tel = (c.empresa?.telefono ?? c.cliente?.telefono) ?? null;
                  const nom = c.empresa?.nombre ?? c.cliente?.nombre ?? "";
                  return c.estado !== "LIQUIDADO" && tel ? (
                    <a href={`https://wa.me/${tel.replace(/\D/g, "")}?text=${waMsgCobro(nom, c.monto, c.concepto)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-400 border border-green-900/40 hover:border-green-600 px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
                      </svg>
                      WhatsApp
                    </a>
                  ) : null;
                })()}
                {c.estado === "LIQUIDADO" && (
                  <>
                    <a href={`/api/cuentas-cobrar/${c.id}/recibo`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Recibo PDF
                    </a>
                    <button onClick={() => anular(c.id, "cobro")} disabled={anulando === c.id}
                      className="text-xs text-red-400/70 border border-red-900/30 hover:border-red-700 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                      {anulando === c.id ? "Anulando..." : "Anular cobro"}
                    </button>
                  </>
                )}
                <button onClick={() => eliminar(c.id, "cxc", c.estado === "LIQUIDADO")}
                  className="ml-auto text-xs text-gray-700 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors">
                  Eliminar
                </button>
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
            const beneficiario = c.socio?.nombre ?? c.empresa?.nombre ?? c.proveedor?.nombre ?? c.tecnico?.nombre ?? "—";
            const telefono = c.empresa?.telefono ?? c.proveedor?.telefono ?? c.tecnico?.celular ?? null;
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
                    <>
                      <button onClick={() => openModal(c, "pago")}
                        className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#d4b068] px-3 py-1.5 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Marcar pagado
                      </button>
                      <button onClick={() => openEdit(c, "cxp")}
                        className="flex items-center gap-1.5 text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                    </>
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
                    <>
                      <span className="text-xs text-green-400/60 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Pagado
                      </span>
                      <button onClick={() => anular(c.id, "pago")} disabled={anulando === c.id}
                        className="text-xs text-red-400/70 border border-red-900/30 hover:border-red-700 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                        {anulando === c.id ? "Anulando..." : "Anular pago"}
                      </button>
                    </>
                  )}
                  <button onClick={() => eliminar(c.id, "cxp", c.estado === "LIQUIDADO")}
                    className="ml-auto text-xs text-gray-700 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Movimientos directos ── */}
      {tab === "directos" && (
        <div className="space-y-2">
          {movDirectos.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl text-center py-16">
              <p className="text-[#6b7280] text-sm">Sin movimientos directos</p>
              <p className="text-[#444] text-xs mt-1">Los ingresos y gastos registrados directamente (no vinculados a CxC/CxP) aparecen aquí</p>
              <a href="/finanzas/movimientos/nuevo" className="inline-block mt-4 px-4 py-1.5 rounded-lg bg-[#B3985B]/15 text-[#B3985B] text-xs font-medium hover:bg-[#B3985B]/25 transition-colors">
                + Registrar movimiento
              </a>
            </div>
          ) : movDirectos.map(mov => (
            <div key={mov.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white text-sm font-medium">{mov.concepto}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${mov.tipo === "INGRESO" ? "bg-green-900/40 text-green-300" : mov.tipo === "GASTO" ? "bg-red-900/40 text-red-300" : "bg-blue-900/40 text-blue-300"}`}>
                      {mov.tipo === "INGRESO" ? "Ingreso" : mov.tipo === "GASTO" ? "Gasto" : mov.tipo}
                    </span>
                    {mov.categoria && (
                      <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">{mov.categoria.nombre}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {mov.proyecto && (
                      <Link href={`/proyectos/${mov.proyecto.id}`} className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
                        {mov.proyecto.numeroProyecto} · {mov.proyecto.nombre}
                      </Link>
                    )}
                    {mov.cliente && <span className="text-[10px] text-[#555]">{mov.cliente.nombre}</span>}
                    {mov.referencia && <span className="text-[10px] text-[#555]">Ref: {mov.referencia}</span>}
                    <span className="text-[10px] text-[#555]">{fmtDate(mov.fecha)}</span>
                    <span className="text-[10px] text-[#555]">{mov.cuentaDestino?.nombre ?? mov.cuentaOrigen?.nombre ?? ""}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-base ${mov.tipo === "INGRESO" ? "text-green-400" : mov.tipo === "GASTO" ? "text-red-400" : "text-white"}`}>
                    {mov.tipo === "GASTO" ? "-" : "+"}{formatCurrency(mov.monto)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[#1a1a1a]">
                <Link href="/finanzas/movimientos"
                  className="text-xs text-[#555] hover:text-[#B3985B] transition-colors">
                  Ver en movimientos →
                </Link>
              </div>
            </div>
          ))}
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
                <input type="number" step="0.01" min="0" value={modalMonto} onChange={e => setModalMonto(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
                <p className="text-[10px] text-gray-600 mt-1">Total: {formatCurrency(modal.monto)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                <input type="date" value={modalFecha} onChange={e => setModalFecha(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {modal.tipo === "cobro" ? "Cuenta de destino (banco donde entra)" : "Cuenta de origen (banco de donde sale)"}
                </label>
                <select value={modalCuentaId} onChange={e => setModalCuentaId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Sin especificar —</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.banco ? ` · ${c.banco}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Método de pago</label>
                <select value={modalMetodoPago} onChange={e => setModalMetodoPago(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]">
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notas / referencia (opcional)</label>
                <input value={modalNotas} onChange={e => setModalNotas(e.target.value)}
                  placeholder="Número de transferencia, folio..."
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
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

      {/* ── Modal editar CxC / CxP ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Editar registro</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Concepto</label>
                <input value={editConcepto} onChange={e => setEditConcepto(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto</label>
                <input type="number" step="0.01" min="0" value={editMonto} onChange={e => setEditMonto(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha compromiso</label>
                <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
              </div>
              {parseFloat(editMonto) !== editModal.monto && (
                <div>
                  <label className="text-xs text-[#B3985B] mb-1 block">Motivo del ajuste de monto (requerido)</label>
                  <input value={editMotivo} onChange={e => setEditMotivo(e.target.value)}
                    placeholder="Ej: Negociación con cliente, error de captura..."
                    className="w-full bg-[#1a1a1a] border border-[#B3985B]/40 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={guardarEdit} disabled={guardandoEdit}
                className="flex-1 bg-[#B3985B] hover:bg-[#d4b068] disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {guardandoEdit ? "Guardando..." : "Guardar cambios"}
              </button>
              <button onClick={() => setEditModal(null)}
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
                  <input type="number" step="0.01" min="0" value={nuevoForm.monto} onChange={e => setNuevoForm(p => ({ ...p, monto: e.target.value }))}
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
                  {/* Empresa / cliente CxC */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-500">Empresa o cliente *</label>
                      <div className="flex items-center gap-3">
                        <a href="/crm/clientes/nuevo" target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[#B3985B] hover:text-white transition-colors">+ Nuevo cliente</a>
                        <a href="/catalogo/empresas" target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[#B3985B] hover:text-white transition-colors">+ Nueva empresa</a>
                      </div>
                    </div>
                    {(nuevoForm.empresaId || nuevoForm.clienteId) ? (
                      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#B3985B]/40 rounded-lg px-3 py-2">
                        <span className="text-[#B3985B] text-sm flex-1 truncate">✓ {empresaQuery}</span>
                        <button onClick={() => { setNuevoForm(p => ({ ...p, empresaId: "", clienteId: "" })); setEmpresaQuery(""); }}
                          className="text-gray-600 hover:text-red-400 shrink-0 text-xs">✕</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input value={empresaQuery}
                          onChange={e => { setEmpresaQuery(e.target.value); setNuevoForm(p => ({ ...p, empresaId: "", clienteId: "" })); }}
                          onFocus={() => setDropdownOpen("cxc")}
                          onBlur={() => setTimeout(() => setDropdownOpen(d => d === "cxc" ? null : d), 150)}
                          placeholder="Clic para ver lista o escribe para buscar…"
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                        {dropdownOpen === "cxc" && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-[#1c1c1c] border border-[#333] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                            {clientes
                              .filter(c => {
                                if (!empresaQuery) return true;
                                const q = empresaQuery.toLowerCase();
                                return c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
                              })
                              .map(c => (
                                <button key={`cli-${c.id}`}
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setNuevoForm(p => ({ ...p, clienteId: c.id, empresaId: "" })); setEmpresaQuery(c.nombre); setDropdownOpen(null); }}
                                  className="w-full text-left px-3 py-2 hover:bg-[#272727] transition-colors border-b border-[#242424] last:border-0">
                                  <p className="text-sm text-white">{c.nombre}</p>
                                  {c.empresa && <p className="text-[10px] text-gray-500">{c.empresa}</p>}
                                </button>
                              ))}
                            {clientes.filter(c => {
                              if (!empresaQuery) return true;
                              const q = empresaQuery.toLowerCase();
                              return c.nombre.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q);
                            }).length === 0 && (
                              <p className="px-3 py-2.5 text-xs text-gray-600">Sin resultados</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Tipo de pago</label>
                    <select value={nuevoForm.tipoPago} onChange={e => setNuevoForm(p => ({ ...p, tipoPago: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="ANTICIPO">Anticipo</option>
                      <option value="LIQUIDACION">Liquidación</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
                    <textarea value={nuevoForm.notas} onChange={e => setNuevoForm(p => ({ ...p, notas: e.target.value }))}
                      rows={2} placeholder="Observaciones del cobro…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                  </div>
                </>
              )}

              {/* CxP — técnico freelancer */}
              {nuevoForm.tipo === "cxp" && (
                <>
                  {/* ── Técnico freelancer ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-500">Técnico freelancer</label>
                      {!nuevoForm.tecnicoId && (
                        <button type="button"
                          onClick={() => { setShowNuevoTecnico(v => !v); setDropdownOpen(null); }}
                          className="text-[10px] text-[#B3985B] hover:text-white transition-colors">
                          {showNuevoTecnico ? "Cancelar" : "+ Nuevo técnico"}
                        </button>
                      )}
                    </div>
                    {nuevoForm.tecnicoId ? (
                      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#B3985B]/40 rounded-lg px-3 py-2">
                        <span className="text-[#B3985B] text-sm flex-1 truncate">✓ {tecnicoQuery}</span>
                        <button onClick={() => { setNuevoForm(p => ({ ...p, tecnicoId: "" })); setTecnicoQuery(""); setShowNuevoTecnico(false); }}
                          className="text-gray-600 hover:text-red-400 shrink-0 text-xs">✕</button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <input
                            value={tecnicoQuery}
                            onChange={e => { setTecnicoQuery(e.target.value); setShowNuevoTecnico(false); }}
                            onFocus={() => setDropdownOpen("cxp_tec")}
                            onBlur={() => setTimeout(() => setDropdownOpen(d => d === "cxp_tec" ? null : d), 150)}
                            placeholder="Clic para ver lista o escribe para buscar…"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                          {dropdownOpen === "cxp_tec" && (
                            <div className="absolute z-10 left-0 right-0 mt-1 bg-[#1c1c1c] border border-[#333] rounded-lg shadow-xl max-h-44 overflow-y-auto">
                              {tecnicos
                                .filter(t => !tecnicoQuery || t.nombre.toLowerCase().includes(tecnicoQuery.toLowerCase()))
                                .map(t => (
                                  <button key={t.id}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      setNuevoForm(f => ({ ...f, tecnicoId: t.id, empresaId: "", proveedorId: "" }));
                                      setTecnicoQuery(t.nombre);
                                      setEmpresaQuery("");
                                      setDropdownOpen(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#272727] transition-colors border-b border-[#242424] last:border-0">
                                    <p className="text-sm text-white">{t.nombre}</p>
                                    {t.celular && <p className="text-[10px] text-gray-500">{t.celular}</p>}
                                  </button>
                                ))}
                              {/* No encontrado → registrar nuevo */}
                              {tecnicoQuery && tecnicos.filter(t => t.nombre.toLowerCase().includes(tecnicoQuery.toLowerCase())).length === 0 && (
                                <button
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setShowNuevoTecnico(true); setDropdownOpen(null); }}
                                  className="w-full text-left px-3 py-2 text-[#B3985B] hover:bg-[#272727] transition-colors text-sm">
                                  + Registrar &quot;{tecnicoQuery}&quot; como técnico freelancer
                                </button>
                              )}
                              {!tecnicoQuery && tecnicos.length === 0 && (
                                <p className="px-3 py-2.5 text-xs text-gray-600">Sin técnicos registrados aún</p>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Mini-form registro rápido */}
                        {showNuevoTecnico && (
                          <div className="mt-2 bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                            <p className="text-xs font-semibold text-[#B3985B]">Registrar técnico freelancer</p>
                            <div>
                              <label className="text-[11px] text-gray-500 block mb-1">Nombre <span className="text-red-400">*</span></label>
                              <input
                                value={nuevoTecnicoForm.nombre}
                                onChange={e => setNuevoTecnicoForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Nombre completo"
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-gray-500 block mb-1">Celular (opcional)</label>
                              <input
                                value={nuevoTecnicoForm.celular}
                                onChange={e => setNuevoTecnicoForm(f => ({ ...f, celular: e.target.value }))}
                                placeholder="10 dígitos"
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                disabled={guardandoTecnico || !nuevoTecnicoForm.nombre.trim()}
                                onClick={async () => {
                                  if (!nuevoTecnicoForm.nombre.trim()) return;
                                  setGuardandoTecnico(true);
                                  try {
                                    const r = await fetch("/api/tecnicos", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ nombre: nuevoTecnicoForm.nombre.trim(), celular: nuevoTecnicoForm.celular || null }),
                                    });
                                    const data = await r.json();
                                    if (r.ok && data.tecnico) {
                                      setTecnicos(prev => [...prev, data.tecnico]);
                                      setNuevoForm(f => ({ ...f, tecnicoId: data.tecnico.id, empresaId: "", proveedorId: "" }));
                                      setTecnicoQuery(data.tecnico.nombre);
                                      setEmpresaQuery("");
                                      setShowNuevoTecnico(false);
                                      setNuevoTecnicoForm({ nombre: "", celular: "" });
                                    }
                                  } finally {
                                    setGuardandoTecnico(false);
                                  }
                                }}
                                className="flex-1 py-2 rounded-lg bg-[#B3985B] text-black text-xs font-semibold hover:bg-[#c4aa6b] disabled:opacity-40 transition-colors"
                              >
                                {guardandoTecnico ? "Guardando…" : "Registrar técnico"}
                              </button>
                              <button
                                onClick={() => { setShowNuevoTecnico(false); setNuevoTecnicoForm({ nombre: "", celular: "" }); }}
                                className="px-3 py-2 rounded-lg border border-[#333] text-gray-400 text-xs hover:text-white transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* ── Empresa o proveedor ── */}
                  {!nuevoForm.tecnicoId && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-500">Empresa o proveedor</label>
                        <a href="/catalogo/empresas" target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[#B3985B] hover:text-white transition-colors">+ Nueva empresa</a>
                      </div>
                      {(nuevoForm.empresaId || nuevoForm.proveedorId) ? (
                        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#B3985B]/40 rounded-lg px-3 py-2">
                          <span className="text-[#B3985B] text-sm flex-1 truncate">✓ {empresaQuery}</span>
                          <button onClick={() => { setNuevoForm(p => ({ ...p, empresaId: "", proveedorId: "" })); setEmpresaQuery(""); }}
                            className="text-gray-600 hover:text-red-400 shrink-0 text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input value={empresaQuery}
                            onChange={e => { setEmpresaQuery(e.target.value); setNuevoForm(p => ({ ...p, empresaId: "", proveedorId: "" })); }}
                            onFocus={() => setDropdownOpen("cxp_emp")}
                            onBlur={() => setTimeout(() => setDropdownOpen(d => d === "cxp_emp" ? null : d), 150)}
                            placeholder="Clic para ver lista o escribe para buscar…"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                          {dropdownOpen === "cxp_emp" && (
                            <div className="absolute z-10 left-0 right-0 mt-1 bg-[#1c1c1c] border border-[#333] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                              {proveedores
                                .filter(p => {
                                  if (!empresaQuery) return true;
                                  const q = empresaQuery.toLowerCase();
                                  return p.nombre.toLowerCase().includes(q) || (p.empresa ?? "").toLowerCase().includes(q);
                                })
                                .map(p => (
                                  <button key={`prov-${p.id}`}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => { setNuevoForm(f => ({ ...f, proveedorId: p.id, empresaId: "" })); setEmpresaQuery(p.nombre); setDropdownOpen(null); }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#272727] transition-colors border-b border-[#242424] last:border-0">
                                    <p className="text-sm text-white">{p.nombre}</p>
                                    {p.empresa && <p className="text-[10px] text-gray-500">{p.empresa}</p>}
                                  </button>
                                ))}
                              {empresas
                                .filter(e => e.contactosProveedor.length === 0)
                                .filter(e => !empresaQuery || e.nombre.toLowerCase().includes(empresaQuery.toLowerCase()))
                                .map(e => (
                                  <button key={`emp-${e.id}`}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => { setNuevoForm(p => ({ ...p, empresaId: e.id, proveedorId: "" })); setEmpresaQuery(e.nombre); setDropdownOpen(null); }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#272727] transition-colors border-b border-[#242424]">
                                    <p className="text-sm text-white">{e.nombre}</p>
                                    {e.giro && <p className="text-[10px] text-gray-500">{e.giro}</p>}
                                  </button>
                                ))}
                              {proveedores.filter(p => !empresaQuery || p.nombre.toLowerCase().includes(empresaQuery.toLowerCase())).length === 0 &&
                               empresas.filter(e => e.contactosProveedor.length === 0 && (!empresaQuery || e.nombre.toLowerCase().includes(empresaQuery.toLowerCase()))).length === 0 && (
                                <p className="px-3 py-2.5 text-xs text-gray-600">Sin resultados</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Fallback nombre libre ── */}
                  {!nuevoForm.tecnicoId && !nuevoForm.empresaId && !nuevoForm.proveedorId && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">A quién se le paga (si no está en lista)</label>
                      <input value={nuevoForm.acreedorNombre} onChange={e => setNuevoForm(p => ({ ...p, acreedorNombre: e.target.value }))}
                        placeholder="Nombre del acreedor…"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
                    <textarea value={nuevoForm.notas} onChange={e => setNuevoForm(p => ({ ...p, notas: e.target.value }))}
                      rows={2} placeholder="Observaciones del pago…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                  </div>
                </>
              )}

              {/* Proyecto — para ambos tipos */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Proyecto (opcional)</label>
                <select value={nuevoForm.proyectoId} onChange={e => setNuevoForm(p => ({ ...p, proyectoId: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                  <option value="">— Sin proyecto —</option>
                  {proyectos.map(p => (
                    <option key={p.id} value={p.id}>{p.numeroProyecto} · {p.nombre}</option>
                  ))}
                </select>
              </div>
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
      {/* ── Modal recibos de técnicos ── */}
      {showReciboModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowReciboModal(false); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
              <div>
                <h3 className="text-white font-semibold text-base">Recibos de Técnicos</h3>
                <p className="text-gray-500 text-xs mt-0.5">Selecciona los conceptos a incluir en cada recibo</p>
              </div>
              <button onClick={() => setShowReciboModal(false)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {reciboGrupos.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-600 text-sm">Sin pagos pendientes</p>
                  <p className="text-gray-700 text-xs mt-1">Los pagos con estado Pendiente o Parcial aparecerán aquí</p>
                </div>
              ) : reciboGrupos.map(grupo => {
                const seleccionados = reciboSeleccionados[grupo.key] ?? new Set();
                const totalSeleccionado = grupo.items
                  .filter(i => seleccionados.has(i.id))
                  .reduce((s, i) => s + i.monto, 0);
                const todosSeleccionados = grupo.items.every(i => seleccionados.has(i.id));
                return (
                  <div key={grupo.key} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden">
                    {/* Encabezado beneficiario */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={todosSeleccionados}
                          onChange={() => {
                            setReciboSeleccionados(prev => ({
                              ...prev,
                              [grupo.key]: todosSeleccionados
                                ? new Set()
                                : new Set(grupo.items.map(i => i.id)),
                            }));
                          }}
                          className="w-4 h-4 accent-[#B3985B] cursor-pointer" />
                        <div>
                          <p className="text-white text-sm font-semibold">{grupo.nombre}</p>
                          <p className="text-gray-600 text-[10px]">{grupo.items.length} concepto{grupo.items.length !== 1 ? "s" : ""} pendiente{grupo.items.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#B3985B] text-sm font-semibold">{formatCurrency(totalSeleccionado)}</p>
                        <p className="text-gray-600 text-[10px]">{seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {/* Conceptos */}
                    <div className="divide-y divide-[#1a1a1a]">
                      {grupo.items.map(item => (
                        <label key={item.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors">
                          <input type="checkbox"
                            checked={seleccionados.has(item.id)}
                            onChange={() => toggleReciboItem(grupo.key, item.id)}
                            className="w-4 h-4 accent-[#B3985B] cursor-pointer mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-xs leading-snug">{item.concepto}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {item.proyecto && (
                                <span className="text-gray-600 text-[10px]">{item.proyecto.numeroProyecto} · {item.proyecto.nombre}</span>
                              )}
                              <span className={`text-[10px] ${isVencida(item.fechaCompromiso, item.estado) ? "text-red-400" : "text-gray-600"}`}>
                                {fmtDate(item.fechaCompromiso)}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ESTADO_COLORS[item.estado] ?? "bg-gray-800 text-gray-400"}`}>
                                {item.estado}
                              </span>
                            </div>
                          </div>
                          <p className="text-white text-xs font-semibold shrink-0">{formatCurrency(item.monto)}</p>
                        </label>
                      ))}
                    </div>

                    {/* Botón generar */}
                    <div className="px-4 py-3 border-t border-[#1e1e1e]">
                      <button
                        onClick={() => generarReciboTecnico(grupo.key)}
                        disabled={seleccionados.size === 0}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c4aa6b] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generar recibo · {formatCurrency(totalSeleccionado)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
