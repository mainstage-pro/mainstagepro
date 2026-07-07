"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";

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

const MODULOS_POR_SECCION: { seccion: string; items: { key: string; label: string; desc: string }[] }[] = [
  {
    seccion: "GLOBAL",
    items: [
      { key: "dashboard",      label: "Dashboard",                   desc: "Mi Dashboard principal" },
      { key: "plan-trabajo",   label: "Plan de Trabajo",             desc: "Plan de trabajo y tareas personales" },
      { key: "operaciones",    label: "Módulo de Tareas",            desc: "Tareas globales y operativas" },
      { key: "calendario",     label: "Calendario de Eventos",       desc: "Vista y reportes de eventos" },
    ],
  },
  {
    seccion: "DIRECCIÓN",
    items: [
      { key: "juntas",         label: "Juntas",                      desc: "Minutas y acuerdos de juntas" },
      { key: "presentaciones", label: "Presentaciones",              desc: "Presentaciones de ventas y dirección" },
      { key: "capacitacion",   label: "Capacitación",                desc: "Portal de capacitación" },
      { key: "formularios",    label: "Formularios",                 desc: "Gestión de formularios" },
      { key: "admin-usuarios", label: "Usuarios y Accesos",          desc: "Gestión de usuarios y sus permisos" },
      { key: "admin-actividad",label: "Log de Actividad",            desc: "Registro de actividad de usuarios" },
      { key: "configuracion",  label: "Configuración",               desc: "Configuración global del sistema" },
    ],
  },
  {
    seccion: "ADMINISTRACIÓN",
    items: [
      { key: "finanzas",         label: "Finanzas (Todo)",           desc: "Cobros, pagos, movimientos, reportes" },
      { key: "rrhh",             label: "Recursos Humanos (Todo)",   desc: "Personal, nómina, asistencia, onboarding" },
      { key: "ats",              label: "Reclutamiento",             desc: "Candidatos y puestos ideales" },
      { key: "inversiones",      label: "Inversiones y Socios",      desc: "Gestión de socios de activos" },
      { key: "tabulador",        label: "Tabulador Freelancers",     desc: "Roles técnicos y tarifas" },
      { key: "grupos-equipo",    label: "Grupos de equipo",          desc: "Administración de grupos de equipo" },
      { key: "inventario-activos-admin", label: "Valuación de Activos", desc: "Inventario de activos de administración" },
    ],
  },
  {
    seccion: "MARKETING",
    items: [
      { key: "mkt-contenido",    label: "Contenido",                 desc: "Estrategia y calendario de contenido" },
      { key: "mkt-publicidad",   label: "Publicidad",                desc: "Campañas y pauta" },
      { key: "mkt-resultados",   label: "Resultados",                desc: "Métricas y resultados de marketing" },
    ],
  },
  {
    seccion: "VENTAS",
    items: [
      { key: "ventas-seguimientos",   label: "Seguimientos",         desc: "Seguimientos de tratos" },
      { key: "crm-tratos",            label: "Tratos",               desc: "Pipeline de tratos" },
      { key: "crm-base-de-datos",     label: "Base de Datos",        desc: "Base de datos CRM" },
      { key: "ventas-presentaciones", label: "Presentaciones Venta", desc: "Presentaciones para clientes" },
      { key: "ventas-reporte",        label: "Reporte de Ventas",    desc: "Métricas y reportes de ventas" },
    ],
  },
  {
    seccion: "PRODUCCIÓN",
    items: [
      { key: "proyectos",      label: "Proyectos de evento",         desc: "Gestión de proyectos" },
      { key: "inventario",     label: "Inventario (Módulos)",        desc: "Disponibilidad, recolecciones, mantenimiento" },
      { key: "inv-maestro",    label: "Inventario Maestro",          desc: "Catálogo maestro de equipos" },
      { key: "catalogo",       label: "Catálogo Venues",             desc: "Catálogo de venues" },
      { key: "bd-proveedores", label: "Proveedores",                 desc: "Directorio de proveedores" },
      { key: "bd-tecnicos",    label: "Técnicos freelance",          desc: "Directorio de técnicos" },
    ],
  },
  {
    seccion: "ACCESOS MÓDULO DE TAREAS",
    items: [
      { key: "tareas-ventas",         label: "Tareas · Ventas",         desc: "Ver tareas del área de Ventas" },
      { key: "tareas-produccion",     label: "Tareas · Producción",     desc: "Ver tareas del área de Producción" },
      { key: "tareas-marketing",      label: "Tareas · Marketing",      desc: "Ver tareas del área de Marketing" },
      { key: "tareas-administracion", label: "Tareas · Administración", desc: "Ver tareas del área de Administración" },
      { key: "tareas-rrhh",           label: "Tareas · RRHH",           desc: "Ver tareas del área de RRHH" },
      { key: "tareas-direccion",      label: "Tareas · Dirección",      desc: "Ver tareas del área de Dirección" },
    ],
  },
];

const ALL_MODULE_KEYS = MODULOS_POR_SECCION.flatMap(s => s.items.map(i => i.key));

const AREA_MODULE_PRESETS: Record<string, string[]> = {
  ADMINISTRACION: ["dashboard", "plan-trabajo", "operaciones", "calendario", "finanzas", "rrhh", "ats", "inversiones", "tabulador", "tareas-administracion"],
  MARKETING:      ["dashboard", "plan-trabajo", "operaciones", "calendario", "mkt-contenido", "mkt-publicidad", "mkt-resultados", "tareas-marketing"],
  VENTAS:         ["dashboard", "plan-trabajo", "operaciones", "calendario", "ventas-seguimientos", "crm-tratos", "crm-base-de-datos", "ventas-presentaciones", "ventas-reporte", "tareas-ventas"],
  PRODUCCION:     ["dashboard", "plan-trabajo", "operaciones", "calendario", "proyectos", "inventario", "inv-maestro", "catalogo", "bd-proveedores", "bd-tecnicos", "tareas-produccion"],
  RRHH:           ["dashboard", "plan-trabajo", "operaciones", "calendario", "rrhh", "ats", "tareas-rrhh"],
  DIRECCION:      ["dashboard", "plan-trabajo", "operaciones", "calendario", "juntas", "presentaciones", "capacitacion", "tareas-direccion"],
  GENERAL:        ["dashboard", "plan-trabajo", "operaciones", "calendario"],
};

const EMPTY = { name: "", email: "", password: "", role: "USER", area: "GENERAL" };

function effectiveKeysFor(u: User): Set<string> {
  if (u.moduloAccesos.length > 0) return new Set(u.moduloAccesos.map(a => a.moduloKey));
  return new Set(AREA_MODULE_PRESETS[u.area ?? ""] ?? []);
}

export default function UsuariosPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedPermisos, setExpandedPermisos] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [proyectosList, setProyectosList] = useState<{ id: string; nombre: string; numeroProyecto: string }[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Vista
  const [viewTab, setViewTab] = useState<"usuarios" | "modulos">("usuarios");

  // Draft de permisos — cambios locales antes de aplicar
  const [draftPerms, setDraftPerms] = useState<Record<string, Set<string>>>({});
  const [initialPerms, setInitialPerms] = useState<Record<string, Set<string>>>({});
  const [applying, setApplying] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json();
    setUsers(data.users ?? []);
    try {
      const meRes = await fetch("/api/me");
      if (meRes.ok) setCurrentUser(await meRes.json());
    } catch {}
  }

  useEffect(() => { load(); }, []);

  function openPermisos(userId: string | null) {
    setExpandedPermisos(userId);
    if (!userId) return;
    const u = users.find(u => u.id === userId);
    if (u) {
      const keys = effectiveKeysFor(u);
      setDraftPerms(p => ({ ...p, [userId]: new Set(keys) }));
      setInitialPerms(p => ({ ...p, [userId]: new Set(keys) }));
    }
    if (proyectosList.length === 0) {
      setLoadingProyectos(true);
      fetch("/api/proyectos", { cache: "no-store" })
        .then(r => r.json())
        .then(d => setProyectosList((d.proyectos ?? []).map((p: { id: string; nombre: string; numeroProyecto: string }) => ({
          id: p.id, nombre: p.nombre, numeroProyecto: p.numeroProyecto,
        }))))
        .finally(() => setLoadingProyectos(false));
    }
  }

  function toggleDraft(userId: string, key: string) {
    setDraftPerms(prev => {
      const current = new Set(prev[userId] ?? []);
      if (current.has(key)) current.delete(key); else current.add(key);
      return { ...prev, [userId]: current };
    });
  }

  function isDirty(userId: string): boolean {
    const draft = draftPerms[userId];
    const initial = initialPerms[userId];
    if (!draft || !initial) return false;
    if (draft.size !== initial.size) return true;
    for (const k of draft) if (!initial.has(k)) return true;
    return false;
  }

  function pendingCount(userId: string): number {
    const draft = draftPerms[userId];
    const initial = initialPerms[userId];
    if (!draft || !initial) return 0;
    let count = 0;
    for (const k of draft) if (!initial.has(k)) count++;
    for (const k of initial) if (!draft.has(k)) count++;
    return count;
  }

  async function applyPermissions(userId: string) {
    const draft = draftPerms[userId] ?? new Set<string>();
    const u = users.find(u => u.id === userId);
    const hasExplicit = (u?.moduloAccesos.length ?? 0) > 0;
    setApplying(userId);

    if (!hasExplicit) {
      // First save: materialize all draft keys as explicit entries
      for (const k of draft) {
        await fetch(`/api/admin/modulos/${k}/accesos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      }
    } else {
      const initial = initialPerms[userId] ?? new Set<string>();
      const toAdd = [...draft].filter(k => !initial.has(k));
      const toRemove = [...initial].filter(k => !draft.has(k));
      for (const k of toAdd) {
        await fetch(`/api/admin/modulos/${k}/accesos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      }
      for (const k of toRemove) {
        await fetch(`/api/admin/modulos/${k}/accesos/${userId}`, { method: "DELETE" });
      }
    }

    setUsers(prev => prev.map(u2 => u2.id !== userId ? u2 : {
      ...u2,
      moduloAccesos: [...draft].map(k => ({ moduloKey: k })),
    }));
    setInitialPerms(p => ({ ...p, [userId]: new Set(draft) }));
    setApplying(null);
    toast.success("Permisos aplicados");
  }

  function discardPermissions(userId: string) {
    const initial = initialPerms[userId] ?? new Set<string>();
    setDraftPerms(p => ({ ...p, [userId]: new Set(initial) }));
  }

  function setDraftAll(userId: string) {
    setDraftPerms(p => ({ ...p, [userId]: new Set(ALL_MODULE_KEYS) }));
  }

  function setDraftNone(userId: string) {
    if (!window.confirm("¿Quitar todos los accesos del usuario? Deberás aplicar los cambios para confirmar.")) return;
    setDraftPerms(p => ({ ...p, [userId]: new Set() }));
  }

  function setDraftAreaPreset(userId: string, area: string) {
    const presetKeys = AREA_MODULE_PRESETS[area];
    if (!presetKeys) return;
    if (!window.confirm(`¿Reemplazar accesos con los predeterminados de ${AREA_LABELS[area] ?? area}? Deberás aplicar los cambios para confirmar.`)) return;
    setDraftPerms(p => ({ ...p, [userId]: new Set(presetKeys) }));
  }

  async function deleteUser(u: User) {
    if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(u.id);
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      setDeletingId(null);
      return;
    }
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setDeletingId(null);
    if (expandedPermisos === u.id) setExpandedPermisos(null);
  }

  function startCreate() { setEditing(null); setForm(EMPTY); setError(""); setShowForm(true); }
  function startEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, area: u.area ?? "GENERAL" });
    setError(""); setShowForm(true);
  }
  function cancel() { setShowForm(false); setEditing(null); setError(""); }

  async function save() {
    if (!form.name || !form.email) { setError("Nombre y correo son obligatorios"); return; }
    if (!editing && isCurrentAdmin && !form.password) { setError("La contraseña es obligatoria para nuevos usuarios"); return; }
    setSaving(true); setError("");
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
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    await load();
  }

  async function resetPassword(u: User) {
    const newPass = prompt(`Nueva contraseña para ${u.name}:`);
    if (!newPass || newPass.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    toast.success("Contraseña actualizada");
  }

  // ─── Vista por módulo ─────────────────────────────────────────────────────
  // Toggle directo en la vista de módulos (sin draft — es una vista de referencia)
  const [togglingModKey, setTogglingModKey] = useState<string | null>(null);

  async function toggleModuloDirecto(userId: string, key: string, hasAccess: boolean) {
    const lockKey = `${userId}-${key}`;
    setTogglingModKey(lockKey);
    const u = users.find(u => u.id === userId);
    if (u && u.moduloAccesos.length === 0 && u.area && AREA_MODULE_PRESETS[u.area]) {
      const areaKeys = AREA_MODULE_PRESETS[u.area];
      for (const areaKey of areaKeys) {
        if (areaKey !== key) {
          await fetch(`/api/admin/modulos/${areaKey}/accesos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
        }
      }
      setUsers(prev => prev.map(u2 => u2.id !== userId ? u2 : {
        ...u2, moduloAccesos: areaKeys.filter(k => k !== key).map(k => ({ moduloKey: k })),
      }));
    }
    if (hasAccess) {
      await fetch(`/api/admin/modulos/${key}/accesos/${userId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/modulos/${key}/accesos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    }
    setUsers(prev => prev.map(u2 => {
      if (u2.id !== userId) return u2;
      const accesos = hasAccess
        ? u2.moduloAccesos.filter(a => a.moduloKey !== key)
        : [...u2.moduloAccesos, { moduloKey: key }];
      return { ...u2, moduloAccesos: accesos };
    }));
    setTogglingModKey(null);
  }

  const nonAdminUsers = users.filter(u => u.role !== "ADMIN" && u.active);
  const isCurrentAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Usuarios y Accesos</h1>
          <p className="text-[#6b7280] text-sm">{users.length} usuarios registrados</p>
        </div>
        <button onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo usuario
          </button>
      </div>

      <Modal
        open={showForm}
        onClose={cancel}
        title={editing ? `Editando: ${editing.name}` : "Nuevo usuario"}
      >
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
          {isCurrentAdmin && (
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Contraseña {editing ? "(vacío = sin cambio)" : "*"}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Mínimo 6 caracteres" />
            </div>
          )}
          <div>
            <label className="text-xs text-[#6b7280] mb-1 block">Tipo de acceso</label>
            <Combobox value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))}
              options={[
                { value: "ADMIN", label: "Administrador — acceso total" },
                { value: "USER", label: "Usuario regular — puede crear y editar" },
                { value: "READONLY", label: "Solo lectura — no puede modificar" },
              ]}
              className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-[#6b7280] mb-1 block">Área</label>
            <Combobox value={form.area} onChange={v => setForm(p => ({ ...p, area: v }))}
              options={[
                { value: "DIRECCION", label: "Dirección" }, { value: "ADMINISTRACION", label: "Administración" },
                { value: "MARKETING", label: "Marketing" }, { value: "VENTAS", label: "Ventas" },
                { value: "PRODUCCION", label: "Producción" }, { value: "GENERAL", label: "General" },
              ]}
              className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={save} disabled={saving}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </Modal>

      {/* Tabs de vista */}
      <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1 w-fit">
        {([["usuarios", "Por usuario"], ["modulos", "Por módulo"]] as [typeof viewTab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setViewTab(t)}
            className={`text-sm px-4 py-1.5 rounded transition-colors ${viewTab === t ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Vista por usuario ───────────────────────────────────────────────── */}
      {viewTab === "usuarios" && (
        <div className="space-y-2">
          {users.map(u => {
            const isAdminUser = u.role === "ADMIN";
            const isExpanded = expandedPermisos === u.id;
            const draft = draftPerms[u.id] ?? effectiveKeysFor(u);
            const grantedCount = draft.size;
            const dirty = isDirty(u.id);
            const changes = pendingCount(u.id);
            const isApplying = applying === u.id;

            return (
              <div key={u.id} className={`bg-[#111] border rounded-xl overflow-hidden transition-colors ${u.active ? "border-[#222]" : "border-[#1a1a1a] opacity-50"}`}>
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
                      {!isAdminUser && (
                        <span className="text-xs text-gray-600">{grantedCount}/{ALL_MODULE_KEYS.length} módulos</span>
                      )}
                    </div>
                    <p className="text-[#555] text-xs">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {!isAdminUser && (
                      <button onClick={() => openPermisos(isExpanded ? null : u.id)}
                        className={`text-xs px-2 py-1 border rounded transition-colors ${
                          isExpanded ? "text-[#B3985B] border-[#B3985B]/40" : "text-[#6b7280] hover:text-white border-[#333]"
                        }`}>
                        Permisos
                      </button>
                    )}
                    {isAdminUser && <span className="text-xs text-[#B3985B]/60 px-2">Acceso total</span>}
                    <button onClick={() => startEdit(u)}
                      className="text-xs text-[#B3985B] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors">
                      Editar
                    </button>
                    {isCurrentAdmin && (
                      <button onClick={() => resetPassword(u)}
                        className="text-xs text-[#6b7280] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors">
                        Contraseña
                      </button>
                    )}
                    <button onClick={() => toggleActive(u)}
                      className="text-xs text-[#6b7280] hover:text-white px-2 py-1 border border-[#333] rounded transition-colors">
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => deleteUser(u)} disabled={deletingId === u.id}
                      className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 px-2 py-1 border border-red-900/40 rounded transition-colors">
                      {deletingId === u.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>

                {/* Panel de permisos */}
                {isExpanded && !isAdminUser && (
                  <div className="border-t border-[#1a1a1a] bg-[#0d0d0d]">
                    {/* Barra de acciones */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] flex-wrap gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {u.area && AREA_MODULE_PRESETS[u.area] && (
                          <button onClick={() => setDraftAreaPreset(u.id, u.area!)}
                            className="text-xs text-[#B3985B] hover:text-[#c9a96a] border border-[#B3985B]/40 px-2 py-1 rounded transition-colors">
                            Preset {AREA_LABELS[u.area] ?? u.area}
                          </button>
                        )}
                        <button onClick={() => setDraftAll(u.id)}
                          className="text-xs text-green-400 hover:text-green-300 border border-green-900/40 px-2 py-1 rounded transition-colors">
                          Dar acceso total
                        </button>
                        <button onClick={() => setDraftNone(u.id)}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 px-2 py-1 rounded transition-colors">
                          Quitar todo
                        </button>
                      </div>

                      {/* Botón guardar */}
                      <div className="flex items-center gap-2">
                        {dirty && (
                          <button onClick={() => discardPermissions(u.id)}
                            className="text-xs text-[#6b7280] hover:text-white border border-[#333] px-3 py-1.5 rounded transition-colors">
                            Descartar
                          </button>
                        )}
                        <button
                          onClick={() => applyPermissions(u.id)}
                          disabled={!dirty || isApplying}
                          className={`text-sm font-semibold px-4 py-1.5 rounded transition-colors flex items-center gap-2 ${
                            dirty
                              ? "bg-[#B3985B] hover:bg-[#c9a96a] text-black"
                              : "bg-[#1a1a1a] text-[#444] cursor-not-allowed"
                          } disabled:opacity-60`}>
                          {isApplying ? (
                            <>
                              <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                              Aplicando...
                            </>
                          ) : dirty ? (
                            `Aplicar cambios${changes > 0 ? ` (${changes})` : ""}`
                          ) : (
                            "Sin cambios pendientes"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Grid de módulos */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {MODULOS_POR_SECCION.map(sec => (
                        <div key={sec.seccion}>
                          <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest font-bold mb-2">
                            {sec.seccion}
                          </p>
                          <div className="space-y-1">
                            {sec.items.map(mod => {
                              const hasDraft = draft.has(mod.key);
                              const hadInitial = (initialPerms[u.id] ?? effectiveKeysFor(u)).has(mod.key);
                              const changed = hasDraft !== hadInitial;
                              return (
                                <label key={mod.key}
                                  className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition-colors group ${changed ? "bg-[#1a1a1a]" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={hasDraft}
                                    onChange={() => toggleDraft(u.id, mod.key)}
                                    className="w-3.5 h-3.5 rounded accent-[#B3985B] shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-xs font-medium ${hasDraft ? "text-white" : "text-[#555]"}`}>
                                      {mod.label}
                                      {changed && (
                                        <span className={`ml-1.5 text-[9px] font-bold ${hasDraft ? "text-green-400" : "text-red-400"}`}>
                                          {hasDraft ? "+acceso" : "−acceso"}
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-[#333] group-hover:text-[#444] block leading-tight">
                                      {mod.desc}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Proyectos específicos */}
                    {draft.has("proyectos") && (
                      <div className="mx-4 mb-4 pt-4 border-t border-[#1a1a1a]">
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest font-bold">Restricción por proyecto</p>
                          <span className="text-[10px] text-gray-700">Si no se selecciona ninguno, el usuario ve todos</span>
                        </div>
                        {loadingProyectos ? (
                          <p className="text-xs text-gray-600">Cargando proyectos...</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                            {proyectosList.map(p => {
                              const key = `proyecto:${p.id}`;
                              const hasDraft = draft.has(key);
                              return (
                                <label key={p.id}
                                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={hasDraft}
                                    onChange={() => toggleDraft(u.id, key)}
                                    className="w-3 h-3 rounded accent-[#B3985B] shrink-0"
                                  />
                                  <span className={`text-[11px] ${hasDraft ? "text-white" : "text-[#444]"}`}>
                                    {p.numeroProyecto} · {p.nombre}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vista por módulo ─────────────────────────────────────────────────── */}
      {viewTab === "modulos" && (
        <div className="space-y-6">
          <p className="text-xs text-gray-600">
            Vista de referencia — muestra qué usuarios tienen acceso a cada módulo. Los cambios aquí se aplican de inmediato.
          </p>
          {MODULOS_POR_SECCION.map(sec => (
            <div key={sec.seccion}>
              <p className="text-[10px] text-[#3a3a3a] uppercase tracking-widest font-bold mb-3">{sec.seccion}</p>
              <div className="space-y-2">
                {sec.items.map(mod => {
                  const usersWithAccess = nonAdminUsers.filter(u => effectiveKeysFor(u).has(mod.key));
                  const usersWithout = nonAdminUsers.filter(u => !effectiveKeysFor(u).has(mod.key));
                  return (
                    <div key={mod.key} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{mod.label}</p>
                          <p className="text-[#444] text-[10px]">{mod.desc}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">
                          {usersWithAccess.length} / {nonAdminUsers.length} usuarios
                        </span>
                      </div>
                      {nonAdminUsers.length > 0 && (
                        <div className="border-t border-[#1a1a1a] px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                          {nonAdminUsers.map(u => {
                            const hasAccess = effectiveKeysFor(u).has(mod.key);
                            const lockKey = `${u.id}-${mod.key}`;
                            const isToggling = togglingModKey === lockKey;
                            return (
                              <label key={u.id}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={hasAccess}
                                  disabled={isToggling}
                                  onChange={() => toggleModuloDirecto(u.id, mod.key, hasAccess)}
                                  className="w-3.5 h-3.5 rounded accent-[#B3985B] shrink-0 disabled:opacity-50"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs font-medium ${hasAccess ? "text-white" : "text-[#555]"}`}>
                                    {u.name}
                                  </span>
                                  {u.area && u.area !== "GENERAL" && (
                                    <span className={`text-[9px] ml-1.5 px-1 rounded ${AREA_COLORS[u.area] ?? "text-gray-600"}`}>
                                      {AREA_LABELS[u.area]}
                                    </span>
                                  )}
                                </div>
                                {isToggling && <span className="text-[10px] text-gray-600">...</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {nonAdminUsers.length === 0 && (
                        <div className="border-t border-[#1a1a1a] px-4 py-2">
                          <p className="text-xs text-[#333]">No hay usuarios regulares registrados</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
