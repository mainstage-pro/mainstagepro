"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Vendedor {
  id: string;
  name: string;
  email: string;
  fechaInicioVendedor: string | null;
  createdAt: string;
}

function mesDeTrabajoLabel(fecha: string | null) {
  if (!fecha) return "—";
  const inicio = new Date(fecha);
  const now = new Date();
  const diff = (now.getFullYear() - inicio.getFullYear()) * 12 + (now.getMonth() - inicio.getMonth());
  const mes = Math.max(1, diff + 1);
  return `Mes ${mes} (desde ${inicio.toLocaleDateString("es-MX", { month: "short", year: "numeric" })})`;
}

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", fechaInicioVendedor: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vendedores")
      .then(r => r.json())
      .then(d => { setVendedores(d.vendedores ?? []); setLoading(false); });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/vendedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Error"); setSaving(false); return; }
    setVendedores(prev => [...prev, d.vendedor]);
    setForm({ name: "", email: "", password: "", fechaInicioVendedor: "" });
    setShowForm(false);
    setSaving(false);
  }

  const mesActual = new Date().toISOString().slice(0, 7);

  return (
    <div className="p-3 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/ventas" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Ventas</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Vendedores</h1>
          <p className="text-gray-400 text-sm mt-1">{vendedores.length} vendedor{vendedores.length !== 1 ? "es" : ""} registrado{vendedores.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors"
        >
          {showForm ? "Cancelar" : "+ Agregar vendedor"}
        </button>
      </div>

      {/* Formulario nuevo vendedor */}
      {showForm && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Nuevo vendedor</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                <input
                  name="name" value={form.name} onChange={handleChange} required
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email *</label>
                <input
                  name="email" type="email" value={form.email} onChange={handleChange} required
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="correo@empresa.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Contraseña *</label>
                <input
                  name="password" type="password" value={form.password} onChange={handleChange} required
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  placeholder="Contraseña inicial"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fecha de inicio</label>
                <p className="text-[10px] text-gray-600 mb-1">Para cálculo de ramp-up</p>
                <input
                  name="fechaInicioVendedor" type="date" value={form.fechaInicioVendedor} onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit" disabled={saving}
                className="px-5 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors disabled:opacity-50"
              >
                {saving ? "Creando..." : "Crear vendedor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-gray-500 text-sm text-center py-10">Cargando...</div>
      ) : vendedores.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No hay vendedores registrados</p>
          <p className="text-gray-600 text-xs mt-1">Agrega vendedores para gestionar su pipeline y comisiones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendedores.map(v => (
            <div key={v.id} className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-[#333] flex items-center justify-center shrink-0">
                    <span className="text-[#B3985B] text-sm font-semibold">{v.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{v.name}</p>
                    <p className="text-gray-500 text-xs">{v.email}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-2 ml-12">{mesDeTrabajoLabel(v.fechaInicioVendedor)}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/ventas?vendedorId=${v.id}`}
                  className="px-3 py-1.5 border border-[#333] text-gray-400 text-xs rounded-lg hover:text-white hover:border-[#555] transition-colors"
                >
                  Pipeline
                </Link>
                <Link
                  href={`/ventas/reporte?vendedorId=${v.id}&mes=${mesActual}`}
                  className="px-3 py-1.5 bg-[#1a1a1a] text-[#B3985B] text-xs rounded-lg hover:bg-[#222] transition-colors"
                >
                  Comisiones
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
