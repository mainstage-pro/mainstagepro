"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  area: string | null;
  active: boolean;
  createdAt: string;
  moduloAccesos: { moduloKey: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  USER: "Usuario regular",
  READONLY: "Solo lectura",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-[#B3985B] bg-[#B3985B]/10",
  USER: "text-blue-400 bg-blue-400/10",
  READONLY: "text-gray-400 bg-gray-800",
};

const AREA_LABELS: Record<string, string> = {
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  MARKETING: "Marketing",
  VENTAS: "Ventas",
  PRODUCCION: "Producción",
  GENERAL: "General",
};

const AREA_COLORS: Record<string, string> = {
  DIRECCION: "text-purple-400 bg-purple-900/20",
  ADMINISTRACION: "text-yellow-400 bg-yellow-900/20",
  MARKETING: "text-pink-400 bg-pink-900/20",
  VENTAS: "text-green-400 bg-green-900/20",
  PRODUCCION: "text-blue-400 bg-blue-900/20",
  GENERAL: "text-gray-500 bg-[#1a1a1a]",
};

// Módulos controlables — refleja el NAV de Sidebar.tsx (level de ítems raíz)
const MODULOS_POR_SECCION: { seccion: string; items: { key: string; label: string; desc: string }[] }[] = [
  {
    seccion: "DIRECCIÓN",
    items: [
      { key: "dashboard", label: "Dashboard", desc: "Panel principal y métricas" },
      { key: "presentaciones", label: "Presentaciones", desc: "Presentaciones de ventas" },
      { key: "calendario", label: "Calendario de eventos", desc: "Vista y reportes de eventos" },
    ],
  },
  {
    seccion: "VENTAS",
    items: [
      { key: "crm-clientes", label: "Clientes", desc: "Base de datos de clientes" },
      { key: "crm-tratos", label: "Tratos", desc: "Pipeline de oportunidades" },
      { key: "cotizaciones", label: "Cotizaciones", desc: "Crear y gestionar cotizaciones" },
      { key: "comisiones", label: "Comisiones / Ventas", desc: "Pipeline, metas, vendedores, reportes" },
    ],
  },
  {
    seccion: "PRODUCCIÓN",
    items: [
      { key: "proyectos", label: "Proyectos", desc: "Gestión de eventos y proyectos" },
      { key: "operaciones", label: "Gestión operativa", desc: "Carpetas y secciones operativas" },
      { key: "inventario", label: "Inventario", desc: "Equipos, disponibilidad, recolecciones, mantenimiento" },
      { key: "bd-proveedores", label: "Proveedores", desc: "Catálogo de proveedores de equipo" },
      { key: "bd-tecnicos", label: "Técnicos freelance", desc: "Catálogo de técnicos" },
      { key: "bd-roles", label: "Roles técnicos", desc: "Catálogo de roles" },
    ],
  },
  {
    seccion: "ADMINISTRACIÓN",
    items: [
      { key: "finanzas", label: "Finanzas", desc: "Cobros, pagos, movimientos, cuentas, reportes" },
      { key: "rrhh", label: "Recursos Humanos", desc: "Personal interno, nómina, asistencia, evaluaciones" },
      { key: "ats", label: "Reclutamiento", desc: "Candidatos y puestos" },
    ],
  },
  {
    seccion: "MARKETING",
    items: [
      { key: "contenido-organico", label: "Contenido orgánico", desc: "Calendario, tipos de contenido, reportes" },
      { key: "publicidad", label: "Publicidad / Campañas", desc: "Campañas de Meta Ads" },
    ],
  },
];

const ALL_MODULE_KEYS = MODULOS_POR_SECCION.flatMap(s => s.items.map(i => i.key));

const EMPTY = { name: "", email: "", password: "", role: "USER", area: "GENERAL" };

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedPermisos, setExpandedPermisos] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [accessControlEnabled, setAccessControlEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  async function load() {
    const [usersRes, configRes] = await Promise.all([
      fetch("/api/admin/usuarios"),
      fetch("/api/admin/config"),
    ]);
    const usersData = await usersRes.json();
    const configData = await configRes.json();
    setUsers(usersData.users ?? []);
    const privateModules: string[] = configData.config?.["nav.private"]
      ? JSON.parse(configData.config["nav.private"])
      : [];
    setAccessControlEnabled(privateModules.length > 0);
  }

  useEffect(() => { load(); }, []);

  async function toggleAccessControl() {
    setSavingConfig(true);
    const newEnabled = !accessControlEnabled;
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "nav.private", value: newEnabled ? JSON.stringify(ALL_MODULE_KEYS) : "[]" }),
    });
    setAccessControlEnabled(newEnabled);
    setSavingConfig(false);
  }

  async function toggleModulo(userId: string, key: string, hasAccess: boolean) {
    const lockKey = `${userId}-${key}`;
    setTogglingKey(lockKey);
    if (hasAccess) {
      await fetch(`/api/admin/modulos/${key}/accesos/${userId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/modulos/${key}/accesos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    }
    setUsers(prev =>
      prev.map(u => {
        if (u.id !== userId) return u;
        const accesos = hasAccess
          ? u.moduloAccesos.filter(a => a.moduloKey !== key)
          : [...u.moduloAccesos, { moduloKey: key }];
        return { ...u, moduloAccesos: accesos };
      })
    );
    setTogglingKey(null);
  }

  async function grantAll(userId: string) {
    for (const key of ALL_MODULE_KEYS) {
      const u = users.find(u => u.id === userId);
      if (!u?.moduloAccesos.some(a => a.moduloKey === key)) {
        await fetch(`/api/admin/modulos/${key}/accesos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      }
    }
    setUsers(prev =>
      prev.map(u => u.id !== userId ? u : { ...u, moduloAccesos: ALL_MODULE_KEYS.map(k => ({ moduloKey: k })) })
    );
  }

  async function revokeAll(userId: string) {
    for (const key of ALL_MODULE_KEYS) {
      await fetch(`/api/admin/modulos/${key}/accesos/${userId}`, { method: "DELETE" });
    }
    setUsers(prev => prev.map(u => u.id !== userId ? u : { ...u, moduloAccesos: [] }));
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setShowForm(true);
  }

  function startEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, area: u.area ?? "GENERAL" });
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
    const body: Record<string, string> = { name: form.name, email: form.email, role: form.role, area: form.area };
    if (form.password) body.password = form.password;
    const url = editing ? `/api/admin/usuarios/${editing.id}` : "/api/admin/usuarios";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al guardar"); }
    else { await load(); cancel(); }
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
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Usuarios y Accesos</h1>
          <p className="text-[#6b7280] text-sm">{users.length} usuarios registrados</p>
        </div>
        {!showForm && (
          <button onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
            + Nuevo usuario
          </button>
        )}
      </div>

      {/* Control de acceso por módulo */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-semibold">Control de acceso por módulo</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {accessControlEnabled
                ? "Activo — los usuarios solo ven los módulos que se les asignaron"
                : "Inactivo — todos los usuarios pueden ver todos los módulos"}
            </p>
          </div>
          <button onClick={toggleAccessControl} disabled={savingConfig}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              accessControlEnabled ? "bg-[#B3985B]" : "bg-[#2a2a2a]"
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              accessControlEnabled ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
        {accessControlEnabled && (
          <p className="text-[10px] text-yellow-600 mt-3 bg-yellow-900/10 border border-yellow-900/30 rounded-lg px-3 py-2">
            Los administradores siempre tienen acceso total. Los usuarios regulares solo ven lo que se les asigne.
          </p>
        )}
      </div>

      {/* Formulario nuevo/editar usuario */}
      {showForm && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">
            {editing ? `Editando: ${editing.name}` : "Nuevo usuario"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Nombre completo *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Ej. Ana García" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Correo electrónico *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="ana@mainstagepro.mx" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Contraseña {editing ? "(vacío = sin cambio)" : "*"}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Tipo de acceso</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                <option value="ADMIN">Administrador — acceso total</option>
                <option value="USER">Usuario regular — puede crear y editar</option>
                <option value="READONLY">Solo lectura — no puede modificar</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Área</label>
              <select value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]">
                <option value="DIRECCION">Dirección</option>
                <option value="ADMINISTRACION">Administración</option>
                <option value="MARKETING">Marketing</option>
                <option value="VENTAS">Ventas</option>
                <option value="PRODUCCION">Producción</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving}
              className="bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={cancel}
              className="text-sm text-[#6b7280] hover:text-white px-4 py-2 rounded-md border border-[#333] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {users.map(u => {
          const isAdminUser = u.role === "ADMIN";
          const isExpanded = expandedPermisos === u.id;
          const userKeys = new Set(u.moduloAccesos.map(a => a.moduloKey));
          const grantedCount = userKeys.size;

          return (
            <div key={u.id} className={`bg-[#111] border rounded-xl overflow-hidden ${u.active ? "border-[#222]" : "border-[#1a1a1a] opacity-50"}`}>
              {/* Row principal */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center shrink-0">
                  <span className="text-[#B3985B] text-xs font-semibold">{u.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{u.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.USER}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    {u.area && u.area !== "GENERAL" && (
                      <span className={`text-xs px-2 py-0.5 rounded ${AREA_COLORS[u.area] ?? AREA_COLORS.GENERAL}`}>
                        {AREA_LABELS[u.area] ?? u.area}
                      </span>
                    )}
                    {!u.active && <span className="text-xs text-[#555]">Inactivo</span>}
                    {accessControlEnabled && !isAdminUser && (
                      <span className="text-xs text-gray-600">{grantedCount}/{ALL_MODULE_KEYS.length} módulos</span>
                    )}
                  </div>
                  <p className="text-[#555] text-xs">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {accessControlEnabled && !isAdminUser && (
                    <button onClick={() => setExpandedPermisos(isExpanded ? null : u.id)}
                      className={`text-xs px-2 py-1 border rounded transition-colors ${
                        isExpanded ? "text-[#B3985B] border-[#B3985B]/40" : "text-[#6b7280] hover:text-white border-[#333]"
                      }`}>
                      🔐 Permisos
                    </button>
                  )}
                  {isAdminUser && accessControlEnabled && (
                    <span className="text-xs text-[#B3985B]/60 px-2">Acceso total</span>
                  )}
                  <button onClick={() => startEdit(u)}
                    className="text-xs text-[#B3985B] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors">
                    Editar
                  </button>
                  <button onClick={() => resetPassword(u)}
                    className="text-xs text-[#6b7280] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors">
                    Contraseña
                  </button>
                  <button onClick={() => toggleActive(u)}
                    className="text-xs text-[#6b7280] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors">
                    {u.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>

              {/* Panel de permisos expandido */}
              {isExpanded && !isAdminUser && (
                <div className="border-t border-[#1a1a1a] bg-[#0d0d0d] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-gray-400">
                      Módulos accesibles para <span className="text-white font-medium">{u.name}</span>
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => grantAll(u.id)}
                        className="text-xs text-green-400 hover:text-green-300 border border-green-900/40 px-2 py-1 rounded transition-colors">
                        Dar acceso total
                      </button>
                      <button onClick={() => revokeAll(u.id)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 px-2 py-1 rounded transition-colors">
                        Quitar todo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {MODULOS_POR_SECCION.map(sec => (
                      <div key={sec.seccion}>
                        <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest font-bold mb-2">
                          {sec.seccion}
                        </p>
                        <div className="space-y-1">
                          {sec.items.map(mod => {
                            const hasAccess = userKeys.has(mod.key);
                            const lockKey = `${u.id}-${mod.key}`;
                            const isToggling = togglingKey === lockKey;
                            return (
                              <label key={mod.key}
                                className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition-colors group">
                                <input
                                  type="checkbox"
                                  checked={hasAccess}
                                  disabled={isToggling}
                                  onChange={() => toggleModulo(u.id, mod.key, hasAccess)}
                                  className="w-3.5 h-3.5 rounded accent-[#B3985B] shrink-0 disabled:opacity-50"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs font-medium ${hasAccess ? "text-white" : "text-[#555]"}`}>
                                    {mod.label}
                                  </span>
                                  <span className="text-[10px] text-[#333] group-hover:text-[#444] block leading-tight">
                                    {mod.desc}
                                  </span>
                                </div>
                                {isToggling && (
                                  <span className="text-[10px] text-gray-600">...</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
