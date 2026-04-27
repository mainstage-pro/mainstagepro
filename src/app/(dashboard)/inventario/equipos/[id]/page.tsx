"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  voltajeRequerido: number | null;
  imagenUrl: string | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; correo: string | null; telefono: string | null } | null;
  accesorios: Accesorio[];
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

function fmt(n: number) {
  if (n === 0) return "INCLUYE";
  return `$${n.toLocaleString("es-MX")}`;
}

function AccesoriosSection({ equipoId, initial }: { equipoId: string; initial: Accesorio[] }) {
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
    const d = await r.json();
    if (d.accesorio) {
      setAccesorios(prev => prev.map(a => a.id === id ? d.accesorio : a));
    }
    setEditId(null);
  }

  async function deleteAccesorio(id: string) {
    setAccesorios(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/equipos/${equipoId}/accesorios/${id}`, { method: "DELETE" });
  }

  const grouped = CATEGORIAS_ACC.reduce<Record<string, Accesorio[]>>((acc, cat) => {
    acc[cat] = accesorios.filter(a => a.categoria === cat);
    return acc;
  }, {} as Record<string, Accesorio[]>);
  const sinCategoria = accesorios.filter(a => !a.categoria || !CATEGORIAS_ACC.includes(a.categoria as typeof CATEGORIAS_ACC[number]));

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
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
            className="w-full bg-[#111] border border-[#222] rounded px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
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
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">

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
              <h1 className="text-xl font-semibold text-white">{equipo.descripcion}</h1>
              <p className="text-[#6b7280] text-sm mt-0.5">
                {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                {[equipo.marca, equipo.modelo].filter(Boolean).length > 0 && " · "}
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
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">Datos del equipo</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-[#6b7280] text-xs mb-0.5">Precio al cliente</dt>
            <dd className="text-white font-medium">{fmt(equipo.precioRenta)}</dd>
          </div>
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
                {equipo.voltajeRequerido != null ? `${equipo.voltajeRequerido}V` : ""}
              </dd>
            </div>
          )}
          {equipo.tipo === "EXTERNO" && equipo.costoProveedor != null && (
            <div>
              <dt className="text-[#6b7280] text-xs mb-0.5">Costo proveedor</dt>
              <dd className="text-white">{fmt(equipo.costoProveedor)}</dd>
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

      {/* Accesorios */}
      <AccesoriosSection equipoId={equipo.id} initial={equipo.accesorios} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proyectos */}
        {equipo.proyectoEquipos.length > 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
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
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
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
