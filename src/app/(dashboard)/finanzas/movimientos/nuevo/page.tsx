"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";

interface Cuenta { id: string; nombre: string; banco: string | null; }
interface Categoria { id: string; nombre: string; tipo: string; }
interface Proveedor { id: string; nombre: string; empresa: string | null; }
interface Cliente { id: string; nombre: string; empresa: string | null; }
interface Proyecto { id: string; nombre: string; numeroProyecto: string; estado: string; }

const TIPO_OPTIONS = [
  { value: "INGRESO", label: "Ingreso", color: "green" },
  { value: "GASTO", label: "Gasto", color: "red" },
  { value: "ENTRE_CUENTAS", label: "Entre cuentas", color: "blue" },
];

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
    tipo: "INGRESO",
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
      fetch("/api/cuentas").then(r => r.json()),
      fetch("/api/categorias-financieras").then(r => r.json()),
      fetch("/api/proveedores").then(r => r.json()),
      fetch("/api/clientes").then(r => r.json()),
      fetch("/api/proyectos").then(r => r.json()),
    ]).then(([c, cat, p, cl, pr]) => {
      setCuentas(c.cuentas ?? []);
      setCategorias(cat.categorias ?? []);
      setProveedores(p.proveedores ?? []);
      setClientes(cl.clientes ?? []);
      setProyectos((pr.proyectos ?? []).filter((p: Proyecto) => !["CANCELADO"].includes(p.estado)));
    });
  }, []);

  const categoriasFiltradas = categorias.filter(c => {
    if (form.tipo === "INGRESO") return c.tipo === "INGRESO";
    if (form.tipo === "GASTO") return c.tipo === "GASTO";
    return true;
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === "tipo" ? { categoriaId: "", clienteId: "", proveedorId: "", proyectoId: "" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.cuentaId) { setError("Selecciona una cuenta"); setLoading(false); return; }
    if (!form.concepto.trim()) { setError("El concepto es requerido"); setLoading(false); return; }
    if (!form.monto || parseFloat(form.monto) <= 0) { setError("Ingresa un monto válido"); setLoading(false); return; }
    if (form.tipo === "ENTRE_CUENTAS" && !form.cuentaDestinoId) { setError("Selecciona la cuenta destino"); setLoading(false); return; }
    if (form.tipo === "ENTRE_CUENTAS" && form.cuentaId === form.cuentaDestinoId) { setError("La cuenta origen y destino no pueden ser la misma"); setLoading(false); return; }

    const payload = {
      ...form,
      tipo: form.tipo === "ENTRE_CUENTAS" ? "TRANSFERENCIA" : form.tipo,
    };

    try {
      const res = await fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const tipoColor = form.tipo === "INGRESO" ? "text-green-400" : form.tipo === "GASTO" ? "text-red-400" : "text-blue-400";

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Registrar Movimiento</h1>
        <p className="text-gray-400 text-sm mt-1">Ingreso, gasto o movimiento entre cuentas</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Tipo de movimiento</h2>
          <div className="flex gap-3">
            {TIPO_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => setForm(prev => ({ ...prev, tipo: o.value, categoriaId: "", clienteId: "", proveedorId: "", proyectoId: "" }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  form.tipo === o.value
                    ? o.color === "green" ? "bg-green-900/40 border-green-600 text-green-400"
                    : o.color === "red" ? "bg-red-900/40 border-red-600 text-red-400"
                    : "bg-blue-900/40 border-blue-600 text-blue-400"
                    : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white"
                }`}>
                {o.label}
              </button>
            ))}
          </div>
          {form.tipo === "ENTRE_CUENTAS" && (
            <p className="text-xs text-blue-400/70 mt-3">Registra un movimiento interno entre tus cuentas. No afecta ingresos ni gastos.</p>
          )}
        </div>

        {/* Datos principales */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Datos del movimiento</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fecha</label>
                <input name="fecha" type="date" value={form.fecha} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  Monto <span className={tipoColor}>({form.tipo === "ENTRE_CUENTAS" ? "transferencia" : form.tipo.toLowerCase()})</span>
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
                <label className={labelCls}>{form.tipo === "ENTRE_CUENTAS" ? "Cuenta origen" : "Cuenta"}</label>
                <Combobox value={form.cuentaId} onChange={v => setForm(p => ({ ...p, cuentaId: v }))}
                  options={[{ value: "", label: "— Selecciona —" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]} />
              </div>
              {form.tipo === "ENTRE_CUENTAS" && (
                <div>
                  <label className={labelCls}>Cuenta destino</label>
                  <Combobox value={form.cuentaDestinoId} onChange={v => setForm(p => ({ ...p, cuentaDestinoId: v }))}
                    options={[{ value: "", label: "— Selecciona —" }, ...cuentas.filter(c => c.id !== form.cuentaId).map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]} />
                </div>
              )}
            </div>

            {form.tipo !== "ENTRE_CUENTAS" && (
              <div>
                <label className={labelCls}>Categoría</label>
                <Combobox value={form.categoriaId} onChange={v => setForm(p => ({ ...p, categoriaId: v }))}
                  options={[{ value: "", label: "— Sin categoría —" }, ...categoriasFiltradas.map(c => ({ value: c.id, label: c.nombre }))]} />
              </div>
            )}
          </div>
        </div>

        {/* Información adicional — condicional por tipo */}
        {form.tipo !== "ENTRE_CUENTAS" && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Información adicional</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* INGRESO → cliente */}
                {form.tipo === "INGRESO" && (
                  <div>
                    <label className={labelCls}>Cliente (opcional)</label>
                    <Combobox value={form.clienteId} onChange={v => setForm(p => ({ ...p, clienteId: v }))}
                      options={[{ value: "", label: "— Sin cliente —" }, ...clientes.map(c => ({ value: c.id, label: c.nombre + (c.empresa ? ` · ${c.empresa}` : "") }))]} />
                  </div>
                )}
                {/* GASTO → proveedor */}
                {form.tipo === "GASTO" && (
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

              {/* Proyecto */}
              <div>
                <label className={labelCls}>Proyecto (opcional)</label>
                <Combobox value={form.proyectoId} onChange={v => setForm(p => ({ ...p, proyectoId: v }))}
                  options={[{ value: "", label: "— Sin proyecto —" }, ...proyectos.map(p => ({ value: p.id, label: `${p.numeroProyecto} · ${p.nombre}` }))]} />
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

        {/* ENTRE_CUENTAS — solo notas y referencia */}
        {form.tipo === "ENTRE_CUENTAS" && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Información adicional</h2>
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
