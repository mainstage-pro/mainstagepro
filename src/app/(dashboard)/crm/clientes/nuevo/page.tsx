"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    tipoCliente: "POR_DESCUBRIR",
    clasificacion: "NUEVO",
    servicioUsual: "",
    telefono: "",
    correo: "",
    notas: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) { setError("El correo no tiene un formato válido"); return; }
    if (form.telefono && !/^[\d\s\-\+\(\)]{7,15}$/.test(form.telefono)) { setError("El teléfono no tiene un formato válido"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al crear cliente");
        setLoading(false);
        return;
      }

      const { cliente } = await res.json();
      router.push(`/crm/clientes/${cliente.id}`);
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nuevo Cliente</h1>
        <p className="text-gray-400 text-sm mt-1">Registra un nuevo cliente en el sistema</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Información personal</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre completo *</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="Nombre del contacto"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Empresa</label>
                <input
                  name="empresa"
                  value={form.empresa}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="442 000 0000"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
                <input
                  name="correo"
                  type="email"
                  value={form.correo}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Clasificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo de cliente</label>
              <select
                name="tipoCliente"
                value={form.tipoCliente}
                onChange={handleChange}
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
                name="clasificacion"
                value={form.clasificacion}
                onChange={handleChange}
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
                name="servicioUsual"
                value={form.servicioUsual}
                onChange={handleChange}
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
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Notas</h2>
          <textarea
            name="notas"
            value={form.notas}
            onChange={handleChange}
            rows={3}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
            placeholder="Información adicional sobre el cliente..."
          />
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
            {loading ? "Guardando..." : "Crear cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
