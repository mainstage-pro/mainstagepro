"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

// Test de despliegue automático en Vercel
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

interface AbonoItem {
  id: string;
  monto: number;
  fecha: string;
  metodoPago: string;
  notas: string | null;
}

interface CuotaItem {
  id: string;
  numeroCuota: number;
  monto: number;
  fechaCompromiso: string;
  estado: string; // PENDIENTE | PAGADO
  abonoPago?: { id: string; fecha: string; monto: number; metodoPago: string } | null;
  abono?: { id: string; fecha: string; monto: number; metodoPago: string } | null;
}

// ── Plan de pagos state ────────────────────────────────────────────────────────
interface PlanState {
  cuentaId: string;
  tipo: 'cxc' | 'cxp';
  monto: number;
  montoPagado: number;
  concepto: string;
  cuotas: CuotaItem[];
  // ui state
  view: 'list' | 'create'; // 'list' = ver plan existente, 'create' = crear nuevo
  numCuotas: number;
  draft: { monto: string; fecha: string }[];
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
  proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string | null } | null;
  cotizacion: { id: string; numeroCotizacion: string } | null;
  cuentaDestino: { id: string; nombre: string; banco: string | null } | null;
  abonos: AbonoItem[];
}

interface CxPItem {
  id: string;
  concepto: string;
  monto: number;
  montoPagado: number;
  estado: string;
  fechaCompromiso: string;
  tipoAcreedor: string;
  tecnico: { id: string; nombre: string; celular: string | null } | null;
  proveedor: { id: string; nombre: string; telefono: string | null } | null;
  empresa: { id: string; nombre: string; telefono: string | null } | null;
  socio: { id: string; nombre: string; email: string | null } | null;
  proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string | null } | null;
  cuentaOrigen: { id: string; nombre: string; banco: string | null } | null;
  abonos: AbonoItem[];
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

type ProyGrupo<T> = {
  proyectoId: string | null;
  proyectoNombre: string | null;
  numeroProyecto: string | null;
  fechaEvento: string | null;
  items: T[];
};
function groupByProject<T extends { proyecto: { id: string; nombre: string; numeroProyecto: string; fechaEvento: string | null } | null }>(items: T[]): ProyGrupo<T>[] {
  const map = new Map<string, ProyGrupo<T>>();
  for (const item of items) {
    const key = item.proyecto?.id ?? "__sin_proyecto__";
    if (!map.has(key)) {
      map.set(key, {
        proyectoId: item.proyecto?.id ?? null,
        proyectoNombre: item.proyecto?.nombre ?? null,
        numeroProyecto: item.proyecto?.numeroProyecto ?? null,
        fechaEvento: item.proyecto?.fechaEvento ?? null,
        items: [],
      });
    }
    map.get(key)!.items.push(item);
  }
  const grupos = Array.from(map.values());
  const conProyecto = grupos.filter(g => g.proyectoId !== null);
  const sinProyecto = grupos.filter(g => g.proyectoId === null);
  return [...conProyecto, ...sinProyecto];
}

function splitGroups<T>(grupos: ProyGrupo<T>[], hoy: string): { proximos: ProyGrupo<T>[]; pasados: ProyGrupo<T>[] } {
  const proximos = grupos
    .filter(g => !g.fechaEvento || g.fechaEvento.substring(0, 10) >= hoy)
    .sort((a, b) => (a.fechaEvento ?? "9999").localeCompare(b.fechaEvento ?? "9999"));
  const pasados = grupos
    .filter(g => !!g.fechaEvento && g.fechaEvento.substring(0, 10) < hoy)
    .sort((a, b) => b.fechaEvento!.localeCompare(a.fechaEvento!));
  return { proximos, pasados };
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:  "bg-yellow-900/40 text-yellow-400",
  PARCIAL:    "bg-blue-900/40 text-blue-400",
  LIQUIDADO:  "bg-green-900/40 text-green-400",
  VENCIDO:    "bg-red-900/40 text-red-400",
  CANCELADO:  "bg-gray-800 text-gray-500",
};

const TIPO_LABELS: Record<string, string> = {
  ANTICIPO: "Anticipo",
  LIQUIDACION: "Liquidación",
  TOTAL: "Total",
};

function fmtDate(d: string) {
  return new Date(d.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
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

// ── Smart distribution for cuotas ────────────────────────────────────────────
function distribuirCuotas(total: number, n: number, fechaBase: string): { monto: string; fecha: string }[] {
  if (n < 1) return [];
  // Determine rounding precision based on average cuota size
  const avg = total / n;
  const precision = avg > 10000 ? 1000 : avg > 1000 ? 500 : avg > 100 ? 100 : 10;
  const base = Math.floor(total / n / precision) * precision;
  const result: { monto: string; fecha: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(fechaBase + 'T12:00:00Z');
    d.setMonth(d.getMonth() + i + 1);
    const fecha = d.toISOString().slice(0, 10);
    const monto = i < n - 1 ? base : Math.round((total - base * (n - 1)) * 100) / 100;
    result.push({ monto: monto.toString(), fecha });
  }
  return result;
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
  const [marcandoLiquidado, setMarcandoLiquidado] = useState<string | null>(null);
  const [expandedAbonos, setExpandedAbonos] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "liquidados">("pendientes");
  const [sortBy, setSortBy] = useState<"fecha_asc" | "fecha_desc" | "monto_desc" | "monto_asc" | "nombre_asc">("fecha_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
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
  const [editClienteId, setEditClienteId] = useState("");
  const [editCuentaId, setEditCuentaId] = useState("");
  const [editProveedorId, setEditProveedorId] = useState("");
  const [editTecnicoId, setEditTecnicoId] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  // Recibos de técnicos
  const [showReciboModal, setShowReciboModal] = useState(false);
  const [reciboGrupos, setReciboGrupos] = useState<Array<{ key: string; nombre: string; items: CxPItem[] }>>([]);
  const [reciboSeleccionados, setReciboSeleccionados] = useState<Record<string, Set<string>>>({});
  // Plan de pagos / cobros
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [payingCuota, setPayingCuota] = useState<string | null>(null);
  const [payCuotaId, setPayCuotaId] = useState<string | null>(null);
  const [payCuotaMetodo, setPayCuotaMetodo] = useState('TRANSFERENCIA');
  const [payCuotaCuenta, setPayCuotaCuenta] = useState('');
  const [payCuotaNotas, setPayCuotaNotas] = useState('');
  const [payCuotaFecha, setPayCuotaFecha] = useState(new Date().toISOString().split('T')[0]);

  // ── Plan de pagos / cobros ────────────────────────────────────────────────
  async function openPlan(id: string, tipo: 'cxc' | 'cxp', monto: number, montoPagado: number, concepto: string) {
    setLoadingPlan(true);
    const endpoint = tipo === 'cxc' ? `/api/cuentas-cobrar/${id}/plan` : `/api/cuentas-pagar/${id}/plan`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    const data = await res.json();
    const cuotas: CuotaItem[] = data.cuotas ?? [];
    const pendiente = monto - montoPagado;
    const hasCuotas = cuotas.length > 0;
    const numDefault = hasCuotas ? cuotas.length : 3;
    const draft = hasCuotas
      ? cuotas.filter(c => c.estado === 'PENDIENTE').map(c => ({ monto: c.monto.toString(), fecha: c.fechaCompromiso.substring(0, 10) }))
      : distribuirCuotas(pendiente, numDefault, new Date().toISOString().slice(0, 10));
    setPlan({
      cuentaId: id, tipo, monto, montoPagado, concepto, cuotas,
      view: hasCuotas ? 'list' : 'create',
      numCuotas: numDefault,
      draft,
    });
    setLoadingPlan(false);
  }

  function updatePlanDraft(n: number) {
    if (!plan) return;
    const pendiente = plan.monto - plan.montoPagado;
    const draft = distribuirCuotas(pendiente, n, new Date().toISOString().slice(0, 10));
    setPlan(prev => prev ? { ...prev, numCuotas: n, draft } : null);
  }

  async function savePlan() {
    if (!plan) return;
    setSavingPlan(true);
    const cuotas = plan.draft.map(d => ({ monto: parseFloat(d.monto), fechaCompromiso: d.fecha }));
    const endpoint = plan.tipo === 'cxc' ? `/api/cuentas-cobrar/${plan.cuentaId}/plan` : `/api/cuentas-pagar/${plan.cuentaId}/plan`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuotas }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Error al guardar plan'); setSavingPlan(false); return; }
    toast.success('Plan de cuotas creado');
    // Reload plan
    await openPlan(plan.cuentaId, plan.tipo, plan.monto, plan.montoPagado, plan.concepto);
    setSavingPlan(false);
  }

  async function pagarCuota(cuotaId: string) {
    if (!plan) return;
    setPayingCuota(cuotaId);
    const endpoint = plan.tipo === 'cxc'
      ? `/api/cuentas-cobrar/${plan.cuentaId}/plan/${cuotaId}/cobrar`
      : `/api/cuentas-pagar/${plan.cuentaId}/plan/${cuotaId}/pagar`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metodoPago: payCuotaMetodo, cuentaDestinoId: payCuotaCuenta || null, cuentaOrigenId: payCuotaCuenta || null, notas: payCuotaNotas || null, fecha: payCuotaFecha || null }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Error al registrar pago'); setPayingCuota(null); return; }
    toast.success(plan.tipo === 'cxc' ? 'Cobro registrado' : 'Pago registrado');
    setPayCuotaId(null); setPayCuotaMetodo('TRANSFERENCIA'); setPayCuotaCuenta(''); setPayCuotaNotas(''); setPayCuotaFecha(new Date().toISOString().split('T')[0]);
    // Reload plan + main list
    const updatedCuenta = data.cuenta;
    if (updatedCuenta) {
      if (plan.tipo === 'cxc') {
        setCxc(prev => prev.map(c => c.id === plan.cuentaId ? { ...c, montoCobrado: updatedCuenta.montoCobrado, estado: updatedCuenta.estado } : c));
      } else {
        setCxp(prev => prev.map(c => c.id === plan.cuentaId ? { ...c, montoPagado: updatedCuenta.montoPagado, estado: updatedCuenta.estado } : c));
      }
    }
    await openPlan(plan.cuentaId, plan.tipo, plan.monto, updatedCuenta?.montoPagado ?? updatedCuenta?.montoCobrado ?? plan.montoPagado, plan.concepto);
    setPayingCuota(null);
  }

  async function eliminarPlanPendiente() {
    if (!plan) return;
    const ok = await confirm({ message: '¿Eliminar todas las cuotas PENDIENTES de este plan?', confirmText: 'Eliminar', danger: true });
    if (!ok) return;
    const endpoint = plan.tipo === 'cxc' ? `/api/cuentas-cobrar/${plan.cuentaId}/plan` : `/api/cuentas-pagar/${plan.cuentaId}/plan`;
    await fetch(endpoint, { method: 'DELETE' });
    toast.success('Cuotas pendientes eliminadas');
    setPlan(null);
  }

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
    try {
      const [rc, rp, rm] = await Promise.all([
        fetch("/api/cuentas-cobrar", { cache: "no-store" }).then(r => r.json()).catch(() => []),
        fetch("/api/cuentas-pagar", { cache: "no-store" }).then(r => r.json()).catch(() => []),
        fetch("/api/movimientos?directos=true", { cache: "no-store" }).then(r => r.json()).catch(() => ({ movimientos: [] })),
      ]);
      setCxc(Array.isArray(rc) ? rc : []);
      setCxp(Array.isArray(rp) ? rp : []);
      setMovDirectos(rm.movimientos ?? []);
    } finally {
      setLoading(false);
    }
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
        const r = await fetch("/api/cuentas-cobrar", {
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
        if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "Error al crear CxC"); return; }
      } else {
        const r = await fetch("/api/cuentas-pagar", {
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
        if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "Error al crear CxP"); return; }
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
    estado !== "LIQUIDADO" && estado !== "CANCELADO" && fechaCompromiso.substring(0, 10) < hoyStr;

  // Apply overdue status locally
  const enrichCxC = (c: CxCItem) => ({ ...c, esVencida: isVencida(c.fechaCompromiso, c.estado) });
  const enrichCxP = (c: CxPItem) => ({ ...c, esVencida: isVencida(c.fechaCompromiso, c.estado) });

  function applySort<T extends { fechaCompromiso: string; monto: number }>(
    items: T[],
    getNombre: (item: T) => string,
  ): T[] {
    const arr = [...items];
    switch (sortBy) {
      case "fecha_asc":  return arr.sort((a, b) => a.fechaCompromiso.localeCompare(b.fechaCompromiso));
      case "fecha_desc": return arr.sort((a, b) => b.fechaCompromiso.localeCompare(a.fechaCompromiso));
      case "monto_desc": return arr.sort((a, b) => b.monto - a.monto);
      case "monto_asc":  return arr.sort((a, b) => a.monto - b.monto);
      case "nombre_asc": return arr.sort((a, b) => getNombre(a).localeCompare(getNombre(b)));
      default: return arr;
    }
  }

  const cxcList = applySort(
    cxc.map(enrichCxC).filter(c => {
      if (filtro === "pendientes") return c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO";
      if (filtro === "liquidados") return c.estado === "LIQUIDADO" || c.estado === "CANCELADO";
      return true;
    }),
    c => c.empresa?.nombre ?? c.cliente?.nombre ?? "",
  );
  const cxpList = applySort(
    cxp.map(enrichCxP).filter(c => {
      if (filtro === "pendientes") return c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO";
      if (filtro === "liquidados") return c.estado === "LIQUIDADO" || c.estado === "CANCELADO";
      return true;
    }),
    c => c.empresa?.nombre ?? c.tecnico?.nombre ?? c.proveedor?.nombre ?? c.socio?.nombre ?? "",
  );

  // Metrics
  const cxcPend  = cxc.filter(c => c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO").reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
  const cxcVenc  = cxc.filter(c => isVencida(c.fechaCompromiso, c.estado)).reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
  const cxcProx  = cxc.filter(c => c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO" && !isVencida(c.fechaCompromiso, c.estado)).reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
  const cxcCobr  = cxc.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);
  const cxcVencN = cxc.filter(c => isVencida(c.fechaCompromiso, c.estado)).length;
  const cxcProxN = cxc.filter(c => c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO" && !isVencida(c.fechaCompromiso, c.estado)).length;
  const cxpPend  = cxp.filter(c => c.estado !== "LIQUIDADO").reduce((s, c) => s + (c.monto - c.montoPagado), 0);
  const cxpVenc  = cxp.filter(c => isVencida(c.fechaCompromiso, c.estado)).reduce((s, c) => s + (c.monto - c.montoPagado), 0);
  const cxpProx  = cxp.filter(c => c.estado !== "LIQUIDADO" && !isVencida(c.fechaCompromiso, c.estado)).reduce((s, c) => s + (c.monto - c.montoPagado), 0);
  const cxpPagd  = cxp.filter(c => c.estado === "LIQUIDADO").reduce((s, c) => s + c.monto, 0);
  const cxpVencN = cxp.filter(c => isVencida(c.fechaCompromiso, c.estado)).length;
  const cxpProxN = cxp.filter(c => c.estado !== "LIQUIDADO" && !isVencida(c.fechaCompromiso, c.estado)).length;

  function openModal(item: CxCItem | CxPItem, tipo: "cobro" | "pago") {
    const cxcItem = item as CxCItem;
    const nombre = tipo === "cobro"
      ? (cxcItem.empresa?.nombre ?? cxcItem.cliente?.nombre ?? "Cliente")
      : ((item as CxPItem).socio?.nombre ?? (item as CxPItem).empresa?.nombre ?? (item as CxPItem).tecnico?.nombre ?? (item as CxPItem).proveedor?.nombre ?? "Beneficiario");
    setModal({ id: item.id, tipo, concepto: item.concepto, monto: item.monto, nombre });
    const saldo = tipo === "cobro"
      ? item.monto - ((item as CxCItem).montoCobrado ?? 0)
      : item.monto - ((item as CxPItem).montoPagado ?? 0);
    setModalMonto(String(saldo));
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
    if (tipo === "cxc") {
      const cxcItem = item as CxCItem;
      setEditClienteId(cxcItem.cliente?.id ?? "");
      setEditCuentaId(cxcItem.cuentaDestino?.id ?? "");
      setEditProveedorId("");
      setEditTecnicoId("");
    } else {
      const cxpItem = item as CxPItem;
      setEditClienteId("");
      setEditCuentaId(cxpItem.cuentaOrigen?.id ?? "");
      setEditProveedorId(cxpItem.proveedor?.id ?? "");
      setEditTecnicoId(cxpItem.tecnico?.id ?? "");
    }
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
    if (editModal.tipo === "cxc") {
      body.clienteId = editClienteId || null;
      body.cuentaDestinoId = editCuentaId || null;
    } else {
      body.cuentaOrigenId = editCuentaId || null;
      body.proveedorId = editProveedorId || null;
      body.tecnicoId = editTecnicoId || null;
    }
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
    const res = await fetch(endpoint, {
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
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al registrar");
      setConfirmando(false);
      return;
    }
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
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) {
      toast.success("Registro anulado — vuelve a estado Pendiente");
      await load();
    } else {
      toast.error("Error al anular");
    }
    setAnulando(null);
  }

  async function anularAbono(cxcId: string, abonoId: string) {
    if (!await confirm({ message: "¿Eliminar este abono? El movimiento financiero asociado será eliminado.", danger: true, confirmText: "Eliminar abono" })) return;
    setAnulando(abonoId);
    const res = await fetch(`/api/cuentas-cobrar/${cxcId}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abonoId }),
    });
    if (res.ok) {
      toast.success("Abono eliminado");
      await load();
    } else {
      toast.error("Error al eliminar abono");
    }
    setAnulando(null);
  }

  async function anularAbonoPago(cxpId: string, abonoId: string) {
    if (!await confirm({ message: "¿Eliminar este abono? El movimiento financiero asociado será eliminado y el saldo pendiente será recalculado.", danger: true, confirmText: "Eliminar abono" })) return;
    setAnulando(abonoId);
    const res = await fetch(`/api/cuentas-pagar/${cxpId}/abono/${abonoId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Abono eliminado");
      await load();
    } else {
      toast.error("Error al eliminar abono");
    }
    setAnulando(null);
  }

  async function marcarCobradoManual(cxcItem: CxCItem) {
    const msg = `El movimiento de ${formatCurrency(cxcItem.monto)} ya está registrado en Movimientos.\n\n¿Marcar esta cuenta como LIQUIDADA sin crear un movimiento adicional?`;
    if (!await confirm({ message: msg, confirmText: "Marcar como cobrada" })) return;
    setMarcandoLiquidado(cxcItem.id);
    const res = await fetch(`/api/cuentas-cobrar/${cxcItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcarLiquidado: true, montoCobrado: cxcItem.monto }),
    });
    if (res.ok) {
      toast.success("Cuenta marcada como cobrada");
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al actualizar");
    }
    setMarcandoLiquidado(null);
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

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
                <div className="ms-stat-card">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Cobros esta semana</p>
                  <p className={`text-xl font-semibold ${semanaActual && semanaActual.totalCobros > 0 ? "text-green-400" : "text-gray-600"}`}>
                    {semanaActual ? formatCurrency(semanaActual.totalCobros) : "$0"}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">{semanaActual?.cobros.length ?? 0} registros · Lunes y Miércoles</p>
                </div>
                <div className="ms-stat-card">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pagos esta semana</p>
                  <p className={`text-xl font-semibold ${semanaActual && semanaActual.totalPagos > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                    {semanaActual ? formatCurrency(semanaActual.totalPagos) : "$0"}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">{semanaActual?.pagos.length ?? 0} registros · Miércoles</p>
                </div>
              </div>

              {/* Sección cobros — siempre visible */}
              <div className="ms-table-wrapper">
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
              <div className="ms-table-wrapper">
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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="ms-h1">Cobros y Pagos</h1>
          <p className="ms-subtitle">Cuentas por cobrar y por pagar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openReciboModal}
            className="px-3 py-2 rounded-lg border border-[#333] text-gray-400 text-sm font-medium hover:border-[#B3985B] hover:text-[#B3985B] transition-colors">
            Recibos técnicos
          </button>
          <button
            onClick={() => { setNuevoForm({ ...NUEVO_REGISTRO_EMPTY }); setEmpresaQuery(""); setShowNuevo(true); }}
            className="px-3 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] transition-colors">
            + Nuevo registro
          </button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* CxC */}
        <div className="ms-table-wrapper">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B3985B]">Cuentas por cobrar</p>
            {cxcCobr > 0 && <p className="text-[11px] text-gray-600">cobrado: <span className="text-green-600/80 font-medium">{formatCurrency(cxcCobr)}</span></p>}
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#1a1a1a]">
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Vencido</p>
              <p className={`text-base font-bold ${cxcVenc > 0 ? "text-red-400" : "text-gray-700"}`}>{formatCurrency(cxcVenc)}</p>
              {cxcVencN > 0 && <p className="text-[10px] text-red-500/60 mt-1">{cxcVencN} {cxcVencN === 1 ? "cobro" : "cobros"}</p>}
            </div>
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Próximo</p>
              <p className="text-base font-bold text-[#B3985B]">{formatCurrency(cxcProx)}</p>
              {cxcProxN > 0 && <p className="text-[10px] text-[#B3985B]/50 mt-1">{cxcProxN} {cxcProxN === 1 ? "cobro" : "cobros"}</p>}
            </div>
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Total pendiente</p>
              <p className="text-base font-bold text-white">{formatCurrency(cxcPend)}</p>
            </div>
          </div>
        </div>
        {/* CxP */}
        <div className="ms-table-wrapper">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B3985B]">Cuentas por pagar</p>
            {cxpPagd > 0 && <p className="text-[11px] text-gray-600">pagado: <span className="text-green-600/80 font-medium">{formatCurrency(cxpPagd)}</span></p>}
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#1a1a1a]">
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Vencido</p>
              <p className={`text-base font-bold ${cxpVenc > 0 ? "text-red-400" : "text-gray-700"}`}>{formatCurrency(cxpVenc)}</p>
              {cxpVencN > 0 && <p className="text-[10px] text-red-500/60 mt-1">{cxpVencN} {cxpVencN === 1 ? "pago" : "pagos"}</p>}
            </div>
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Próximo</p>
              <p className="text-base font-bold text-[#B3985B]">{formatCurrency(cxpProx)}</p>
              {cxpProxN > 0 && <p className="text-[10px] text-[#B3985B]/50 mt-1">{cxpProxN} {cxpProxN === 1 ? "pago" : "pagos"}</p>}
            </div>
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Total pendiente</p>
              <p className="text-base font-bold text-white">{formatCurrency(cxpPend)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + filtro */}
      <div className="mb-4 border-b border-[#1a1a1a]">
        {/* Tabs row — scrollable on mobile */}
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {([["cobrar", "Por Cobrar", cxcList.length], ["pagar", "Por Pagar", cxpList.length], ["directos", "Movimientos", movDirectos.length]] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors relative ${
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
        {/* Filter row */}
        <div className="flex items-center justify-between gap-2 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {([["pendientes", "Pendientes"], ["liquidados", "Liquidados"], ["todos", "Todos"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFiltro(key)}
                className={`shrink-0 text-xs px-3 py-1 rounded-lg transition-colors ${
                  filtro === key ? "bg-[#B3985B]/15 text-[#B3985B]" : "text-[#555] hover:text-white"
                }`}>
                {label}
              </button>
            ))}
          </div>
          {/* Sort button — only for CxC / CxP tabs */}
          {tab !== "directos" && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-colors ${showSortMenu ? "border-[#B3985B]/50 text-[#B3985B]" : "border-[#333] text-[#555] hover:text-white"}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Ordenar
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-xl py-1 w-56"
                  onMouseLeave={() => setShowSortMenu(false)}>
                  {([
                    ["fecha_asc",  "Fecha de cobro: más cercana"],
                    ["fecha_desc", "Fecha de cobro: más lejana"],
                    ["monto_desc", "Monto: mayor a menor"],
                    ["monto_asc",  "Monto: menor a mayor"],
                    ["nombre_asc", "Nombre: A → Z"],
                  ] as const).map(([key, label]) => (
                    <button key={key}
                      onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors ${sortBy === key ? "text-[#B3985B]" : "text-gray-400 hover:text-white"}`}>
                      {sortBy === key && <span className="mr-1.5">✓</span>}{label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="ms-card h-20 animate-pulse" />
          ))}
        </div>
      ) : tab === "cobrar" ? (
        // ── CxC Cards ──
        <div className="space-y-4">
          {cxcList.length === 0 ? (
            <div className="ms-empty-state">
              <p className="ms-subtitle">Sin cuentas por cobrar</p>
            </div>
          ) : (() => {
            const { proximos: _cp, pasados: _cv } = splitGroups(groupByProject(cxcList), hoyStr);
            let _cvLastMonth = "";
            return [..._cp, ..._cv].map((grupo, idx) => {
            const totalGrupo = grupo.items.filter(c => c.estado !== "LIQUIDADO").reduce((s, c) => s + (c.monto - c.montoCobrado), 0);
            const isPasado = idx >= _cp.length;
            let monthHeader = null;
            if (isPasado && grupo.fechaEvento) {
              const mk = grupo.fechaEvento.substring(0, 7);
              if (mk !== _cvLastMonth) {
                _cvLastMonth = mk;
                const [y, m] = mk.split("-");
                const lbl = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
                monthHeader = (
                  <div className="flex items-center gap-3 pt-3 pb-1">
                    <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em] font-semibold capitalize">{lbl}</span>
                    <div className="flex-1 h-px bg-[#161616]" />
                  </div>
                );
              }
            }
            return (
            <Fragment key={(grupo.proyectoId ?? "__sin__") + idx}>
              {idx === _cp.length && _cv.length > 0 && (
                <div className="flex items-center gap-4 py-3">
                  <div className="flex-1 h-px bg-[#161616]" />
                  <span className="text-[10px] text-gray-700 uppercase tracking-widest">Pasados · {_cv.length}</span>
                  <div className="flex-1 h-px bg-[#161616]" />
                </div>
              )}
              {monthHeader}
              <div className={isPasado ? "opacity-50" : ""}>
              {grupo.proyectoId ? (
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/proyectos/${grupo.proyectoId}`} className="text-xs font-semibold text-[#B3985B] hover:underline">
                      {grupo.numeroProyecto} · {grupo.proyectoNombre}
                    </Link>
                    {grupo.fechaEvento && (
                      <span className="text-[10px] text-gray-600">— Evento: {fmtDate(grupo.fechaEvento)}</span>
                    )}
                  </div>
                  {totalGrupo > 0 && (
                    <span className="text-xs font-semibold text-yellow-400 shrink-0">
                      {formatCurrency(totalGrupo)} pendiente
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 px-1">Sin proyecto</p>
              )}
              <div className="space-y-2">
                {grupo.items.map(c => (
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
                    {c.esVencida && <span className="text-[10px] text-red-400 font-medium">⚠ Vencida</span>}
                  </div>
                  <p className="text-[#9ca3af] text-xs">{c.concepto}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {c.cotizacion && (
                      <Link href={`/cotizaciones/${c.cotizacion.id}`}
                        className="text-[10px] font-mono text-[#555] hover:text-[#B3985B] transition-colors">
                        {c.cotizacion.numeroCotizacion}
                      </Link>
                    )}
                    <span className={`text-[10px] ${c.esVencida ? "text-red-400" : "text-[#555]"}`}>
                      Vence: {fmtDate(c.fechaCompromiso)}
                    </span>
                  </div>
                </div>

                {/* Monto */}
                <div className="text-right shrink-0">
                  {c.montoCobrado > 0 && c.estado !== "LIQUIDADO" ? (
                    <>
                      <p className="text-yellow-400 font-semibold text-base">{formatCurrency(c.monto - c.montoCobrado)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">saldo de {formatCurrency(c.monto)}</p>
                    </>
                  ) : (
                    <p className={`font-semibold text-base ${c.estado === "LIQUIDADO" ? "text-green-400" : "text-white"}`}>{formatCurrency(c.monto)}</p>
                  )}
                </div>
              </div>

              {/* Barra de progreso */}
              {c.monto > 0 && (
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                    <span>Cobrado: {formatCurrency(c.montoCobrado)}</span>
                    <span>{Math.round((c.montoCobrado / c.monto) * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${c.estado === "LIQUIDADO" ? "bg-green-500" : "bg-[#B3985B]"}`}
                      style={{ width: `${Math.min(100, (c.montoCobrado / c.monto) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Historial de abonos (expandible) */}
              {c.abonos && c.abonos.length > 0 && (
                <div className="mt-2.5">
                  <button
                    onClick={() => setExpandedAbonos(prev => {
                      const next = new Set(prev);
                      next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                      return next;
                    })}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg className={`w-3 h-3 transition-transform ${expandedAbonos.has(c.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {c.abonos.length} {c.abonos.length === 1 ? "abono registrado" : "abonos registrados"}
                  </button>
                  {expandedAbonos.has(c.id) && (
                    <div className="mt-2 space-y-1.5 pl-2 border-l border-[#2a2a2a]">
                      {c.abonos.map(abono => (
                        <div key={abono.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="text-[#B3985B] font-medium">{formatCurrency(abono.monto)}</span>
                            <span>·</span>
                            <span>{fmtDate(abono.fecha)}</span>
                            <span className="bg-[#1a1a1a] px-1.5 py-0.5 rounded capitalize">
                              {abono.metodoPago === "TRANSFERENCIA" ? "Transf." : abono.metodoPago === "EFECTIVO" ? "Efectivo" : abono.metodoPago}
                            </span>
                            {abono.notas && <span className="text-gray-700 truncate max-w-[120px]">{abono.notas}</span>}
                          </div>
                          <button
                            onClick={() => anularAbono(c.id, abono.id)}
                            disabled={anulando === abono.id}
                            className="text-[10px] text-red-500/50 hover:text-red-400 transition-colors disabled:opacity-40"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#1a1a1a] flex-wrap">
                {c.estado === "CANCELADO" && (
                  <p className="text-xs text-gray-600 italic">Cancelado — trato marcado como Venta Perdida</p>
                )}
                {c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO" && (
                  <>
                    <button onClick={() => openModal(c, "cobro")}
                      className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#c9a96a] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Registrar abono
                    </button>
                    <button
                      onClick={() => openPlan(c.id, 'cxc', c.monto, c.montoCobrado, c.concepto)}
                      className="flex items-center gap-1.5 text-xs text-purple-400 border border-purple-900/40 hover:border-purple-600/60 hover:bg-purple-900/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      📅 Plan de cobros
                    </button>
                    <button onClick={() => openEdit(c, "cxc")}
                      className="flex items-center gap-1.5 text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button onClick={() => marcarCobradoManual(c)}
                      disabled={marcandoLiquidado === c.id}
                      title="El movimiento ya se registró por otra vía — solo actualiza el estado de esta cuenta"
                      className="flex items-center gap-1.5 text-xs text-green-500/70 border border-green-900/30 hover:border-green-600/50 hover:text-green-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Ya cobré<span className="hidden sm:inline"> (sin movimiento)</span></span>
                    </button>
                  </>
                )}
                {/* Nota de cobro — visible para todas las CxC */}
                <a href={`/api/cuentas-cobrar/${c.id}/nota`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/25 hover:border-[#B3985B]/60 hover:bg-[#B3985B]/5 px-3 py-1.5 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Nota de cobro
                </a>
                {c.cotizacion && (
                  <>
                    <Link href={`/cotizaciones/${c.cotizacion.id}`}
                      className="flex items-center gap-1.5 text-xs text-[#6b7280] border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver cotización
                    </Link>
                    <a href={`/api/cotizaciones/${c.cotizacion.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#6b7280] border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Cotización PDF
                    </a>
                  </>
                )}
                {(() => {
                  const tel = (c.empresa?.telefono ?? c.cliente?.telefono) ?? null;
                  const nom = c.empresa?.nombre ?? c.cliente?.nombre ?? "";
                  const saldo = c.monto - c.montoCobrado;
                  return c.estado !== "LIQUIDADO" && c.estado !== "CANCELADO" && tel ? (
                    <a href={`https://wa.me/${tel.replace(/\D/g, "")}?text=${waMsgCobro(nom, saldo, c.concepto)}`}
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
                  <span className="text-xs text-green-400/60 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Liquidado
                  </span>
                )}
                <button onClick={() => eliminar(c.id, "cxc", c.estado === "LIQUIDADO")}
                  className="ml-auto text-xs text-gray-700 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
              </div>
              </div>
            </Fragment>
          );
          });
          })()}
        </div>
      ) : (
        // ── CxP Cards ──
        <div className="space-y-4">
          {cxpList.length === 0 ? (
            <div className="ms-empty-state">
              <p className="ms-subtitle">Sin cuentas por pagar</p>
            </div>
          ) : (() => {
            const { proximos: _pp, pasados: _pv } = splitGroups(groupByProject(cxpList), hoyStr);
            let _pvLastMonth = "";
            return [..._pp, ..._pv].map((grupo, idx) => {
            const totalGrupo = grupo.items.filter(c => c.estado !== "LIQUIDADO").reduce((s, c) => s + (c.monto - c.montoPagado), 0);
            const isPasadoP = idx >= _pp.length;
            let monthHeaderP = null;
            if (isPasadoP && grupo.fechaEvento) {
              const mk = grupo.fechaEvento.substring(0, 7);
              if (mk !== _pvLastMonth) {
                _pvLastMonth = mk;
                const [y, m] = mk.split("-");
                const lbl = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
                monthHeaderP = (
                  <div className="flex items-center gap-3 pt-3 pb-1">
                    <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em] font-semibold capitalize">{lbl}</span>
                    <div className="flex-1 h-px bg-[#161616]" />
                  </div>
                );
              }
            }
            return (
            <Fragment key={(grupo.proyectoId ?? "__sin__") + idx}>
              {idx === _pp.length && _pv.length > 0 && (
                <div className="flex items-center gap-4 py-3">
                  <div className="flex-1 h-px bg-[#161616]" />
                  <span className="text-[10px] text-gray-700 uppercase tracking-widest">Pasados · {_pv.length}</span>
                  <div className="flex-1 h-px bg-[#161616]" />
                </div>
              )}
              {monthHeaderP}
              <div className={isPasadoP ? "opacity-50" : ""}>
              {grupo.proyectoId ? (
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/proyectos/${grupo.proyectoId}`} className="text-xs font-semibold text-[#B3985B] hover:underline">
                      {grupo.numeroProyecto} · {grupo.proyectoNombre}
                    </Link>
                    {grupo.fechaEvento && (
                      <span className="text-[10px] text-gray-600">— Evento: {fmtDate(grupo.fechaEvento)}</span>
                    )}
                  </div>
                  {totalGrupo > 0 && (
                    <span className="text-xs font-semibold text-red-400 shrink-0">
                      {formatCurrency(totalGrupo)} por pagar
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 px-1">Sin proyecto</p>
              )}
              <div className="space-y-2">
                {grupo.items.map(c => {
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
                      <span className={`text-[10px] ${c.esVencida ? "text-red-400" : "text-[#555]"}`}>
                        Vence: {fmtDate(c.fechaCompromiso)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.montoPagado > 0 && c.estado !== "LIQUIDADO" ? (
                      <>
                        <p className="text-[#B3985B] font-semibold text-base">{formatCurrency(c.monto - c.montoPagado)}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">saldo de {formatCurrency(c.monto)}</p>
                      </>
                    ) : (
                      <p className={`font-semibold text-base ${c.estado === "LIQUIDADO" ? "text-green-400" : "text-white"}`}>{formatCurrency(c.monto)}</p>
                    )}
                  </div>
                </div>

                {/* Historial de abonos (expandible) */}
                {c.abonos && c.abonos.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                    <button
                      onClick={() => setExpandedAbonos(prev => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                        return next;
                      })}
                      className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-[#B3985B] transition-colors"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedAbonos.has(c.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {c.abonos.length} {c.abonos.length === 1 ? "abono registrado" : "abonos registrados"}
                    </button>
                    {expandedAbonos.has(c.id) && (
                      <div className="mt-2 space-y-1.5 pl-3 border-l border-[#2a2a2a]">
                        {c.abonos.map(abono => (
                          <div key={abono.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                              <span className="text-[#B3985B] font-medium">{formatCurrency(abono.monto)}</span>
                              <span>{fmtDate(abono.fecha)}</span>
                              <span className="text-gray-600">
                                {abono.metodoPago === "TRANSFERENCIA" ? "Transf." : abono.metodoPago === "EFECTIVO" ? "Efectivo" : abono.metodoPago}
                              </span>
                              {abono.notas && <span className="text-gray-700 truncate max-w-[120px]">{abono.notas}</span>}
                            </div>
                            <button
                              onClick={() => anularAbonoPago(c.id, abono.id)}
                              disabled={anulando === abono.id}
                              className="text-[10px] text-red-500/50 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                            >
                              {anulando === abono.id ? "..." : "×"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#1a1a1a] flex-wrap">
                  {c.estado !== "LIQUIDADO" && (
                    <>
                      <button onClick={() => openModal(c, "pago")}
                        className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#c9a96a] px-3 py-1.5 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar abono
                      </button>
                      <button
                        onClick={() => openPlan(c.id, 'cxp', c.monto, c.montoPagado, c.concepto)}
                        className="flex items-center gap-1.5 text-xs text-purple-400 border border-purple-900/40 hover:border-purple-600/60 hover:bg-purple-900/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        📅 Plan de pagos
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
                        : encodeURIComponent(`Hola ${beneficiario}, te contactamos de Mainstage Pro respecto al pago de ${formatCurrency(c.monto - c.montoPagado)} por ${c.concepto}.`)}`}
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
                  {/* Nota de pago — visible para todas las CxP */}
                  <a href={`/api/cuentas-pagar/${c.id}/nota`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/25 hover:border-[#B3985B]/60 hover:bg-[#B3985B]/5 px-3 py-1.5 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Nota de pago
                  </a>
                  <button onClick={() => eliminar(c.id, "cxp", c.estado === "LIQUIDADO")}
                    className="ml-auto text-xs text-gray-700 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
              </div>
              </div>
            </Fragment>
          );
          });
          })()}
        </div>
      )}

      {/* ── Tab: Movimientos directos ── */}
      {tab === "directos" && (
        <div className="space-y-2">
          {movDirectos.length === 0 ? (
            <div className="ms-empty-state">
              <p className="ms-subtitle">Sin movimientos directos</p>
              <p className="text-[#444] text-xs mt-1">Los ingresos y gastos registrados directamente (no vinculados a CxC/CxP) aparecen aquí</p>
              <a href="/finanzas/movimientos/nuevo" className="inline-block mt-4 px-4 py-1.5 rounded-lg bg-[#B3985B]/15 text-[#B3985B] text-xs font-medium hover:bg-[#B3985B]/25 transition-colors">
                + Registrar movimiento
              </a>
            </div>
          ) : movDirectos.map(mov => (
            <div key={mov.id} className="ms-card px-4 py-3">
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

      {/* ── Modal Plan de Pagos / Cobros ── */}
      {plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={e => { if (e.target === e.currentTarget) setPlan(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold text-base">
                  {plan.tipo === 'cxc' ? '📅 Plan de cobros' : '📅 Plan de pagos'}
                </h3>
                <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{plan.concepto}</p>
              </div>
              <div className="flex items-center gap-2">
                {plan.cuotas.length > 0 && (
                  <a
                    href={plan.tipo === 'cxc' ? `/api/cuentas-cobrar/${plan.cuentaId}/plan/pdf` : `/api/cuentas-pagar/${plan.cuentaId}/plan/pdf`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B]/60 hover:bg-[#B3985B]/5 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Descargar PDF del plan"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    PDF
                  </a>
                )}
                <button onClick={() => setPlan(null)} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 mb-5 p-3 bg-[#0d0d0d] rounded-xl border border-[#1a1a1a]">
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide">Total</p>
                <p className="text-white font-semibold text-sm">{formatCurrency(plan.monto)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide">{plan.tipo === 'cxc' ? 'Cobrado' : 'Pagado'}</p>
                <p className="text-green-400 font-semibold text-sm">{formatCurrency(plan.montoPagado)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide">Pendiente</p>
                <p className="text-[#B3985B] font-semibold text-sm">{formatCurrency(plan.monto - plan.montoPagado)}</p>
              </div>
              {plan.cuotas.length > 0 && (
                <div className="ml-auto">
                  <div className="w-24 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (plan.montoPagado / plan.monto) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1 text-right">{Math.round((plan.montoPagado / plan.monto) * 100)}%</p>
                </div>
              )}
            </div>

            {loadingPlan ? (
              <p className="text-center text-gray-600 text-sm py-6">Cargando plan...</p>
            ) : plan.view === 'list' && plan.cuotas.length > 0 ? (
              /* ── Vista de cuotas existentes ── */
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">{plan.cuotas.length} cuota{plan.cuotas.length !== 1 ? 's' : ''} en el plan</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={plan.tipo === 'cxc' ? `/api/cuentas-cobrar/${plan.cuentaId}/plan/pdf` : `/api/cuentas-pagar/${plan.cuentaId}/plan/pdf`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#B3985B] hover:text-[#c9a96a] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar PDF
                    </a>
                    <button onClick={() => setPlan(prev => prev ? { ...prev, view: 'create', draft: distribuirCuotas(prev.monto - prev.montoPagado, prev.numCuotas, new Date().toISOString().slice(0, 10)) } : null)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                      Replantear cuotas →
                    </button>
                  </div>
                </div>
                {plan.cuotas.map(cuota => (
                  <div key={cuota.id} className={`rounded-xl border p-3 ${cuota.estado === 'PAGADO' ? 'border-green-900/30 bg-green-900/5' : 'border-[#2a2a2a] bg-[#0d0d0d]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${cuota.estado === 'PAGADO' ? 'bg-green-500 text-black' : 'border border-purple-700/60 text-purple-400'}`}>
                          {cuota.estado === 'PAGADO' ? '✓' : cuota.numeroCuota}
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium">{formatCurrency(cuota.monto)}</p>
                          <p className="text-gray-500 text-[11px]">{fmtDate(cuota.fechaCompromiso)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cuota.estado === 'PAGADO' ? (
                          <span className="text-green-400 text-[11px]">
                            ✓ {plan.tipo === 'cxc' ? 'Cobrado' : 'Pagado'} {fmtDate((cuota.abonoPago?.fecha ?? cuota.abono?.fecha) ?? '')}
                          </span>
                        ) : (
                          <button
                            onClick={() => { setPayCuotaId(prev => prev === cuota.id ? null : cuota.id); setPayCuotaFecha(new Date().toISOString().split('T')[0]); }}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${payCuotaId === cuota.id ? 'border-purple-600/60 text-purple-300 bg-purple-900/10' : 'border-[#333] text-gray-400 hover:border-purple-700/60 hover:text-purple-400'}`}
                          >
                            {plan.tipo === 'cxc' ? 'Cobrar ▸' : 'Pagar ▸'}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Mini-form to pay this cuota */}
                    {payCuotaId === cuota.id && cuota.estado === 'PENDIENTE' && (
                      <div className="mt-3 pt-3 border-t border-[#2a2a2a] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wide block mb-1">Método</label>
                            <select value={payCuotaMetodo} onChange={e => setPayCuotaMetodo(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-700">
                              <option value="TRANSFERENCIA">Transferencia</option>
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="TARJETA">Tarjeta</option>
                              <option value="CHEQUE">Cheque</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wide block mb-1">Fecha</label>
                            <input type="date" value={payCuotaFecha} onChange={e => setPayCuotaFecha(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-700" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wide block mb-1">{plan.tipo === 'cxc' ? 'Cuenta destino' : 'Cuenta origen'}</label>
                          <select value={payCuotaCuenta} onChange={e => setPayCuotaCuenta(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-700">
                            <option value="">— Sin especificar —</option>
                            {cuentas.map(ct => <option key={ct.id} value={ct.id}>{ct.nombre}{ct.banco ? ` · ${ct.banco}` : ''}</option>)}
                          </select>
                        </div>
                        <input value={payCuotaNotas} onChange={e => setPayCuotaNotas(e.target.value)} placeholder="Notas / referencia (opcional)" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-700" />
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => pagarCuota(cuota.id)} disabled={payingCuota === cuota.id} className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors">
                            {payingCuota === cuota.id ? 'Registrando...' : plan.tipo === 'cxc' ? 'Confirmar cobro' : 'Confirmar pago'}
                          </button>
                          <button onClick={() => setPayCuotaId(null)} className="px-3 text-gray-500 hover:text-white text-xs">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={eliminarPlanPendiente} className="mt-3 w-full text-xs text-red-500/50 hover:text-red-400 border border-red-900/20 hover:border-red-900/40 py-1.5 rounded-lg transition-colors">
                  Eliminar cuotas pendientes
                </button>
              </div>
            ) : (
              /* ── Vista de creación / edición de plan ── */
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Número de cuotas</label>
                  <div className="flex gap-2 flex-wrap">
                    {[2,3,4,6,8,10,12].map(n => (
                      <button key={n} onClick={() => updatePlanDraft(n)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${plan.numCuotas === n ? 'border-purple-600 bg-purple-900/20 text-purple-300' : 'border-[#2a2a2a] text-gray-500 hover:border-[#444] hover:text-gray-300'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Distribución de cuotas <span className="text-gray-700 ml-1">(editable)</span></p>
                  {plan.draft.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border border-purple-700/40 flex items-center justify-center text-[10px] text-purple-400 shrink-0">{i + 1}</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                        <input
                          type="number"
                          value={d.monto}
                          onChange={e => setPlan(prev => {
                            if (!prev) return null;
                            const draft = [...prev.draft];
                            draft[i] = { ...draft[i], monto: e.target.value };
                            return { ...prev, draft };
                          })}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-700"
                        />
                      </div>
                      <input
                        type="date"
                        value={d.fecha}
                        onChange={e => setPlan(prev => {
                          if (!prev) return null;
                          const draft = [...prev.draft];
                          draft[i] = { ...draft[i], fecha: e.target.value };
                          return { ...prev, draft };
                        })}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-700"
                      />
                      {i === plan.draft.length - 1 && (
                        <span className="text-[10px] text-gray-600 shrink-0">← residuo</span>
                      )}
                    </div>
                  ))}
                  {/* Totals check */}
                  {(() => {
                    const suma = plan.draft.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0);
                    const pendiente = plan.monto - plan.montoPagado;
                    const diff = Math.abs(suma - pendiente);
                    return (
                      <div className={`text-xs flex justify-between pt-1 border-t border-[#1a1a1a] ${diff > 1 ? 'text-red-400' : 'text-green-400/70'}`}>
                        <span>Suma: {formatCurrency(suma)}</span>
                        <span>Pendiente: {formatCurrency(pendiente)}</span>
                        {diff > 1 && <span>⚠ Diferencia: {formatCurrency(diff)}</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={savePlan} disabled={savingPlan || (() => { const suma = plan.draft.reduce((s, d) => s + (parseFloat(d.monto) || 0), 0); return Math.abs(suma - (plan.monto - plan.montoPagado)) > 1; })()} className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    {savingPlan ? 'Guardando...' : 'Confirmar plan'}
                  </button>
                  <button onClick={() => setPlan(null)} className="px-4 text-sm text-gray-500 hover:text-white border border-[#333] rounded-xl transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Modal confirmar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-1">
              {modal.tipo === "cobro" ? "Registrar abono" : "Registrar abono"}
            </h3>
            <p className="text-gray-500 text-xs mb-4">{modal.concepto} · {modal.nombre}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{modal.tipo === "cobro" ? "Monto recibido" : "Monto a pagar"}</label>
                <input type="number" step="0.01" min="0" value={modalMonto} onChange={e => setModalMonto(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]" />
                <p className="text-[10px] text-gray-600 mt-1">Saldo pendiente: {formatCurrency(parseFloat(modalMonto) || 0)} de {formatCurrency(modal.monto)}</p>
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
                <Combobox
                  value={modalCuentaId}
                  onChange={v => setModalCuentaId(v)}
                  options={[{ value: "", label: "— Sin especificar —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Método de pago</label>
                <Combobox
                  value={modalMetodoPago}
                  onChange={v => setModalMetodoPago(v)}
                  options={[{ value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "TARJETA", label: "Tarjeta" }, { value: "CHEQUE", label: "Cheque" }]}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                />
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
                className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {confirmando ? "Guardando..." : "Registrar abono"}
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
              {editModal.tipo === "cxc" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                  <Combobox
                    value={editClienteId}
                    onChange={setEditClienteId}
                    options={[{ value: "", label: "— Sin cliente —" }, ...clientes.map(c => ({ value: c.id, label: c.nombre + (c.empresa ? ` · ${c.empresa}` : "") }))]}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{editModal.tipo === "cxc" ? "Cuenta destino (cobro)" : "Cuenta origen (pago)"}</label>
                <Combobox
                  value={editCuentaId}
                  onChange={setEditCuentaId}
                  options={[{ value: "", label: "— Sin cuenta —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]}
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              {editModal.tipo === "cxp" && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
                    <Combobox
                      value={editProveedorId}
                      onChange={v => { setEditProveedorId(v); if (v) setEditTecnicoId(""); }}
                      options={[{ value: "", label: "— Sin proveedor —" }, ...proveedores.map(p => ({ value: p.id, label: p.nombre + (p.empresa ? ` · ${p.empresa}` : "") }))]}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Técnico</label>
                    <Combobox
                      value={editTecnicoId}
                      onChange={v => { setEditTecnicoId(v); if (v) setEditProveedorId(""); }}
                      options={[{ value: "", label: "— Sin técnico —" }, ...tecnicos.map(t => ({ value: t.id, label: t.nombre + (t.celular ? ` · ${t.celular}` : "") }))]}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>
                </>
              )}
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
                className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-xl transition-colors">
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
                    <Combobox
                      value={nuevoForm.tipoPago}
                      onChange={v => setNuevoForm(p => ({ ...p, tipoPago: v }))}
                      options={[{ value: "ANTICIPO", label: "Anticipo" }, { value: "LIQUIDACION", label: "Liquidación" }, { value: "OTRO", label: "Otro" }]}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
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
                                className="flex-1 py-2 rounded-lg bg-[#B3985B] text-black text-xs font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors"
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
                <Combobox
                  value={nuevoForm.proyectoId}
                  onChange={v => setNuevoForm(p => ({ ...p, proyectoId: v }))}
                  options={[{ value: "", label: "— Sin proyecto —" }, ...proyectos.map(p => ({ value: p.id, label: `${p.numeroProyecto} · ${p.nombre}` }))]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowNuevo(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={guardarNuevo} disabled={guardandoNuevo || !nuevoForm.concepto || !nuevoForm.monto}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors">
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
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
