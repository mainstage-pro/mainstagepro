"use client";

import React, { useEffect, useState, useRef } from "react";

type Rol = {
  id: string;
  nombre: string;
  tipoPago: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  tarifaAAACorta: number | null; tarifaAAAMedia: number | null; tarifaAAALarga: number | null;
  tarifaAACorta: number | null;  tarifaAAMedia: number | null;  tarifaAALarga: number | null;
  tarifaACorta: number | null;   tarifaAMedia: number | null;   tarifaALarga: number | null;
  tarifaPlanaAAA: number | null; tarifaPlanaAA: number | null;  tarifaPlanaA: number | null;
  tarifaHoraAAA: number | null;  tarifaHoraAA: number | null;   tarifaHoraA: number | null;
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
  nombre: "", tipoPago: "POR_JORNADA", descripcion: null, activo: true, orden: 0,
  tarifaAAACorta: null, tarifaAAAMedia: null, tarifaAAALarga: null,
  tarifaAACorta: null,  tarifaAAMedia: null,  tarifaAALarga: null,
  tarifaACorta: null,   tarifaAMedia: null,   tarifaALarga: null,
  tarifaPlanaAAA: null, tarifaPlanaAA: null,  tarifaPlanaA: null,
  tarifaHoraAAA: null,  tarifaHoraAA: null,   tarifaHoraA: null,
};

export default function RolesPage() {
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
      await fetch(`/api/roles-tecnicos/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setRoles(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r));
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000);
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
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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

  const showForm = editing !== null || creating;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Roles Técnicos</h1>
          <p className="text-[#6b7280] text-sm">{roles.length} roles · tarifas para cotización</p>
        </div>
        {!showForm && (
          <button
            onClick={startCreate}
            className="bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            + Nuevo rol
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-6">
          <h2 className="text-white font-medium mb-4">{creating ? "Nuevo rol técnico" : `Editando: ${editing?.nombre}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="text-xs text-[#6b7280] mb-1 block">Nombre *</label>
              <input
                value={form.nombre}
                onChange={e => set("nombre", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                placeholder="Ej. Operador de Audio"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Tipo de pago</label>
              <select
                value={form.tipoPago}
                onChange={e => set("tipoPago", e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
              >
                <option value="POR_JORNADA">Por Jornada (0–8 hrs / 8–12 hrs / 12+ hrs)</option>
                <option value="TARIFA_PLANA">Tarifa Plana (por evento)</option>
                <option value="POR_HORA">Por Hora</option>
                <option value="POR_PROYECTO">Por Proyecto</option>
              </select>
            </div>
          </div>

          {form.tipoPago === "POR_JORNADA" && (
            <div className="mb-4">
              <p className="text-xs text-[#6b7280] mb-2 uppercase tracking-wide">Tarifas por jornada (0–8 hrs / 8–12 hrs / 12+ hrs)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["AAA","AA","A"] as const).map(nivel => (
                  <div key={nivel} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#B3985B] mb-2">Nivel {nivel}</p>
                    {(["Corta","Media","Larga"] as const).map(jornada => {
                      const key = `tarifa${nivel}${jornada}` as keyof Omit<Rol,"id">;
                      const jornadaLabel = jornada === "Corta" ? "0–8 hrs" : jornada === "Media" ? "8–12 hrs" : "12+ hrs";
                      return (
                        <div key={jornada} className="mb-2">
                          <label className="text-xs text-[#6b7280] block mb-1">{jornadaLabel}</label>
                          <input
                            type="number"
                            value={numVal(key)}
                            onChange={e => set(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-[#B3985B]"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(form.tipoPago === "TARIFA_PLANA" || form.tipoPago === "POR_PROYECTO") && (
            <div className="mb-4">
              <p className="text-xs text-[#6b7280] mb-2 uppercase tracking-wide">Tarifa por nivel</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["AAA","AA","A"] as const).map(nivel => {
                  const key = `tarifaPlana${nivel}` as keyof Omit<Rol,"id">;
                  return (
                    <div key={nivel}>
                      <label className="text-xs text-[#6b7280] block mb-1">Nivel {nivel}</label>
                      <input
                        type="number"
                        value={numVal(key)}
                        onChange={e => set(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {form.tipoPago === "POR_HORA" && (
            <div className="mb-4">
              <p className="text-xs text-[#6b7280] mb-2 uppercase tracking-wide">Tarifa por hora</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["AAA","AA","A"] as const).map(nivel => {
                  const key = `tarifaHora${nivel}` as keyof Omit<Rol,"id">;
                  return (
                    <div key={nivel}>
                      <label className="text-xs text-[#6b7280] block mb-1">Nivel {nivel}</label>
                      <input
                        type="number"
                        value={numVal(key)}
                        onChange={e => set(key, e.target.value === "" ? null : parseFloat(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="text-xs text-[#6b7280] mb-1 block">Descripción (opcional)</label>
            <input
              value={form.descripcion ?? ""}
              onChange={e => set("descripcion", e.target.value || null)}
              className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#B3985B]"
              placeholder="Notas sobre este rol..."
            />
          </div>

          <div className="flex items-center gap-3">
            {editing && autoSaved && <span className="text-xs text-green-500">✓ Guardado</span>}
            {!editing && (
              <button onClick={save} disabled={saving || !form.nombre}
                className="bg-[#B3985B] hover:bg-[#b8963e] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors">
                {saving ? "Guardando..." : "Agregar rol"}
              </button>
            )}
            <button
              onClick={cancel}
              className="text-sm text-[#6b7280] hover:text-white px-4 py-2 rounded-md border border-[#333] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {roles.map(r => (
          <div key={r.id} className={`bg-[#111] border rounded-lg p-4 ${!r.activo ? "opacity-50 border-[#1a1a1a]" : "border-[#222]"}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-medium">{r.nombre}</span>
                  <span className="text-xs bg-[#1a1a1a] text-[#B3985B] px-2 py-0.5 rounded">
                    {TIPO_PAGO_LABELS[r.tipoPago] ?? r.tipoPago}
                  </span>
                  {!r.activo && <span className="text-xs text-[#6b7280]">Inactivo</span>}
                </div>

                {r.tipoPago === "POR_JORNADA" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs mt-2 max-w-md">
                    <div className="text-[#6b7280]"></div>
                    {["AAA","AA","A"].map(n => <div key={n} className="text-[#B3985B] font-semibold text-center">{n}</div>)}
                    {(["Corta","Media","Larga"] as const).map(j => (
                      <React.Fragment key={j}>
                        <div className="text-[#6b7280]">{j === "Corta" ? "0–8 hrs" : j === "Media" ? "8–12 hrs" : "12+ hrs"}</div>
                        {(["AAA","AA","A"] as const).map(n => {
                          const key = `tarifa${n}${j}` as keyof Rol;
                          return <div key={n+j} className="text-white text-center">{fmt(r[key] as number | null)}</div>;
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {(r.tipoPago === "TARIFA_PLANA" || r.tipoPago === "POR_PROYECTO") && (
                  <div className="flex gap-6 text-xs mt-2">
                    {(["AAA","AA","A"] as const).map(n => {
                      const key = `tarifaPlana${n}` as keyof Rol;
                      return (
                        <div key={n}>
                          <span className="text-[#B3985B] font-semibold">{n}: </span>
                          <span className="text-white">{fmt(r[key] as number | null)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {r.tipoPago === "POR_HORA" && (
                  <div className="flex gap-6 text-xs mt-2">
                    {(["AAA","AA","A"] as const).map(n => {
                      const key = `tarifaHora${n}` as keyof Rol;
                      return (
                        <div key={n}>
                          <span className="text-[#B3985B] font-semibold">{n}: </span>
                          <span className="text-white">{fmt(r[key] as number | null)}/hr</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {r.descripcion && <p className="text-[#6b7280] text-xs mt-2">{r.descripcion}</p>}
              </div>

              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => startEdit(r)}
                  className="text-xs text-[#B3985B] hover:text-white transition-colors px-2 py-1 border border-[#333] rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActivo(r)}
                  className="text-xs text-[#6b7280] hover:text-white transition-colors px-2 py-1 border border-[#333] rounded"
                >
                  {r.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
