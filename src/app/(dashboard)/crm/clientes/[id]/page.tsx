"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { EmpresaCombobox } from "@/components/EmpresaCombobox";
import { BackButton } from "@/components/BackButton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EquipoCatalogo {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  precioRenta: number;
  tipo: string;
  activo: boolean;
  categoria: { id: string; nombre: string; orden: number };
}

interface PrecioMap {
  [equipoId: string]: {
    precio: number;
    precioOriginal: number | null;
    nota: string | null;
    updatedAt: string;
  };
}

interface Vendedor { id: string; name: string }

interface CuentaCobrarItem {
  id: string;
  concepto: string;
  monto: number;
  montoCobrado: number;
  estado: string;
  fechaCompromiso: string;
  fechaCobroReal: string | null;
  cotizacion: { numeroCotizacion: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
}
interface CuentaPagarItem {
  id: string;
  concepto: string;
  monto: number;
  montoPagado: number;
  estado: string;
  fechaCompromiso: string;
  fechaPagoReal: string | null;
  tipoAcreedor: string;
  proveedor: { nombre: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
}

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  empresaId: string | null;
  compania: { id: string; nombre: string; tipo?: string } | null;
  tipoCliente: string;
  clasificacion: string;
  esProspecto: boolean;
  servicioUsual: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  vendedorId: string | null;
  vendedor: Vendedor | null;
  createdAt: string;
  tratos: Array<{ id: string; etapa: string; tipoEvento: string; nombreEvento: string | null; lugarEstimado: string | null; fechaEventoEstimada: string | null; presupuestoEstimado: number | null; createdAt: string; updatedAt?: string }>;
  cotizaciones: Array<{ id: string; numeroCotizacion: string; nombreEvento: string | null; estado: string; granTotal: number; createdAt: string }>;
  proyectos: Array<{ id: string; numeroProyecto: string; nombre: string; estado: string; fechaEvento: string }>;
  cuentasCobrar?: CuentaCobrarItem[];
  cuentasPagar?: CuentaPagarItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAPA_COLORS: Record<string, string> = {
  DESCUBRIMIENTO: "bg-gray-700 text-gray-200",
  OPORTUNIDAD: "bg-yellow-900/50 text-yellow-300",
  VENTA_CERRADA: "bg-green-900/50 text-green-300",
  VENTA_PERDIDA: "bg-red-900/50 text-red-300",
};
const ESTADO_COT_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-700 text-gray-300",
  ENVIADA: "bg-blue-900/50 text-blue-300",
  APROBADA: "bg-green-900/50 text-green-300",
  RECHAZADA: "bg-red-900/50 text-red-300",
};
const ESTADO_PROY_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/50 text-blue-300",
  CONFIRMADO: "bg-green-900/50 text-green-300",
  EN_CURSO: "bg-yellow-900/50 text-yellow-300",
  COMPLETADO: "bg-gray-700 text-gray-300",
  CANCELADO: "bg-red-900/50 text-red-300",
};
const TIPO_EVENTO_LABELS: Record<string, string> = {
  MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro",
};
const ESTADO_CUENTA_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-900/40 text-yellow-300",
  PARCIAL: "bg-purple-900/40 text-purple-300",
  LIQUIDADO: "bg-green-900/40 text-green-300",
  VENCIDO: "bg-red-900/40 text-red-300",
};
const ESTADO_COLORS: Record<string, string> = {
  CLIENTE: "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/30",
  PROSPECTO: "bg-purple-900/50 text-purple-300 border-purple-800/40",
};

const CLASIFICACION_COLORS: Record<string, string> = {
  PROSPECTO: "bg-purple-900/50 text-purple-300 border-purple-800/40",
  NUEVO: "bg-gray-700/60 text-gray-300 border-gray-600/40",
  REGULAR: "bg-yellow-900/50 text-yellow-300 border-yellow-800/40",
  PRIORITY: "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/30",
  BASIC: "bg-blue-900/50 text-blue-300 border-blue-800/40",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── InlineSelect ─────────────────────────────────────────────────────────────

function InlineSelect({ label, value, options, onSave, colorMap }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSave: (val: string) => Promise<void>;
  colorMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function select(val: string) {
    if (val === value) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    await onSave(val);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const current = options.find((o) => o.value === value);
  const colorClass = colorMap?.[value] ?? "bg-[#1a1a1a] text-gray-300 border-[#333]";

  return (
    <div ref={ref} className="relative">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">{label}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50 ${colorClass}`}
      >
        {saving && (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        )}
        {saved && !saving && <span className="text-green-400 text-[10px]">✓</span>}
        {(current?.label ?? value) || "—"}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
          <polyline points="2 4 6 8 10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="ms-dropdown left-0 top-full mt-1 min-w-[180px]">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-[#1e1e1e] ${
                o.value === value ? "text-[#B3985B] font-medium" : "text-gray-400"
              }`}
            >
              {o.label}
              {o.value === value && <span className="text-[#B3985B]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PanelPrecios ─────────────────────────────────────────────────────────────

function PanelPrecios({
  clienteId,
  equipos,
  preciosIniciales,
}: {
  clienteId: string;
  equipos: EquipoCatalogo[];
  preciosIniciales: PrecioMap;
}) {
  const toast = useToast();

  const [preciosMap, setPreciosMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(preciosIniciales)) {
      m[k] = String(v.precio);
    }
    return m;
  });
  const [savingSet, setSavingSet] = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [busqueda, setBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("TODOS");
  const [soloConPrecio, setSoloConPrecio] = useState(false);

  const categorias = Array.from(
    new Map(
      equipos.map((e) => [
        e.categoria.id,
        { id: e.categoria.id, nombre: e.categoria.nombre, orden: e.categoria.orden },
      ])
    ).values()
  ).sort((a, b) => a.orden - b.orden);

  const equiposFiltrados = equipos.filter((eq) => {
    if (soloConPrecio && !preciosMap[eq.id]) return false;
    if (filtroCat !== "TODOS" && eq.categoria.id !== filtroCat) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      return (
        eq.descripcion.toLowerCase().includes(q) ||
        (eq.marca ?? "").toLowerCase().includes(q) ||
        (eq.modelo ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countConPrecio = Object.keys(preciosMap).length;

  const guardarPrecio = useCallback(
    async (equipoId: string, valorStr: string) => {
      const valor = parseFloat(valorStr);
      if (isNaN(valor) || valorStr.trim() === "") {
        setSavingSet((prev) => new Set(prev).add(equipoId));
        try {
          await fetch(
            `/api/clientes/${clienteId}/precios-equipos?equipoId=${equipoId}`,
            { method: "DELETE" }
          );
          setPreciosMap((prev) => {
            const n = { ...prev };
            delete n[equipoId];
            return n;
          });
          setSavedSet((prev) => {
            const n = new Set(prev);
            n.add(equipoId);
            return n;
          });
          setTimeout(() =>
            setSavedSet((prev) => {
              const n = new Set(prev);
              n.delete(equipoId);
              return n;
            }),
            1500
          );
        } catch {
          toast.error("Error al eliminar precio");
        } finally {
          setSavingSet((prev) => {
            const n = new Set(prev);
            n.delete(equipoId);
            return n;
          });
        }
        return;
      }
      const eq = equipos.find((e) => e.id === equipoId);
      const precioOriginal = eq?.precioRenta ?? null;
      setSavingSet((prev) => new Set(prev).add(equipoId));
      try {
        const res = await fetch(`/api/clientes/${clienteId}/precios-equipos`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ equipoId, precio: valor, precioOriginal }),
        });
        if (!res.ok) {
          toast.error("Error al guardar precio");
          return;
        }
        setSavedSet((prev) => {
          const n = new Set(prev);
          n.add(equipoId);
          return n;
        });
        setTimeout(() =>
          setSavedSet((prev) => {
            const n = new Set(prev);
            n.delete(equipoId);
            return n;
          }),
          1500
        );
      } catch {
        toast.error("Error al guardar precio");
      } finally {
        setSavingSet((prev) => {
          const n = new Set(prev);
          n.delete(equipoId);
          return n;
        });
      }
    },
    [clienteId, equipos, toast]
  );

  function handlePrecioChange(equipoId: string, valor: string) {
    setPreciosMap((prev) => ({ ...prev, [equipoId]: valor }));
    if (timers.current[equipoId]) clearTimeout(timers.current[equipoId]);
    timers.current[equipoId] = setTimeout(() => guardarPrecio(equipoId, valor), 600);
  }

  function handleBorrarPrecio(equipoId: string) {
    setPreciosMap((prev) => {
      const n = { ...prev };
      delete n[equipoId];
      return n;
    });
    if (timers.current[equipoId]) clearTimeout(timers.current[equipoId]);
    guardarPrecio(equipoId, "");
  }

  return (
    <div className="ms-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider flex items-center gap-2">
            Precios preferenciales
            {countConPrecio > 0 && (
              <span className="text-xs font-normal normal-case tracking-normal text-[#555]">
                {countConPrecio} equipo{countConPrecio !== 1 ? "s" : ""} con precio especial
              </span>
            )}
          </h2>
          <p className="text-[10px] text-gray-700 mt-0.5">
            Al cotizar para este cliente, los precios preferenciales se aplican automáticamente
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-3">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]"
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, marca o modelo…"
          className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-gray-400"
          >
            ×
          </button>
        )}
      </div>

      {/* Filtros de categoría */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFiltroCat("TODOS")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filtroCat === "TODOS"
              ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
              : "border-[#1e1e1e] text-gray-600 hover:text-gray-400 hover:border-[#2a2a2a]"
          }`}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFiltroCat(filtroCat === cat.id ? "TODOS" : cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filtroCat === cat.id
                ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                : "border-[#1e1e1e] text-gray-600 hover:text-gray-400 hover:border-[#2a2a2a]"
            }`}
          >
            {cat.nombre}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setSoloConPrecio((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              soloConPrecio
                ? "bg-purple-900/30 border-purple-800/40 text-purple-300"
                : "border-[#1e1e1e] text-gray-600 hover:text-gray-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${soloConPrecio ? "bg-purple-400" : "bg-[#333]"}`} />
            Solo con precio especial{soloConPrecio ? ` (${countConPrecio})` : ""}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a]">
        <table className="w-full min-w-[580px] text-sm">
          <thead>
            <tr className="bg-[#0d0d0d] border-b border-[#1a1a1a]">
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium">
                Equipo
              </th>
              <th className="text-left px-3 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium hidden md:table-cell">
                Categoría
              </th>
              <th className="text-right px-3 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium">
                Precio público
              </th>
              <th className="text-right px-3 py-2.5 text-[10px] text-[#B3985B] uppercase tracking-wider font-medium">
                Precio preferencial
              </th>
              <th className="text-right px-3 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium hidden sm:table-cell">
                Ahorro
              </th>
              <th className="px-3 py-2.5 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {equiposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#444] text-sm">
                  {busqueda || filtroCat !== "TODOS"
                    ? "Sin resultados para este filtro"
                    : "No hay equipos en el inventario"}
                </td>
              </tr>
            ) : (
              equiposFiltrados.map((eq, idx) => {
                const precioEspecial = preciosMap[eq.id];
                const valorNum = precioEspecial !== undefined ? parseFloat(precioEspecial) : NaN;
                const tieneEspecial =
                  precioEspecial !== undefined &&
                  precioEspecial.trim() !== "" &&
                  !isNaN(valorNum);
                const ahorro =
                  tieneEspecial && eq.precioRenta > 0
                    ? Math.round((1 - valorNum / eq.precioRenta) * 100)
                    : 0;
                const isSaving = savingSet.has(eq.id);
                const isSaved = savedSet.has(eq.id);
                const isLast = idx === equiposFiltrados.length - 1;

                return (
                  <tr
                    key={eq.id}
                    className={`group transition-colors ${!isLast ? "border-b border-[#111]" : ""} ${
                      tieneEspecial
                        ? "bg-[#B3985B]/[0.04] hover:bg-[#B3985B]/[0.07]"
                        : "hover:bg-[#141414]"
                    }`}
                  >
                    {/* Equipo */}
                    <td className="px-4 py-2.5">
                      <p className="text-white text-xs font-medium leading-tight">{eq.descripcion}</p>
                      {(eq.marca || eq.modelo) && (
                        <p className="text-[#555] text-[10px] mt-0.5">
                          {[eq.marca, eq.modelo].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>

                    {/* Categoría */}
                    <td className="px-3 py-2.5 text-[#555] text-xs hidden md:table-cell">
                      {eq.categoria.nombre}
                    </td>

                    {/* Precio público */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-gray-400 text-xs font-mono">{fmt(eq.precioRenta)}</span>
                    </td>

                    {/* Precio preferencial */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSaving && (
                          <div className="w-3 h-3 border border-[#B3985B] border-t-transparent rounded-full animate-spin shrink-0" />
                        )}
                        {isSaved && !isSaving && (
                          <span className="text-green-400 text-[10px] shrink-0">✓</span>
                        )}
                        <div
                          className={`relative flex items-center rounded-lg border transition-colors ${
                            tieneEspecial
                              ? "border-[#B3985B]/40 bg-[#B3985B]/5"
                              : "border-[#1e1e1e] bg-[#0d0d0d] group-hover:border-[#2a2a2a]"
                          }`}
                        >
                          <span className="pl-2 text-[10px] text-[#555]">$</span>
                          <input
                            type="number"
                            value={preciosMap[eq.id] ?? ""}
                            onChange={(e) => handlePrecioChange(eq.id, e.target.value)}
                            placeholder={String(Math.round(eq.precioRenta))}
                            className={`w-24 bg-transparent px-2 py-1.5 text-xs text-right focus:outline-none font-mono ${
                              tieneEspecial
                                ? "text-[#B3985B] font-semibold"
                                : "text-gray-500 placeholder-[#333]"
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Ahorro */}
                    <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                      {tieneEspecial && ahorro > 0 ? (
                        <span className="text-[10px] text-emerald-400 font-medium">−{ahorro}%</span>
                      ) : tieneEspecial && ahorro < 0 ? (
                        <span className="text-[10px] text-red-400 font-medium">+{Math.abs(ahorro)}%</span>
                      ) : (
                        <span className="text-[10px] text-[#333]">—</span>
                      )}
                    </td>

                    {/* Borrar */}
                    <td className="px-3 py-2.5">
                      {tieneEspecial && (
                        <button
                          onClick={() => handleBorrarPrecio(eq.id)}
                          title="Quitar precio especial"
                          className="text-[#333] hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {equiposFiltrados.length > 0 && (
        <p className="text-[10px] text-[#444] mt-3 text-right">
          {equiposFiltrados.length} equipo{equiposFiltrados.length !== 1 ? "s" : ""} mostrado
          {equiposFiltrados.length !== 1 ? "s" : ""} · Se guarda automáticamente al escribir
        </p>
      )}
    </div>
  );
}

// ─── PanelCuentas ──────────────────────────────────────────────────────────────

function esCuentaPendiente(estado: string) {
  return estado !== "LIQUIDADO" && estado !== "CANCELADO" && estado !== "ANULADO";
}

function saldoCobrar(c: CuentaCobrarItem) {
  if (!esCuentaPendiente(c.estado)) return 0;
  return Math.max(0, c.monto - c.montoCobrado);
}

function saldoPagar(c: CuentaPagarItem) {
  if (!esCuentaPendiente(c.estado)) return 0;
  return Math.max(0, c.monto - c.montoPagado);
}

function PanelCuentas({
  clienteId,
  clienteNombre,
  empresaNombre,
  cuentasCobrar,
  cuentasPagar,
}: {
  clienteId: string;
  clienteNombre: string;
  empresaNombre: string | null;
  cuentasCobrar: CuentaCobrarItem[];
  cuentasPagar: CuentaPagarItem[];
}) {
  const [descargando, setDescargando] = useState(false);
  const toast = useToast();

  const cuentasCobrarPendientes = cuentasCobrar.filter((c) => esCuentaPendiente(c.estado) && saldoCobrar(c) > 0);
  const cuentasPagarPendientes = cuentasPagar.filter((c) => esCuentaPendiente(c.estado) && saldoPagar(c) > 0);
  const cuentasCobrarLiquidadas = cuentasCobrar.filter((c) => !cuentasCobrarPendientes.includes(c));
  const cuentasPagarLiquidadas = cuentasPagar.filter((c) => !cuentasPagarPendientes.includes(c));

  const totalCobrar = cuentasCobrarPendientes.reduce((s, c) => s + saldoCobrar(c), 0);
  const totalPagar = cuentasPagarPendientes.reduce((s, c) => s + saldoPagar(c), 0);
  const esProveedor = cuentasPagar.length > 0;
  const neto = totalCobrar - totalPagar;

  async function descargar() {
    setDescargando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/estado-cuenta/pdf`);
      if (!res.ok) {
        toast.error("No se pudo generar el estado de cuenta");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fecha = new Date().toISOString().slice(0, 10);
      const slug = clienteNombre.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
      a.download = `EstadoCuenta-${slug || clienteId.slice(0, 8)}-${fecha}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo generar el estado de cuenta");
    } finally {
      setDescargando(false);
    }
  }

  const hayMovimientos = cuentasCobrar.length > 0 || cuentasPagar.length > 0;

  return (
    <div className="ms-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">
            Cuentas{empresaNombre ? ` · ${empresaNombre}` : ""}
          </h2>
          <p className="text-[10px] text-gray-700 mt-0.5">
            {empresaNombre
              ? (esProveedor
                  ? "Saldos consolidados de la empresa (todos sus contactos): lo que nos deben y lo que les debemos"
                  : "Saldos consolidados de la empresa, sumando todos sus contactos")
              : (esProveedor
                  ? "Relación de saldos: lo que nos deben y lo que les debemos"
                  : "Saldos pendientes de cobro de este cliente")}
          </p>
        </div>
        <button
          onClick={descargar}
          disabled={descargando || !hayMovimientos}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {descargando ? (
            <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          )}
          {descargando ? "Generando…" : "Descargar estado de cuenta"}
        </button>
      </div>

      {!hayMovimientos ? (
        <div className="py-8 text-center text-[#555] text-sm">
          Este cliente no tiene cuentas por cobrar ni por pagar registradas.
        </div>
      ) : (
        <>
          {/* Resumen de saldos */}
          <div className={`grid gap-3 mb-4 ${esProveedor ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"}`}>
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Nos deben</p>
              <p className={`text-xl font-bold ${totalCobrar > 0 ? "text-[#B3985B]" : "text-green-400"}`}>
                {fmt(totalCobrar)}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {cuentasCobrarPendientes.length} concepto{cuentasCobrarPendientes.length !== 1 ? "s" : ""} · por cobrar
              </p>
            </div>
            {esProveedor && (
              <>
                <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Les debemos</p>
                  <p className={`text-xl font-bold ${totalPagar > 0 ? "text-red-400" : "text-green-400"}`}>
                    {fmt(totalPagar)}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {cuentasPagarPendientes.length} concepto{cuentasPagarPendientes.length !== 1 ? "s" : ""} · por pagar
                  </p>
                </div>
                <div className="bg-[#0d0d0d] border border-[#B3985B]/20 rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">
                    Balance neto {neto >= 0 ? "a favor" : "en contra"}
                  </p>
                  <p className={`text-xl font-bold ${neto >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {neto >= 0 ? "+" : "−"}{fmt(Math.abs(neto))}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {neto >= 0 ? "Nos deben más de lo que debemos" : "Debemos más de lo que nos deben"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Listas de cuentas pendientes */}
          <div className={`grid gap-4 ${esProveedor ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* Por cobrar */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B3985B]" />
                <p className="text-xs font-medium text-gray-400">Por cobrar</p>
              </div>
              {cuentasCobrarPendientes.length === 0 ? (
                <p className="text-[#555] text-xs py-3">Sin cuentas pendientes por cobrar.</p>
              ) : (
                <div className="space-y-2">
                  {cuentasCobrarPendientes.map((c) => {
                    const saldo = saldoCobrar(c);
                    const ref = c.cotizacion?.numeroCotizacion ?? (c.proyecto ? `#${c.proyecto.numeroProyecto}` : null);
                    return (
                      <div key={c.id} className="p-3 rounded-lg bg-[#1a1a1a]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{c.concepto}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {ref && <span className="text-[10px] font-mono text-gray-500">{ref}</span>}
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ESTADO_CUENTA_COLORS[c.estado] || "bg-gray-700 text-gray-300"}`}>
                                {c.estado}
                              </span>
                              <span className="text-[10px] text-gray-600">{fmtDate(c.fechaCompromiso)}</span>
                              {c.contacto && c.contacto.id !== clienteId && (
                                <span className="text-[10px] text-gray-600">· vía {c.contacto.nombre}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[#B3985B] text-sm font-semibold">{fmt(saldo)}</p>
                            {c.montoCobrado > 0 && saldo > 0 && (
                              <p className="text-[10px] text-gray-600">de {fmt(c.monto)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Por pagar */}
            {esProveedor && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <p className="text-xs font-medium text-gray-400">Por pagar</p>
                </div>
                {cuentasPagarPendientes.length === 0 ? (
                  <p className="text-[#555] text-xs py-3">Sin cuentas pendientes por pagar.</p>
                ) : (
                  <div className="space-y-2">
                    {cuentasPagarPendientes.map((c) => {
                      const saldo = saldoPagar(c);
                      const ref = c.proyecto ? `#${c.proyecto.numeroProyecto}` : null;
                      return (
                        <div key={c.id} className="p-3 rounded-lg bg-[#1a1a1a]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white text-sm truncate">{c.concepto}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {ref && <span className="text-[10px] font-mono text-gray-500">{ref}</span>}
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ESTADO_CUENTA_COLORS[c.estado] || "bg-gray-700 text-gray-300"}`}>
                                  {c.estado}
                                </span>
                                <span className="text-[10px] text-gray-600">{fmtDate(c.fechaCompromiso)}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-red-400 text-sm font-semibold">{fmt(saldo)}</p>
                              {c.montoPagado > 0 && saldo > 0 && (
                                <p className="text-[10px] text-gray-600">de {fmt(c.monto)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Historial de cuentas liquidadas o canceladas */}
          {(cuentasCobrarLiquidadas.length > 0 || cuentasPagarLiquidadas.length > 0) && (
            <div className="mt-6 pt-4 border-t border-[#1e1e1e]">
              <details className="group">
                <summary className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer list-none flex items-center gap-2 font-medium">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  <span>Historial: cuentas liquidadas o canceladas ({cuentasCobrarLiquidadas.length + cuentasPagarLiquidadas.length})</span>
                </summary>
                <div className={`mt-3 grid gap-4 ${esProveedor ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                  {cuentasCobrarLiquidadas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-500 font-semibold mb-1">Cobros liquidados</p>
                      {cuentasCobrarLiquidadas.map((c) => {
                        const ref = c.cotizacion?.numeroCotizacion ?? (c.proyecto ? `#${c.proyecto.numeroProyecto}` : null);
                        return (
                          <div key={c.id} className="p-3 rounded-lg bg-[#141414] opacity-75">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-gray-300 text-xs truncate">{c.concepto}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {ref && <span className="text-[10px] font-mono text-gray-600">{ref}</span>}
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ESTADO_CUENTA_COLORS[c.estado] || "bg-gray-800 text-gray-400"}`}>
                                    {c.estado}
                                  </span>
                                  <span className="text-[10px] text-gray-600">{fmtDate(c.fechaCompromiso)}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-green-500 text-xs font-semibold">{fmt(c.montoCobrado || c.monto)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {cuentasPagarLiquidadas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-500 font-semibold mb-1">Pagos liquidados</p>
                      {cuentasPagarLiquidadas.map((c) => {
                        const ref = c.proyecto ? `#${c.proyecto.numeroProyecto}` : null;
                        return (
                          <div key={c.id} className="p-3 rounded-lg bg-[#141414] opacity-75">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-gray-300 text-xs truncate">{c.concepto}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {ref && <span className="text-[10px] font-mono text-gray-600">{ref}</span>}
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ESTADO_CUENTA_COLORS[c.estado] || "bg-gray-800 text-gray-400"}`}>
                                    {c.estado}
                                  </span>
                                  <span className="text-[10px] text-gray-600">{fmtDate(c.fechaCompromiso)}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-green-500 text-xs font-semibold">{fmt(c.montoPagado || c.monto)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});
  const [empresaEdit, setEmpresaEdit] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const formLoaded = useRef(false);
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [equiposCatalogo, setEquiposCatalogo] = useState<EquipoCatalogo[]>([]);
  const [preciosIniciales, setPreciosIniciales] = useState<PrecioMap>({});
  const [loadingInventario, setLoadingInventario] = useState(true);
  const [usuarios, setUsuarios] = useState<Vendedor[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clientes/${id}`).then((r) => r.json()),
      fetch(`/api/usuarios-activos`).then((r) => r.json()),
    ]).then(([d, u]) => {
      setCliente(d.cliente);
      setForm(d.cliente);
      setUsuarios(u.usuarios ?? []);
      setLoading(false);
    });

    setLoadingInventario(true);
    Promise.all([
      fetch(`/api/clientes/${id}/precios-equipos`).then((r) => r.json()),
      fetch(`/api/equipos`).then((r) => r.json()),
    ]).then(([preciosData, equiposData]) => {
      setEquiposCatalogo(
        ((equiposData.equipos ?? []) as EquipoCatalogo[]).filter((e) => e.activo)
      );
      setPreciosIniciales(preciosData.precios ?? {});
      setLoadingInventario(false);
    });
  }, [id]);

  // Auto-save del modal de edición
  useEffect(() => {
    if (!editando || !formLoaded.current) return;
    if (formTimer.current) clearTimeout(formTimer.current);
    setSaving(true);
    formTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
      const d = await res.json();
      setCliente((prev) => (prev ? { ...prev, ...d.cliente } : prev));
      setAutoSaved(true);
      setSaving(false);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 800);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardado inline de un campo específico (tipo, clasificación, etc.)
  async function guardarCampoInline(campo: Partial<Cliente>) {
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campo),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    const d = await res.json();
    setCliente((prev) => (prev ? { ...prev, ...d.cliente } : prev));
    setForm((prev) => ({ ...prev, ...campo }));
  }

  async function guardar() {
    if (formTimer.current) clearTimeout(formTimer.current);
    setSaving(true);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    const d = await res.json();
    setCliente((prev) => (prev ? { ...prev, ...d.cliente } : prev));
    formLoaded.current = false;
    setEditando(false);
    setSaving(false);
  }

  async function eliminarCliente() {
    const ok = await confirm({
      message: `¿Eliminar a "${cliente?.nombre}"? Esta acción no se puede deshacer.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    setDeleting(true);
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) {
      toast.error(d.error ?? "Error al eliminar");
      setDeleting(false);
      return;
    }
    toast.success("Cliente eliminado");
    router.push("/crm/clientes");
  }

  if (loading) return <SkeletonPage rows={5} cols={4} />;
  if (!cliente) return <div className="text-red-400 text-sm">Cliente no encontrado</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <BackButton />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:ms-h1 truncate">{cliente.nombre}</h1>
          {(cliente.compania ?? cliente.empresa) && (
            <p className="text-gray-400 text-sm mt-0.5">
              {cliente.compania?.nombre ?? cliente.empresa}
            </p>
          )}
          {/* Selectores inline con autoguardado */}
          <div className="flex gap-3 mt-3 flex-wrap">
            <InlineSelect
              label="Estado"
              value={cliente.esProspecto ? "PROSPECTO" : "CLIENTE"}
              options={[
                { value: "CLIENTE", label: "Cliente" },
                { value: "PROSPECTO", label: "Prospecto" },
              ]}
              onSave={(val) => guardarCampoInline({ esProspecto: val === "PROSPECTO" })}
              colorMap={ESTADO_COLORS}
            />
            <InlineSelect
              label="Tipo"
              value={cliente.tipoCliente}
              options={[
                { value: "POR_DESCUBRIR", label: "Por Descubrir" },
                { value: "B2B", label: "B2B" },
                { value: "B2C", label: "B2C" },
              ]}
              onSave={(val) => guardarCampoInline({ tipoCliente: val })}
            />
            <InlineSelect
              label="Clasificación"
              value={cliente.clasificacion}
              options={[
                { value: "PROSPECTO", label: "Prospecto" },
                { value: "NUEVO", label: "Nuevo" },
                { value: "REGULAR", label: "Regular" },
                { value: "PRIORITY", label: "Priority" },
              ]}
              onSave={(val) => guardarCampoInline({ clasificacion: val })}
              colorMap={CLASIFICACION_COLORS}
            />
            <InlineSelect
              label="Servicio usual"
              value={cliente.servicioUsual ?? ""}
              options={[
                { value: "", label: "— Sin especificar" },
                { value: "RENTA", label: "Renta de Equipo" },
                { value: "PRODUCCION_TECNICA", label: "Producción Técnica" },
                { value: "DIRECCION_TECNICA", label: "Dirección Técnica" },
                { value: "MULTISERVICIO", label: "Multiservicio" },
              ]}
              onSave={(val) => guardarCampoInline({ servicioUsual: val || null })}
            />
            <InlineSelect
              label="Responsable"
              value={cliente.vendedorId ?? ""}
              options={[
                { value: "", label: "— Sin asignar" },
                ...usuarios.map((u) => ({ value: u.id, label: u.name })),
              ]}
              onSave={(val) => guardarCampoInline({ vendedorId: val || null })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/crm/tratos/nuevo`}
            className="ms-btn-primary"
          >
            + Nuevo trato
          </Link>
          <button
            onClick={() => {
              formLoaded.current = false;
              setTimeout(() => { formLoaded.current = true; }, 100);
              setEmpresaEdit(cliente?.compania ?? null);
              setEditando(true);
            }}
            className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            Editar datos
          </button>
          <button
            onClick={eliminarCliente}
            disabled={deleting}
            className="px-3 py-2 rounded-lg border border-red-900/40 text-red-500 hover:bg-red-900/20 text-sm transition-colors disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>

      {/* ── Modal: Editar datos de contacto ─────────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditando(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Editar datos de contacto</h3>
              <button
                onClick={() => setEditando(false)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                  <input
                    value={form.nombre || ""}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Empresa</label>
                  <EmpresaCombobox
                    value={empresaEdit}
                    onChange={(emp) => {
                      setEmpresaEdit(emp);
                      setForm((p) => ({
                        ...p,
                        empresaId: emp?.id ?? null,
                        empresa: emp?.nombre ?? null,
                      }));
                    }}
                    tipoDefault="CLIENTE"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                  <input
                    value={form.telefono || ""}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Correo</label>
                  <input
                    type="email"
                    value={form.correo || ""}
                    onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <textarea
                  value={form.notas || ""}
                  onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                />
              </div>
              <div className="flex justify-end items-center gap-3 pt-2">
                {saving && (
                  <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>
                )}
                {autoSaved && !saving && (
                  <span className="text-xs text-green-500">✓ Guardado</span>
                )}
                <button
                  onClick={() => setEditando(false)}
                  className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Información de contacto ─────────────────────────────────────────── */}
      <div className="ms-card p-5">
        <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">
          Información de contacto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Empresa</p>
            {cliente.compania ? (
              <a
                href={`/catalogo/empresas/${cliente.compania.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#B3985B] hover:text-[#c9a96a] transition-colors"
              >
                {cliente.compania.nombre}
              </a>
            ) : (
              <span className="text-sm text-gray-600">—</span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Teléfono</p>
            {cliente.telefono ? (
              <div className="flex items-center gap-2">
                <span className="text-white">{cliente.telefono}</span>
                <CopyButton value={cliente.telefono} size="xs" />
                <a
                  href={`https://wa.me/${cliente.telefono
                    .replace(/\D/g, "")
                    .replace(/^(?!52)/, "52")}?text=${encodeURIComponent(
                    `Hola ${cliente.nombre.split(" ")[0]}! 👋`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-500 hover:text-green-400 bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WA
                </a>
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Correo</p>
            <p className="text-white">{cliente.correo || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Cliente desde</p>
            <p className="text-white">{fmtDate(cliente.createdAt)}</p>
          </div>
          {cliente.notas && (
            <div className="col-span-3">
              <p className="text-gray-500 text-xs mb-1">Notas</p>
              <p className="text-gray-300">{cliente.notas}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ms-stat-card text-center">
          <p className="ms-h1">{cliente.tratos.length}</p>
          <p className="text-gray-400 text-xs mt-1">Tratos</p>
        </div>
        <div className="ms-stat-card text-center">
          <p className="ms-h1">{cliente.cotizaciones.length}</p>
          <p className="text-gray-400 text-xs mt-1">Cotizaciones</p>
        </div>
        <div className="ms-stat-card text-center">
          <p className="ms-h1">{cliente.proyectos.length}</p>
          <p className="text-gray-400 text-xs mt-1">Proyectos</p>
        </div>
      </div>

      {/* ── Métricas Cliente 360 ────────────────────────────────────────────── */}
      {(() => {
        const valorTotal = (cliente.cotizaciones ?? [])
          .filter((c: { estado: string; granTotal: number }) => ['APROBADA', 'CONTRATADA'].includes(c.estado))
          .reduce((sum: number, c: { granTotal: number }) => sum + (c.granTotal ?? 0), 0);
        const ultimaInteraccion = (cliente.tratos ?? [])
          .sort((a: { updatedAt?: string; createdAt: string }, b: { updatedAt?: string; createdAt: string }) =>
            new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
          )[0]?.updatedAt ?? null;
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Valor total cerrado</p>
              <p className="text-[#B3985B] text-sm font-bold">
                {valorTotal > 0 ? `$${valorTotal.toLocaleString('es-MX')}` : '—'}
              </p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Última interacción</p>
              <p className="text-white text-sm font-medium">
                {ultimaInteraccion
                  ? new Date(ultimaInteraccion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Tratos ─────────────────────────────────────────────────────────── */}
      {cliente.tratos.length > 0 && (
        <div className="ms-card p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">
            Tratos
          </h2>
          <div className="space-y-2">
            {cliente.tratos.map((t) => (
              <Link
                key={t.id}
                href={`/crm/tratos/${t.id}`}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">
                      {t.nombreEvento?.trim() || TIPO_EVENTO_LABELS[t.tipoEvento] || t.tipoEvento}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${ETAPA_COLORS[t.etapa]}`}>
                      {t.etapa.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                    {t.nombreEvento?.trim() && (
                      <span className="text-gray-400">{TIPO_EVENTO_LABELS[t.tipoEvento] || t.tipoEvento}</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      {fmtDate(t.fechaEventoEstimada || t.createdAt)}
                    </span>
                    {t.lugarEstimado?.trim() && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        <span className="truncate">{t.lugarEstimado}</span>
                      </span>
                    )}
                  </div>
                </div>
                {t.presupuestoEstimado ? (
                  <p className="text-white text-sm font-medium shrink-0 whitespace-nowrap">{fmt(t.presupuestoEstimado)}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Cotizaciones ────────────────────────────────────────────────────── */}
      {cliente.cotizaciones.length > 0 && (
        <div className="ms-card p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">
            Cotizaciones
          </h2>
          <div className="space-y-2">
            {cliente.cotizaciones.map((c) => (
              <Link
                key={c.id}
                href={`/cotizaciones/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-mono">{c.numeroCotizacion}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        ESTADO_COT_COLORS[c.estado] || "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </div>
                  {c.nombreEvento?.trim() && (
                    <p className="text-gray-500 text-xs mt-1 truncate">{c.nombreEvento}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-medium">{fmt(c.granTotal)}</p>
                  <p className="text-gray-500 text-xs">{fmtDate(c.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Cuentas por cobrar / pagar ──────────────────────────────────────── */}
      <PanelCuentas
        clienteId={id}
        clienteNombre={cliente.nombre}
        empresaNombre={cliente.compania?.nombre ?? cliente.empresa ?? null}
        cuentasCobrar={cliente.cuentasCobrar ?? []}
        cuentasPagar={cliente.cuentasPagar ?? []}
      />

      {/* ── Proyectos ───────────────────────────────────────────────────────── */}
      {cliente.proyectos.length > 0 && (
        <div className="ms-card p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">
            Proyectos
          </h2>
          <div className="space-y-2">
            {cliente.proyectos.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-mono">{p.numeroProyecto}</span>
                  <span className="text-gray-300 text-sm">{p.nombre}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      ESTADO_PROY_COLORS[p.estado] || "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {p.estado.replace("_", " ")}
                  </span>
                </div>
                <p className="text-gray-500 text-xs">{fmtDate(p.fechaEvento)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Panel de precios preferenciales ────────────────────────────────── */}
      {loadingInventario ? (
        <div className="ms-card p-5">
          <p className="text-[#444] text-sm animate-pulse">Cargando inventario…</p>
        </div>
      ) : (
        <PanelPrecios
          clienteId={id}
          equipos={equiposCatalogo}
          preciosIniciales={preciosIniciales}
        />
      )}
    </div>
  );
}
