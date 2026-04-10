"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface PrecioEspecial {
  equipoId: string;
  precio: number;
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
  const [form, setForm] = useState<Partial<Cliente>>({});

  // Precios especiales
  const [preciosEspeciales, setPreciosEspeciales] = useState<PrecioEspecial[]>([]);
  const [equiposCatalogo, setEquiposCatalogo] = useState<EquipoCatalogo[]>([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [selEqId, setSelEqId] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [editandoPrecio, setEditandoPrecio] = useState<string | null>(null); // equipoId en edición inline
  const [editValor, setEditValor] = useState("");

  useEffect(() => {
    fetch(`/api/clientes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCliente(d.cliente);
        setForm(d.cliente);
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

      const mapa: Record<string, { precio: number; nota: string | null; updatedAt: string }> =
        preciosData.precios ?? {};
      const enriquecidos: PrecioEspecial[] = Object.entries(mapa).map(([eqId, v]) => {
        const eq = catalogo.find((e) => e.id === eqId);
        return {
          equipoId: eqId,
          precio: v.precio,
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
    await fetch(`/api/clientes/${id}/precios-equipos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoId: selEqId, precio: parseFloat(nuevoPrecio), nota: nuevaNota || null }),
    });
    // Recargar
    const [preciosData] = await Promise.all([
      fetch(`/api/clientes/${id}/precios-equipos`).then((r) => r.json()),
    ]);
    const mapa: Record<string, { precio: number; nota: string | null; updatedAt: string }> =
      preciosData.precios ?? {};
    const enriquecidos: PrecioEspecial[] = Object.entries(mapa).map(([eqId, v]) => {
      const eq = equiposCatalogo.find((e) => e.id === eqId);
      return {
        equipoId: eqId,
        precio: v.precio,
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

  async function guardar() {
    setSaving(true);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setCliente((prev) => prev ? { ...prev, ...d.cliente } : prev);
    setEditando(false);
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>;
  if (!cliente) return <div className="text-red-400 text-sm">Cliente no encontrado</div>;

  const clasificacionColor: Record<string, string> = {
    NUEVO: "bg-gray-700 text-gray-300",
    BASIC: "bg-blue-900/50 text-blue-300",
    REGULAR: "bg-yellow-900/50 text-yellow-300",
    PRIORITY: "bg-[#B3985B]/20 text-[#B3985B]",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{cliente.nombre}</h1>
          {cliente.empresa && <p className="text-gray-400 text-sm mt-0.5">{cliente.empresa}</p>}
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-xs bg-[#222] text-gray-300">{cliente.tipoCliente}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${clasificacionColor[cliente.clasificacion] || "bg-gray-700 text-gray-300"}`}>
              {cliente.clasificacion}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/tratos/nuevo`}
            className="px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors"
          >
            + Nuevo trato
          </Link>
          <button
            onClick={() => setEditando(!editando)}
            className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            {editando ? "Cancelar" : "Editar"}
          </button>
        </div>
      </div>

      {/* Info + Edit */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Información de contacto</h2>
        {editando ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
                <input
                  value={form.empresa || ""}
                  onChange={(e) => setForm((p) => ({ ...p, empresa: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
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
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo cliente</label>
                <select
                  value={form.tipoCliente || ""}
                  onChange={(e) => setForm((p) => ({ ...p, tipoCliente: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="POR_DESCUBRIR">Por Descubrir</option>
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Clasificación</label>
                <select
                  value={form.clasificacion || ""}
                  onChange={(e) => setForm((p) => ({ ...p, clasificacion: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="NUEVO">Nuevo</option>
                  <option value="BASIC">Basic</option>
                  <option value="REGULAR">Regular</option>
                  <option value="PRIORITY">Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Servicio usual</label>
                <select
                  value={form.servicioUsual || ""}
                  onChange={(e) => setForm((p) => ({ ...p, servicioUsual: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Sin especificar —</option>
                  <option value="RENTA">Renta de Equipo</option>
                  <option value="PRODUCCION_TECNICA">Producción Técnica</option>
                  <option value="DIRECCION_TECNICA">Dirección Técnica</option>
                  <option value="MULTISERVICIO">Multiservicio</option>
                </select>
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
            <div className="flex justify-end">
              <button
                onClick={guardar}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Teléfono</p>
              <p className="text-white">{cliente.telefono || "—"}</p>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-[#222]">
                      <th className="text-left pb-2 pr-4">Equipo</th>
                      <th className="text-left pb-2 pr-4">Categoría</th>
                      <th className="text-right pb-2 pr-4">Precio base</th>
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
                          <td className="py-2 pr-4 text-right text-gray-400">
                            {pe.precioBase != null ? fmt(pe.precioBase) : "—"}
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
