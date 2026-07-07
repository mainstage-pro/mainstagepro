"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
interface Cuenta { id: string; concepto: string; monto: number; estado: string; createdAt: string; }
interface EmpresaDetalle {
  id: string; nombre: string; giro: string | null; telefono: string | null; correo: string | null;
  sitioWeb: string | null; notas: string | null; rfc: string | null; datosFiscales: string | null;
  cuentaBancaria: string | null; clabe: string | null; banco: string | null; noTarjeta: string | null;
  tipo: string; activo: boolean;
  contactosCliente: ContactoCliente[];
  contactosProveedor: ContactoProveedor[];
  cuentasCobrar: Cuenta[];
  cuentasPagar: Cuenta[];
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

const TABS = ["clientes", "proveedores", "historial"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = {
  clientes: "Contactos clientes",
  proveedores: "Contactos proveedores",
  historial: "Historial financiero",
};

export default function EmpresaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const initialTab = (searchParams.get("tab") as Tab) ?? "clientes";
  const [tab, setTab] = useState<Tab>(initialTab);

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

  if (loading) return <div className="p-8 text-center text-[#6b7280] text-sm">Cargando...</div>;
  if (!empresa) return <div className="p-8 text-center text-[#6b7280] text-sm">Empresa no encontrada</div>;

  const totalCobrar = empresa.cuentasCobrar.reduce((s, c) => s + c.monto, 0);
  const totalPagar = empresa.cuentasPagar.reduce((s, c) => s + c.monto, 0);
  const pendienteCobrar = empresa.cuentasCobrar.filter(c => c.estado === "PENDIENTE" || c.estado === "PARCIAL" || c.estado === "VENCIDO").reduce((s, c) => s + c.monto, 0);
  const pendientePagar = empresa.cuentasPagar.filter(c => c.estado === "PENDIENTE" || c.estado === "PARCIAL" || c.estado === "VENCIDO").reduce((s, c) => s + c.monto, 0);

  const activeTabs: Tab[] = TABS.filter(t =>
    t === "historial" ||
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
              <h1 className="text-xl font-semibold text-white">{empresa.nombre}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${TIPO_COLORS[empresa.tipo] ?? "bg-gray-900/30 text-gray-400"}`}>
                {TIPO_LABELS[empresa.tipo] ?? empresa.tipo}
              </span>
              {!empresa.activo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">Inactiva</span>}
            </div>
            {empresa.giro && <p className="text-sm text-[#6b7280] mt-0.5">{empresa.giro}</p>}
          </div>
          <Link href="/catalogo/empresas" className="text-xs text-[#B3985B] hover:underline shrink-0">
            Ver todas
          </Link>
        </div>

        {/* Info básica */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {empresa.telefono && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Teléfono</p>
              <p className="text-sm text-gray-300 mt-0.5">{empresa.telefono}</p>
            </div>
          )}
          {empresa.correo && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Correo</p>
              <p className="text-sm text-gray-300 mt-0.5 truncate">{empresa.correo}</p>
            </div>
          )}
          {empresa.rfc && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">RFC</p>
              <p className="text-sm text-gray-300 font-mono mt-0.5">{empresa.rfc}</p>
            </div>
          )}
          {empresa.banco && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">Banco</p>
              <p className="text-sm text-gray-300 mt-0.5">{empresa.banco}</p>
            </div>
          )}
        </div>

        {/* Métricas financieras rápidas */}
        {(empresa.cuentasCobrar.length > 0 || empresa.cuentasPagar.length > 0) && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-950/20 border border-green-900/20 rounded-xl px-3 py-2">
              <p className="text-[10px] text-green-700 uppercase tracking-wider">Por cobrar</p>
              <p className="text-sm font-semibold text-green-400 mt-0.5">{fmt(pendienteCobrar)}</p>
              <p className="text-[10px] text-[#555]">Total: {fmt(totalCobrar)}</p>
            </div>
            <div className="bg-red-950/20 border border-red-900/20 rounded-xl px-3 py-2">
              <p className="text-[10px] text-red-700 uppercase tracking-wider">Por pagar</p>
              <p className="text-sm font-semibold text-red-400 mt-0.5">{fmt(pendientePagar)}</p>
              <p className="text-[10px] text-[#555]">Total: {fmt(totalPagar)}</p>
            </div>
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
            <div className="py-12 text-center text-[#6b7280] text-sm">Sin clientes vinculados a esta empresa</div>
          ) : empresa.contactosCliente.map(c => (
            <div key={c.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
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
            <div className="py-12 text-center text-[#6b7280] text-sm">Sin proveedores vinculados a esta empresa</div>
          ) : empresa.contactosProveedor.map(p => {
            const proyectosUnicos = Array.from(
              new Map(p.proyectoEquipos.map(pe => [pe.proyecto.id, pe.proyecto])).values()
            );
            return (
              <div key={p.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
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
              <h3 className="text-sm font-medium text-white mb-3">Cuentas por cobrar</h3>
              <div className="space-y-2">
                {empresa.cuentasCobrar.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-sm">
                    <div>
                      <p className="text-gray-300 text-xs">{c.concepto}</p>
                      <p className="text-[10px] text-[#555]">{fmtDate(c.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${c.estado === "LIQUIDADO" ? "text-green-400" : c.estado === "VENCIDO" ? "text-red-400" : "text-yellow-400"}`}>
                        {c.estado}
                      </span>
                      <span className="text-white font-semibold">{fmt(c.monto)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {empresa.cuentasPagar.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Cuentas por pagar</h3>
              <div className="space-y-2">
                {empresa.cuentasPagar.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-sm">
                    <div>
                      <p className="text-gray-300 text-xs">{c.concepto}</p>
                      <p className="text-[10px] text-[#555]">{fmtDate(c.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${c.estado === "LIQUIDADO" ? "text-green-400" : c.estado === "VENCIDO" ? "text-red-400" : "text-yellow-400"}`}>
                        {c.estado}
                      </span>
                      <span className="text-white font-semibold">{fmt(c.monto)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {empresa.cuentasCobrar.length === 0 && empresa.cuentasPagar.length === 0 && (
            <div className="py-12 text-center text-[#6b7280] text-sm">Sin movimientos financieros registrados</div>
          )}
        </div>
      )}
    </div>
  );
}
