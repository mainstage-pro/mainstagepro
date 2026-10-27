"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CuentaCorrienteTab from "./CuentaCorrienteTab";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface Trato { id: string; nombreEvento: string | null; etapa: string; presupuestoEstimado: number | null; updatedAt: string; }
interface Proyecto { id: string; nombre: string; fechaEvento: string | null; estado: string; }
interface ContactoCliente {
  id: string; nombre: string; telefono: string | null; correo: string | null;
  tipoCliente: string; clasificacion: string;
  tratos: Trato[];
  proyectos: Proyecto[];
}
interface ProyectoEquipo { proyecto: { id: string; nombre: string; fechaEvento: string | null; estado: string; }; }
interface ContactoProveedor {
  id: string; nombre: string; telefono: string | null; correo: string | null; giro: string | null;
  proyectoEquipos: ProyectoEquipo[];
}
interface AbonoItem {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  cuenta: string | null;
  notas: string | null;
  cuentaId: string;
  concepto: string;
  proyecto: string | null;
  referencia: string | null;
  estadoCuenta: string;
  grupoFechaTotal?: number;
  grupoFechaCount?: number;
  grupoDetalle?: string;
}
interface CuentaCobrar {
  id: string; concepto: string; monto: number; montoCobrado: number; montoCompensado?: number; estado: string;
  fechaCompromiso: string;
  cotizacion: { numeroCotizacion: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
  abonos?: AbonoItem[];
}
interface CuentaPagar {
  id: string; concepto: string; monto: number; montoPagado: number; montoCompensado?: number; estado: string;
  fechaCompromiso: string;
  proveedor: { nombre: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
  abonos?: AbonoItem[];
}
interface EmpresaDetalle {
  id: string; nombre: string; giro: string | null; telefono: string | null; correo: string | null;
  sitioWeb: string | null; notas: string | null; rfc: string | null; datosFiscales: string | null;
  cuentaBancaria: string | null; clabe: string | null; banco: string | null; noTarjeta: string | null;
  tipo: string; activo: boolean;
  esRelacionMutua?: boolean;
  contactosCliente: ContactoCliente[];
  contactosProveedor: ContactoProveedor[];
  cuentasCobrar: CuentaCobrar[];
  cuentasPagar: CuentaPagar[];
}

const TIPO_COLORS: Record<string, string> = {
  CLIENTE: "bg-green-900/30 text-green-400",
  PROVEEDOR: "bg-blue-900/30 text-blue-400",
  AMBOS: "bg-purple-900/30 text-purple-400",
};
const TIPO_LABELS: Record<string, string> = {
  CLIENTE: "Cliente",
  PROVEEDOR: "Proveedor",
  AMBOS: "Cliente y Proveedor",
};

const ETAPA_COLORS: Record<string, string> = {
  GANADO: "text-green-400",
  PERDIDO: "text-red-400",
  PROPUESTA: "text-yellow-400",
  NEGOCIACION: "text-orange-400",
};

const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "text-green-400",
  COMPLETADO: "text-blue-400",
  CANCELADO: "text-red-400",
  EN_PAUSA: "text-yellow-400",
};

function fmt(monto: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(monto);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const TABS = ["clientes", "proveedores", "historial", "cuenta-corriente"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = {
  clientes: "Contactos clientes",
  proveedores: "Contactos proveedores",
  historial: "Historial financiero",
  "cuenta-corriente": "Cuenta corriente",
};

export default function EmpresaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const initialTab = (searchParams.get("tab") as Tab) ?? "clientes";
  const [tab, setTab] = useState<Tab>(initialTab);
  const { downloading, downloadPdf } = usePdfDownload();
  const descargando = downloading !== null;

  const descargarEstadoCuenta = useCallback(() => {
    const fecha = new Date().toISOString().slice(0, 10);
    downloadPdf(`/api/empresas/${id}/estado-cuenta/pdf`, `EstadoCuenta-${fecha}.pdf`, "Estado de cuenta");
  }, [id, downloadPdf]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/empresas/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setEmpresa(d.empresa);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-center ms-subtitle">Cargando...</div>;
  if (!empresa) return <div className="p-8 text-center ms-subtitle">Empresa no encontrada</div>;

  const esCuentaActiva = (estado: string) =>
    estado !== "LIQUIDADO" && estado !== "COMPENSADO" && estado !== "CANCELADO" && estado !== "ANULADO";
  const saldoDeCobrar = (c: CuentaCobrar) => Math.max(0, c.monto - c.montoCobrado - Number(c.montoCompensado || 0));
  const saldoDePagar = (c: CuentaPagar) => Math.max(0, c.monto - c.montoPagado - Number(c.montoCompensado || 0));

  const cuentasCobrarPendientes = empresa.cuentasCobrar.filter((c) => esCuentaActiva(c.estado) && saldoDeCobrar(c) > 0);
  const cuentasPagarPendientes = empresa.cuentasPagar.filter((c) => esCuentaActiva(c.estado) && saldoDePagar(c) > 0);

  const totalCobrar = cuentasCobrarPendientes.reduce((s, c) => s + c.monto, 0);
  const totalPagar = cuentasPagarPendientes.reduce((s, c) => s + c.monto, 0);
  const pendienteCobrar = cuentasCobrarPendientes.reduce((s, c) => s + saldoDeCobrar(c), 0);
  const pendientePagar = cuentasPagarPendientes.reduce((s, c) => s + saldoDePagar(c), 0);
  const compensable = Math.min(pendienteCobrar, pendientePagar);
  const neto = pendienteCobrar - pendientePagar;

  const activeTabs: Tab[] = TABS.filter(t =>
    t === "historial" ||
    t === "cuenta-corriente" ||
    (t === "clientes" && empresa.contactosCliente.length > 0) ||
    (t === "proveedores" && empresa.contactosProveedor.length > 0)
  );
  const currentTab: Tab = activeTabs.includes(tab) ? tab : (activeTabs[0] ?? "clientes");

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-xs text-[#555] hover:text-gray-300 transition-colors mb-3 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a empresas
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="ms-h1">{empresa.nombre}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${TIPO_COLORS[empresa.tipo] ?? "bg-gray-900/30 text-gray-400"}`}>
                {TIPO_LABELS[empresa.tipo] ?? empresa.tipo}
              </span>
              {!empresa.activo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">Inactiva</span>}
            </div>
            {empresa.giro && <p className="ms-subtitle mt-0.5">{empresa.giro}</p>}
          </div>
          <Link href="/catalogo/empresas" className="text-xs text-[#B3985B] hover:underline shrink-0">
            Ver todas
          </Link>
        </div>

        {/* Info básica */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {empresa.telefono && (
            <div className="ms-card px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Teléfono</p>
              <p className="text-sm text-gray-300 mt-0.5">{empresa.telefono}</p>
            </div>
          )}
          {empresa.correo && (
            <div className="ms-card px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Correo</p>
              <p className="text-sm text-gray-300 mt-0.5 truncate">{empresa.correo}</p>
            </div>
          )}
          {empresa.rfc && (
            <div className="ms-card px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">RFC</p>
              <p className="text-sm text-gray-300 font-mono mt-0.5">{empresa.rfc}</p>
            </div>
          )}
          {empresa.banco && (
            <div className="ms-card px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Banco</p>
              <p className="text-sm text-gray-300 mt-0.5">{empresa.banco}</p>
            </div>
          )}
        </div>

        {/* Métricas financieras rápidas */}
        {(empresa.cuentasCobrar.length > 0 || empresa.cuentasPagar.length > 0) && (
          <div className="mt-3">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${compensable > 0 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}>
              <div className="bg-green-950/20 border border-green-900/20 rounded-xl px-3 py-2">
                <p className="text-[10px] text-green-600 uppercase tracking-wider">Saldo a favor (Nos deben)</p>
                <p className="text-sm font-semibold text-green-400 mt-0.5">{fmt(pendienteCobrar)}</p>
                <p className="text-[10px] text-[#555]">
                  {cuentasCobrarPendientes.length} por cobrar · Total: {fmt(totalCobrar)}
                </p>
              </div>
              <div className="bg-red-950/20 border border-red-900/20 rounded-xl px-3 py-2">
                <p className="text-[10px] text-red-500 uppercase tracking-wider">Saldo en contra (Rentas mutuas)</p>
                <p className="text-sm font-semibold text-red-400 mt-0.5">{fmt(pendientePagar)}</p>
                <p className="text-[10px] text-[#555]">
                  {cuentasPagarPendientes.length > 0
                    ? `${cuentasPagarPendientes.length} por pagar · Total: ${fmt(totalPagar)}`
                    : empresa.cuentasPagar.length > 0
                      ? `${empresa.cuentasPagar.length} renta${empresa.cuentasPagar.length !== 1 ? "s" : ""} liquidada${empresa.cuentasPagar.length !== 1 ? "s" : ""}`
                      : "Sin rentas mutuas pendientes"}
                </p>
              </div>
              {compensable > 0 && (
                <div className="bg-[#B3985B]/10 border border-[#B3985B]/30 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-[#B3985B] uppercase tracking-wider">Disponible compensar</p>
                  <p className="text-sm font-semibold text-[#B3985B] mt-0.5">{fmt(compensable)}</p>
                  <p className="text-[10px] text-[#777]">Cruce de rentas mutuas</p>
                </div>
              )}
              <div className="bg-[#0d0d0d] border border-[#B3985B]/20 rounded-xl px-3 py-2">
                <p className="text-[10px] text-[#888] uppercase tracking-wider">
                  Saldo neto {neto > 0 ? "a favor" : neto < 0 ? "en contra" : "al corriente"}
                </p>
                <p className={`text-sm font-semibold mt-0.5 ${neto > 0 ? "text-green-400" : neto < 0 ? "text-red-400" : "text-gray-300"}`}>
                  {neto > 0 ? "+" : neto < 0 ? "−" : ""}{fmt(Math.abs(neto))}
                </p>
                <p className="text-[10px] text-[#555]">
                  {neto > 0 ? "A favor de Mainstage" : neto < 0 ? `A favor de ${empresa.nombre}` : "Saldos en cero"}
                </p>
              </div>
            </div>
            <button
              onClick={descargarEstadoCuenta}
              disabled={descargando}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-40"
            >
              {descargando ? (
                <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              )}
              {descargando ? "Generando…" : "Descargar estado de cuenta"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#1e1e1e] overflow-x-auto">
        {activeTabs.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); router.replace(`/catalogo/empresas/${id}?tab=${t}`, { scroll: false }); }}
            className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${currentTab === t ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-[#6b7280] hover:text-gray-300"}`}
          >
            {TAB_LABELS[t]}
            {t === "clientes" && empresa.contactosCliente.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-[#1a1a1a] text-[#555] px-1.5 py-0.5 rounded-full">{empresa.contactosCliente.length}</span>
            )}
            {t === "proveedores" && empresa.contactosProveedor.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-[#1a1a1a] text-[#555] px-1.5 py-0.5 rounded-full">{empresa.contactosProveedor.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {currentTab === "clientes" && (
        <div className="space-y-4">
          {empresa.contactosCliente.length === 0 ? (
            <div className="py-12 text-center ms-subtitle">Sin clientes vinculados a esta empresa</div>
          ) : empresa.contactosCliente.map(c => (
            <div key={c.id} className="ms-table-wrapper">
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/crm/clientes/${c.id}`} className="text-white font-medium text-sm hover:text-[#B3985B] transition-colors">
                      {c.nombre}
                    </Link>
                    <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-2 py-0.5 rounded-full">{c.tipoCliente}</span>
                    <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-2 py-0.5 rounded-full">{c.clasificacion}</span>
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    {c.telefono && <span className="text-xs text-[#555]">{c.telefono}</span>}
                    {c.correo && <span className="text-xs text-[#555]">{c.correo}</span>}
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-[#555] shrink-0">
                  <span>{c.tratos.length} trato{c.tratos.length !== 1 ? "s" : ""}</span>
                  <span>{c.proyectos.length} proyecto{c.proyectos.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {c.tratos.length > 0 && (
                <div className="px-4 pb-3 border-t border-[#1a1a1a]">
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mt-2 mb-1.5">Tratos recientes</p>
                  <div className="space-y-1">
                    {c.tratos.map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <Link href={`/crm/tratos/${t.id}`} className="text-gray-300 hover:text-[#B3985B] transition-colors truncate max-w-[60%]">
                          {t.nombreEvento ?? "Sin nombre"}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.presupuestoEstimado != null && <span className="text-[#555]">{fmt(t.presupuestoEstimado)}</span>}
                          <span className={ETAPA_COLORS[t.etapa] ?? "text-[#555]"}>{t.etapa}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {currentTab === "proveedores" && (
        <div className="space-y-3">
          {empresa.contactosProveedor.length === 0 ? (
            <div className="py-12 text-center ms-subtitle">Sin proveedores vinculados a esta empresa</div>
          ) : empresa.contactosProveedor.map(p => {
            const proyectosUnicos = Array.from(
              new Map(p.proyectoEquipos.map(pe => [pe.proyecto.id, pe.proyecto])).values()
            );
            return (
              <div key={p.id} className="ms-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/catalogo/proveedores/${p.id}`} className="text-white font-medium text-sm hover:text-[#B3985B] transition-colors">
                        {p.nombre}
                      </Link>
                      {p.giro && <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-2 py-0.5 rounded-full">{p.giro}</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      {p.telefono && <span className="text-xs text-[#555]">{p.telefono}</span>}
                      {p.correo && <span className="text-xs text-[#555]">{p.correo}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-[#555] shrink-0">{proyectosUnicos.length} proyecto{proyectosUnicos.length !== 1 ? "s" : ""}</span>
                </div>
                {proyectosUnicos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {proyectosUnicos.slice(0, 3).map(pr => (
                      <div key={pr.id} className="flex items-center justify-between text-xs">
                        <Link href={`/produccion/proyectos/${pr.id}`} className="text-gray-400 hover:text-[#B3985B] transition-colors truncate max-w-[70%]">
                          {pr.nombre}
                        </Link>
                        <span className={ESTADO_COLORS[pr.estado] ?? "text-[#555]"}>{pr.estado}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {currentTab === "historial" && (
        <div className="space-y-6">
          {empresa.cuentasCobrar.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Cuentas por cobrar (Rentas y servicios a cliente)</h3>
              <div className="space-y-2">
                {empresa.cuentasCobrar.map(c => {
                  const saldo = esCuentaActiva(c.estado) ? saldoDeCobrar(c) : 0;
                  const cubierto = c.montoCobrado + Number(c.montoCompensado || 0);
                  const referencia = c.cotizacion?.numeroCotizacion ?? c.proyecto?.numeroProyecto ?? null;
                  return (
                    <div key={c.id} className="ms-card px-4 py-2.5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-gray-300 text-xs truncate">{c.concepto}</p>
                          <p className="text-[10px] text-[#555] flex items-center gap-1.5 flex-wrap mt-0.5">
                            {c.fechaCompromiso && <span>Vence {fmtDate(c.fechaCompromiso)}</span>}
                            {referencia && <span className="text-[#B3985B]/70">· {referencia}</span>}
                            {c.contacto && <span>· vía {c.contacto.nombre}</span>}
                          </p>
                          {c.abonos && c.abonos.length > 0 && (
                            <div className="mt-1.5 space-y-0.5 border-t border-[#1e1e1e] pt-1">
                              {c.abonos.map((a) => (
                                <p key={a.id} className="text-[11px] text-emerald-400/90">
                                  ✓ Abono {fmtDate(a.fecha)} ({a.metodoPago === "EFECTIVO" ? "Efectivo" : a.cuenta ? `${a.metodoPago} · ${a.cuenta}` : a.metodoPago}): <span className="font-semibold">{fmt(a.monto)}</span>
                                  {a.grupoFechaCount && a.grupoFechaCount > 1 && a.grupoFechaTotal ? (
                                    <span className="text-[#B3985B] ml-1">
                                      · Parte de {fmt(a.grupoFechaTotal)} dividido en {a.grupoFechaCount} proyectos
                                    </span>
                                  ) : null}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium ${c.estado === "LIQUIDADO" || c.estado === "COMPENSADO" ? "text-green-400" : c.estado === "VENCIDO" ? "text-red-400" : "text-yellow-400"}`}>
                            {c.estado}
                          </span>
                          <div className="text-right">
                            <span className="text-white font-semibold">{fmt(saldo)}</span>
                            {cubierto > 0 && saldo > 0 && <p className="text-[10px] text-emerald-400/80">Abonado {fmt(cubierto)} de {fmt(c.monto)}</p>}
                            {saldo === 0 && <p className="text-[10px] text-[#555]">Total {fmt(c.monto)}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {(() => {
            const todosAbonos = empresa.cuentasCobrar
              .flatMap((c) => c.abonos ?? [])
              .sort((a, b) => a.fecha.localeCompare(b.fecha));
            if (todosAbonos.length === 0) return null;
            const totalAbonos = todosAbonos.reduce((s, a) => s + a.monto, 0);
            return (
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-medium text-white">
                    Desglose de abonos recibidos ({todosAbonos.length} registro{todosAbonos.length !== 1 ? "s" : ""})
                  </h3>
                  <span className="text-xs font-semibold text-emerald-400">Total abonado: {fmt(totalAbonos)}</span>
                </div>
                <div className="space-y-1.5">
                  {todosAbonos.map((a) => (
                    <div key={a.id} className="ms-card px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-white font-medium">{a.proyecto || a.concepto}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.estadoCuenta === "LIQUIDADO" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                            {a.estadoCuenta}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            · {fmtDate(a.fecha)} · {a.metodoPago === "EFECTIVO" ? "Efectivo" : a.cuenta ? `${a.metodoPago} (${a.cuenta})` : a.metodoPago}
                          </span>
                        </div>
                        {a.grupoFechaCount && a.grupoFechaCount > 1 && a.grupoFechaTotal && (
                          <p className="text-[10px] text-[#B3985B] mt-0.5">
                            Parte de abono de {fmt(a.grupoFechaTotal)} dividido en {a.grupoFechaCount} proyectos: {a.grupoDetalle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 shrink-0">{fmt(a.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {empresa.cuentasPagar.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Rentas mutuas / Cuentas por pagar (Como proveedor)</h3>
              <div className="space-y-2">
                {empresa.cuentasPagar.map(c => {
                  const saldo = esCuentaActiva(c.estado) ? saldoDePagar(c) : 0;
                  const referencia = c.proyecto?.numeroProyecto ?? null;
                  return (
                    <div key={c.id} className="flex items-center justify-between ms-card px-4 py-2.5 text-sm gap-3">
                      <div className="min-w-0">
                        <p className="text-gray-300 text-xs truncate">{c.concepto}</p>
                        <p className="text-[10px] text-[#555] flex items-center gap-1.5 flex-wrap mt-0.5">
                          {c.fechaCompromiso && <span>Vence {fmtDate(c.fechaCompromiso)}</span>}
                          {referencia && <span className="text-[#B3985B]/70">· {referencia}</span>}
                          {c.proveedor && <span>· {c.proveedor.nombre}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium ${c.estado === "LIQUIDADO" || c.estado === "COMPENSADO" ? "text-green-400" : c.estado === "VENCIDO" ? "text-red-400" : "text-yellow-400"}`}>
                          {c.estado}
                        </span>
                        <div className="text-right">
                          <span className="text-white font-semibold">{fmt(saldo)}</span>
                          {saldo !== c.monto && <p className="text-[10px] text-[#555]">de {fmt(c.monto)}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {empresa.cuentasCobrar.length === 0 && empresa.cuentasPagar.length === 0 && (
            <div className="py-12 text-center ms-subtitle">Sin movimientos financieros registrados</div>
          )}
        </div>
      )}

      {currentTab === "cuenta-corriente" && (
        <CuentaCorrienteTab empresaId={empresa.id} />
      )}
    </div>
  );
}
