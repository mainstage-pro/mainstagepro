"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

interface PrecioEspecial {
  equipoId: string;
  precio: number;
  precioOriginal: number | null;  // precio de lista al momento de registrar
  nota: string | null;
  updatedAt: string;
  // enriquecido en frontend
  descripcion?: string;
  marca?: string | null;
  modelo?: string | null;
  precioBase?: number;
  categoria?: string;
}

interface EquipoCatalogo {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  precioRenta: number;
  tipo: string;
  categoria: { nombre: string };
}

interface Vendedor { id: string; name: string }

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  tipoCliente: string;
  clasificacion: string;
  servicioUsual: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  vendedorId: string | null;
  vendedor: Vendedor | null;
  createdAt: string;
  tratos: Array<{ id: string; etapa: string; tipoEvento: string; fechaEventoEstimada: string | null; presupuestoEstimado: number | null; createdAt: string }>;
  cotizaciones: Array<{ id: string; numeroCotizacion: string; estado: string; granTotal: number; createdAt: string }>;
  proyectos: Array<{ id: string; numeroProyecto: string; nombre: string; estado: string; fechaEvento: string }>;
}

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

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const formLoaded = useRef(false);
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Precios especiales
  const [preciosEspeciales, setPreciosEspeciales] = useState<PrecioEspecial[]>([]);
  const [equiposCatalogo, setEquiposCatalogo] = useState<EquipoCatalogo[]>([]);
  const [usuarios, setUsuarios] = useState<Vendedor[]>([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [selEqId, setSelEqId] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [editandoPrecio, setEditandoPrecio] = useState<string | null>(null); // equipoId en edición inline
  const [editValor, setEditValor] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/clientes/${id}`).then(r => r.json()),
      fetch(`/api/usuarios-activos`).then(r => r.json()),
    ]).then(([d, u]) => {
      setCliente(d.cliente);
      setForm(d.cliente);
      setUsuarios(u.usuarios ?? []);
      setLoading(false);
    });

    // Cargar precios especiales y catálogo en paralelo
    setLoadingPrecios(true);
    Promise.all([
      fetch(`/api/clientes/${id}/precios-equipos`).then((r) => r.json()),
      fetch(`/api/equipos`).then((r) => r.json()),
    ]).then(([preciosData, equiposData]) => {
      const catalogo: EquipoCatalogo[] = equiposData.equipos ?? [];
      setEquiposCatalogo(catalogo);

      const mapa: Record<string, { precio: number; precioOriginal: number | null; nota: string | null; updatedAt: string }> =
        preciosData.precios ?? {};
      const enriquecidos: PrecioEspecial[] = Object.entries(mapa).map(([eqId, v]) => {
        const eq = catalogo.find((e) => e.id === eqId);
        return {
          equipoId: eqId,
          precio: v.precio,
          precioOriginal: v.precioOriginal ?? null,
          nota: v.nota,
          updatedAt: v.updatedAt,
          descripcion: eq?.descripcion ?? eqId,
          marca: eq?.marca ?? null,
          modelo: eq?.modelo ?? null,
          precioBase: eq?.precioRenta,
          categoria: eq?.categoria?.nombre,
        };
      });
      setPreciosEspeciales(enriquecidos);
      setLoadingPrecios(false);
    });
  }, [id]);

  async function guardarPrecioEspecial() {
    if (!selEqId || !nuevoPrecio) return;
    setGuardandoPrecio(true);
    const precioOriginal = equiposCatalogo.find(e => e.id === selEqId)?.precioRenta ?? null;
    await fetch(`/api/clientes/${id}/precios-equipos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoId: selEqId, precio: parseFloat(nuevoPrecio), precioOriginal, nota: nuevaNota || null }),
    });
    // Recargar
    const [preciosData] = await Promise.all([
      fetch(`/api/clientes/${id}/precios-equipos`).then((r) => r.json()),
    ]);
    const mapa: Record<string, { precio: number; precioOriginal: number | null; nota: string | null; updatedAt: string }> =
      preciosData.precios ?? {};
    const enriquecidos: PrecioEspecial[] = Object.entries(mapa).map(([eqId, v]) => {
      const eq = equiposCatalogo.find((e) => e.id === eqId);
      return {
        equipoId: eqId,
        precio: v.precio,
        precioOriginal: v.precioOriginal ?? null,
        nota: v.nota,
        updatedAt: v.updatedAt,
        descripcion: eq?.descripcion ?? eqId,
        marca: eq?.marca ?? null,
        modelo: eq?.modelo ?? null,
        precioBase: eq?.precioRenta,
        categoria: eq?.categoria?.nombre,
      };
    });
    setPreciosEspeciales(enriquecidos);
    setSelEqId("");
    setNuevoPrecio("");
    setNuevaNota("");
    setGuardandoPrecio(false);
  }

  async function eliminarPrecioEspecial(equipoId: string) {
    await fetch(`/api/clientes/${id}/precios-equipos?equipoId=${equipoId}`, { method: "DELETE" });
    setPreciosEspeciales((prev) => prev.filter((p) => p.equipoId !== equipoId));
  }

  async function guardarEdicionInline(equipoId: string) {
    const precio = parseFloat(editValor);
    if (isNaN(precio)) return;
    await fetch(`/api/clientes/${id}/precios-equipos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoId, precio }),
    });
    setPreciosEspeciales((prev) =>
      prev.map((p) => (p.equipoId === equipoId ? { ...p, precio } : p))
    );
    setEditandoPrecio(null);
  }

  // Auto-save when form changes while editing
  useEffect(() => {
    if (!editando || !formLoaded.current) return;
    if (formTimer.current) clearTimeout(formTimer.current);
    setSaving(true);
    formTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/clientes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      setCliente(prev => prev ? { ...prev, ...d.cliente } : prev);
      setAutoSaved(true); setSaving(false);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    if (formTimer.current) clearTimeout(formTimer.current);
    setSaving(true);
    const res = await fetch(`/api/clientes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    setCliente((prev) => prev ? { ...prev, ...d.cliente } : prev);
    formLoaded.current = false;
    setEditando(false);
    setSaving(false);
  }

  async function eliminarCliente() {
    const ok = await confirm({ message: `¿Eliminar a "${cliente?.nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" });
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

  const clasificacionColor: Record<string, string> = {
    PROSPECTO: "bg-purple-900/50 text-purple-300",
    NUEVO: "bg-gray-700 text-gray-300",
    REGULAR: "bg-yellow-900/50 text-yellow-300",
    PRIORITY: "bg-[#B3985B]/20 text-[#B3985B]",
    BASIC: "bg-blue-900/50 text-blue-300", // legacy
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate">{cliente.nombre}</h1>
          {cliente.empresa && <p className="text-gray-400 text-sm mt-0.5">{cliente.empresa}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs bg-[#222] text-gray-300">{cliente.tipoCliente}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${clasificacionColor[cliente.clasificacion] || "bg-gray-700 text-gray-300"}`}>
              {cliente.clasificacion}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/crm/tratos/nuevo`}
            className="px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors"
          >
            + Nuevo trato
          </Link>
          <button
            onClick={() => { formLoaded.current = false; setTimeout(() => { formLoaded.current = true; }, 100); setEditando(true); }}
            className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            Editar
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

      {/* Modal: Editar cliente */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditando(false)} />
          <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-semibold">Editar cliente</h3>
              <button onClick={() => setEditando(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                  <input value={form.nombre || ""} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Empresa</label>
                  <input value={form.empresa || ""} onChange={(e) => setForm((p) => ({ ...p, empresa: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                  <input value={form.telefono || ""} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Correo</label>
                  <input type="email" value={form.correo || ""} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo cliente</label>
                  <select value={form.tipoCliente || ""} onChange={(e) => setForm((p) => ({ ...p, tipoCliente: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="POR_DESCUBRIR">Por Descubrir</option>
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Clasificación</label>
                  <select value={form.clasificacion || ""} onChange={(e) => setForm((p) => ({ ...p, clasificacion: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="PROSPECTO">Prospecto</option>
                    <option value="NUEVO">Nuevo</option>
                    <option value="REGULAR">Regular</option>
                    <option value="PRIORITY">Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Servicio usual</label>
                  <select value={form.servicioUsual || ""} onChange={(e) => setForm((p) => ({ ...p, servicioUsual: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin especificar —</option>
                    <option value="RENTA">Renta de Equipo</option>
                    <option value="PRODUCCION_TECNICA">Producción Técnica</option>
                    <option value="DIRECCION_TECNICA">Dirección Técnica</option>
                    <option value="MULTISERVICIO">Multiservicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Responsable / Vendedor</label>
                  <select value={form.vendedorId || ""} onChange={(e) => setForm((p) => ({ ...p, vendedorId: e.target.value || null }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin asignar —</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <textarea value={form.notas || ""} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>
              <div className="flex justify-end items-center gap-3 pt-2">
                {saving && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
                {autoSaved && !saving && <span className="text-xs text-green-500">✓ Guardado</span>}
                <button onClick={() => setEditando(false)} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
                <button onClick={guardar} disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Información de contacto</h2>
        {(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Teléfono</p>
              {cliente.telefono ? (
                <div className="flex items-center gap-2">
                  <span className="text-white">{cliente.telefono}</span>
                  <CopyButton value={cliente.telefono} size="xs" />
                  <a href={`https://wa.me/${cliente.telefono.replace(/\D/g,"").replace(/^(?!52)/,"52")}?text=${encodeURIComponent(`Hola ${cliente.nombre.split(" ")[0]}! 👋`)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-green-500 hover:text-green-400 bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WA
                  </a>
                </div>
              ) : <span className="text-gray-400">—</span>}
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Correo</p>
              <p className="text-white">{cliente.correo || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Servicio usual</p>
              <p className="text-white">{cliente.servicioUsual?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Responsable</p>
              <p className="text-white">{cliente.vendedor?.name || "—"}</p>
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
        )}
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{cliente.tratos.length}</p>
          <p className="text-gray-400 text-xs mt-1">Tratos</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{cliente.cotizaciones.length}</p>
          <p className="text-gray-400 text-xs mt-1">Cotizaciones</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{cliente.proyectos.length}</p>
          <p className="text-gray-400 text-xs mt-1">Proyectos</p>
        </div>
      </div>

      {/* Tratos */}
      {cliente.tratos.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Tratos</h2>
          <div className="space-y-2">
            {cliente.tratos.map((t) => (
              <Link
                key={t.id}
                href={`/crm/tratos/${t.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 text-sm">{TIPO_EVENTO_LABELS[t.tipoEvento] || t.tipoEvento}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ETAPA_COLORS[t.etapa]}`}>
                    {t.etapa.replace("_", " ")}
                  </span>
                </div>
                <div className="text-right">
                  {t.presupuestoEstimado && (
                    <p className="text-white text-sm font-medium">{fmt(t.presupuestoEstimado)}</p>
                  )}
                  <p className="text-gray-500 text-xs">{fmtDate(t.fechaEventoEstimada || t.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cotizaciones */}
      {cliente.cotizaciones.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Cotizaciones</h2>
          <div className="space-y-2">
            {cliente.cotizaciones.map((c) => (
              <Link
                key={c.id}
                href={`/cotizaciones/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-mono">{c.numeroCotizacion}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO_COT_COLORS[c.estado] || "bg-gray-700 text-gray-300"}`}>
                    {c.estado}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{fmt(c.granTotal)}</p>
                  <p className="text-gray-500 text-xs">{fmtDate(c.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Proyectos */}
      {cliente.proyectos.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Proyectos</h2>
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
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO_PROY_COLORS[p.estado] || "bg-gray-700 text-gray-300"}`}>
                    {p.estado.replace("_", " ")}
                  </span>
                </div>
                <p className="text-gray-500 text-xs">{fmtDate(p.fechaEvento)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Precios especiales */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Precios especiales de equipos</h2>
          {preciosEspeciales.length > 0 && (
            <span className="text-xs text-gray-500">{preciosEspeciales.length} precio{preciosEspeciales.length !== 1 ? "s" : ""} guardado{preciosEspeciales.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loadingPrecios ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : (
          <>
            {/* Tabla de precios guardados */}
            {preciosEspeciales.length > 0 ? (
              <div className="overflow-x-auto mb-5">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-[#222]">
                      <th className="text-left pb-2 pr-4">Equipo</th>
                      <th className="text-left pb-2 pr-4">Categoría</th>
                      <th className="text-right pb-2 pr-4">Precio lista original</th>
                      <th className="text-right pb-2 pr-4">Precio especial</th>
                      <th className="text-left pb-2 pr-4">Nota</th>
                      <th className="text-right pb-2 pr-4">Actualizado</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preciosEspeciales
                      .sort((a, b) => (a.descripcion ?? "").localeCompare(b.descripcion ?? ""))
                      .map((pe) => (
                        <tr key={pe.equipoId} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] group">
                          <td className="py-2 pr-4">
                            <p className="text-white">{pe.descripcion}</p>
                            {(pe.marca || pe.modelo) && (
                              <p className="text-gray-500 text-xs">{[pe.marca, pe.modelo].filter(Boolean).join(" ")}</p>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-400 text-xs">{pe.categoria ?? "—"}</td>
                          <td className="py-2 pr-4 text-right">
                            {pe.precioOriginal != null ? (
                              <div>
                                <span className="text-gray-400">{fmt(pe.precioOriginal)}</span>
                                {pe.precioBase != null && pe.precioBase !== pe.precioOriginal && (
                                  <p className="text-[10px] text-yellow-600 mt-0.5">Lista actual: {fmt(pe.precioBase)}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {editandoPrecio === pe.equipoId ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={editValor}
                                  onChange={(e) => setEditValor(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") guardarEdicionInline(pe.equipoId);
                                    if (e.key === "Escape") setEditandoPrecio(null);
                                  }}
                                  autoFocus
                                  className="w-24 bg-[#0d0d0d] border border-[#B3985B] rounded px-2 py-0.5 text-white text-sm text-right focus:outline-none"
                                />
                                <button onClick={() => guardarEdicionInline(pe.equipoId)} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                                <button onClick={() => setEditandoPrecio(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditandoPrecio(pe.equipoId); setEditValor(String(pe.precio)); }}
                                className="text-[#B3985B] font-semibold hover:underline"
                              >
                                {fmt(pe.precio)}
                              </button>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-400 text-xs">{pe.nota ?? "—"}</td>
                          <td className="py-2 pr-4 text-right text-gray-500 text-xs">
                            {fmtDate(pe.updatedAt)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => eliminarPrecioEspecial(pe.equipoId)}
                              className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-5">No hay precios especiales registrados para este cliente.</p>
            )}

            {/* Formulario para agregar */}
            <div className="border-t border-[#222] pt-4">
              <p className="text-xs text-gray-400 mb-3 font-medium">Agregar precio especial</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selEqId}
                  onChange={(e) => setSelEqId(e.target.value)}
                  className="flex-1 min-w-[200px] bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Selecciona equipo —</option>
                  {equiposCatalogo
                    .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
                    .map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.descripcion}{eq.marca ? ` (${eq.marca})` : ""}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  placeholder="Precio especial"
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="w-36 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
                <input
                  type="text"
                  placeholder="Nota (opcional)"
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  className="w-44 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
                <button
                  onClick={guardarPrecioEspecial}
                  disabled={!selEqId || !nuevoPrecio || guardandoPrecio}
                  className="px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-40 transition-colors"
                >
                  {guardandoPrecio ? "Guardando..." : "Guardar"}
                </button>
              </div>
              {selEqId && (
                <p className="text-gray-500 text-xs mt-2">
                  Precio base en catálogo:{" "}
                  <span className="text-gray-300">
                    {fmt(equiposCatalogo.find((e) => e.id === selEqId)?.precioRenta ?? 0)}
                  </span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
