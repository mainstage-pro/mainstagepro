"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Opcion = { id: string; nombre: string; empresa?: string | null };

type Proyecto = {
  id: string;
  numero: string;
  nombre: string;
  estado: string;
  fechaEntrega: string | null;
  createdAt: string;
  cliente: Opcion | null;
  artista: Opcion | null;
  gira: { id: string; nombre: string } | null;
  trato: { id: string; nombreEvento: string | null } | null;
};

const ESTADOS = ["BRIEF", "EN_PROCESO", "REVISION", "ENTREGADO", "CANCELADO"] as const;
const ESTADO_LABELS: Record<string, string> = {
  BRIEF: "Brief", EN_PROCESO: "En proceso", REVISION: "Revisión", ENTREGADO: "Entregado", CANCELADO: "Cancelado",
};
const ESTADO_COLOR: Record<string, string> = {
  BRIEF: "#a78bfa", EN_PROCESO: "#e8a020", REVISION: "#60a5fa", ENTREGADO: "#4ade80", CANCELADO: "#555",
};

const inputCls = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[12.5px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50";
const labelCls = "text-[10px] uppercase tracking-wider text-[#666] mb-1 block";

function ModalNuevo({ clientes, artistas, onSave, onClose }: {
  clientes: Opcion[]; artistas: Opcion[];
  onSave: (p: Proyecto) => void; onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [artistaId, setArtistaId] = useState("");
  const [briefing, setBriefing] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nombre.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/proyectos-creativos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          clienteId: clienteId || null,
          artistaId: artistaId || null,
          briefing: briefing.trim() || null,
        }),
      });
      if (!res.ok) { setSaving(false); return; }
      const { proyecto } = await res.json();
      onSave({
        id: proyecto.id, numero: proyecto.numero, nombre: nombre.trim(), estado: "BRIEF",
        fechaEntrega: null, createdAt: new Date().toISOString(),
        cliente: clientes.find(c => c.id === clienteId) ?? null,
        artista: artistas.find(a => a.id === artistaId) ?? null,
        gira: null, trato: null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl w-full max-w-lg p-6 space-y-3.5" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-sm">Nuevo proyecto creativo</h2>

        <div>
          <label className={labelCls}>Nombre del proyecto</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
            placeholder="¿Cómo se llama el entregable?" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Cliente <span className="text-[#333] normal-case">(opcional)</span></label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} className={inputCls}>
              <option value="">Sin cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa || c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Artista <span className="text-[#333] normal-case">(opcional)</span></label>
            <select value={artistaId} onChange={e => setArtistaId(e.target.value)} className={inputCls}>
              <option value="">Sin artista</option>
              {artistas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Briefing <span className="text-[#333] normal-case">(opcional)</span></label>
          <textarea value={briefing} onChange={e => setBriefing(e.target.value)} rows={3}
            placeholder="¿Qué se necesita diseñar/renderizar/documentar?"
            className={`${inputCls} resize-none`} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10.5px] text-[#444]">{nombre.trim() ? "Listo para crear." : "El nombre es requerido."}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#555] hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!nombre.trim() || saving}
              className="ms-btn-primary disabled:opacity-40">
              {saving ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fechaCorta(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function CreativeProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [artistas, setArtistas] = useState<Opcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtro, setFiltro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proyectos-creativos").then(r => r.json()).then(d => {
      setProyectos(d.proyectos ?? []);
      setLoading(false);
    });
    fetch("/api/clientes").then(r => r.json()).then(d => setClientes(d.clientes ?? [])).catch(() => {});
    fetch("/api/artistas").then(r => r.json()).then(d => setArtistas(d.artistas ?? [])).catch(() => {});
  }, []);

  const filtrados = filtro ? proyectos.filter(p => p.estado === filtro) : proyectos;

  return (
    <div className="ms-page max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">Mainstage Creative</p>
          <h1 className="ms-h1">Proyectos creativos</h1>
          <p className="ms-subtitle mt-1">Dirección creativa, diseño, renders y documentación técnica</p>
        </div>
        <button onClick={() => setShowModal(true)} className="shrink-0 ms-btn-primary">+ Nuevo</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltro(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filtro === null ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
          }`}>
          Todos <span className="ml-1.5 text-[10px] opacity-60">{proyectos.length}</span>
        </button>
        {ESTADOS.map(e => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === e ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
            }`}>
            {ESTADO_LABELS[e]}
            <span className="ml-1.5 text-[10px] opacity-60">{proyectos.filter(p => p.estado === e).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#444] text-sm">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#333] text-sm">Sin proyectos creativos{filtro ? ` en ${ESTADO_LABELS[filtro].toLowerCase()}` : ""}</p>
        </div>
      ) : (
        <div className="space-y-px">
          {filtrados.map(p => {
            const entrega = fechaCorta(p.fechaEntrega);
            const origen = p.artista?.nombre || p.cliente?.empresa || p.cliente?.nombre || p.gira?.nombre || p.trato?.nombreEvento;
            return (
              <Link key={p.id} href={`/creative/${p.id}`}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#0d0d0d] group transition-colors">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ESTADO_COLOR[p.estado] }} />
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="ms-micro text-[#555]">{p.numero}</span>
                  <span className="text-sm text-white">{p.nombre}</span>
                  {origen && <span className="text-[11px] text-[#777]">· {origen}</span>}
                </div>
                {entrega && (
                  <span className="shrink-0 text-[10.5px] text-[#666]">Entrega {entrega}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalNuevo
          clientes={clientes} artistas={artistas}
          onSave={p => { setProyectos(prev => [p, ...prev]); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
