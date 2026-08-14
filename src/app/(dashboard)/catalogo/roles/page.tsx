"use client";

import React, { useEffect, useState, useRef } from "react";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import { DISCIPLINAS, DISCIPLINA_LABELS, DISCIPLINA_COLORS } from "@/lib/disciplinaColors";

// Orden de las secciones del tabulador. null = "Sin categoría" (p.ej. Production Manager).
const SECCIONES: (string | null)[] = [...DISCIPLINAS, null];

// Jerarquía dentro de cada sección: ingeniero > operador > técnico.
function rangoJerarquia(nombre: string): number {
  const n = nombre.toLowerCase();
  if (n.includes("ingenier")) return 0;
  if (n.includes("operador")) return 1;
  if (n.includes("técnico") || n.includes("tecnico")) return 2;
  return 1.5;
}

type Rol = {
  id: string;
  nombre: string;
  disciplina: string | null;
  tipoPago: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  // Jornada (POR_JORNADA) — usamos los campos AAA como tasa única
  tarifaAAACorta: number | null;
  tarifaAAAMedia: number | null;
  tarifaAAALarga: number | null;
  // Plana / por proyecto
  tarifaPlanaAAA: number | null;
  // Por hora
  tarifaHoraAAA: number | null;
  // Legacy — no se usan en UI nueva pero existen en BD
  tarifaAACorta: number | null; tarifaAAMedia: number | null; tarifaAALarga: number | null;
  tarifaACorta: number | null;  tarifaAMedia: number | null;  tarifaALarga: number | null;
  tarifaPlanaAA: number | null; tarifaPlanaA: number | null;
  tarifaHoraAA: number | null;  tarifaHoraA: number | null;
};

const TIPO_PAGO_LABELS: Record<string, string> = {
  POR_JORNADA: "Por Jornada",
  POR_PROYECTO: "Por Proyecto",
  POR_HORA: "Por Hora",
  TARIFA_PLANA: "Tarifa Plana",
};

function fmt(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `$${v.toLocaleString("es-MX")}`;
}

const EMPTY: Omit<Rol, "id"> = {
  nombre: "", disciplina: null, tipoPago: "POR_JORNADA", descripcion: null, activo: true, orden: 99,
  tarifaAAACorta: null, tarifaAAAMedia: null, tarifaAAALarga: null,
  tarifaPlanaAAA: null, tarifaHoraAAA: null,
  tarifaAACorta: null, tarifaAAMedia: null, tarifaAALarga: null,
  tarifaACorta: null,  tarifaAMedia: null,  tarifaALarga: null,
  tarifaPlanaAA: null, tarifaPlanaA: null,
  tarifaHoraAA: null,  tarifaHoraA: null,
};

export default function RolesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [editing, setEditing] = useState<Rol | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Rol, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const currentEditId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const res = await fetch("/api/roles-tecnicos", { cache: "no-store" });
    const data = await res.json();
    setRoles(data.roles ?? []);
  }

  useEffect(() => { load(); }, []);

  // Auto-save when editing existing rol
  useEffect(() => {
    if (!editing || editing.id !== currentEditId.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/roles-tecnicos/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setRoles(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(r: Rol) {
    currentEditId.current = r.id;
    setEditing(r);
    setForm({ ...r });
    setCreating(false);
  }

  function startCreate() {
    currentEditId.current = null;
    setCreating(true);
    setEditing(null);
    setForm({ ...EMPTY });
  }

  function cancel() {
    currentEditId.current = null;
    setEditing(null);
    setCreating(false);
  }

  function set(key: keyof Omit<Rol, "id">, value: string | number | boolean | null) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function numVal(key: keyof Omit<Rol, "id">) {
    const v = form[key];
    return v === null || v === undefined ? "" : String(v);
  }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/roles-tecnicos/${editing.id}` : "/api/roles-tecnicos";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    await load();
    cancel();
    setSaving(false);
  }

  async function toggleActivo(r: Rol) {
    await fetch(`/api/roles-tecnicos/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !r.activo }),
    });
    await load();
  }

  async function eliminar(r: Rol) {
    const ok = await confirm({
      title: `Eliminar "${r.nombre}"`,
      message: "Este rol se eliminará del tabulador. Los proyectos que ya lo usan no se verán afectados.",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/roles-tecnicos/${r.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar"); return; }
    await load();
  }

  const showForm = editing !== null || creating;
  const activos = roles.filter(r => r.activo);
  const inactivos = roles.filter(r => !r.activo);

  const secciones = SECCIONES
    .map(disc => ({
      disc,
      roles: activos
        .filter(r => (r.disciplina ?? null) === disc)
        .sort((a, b) =>
          rangoJerarquia(a.nombre) - rangoJerarquia(b.nombre) ||
          a.orden - b.orden ||
          a.nombre.localeCompare(b.nombre)
        ),
    }))
    .filter(s => s.roles.length > 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ms-h1">Tabulador de Personal</h1>
          <p className="text-gray-500 text-sm">{activos.length} roles activos · tarifas para cotización y proyectos</p>
        </div>
        <button
            onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#c9ac6a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo rol
          </button>
      </div>

      <Modal
        open={showForm}
        onClose={cancel}
        title={creating ? "Nuevo rol técnico" : `Editando: ${editing?.nombre}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => set("nombre", e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
              placeholder="Ej. Operador de Audio"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoría (disciplina)</label>
            <Combobox
              value={form.disciplina ?? ""}
              onChange={v => set("disciplina", v || null)}
              options={[
                { value: "", label: "— Sin categoría —" },
                ...DISCIPLINAS.map(d => ({ value: d, label: DISCIPLINA_LABELS[d] })),
              ]}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
            />
            <p className="text-[10px] text-gray-600 mt-1">Liga este rol con la base de técnicos para sugerencias.</p>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-gray-500 mb-1 block">Tipo de pago</label>
            <Combobox
              value={form.tipoPago}
              onChange={v => set("tipoPago", v)}
              options={[
                { value: "POR_JORNADA", label: "Por Jornada (0–8 / 8–12 / 12+ hrs)" },
                { value: "TARIFA_PLANA", label: "Tarifa Plana (por evento)" },
                { value: "POR_PROYECTO", label: "Por Proyecto" },
                { value: "POR_HORA", label: "Por Hora" },
              ]}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
            />
          </div>
        </div>

        {form.tipoPago === "POR_JORNADA" && (
          <div className="mb-5">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Tarifas por jornada</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "tarifaAAACorta" as const, label: "0–8 hrs" },
                { key: "tarifaAAAMedia" as const, label: "8–12 hrs" },
                { key: "tarifaAAALarga" as const, label: "+12 hrs" },
              ]).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={numVal(key)}
                    onChange={e => set(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {(form.tipoPago === "TARIFA_PLANA" || form.tipoPago === "POR_PROYECTO") && (
          <div className="mb-5">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Tarifas por evento</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "tarifaPlanaAAA" as const, label: "AAA" },
                { key: "tarifaPlanaAA" as const, label: "AA" },
                { key: "tarifaPlanaA" as const, label: "A" },
              ]).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={numVal(key)}
                    onChange={e => set(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {form.tipoPago === "POR_HORA" && (
          <div className="mb-5">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Tarifas por hora</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "tarifaHoraAAA" as const, label: "AAA" },
                { key: "tarifaHoraAA" as const, label: "AA" },
                { key: "tarifaHoraA" as const, label: "A" },
              ]).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label} · $ / hr</label>
                  <input
                    type="number"
                    value={numVal(key)}
                    onChange={e => set(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="text-xs text-gray-500 mb-1 block">Descripción (opcional)</label>
          <input
            value={form.descripcion ?? ""}
            onChange={e => set("descripcion", e.target.value || null)}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#B3985B]/50"
            placeholder="Notas sobre este rol..."
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          {editing && autoSaved && <span className="text-xs text-green-500">✓ Guardado</span>}
          {!editing && (
            <button
              onClick={save}
              disabled={saving || !form.nombre}
              className="bg-[#B3985B] hover:bg-[#c9ac6a] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? "Guardando..." : "Agregar rol"}
            </button>
          )}
        </div>
      </Modal>

      {/* Roles activos agrupados por categoría */}
      <div className="space-y-8">
        {secciones.map(({ disc, roles: rs }) => {
          const color = disc ? (DISCIPLINA_COLORS[disc] ?? "#9ca3af") : "#9ca3af";
          const label = disc ? (DISCIPLINA_LABELS[disc] ?? disc) : "Sin categoría";
          return (
            <section key={disc ?? "__none__"}>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color }}>{label}</h2>
                <span className="text-[10px] text-gray-600">{rs.length}</span>
              </div>
              <div className="space-y-2">
                {rs.map(r => (
                  <RolCard key={r.id} r={r} onEdit={startEdit} onToggle={toggleActivo} onDelete={eliminar} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Roles inactivos */}
      {inactivos.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">Inactivos</p>
          <div className="space-y-2 opacity-50">
            {inactivos.map(r => (
              <RolCard key={r.id} r={r} onEdit={startEdit} onToggle={toggleActivo} onDelete={eliminar} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RolCard({ r, onEdit, onToggle, onDelete }: {
  r: Rol;
  onEdit: (r: Rol) => void;
  onToggle: (r: Rol) => void;
  onDelete: (r: Rol) => void;
}) {
  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-white text-sm font-medium">{r.nombre}</span>
          {r.disciplina && (
            <span
              className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold"
              style={{ color: DISCIPLINA_COLORS[r.disciplina] ?? "#9ca3af", backgroundColor: `${DISCIPLINA_COLORS[r.disciplina] ?? "#9ca3af"}1a` }}
            >
              {DISCIPLINA_LABELS[r.disciplina] ?? r.disciplina}
            </span>
          )}
          <span className="text-[9px] uppercase tracking-widest text-[#B3985B]/70 bg-[#B3985B]/10 px-1.5 py-0.5 rounded">
            {TIPO_PAGO_LABELS[r.tipoPago] ?? r.tipoPago}
          </span>
        </div>

        {r.tipoPago === "POR_JORNADA" && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-600">0–8 hrs <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaAAACorta)}</span></span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">8–12 hrs <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaAAAMedia)}</span></span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">+12 hrs <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaAAALarga)}</span></span>
          </div>
        )}

        {(r.tipoPago === "TARIFA_PLANA" || r.tipoPago === "POR_PROYECTO") && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-600">AAA <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaPlanaAAA)}</span></span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">AA <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaPlanaAA)}</span></span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">A <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaPlanaA)}</span></span>
          </div>
        )}

        {r.tipoPago === "POR_HORA" && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-600">AAA <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaHoraAAA)}/hr</span></span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">AA <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaHoraAA)}/hr</span></span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">A <span className="text-gray-300 font-medium ml-1">{fmt(r.tarifaHoraA)}/hr</span></span>
          </div>
        )}

        {r.descripcion && <p className="text-gray-600 text-xs mt-1">{r.descripcion}</p>}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onEdit(r)}
          className="text-xs text-gray-500 hover:text-white px-2.5 py-1.5 border border-[#2a2a2a] rounded-lg transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => onToggle(r)}
          className="text-xs text-gray-600 hover:text-white px-2.5 py-1.5 border border-[#2a2a2a] rounded-lg transition-colors"
        >
          {r.activo ? "Desactivar" : "Activar"}
        </button>
        <button
          onClick={() => onDelete(r)}
          className="text-xs text-gray-700 hover:text-red-400 px-2.5 py-1.5 border border-[#2a2a2a] rounded-lg transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
