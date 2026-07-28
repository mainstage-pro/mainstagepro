"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface Ocupante { id: string; nombre: string }
interface Puesto {
  id: string; nombre: string; area: string; color?: string | null;
  reportaAId?: string | null;
  posX?: number | null; posY?: number | null;
  misionPuesto?: string | null;
  ocupantes?: Ocupante[];
}

const AREAS = ["DIRECCION", "ADMINISTRACION", "MARKETING", "VENTAS", "PRODUCCION", "RRHH", "GENERAL"];
const AREA_HEX: Record<string, string> = {
  DIRECCION: "#B3985B",
  ADMINISTRACION: "#a855f7",
  MARKETING: "#eab308",
  VENTAS: "#22c55e",
  PRODUCCION: "#3b82f6",
  RRHH: "#ec4899",
  GENERAL: "#6b7280",
};

// ── Nodo personalizado ────────────────────────────────────────────────────────
type PuestoNodeData = {
  nombre: string;
  area: string;
  color: string;
  ocupantes: Ocupante[];
  onEdit: (id: string) => void;
};

function PuestoNode({ id, data, selected }: NodeProps<Node<PuestoNodeData>>) {
  const { nombre, area, color, ocupantes, onEdit } = data;
  const vacante = ocupantes.length === 0;
  return (
    <div
      onDoubleClick={() => onEdit(id)}
      style={{ borderColor: color, boxShadow: selected ? `0 0 0 2px ${color}` : undefined }}
      className="w-[220px] rounded-xl bg-[#111] border-2 overflow-hidden text-left transition-shadow"
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      <div style={{ background: color }} className="px-3 py-1.5">
        <p className="text-[10px] font-bold tracking-widest text-black/80 uppercase truncate">{area}</p>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-white leading-tight">{nombre}</p>
        <div className="mt-2 space-y-0.5">
          {vacante ? (
            <p className="text-[11px] text-amber-500/80 italic">Vacante</p>
          ) : (
            <>
              {ocupantes.slice(0, 3).map((o) => (
                <p key={o.id} className="text-[11px] text-gray-300 truncate flex items-center gap-1.5">
                  <span style={{ background: color }} className="inline-block w-1.5 h-1.5 rounded-full shrink-0" />
                  {o.nombre}
                </p>
              ))}
              {ocupantes.length > 3 && (
                <p className="text-[11px] text-gray-500">+{ocupantes.length - 3} más</p>
              )}
            </>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { puesto: PuestoNode };

// ── Layout jerárquico (árbol tidy) ────────────────────────────────────────────
const HGAP = 260;
const VGAP = 180;

function computeLayout(puestos: Puesto[]): Record<string, { x: number; y: number }> {
  const byId = new Map(puestos.map((p) => [p.id, p]));
  const children = new Map<string, string[]>();
  puestos.forEach((p) => {
    const pid = p.reportaAId && byId.has(p.reportaAId) ? p.reportaAId : null;
    if (pid) {
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid)!.push(p.id);
    }
  });
  const roots = puestos
    .filter((p) => !(p.reportaAId && byId.has(p.reportaAId)))
    .map((p) => p.id);
  const pos: Record<string, { x: number; y: number }> = {};
  const seen = new Set<string>();
  let nextX = 0;
  function place(pid: string, depth: number): number {
    if (seen.has(pid)) return nextX * HGAP; // corta ciclos
    seen.add(pid);
    const kids = children.get(pid) || [];
    let x: number;
    if (kids.length === 0) {
      x = nextX * HGAP;
      nextX++;
    } else {
      const xs = kids.map((k) => place(k, depth + 1));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos[pid] = { x, y: depth * VGAP };
    return x;
  }
  roots.forEach((r) => place(r, 0));
  // nodos sueltos (por ciclos) al final
  puestos.forEach((p) => {
    if (!pos[p.id]) { pos[p.id] = { x: nextX * HGAP, y: 0 }; nextX++; }
  });
  return pos;
}

function Lienzo() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PuestoNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Puesto | null>(null);
  const [showNew, setShowNew] = useState(false);
  const puestosRef = useRef<Puesto[]>([]);

  const openEdit = useCallback((id: string) => {
    const p = puestosRef.current.find((x) => x.id === id);
    if (p) setEditing(p);
  }, []);

  const buildGraph = useCallback((puestos: Puesto[]) => {
    puestosRef.current = puestos;
    const byId = new Map(puestos.map((p) => [p.id, p]));
    const layout = computeLayout(puestos);
    const ns: Node<PuestoNodeData>[] = puestos.map((p) => {
      const color = p.color || AREA_HEX[p.area] || AREA_HEX.GENERAL;
      const usePos = p.posX != null && p.posY != null ? { x: p.posX, y: p.posY } : layout[p.id];
      return {
        id: p.id,
        type: "puesto",
        position: usePos,
        data: { nombre: p.nombre, area: p.area, color, ocupantes: p.ocupantes || [], onEdit: openEdit },
      };
    });
    const es: Edge[] = puestos
      .filter((p) => p.reportaAId && byId.has(p.reportaAId))
      .map((p) => ({
        id: `e-${p.reportaAId}-${p.id}`,
        source: p.reportaAId!,
        target: p.id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#3a3a3a", strokeWidth: 1.5 },
      }));
    setNodes(ns);
    setEdges(es);
  }, [openEdit, setNodes, setEdges]);

  const load = useCallback(async () => {
    const res = await fetch("/api/rrhh/puestos-operativos", { cache: "no-store" });
    const d = await res.json();
    buildGraph(d.puestos || []);
    setLoading(false);
  }, [buildGraph]);

  useEffect(() => { load(); }, [load]);

  // Persistir posición al soltar un nodo
  const onNodeDragStop = useCallback((_e: unknown, node: Node) => {
    fetch(`/api/rrhh/puestos-operativos/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posX: node.position.x, posY: node.position.y }),
    }).catch(() => {});
  }, []);

  // Conectar dos nodos = definir línea de reporte (target reporta a source)
  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    fetch(`/api/rrhh/puestos-operativos/${c.target}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportaAId: c.source }),
    }).then(() => load()).catch(() => {});
  }, [load]);

  // Quitar línea de reporte al borrar una arista
  const onEdgesDelete = useCallback((removed: Edge[]) => {
    removed.forEach((e) => {
      fetch(`/api/rrhh/puestos-operativos/${e.target}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportaAId: null }),
      }).catch(() => {});
    });
  }, []);

  const autoOrganizar = useCallback(async () => {
    setSaving(true);
    const puestos = puestosRef.current;
    const layout = computeLayout(puestos);
    setNodes((nds) => nds.map((n) => ({ ...n, position: layout[n.id] || n.position })));
    await fetch("/api/rrhh/puestos-operativos/posiciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posiciones: puestos.map((p) => ({ id: p.id, ...layout[p.id] })).map((p) => ({ id: p.id, posX: p.x, posY: p.y })) }),
    }).catch(() => {});
    setSaving(false);
  }, [setNodes]);

  const handleNodesChange = useCallback((changes: NodeChange<Node<PuestoNodeData>>[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  return (
    <div className="relative h-[calc(100vh-9rem)] w-full rounded-2xl overflow-hidden border border-[#222] bg-[#0a0a0a]">
      {/* Barra de acciones */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button onClick={() => setShowNew(true)} className="ms-btn-primary text-xs px-3 py-1.5">+ Puesto</button>
        <button onClick={autoOrganizar} disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#333] bg-[#111] text-gray-300 hover:text-white disabled:opacity-40">
          {saving ? "Organizando…" : "Auto-organizar"}
        </button>
      </div>
      <div className="absolute top-3 right-3 z-10 bg-[#111]/90 border border-[#222] rounded-lg px-3 py-2 text-[10px] text-gray-500 max-w-[220px]">
        Arrastra para mover · une puntos para definir quién reporta a quién · doble clic para editar
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background color="#1a1a1a" gap={22} />
          <MiniMap
            pannable zoomable
            nodeColor={(n) => (n.data as PuestoNodeData).color}
            maskColor="rgba(0,0,0,0.7)"
            style={{ background: "#0a0a0a", border: "1px solid #222" }}
          />
          <Controls className="!bg-[#111] !border-[#222]" />
        </ReactFlow>
      )}

      {editing && (
        <EditModal
          puesto={editing}
          puestos={puestosRef.current}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {showNew && (
        <NewModal
          puestos={puestosRef.current}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Modal editar puesto (rápido) ──────────────────────────────────────────────
const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
const labelCls = "block text-xs text-gray-500 mb-1";

function EditModal({ puesto, puestos, onClose, onSaved }: { puesto: Puesto; puestos: Puesto[]; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(puesto.nombre);
  const [area, setArea] = useState(puesto.area);
  const [reportaAId, setReportaAId] = useState(puesto.reportaAId || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!nombre.trim()) return;
    setBusy(true);
    await fetch(`/api/rrhh/puestos-operativos/${puesto.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, area, reportaAId: reportaAId || null }),
    });
    setBusy(false);
    onSaved();
  }
  async function eliminar() {
    if (!confirm(`¿Eliminar el puesto "${puesto.nombre}"?`)) return;
    setBusy(true);
    await fetch(`/api/rrhh/puestos-operativos/${puesto.id}`, { method: "DELETE" });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="ms-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Editar puesto</h3>
            <a href={`/rrhh/puestos-operativos`} className="text-xs text-[#B3985B] hover:underline">Ficha completa →</a>
          </div>
          <div>
            <label className={labelCls}>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Área</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Reporta a</label>
              <select value={reportaAId} onChange={(e) => setReportaAId(e.target.value)} className={inputCls}>
                <option value="">— (raíz)</option>
                {puestos.filter((p) => p.id !== puesto.id).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={eliminar} disabled={busy} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40">Eliminar</button>
            <div className="flex gap-2">
              <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={save} disabled={busy || !nombre.trim()} className="ms-btn-primary text-xs px-4 py-2">{busy ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewModal({ puestos, onClose, onSaved }: { puestos: Puesto[]; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("GENERAL");
  const [reportaAId, setReportaAId] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!nombre.trim()) return;
    setBusy(true);
    await fetch(`/api/rrhh/puestos-operativos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, area, reportaAId: reportaAId || null }),
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="ms-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <h3 className="text-white font-semibold">Nuevo puesto</h3>
          <div>
            <label className={labelCls}>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Ej: Coordinador de Producción" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Área</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Reporta a</label>
              <select value={reportaAId} onChange={(e) => setReportaAId(e.target.value)} className={inputCls}>
                <option value="">— (raíz)</option>
                {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={save} disabled={busy || !nombre.trim()} className="ms-btn-primary text-xs px-4 py-2">{busy ? "Creando…" : "Crear"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganigramaPage() {
  return (
    <ReactFlowProvider>
      <Lienzo />
    </ReactFlowProvider>
  );
}
