"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";

interface Proveedor { id: string; nombre: string; empresa: string | null; telefono: string | null }
interface Proyecto  { id: string; nombre: string; numeroProyecto: string }
interface Orden {
  id: string; numero: string; descripcion: string; estado: string;
  fechaRequerida: string | null; fechaEntrega: string | null;
  monto: number; montoIva: number; total: number; notas: string | null;
  lineas: string | null;
  proveedor: Proveedor; proyecto: Proyecto | null;
  createdAt: string;
}

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "RECIBIDA", "CANCELADA"];
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:  "bg-yellow-900/30 text-yellow-300 border-yellow-700/40",
  CONFIRMADA: "bg-blue-900/30 text-blue-300 border-blue-700/40",
  RECIBIDA:   "bg-green-900/30 text-green-300 border-green-700/40",
  CANCELADA:  "bg-red-900/20 text-red-400 border-red-800/40",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY_FORM = {
  proveedorId: "", proyectoId: "", descripcion: "",
  fechaRequerida: "", monto: "", montoIva: "", notas: "",
};

export default function OrdenesCompraPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [detalle, setDetalle] = useState<Orden | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);

  async function load() {
    const [rOrd, rProv, rProy] = await Promise.all([
      fetch("/api/ordenes-compra").then(r => r.json()),
      fetch("/api/proveedores").then(r => r.json()),
      fetch("/api/proyectos").then(r => r.json()),
    ]);
    setOrdenes(rOrd.ordenes ?? []);
    setProveedores(rProv.proveedores ?? []);
    setProyectos(rProy.proyectos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function crear() {
    if (!form.proveedorId || !form.descripcion) return;
    setSaving(true);
    const res = await fetch("/api/ordenes-compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        monto: parseFloat(form.monto || "0"),
        montoIva: parseFloat(form.montoIva || "0"),
      }),
    });
    const d = await res.json();
    if (d.orden) {
      setOrdenes(prev => [d.orden, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function cambiarEstado(orden: Orden, estado: string) {
    const res = await fetch(`/api/ordenes-compra/${orden.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, ...(estado === "RECIBIDA" ? { fechaEntrega: new Date().toISOString() } : {}) }),
    });
    const d = await res.json();
    if (d.orden) {
      setOrdenes(prev => prev.map(o => o.id === orden.id ? d.orden : o));
      if (detalle?.id === orden.id) setDetalle(d.orden);
    }
  }

  async function guardarNotas(id: string, notas: string) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/ordenes-compra/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas }),
      });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }

  const filtradas = filtroEstado === "TODOS"
    ? ordenes
    : ordenes.filter(o => o.estado === filtroEstado);

  const totales = {
    pendiente: ordenes.filter(o => o.estado === "PENDIENTE").reduce((s, o) => s + o.total, 0),
    confirmada: ordenes.filter(o => o.estado === "CONFIRMADA").reduce((s, o) => s + o.total, 0),
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Órdenes de compra</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {ordenes.filter(o => o.estado === "PENDIENTE").length} pendientes · {fmt(totales.pendiente + totales.confirmada)} comprometido
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nueva orden
          </button>
        )}
      </div>

      {/* Resumen por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ESTADOS.map(e => {
          const count = ordenes.filter(o => o.estado === e).length;
          const total = ordenes.filter(o => o.estado === e).reduce((s, o) => s + o.total, 0);
          return (
            <button key={e} onClick={() => setFiltroEstado(filtroEstado === e ? "TODOS" : e)}
              className={`bg-[#111] border rounded-xl p-4 text-left transition-all hover:border-[#333] ${filtroEstado === e ? "border-[#B3985B]/50" : "border-[#1e1e1e]"}`}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{e.toLowerCase()}</p>
              <p className="text-white text-xl font-bold">{count}</p>
              {total > 0 && <p className="text-gray-500 text-xs mt-0.5">{fmt(total)}</p>}
            </button>
          );
        })}
      </div>

      {/* Formulario nueva orden */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva orden de compra</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proveedor *</label>
              <Combobox
                value={form.proveedorId}
                onChange={v => setForm(p => ({ ...p, proveedorId: v }))}
                options={[{ value: "", label: "Seleccionar proveedor..." }, ...proveedores.map(p => ({ value: p.id, label: `${p.nombre}${p.empresa ? ` — ${p.empresa}` : ""}` }))]}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proyecto vinculado</label>
              <Combobox
                value={form.proyectoId}
                onChange={v => setForm(p => ({ ...p, proyectoId: v }))}
                options={[{ value: "", label: "Sin proyecto" }, ...proyectos.slice(0, 30).map(p => ({ value: p.id, label: `${p.numeroProyecto} — ${p.nombre}` }))]}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Descripción del servicio/producto *</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Ej: Renta de sistema de audio LS9 para evento..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha requerida</label>
              <input type="date" value={form.fechaRequerida} onChange={e => setForm(p => ({ ...p, fechaRequerida: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto</label>
                <input type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} placeholder="0"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">IVA</label>
                <input type="number" value={form.montoIva} onChange={e => setForm(p => ({ ...p, montoIva: e.target.value }))} placeholder="0"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas internas</label>
              <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={crear} disabled={saving || !form.proveedorId || !form.descripcion}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg">
              {saving ? "Creando..." : "Crear orden"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm">Cancelar</button>
            {form.monto && (
              <span className="text-gray-400 text-sm ml-auto">
                Total: <span className="text-white font-semibold">
                  {fmt(parseFloat(form.monto || "0") + parseFloat(form.montoIva || "0"))}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filtro estado */}
      <div className="flex items-center gap-2 flex-wrap">
        {["TODOS", ...ESTADOS].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filtroEstado === e ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-transparent border-[#222] text-gray-500 hover:text-gray-300"}`}>
            {e === "TODOS" ? "Todas" : e.charAt(0) + e.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-12 text-center text-gray-600 text-sm">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center">
          <p className="text-gray-600 text-sm">Sin órdenes de compra</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(o => (
            <div key={o.id}
              onClick={() => setDetalle(detalle?.id === o.id ? null : o)}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4 hover:bg-[#141414] transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-gray-500 text-xs font-mono">{o.numero}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ESTADO_COLORS[o.estado]}`}>{o.estado}</span>
                    {o.proyecto && (
                      <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-2 py-0.5 rounded-full">
                        {o.proyecto.numeroProyecto}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium">{o.descripcion}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{o.proveedor.nombre}{o.proveedor.empresa ? ` · ${o.proveedor.empresa}` : ""}</p>
                  {o.fechaRequerida && (
                    <p className="text-gray-600 text-xs mt-1">Requerida: {fmtDate(o.fechaRequerida)}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-semibold">{fmt(o.total)}</p>
                  {o.montoIva > 0 && <p className="text-gray-600 text-xs">+IVA {fmt(o.montoIva)}</p>}
                </div>
              </div>

              {/* Panel expandido */}
              {detalle?.id === o.id && (
                <div className="mt-4 pt-4 border-t border-[#1e1e1e] space-y-3" onClick={e => e.stopPropagation()}>
                  {/* Acciones de estado */}
                  <div className="flex gap-2 flex-wrap">
                    {ESTADOS.filter(e => e !== o.estado).map(e => (
                      <button key={e} onClick={() => cambiarEstado(o, e)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] transition-colors">
                        → {e.charAt(0) + e.slice(1).toLowerCase()}
                      </button>
                    ))}
                    {o.proveedor.telefono && (
                      <a
                        href={`https://wa.me/52${o.proveedor.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, te escribimos de Mainstage Pro respecto a la orden ${o.numero}: ${o.descripcion}. ¿Puedes confirmar disponibilidad?`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-800/40 text-green-300 hover:bg-green-900/50 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        WhatsApp proveedor
                      </a>
                    )}
                  </div>

                  {/* Notas auto-save */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Notas {autoSaved && <span className="text-green-400 ml-1">✓ guardado</span>}
                    </label>
                    <textarea
                      defaultValue={o.notas ?? ""}
                      onChange={e => guardarNotas(o.id, e.target.value)}
                      rows={2}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                    />
                  </div>

                  {/* Info fechas */}
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Creada: {fmtDate(o.createdAt)}</span>
                    {o.fechaRequerida && <span>Requerida: {fmtDate(o.fechaRequerida)}</span>}
                    {o.fechaEntrega && <span className="text-green-400">Recibida: {fmtDate(o.fechaEntrega)}</span>}
                  </div>

                  {/* Link proyecto */}
                  {o.proyecto && (
                    <Link href={`/proyectos/${o.proyecto.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[#B3985B] hover:underline"
                      onClick={e => e.stopPropagation()}>
                      → Ver proyecto {o.proyecto.numeroProyecto}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
