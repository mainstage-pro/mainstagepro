"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonTable } from "@/components/Skeleton";

interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string | null;
  numeroCuenta: string | null;
  clabe: string | null;
  titular: string | null;
  rfc: string | null;
  activa: boolean;
}

const EMPTY: Omit<CuentaBancaria, "id" | "activa"> = {
  nombre: "", banco: "", numeroCuenta: "", clabe: "", titular: "", rfc: "",
};

export default function CuentasPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const r = await fetch("/api/cuentas");
    const d = await r.json();
    setCuentas(d.cuentas);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: CuentaBancaria) {
    setForm({ nombre: c.nombre, banco: c.banco ?? "", numeroCuenta: c.numeroCuenta ?? "", clabe: c.clabe ?? "", titular: c.titular ?? "", rfc: c.rfc ?? "" });
    setEditId(c.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ ...EMPTY });
    setEditId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    if (editId) {
      await fetch(`/api/cuentas/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
    cancelForm();
    setSaving(false);
  }

  async function toggleActiva(c: CuentaBancaria) {
    await fetch(`/api/cuentas/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activa: !c.activa }) });
    await load();
  }

  async function deleteCuenta(id: string) {
    if (!await confirm({ message: "¿Eliminar esta cuenta bancaria?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/cuentas/${id}`, { method: "DELETE" });
    toast.success("Cuenta eliminada");
    await load();
  }

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Cuentas Bancarias</h1>
          <p className="text-[#6b7280] text-sm">{cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} registrada{cuentas.length !== 1 ? "s" : ""}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nueva cuenta
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-4">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
            {editId ? "Editar cuenta" : "Nueva cuenta bancaria"}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre / Alias *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: BBVA Principal"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Banco</label>
              <input value={form.banco ?? ""} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))}
                placeholder="Ej: BBVA Bancomer"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Número de cuenta</label>
              <input value={form.numeroCuenta ?? ""} onChange={e => setForm(p => ({ ...p, numeroCuenta: e.target.value }))}
                placeholder="0000 0000 0000 0000"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CLABE interbancaria</label>
              <input value={form.clabe ?? ""} onChange={e => setForm(p => ({ ...p, clabe: e.target.value }))}
                placeholder="18 dígitos"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titular</label>
              <input value={form.titular ?? ""} onChange={e => setForm(p => ({ ...p, titular: e.target.value }))}
                placeholder="Nombre del titular"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">RFC</label>
              <input value={form.rfc ?? ""} onChange={e => setForm(p => ({ ...p, rfc: e.target.value }))}
                placeholder="RFC del titular"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={saving || !form.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Crear cuenta"}
            </button>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white text-sm transition-colors px-3">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {loading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : cuentas.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-sm">Sin cuentas bancarias registradas</div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Nombre / Banco", "Número de cuenta", "CLABE", "Titular", "Estado", ""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {cuentas.map(c => (
                <tr key={c.id} className={`hover:bg-[#1a1a1a] transition-colors ${!c.activa ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{c.nombre}</p>
                    {c.banco && <p className="text-gray-500 text-xs">{c.banco}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] font-mono">{c.numeroCuenta ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-[#9ca3af] font-mono">{c.clabe ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[#9ca3af]">{c.titular ?? "—"}</p>
                    {c.rfc && <p className="text-xs text-gray-600">{c.rfc}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActiva(c)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${c.activa ? "bg-green-900/50 text-green-300 hover:bg-green-900/70" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}>
                      {c.activa ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => startEdit(c)} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                      <button onClick={() => deleteCuenta(c.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
