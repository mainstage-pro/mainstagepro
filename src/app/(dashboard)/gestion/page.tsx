"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AREAS, AREA_LABELS, AREA_DOT, PRIORIDADES, PRIO_META, areaLabel, areaChipClass } from "@/lib/gestion";

type Usuario = { id: string; name: string };
type Tarea = {
  id: string; titulo: string; prioridad: string; area: string; estado: string;
  fecha: string | null; asignadoAId: string | null;
  asignadoA: { id: string; name: string } | null;
};
type Instancia = {
  id: string; estado: string;
  template: { nombre: string; area: { nombre: string } | null; subArea: { nombre: string } | null };
  responsable: { id: string; name: string } | null;
};
type Proyecto = {
  id: string; nombre: string; area: string; estado: string;
  porcentajeAvance: number; lider: { id: string; name: string };
};
type ProjTarea = { id: string; titulo: string; estado: string; prioridad: string; asignadoA: { name: string } | null };
type ProjDetalle = {
  fases: { id: string; nombre: string; tareas: ProjTarea[] }[];
  tareas: ProjTarea[];
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function Avatar({ name }: { name?: string | null }) {
  if (!name) return <span className="shrink-0 w-5 h-5 rounded-full border border-[#222] flex items-center justify-center text-[9px] text-[#333]">–</span>;
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="shrink-0 w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[9px] text-[#999] font-medium" title={name}>
      {initials}
    </span>
  );
}

function Circle({ prioridad, done, onClick }: { prioridad?: string; done?: boolean; onClick?: () => void }) {
  const p = PRIO_META[prioridad ?? "MEDIA"] ?? PRIO_META.MEDIA;
  return (
    <button onClick={onClick}
      className={`shrink-0 w-[17px] h-[17px] rounded-full border flex items-center justify-center transition-colors ${
        done ? "bg-[#B3985B] border-[#B3985B]" : `${p.ring} hover:bg-white/5`
      }`}>
      {done ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : <span className={`${p.dotSize} rounded-full ${p.dot}`} />}
    </button>
  );
}

// Agrupa por área en el orden canónico.
function groupByArea<T>(items: T[], getArea: (x: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const a = getArea(it) || "GENERAL";
    if (!map.has(a)) map.set(a, []);
    map.get(a)!.push(it);
  }
  const ordered: [string, T[]][] = [];
  for (const a of AREAS) if (map.has(a)) { ordered.push([a, map.get(a)!]); map.delete(a); }
  for (const [a, v] of map) ordered.push([a, v]);
  return ordered;
}

const selCls = "bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#B3985B]/50";

export default function CentroOperativoPage() {
  const [tareas, setTareas]   = useState<Tarea[]>([]);
  const [instancias, setInst] = useState<Instancia[]>([]);
  const [proyectos, setProy]  = useState<Proyecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [doneT, setDoneT]     = useState<Set<string>>(new Set());
  const [doneI, setDoneI]     = useState<Set<string>>(new Set());
  const [editT, setEditT]     = useState<string | null>(null);
  const [editI, setEditI]     = useState<string | null>(null);
  const [expProj, setExpProj] = useState<Set<string>>(new Set());
  const [projCache, setProjCache] = useState<Record<string, ProjDetalle>>({});
  const [doneP, setDoneP]     = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/tareas?vista=hoy").then(r => r.ok ? r.json() : { tareas: [] }),
      fetch("/api/plan-trabajo/instancias?vista=dia").then(r => r.ok ? r.json() : { instancias: [] }),
      fetch("/api/proyectos-internos").then(r => r.ok ? r.json() : { proyectos: [] }),
      fetch("/api/usuarios").then(r => r.ok ? r.json() : { usuarios: [] }),
    ]).then(([t, i, p, u]) => {
      setTareas(t.tareas ?? []);
      setInst((i.instancias ?? []).filter((x: Instancia) => x.estado !== "OMITIDA"));
      setProy((p.proyectos ?? []).filter((x: Proyecto) => x.estado === "ACTIVO"));
      setUsuarios(u.usuarios ?? []);
      setLoading(false);
    });
  }, []);

  // ── Acciones Tareas ──────────────────────────────────────────────
  async function completarTarea(id: string) {
    setDoneT(prev => new Set(prev).add(id));
    await fetch(`/api/tareas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: "COMPLETADA" }) });
  }
  async function patchTarea(id: string, patch: Record<string, unknown>) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, ...patch } as Tarea : t));
    await fetch(`/api/tareas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }

  // ── Acciones Plan ────────────────────────────────────────────────
  async function accionInstancia(id: string, accion: string, responsableId?: string) {
    if (accion === "completar") setDoneI(prev => new Set(prev).add(id));
    if (accion === "omitir") setInst(prev => prev.filter(i => i.id !== id));
    if (accion === "reasignar" && responsableId) {
      const u = usuarios.find(x => x.id === responsableId);
      setInst(prev => prev.map(i => i.id === id ? { ...i, responsable: u ? { id: u.id, name: u.name } : i.responsable } : i));
    }
    await fetch(`/api/plan-trabajo/instancias/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, responsableId }),
    });
  }

  // ── Acciones Proyectos ───────────────────────────────────────────
  async function toggleProj(id: string) {
    setExpProj(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (!projCache[id]) {
      const r = await fetch(`/api/proyectos-internos/${id}`);
      if (r.ok) {
        const d = (await r.json()).proyecto;
        setProjCache(prev => ({ ...prev, [id]: { fases: d.fases ?? [], tareas: d.tareas ?? [] } }));
      }
    }
  }
  async function completarProjTarea(taskId: string) {
    setDoneP(prev => new Set(prev).add(taskId));
    await fetch(`/api/tareas/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: "COMPLETADA" }) });
  }

  // ── Métricas ─────────────────────────────────────────────────────
  const instVis    = instancias.filter(i => i.estado !== "COMPLETADA" || doneI.has(i.id));
  const planTotal  = instVis.length;
  const planDone   = instVis.filter(i => doneI.has(i.id) || i.estado === "COMPLETADA").length;
  const tareasDone = tareas.filter(t => doneT.has(t.id)).length;
  const accTotal   = planTotal + tareas.length;
  const accDone    = planDone + tareasDone;
  const pct        = accTotal ? Math.round((accDone / accTotal) * 100) : 0;
  const hoy        = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <p className="ms-section-label">Gestión Operativa</p>
        <h1 className="text-white text-2xl font-bold mt-1">Centro Operativo</h1>
        <p className="text-[#555] text-sm mt-1 capitalize">{hoy}</p>
      </div>

      {loading ? <p className="text-[#444] text-sm">Cargando...</p> : (
        <>
          {/* Resumen */}
          <div className="ms-card p-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[11px] text-[#666] uppercase tracking-wider font-medium">Progreso de hoy</p>
                <p className="text-white text-lg font-semibold mt-0.5">{accDone}<span className="text-[#555] font-normal"> / {accTotal} completadas</span></p>
              </div>
              <span className="text-2xl font-bold text-[#B3985B]">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
              <div className="h-full rounded-full bg-[#B3985B] transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-4 mt-3 text-[11px]">
              <span className="text-[#666]">Plan <span className="text-[#999] font-medium">{planDone}/{planTotal}</span></span>
              <span className="text-[#666]">Tareas <span className="text-[#999] font-medium">{tareasDone}/{tareas.length}</span></span>
              <span className="text-[#666]">Proyectos <span className="text-[#999] font-medium">{proyectos.length}</span></span>
            </div>
          </div>

          {/* ── PLAN DE TRABAJO — por área › subárea ─────────────────── */}
          <SectionCard title="Plan de Trabajo" dot="#a78bfa" count={instVis.filter(i => !doneI.has(i.id) && i.estado !== "COMPLETADA").length} href="/plan-trabajo" empty={instVis.length === 0} emptyText="Nada del plan para hoy.">
            {groupByArea(instVis, i => (i.template.area?.nombre ?? "GENERAL").toUpperCase() === "VENTAS" ? "VENTAS" : matchArea(i.template.area?.nombre)).map(([areaKey, group]) => (
              <AreaGroup key={areaKey} areaKey={areaKey} rawName={group[0].template.area?.nombre}>
                {groupBySub(group).map(([sub, subItems]) => (
                  <div key={sub} className="mb-1">
                    {sub && <p className="text-[10px] text-[#555] px-2 pt-1 pb-0.5">{sub}</p>}
                    {subItems.map(i => {
                      const done = doneI.has(i.id) || i.estado === "COMPLETADA";
                      const open = editI === i.id;
                      return (
                        <div key={i.id} className="rounded-lg hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center gap-3 px-2 py-2">
                            <Circle done={done} onClick={() => !done && accionInstancia(i.id, "completar")} />
                            <span className={`flex-1 text-sm ${done ? "text-[#444] line-through" : "text-white"}`}>{i.template.nombre}</span>
                            <Avatar name={i.responsable?.name} />
                            <button onClick={() => setEditI(open ? null : i.id)} className="shrink-0 text-[#555] hover:text-[#B3985B] text-xs px-1">⋯</button>
                          </div>
                          {open && (
                            <div className="flex items-center gap-2 px-2 pb-2 pl-9 flex-wrap">
                              <button onClick={() => { accionInstancia(i.id, "omitir"); setEditI(null); }} className="ms-btn-icon !p-1 text-[11px] px-2">Omitir hoy</button>
                              <select value="" onChange={e => { if (e.target.value) { accionInstancia(i.id, "reasignar", e.target.value); setEditI(null); } }} className={selCls}>
                                <option value="">Reasignar…</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </AreaGroup>
            ))}
          </SectionCard>

          {/* ── TAREAS — por área, con acciones inline ───────────────── */}
          <SectionCard title="Tareas de hoy" dot="#B3985B" count={tareas.filter(t => !doneT.has(t.id)).length} href="/operaciones" empty={tareas.length === 0} emptyText="Sin tareas para hoy.">
            {groupByArea(tareas, t => t.area || "GENERAL").map(([areaKey, group]) => (
              <AreaGroup key={areaKey} areaKey={areaKey}>
                {group.map(t => {
                  const done = doneT.has(t.id);
                  const open = editT === t.id;
                  return (
                    <div key={t.id} className="rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-3 px-2 py-2">
                        <Circle prioridad={t.prioridad} done={done} onClick={() => !done && completarTarea(t.id)} />
                        <span className={`flex-1 text-sm ${done ? "text-[#444] line-through" : "text-white"}`}>{t.titulo}</span>
                        <Avatar name={t.asignadoA?.name} />
                        <button onClick={() => setEditT(open ? null : t.id)} className="shrink-0 text-[#555] hover:text-[#B3985B] text-xs px-1">⋯</button>
                      </div>
                      {open && (
                        <div className="flex items-center gap-2 px-2 pb-2 pl-9 flex-wrap">
                          <input type="date" value={toDateInput(t.fecha)} onChange={e => patchTarea(t.id, { fecha: e.target.value || null })} className={selCls} />
                          <select value={t.prioridad} onChange={e => patchTarea(t.id, { prioridad: e.target.value })} className={selCls}>
                            {PRIORIDADES.map(p => <option key={p} value={p}>{PRIO_META[p].label}</option>)}
                          </select>
                          <select value={t.asignadoAId ?? ""} onChange={e => patchTarea(t.id, { asignadoAId: e.target.value || null })} className={selCls}>
                            <option value="">Sin responsable</option>
                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </AreaGroup>
            ))}
          </SectionCard>

          {/* ── PROYECTOS — por área, expandible con tareas ──────────── */}
          <SectionCard title="Proyectos activos" dot="#4ade80" count={proyectos.length} href="/proyectos-internos" empty={proyectos.length === 0} emptyText="Sin proyectos activos.">
            {groupByArea(proyectos, p => p.area || "GENERAL").map(([areaKey, group]) => (
              <AreaGroup key={areaKey} areaKey={areaKey}>
                {group.map(p => {
                  const open = expProj.has(p.id);
                  const det = projCache[p.id];
                  const allTasks = det ? [...det.fases.flatMap(f => f.tareas.map(t => ({ ...t, fase: f.nombre }))), ...det.tareas.map(t => ({ ...t, fase: null as string | null }))] : [];
                  return (
                    <div key={p.id} className="rounded-lg">
                      <div className="flex items-center gap-3 px-2 py-2 hover:bg-white/[0.03] transition-colors">
                        <button onClick={() => toggleProj(p.id)} className="shrink-0 w-[17px] h-[17px] flex items-center justify-center text-[#666] hover:text-white">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={`transition-transform ${open ? "rotate-90" : ""}`}><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                        <Link href={`/proyectos-internos/${p.id}`} className="flex-1 text-sm text-white hover:text-[#c9a96a] transition-colors">{p.nombre}</Link>
                        <span className="text-[11px] text-[#555]">{p.porcentajeAvance || 0}%</span>
                        <Avatar name={p.lider?.name} />
                      </div>
                      {open && (
                        <div className="pl-9 pr-2 pb-2 space-y-0.5">
                          {!det ? (
                            <p className="text-[11px] text-[#444] py-1">Cargando tareas…</p>
                          ) : allTasks.length === 0 ? (
                            <p className="text-[11px] text-[#444] py-1">Sin tareas. Agrégalas desde el proyecto.</p>
                          ) : allTasks.map(t => {
                            const done = doneP.has(t.id) || t.estado === "COMPLETADA";
                            return (
                              <div key={t.id} className="flex items-center gap-2.5 py-1">
                                <Circle prioridad={t.prioridad} done={done} onClick={() => !done && completarProjTarea(t.id)} />
                                <span className={`flex-1 text-[12.5px] ${done ? "text-[#444] line-through" : "text-[#ccc]"}`}>{t.titulo}</span>
                                {t.fase && <span className="text-[9.5px] text-[#555] px-1.5 py-0.5 rounded bg-[#161616]">{t.fase}</span>}
                                <Avatar name={t.asignadoA?.name} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </AreaGroup>
            ))}
          </SectionCard>
        </>
      )}
    </div>
  );
}

// Normaliza el nombre del área del plan a una clave canónica si coincide.
function matchArea(nombre?: string | null): string {
  if (!nombre) return "GENERAL";
  const up = nombre.toUpperCase();
  if (up.includes("VENTA") || up.includes("COMERCIAL")) return "VENTAS";
  if (up.includes("DIREC")) return "DIRECCION";
  if (up.includes("ADMIN")) return "ADMINISTRACION";
  if (up.includes("MARKET")) return "MARKETING";
  if (up.includes("PRODUC")) return "PRODUCCION";
  return nombre;
}

function groupBySub(items: Instancia[]): [string, Instancia[]][] {
  const map = new Map<string, Instancia[]>();
  for (const it of items) {
    const s = it.template.subArea?.nombre ?? "";
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(it);
  }
  return [...map.entries()];
}

function AreaGroup({ areaKey, rawName, children }: { areaKey: string; rawName?: string | null; children: React.ReactNode }) {
  const known = AREA_LABELS[areaKey];
  const label = known ? areaLabel(areaKey) : (rawName ?? areaKey);
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: AREA_DOT[areaKey] ?? "#666" }} />
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[#888]">{label}</span>
      </div>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

function SectionCard({ title, dot, count, href, empty, emptyText, children }: {
  title: string; dot: string; count: number; href: string; empty: boolean; emptyText: string; children: React.ReactNode;
}) {
  return (
    <section className="ms-card p-3">
      <div className="flex items-center justify-between px-2 mb-1.5">
        <h2 className="flex items-center gap-2 text-[#ccc] text-xs uppercase tracking-wider font-semibold">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
          {title}
          <span className="text-[#555] font-normal">{count}</span>
        </h2>
        <Link href={href} className="text-[11px] text-[#555] hover:text-[#B3985B] transition-colors">Ver todo →</Link>
      </div>
      {empty ? <p className="text-[#333] text-[13px] px-2 py-2">{emptyText}</p> : <div>{children}</div>}
    </section>
  );
}
