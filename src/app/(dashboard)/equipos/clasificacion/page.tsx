"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { Tag, Filter, Check } from "lucide-react";

type Equipo = {
  id: string; descripcion: string; marca: string | null; modelo: string | null; imagenUrl: string | null;
  tiposEvento: string | null; nichos: string | null; rol: string | null; capacidadPorTipoEvento: string | null;
  noCotizable: boolean; clasifOrigen: string | null; categoria: { id: string; nombre: string } | null;
};
type TipoEvento = { slug: string; nombre: string };
type Nicho = { tipoEventoSlug: string; nombre: string; slug: string };
type CambioClasif = { id: string; nombre: string; tiposAntes: string[]; tiposDespues: string[]; nichosAntes: string[]; nichosDespues: string[] };

function parseArr(s: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

export default function ClasificacionEquiposPage() {
  const { success, error } = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [total, setTotal] = useState(0);
  const [clasificados, setClasificados] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filtroCat, setFiltroCat] = useState("");
  const [soloSinClasificar, setSoloSinClasificar] = useState(false);

  // Estado del panel de aplicación en lote.
  const [aplTipos, setAplTipos] = useState<string[]>([]);
  const [aplNichos, setAplNichos] = useState<string[]>([]);
  const [aplRol, setAplRol] = useState<"" | "base" | "adicional">("");
  const [aplNoCotizable, setAplNoCotizable] = useState(false);
  const [aplCapacidad, setAplCapacidad] = useState<Record<string, string>>({});
  const [rangos, setRangos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Confirmación de propagación (sync equipo→productos).
  const [syncPreview, setSyncPreview] = useState<CambioClasif[] | null>(null);
  const [syncEquipoIds, setSyncEquipoIds] = useState<string[]>([]);

  async function cargar() {
    setCargando(true);
    try {
      const [rc, rcat, rr] = await Promise.all([fetch("/api/inventario/clasificacion"), fetch("/api/catalogo"), fetch("/api/paquetes/rangos")]);
      if (rc.ok) { const d = await rc.json(); setEquipos(d.equipos); setTotal(d.total); setClasificados(d.clasificados); }
      if (rcat.ok) { const d = await rcat.json(); setTipos(d.tipos || []); setNichos(d.nichos || []); }
      if (rr.ok) { const d = await rr.json(); setRangos((d.rangos || []).map((x: { label: string }) => x.label)); }
    } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  const categorias = useMemo(() => [...new Map(equipos.map(e => [e.categoria?.id, e.categoria]).filter(([id]) => id) as [string, { id: string; nombre: string }][]).values()], [equipos]);
  const nichosDisponibles = useMemo(() => nichos.filter(n => aplTipos.includes(n.tipoEventoSlug.toUpperCase())), [nichos, aplTipos]);

  const visibles = useMemo(() => equipos.filter(e => {
    if (filtroCat && e.categoria?.id !== filtroCat) return false;
    if (soloSinClasificar && (parseArr(e.tiposEvento).length > 0 || e.noCotizable)) return false;
    return true;
  }), [equipos, filtroCat, soloSinClasificar]);

  function toggle(id: string) { setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleTodos() { setSel(p => p.size === visibles.length ? new Set() : new Set(visibles.map(e => e.id))); }

  function toggleChip(list: string[], set: (v: string[]) => void, val: string) {
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  }

  async function aplicar() {
    if (!sel.size) { error("Selecciona al menos un equipo"); return; }
    if (!aplTipos.length && !aplNichos.length && !aplRol && !aplNoCotizable) { error("Elige qué clasificar"); return; }
    setGuardando(true);
    try {
      const body: Record<string, unknown> = { equipoIds: [...sel] };
      if (aplTipos.length) body.tiposEvento = aplTipos;
      if (aplNichos.length) body.nichos = aplNichos;
      if (aplRol) body.rol = aplRol;
      if (aplNoCotizable) body.noCotizable = true;
      const capacidad = Object.fromEntries(aplTipos.map(t => [t, aplCapacidad[t]]).filter(([, v]) => v));
      if (Object.keys(capacidad).length) body.capacidadPorTipoEvento = capacidad;
      const r = await fetch("/api/inventario/clasificacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      const d = await r.json();
      success(`${d.actualizados} equipo(s) clasificados`);
      await cargar();
      setSel(new Set());
      if (Array.isArray(d.syncPreview) && d.syncPreview.length > 0) {
        setSyncPreview(d.syncPreview);
        setSyncEquipoIds(d.equipoIds || []);
      }
    } catch (e) { error(e instanceof Error ? e.message : "Error"); } finally { setGuardando(false); }
  }

  // Convierte lo heredado en manual: el POST siempre marca clasifOrigen="manual",
  // así que un POST solo con ids fija la clasificación actual y la excluye del sync.
  async function fijarManual() {
    if (!sel.size) { error("Selecciona al menos un equipo"); return; }
    setGuardando(true);
    try {
      const r = await fetch("/api/inventario/clasificacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ equipoIds: [...sel] }) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      success(`${sel.size} equipo(s) fijados como manual`);
      await cargar();
      setSel(new Set());
    } catch (e) { error(e instanceof Error ? e.message : "Error"); } finally { setGuardando(false); }
  }

  async function confirmarSync() {
    if (!syncEquipoIds.length) { setSyncPreview(null); return; }
    try {
      const r = await fetch("/api/inventario/clasificacion/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direccion: "equipo-a-producto", ids: syncEquipoIds }) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      const d = await r.json();
      success(`${d.cambios} producto(s) actualizados`);
    } catch (e) { error(e instanceof Error ? e.message : "Error"); }
    finally { setSyncPreview(null); setSyncEquipoIds([]); }
  }

  const pct = total ? Math.round((clasificados / total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2"><Tag size={18} className="text-[#B3985B]" /> Clasificación de inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Marca a qué tipos de evento y nichos sirve cada equipo. Alimenta la cobertura y las sugerencias.</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold text-white">{clasificados}<span className="text-gray-600 text-lg"> / {total}</span></p>
          <p className="text-[11px] text-gray-500">Clasificados ({pct}%)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Filter size={14} className="text-gray-600" />
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className="bg-[#111] border border-[#242424] rounded-lg px-2.5 py-1.5 text-sm text-gray-200">
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-400"><input type="checkbox" checked={soloSinClasificar} onChange={e => setSoloSinClasificar(e.target.checked)} /> Solo sin clasificar</label>
      </div>

      {/* Panel de aplicación en lote */}
      <div className="rounded-xl border border-[#B3985B]/25 bg-[#B3985B]/[0.04] p-4 mb-4 space-y-3">
        <p className="text-xs text-white font-semibold">Aplicar a {sel.size} seleccionado(s)</p>
        <div>
          <p className="text-[11px] text-gray-500 mb-1">Tipos de evento</p>
          <div className="flex flex-wrap gap-1.5">
            {tipos.map(t => { const v = t.slug.toUpperCase(); const on = aplTipos.includes(v); return (
              <button key={v} onClick={() => toggleChip(aplTipos, setAplTipos, v)} className={`px-2.5 py-1 rounded-lg text-xs border ${on ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-400 hover:text-white"}`}>{t.nombre}</button>
            ); })}
          </div>
        </div>
        {nichosDisponibles.length > 0 && (
          <div>
            <p className="text-[11px] text-gray-500 mb-1">Nichos (opcional)</p>
            <div className="flex flex-wrap gap-1.5">
              {nichosDisponibles.map(n => { const on = aplNichos.includes(n.slug); return (
                <button key={n.slug} onClick={() => toggleChip(aplNichos, setAplNichos, n.slug)} className={`px-2.5 py-1 rounded-lg text-xs border ${on ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-400 hover:text-white"}`}>{n.nombre}</button>
              ); })}
            </div>
          </div>
        )}
        {aplTipos.length > 0 && rangos.length > 0 && (
          <div>
            <p className="text-[11px] text-gray-500 mb-1">Capacidad por tipo (rango de personas, opcional)</p>
            <div className="flex flex-wrap gap-2">
              {aplTipos.map(t => { const nombre = tipos.find(x => x.slug.toUpperCase() === t)?.nombre || t; return (
                <label key={t} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>{nombre}:</span>
                  <select value={aplCapacidad[t] || ""} onChange={e => setAplCapacidad(p => ({ ...p, [t]: e.target.value }))} className="bg-[#111] border border-[#242424] rounded-lg px-2 py-1 text-xs text-gray-200">
                    <option value="">—</option>
                    {rangos.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              ); })}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">Rol:</span>
            {(["base", "adicional"] as const).map(r => (
              <button key={r} onClick={() => setAplRol(aplRol === r ? "" : r)} className={`px-2.5 py-1 rounded-lg text-xs border capitalize ${aplRol === r ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-400 hover:text-white"}`}>{r}</button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-400"><input type="checkbox" checked={aplNoCotizable} onChange={e => setAplNoCotizable(e.target.checked)} /> No cotizable (cable/consumible)</label>
          <button onClick={fijarManual} disabled={guardando || !sel.size} title="Convierte la clasificación heredada en manual y la excluye del sync" className="ml-auto border border-[#333] hover:border-[#B3985B]/40 text-gray-400 hover:text-[#B3985B] text-sm px-3 py-2 rounded-lg disabled:opacity-40">Fijar como manual</button>
          <button onClick={aplicar} disabled={guardando || !sel.size} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40">{guardando ? "Aplicando…" : "Aplicar"}</button>
        </div>
      </div>

      {/* Lista */}
      {cargando ? <p className="text-sm text-gray-500">Cargando…</p> : (
        <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a] text-[11px] text-gray-500 uppercase tracking-wide">
            <input type="checkbox" checked={sel.size > 0 && sel.size === visibles.length} onChange={toggleTodos} />
            <span className="flex-1">Equipo ({visibles.length})</span>
            <span className="w-40">Tipos</span>
            <span className="w-20">Rol</span>
          </div>
          <div className="divide-y divide-[#141414] max-h-[52vh] overflow-auto">
            {visibles.map(e => {
              const tEv = parseArr(e.tiposEvento);
              const on = sel.has(e.id);
              return (
                <div key={e.id} className={`flex items-center gap-2 px-3 py-2 ${on ? "bg-[#B3985B]/[0.05]" : "hover:bg-[#0d0d0d]"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(e.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{e.descripcion}</p>
                    <p className="text-[11px] text-gray-600 truncate">{[e.marca, e.modelo].filter(Boolean).join(" ")} · {e.categoria?.nombre}</p>
                  </div>
                  <div className="w-40 flex flex-wrap gap-1">
                    {e.noCotizable && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-700/40 text-gray-400">no cotizable</span>}
                    {tEv.map(t => <span key={t} className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B]">{t}</span>)}
                    {e.clasifOrigen === "heredado" && <span className="text-[9px] text-gray-600">(heredado)</span>}
                  </div>
                  <span className="w-20 text-xs text-gray-500 capitalize">{e.rol || "—"}</span>
                </div>
              );
            })}
            {visibles.length === 0 && <p className="text-sm text-gray-600 px-3 py-6 text-center">Sin equipos con estos filtros.</p>}
          </div>
        </div>
      )}

      {/* Confirmación de propagación a productos */}
      {syncPreview && (
        <Modal open onClose={() => setSyncPreview(null)} title="Propagar a productos" maxWidth="max-w-lg">
          <div className="p-6">
            <p className="text-sm text-gray-300 mb-3">Estos productos que contienen los equipos clasificados pueden heredar (sumar) los tipos/nichos. No se quita nada ni se toca lo marcado manualmente.</p>
            <div className="space-y-2 max-h-64 overflow-auto mb-4">
              {syncPreview.map(c => (
                <div key={c.id} className="rounded-lg bg-[#111] border border-[#1f1f1f] px-3 py-2">
                  <p className="text-sm text-white">{c.nombre}</p>
                  <p className="text-[11px] text-gray-500">Tipos: {c.tiposAntes.join(", ") || "—"} → <span className="text-[#B3985B]">{c.tiposDespues.join(", ")}</span></p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSyncPreview(null)} className="text-sm text-gray-400 hover:text-white px-4 py-2">No propagar</button>
              <button onClick={confirmarSync} className="inline-flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg"><Check size={15} /> Propagar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
