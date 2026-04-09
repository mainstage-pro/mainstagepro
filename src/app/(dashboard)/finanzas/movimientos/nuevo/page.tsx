"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Cuenta {
  id: string;
  nombre: string;
  banco: string | null;
}

interface Categoria {
  id: string;
  nombre: string;
  tipo: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  empresa: string | null;
}

const TIPO_OPTIONS = [
  { value: "INGRESO", label: "Ingreso" },
  { value: "GASTO", label: "Gasto" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

const METODO_PAGO_OPTIONS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TARJETA", label: "Tarjeta" },
];

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    fecha: today,
    tipo: "INGRESO",
    cuentaId: "",
    concepto: "",
    monto: "",
    metodoPago: "TRANSFERENCIA",
    categoriaId: "",
    proveedorId: "",
    referencia: "",
    notas: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/cuentas").then((r) => r.json()),
      fetch("/api/categorias-financieras").then((r) => r.json()),
      fetch("/api/proveedores").then((r) => r.json()),
    ]).then(([c, cat, p]) => {
      setCuentas(c.cuentas || []);
      setCategorias(cat.categorias || []);
      setProveedores(p.proveedores || []);
    });
  }, []);

  const categoriasFiltradas = categorias.filter((c) => {
    if (form.tipo === "INGRESO") return c.tipo === "INGRESO";
    if (form.tipo === "GASTO") return c.tipo === "GASTO";
    return true;
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // reset categoría si cambia el tipo
      ...(name === "tipo" ? { categoriaId: "" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.cuentaId) {
      setError("Selecciona una cuenta");
      setLoading(false);
      return;
    }
    if (!form.concepto) {
      setError("El concepto es requerido");
      setLoading(false);
      return;
    }
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setError("Ingresa un monto válido");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al registrar movimiento");
        setLoading(false);
        return;
      }

      router.push("/finanzas/movimientos");
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  const tipoColor = {
    INGRESO: "text-green-400",
    GASTO: "text-red-400",
    TRANSFERENCIA: "text-blue-400",
  }[form.tipo];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Registrar Movimiento</h1>
        <p className="text-gray-400 text-sm mt-1">Ingreso, gasto o transferencia entre cuentas</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Tipo de movimiento</h2>
          <div className="flex gap-3">
            {TIPO_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, tipo: o.value, categoriaId: "" }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  form.tipo === o.value
                    ? o.value === "INGRESO"
                      ? "bg-green-900/40 border-green-600 text-green-400"
                      : o.value === "GASTO"
                      ? "bg-red-900/40 border-red-600 text-red-400"
                      : "bg-blue-900/40 border-blue-600 text-blue-400"
                    : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Datos principales */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Datos del movimiento</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fecha</label>
                <input
                  name="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Monto <span className={tipoColor}>({form.tipo.toLowerCase()})</span>
                </label>
                <input
                  name="monto"
                  type="number"
                  value={form.monto}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Concepto *</label>
              <input
                name="concepto"
                value={form.concepto}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Descripción del movimiento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {form.tipo === "TRANSFERENCIA" ? "Cuenta origen" : "Cuenta"}
                </label>
                <select
                  name="cuentaId"
                  value={form.cuentaId}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Selecciona —</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.banco ? ` · ${c.banco}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Método de pago</label>
                <select
                  name="metodoPago"
                  value={form.metodoPago}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  {METODO_PAGO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Categoría</label>
              <select
                name="categoriaId"
                value={form.categoriaId}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              >
                <option value="">— Sin categoría —</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Opcional */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Información adicional</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Proveedor (opcional)</label>
                <select
                  name="proveedorId"
                  value={form.proveedorId}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Sin proveedor —</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.empresa ? ` · ${p.empresa}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Referencia / Folio</label>
                <input
                  name="referencia"
                  value={form.referencia}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="Núm. de transferencia, folio..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Registrar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
