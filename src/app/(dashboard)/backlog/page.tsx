"use client";

import { useEffect, useState } from "react";

const AREA_LABELS: Record<string, string> = {
  DIRECCION:     "Dirección",
  ADMINISTRACION:"Administración",
  MARKETING:     "Marketing",
  VENTAS:        "Ventas",
  PRODUCCION:    "Producción",
};

const AREA_COLORS: Record<string, string> = {
  DIRECCION:     "bg-purple-900/30 text-purple-400",
  ADMINISTRACION:"bg-blue-900/30 text-blue-400",
  MARKETING:     "bg-pink-900/30 text-pink-400",
  VENTAS:        "bg-green-900/30 text-green-400",
  PRODUCCION:    "bg-yellow-900/30 text-yellow-400",
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_JUNTA:  "En junta",
  CONVERTIDO:"Convertido",
  DESCARTADO:"Descartado",
};

type BacklogItem = {
  id: string;
  titulo: string;
  descripcion: string | null;
  area: string | null;
  tipo: string;
  estado: string;
  procesadoEn: string | null;
  createdAt: string;
  creadoPor: { id: string; name: string };
};

type Junta = { id: string; titulo: string; area: string; fecha: string };
type User  = { id: string; name: string };

function ModalCaptura({ onSave, onClose }: { onSave: (item: BacklogItem) => void; onClose: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [area, setArea]     = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!titulo.trim()) return;
    setSaving(true);
    const res = await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: titulo.trim(), area: area || null, tipo: "IDEA" }),
    });
    if (res.ok) {
      const d = await res.json();
      onSave(d.item);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-sm">Nueva idea o pendiente</h2>

        <input
          autoFocus
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSave(); }}
          placeholder="¿Qué hay que hacer o explorar?"
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50"
        />

        <select value={area} onChange={e => setArea(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">Área (opcional)</option>
          {Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !titulo.trim()}
            className="px-4 py-2 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">
            {saving ? "Guardando..." : "Capturar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalProcesar({ item, users, juntas, onDone, onClose }: {
  item: BacklogItem; users: User[]; juntas: Junta[]; onDone: () => void; onClose: () => void;
}) {
  const [accion, setAccion]   = useState<"junta"|"tarea"|"proyecto"|"descartar">("tarea");
  const [juntaId, setJuntaId] = useState("");
  const [titulo, setTitulo]   = useState(item.titulo);
  const [asignadoAId, setAsign] = useState("");
  const [fecha, setFecha]     = useState("");
  const [prioridad, setPrio]  = useState("MEDIA");
  const [area, setArea]       = useState(item.area ?? "DIRECCION");
  const [nombre, setNombre]   = useState(item.titulo);
  const [saving, setSaving]   = useState(false);

  async function handleProcesar() {
    setSaving(true);
    const datos: Record<string, string | undefined> =
      accion === "junta"    ? { juntaId } :
      accion === "tarea"    ? { titulo, asignadoAId, fecha: fecha || undefined, prioridad, area } :
      accion === "proyecto" ? { nombre, area } : {};

    await fetch(`/api/backlog/${item.id}/procesar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, datos }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="text-white font-semibold text-sm">Procesar</h2>
          <p className="text-[#555] text-xs mt-0.5">{item.titulo}</p>
        </div>

        <div className="space-y-2">
          {(["junta","tarea","proyecto","descartar"] as const).map(a => (
            <label key={a} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              accion === a ? "border-[#B3985B]/50 bg-[#B3985B]/5" : "border-[#1a1a1a] hover:border-[#2a2a2a]"
            }`}>
              <input type="radio" name="accion" value={a} checked={accion === a} onChange={() => setAccion(a)} className="mt-0.5 accent-[#B3985B]" />
              <div>
                <p className="text-sm text-white font-medium">
                  {a === "junta" ? "Enviar a junta del área" : a === "tarea" ? "Convertir en tarea" : a === "proyecto" ? "Convertir en proyecto" : "Descartar"}
                </p>
                <p className="text-xs text-[#444] mt-0.5">
                  {a === "junta" ? "Aparece como tema adicional en la próxima junta" :
                   a === "tarea" ? "Se crea en Gestión Operativa" :
                   a === "proyecto" ? "Se crea en Proyectos Internos" :
                   "Se marca como descartado para referencia futura"}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          {accion === "junta" && (
            <select value={juntaId} onChange={e => setJuntaId(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Seleccionar junta...</option>
              {juntas.map(j => (
                <option key={j.id} value={j.id}>
                  {j.titulo} · {new Date(j.fecha).toLocaleDateString("es-MX", { day:"numeric", month:"short" })}
                </option>
              ))}
            </select>
          )}
          {accion === "tarea" && (
            <>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333]" />
              <div className="grid grid-cols-2 gap-2">
                <select value={asignadoAId} onChange={e => setAsign(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Asignado a...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select value={prioridad} onChange={e => setPrio(e.target.value)}
                  className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="URGENTE">Urgente</option>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white" />
            </>
          )}
          {accion === "proyecto" && (
            <>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del proyecto"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333]" />
              <select value={area} onChange={e => setArea(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white">
                {Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleProcesar} disabled={saving}
            className="px-4 py-2 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">
            {saving ? "Procesando..." : "Procesar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BacklogPage() {
  const [items, setItems]           = useState<BacklogItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [estadoFiltro, setEstado]   = useState("PENDIENTE");
  const [showCaptura, setCaptura]   = useState(false);
  const [procesando, setProcesando] = useState<BacklogItem | null>(null);
  const [users, setUsers]           = useState<User[]>([]);
  const [juntas, setJuntas]         = useState<Junta[]>([]);

  function load(estado = estadoFiltro) {
    setLoading(true);
    fetch(`/api/backlog?estado=${estado}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setLoading(false); });
  }

  useEffect(() => {
    load();
    fetch("/api/usuarios").then(r => r.json()).then(d => setUsers(d.users ?? [])).catch(() => {});
    fetch("/api/juntas?estado=PROGRAMADA").then(r => r.json()).then(d => setJuntas(d.juntas ?? [])).catch(() => {});
  }, []);

  function changeEstado(e: string) { setEstado(e); load(e); }

  function formatRelativo(iso: string) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) return "hoy";
    if (d === 1) return "ayer";
    return `hace ${d}d`;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Operaciones</p>
          <h1 className="text-white text-2xl font-bold">Backlog</h1>
          <p className="text-[#555] text-sm mt-1">Captura ideas y pendientes — procesar los viernes</p>
        </div>
        <button onClick={() => setCaptura(true)}
          className="shrink-0 bg-[#B3985B] hover:bg-[#b8963e] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Capturar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ESTADO_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => changeEstado(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              estadoFiltro === k ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
            }`}>
            {v}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-[#444] text-sm">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#333] text-sm">Sin items {ESTADO_LABELS[estadoFiltro]?.toLowerCase()}</p>
          {estadoFiltro === "PENDIENTE" && (
            <p className="text-[#222] text-xs mt-1">Usa el botón de arriba para capturar</p>
          )}
        </div>
      ) : (
        <div className="space-y-px">
          {items.map(item => (
            <div key={item.id}
              className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-[#0d0d0d] group transition-colors">
              {/* Círculo */}
              <div className="shrink-0 w-5 h-5 rounded-full border border-[#2a2a2a] group-hover:border-[#B3985B]/40 transition-colors" />

              {/* Contenido */}
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-white">{item.titulo}</span>
                {item.area && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${AREA_COLORS[item.area] ?? "bg-[#222] text-[#666]"}`}>
                    {AREA_LABELS[item.area]}
                  </span>
                )}
                <span className="text-[11px] text-[#444]">{formatRelativo(item.createdAt)}</span>
              </div>

              {/* Acción */}
              {estadoFiltro === "PENDIENTE" && (
                <button onClick={() => setProcesando(item)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-xs text-[#B3985B] hover:underline transition-opacity">
                  Procesar →
                </button>
              )}
              {item.procesadoEn && (
                <span className="shrink-0 text-[10px] text-[#333]">→ {item.procesadoEn}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {showCaptura && (
        <ModalCaptura
          onSave={item => { setItems(prev => [item, ...prev]); setCaptura(false); }}
          onClose={() => setCaptura(false)}
        />
      )}
      {procesando && (
        <ModalProcesar
          item={procesando} users={users} juntas={juntas}
          onDone={() => { setProcesando(null); load(); }}
          onClose={() => setProcesando(null)}
        />
      )}
    </div>
  );
}
