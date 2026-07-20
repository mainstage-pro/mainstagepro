"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AREAS, AREA_LABELS, PRIORIDADES, PRIO_META } from "@/lib/gestion";

type CapturaItem = {
  id: string; contenido: string; area: string | null;
  tipo: string | null; clasificado: boolean; creadoEn: string;
};
type Usuario = { id: string; name: string; area: string | null };
type PTSubArea = { id: string; nombre: string };
type PTArea = { id: string; nombre: string; subareas: PTSubArea[] };

const TIPOS = [
  { key: "tarea",    label: "Tarea",              color: "#B3985B", desc: "Algo puntual que hacer", destino: "Módulo de Tareas" },
  { key: "proyecto", label: "Proyecto",           color: "#3b82f6", desc: "Iniciativa con etapas",  destino: "Proyectos internos" },
  { key: "plan",     label: "Compromiso de plan", color: "#a78bfa", desc: "Operación recurrente",   destino: "Plan de Trabajo" },
];

const FRECUENCIAS = [
  { key: "DIARIO", label: "Diario" }, { key: "SEMANAL", label: "Semanal" },
  { key: "QUINCENAL", label: "Quincenal" }, { key: "MENSUAL", label: "Mensual" },
  { key: "TRIMESTRAL", label: "Trimestral" }, { key: "POR_EVENTO", label: "Por evento" },
];

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)        return "Ahora";
  if (diff < 3600)      return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400)     return `Hace ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `Hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}
function isOld(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() > 3 * 86400 * 1000;
}

const inputCls = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[12.5px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50";
const labelCls = "text-[10px] uppercase tracking-wider text-[#666] mb-1 block";

// ── Selector de área (chips) ──────────────────────────────────────────────────
function AreaChips({ value, onChange }: { value: string | null; onChange: (a: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {AREAS.map(a => (
        <button key={a} type="button" onClick={() => onChange(a)}
          className="px-2.5 py-1 rounded-md text-[11px] transition-all border"
          style={{
            background: value === a ? "rgba(179,152,91,0.14)" : "#111",
            borderColor: value === a ? "rgba(179,152,91,0.5)" : "#222",
            color: value === a ? "#c9a96a" : "#777",
          }}>
          {AREA_LABELS[a]}
        </button>
      ))}
    </div>
  );
}

export default function BandejaPage() {
  const [items, setItems]       = useState<CapturaItem[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ptAreas, setPtAreas]   = useState<PTArea[]>([]);
  const [loading, setLoading]   = useState(true);
  const [texto, setTexto]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [openId, setOpenId]     = useState<string | null>(null);
  const [tipo, setTipo]         = useState<string | null>(null);
  const [moving, setMoving]     = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Form state (compartido, se reinicia al abrir/cambiar tipo)
  const [titulo, setTitulo]       = useState("");
  const [descripcion, setDescr]   = useState("");
  const [area, setArea]           = useState<string | null>(null);
  const [responsable, setResp]    = useState<string | null>(null);
  const [prioridad, setPrio]      = useState("MEDIA");
  const [fecha, setFecha]         = useState("");
  const [fechaFin, setFechaFin]   = useState("");
  const [etapas, setEtapas]       = useState<string[]>([]);
  const [subtareas, setSubtareas] = useState<string[]>([]);
  const [ptAreaId, setPtAreaId]   = useState<string>("");
  const [ptSubId, setPtSubId]     = useState<string>("");
  const [frecuencia, setFrec]     = useState("DIARIO");
  const [taskTab, setTaskTab]     = useState<"detalles" | "programacion">("detalles");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/captura");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/usuarios").then(r => r.json()).then(d => setUsuarios(d.usuarios ?? [])).catch(() => {});
    fetch("/api/plan-trabajo/sistema-operativo").then(r => r.json()).then(d => setPtAreas(d.areas ?? [])).catch(() => {});
  }, [refresh]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/captura", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: texto.trim() }),
    });
    if (res.ok) { setTexto(""); refresh(); }
    setSaving(false);
  }

  function openClassify(item: CapturaItem) {
    if (openId === item.id) { closeClassify(); return; }
    setOpenId(item.id);
    setTipo(null);
    setTitulo(item.contenido);
    setDescr(""); setArea(null); setResp(null); setPrio("MEDIA");
    setFecha(""); setFechaFin(""); setEtapas([]); setSubtareas([]);
    setPtAreaId(""); setPtSubId(""); setFrec("DIARIO"); setTaskTab("detalles");
  }
  function closeClassify() {
    setOpenId(null); setTipo(null);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/captura/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    if (openId === id) closeClassify();
  }

  const ptSubs = ptAreas.find(a => a.id === ptAreaId)?.subareas ?? [];

  // Validación por tipo
  const puedeMover =
    tipo === "tarea"    ? !!titulo.trim() && !!area && !!responsable :
    tipo === "proyecto" ? !!titulo.trim() && !!area && !!responsable :
    tipo === "plan"     ? !!titulo.trim() && !!ptAreaId && !!ptSubId && !!responsable :
    false;

  async function mover(item: CapturaItem) {
    if (!puedeMover || moving) return;
    setMoving(true);
    try {
      if (tipo === "tarea") {
        await fetch("/api/tareas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: titulo.trim(), descripcion: descripcion || null, area,
            asignadoAId: responsable, prioridad,
            fecha: fecha || null, fechaVencimiento: fechaFin || null,
          }),
        });
      } else if (tipo === "proyecto") {
        const res = await fetch("/api/proyectos-internos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: titulo.trim(), descripcion: descripcion || null, area,
            liderId: responsable, prioridad,
            fechaInicio: fecha || null, fechaFin: fechaFin || null,
          }),
        });
        const proyecto = res.ok ? (await res.json()).proyecto : null;
        if (proyecto) {
          // Etapas
          const faseIds: string[] = [];
          for (const nombre of etapas.filter(e => e.trim())) {
            const fr = await fetch(`/api/proyectos-internos/${proyecto.id}/fases`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: nombre.trim() }),
            });
            if (fr.ok) faseIds.push((await fr.json()).fase.id);
          }
          // Subtareas (vinculadas al proyecto, a la primera etapa si existe)
          for (const st of subtareas.filter(s => s.trim())) {
            await fetch("/api/tareas", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                titulo: st.trim(), area, asignadoAId: responsable,
                proyectoInternoId: proyecto.id, faseInternaId: faseIds[0] ?? null,
              }),
            });
          }
        }
      } else if (tipo === "plan") {
        await fetch("/api/plan-trabajo/templates", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaId: ptAreaId, subAreaId: ptSubId, nombre: titulo.trim(),
            descripcion: descripcion || null, responsableId: responsable,
            frecuencia, tipo: "CHECK",
          }),
        });
      }
      await fetch(`/api/captura/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clasificado: true, tipo, area: area ?? null }),
      });
      setItems(prev => prev.filter(i => i.id !== item.id));
      closeClassify();
    } finally {
      setMoving(false);
    }
  }

  const destino = TIPOS.find(t => t.key === tipo)?.destino;
  const oldItems = items.filter(i => isOld(i.creadoEn));

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <p className="ms-section-label">Gestión Operativa</p>
        <h1 className="ms-h1 mt-1">Bandeja de entrada</h1>
        <p className="text-[#555] text-sm mt-1">Captura sin fricción. Nada se mueve hasta clasificarlo.</p>
      </div>

      {oldItems.length > 0 && (
        <div className="px-3 py-2 rounded-lg bg-[#e8a020]/8 border border-[#e8a020]/20 flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-[11.5px] text-[#e8a020]/90">
            {oldItems.length} item{oldItems.length > 1 ? "s" : ""} sin clasificar con más de 3 días
          </p>
        </div>
      )}

      {/* Captura */}
      <form onSubmit={handleSubmit}>
        <div className="relative rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] focus-within:border-[#e8a020]/30 transition-colors">
          <textarea ref={inputRef} value={texto} onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Captura una idea, pendiente, pensamiento… (Enter para guardar)"
            rows={2}
            className="w-full bg-transparent px-4 pt-3 pb-10 text-[13px] text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed" />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            {texto.trim() && (
              <button type="button" onClick={() => setTexto("")}
                className="px-2 py-1 text-[11px] text-[#444] hover:text-[#777] transition-colors">Limpiar</button>
            )}
            <button type="submit" disabled={!texto.trim() || saving}
              className="px-3 py-1.5 rounded-lg bg-[#e8a020] hover:bg-[#f0ab2a] disabled:opacity-40 text-[#080808] text-[11px] font-semibold transition-all">
              {saving ? "..." : "Capturar"}
            </button>
          </div>
        </div>
      </form>

      {/* Lista */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-[#333] text-xs text-center py-10">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#333]">Bandeja vacía</p>
            <p className="text-[11px] text-[#222] mt-1">Todo lo capturado ya fue clasificado.</p>
          </div>
        ) : items.map(item => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="rounded-lg border bg-[#141414] transition-all"
              style={{ borderColor: isOpen ? "rgba(232,160,32,0.3)" : isOld(item.creadoEn) ? "rgba(232,160,32,0.18)" : "rgba(255,255,255,0.06)" }}>
              <div className="flex items-start gap-3 p-3.5">
                <span className="mt-[2px] shrink-0 w-4 h-4 rounded-full border" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] text-[#ddd] leading-snug">{item.contenido}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10.5px] text-[#555]">{timeAgo(item.creadoEn)}</span>
                    {isOld(item.creadoEn) && <span className="text-[10px] text-[#e8a020]/60">⚠ Antiguo</span>}
                  </div>
                </div>
                <button onClick={() => openClassify(item)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
                    isOpen ? "bg-[#e8a020] text-[#080808] border-[#e8a020]" : "bg-[#1a1a1a] text-[#999] border-[#2a2a2a] hover:text-white"
                  }`}>
                  {isOpen ? "Cerrar" : "Clasificar"}
                </button>
                <button onClick={() => handleDelete(item.id)}
                  className="shrink-0 p-1 rounded text-[#2a2a2a] hover:text-[#666] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Panel de clasificación */}
              {isOpen && (
                <div className="border-t border-white/[0.05] p-3.5 space-y-4">
                  {/* Paso 1 · Tipo */}
                  <div>
                    <p className={labelCls}>1 · ¿Qué tipo de gestión es?</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TIPOS.map(t => (
                        <button key={t.key} onClick={() => setTipo(t.key)}
                          className="px-2 py-2 rounded-lg text-left transition-all border"
                          style={{
                            background: tipo === t.key ? `${t.color}18` : "#111",
                            borderColor: tipo === t.key ? `${t.color}55` : "#222",
                          }}>
                          <span className="block text-[11.5px] font-medium" style={{ color: tipo === t.key ? t.color : "#aaa" }}>{t.label}</span>
                          <span className="block text-[9.5px] text-[#555] mt-0.5 leading-tight">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {tipo && (
                    <>
                      {/* Banner de destino */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                        <p className="text-[11px] text-[#999]">
                          Se creará en <span className="text-[#c9a96a] font-medium">{destino}</span>
                          {tipo === "tarea" && area && <> › {AREA_LABELS[area]}</>}
                          {tipo === "proyecto" && area && <> › {AREA_LABELS[area]}</>}
                          {tipo === "plan" && ptAreaId && <> › {ptAreas.find(a => a.id === ptAreaId)?.nombre}{ptSubId && <> › {ptSubs.find(s => s.id === ptSubId)?.nombre}</>}</>}
                        </p>
                      </div>

                      {/* ── Formulario TAREA ─────────────────────────────── */}
                      {tipo === "tarea" && (
                        <div className="space-y-3">
                          {/* Tabs */}
                          <div className="ms-tabs w-fit">
                            {(["detalles", "programacion"] as const).map(t => (
                              <button key={t} onClick={() => setTaskTab(t)}
                                className={`text-[11px] capitalize ${taskTab === t ? "ms-tab-active" : "ms-tab"}`}>
                                {t === "detalles" ? "Detalles" : "Programación"}
                              </button>
                            ))}
                          </div>

                          {taskTab === "detalles" ? (
                            <div className="space-y-3">
                              <div>
                                <label className={labelCls}>Título</label>
                                <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Descripción</label>
                                <textarea value={descripcion} onChange={e => setDescr(e.target.value)} rows={2}
                                  placeholder="Detalles, contexto, qué se espera…" className={`${inputCls} resize-none`} />
                              </div>
                              <div>
                                <label className={labelCls}>Área</label>
                                <AreaChips value={area} onChange={setArea} />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className={labelCls}>Responsable</label>
                                  <select value={responsable ?? ""} onChange={e => setResp(e.target.value || null)} className={inputCls}>
                                    <option value="">Selecciona…</option>
                                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className={labelCls}>Prioridad</label>
                                  <select value={prioridad} onChange={e => setPrio(e.target.value)} className={inputCls}>
                                    {PRIORIDADES.map(p => <option key={p} value={p}>{PRIO_META[p].label}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={labelCls}>Fecha de trabajo</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Vence</label>
                                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className={inputCls} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Formulario PROYECTO ──────────────────────────── */}
                      {tipo === "proyecto" && (
                        <div className="space-y-3">
                          <div>
                            <label className={labelCls}>Nombre del proyecto</label>
                            <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Propósito / descripción</label>
                            <textarea value={descripcion} onChange={e => setDescr(e.target.value)} rows={2}
                              placeholder="¿Para qué sirve este proyecto? ¿Qué resultado busca?" className={`${inputCls} resize-none`} />
                          </div>
                          <div>
                            <label className={labelCls}>Área</label>
                            <AreaChips value={area} onChange={setArea} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Líder</label>
                              <select value={responsable ?? ""} onChange={e => setResp(e.target.value || null)} className={inputCls}>
                                <option value="">Selecciona…</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Prioridad</label>
                              <select value={prioridad} onChange={e => setPrio(e.target.value)} className={inputCls}>
                                {PRIORIDADES.map(p => <option key={p} value={p}>{PRIO_META[p].label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Inicio</label>
                              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>Fecha de vencimiento</label>
                              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className={inputCls} />
                            </div>
                          </div>
                          <DynamicList label="Etapas de planeación" placeholder="Nombre de la etapa" items={etapas} setItems={setEtapas} addLabel="+ Etapa" />
                          <DynamicList label="Subtareas del proyecto" placeholder="Subtarea a cumplir" items={subtareas} setItems={setSubtareas} addLabel="+ Subtarea" />
                        </div>
                      )}

                      {/* ── Formulario PLAN ──────────────────────────────── */}
                      {tipo === "plan" && (
                        <div className="space-y-3">
                          <div>
                            <label className={labelCls}>Nombre del compromiso</label>
                            <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Descripción</label>
                            <textarea value={descripcion} onChange={e => setDescr(e.target.value)} rows={2}
                              placeholder="¿En qué consiste esta operación recurrente?" className={`${inputCls} resize-none`} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Área (Plan)</label>
                              <select value={ptAreaId} onChange={e => { setPtAreaId(e.target.value); setPtSubId(""); }} className={inputCls}>
                                <option value="">Selecciona…</option>
                                {ptAreas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Subárea</label>
                              <select value={ptSubId} onChange={e => setPtSubId(e.target.value)} disabled={!ptAreaId} className={`${inputCls} disabled:opacity-40`}>
                                <option value="">Selecciona…</option>
                                {ptSubs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Responsable</label>
                              <select value={responsable ?? ""} onChange={e => setResp(e.target.value || null)} className={inputCls}>
                                <option value="">Selecciona…</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Frecuencia</label>
                              <select value={frecuencia} onChange={e => setFrec(e.target.value)} className={inputCls}>
                                {FRECUENCIAS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Acción */}
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10.5px] text-[#444]">
                          {puedeMover ? "Listo para mover." : "Completa los campos requeridos."}
                        </p>
                        <button onClick={() => mover(item)} disabled={!puedeMover || moving}
                          className="px-4 py-1.5 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-30 text-black text-[12px] font-semibold transition-colors">
                          {moving ? "Moviendo…" : "Mover →"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lista dinámica (etapas / subtareas) ───────────────────────────────────────
function DynamicList({ label, placeholder, items, setItems, addLabel }: {
  label: string; placeholder: string; items: string[];
  setItems: (v: string[]) => void; addLabel: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label} <span className="text-[#333] normal-case">(opcional)</span></label>
      <div className="space-y-1.5">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-[10px] text-[#444] w-4 text-right">{idx + 1}.</span>
            <input value={val} placeholder={placeholder}
              onChange={e => setItems(items.map((v, i) => i === idx ? e.target.value : v))}
              className={inputCls} />
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}
              className="shrink-0 p-1 text-[#444] hover:text-[#888] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, ""])}
          className="text-[11px] text-[#B3985B] hover:text-[#c9a96a] transition-colors">{addLabel}</button>
      </div>
    </div>
  );
}
