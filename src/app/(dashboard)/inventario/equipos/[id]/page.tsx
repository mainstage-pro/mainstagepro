"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { BackButton } from "@/components/BackButton";
import { EquipoGaleria } from "@/components/EquipoGaleria";
import { ESTADOS_EQUIPO as ESTADOS_UNIDAD, ESTADO_EQUIPO_LABEL } from "@/lib/equipo-estado";

const ESTADO_UNIDAD_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/30 text-green-400 border-green-900/50",
  EN_MANTENIMIENTO: "bg-yellow-900/30 text-yellow-400 border-yellow-900/50",
  EN_REPARACION: "bg-orange-900/30 text-orange-400 border-orange-900/50",
  DADO_DE_BAJA: "bg-red-900/30 text-red-400 border-red-900/50",
};
const VOLTAJES_UNIDAD = [
  { value: "110", label: "110V" },
  { value: "220", label: "220V" },
  { value: "AMBOS", label: "Ambos" },
];
function voltajeUnidadLabel(v: string | null) {
  if (!v) return null;
  return v === "AMBOS" ? "110V + 220V" : `${v}V`;
}
function fmtFechaCorta(s: string | null) {
  if (!s) return null;
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

type Unidad = {
  id: string; codigo: string | null; estado: string; voltaje: string | null;
  notas: string | null; _count: { mantenimientos: number };
  mantenimientos: { fecha: string; proximoMantenimiento: string | null; tipo: string }[];
};

const CATEGORIAS_ACC = ["cable", "herramienta", "consumible", "soporte", "otro"] as const;
type CategoriaAcc = typeof CATEGORIAS_ACC[number] | null;

const CAT_LABEL: Record<string, string> = {
  cable: "Cable",
  herramienta: "Herramienta",
  consumible: "Consumible",
  soporte: "Soporte",
  otro: "Otro",
};

const CAT_COLOR: Record<string, string> = {
  cable: "bg-blue-900/20 text-blue-400 border-blue-800/30",
  herramienta: "bg-orange-900/20 text-orange-400 border-orange-800/30",
  consumible: "bg-purple-900/20 text-purple-400 border-purple-800/30",
  soporte: "bg-green-900/20 text-green-400 border-green-800/30",
  otro: "bg-[#1a1a1a] text-[#6b7280] border-[#222]",
};

type Accesorio = {
  id: string;
  nombre: string;
  categoria: string | null;
};

type EquipoNota = {
  id: string;
  contenido: string;
  createdAt: string;
  creadoPor: { id: string; name: string };
};

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  estado: string;
  precioRenta: number;
  costoProveedor: number | null;
  cantidadTotal: number;
  notas: string | null;
  activo: boolean;
  amperajeRequerido: number | null;
  voltajeRequerido: string | null;
  imagenUrl: string | null;
  imagenesUrls: string | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; correo: string | null; telefono: string | null } | null;
  accesorios: Accesorio[];
  notasEquipo: EquipoNota[];
  mantenimientos: Array<{
    id: string; fecha: string; tipo: string;
    accionRealizada: string; estadoEquipo: string;
    comentarios: string | null; proximoMantenimiento: string | null;
  }>;
  proyectoEquipos: Array<{
    id: string;
    proyecto: {
      id: string; nombre: string; numeroProyecto: number;
      fechaEvento: string | null; estado: string;
      cliente: { nombre: string };
    };
  }>;
};

function AccesoriosSection({ equipoId, initial }: { equipoId: string; initial: Accesorio[] }) {
  const toast = useToast();
  const [accesorios, setAccesorios] = useState<Accesorio[]>(initial);
  const [adding, setAdding] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newCat, setNewCat] = useState<CategoriaAcc>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCat, setEditCat] = useState<CategoriaAcc>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  async function addAccesorio() {
    if (!newNombre.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/equipos/${equipoId}/accesorios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newNombre.trim(), categoria: newCat }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    const d = await r.json();
    if (d.accesorio) {
      setAccesorios(prev => {
        const exists = prev.find(a => a.id === d.accesorio.id);
        return exists ? prev : [...prev, d.accesorio].sort((a, b) => (a.categoria ?? "zzz").localeCompare(b.categoria ?? "zzz") || a.nombre.localeCompare(b.nombre));
      });
    }
    setNewNombre("");
    setNewCat(null);
    setAdding(false);
    setSaving(false);
  }

  async function saveEdit(id: string) {
    if (!editNombre.trim()) return;
    const r = await fetch(`/api/equipos/${equipoId}/accesorios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim(), categoria: editCat }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    const d = await r.json();
    if (d.accesorio) {
      setAccesorios(prev => prev.map(a => a.id === id ? d.accesorio : a));
    }
    setEditId(null);
  }

  async function deleteAccesorio(id: string) {
    setAccesorios(prev => prev.filter(a => a.id !== id));
    const r = await fetch(`/api/equipos/${equipoId}/accesorios/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      // Reload to restore the item
      const reload = await fetch(`/api/equipos/${equipoId}/accesorios`, { cache: "no-store" }).catch(() => null);
      if (reload?.ok) {
        const data = await reload.json();
        if (data.accesorios) setAccesorios(data.accesorios);
      }
    }
  }

  const grouped = CATEGORIAS_ACC.reduce<Record<string, Accesorio[]>>((acc, cat) => {
    acc[cat] = accesorios.filter(a => a.categoria === cat);
    return acc;
  }, {} as Record<string, Accesorio[]>);
  const sinCategoria = accesorios.filter(a => !a.categoria || !CATEGORIAS_ACC.includes(a.categoria as typeof CATEGORIAS_ACC[number]));

  return (
    <div className="ms-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">
          Accesorios y rider ({accesorios.length})
        </h2>
        <button
          onClick={() => { setAdding(true); setEditId(null); }}
          className="flex items-center gap-1 text-xs text-[#B3985B] hover:text-[#c9a96a] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Agregar
        </button>
      </div>

      {/* Formulario nuevo */}
      {adding && (
        <div className="mb-4 p-3 bg-[#0d0d0d] border border-[#B3985B]/20 rounded-lg space-y-2">
          <input
            ref={inputRef}
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addAccesorio(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Nombre del accesorio..."
            className="w-full bg-[#111] border border-[#222] rounded px-3 py-1.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS_ACC.map(cat => (
              <button key={cat} onClick={() => setNewCat(newCat === cat ? null : cat)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${newCat === cat ? CAT_COLOR[cat] + " font-semibold" : "bg-transparent text-[#555] border-[#222] hover:border-[#444]"}`}>
                {CAT_LABEL[cat]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setAdding(false)} className="text-xs text-[#555] hover:text-white transition-colors px-2 py-1">Cancelar</button>
            <button onClick={addAccesorio} disabled={saving || !newNombre.trim()}
              className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-3 py-1 rounded disabled:opacity-40 transition-colors">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {accesorios.length === 0 && !adding ? (
        <p className="text-[#444] text-xs text-center py-6">
          Sin accesorios registrados. Se agregarán automáticamente desde el rider de proyectos.
        </p>
      ) : (
        <div className="space-y-3">
          {(Object.entries(grouped) as [string, Accesorio[]][])
            .filter(([, items]) => items.length > 0)
            .map(([cat, items]) => (
              <div key={cat}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1 ${CAT_COLOR[cat].split(" ")[1]}`}>{CAT_LABEL[cat]}</p>
                <div className="space-y-1">
                  {items.map(a => (
                    <AccesorioRow key={a.id} a={a} editing={editId === a.id}
                      editNombre={editNombre} editCat={editCat}
                      onStartEdit={() => { setEditId(a.id); setEditNombre(a.nombre); setEditCat(a.categoria as CategoriaAcc); setAdding(false); }}
                      onEditNombre={setEditNombre} onEditCat={setEditCat}
                      onSave={() => saveEdit(a.id)} onCancel={() => setEditId(null)}
                      onDelete={() => deleteAccesorio(a.id)} />
                  ))}
                </div>
              </div>
            ))}
          {sinCategoria.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1 text-[#555]">Sin categoría</p>
              <div className="space-y-1">
                {sinCategoria.map(a => (
                  <AccesorioRow key={a.id} a={a} editing={editId === a.id}
                    editNombre={editNombre} editCat={editCat}
                    onStartEdit={() => { setEditId(a.id); setEditNombre(a.nombre); setEditCat(a.categoria as CategoriaAcc); setAdding(false); }}
                    onEditNombre={setEditNombre} onEditCat={setEditCat}
                    onSave={() => saveEdit(a.id)} onCancel={() => setEditId(null)}
                    onDelete={() => deleteAccesorio(a.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccesorioRow({ a, editing, editNombre, editCat, onStartEdit, onEditNombre, onEditCat, onSave, onCancel, onDelete }: {
  a: Accesorio;
  editing: boolean;
  editNombre: string;
  editCat: CategoriaAcc;
  onStartEdit: () => void;
  onEditNombre: (v: string) => void;
  onEditCat: (v: CategoriaAcc) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <div className="p-2 bg-[#0d0d0d] border border-[#B3985B]/20 rounded-lg space-y-1.5">
        <input
          ref={inputRef}
          value={editNombre}
          onChange={e => onEditNombre(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          className="w-full bg-[#111] border border-[#222] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#B3985B]/50"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIAS_ACC.map(cat => (
            <button key={cat} onClick={() => onEditCat(editCat === cat ? null : cat)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${editCat === cat ? CAT_COLOR[cat] + " font-semibold" : "bg-transparent text-[#555] border-[#222] hover:border-[#444]"}`}>
              {CAT_LABEL[cat]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="text-[10px] text-[#555] hover:text-white transition-colors px-1.5 py-0.5">Cancelar</button>
          <button onClick={onSave} className="text-[10px] bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-2 py-0.5 rounded transition-colors">Guardar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#0d0d0d] transition-colors">
      <span className="flex-1 text-xs text-[#9ca3af] group-hover:text-white transition-colors truncate">{a.nombre}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onStartEdit} className="text-[#555] hover:text-[#B3985B] transition-colors p-0.5" title="Editar">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button onClick={onDelete} className="text-[#555] hover:text-red-400 transition-colors p-0.5" title="Eliminar">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function NotasSection({ equipoId, initial }: { equipoId: string; initial: EquipoNota[] }) {
  const toast = useToast();
  const [notas, setNotas] = useState<EquipoNota[]>(initial);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function addNota() {
    if (!texto.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/equipos/${equipoId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: texto.trim() }),
    });
    if (!r.ok) { toast.error("Error al guardar nota"); setSaving(false); return; }
    const d = await r.json();
    if (d.nota) setNotas(prev => [d.nota, ...prev]);
    setTexto("");
    setSaving(false);
  }

  async function deleteNota(id: string) {
    setNotas(prev => prev.filter(n => n.id !== id));
    const r = await fetch(`/api/equipos/${equipoId}/notas/${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error("Error al eliminar");
      const reload = await fetch(`/api/equipos/${equipoId}/notas`, { cache: "no-store" }).catch(() => null);
      if (reload?.ok) { const d = await reload.json(); if (d.notas) setNotas(d.notas); }
    }
  }

  function fmtFecha(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="ms-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">
          Notas {notas.length > 0 && <span className="text-[#555] font-normal">({notas.length})</span>}
        </h2>
      </div>

      {/* Agregar nota */}
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNota(); }}
          placeholder="Escribe una nota sobre este equipo…"
          rows={3}
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 resize-none transition-colors"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-[#3a3a3a]">⌘ + Enter para guardar</span>
          <button
            onClick={addNota}
            disabled={saving || !texto.trim()}
            className="px-3 py-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold rounded-lg transition-colors"
          >
            {saving ? "Guardando…" : "Agregar nota"}
          </button>
        </div>
      </div>

      {/* Lista de notas */}
      {notas.length === 0 ? (
        <p className="text-[#333] text-xs text-center py-4">Aún no hay notas para este equipo</p>
      ) : (
        <div className="space-y-3">
          {notas.map(n => (
            <div key={n.id} className="group flex items-start gap-3 p-3 bg-[#0d0d0d] rounded-lg border border-[#1a1a1a]">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{n.contenido}</p>
                <p className="text-[#444] text-[10px] mt-1.5">
                  {n.creadoPor.name} · {fmtFecha(n.createdAt)}
                </p>
              </div>
              <button
                onClick={() => deleteNota(n.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#444] hover:text-red-400 p-0.5 mt-0.5 shrink-0"
                title="Eliminar nota"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnidadesSection({ equipoId, cantidadTotal }: { equipoId: string; cantidadTotal: number }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ codigo: "", estado: "ACTIVO", voltaje: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const emptyForm = { codigo: "", estado: "ACTIVO", voltaje: "", notas: "" };

  const reload = async () => {
    const r = await fetch(`/api/equipos/${equipoId}/unidades`, { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setUnidades(d.unidades ?? []); }
  };

  useEffect(() => { reload().finally(() => setLoading(false)); }, [equipoId]); // eslint-disable-line react-hooks/exhaustive-deps

  function startAdd() { setForm(emptyForm); setEditId(null); setShowForm(true); }
  function startEdit(u: Unidad) {
    setForm({ codigo: u.codigo ?? "", estado: u.estado, voltaje: u.voltaje ?? "", notas: u.notas ?? "" });
    setEditId(u.id); setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const payload = { codigo: form.codigo || null, estado: form.estado, voltaje: form.voltaje || null, notas: form.notas || null };
    const url = editId ? `/api/equipos/${equipoId}/unidades/${editId}` : `/api/equipos/${equipoId}/unidades`;
    const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { toast.error("Error al guardar unidad"); setSaving(false); return; }
    await reload();
    setShowForm(false); setEditId(null); setForm(emptyForm); setSaving(false);
  }

  async function generar() {
    for (let i = 1; i <= cantidadTotal; i++) {
      await fetch(`/api/equipos/${equipoId}/unidades`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: `Unidad ${i}` }),
      });
    }
    await reload();
  }

  async function eliminar(id: string) {
    if (!await confirm({ message: "¿Eliminar esta unidad? Se perderá su historial de mantenimiento.", danger: true, confirmText: "Eliminar" })) return;
    setUnidades(prev => prev.filter(u => u.id !== id));
    const r = await fetch(`/api/equipos/${equipoId}/unidades/${id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("Error al eliminar"); reload(); }
  }

  const voltajeResumen = (() => {
    const counts = unidades.reduce<Record<string, number>>((acc, u) => {
      if (u.voltaje) acc[u.voltaje] = (acc[u.voltaje] ?? 0) + 1;
      return acc;
    }, {});
    const parts = VOLTAJES_UNIDAD.filter(v => counts[v.value]).map(v => `${counts[v.value]}× ${v.label}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  return (
    <div className="ms-card p-5">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">
            Unidades individuales {unidades.length > 0 && <span className="text-[#555] font-normal">({unidades.length})</span>}
          </h2>
          {voltajeResumen && <p className="text-[10px] text-yellow-500/80 mt-0.5">{voltajeResumen}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!loading && unidades.length === 0 && cantidadTotal > 0 && (
            <button onClick={generar}
              className="text-[10px] text-[#B3985B] hover:text-white border border-[#B3985B]/30 px-2 py-1 rounded transition-colors">
              Generar {cantidadTotal} unidades
            </button>
          )}
          <button onClick={startAdd}
            className="text-[10px] text-gray-500 hover:text-white border border-[#222] px-2 py-1 rounded transition-colors">
            + Agregar
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-[#0d0d0d] border border-[#B3985B]/20 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-gray-600 mb-1 block">Código / N° serie / Etiqueta</label>
              <input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                placeholder="Ej: SN-12345, Tag #3, Unidad A..."
                className="w-full bg-[#111] border border-[#222] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]/50" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 mb-1 block">Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full bg-[#111] border border-[#222] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]/50">
                {ESTADOS_UNIDAD.map(s => <option key={s} value={s}>{ESTADO_EQUIPO_LABEL[s] ?? s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Voltaje</label>
            <div className="flex gap-1.5">
              {VOLTAJES_UNIDAD.map(v => (
                <button key={v.value} type="button"
                  onClick={() => setForm(p => ({ ...p, voltaje: p.voltaje === v.value ? "" : v.value }))}
                  className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                    form.voltaje === v.value
                      ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/50 font-semibold"
                      : "bg-transparent text-gray-500 border-[#333] hover:border-[#555]"
                  }`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Notas</label>
            <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              placeholder="Observaciones de esta unidad..."
              className="w-full bg-[#111] border border-[#222] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-xs text-[#555] hover:text-white transition-colors px-2 py-1">Cancelar</button>
            <button onClick={save} disabled={saving}
              className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-3 py-1 rounded disabled:opacity-40 transition-colors">
              {saving ? "Guardando…" : editId ? "Actualizar" : "Agregar unidad"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[#444] text-xs text-center py-4">Cargando unidades…</p>
      ) : unidades.length === 0 ? (
        <p className="text-[#444] text-xs text-center py-6">
          Sin unidades registradas. Usa &quot;Generar {cantidadTotal} unidades&quot; para crearlas y luego edita cada una.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {unidades.map((u, idx) => {
            const lastMaint = u.mantenimientos[0];
            return (
              <div key={u.id} className="group p-3 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <p className="text-xs font-semibold text-white truncate">{u.codigo || `Unidad ${idx + 1}`}</p>
                  <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(u)} className="text-[9px] text-gray-600 hover:text-[#B3985B] transition-colors">Editar</button>
                    <button onClick={() => eliminar(u.id)} className="text-[9px] text-gray-600 hover:text-red-400 transition-colors">×</button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${ESTADO_UNIDAD_BADGE[u.estado] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                    {ESTADO_EQUIPO_LABEL[u.estado] ?? u.estado}
                  </span>
                  {u.voltaje && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border font-semibold bg-yellow-900/20 text-yellow-400 border-yellow-900/40">
                      {voltajeUnidadLabel(u.voltaje)}
                    </span>
                  )}
                </div>
                {u.notas && <p className="text-gray-600 text-[9px] mt-1 truncate">{u.notas}</p>}
                <p className="text-[9px] text-gray-600 mt-1.5">
                  {lastMaint ? <>Últ. mant: {fmtFechaCorta(lastMaint.fecha)} · {u._count.mantenimientos} reg.</> : "Sin mantenimientos"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {unidades.length > 0 && (
        <Link href={`/inventario/mantenimiento?equipoId=${equipoId}`}
          className="text-[10px] text-gray-500 hover:text-[#B3985B] transition-colors mt-3 inline-block">
          Ver historial de mantenimiento por unidad →
        </Link>
      )}
    </div>
  );
}

export default function EquipoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/equipos/${id}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setEquipo(d.equipo ?? null); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[#1a1a1a] rounded w-48" />
          <div className="h-7 bg-[#1a1a1a] rounded w-96" />
          <div className="h-64 bg-[#1a1a1a] rounded-xl mt-6" />
        </div>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center space-y-3">
        <p className="text-[#6b7280]">Equipo no encontrado.</p>
        <Link href="/inventario/equipos" className="text-[#B3985B] text-sm hover:underline">← Volver al inventario</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="mb-2"><BackButton /></div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/inventario/equipos" className="text-xs text-[#6b7280] hover:text-[#B3985B] transition-colors mb-1.5 inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Inventario de equipos
          </Link>
          <div className="flex items-center gap-3">
            {equipo.imagenUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={equipo.imagenUrl} alt="" className="w-12 h-12 object-contain rounded-lg bg-[#0a0a0a] p-1 shrink-0" />
            )}
            <div>
              <h1 className="ms-h1">{[equipo.marca, equipo.modelo].filter(Boolean).join(" · ") || equipo.descripcion}</h1>
              <p className="ms-subtitle mt-0.5">
                {[equipo.marca, equipo.modelo].filter(Boolean).length > 0 && <span>{equipo.descripcion} · </span>}
                {equipo.categoria.nombre}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded font-medium ${equipo.activo ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {equipo.activo ? "ACTIVO" : "INACTIVO"}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#6b7280] border border-[#222]">
            {equipo.tipo === "PROPIO" ? "Propio" : "Externo"}
          </span>
        </div>
      </div>

      {/* Datos rápidos */}
      <div className="ms-card p-5">
        <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">Datos del equipo</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-[#6b7280] text-xs mb-0.5">Cantidad</dt>
            <dd className="text-white">{equipo.cantidadTotal}</dd>
          </div>
          {(equipo.amperajeRequerido != null || equipo.voltajeRequerido != null) && (
            <div>
              <dt className="text-[#6b7280] text-xs mb-0.5">Eléctrico</dt>
              <dd className="text-yellow-400 text-xs">
                {equipo.amperajeRequerido != null ? `${equipo.amperajeRequerido}A` : ""}
                {equipo.amperajeRequerido != null && equipo.voltajeRequerido != null ? " · " : ""}
                {equipo.voltajeRequerido === "AMBOS" ? "110V + 220V" : equipo.voltajeRequerido != null ? `${equipo.voltajeRequerido}V` : ""}
              </dd>
            </div>
          )}
          {equipo.proveedorDefault && (
            <div>
              <dt className="text-[#6b7280] text-xs mb-0.5">Proveedor</dt>
              <dd className="text-white text-xs">{equipo.proveedorDefault.nombre}</dd>
            </div>
          )}
          {equipo.notas && (
            <div className="col-span-2 sm:col-span-4 border-t border-[#1a1a1a] pt-3 mt-1">
              <dt className="text-[#6b7280] text-xs mb-1">Notas</dt>
              <dd className="text-[#9ca3af] text-xs leading-relaxed">{equipo.notas}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Unidades individuales */}
      <UnidadesSection equipoId={equipo.id} cantidadTotal={equipo.cantidadTotal} />

      {/* Accesorios */}
      <AccesoriosSection equipoId={equipo.id} initial={equipo.accesorios} />

      {/* Galería */}
      <div className="ms-card p-5">
        <EquipoGaleria equipoId={equipo.id} initial={equipo.imagenesUrls} />
      </div>

      {/* Notas */}
      <NotasSection equipoId={equipo.id} initial={equipo.notasEquipo} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proyectos */}
        {equipo.proyectoEquipos.length > 0 && (
          <div className="ms-card p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">
              Proyectos ({equipo.proyectoEquipos.length})
            </h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {equipo.proyectoEquipos.map(pe => (
                <Link key={pe.id} href={`/proyectos/${pe.proyecto.id}`}
                  className="flex items-center justify-between text-xs p-2 rounded bg-[#0d0d0d] hover:bg-[#1a1a1a] transition-colors group">
                  <div className="min-w-0">
                    <p className="text-white group-hover:text-[#B3985B] transition-colors truncate">
                      #{pe.proyecto.numeroProyecto} — {pe.proyecto.nombre}
                    </p>
                    <p className="text-[#555] truncate">{pe.proyecto.cliente.nombre}</p>
                  </div>
                  {pe.proyecto.fechaEvento && (
                    <span className="text-[#555] shrink-0 ml-3">
                      {new Date(pe.proyecto.fechaEvento).toLocaleDateString("es-MX", { timeZone: "UTC", month: "short", day: "numeric", year: "2-digit" })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mantenimiento */}
        {equipo.mantenimientos.length > 0 && (
          <div className="ms-card p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">
              Mantenimiento ({equipo.mantenimientos.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {equipo.mantenimientos.map(m => (
                <div key={m.id} className="flex items-start gap-4 text-xs p-3 bg-[#0d0d0d] rounded-lg">
                  <div className="shrink-0 text-[#555] w-20 pt-0.5">
                    {(() => { const iso = typeof m.fecha === "string" ? m.fecha : (m.fecha as Date).toISOString(); const [y, mo, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, mo - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" }); })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white">{m.accionRealizada}</p>
                    {m.comentarios && <p className="text-[#6b7280] mt-0.5">{m.comentarios}</p>}
                    {m.proximoMantenimiento && (
                      <p className="text-yellow-600/70 mt-0.5">
                        Próximo: {(() => { const iso = typeof m.proximoMantenimiento === "string" ? m.proximoMantenimiento : (m.proximoMantenimiento as Date).toISOString(); const [y, mo, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, mo - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" }); })()}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#6b7280] text-[10px]">{m.tipo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {equipo.proyectoEquipos.length === 0 && equipo.mantenimientos.length === 0 && (
        <div className="text-center py-8 text-[#333]">
          <p className="text-sm">Aún no hay historial de proyectos ni mantenimientos para este equipo.</p>
          <Link href="/inventario/equipos" className="text-[#B3985B] text-xs mt-3 inline-block hover:underline">← Volver al inventario</Link>
        </div>
      )}
    </div>
  );
}
