"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

type Socio = {
  id: string;
  nombre: string;
  tipo: string;
  status: string;
  pctSocio: number;
  pctMainstage: number;
  ciudad: string | null;
  email: string | null;
  telefono: string | null;
  contratoFin: string | null;
  createdAt: string;
  activos: { id: string; precioDia: number }[];
  checklist: { completado: boolean }[];
  _count: { activos: number; reportes: number };
};

const STATUS_LABEL: Record<string, string> = {
  EN_REVISION: "En revisión",
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  INACTIVO: "Inactivo",
};

const STATUS_COLOR: Record<string, string> = {
  EN_REVISION: "bg-yellow-100 text-yellow-800",
  ACTIVO: "bg-green-100 text-green-800",
  SUSPENDIDO: "bg-orange-100 text-orange-800",
  INACTIVO: "bg-gray-100 text-gray-500",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export default function SociosPage() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", tipo: "FISICA", telefono: "", email: "", ciudad: "",
    pctSocio: "70", pctMainstage: "30",
  });

  const cargar = async () => {
    setLoading(true);
    const r = await fetch("/api/socios");
    const d = await r.json();
    setSocios(d.socios || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const sociosFiltrados = filtro === "TODOS"
    ? socios
    : socios.filter((s) => s.status === filtro);

  // Stats
  const activos = socios.filter((s) => s.status === "ACTIVO");
  const totalActivos = socios.reduce((s, x) => s + x._count.activos, 0);
  const enRevision = socios.filter((s) => s.status === "EN_REVISION").length;

  const handleForm = (k: string, v: string) => {
    const next: Record<string, string> = { ...form, [k]: v };
    if (k === "pctSocio") next.pctMainstage = String(100 - parseFloat(v || "0"));
    if (k === "pctMainstage") next.pctSocio = String(100 - parseFloat(v || "0"));
    setForm(next as typeof form);
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/socios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ nombre: "", tipo: "FISICA", telefono: "", email: "", ciudad: "", pctSocio: "70", pctMainstage: "30" });
    setShowForm(false);
    setSaving(false);
    cargar();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Socios de Activos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Personas que aportan equipos a la operación de Mainstage Pro</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Nuevo Socio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Socios activos", value: activos.length, sub: `${socios.length} total` },
          { label: "Equipos registrados", value: totalActivos, sub: "activos en inventario" },
          { label: "En revisión", value: enRevision, sub: "pendientes de activar" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Formulario nuevo socio */}
      {showForm && (
        <form onSubmit={crear} className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <h3 className="font-semibold text-indigo-900 mb-3">Registrar nuevo socio</h3>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre completo *</label>
            <input value={form.nombre} onChange={(e) => handleForm("nombre", e.target.value)}
              required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej. Juan García López" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tipo de persona</label>
            <select value={form.tipo} onChange={(e) => handleForm("tipo", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="FISICA">Persona Física</option>
              <option value="MORAL">Persona Moral</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Teléfono</label>
            <input value={form.telefono} onChange={(e) => handleForm("telefono", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="55 1234 5678" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Email</label>
            <input value={form.email} onChange={(e) => handleForm("email", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" type="email" placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Ciudad</label>
            <input value={form.ciudad} onChange={(e) => handleForm("ciudad", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ciudad de México" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 block mb-1">% Socio</label>
              <input value={form.pctSocio} onChange={(e) => handleForm("pctSocio", e.target.value)}
                type="number" min="0" max="100" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 block mb-1">% Mainstage (fee)</label>
              <input value={form.pctMainstage} onChange={(e) => handleForm("pctMainstage", e.target.value)}
                type="number" min="0" max="100" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Guardando..." : "Crear Socio"}
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {["TODOS", "EN_REVISION", "ACTIVO", "SUSPENDIDO", "INACTIVO"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === f ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {f === "TODOS" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando socios...</div>
      ) : sociosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No hay socios registrados</p>
          <p className="text-sm">Crea el primer socio con el botón &quot;+ Nuevo Socio&quot;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sociosFiltrados.map((s) => {
            const completados = s.checklist.filter((c) => c.completado).length;
            const total = s.checklist.length;
            const pctChecklist = total > 0 ? Math.round((completados / total) * 100) : 0;
            const venceProximo = s.contratoFin
              ? (new Date(s.contratoFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 30
              : false;

            return (
              <Link key={s.id} href={`/socios/${s.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                      {s.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{s.nombre}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status]}`}>
                          {STATUS_LABEL[s.status]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {s.tipo === "FISICA" ? "Persona Física" : "Persona Moral"}
                        </span>
                        {venceProximo && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Contrato por vencer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {s.ciudad && <span>{s.ciudad}</span>}
                        {s.email && <span>{s.email}</span>}
                        {s.telefono && <span>{s.telefono}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Equipos</p>
                      <p className="text-lg font-bold text-gray-900">{s._count.activos}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Split</p>
                      <p className="text-sm font-semibold text-gray-900">{s.pctSocio}% / {s.pctMainstage}%</p>
                      <p className="text-xs text-gray-400">Socio / Mainstage</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Requisitos</p>
                      <p className="text-sm font-semibold text-gray-900">{completados}/{total}</p>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                        <div className={`h-full rounded-full ${pctChecklist === 100 ? "bg-green-500" : "bg-yellow-500"}`}
                          style={{ width: `${pctChecklist}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
