"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  REGULAR: "Usuario",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-[#B3985B] bg-[#B3985B]/10",
  VENDEDOR: "text-blue-400 bg-blue-400/10",
  REGULAR: "text-[#6b7280] bg-[#1a1a1a]",
};

const EMPTY = { name: "", email: "", password: "", role: "REGULAR" };

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setShowForm(true);
  }

  function startEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setError("");
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditing(null);
    setError("");
  }

  async function save() {
    if (!form.name || !form.email) { setError("Nombre y correo son obligatorios"); return; }
    if (!editing && !form.password) { setError("La contraseña es obligatoria para nuevos usuarios"); return; }

    setSaving(true);
    setError("");

    const body: Record<string, string> = { name: form.name, email: form.email, role: form.role };
    if (form.password) body.password = form.password;

    const url = editing ? `/api/admin/usuarios/${editing.id}` : "/api/admin/usuarios";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
    } else {
      await load();
      cancel();
    }
    setSaving(false);
  }

  async function toggleActive(u: User) {
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    await load();
  }

  async function resetPassword(u: User) {
    const newPass = prompt(`Nueva contraseña para ${u.name}:`);
    if (!newPass || newPass.length < 6) { alert("Mínimo 6 caracteres"); return; }
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    alert("Contraseña actualizada");
  }

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Usuarios y Accesos</h1>
          <p className="text-[#6b7280] text-sm">{users.length} usuarios registrados</p>
        </div>
        {!showForm && (
          <button
            onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-6">
          <h2 className="text-white font-medium mb-4">
            {editing ? `Editando: ${editing.name}` : "Nuevo usuario"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Nombre completo *</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Ej. Ana García"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Correo electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="ana@mainstagepro.mx"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">
                Contraseña {editing ? "(dejar vacío para no cambiar)" : "*"}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
              >
                <option value="ADMIN">Administrador — acceso total</option>
                <option value="VENDEDOR">Vendedor — CRM y cotizaciones</option>
                <option value="REGULAR">Usuario — solo lectura</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={cancel}
              className="text-sm text-[#6b7280] hover:text-white px-4 py-2 rounded-md border border-[#333] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div
            key={u.id}
            className={`bg-[#111] border rounded-lg px-4 py-3 flex items-center justify-between ${
              u.active ? "border-[#222]" : "border-[#1a1a1a] opacity-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                <span className="text-[#B3985B] text-xs font-semibold">
                  {u.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.REGULAR}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  {!u.active && <span className="text-xs text-[#555]">Inactivo</span>}
                </div>
                <p className="text-[#555] text-xs">{u.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => startEdit(u)}
                className="text-xs text-[#B3985B] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => resetPassword(u)}
                className="text-xs text-[#6b7280] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors"
              >
                Contraseña
              </button>
              <button
                onClick={() => toggleActive(u)}
                className="text-xs text-[#6b7280] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors"
              >
                {u.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
