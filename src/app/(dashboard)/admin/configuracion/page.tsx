"use client";

import { useEffect, useState, useCallback } from "react";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";

// ─── Módulos / Etiquetas ──────────────────────────────────────────────────────

const MODULOS = [
  { key: "finanzas",          label: "Finanzas",           seccion: "Administración" },
  { key: "rrhh",              label: "RR.HH.",              seccion: "Administración" },
  { key: "base-datos",        label: "Base de datos",       seccion: "Administración" },
  { key: "contenido-organico",label: "Contenido orgánico",  seccion: "Marketing" },
  { key: "publicidad",        label: "Publicidad",          seccion: "Marketing" },
  { key: "crm",               label: "CRM",                 seccion: "Ventas" },
  { key: "cotizaciones",      label: "Cotizaciones",        seccion: "Ventas" },
  { key: "comisiones",        label: "Comisiones",          seccion: "Ventas" },
  { key: "proyectos",         label: "Proyectos",           seccion: "Producción" },
  { key: "inventario",        label: "Inventario",          seccion: "Producción" },
  { key: "calendario",        label: "Calendario de eventos", seccion: "Dirección" },
  { key: "dashboard",         label: "Dashboard",           seccion: "Dirección" },
];

const ETIQUETAS = [
  { group: "Secciones del menú", items: [
    { key: "seccion-direccion",      default: "DIRECCIÓN" },
    { key: "seccion-administracion", default: "ADMINISTRACIÓN" },
    { key: "seccion-marketing",      default: "MARKETING" },
    { key: "seccion-ventas",         default: "VENTAS" },
    { key: "seccion-produccion",     default: "PRODUCCIÓN" },
  ]},
  { group: "Módulos principales", items: [
    { key: "finanzas",           default: "Finanzas" },
    { key: "rrhh",               default: "RR.HH." },
    { key: "base-datos",         default: "Base de datos" },
    { key: "contenido-organico", default: "Contenido orgánico" },
    { key: "publicidad",         default: "Publicidad" },
    { key: "crm",                default: "CRM" },
    { key: "cotizaciones",       default: "Cotizaciones" },
    { key: "comisiones",         default: "Comisiones" },
    { key: "proyectos",          default: "Proyectos" },
    { key: "inventario",         default: "Inventario" },
    { key: "dashboard",          default: "Dashboard" },
    { key: "calendario",         default: "Calendario de eventos" },
  ]},
  { group: "Subpáginas de Finanzas", items: [
    { key: "finanzas-movimientos", default: "Movimientos" },
    { key: "finanzas-cxc",         default: "Por cobrar" },
    { key: "finanzas-cxp",         default: "Por pagar" },
    { key: "finanzas-cuentas",     default: "Cuentas bancarias" },
    { key: "finanzas-categorias",  default: "Categorías" },
    { key: "finanzas-reporte",     default: "Reporte" },
  ]},
  { group: "Subpáginas de RR.HH.", items: [
    { key: "rrhh-personal",     default: "Personal" },
    { key: "rrhh-nomina",       default: "Nómina" },
    { key: "rrhh-asistencia",   default: "Asistencia" },
    { key: "rrhh-incidencias",  default: "Incidencias" },
    { key: "rrhh-evaluaciones", default: "Evaluaciones" },
  ]},
];

const SECCION_LABELS: Record<string, string> = {
  empresa:    "Empresa",
  banco:      "Datos bancarios",
  precios:    "Precios y descuentos",
  trade:      "Mainstage Trade",
  proyectos:  "Proyectos",
  alertas:    "Alertas y notificaciones",
  inventario: "Inventario",
  plantillas: "Plantillas de mensajes",
  contratos:  "Contratos",
  general:    "General",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface User { id: string; name: string; email: string; role: string; }
interface Acceso { moduloKey: string; userId: string; user: User; }
interface ConfigEntry {
  id: string; key: string; value: string; section: string;
  label: string; description?: string | null; type: string;
  defaultValue?: string | null; orden: number;
}

type Tab = "accesos" | "etiquetas" | "configuracion";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("accesos");

  // ── Accesos ──────────────────────────────────────────────────────────────
  const [privateModules, setPrivateModules] = useState<string[]>([]);
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Etiquetas ────────────────────────────────────────────────────────────
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [labelsDraft, setLabelsDraft] = useState<Record<string, string>>({});
  const [savingLabels, setSavingLabels] = useState(false);
  const [labelsSaved, setLabelsSaved] = useState(false);

  // ── Configuración general ─────────────────────────────────────────────────
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  // ── Migraciones ──────────────────────────────────────────────────────────
  const [migrando, setMigrando] = useState(false);
  const [migMsg, setMigMsg] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const [modulosRes, configRes] = await Promise.all([
      fetch("/api/admin/modulos"),
      fetch("/api/admin/config"),
    ]);
    const [modulosData, configData] = await Promise.all([modulosRes.json(), configRes.json()]);
    setAccesos(modulosData.accesos ?? []);
    setUsers(modulosData.users ?? []);
    const entries: ConfigEntry[] = configData.entries ?? [];
    const cfg: Record<string, string> = {};
    for (const e of entries) cfg[e.key] = e.value;
    const priv: string[] = cfg["nav.private"] ? JSON.parse(cfg["nav.private"]) : [];
    const lbls: Record<string, string> = cfg["nav.labels"] ? JSON.parse(cfg["nav.labels"]) : {};
    setPrivateModules(priv);
    setLabels(lbls);
    setLabelsDraft(lbls);
    setConfigEntries(entries);
    const draft: Record<string, string> = {};
    for (const e of entries) draft[e.key] = e.value;
    setConfigDraft(draft);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  async function togglePrivate(key: string) {
    setSaving(true);
    const next = privateModules.includes(key)
      ? privateModules.filter(k => k !== key)
      : [...privateModules, key];
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "nav.private", value: JSON.stringify(next) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    setPrivateModules(next);
    setSaving(false);
  }

  async function grantAccess(moduloKey: string, userId: string) {
    const res = await fetch(`/api/admin/modulos/${moduloKey}/accesos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    await loadConfig();
    setAddingUser(null);
  }

  async function revokeAccess(moduloKey: string, userId: string) {
    const res = await fetch(`/api/admin/modulos/${moduloKey}/accesos/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    await loadConfig();
  }

  async function saveLabels() {
    setSavingLabels(true);
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(labelsDraft)) {
      if (v.trim()) clean[k] = v.trim();
    }
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "nav.labels", value: JSON.stringify(clean) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSavingLabels(false);
      return;
    }
    setLabels(clean);
    setSavingLabels(false);
    setLabelsSaved(true);
    setTimeout(() => setLabelsSaved(false), 2000);
  }

  function resetLabel(key: string) {
    setLabelsDraft(d => { const n = { ...d }; delete n[key]; return n; });
  }

  function availableUsers(moduloKey: string) {
    const granted = accesos.filter(a => a.moduloKey === moduloKey).map(a => a.userId);
    return users.filter(u => u.role !== "ADMIN" && !granted.includes(u.id));
  }

  async function saveConfigChanges() {
    setSavingConfig(true);
    const updates = configEntries
      .filter(e => configDraft[e.key] !== e.value)
      .map(e => ({ key: e.key, value: configDraft[e.key] ?? e.value }));
    if (updates.length > 0) {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSavingConfig(false);
        return;
      }
    }
    setSavingConfig(false);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
    await loadConfig();
  }

  async function runSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const r = await fetch("/api/admin/config/seed", { method: "POST" });
      const d = await r.json();
      setSeedMsg(r.ok ? `Listo — ${d.upserted} entradas inicializadas` : (d.error ?? "Error"));
      if (r.ok) await loadConfig();
    } catch { setSeedMsg("Error de conexión"); }
    finally { setSeeding(false); }
  }

  // Group entries by section
  const configBySections = () => {
    const map = new Map<string, ConfigEntry[]>();
    for (const e of configEntries) {
      if (!map.has(e.section)) map.set(e.section, []);
      map.get(e.section)!.push(e);
    }
    return map;
  };

  function ConfigInput({ entry }: { entry: ConfigEntry }) {
    const val = configDraft[entry.key] ?? entry.value;
    const onChange = (v: string) => setConfigDraft(d => ({ ...d, [entry.key]: v }));
    const isDirty = val !== entry.value;
    const base = `w-full bg-[#0d0d0d] border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none transition-colors ${isDirty ? "border-[#B3985B]" : "border-[#2a2a2a] focus:border-[#B3985B]"}`;

    if (entry.type === "boolean") {
      const isOn = val === "true";
      return (
        <button
          onClick={() => onChange(isOn ? "false" : "true")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
            isOn
              ? "bg-green-900/20 border-green-500/30 text-green-400"
              : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-500"
          } ${isDirty ? "ring-1 ring-[#B3985B]" : ""}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isOn ? "bg-green-400" : "bg-gray-600"}`} />
          {isOn ? "Activado" : "Desactivado"}
        </button>
      );
    }

    if (entry.type === "textarea" || entry.type === "json") {
      return (
        <textarea
          value={val}
          onChange={e => onChange(e.target.value)}
          rows={entry.type === "json" ? 5 : 3}
          className={`${base} font-mono text-xs resize-y`}
        />
      );
    }

    if (entry.type === "color") {
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={val} onChange={e => onChange(e.target.value)}
            className="h-8 w-12 rounded cursor-pointer border border-[#2a2a2a] bg-transparent" />
          <input value={val} onChange={e => onChange(e.target.value)} className={`${base} flex-1`} />
        </div>
      );
    }

    return (
      <input
        type={entry.type === "number" ? "number" : entry.type === "email" ? "email" : "text"}
        value={val}
        onChange={e => onChange(e.target.value)}
        className={base}
      />
    );
  }

  const sections = configBySections();
  const hasDirty = configEntries.some(e => configDraft[e.key] !== e.value);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Configuración</h1>
        <p className="text-[#6b7280] text-sm">Accesos, personalización y parámetros del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1 w-fit flex-wrap">
        {([
          ["accesos", "Accesos por módulo"],
          ["etiquetas", "Etiquetas"],
          ["configuracion", "Configuración general"],
        ] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded transition-colors ${tab === t ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Tab: Accesos ─────────────────────────────────────────────────── */}
      {tab === "accesos" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Los módulos marcados como <span className="text-orange-400">Privado</span> solo son visibles para los usuarios con acceso concedido. Los administradores siempre ven todo.
          </p>
          {MODULOS.map(modulo => {
            const isPrivate = privateModules.includes(modulo.key);
            const moduloAccesos = accesos.filter(a => a.moduloKey === modulo.key);
            const isExpanded = expandedModule === modulo.key;
            const available = availableUsers(modulo.key);
            return (
              <div key={modulo.key} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div>
                      <p className="text-white text-sm font-medium">{labels[modulo.key] || modulo.label}</p>
                      <p className="text-gray-600 text-[10px]">{modulo.seccion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isPrivate && moduloAccesos.length > 0 && (
                      <span className="text-[10px] text-gray-500">{moduloAccesos.length} con acceso</span>
                    )}
                    <button onClick={() => togglePrivate(modulo.key)} disabled={saving}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        isPrivate
                          ? "bg-orange-900/20 border-orange-500/30 text-orange-400 hover:bg-orange-900/30"
                          : "bg-green-900/20 border-green-500/30 text-green-400 hover:bg-green-900/30"
                      }`}>
                      {isPrivate ? "🔒 Privado" : "🌐 Público"}
                    </button>
                    {isPrivate && (
                      <button onClick={() => setExpandedModule(isExpanded ? null : modulo.key)}
                        className="text-gray-600 hover:text-white text-sm transition-colors px-2">
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    )}
                  </div>
                </div>

                {isPrivate && isExpanded && (
                  <div className="border-t border-[#1a1a1a] p-4 space-y-3 bg-[#0d0d0d]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Usuarios con acceso</p>
                    {moduloAccesos.length === 0 ? (
                      <p className="text-gray-700 text-xs">Ningún usuario tiene acceso aún.</p>
                    ) : (
                      <div className="space-y-2">
                        {moduloAccesos.map(a => (
                          <div key={a.userId} className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-white text-sm">{a.user.name}</span>
                              <span className="text-gray-600 text-xs ml-2">{a.user.email}</span>
                            </div>
                            <button onClick={() => revokeAccess(modulo.key, a.userId)}
                              className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {available.length > 0 && (
                      addingUser === modulo.key ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Combobox
                            value={selectedUserId}
                            onChange={v => setSelectedUserId(v)}
                            options={[{ value: "", label: "Seleccionar usuario..." }, ...available.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))]}
                            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                          <button onClick={() => {
                            if (selectedUserId) { grantAccess(modulo.key, selectedUserId); setSelectedUserId(""); }
                          }} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-3 py-1.5 rounded-lg">
                            Dar acceso
                          </button>
                          <button onClick={() => setAddingUser(null)} className="text-gray-600 hover:text-white text-xs px-2">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingUser(modulo.key)}
                          className="text-[#B3985B] hover:text-[#c9a96a] text-xs transition-colors mt-1">
                          + Dar acceso a usuario
                        </button>
                      )
                    )}
                    {available.length === 0 && moduloAccesos.length > 0 && (
                      <p className="text-gray-700 text-xs">Todos los usuarios activos ya tienen acceso.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Etiquetas ───────────────────────────────────────────────── */}
      {tab === "etiquetas" && (
        <div className="space-y-6">
          <p className="text-xs text-gray-600">
            Personaliza los nombres que aparecen en el menú lateral. Deja en blanco para usar el nombre por defecto.
          </p>
          {ETIQUETAS.map(group => (
            <div key={group.group} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{group.group}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.items.map(item => (
                  <div key={item.key}>
                    <label className="text-[10px] text-gray-500 mb-1 block">{item.default}</label>
                    <div className="flex gap-1.5">
                      <input
                        value={labelsDraft[item.key] ?? ""}
                        onChange={e => setLabelsDraft(d => ({ ...d, [item.key]: e.target.value }))}
                        placeholder={item.default}
                        className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      />
                      {labelsDraft[item.key] && (
                        <button onClick={() => resetLabel(item.key)}
                          className="text-gray-600 hover:text-white text-xs px-2 transition-colors" title="Restablecer">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button onClick={saveLabels} disabled={savingLabels}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {savingLabels ? "Guardando..." : "Guardar etiquetas"}
            </button>
            {labelsSaved && <span className="text-green-400 text-sm">Guardado. Recarga para ver cambios.</span>}
          </div>
        </div>
      )}

      {/* ── Tab: Configuración general ───────────────────────────────────── */}
      {tab === "configuracion" && (
        <div className="space-y-5">
          {/* Seed button */}
          <div className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <div>
              <p className="text-white text-sm font-medium">Inicializar configuración</p>
              <p className="text-gray-600 text-xs mt-0.5">Carga todos los parámetros de la plataforma. Los valores existentes no se sobreescriben.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {seedMsg && <span className={`text-xs ${seedMsg.startsWith("Listo") ? "text-green-400" : "text-red-400"}`}>{seedMsg}</span>}
              <button onClick={runSeed} disabled={seeding}
                className="bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 border border-[#2a2a2a] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
                {seeding ? "Inicializando..." : "Inicializar"}
              </button>
            </div>
          </div>

          {sections.size === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-sm">No hay entradas de configuración.</p>
              <p className="text-gray-700 text-xs mt-1">Haz clic en "Inicializar" para cargar los parámetros.</p>
            </div>
          ) : (
            Array.from(sections.entries()).map(([section, entries]) => (
              <div key={section} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a]">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
                    {SECCION_LABELS[section] ?? section}
                  </p>
                </div>
                <div className="p-5 space-y-5">
                  {entries.map(entry => (
                    <div key={entry.key}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <label className="text-sm text-white font-medium">{entry.label}</label>
                        {configDraft[entry.key] !== entry.value && (
                          <span className="text-[10px] text-[#B3985B]">modificado</span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-xs text-gray-600 mb-1.5">{entry.description}</p>
                      )}
                      <ConfigInput entry={entry} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {sections.size > 0 && (
            <div className="flex items-center gap-3 pt-2 pb-4 sticky bottom-0 bg-[#0a0a0a] py-4 border-t border-[#1a1a1a]">
              <button
                onClick={saveConfigChanges}
                disabled={savingConfig || !hasDirty}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors">
                {savingConfig ? "Guardando..." : "Guardar cambios"}
              </button>
              {configSaved && <span className="text-green-400 text-sm">Guardado correctamente</span>}
              {hasDirty && !configSaved && (
                <span className="text-[#B3985B] text-xs">Hay cambios sin guardar</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Migraciones ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold text-sm">Migraciones de datos</h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-gray-400 text-sm">Mover todas las CxC pendientes al lunes 27 de abril 2026</p>
            <p className="text-gray-600 text-xs mt-0.5">Operación única — no se puede deshacer</p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("¿Mover todas las CxC pendientes al 27 de abril?")) return;
              setMigrando(true); setMigMsg(null);
              try {
                const r = await fetch("/api/admin/migrate-cxc-fechas", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fecha: "2026-04-27" }),
                });
                const d = await r.json();
                setMigMsg(r.ok ? `Listo — ${d.actualizadas} CxC actualizadas` : (d.error ?? "Error"));
              } catch { setMigMsg("Error de conexión"); }
              finally { setMigrando(false); }
            }}
            disabled={migrando}
            className="shrink-0 bg-red-900/40 hover:bg-red-800/60 disabled:opacity-40 text-red-300 text-sm font-medium px-4 py-2 rounded-lg border border-red-800/50 transition-colors"
          >
            {migrando ? "Ejecutando..." : "Ejecutar"}
          </button>
        </div>
        {migMsg && <p className={`text-sm ${migMsg.startsWith("Listo") ? "text-green-400" : "text-red-400"}`}>{migMsg}</p>}
      </div>
    </div>
  );
}
