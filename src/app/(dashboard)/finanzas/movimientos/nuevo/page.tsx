"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { buttonClass } from "@/lib/tipo-colores";

interface Cuenta { id: string; nombre: string; banco: string | null; }
interface Categoria { id: string; nombre: string; tipo: string; }
interface Proveedor { id: string; nombre: string; empresa: string | null; }
interface Cliente { id: string; nombre: string; empresa: string | null; }
interface Proyecto { id: string; nombre: string; numeroProyecto: string; estado: string; }
interface TipoMov { clave: string; nombre: string; naturaleza: string; color: string; }

const METODO_PAGO_OPTIONS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TARJETA", label: "Tarjeta" },
];

const selectCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";
const inputCls = selectCls;
const labelCls = "block text-xs text-gray-400 mb-1";

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoMov[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    fecha: today,
    tipo: "",
    cuentaId: "",
    cuentaDestinoId: "",
    concepto: "",
    monto: "",
    metodoPago: "TRANSFERENCIA",
    categoriaId: "",
    proveedorId: "",
    clienteId: "",
    proyectoId: "",
    referencia: "",
    notas: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/tipos-movimiento?activos=true").then(r => r.json()),
      fetch("/api/cuentas").then(r => r.json()),
      fetch("/api/categorias-financieras").then(r => r.json()),
      fetch("/api/proveedores").then(r => r.json()),
      fetch("/api/clientes").then(r => r.json()),
      fetch("/api/proyectos").then(r => r.json()),
    ]).then(([t, c, cat, p, cl, pr]) => {
      const ts: TipoMov[] = t.tipos ?? [];
      setTipos(ts);
      setForm(f => ({ ...f, tipo: f.tipo || ts[0]?.clave || "" }));
      setCuentas(c.cuentas ?? []);
      setCategorias(cat.categorias ?? []);
      setProveedores(p.proveedores ?? []);
      setClientes(cl.clientes ?? []);
      setProyectos((pr.proyectos ?? []).filter((p: Proyecto) => !["CANCELADO"].includes(p.estado)));
    });
  }, []);

  const tipoActual = tipos.find(t => t.clave === form.tipo);
  const naturaleza = tipoActual?.naturaleza ?? "ENTRADA";
  const esNeutro = naturaleza === "NEUTRO";
  const esEntrada = naturaleza === "ENTRADA";

  const categoriasFiltradas = categorias.filter(c => c.tipo === form.tipo);

  function seleccionarTipo(clave: string) {
    setForm(prev => ({ ...prev, tipo: clave, categoriaId: "", clienteId: "", proveedorId: "", proyectoId: "", cuentaDestinoId: "" }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.tipo) { setError("Selecciona un tipo de movimiento"); setLoading(false); return; }
    if (!form.cuentaId) { setError("Selecciona una cuenta"); setLoading(false); return; }
    if (!form.concepto.trim()) { setError("El concepto es requerido"); setLoading(false); return; }
    if (!form.monto || parseFloat(form.monto) <= 0) { setError("Ingresa un monto válido"); setLoading(false); return; }
    if (esNeutro && !form.cuentaDestinoId) { setError("Selecciona la cuenta destino"); setLoading(false); return; }
    if (esNeutro && form.cuentaId === form.cuentaDestinoId) { setError("La cuenta origen y destino no pueden ser la misma"); setLoading(false); return; }

    try {
      const res = await fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al registrar movimiento");
        setLoading(false);
        return;
      }
      router.push("/finanzas/movimientos");
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  const montoColor = esEntrada ? "text-green-400" : esNeutro ? "text-blue-400" : "text-red-400";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="ms-h1">Registrar Movimiento</h1>
        <p className="ms-subtitle mt-1">Ingreso, gasto, transferencia u otro tipo de movimiento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="ms-card p-5">
          <h2 className="ms-section-label mb-4">Tipo de movimiento</h2>
          <div className="flex flex-wrap gap-2">
            {tipos.map(o => (
              <button key={o.clave} type="button"
                onClick={() => seleccionarTipo(o.clave)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  form.tipo === o.clave ? buttonClass(o.color) : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white"
                }`}>
                {o.nombre}
              </button>
            ))}
          </div>
          {esNeutro && (
            <p className="text-xs text-blue-400/70 mt-3">Registra un movimiento interno entre tus cuentas. No afecta ingresos ni gastos.</p>
          )}
        </div>

        {/* Datos principales */}
        <div className="ms-card p-5">
          <h2 className="ms-section-label mb-4">Datos del movimiento</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fecha</label>
                <input name="fecha" type="date" value={form.fecha} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  Monto <span className={montoColor}>({tipoActual?.nombre.toLowerCase() ?? ""})</span>
                </label>
                <input name="monto" type="number" value={form.monto} onChange={handleChange}
                  className={inputCls} placeholder="0.00" min="0" step="0.01" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Concepto *</label>
              <input name="concepto" value={form.concepto} onChange={handleChange}
                className={inputCls} placeholder="Descripción del movimiento" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{esNeutro ? "Cuenta origen" : "Cuenta"}</label>
                <Combobox value={form.cuentaId} onChange={v => setForm(p => ({ ...p, cuentaId: v }))}
                  options={[{ value: "", label: "— Selecciona —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]} />
              </div>
              {esNeutro && (
                <div>
                  <label className={labelCls}>Cuenta destino</label>
                  <Combobox value={form.cuentaDestinoId} onChange={v => setForm(p => ({ ...p, cuentaDestinoId: v }))}
                    options={[{ value: "", label: "— Selecciona —" }, ...cuentas.filter(c => c.id !== form.cuentaId).map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]} />
                </div>
              )}
            </div>

            {!esNeutro && (
              <div>
                <label className={labelCls}>Categoría</label>
                <Combobox value={form.categoriaId} onChange={v => setForm(p => ({ ...p, categoriaId: v }))}
                  options={[{ value: "", label: "— Sin categoría —" }, ...categoriasFiltradas.map(c => ({ value: c.id, label: c.nombre }))]} />
              </div>
            )}
          </div>
        </div>

        {/* Información adicional — condicional por naturaleza */}
        {!esNeutro && (
          <div className="ms-card p-5">
            <h2 className="ms-section-label mb-4">Información adicional</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {esEntrada ? (
                  <div>
                    <label className={labelCls}>Cliente (opcional)</label>
                    <Combobox value={form.clienteId} onChange={v => setForm(p => ({ ...p, clienteId: v }))}
                      options={[{ value: "", label: "— Sin cliente —" }, ...clientes.map(c => ({ value: c.id, label: c.nombre + (c.empresa ? ` · ${c.empresa}` : "") }))]} />
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Proveedor (opcional)</label>
                    <Combobox value={form.proveedorId} onChange={v => setForm(p => ({ ...p, proveedorId: v }))}
                      options={[{ value: "", label: "— Sin proveedor —" }, ...proveedores.map(p => ({ value: p.id, label: p.nombre + (p.empresa ? ` · ${p.empresa}` : "") }))]} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Referencia / Folio</label>
                  <input name="referencia" value={form.referencia} onChange={handleChange}
                    className={inputCls} placeholder="Núm. transferencia, folio..." />
                </div>
              </div>

              <div>
                <label className={labelCls}>Proyecto (opcional)</label>
                <Combobox value={form.proyectoId} onChange={v => setForm(p => ({ ...p, proyectoId: v }))}
                  options={[{ value: "", label: "— Sin proyecto —" }, ...proyectos.map(p => ({ value: p.id, label: `${p.numeroProyecto} · ${p.nombre}` }))]} />
              </div>

              <div>
                <label className={labelCls}>Método de pago</label>
                <Combobox value={form.metodoPago} onChange={v => setForm(p => ({ ...p, metodoPago: v }))}
                  options={METODO_PAGO_OPTIONS} />
              </div>

              <div>
                <label className={labelCls}>Notas</label>
                <textarea name="notas" value={form.notas} onChange={handleChange} rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                  placeholder="Observaciones adicionales..." />
              </div>
            </div>
          </div>
        )}

        {/* NEUTRO — solo notas y referencia */}
        {esNeutro && (
          <div className="ms-card p-5">
            <h2 className="ms-section-label mb-4">Información adicional</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Referencia / Folio</label>
                <input name="referencia" value={form.referencia} onChange={handleChange}
                  className={inputCls} placeholder="Núm. transferencia, folio..." />
              </div>
              <div>
                <label className={labelCls}>Notas</label>
                <textarea name="notas" value={form.notas} onChange={handleChange} rows={2}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                  placeholder="Observaciones..." />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-50">
            {loading ? "Guardando..." : "Registrar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
