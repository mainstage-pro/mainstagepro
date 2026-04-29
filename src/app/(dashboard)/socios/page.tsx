"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

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
  EN_REVISION: "En revisión", ACTIVO: "Activo", SUSPENDIDO: "Suspendido", INACTIVO: "Inactivo",
};
const STATUS_COLORS: Record<string, string> = {
  EN_REVISION: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  ACTIVO: "text-green-400 bg-green-900/20 border-green-700/40",
  SUSPENDIDO: "text-orange-400 bg-orange-900/20 border-orange-700/40",
  INACTIVO: "text-gray-500 bg-gray-800/20 border-gray-700/40",
};

const EMPTY = { nombre: "", tipo: "FISICA", telefono: "", email: "", ciudad: "", pctSocio: "70", pctMainstage: "30" };

export default function SociosPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const r = await fetch("/api/socios", { cache: "no-store" });
    const d = await r.json();
    setSocios(d.socios || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const set = (k: string, v: string) => {
    setForm((p) => {
      const n: Record<string, string> = { ...p, [k]: v };
      if (k === "pctSocio") n.pctMainstage = String(100 - parseFloat(v || "0"));
      if (k === "pctMainstage") n.pctSocio = String(100 - parseFloat(v || "0"));
      return n as typeof EMPTY;
    });
  };

  const eliminarSocio = async (s: Socio) => {
    if (!await confirm({ message: `¿Eliminar el socio "${s.nombre}"? Esta acción eliminará también sus activos y registros asociados.`, danger: true, confirmText: "Eliminar" })) return;
    setDeletingId(s.id);
    const dr = await fetch(`/api/socios/${s.id}`, { method: "DELETE" });
    if (dr.ok) {
      setSocios(prev => prev.filter(x => x.id !== s.id));
    } else {
      toast.error("Error al eliminar socio");
    }
    setDeletingId(null);
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/socios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al crear socio");
      setSaving(false);
      return;
    }
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
    cargar();
  };

  const filtrados = socios.filter((s) => {
    if (filtro !== "TODOS" && s.status !== filtro) return false;
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase()) &&
        !(s.ciudad ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalActivos = socios.reduce((s, x) => s + x._count.activos, 0);

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Socios de Activos</h1>
          <p className="text-[#6b7280] text-sm">
            {socios.filter((s) => s.status === "ACTIVO").length} activos
            {socios.filter((s) => s.status === "EN_REVISION").length > 0 &&
              ` · ${socios.filter((s) => s.status === "EN_REVISION").length} en revisión`}
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo socio
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Socios activos", value: socios.filter((s) => s.status === "ACTIVO").length, sub: `${socios.length} registrados` },
          { label: "Equipos en inventario", value: totalActivos, sub: "activos operando" },
          { label: "En revisión", value: socios.filter((s) => s.status === "EN_REVISION").length, sub: "pendientes de activar" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-[11px] text-[#6b7280] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Formulario nuevo socio */}
      {showForm && (
        <form onSubmit={crear} className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-6 mb-6 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevo socio</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre completo *</label>
              <input value={form.nombre} required onChange={(e) => set("nombre", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Nombre del socio" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de persona</label>
              <Combobox
                value={form.tipo}
                onChange={v => set("tipo", v)}
                options={[{ value: "FISICA", label: "Persona Física" }, { value: "MORAL", label: "Persona Moral" }]}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="55 1234 5678" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ciudad</label>
              <input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                placeholder="Ciudad de México" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">% Socio</label>
                <input type="number" min="0" max="100" value={form.pctSocio} onChange={(e) => set("pctSocio", e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">% Mainstage</label>
                <input type="number" min="0" max="100" value={form.pctMainstage} onChange={(e) => set("pctMainstage", e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !form.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Crear socio"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); }}
              className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros y búsqueda */}
      {!showForm && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] w-52"
            placeholder="Buscar socio..." />
          {["TODOS", "EN_REVISION", "ACTIVO", "SUSPENDIDO", "INACTIVO"].map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                filtro === f ? "border-[#B3985B] text-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"
              }`}>
              {f === "TODOS" ? "Todos" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-600 text-sm">Cargando socios...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-sm">{search || filtro !== "TODOS" ? "Sin resultados." : "No hay socios registrados."}</p>
          {!search && filtro === "TODOS" && (
            <button onClick={() => setShowForm(true)} className="mt-2 text-[#B3985B] text-sm hover:underline">
              Registrar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Socio", "Status", "Equipos", "Split", "Requisitos", ""].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtrados.map((s) => {
                const completados = s.checklist.filter((c) => c.completado).length;
                const total = s.checklist.length;
                const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
                const vence = s.contratoFin
                  ? (new Date(s.contratoFin).getTime() - Date.now()) / 86400000 < 30
                  : false;
                return (
                  <tr key={s.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                          <span className="text-[#B3985B] text-[10px] font-bold">
                            {s.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{s.nombre}</p>
                          <p className="text-[#555] text-xs">
                            {s.tipo === "FISICA" ? "Persona Física" : "Persona Moral"}
                            {s.ciudad && ` · ${s.ciudad}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border w-fit ${STATUS_COLORS[s.status]}`}>
                          {STATUS_LABEL[s.status]}
                        </span>
                        {vence && (
                          <span className="text-[10px] text-red-400">Contrato por vencer</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-semibold">{s._count.activos}</td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{s.pctSocio}% / {s.pctMainstage}%</p>
                      <p className="text-[#555] text-[10px]">Socio / Mainstage</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#6b7280] text-xs mb-1">{completados}/{total}</p>
                      <div className="w-20 h-1 bg-[#1e1e1e] rounded-full">
                        <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-[#B3985B]"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/socios/${s.id}`} className="text-[#B3985B] text-xs hover:underline">
                          Ver detalle →
                        </Link>
                        <button onClick={() => eliminarSocio(s)} disabled={deletingId === s.id}
                          className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30" title="Eliminar socio">
                          {deletingId === s.id ? "…" : "✕"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
