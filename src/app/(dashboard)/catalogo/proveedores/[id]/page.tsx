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
import { Modal } from "@/components/Modal";

// ─── Types ───────────────────────────────────────────────────────────────────

const STAR_COLOR = '#c9a96a';

const GIROS_OPCIONES = [
  'Renta de equipo',
  'Venta de equipo',
  'Transporte',
  'Fotografía y video',
  'Catering y limpieza',
  'Iluminación arquitectónica',
  'Sonorización',
  'Estructuras y tarimas',
  'Pistas de baile',
  'Cerrajería',
  'Mecánico',
  'Grúas',
  'DJ',
  'Agencia de marketing',
  'Particular',
  'Otro',
] as const;

interface EquipoPortal {
  id: string;
  categoria: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  precioPublico: number | null;
  precioMainstage: number | null;
  aprobado: boolean;
}

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

interface ProyectoAsociado {
  proyecto: {
    id: string;
    numeroProyecto: string;
    nombre: string;
    estado: string;
    fechaEvent: string;
  };
}

interface ProveedorDetail {
  id: string;
  nombre: string;
  empresa: string | null;
  empresaId: string | null;
  compania: { id: string; nombre: string } | null;
  giro: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  rfc: string | null;
  cuentaBancaria: string | null;
  clabe: string | null;
  banco: string | null;
  noTarjeta: string | null;
  datosFiscales: string | null;
  activo: boolean;
  prioridad: number;
  createdAt: string;
  equiposPortal: EquipoPortal[];
  proyectoEquipos: {
    proyecto: {
      id: string;
      numeroProyecto: string;
      nombre: string;
      estado: string;
      fechaEvento: string;
    };
  }[];
  cuentasCobrar?: CuentaCobrarItem[];
  cuentasPagar?: CuentaPagarItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ESTADO_PROY_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/50 text-blue-300",
  CONFIRMADO: "bg-green-900/50 text-green-300",
  EN_CURSO: "bg-yellow-900/50 text-yellow-300",
  COMPLETADO: "bg-gray-700 text-gray-300",
  CANCELADO: "bg-red-900/50 text-red-300",
};

const ESTADO_CUENTA_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-900/40 text-yellow-300",
  PARCIAL: "bg-purple-900/40 text-purple-300",
  LIQUIDADO: "bg-green-900/40 text-green-300",
  VENCIDO: "bg-red-900/40 text-red-300",
};

const CAT_LABEL: Record<string, string> = {
  AUDIO: "Audio", VIDEO: "Video", ILUMINACION: "Iluminación",
  BACKLINE: "Backline", ESCENOGRAFIA: "Escenografía", LOGISTICA: "Logística", OTRO: "Otro",
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

function esCuentaPendiente(estado: string) {
  return ["PENDIENTE", "PARCIAL", "VENCIDO"].includes(estado);
}

function StarRating({ value, onChange, size = 16 }: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(value === n ? 0 : n)}
          className="leading-none transition-transform hover:scale-110 focus:outline-none"
          style={{
            fontSize: size,
            color: n <= value ? STAR_COLOR : '#2a2a2a',
            cursor: onChange ? 'pointer' : 'default',
            lineHeight: 1,
          }}
        >
          {n <= value ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  );
}

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProveedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [proveedor, setProveedor] = useState<ProveedorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<Partial<ProveedorDetail>>({});
  const [empresaEdit, setEmpresaEdit] = useState<{ id: string; nombre: string } | null>(null);
  const formLoaded = useRef(false);
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/proveedores/${id}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setProveedor(d.proveedor);
      setForm(d.proveedor);
      setEmpresaEdit(d.proveedor.compania ?? null);
    } catch {
      toast.error("Error al cargar proveedor");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-save del modal de edición
  useEffect(() => {
    if (!editando || !formLoaded.current) return;
    if (formTimer.current) clearTimeout(formTimer.current);
    setSaving(true);
    formTimer.current = setTimeout(async () => {
      const payload = {
        nombre: form.nombre,
        empresaId: form.empresaId || null,
        empresa: form.empresa || null,
        giro: form.giro || null,
        telefono: form.telefono || null,
        correo: form.correo || null,
        notas: form.notas || null,
        rfc: form.rfc || null,
        cuentaBancaria: form.cuentaBancaria || null,
        clabe: form.clabe || null,
        banco: form.banco || null,
        noTarjeta: form.noTarjeta || null,
        datosFiscales: form.datosFiscales || null,
        prioridad: form.prioridad ?? 0,
      };
      const res = await fetch(`/api/proveedores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
      const d = await res.json();
      setProveedor((prev) => (prev ? { ...prev, ...d.proveedor } : prev));
      setAutoSaved(true);
      setSaving(false);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [form, editando, id, toast]);

  async function guardar() {
    if (formTimer.current) clearTimeout(formTimer.current);
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      empresaId: form.empresaId || null,
      empresa: form.empresa || null,
      giro: form.giro || null,
      telefono: form.telefono || null,
      correo: form.correo || null,
      notas: form.notas || null,
      rfc: form.rfc || null,
      cuentaBancaria: form.cuentaBancaria || null,
      clabe: form.clabe || null,
      banco: form.banco || null,
      noTarjeta: form.noTarjeta || null,
      datosFiscales: form.datosFiscales || null,
      prioridad: form.prioridad ?? 0,
    };
    const res = await fetch(`/api/proveedores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    const d = await res.json();
    setProveedor((prev) => (prev ? { ...prev, ...d.proveedor } : prev));
    formLoaded.current = false;
    setEditando(false);
    setSaving(false);
  }

  async function guardarCampoInline(campo: Partial<ProveedorDetail>) {
    const res = await fetch(`/api/proveedores/${id}`, {
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
    setProveedor((prev) => (prev ? { ...prev, ...d.proveedor } : prev));
    setForm((prev) => ({ ...prev, ...campo }));
  }

  async function eliminarProveedor() {
    const ok = await confirm({
      message: `¿Eliminar al proveedor "${proveedor?.nombre}"? Esta acción no se puede deshacer.`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    setDeleting(true);
    const res = await fetch(`/api/proveedores/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      setDeleting(false);
      return;
    }
    toast.success("Proveedor eliminado");
    router.push("/catalogo/proveedores");
  }

  if (loading) return <SkeletonPage rows={5} cols={4} />;
  if (!proveedor) return <div className="text-red-400 text-sm p-6">Proveedor no encontrado</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <BackButton />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:ms-h1 truncate">{proveedor.nombre}</h1>
          {(proveedor.compania ?? proveedor.empresa) && (
            <p className="text-gray-400 text-sm mt-0.5">
              {proveedor.compania?.nombre ?? proveedor.empresa}
            </p>
          )}
          <div className="flex gap-3 mt-3 flex-wrap">
            <InlineSelect
              label="Prioridad"
              value={String(proveedor.prioridad)}
              options={[
                { value: "0", label: "Sin prioridad" },
                { value: "1", label: "1 estrella" },
                { value: "2", label: "2 estrellas" },
                { value: "3", label: "3 estrellas" },
              ]}
              onSave={(val) => guardarCampoInline({ prioridad: parseInt(val, 10) })}
            />
            <InlineSelect
              label="Giro / Servicio"
              value={proveedor.giro ?? ""}
              options={[
                { value: "", label: "— Sin giro —" },
                ...GIROS_OPCIONES.map(g => ({ value: g, label: g })),
              ]}
              onSave={(val) => guardarCampoInline({ giro: val || null })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => {
              formLoaded.current = false;
              setTimeout(() => { formLoaded.current = true; }, 100);
              setEmpresaEdit(proveedor.compania ?? null);
              setEditando(true);
            }}
            className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            Editar datos
          </button>
          <button
            onClick={eliminarProveedor}
            disabled={deleting}
            className="px-3 py-2 rounded-lg border border-red-900/40 text-red-500 hover:bg-red-900/20 text-sm transition-colors disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>

      {/* ── Modal: Editar datos ────────────────────────────────────────────── */}
      {editando && (
        <Modal
          open={editando}
          onClose={() => setEditando(false)}
          title={`Editando: ${proveedor.nombre}`}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre / Contacto *</label>
              <input value={form.nombre || ""} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Nombre del contacto o empresa" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Empresa / Razón social</label>
              <EmpresaCombobox
                value={empresaEdit}
                onChange={(emp) => {
                  setEmpresaEdit(emp);
                  setForm(p => ({ ...p, empresaId: emp?.id ?? "", empresa: emp?.nombre ?? "" }));
                }}
                tipoDefault="PROVEEDOR"
                placeholder="Buscar o crear empresa..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Teléfono / WhatsApp</label>
              <input value={form.telefono || ""} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="442 000 0000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Correo electrónico</label>
              <input type="email" value={form.correo || ""} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="contacto@proveedor.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">RFC</label>
              <input value={form.rfc || ""} onChange={e => setForm(p => ({ ...p, rfc: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="RFC del proveedor" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Banco</label>
              <input value={form.banco || ""} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="BBVA, Banorte, HSBC…" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Número de cuenta</label>
              <input value={form.cuentaBancaria || ""} onChange={e => setForm(p => ({ ...p, cuentaBancaria: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="11 dígitos" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CLABE interbancaria</label>
              <input value={form.clabe || ""} onChange={e => setForm(p => ({ ...p, clabe: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="18 dígitos" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Número de tarjeta</label>
              <input value={form.noTarjeta || ""} onChange={e => setForm(p => ({ ...p, noTarjeta: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="16 dígitos" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Datos fiscales adicionales</label>
              <input value={form.datosFiscales || ""} onChange={e => setForm(p => ({ ...p, datosFiscales: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Razón social, régimen fiscal..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={form.notas || ""} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Notas sobre el proveedor..." />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end">
            {saving && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
            {autoSaved && !saving && <span className="text-xs text-green-500">✓ Guardado</span>}
            <button onClick={() => setEditando(false)}
              className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
              Cerrar
            </button>
            <button onClick={guardar} disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {/* ── Información de contacto y bancaria ─────────────────────────────── */}
      <div className="ms-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">
          Información General
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">Empresa</p>
            {proveedor.compania ? (
              <Link href={`/catalogo/empresas/${proveedor.compania.id}`} className="text-[#B3985B] hover:underline">
                {proveedor.compania.nombre}
              </Link>
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Teléfono</p>
            {proveedor.telefono ? (
              <div className="flex items-center gap-2">
                <span className="text-white">{proveedor.telefono}</span>
                <CopyButton value={proveedor.telefono} size="xs" />
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Correo</p>
            <span className="text-white">{proveedor.correo || "—"}</span>
          </div>

          <div className="border-t border-[#1e1e1e] col-span-3 pt-3 mt-1 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
            <div>
              <p className="text-gray-500 text-xs mb-1">RFC</p>
              <span className="text-white font-mono">{proveedor.rfc || "—"}</span>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Banco / CLABE</p>
              {proveedor.banco || proveedor.clabe ? (
                <div className="text-white">
                  {proveedor.banco && <p className="font-semibold text-xs">{proveedor.banco}</p>}
                  {proveedor.clabe && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-xs text-gray-300">{proveedor.clabe}</span>
                      <CopyButton value={proveedor.clabe} size="xs" />
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-600">—</span>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Cuenta / Tarjeta</p>
              {proveedor.cuentaBancaria || proveedor.noTarjeta ? (
                <div className="text-white text-xs font-mono space-y-0.5">
                  {proveedor.cuentaBancaria && <p>Cta: {proveedor.cuentaBancaria}</p>}
                  {proveedor.noTarjeta && <p>Tarj: {proveedor.noTarjeta}</p>}
                </div>
              ) : (
                <span className="text-gray-600">—</span>
              )}
            </div>
          </div>

          {proveedor.datosFiscales && (
            <div className="col-span-3 border-t border-[#1e1e1e] pt-3 mt-1">
              <p className="text-gray-500 text-xs mb-1">Datos Fiscales</p>
              <p className="text-gray-300 text-xs">{proveedor.datosFiscales}</p>
            </div>
          )}

          {proveedor.notas && (
            <div className="col-span-3 border-t border-[#1e1e1e] pt-3 mt-1">
              <p className="text-gray-500 text-xs mb-1">Notas / Condiciones</p>
              <p className="text-gray-300 italic text-xs">{proveedor.notas}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cuentas por cobrar / pagar (Tarjetas y Detalle) ─────────────────── */}
      <PanelCuentasProveedor
        proveedorId={id}
        proveedorNombre={proveedor.nombre}
        empresaNombre={proveedor.compania?.nombre ?? proveedor.empresa ?? null}
        cuentasCobrar={proveedor.cuentasCobrar ?? []}
        cuentasPagar={proveedor.cuentasPagar ?? []}
      />

      {/* ── Inventario / Equipos ───────────────────────────────────────────── */}
      <div className="ms-card p-5">
        <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">
          Equipos Registrados ({proveedor.equiposPortal.length})
        </h2>
        {proveedor.equiposPortal.length === 0 ? (
          <p className="text-[#555] text-xs py-4 text-center">Este proveedor no tiene equipos registrados en su portal.</p>
        ) : (
          <div className="space-y-2">
            {proveedor.equiposPortal.map((e) => (
              <div key={e.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${e.aprobado ? "bg-green-950/10 border-green-900/30" : "bg-[#111] border-[#1e1e1e]"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-[#1a1a1a] text-[#B3985B] px-1.5 py-0.5 rounded">{CAT_LABEL[e.categoria] ?? e.categoria}</span>
                    {e.cantidad > 1 && <span className="text-[10px] text-gray-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded">x{e.cantidad}</span>}
                  </div>
                  <p className="text-white text-sm font-medium mt-1">{e.descripcion}</p>
                  {(e.marca || e.modelo) && (
                    <p className="text-gray-500 text-xs mt-0.5">{e.marca} {e.modelo}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {e.precioMainstage && <p className="text-[#B3985B] text-sm font-semibold">{fmt(e.precioMainstage)}</p>}
                  {e.precioPublico && <p className="text-gray-500 text-[10px]">Público: {fmt(e.precioPublico)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Proyectos Asociados ────────────────────────────────────────────── */}
      <div className="ms-card p-5">
        <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">
          Proyectos Asociados ({proveedor.proyectoEquipos.length})
        </h2>
        {proveedor.proyectoEquipos.length === 0 ? (
          <p className="text-[#555] text-xs py-4 text-center">Sin proyectos registrados con este proveedor.</p>
        ) : (
          <div className="space-y-2">
            {proveedor.proyectoEquipos.map(({ proyecto: p }) => (
              <Link
                key={p.id}
                href={`/produccion/proyectos/${p.id}`}
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
                    {p.estado}
                  </span>
                </div>
                <p className="text-gray-500 text-xs">{fmtDate(p.fechaEvento)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PanelCuentasProveedor ───────────────────────────────────────────────────

function PanelCuentasProveedor({
  proveedorId,
  proveedorNombre,
  empresaNombre,
  cuentasCobrar,
  cuentasPagar,
}: {
  proveedorId: string;
  proveedorNombre: string;
  empresaNombre: string | null;
  cuentasCobrar: CuentaCobrarItem[];
  cuentasPagar: CuentaPagarItem[];
}) {
  const [descargando, setDescargando] = useState(false);
  const toast = useToast();

  const cuentasCobrarPendientes = cuentasCobrar.filter((c) => esCuentaPendiente(c.estado) && Math.max(0, c.monto - c.montoCobrado) > 0);
  const cuentasPagarPendientes = cuentasPagar.filter((c) => esCuentaPendiente(c.estado) && Math.max(0, c.monto - c.montoPagado) > 0);
  const cuentasCobrarLiquidadas = cuentasCobrar.filter((c) => !cuentasCobrarPendientes.includes(c));
  const cuentasPagarLiquidadas = cuentasPagar.filter((c) => !cuentasPagarPendientes.includes(c));

  const totalCobrar = cuentasCobrarPendientes.reduce((s, c) => s + Math.max(0, c.monto - c.montoCobrado), 0);
  const totalPagar = cuentasPagarPendientes.reduce((s, c) => s + Math.max(0, c.monto - c.montoPagado), 0);
  const neto = totalCobrar - totalPagar;

  async function descargar() {
    setDescargando(true);
    try {
      const res = await fetch(`/api/proveedores/${proveedorId}/estado-cuenta/pdf`);
      if (!res.ok) {
        toast.error("No se pudo generar el estado de cuenta");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fecha = new Date().toISOString().slice(0, 10);
      const slug = proveedorNombre.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
      a.download = `EstadoCuenta-${slug || proveedorId.slice(0, 8)}-${fecha}.pdf`;
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
              ? "Saldos consolidados de la empresa, sumando todos sus contactos y proveedores asociados"
              : "Relación de saldos y cuentas pendientes de este proveedor"}
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
          Este proveedor no tiene cuentas por cobrar ni por pagar registradas.
        </div>
      ) : (
        <>
          {/* Resumen de saldos / Tarjetas */}
          <div className="grid gap-3 mb-4 grid-cols-1 sm:grid-cols-3">
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Nos deben</p>
              <p className={`text-xl font-bold ${totalCobrar > 0 ? "text-[#B3985B]" : "text-green-400"}`}>
                {fmt(totalCobrar)}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {cuentasCobrarPendientes.length} concepto{cuentasCobrarPendientes.length !== 1 ? "s" : ""} · por cobrar
              </p>
            </div>
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
          </div>

          {/* Listas de cuentas pendientes */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
                    const saldo = Math.max(0, c.monto - c.montoCobrado);
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
                    const saldo = Math.max(0, c.monto - c.montoPagado);
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
          </div>

          {/* Historial de cuentas liquidadas o canceladas */}
          {(cuentasCobrarLiquidadas.length > 0 || cuentasPagarLiquidadas.length > 0) && (
            <div className="mt-6 pt-4 border-t border-[#1e1e1e]">
              <details className="group">
                <summary className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer list-none flex items-center gap-2 font-medium">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  <span>Historial: cuentas liquidadas o canceladas ({cuentasCobrarLiquidadas.length + cuentasPagarLiquidadas.length})</span>
                </summary>
                <div className="mt-3 grid gap-4 grid-cols-1 lg:grid-cols-2">
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
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ESTADO_CUENTA_COLORS[c.estado] || "bg-gray-700 text-gray-300"}`}>
                                    {c.estado}
                                  </span>
                                  {c.fechaCobroReal && (
                                    <span className="text-[10px] text-gray-600">Cobrado el {fmtDate(c.fechaCobroReal)}</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-500 text-xs font-semibold shrink-0">{fmt(c.monto)}</p>
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
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${ESTADO_CUENTA_COLORS[c.estado] || "bg-gray-700 text-gray-300"}`}>
                                    {c.estado}
                                  </span>
                                  {c.fechaPagoReal && (
                                    <span className="text-[10px] text-gray-600">Pagado el {fmtDate(c.fechaPagoReal)}</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-500 text-xs font-semibold shrink-0">{fmt(c.monto)}</p>
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
