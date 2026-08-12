"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import { Layers, Tags, PlusCircle, HelpCircle, Pencil, Trash2, Plus, Sparkles, GripVertical } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type TipoEvento = { id: string; slug: string; nombre: string; emoji: string | null; subtitulo: string | null; descripcion: string | null; orden: number; activo: boolean };
type Nicho = { id: string; tipoEventoSlug: string; nombre: string; slug: string; descripcion: string | null; notasComerciales: string | null; orden: number; activo: boolean };
type Regla = { id?: string; condicion: string; categoriasEquipo: string | null; adicionalIds: string | null };
type Adicional = { id: string; nombre: string; descripcion: string | null; tiposEvento: string; nichos: string | null; frecuencia: string; productoId: string | null; composicion: string | null; imagenUrl: string | null; orden: number; activo: boolean; producto: { id: string; nombre: string } | null };
type Pregunta = { id: string; texto: string; tipoRespuesta: string; opciones: string | null; nichos: string | null; alcance: string | null; tipoEventoSlug: string | null; bloque: string | null; obligatoria: boolean; preguntaPadreId: string | null; condicionValor: string | null; orden: number; activa: boolean; reglas: Regla[] };
type Catalogo = { tipos: TipoEvento[]; nichos: Nicho[]; adicionales: Adicional[]; preguntas: Pregunta[] };
// Item de inventario para el selector de composición (productos + equipos).
type ItemInv = { id: string; tipo: "producto" | "equipo"; nombre: string; precio: number; imagenUrl: string | null; categoria: string | null };
type LineaComp = { tipo: "producto" | "equipo"; referenciaId: string; cantidad: number; obligatorio: boolean };

type Seccion = "tipos" | "nichos" | "adicionales" | "preguntas";

const SECCIONES: { key: Seccion; label: string; icon: typeof Layers }[] = [
  { key: "tipos", label: "Tipos de evento", icon: Layers },
  { key: "nichos", label: "Nichos", icon: Tags },
  { key: "adicionales", label: "Adicionales", icon: PlusCircle },
  { key: "preguntas", label: "Preguntas", icon: HelpCircle },
];

const TIPO_RESPUESTA_LABEL: Record<string, string> = {
  SI_NO: "Sí / No",
  NUMERO: "Número",
  OPCION_UNICA: "Opción única",
  OPCION_MULTIPLE: "Opción múltiple",
  TEXTO: "Texto libre",
};

function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

// Alcance efectivo: si falta la columna, se deriva de nichos (retro-compat).
function alcanceEfectivo(q: Pregunta): "general" | "tipo" | "nicho" {
  if (q.alcance === "general" || q.alcance === "tipo" || q.alcance === "nicho") return q.alcance;
  return parseArr(q.nichos).length ? "nicho" : "general";
}

function parseComposicion(s: string | null | undefined): LineaComp[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v.map((l): LineaComp => ({
      tipo: l?.tipo === "equipo" ? "equipo" : "producto",
      referenciaId: String(l?.referenciaId || ""),
      cantidad: Math.max(1, Math.round(Number(l?.cantidad) || 1)),
      obligatorio: l?.obligatorio === false ? false : true,
    })).filter((l) => l.referenciaId);
  } catch { return []; }
}

export default function CatalogoEventosPage() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [cat, setCat] = useState<Catalogo>({ tipos: [], nichos: [], adicionales: [], preguntas: [] });
  const [inventario, setInventario] = useState<ItemInv[]>([]);
  const [seccion, setSeccion] = useState<Seccion>("tipos");
  const [cargando, setCargando] = useState(true);
  const [sembrando, setSembrando] = useState(false);
  const [sembrandoBase, setSembrandoBase] = useState(false);

  // editores
  const [editTipo, setEditTipo] = useState<Partial<TipoEvento> | null>(null);
  const [editNicho, setEditNicho] = useState<Partial<Nicho> | null>(null);
  const [editAdicional, setEditAdicional] = useState<Partial<Adicional> & { _tipos?: string[]; _nichos?: string[] } | null>(null);
  const [editPregunta, setEditPregunta] = useState<(Partial<Pregunta> & { _nichos?: string[]; _adicionalIds?: string[] }) | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const [rc, rp, re] = await Promise.all([fetch("/api/catalogo?todos=true"), fetch("/api/productos"), fetch("/api/equipos")]);
      if (rc.ok) setCat(await rc.json());
      const inv: ItemInv[] = [];
      if (rp.ok) {
        for (const p of (await rp.json()).productos as { id: string; nombre: string; precioFinal?: number; imagenUrl?: string | null; categoria?: string | null }[])
          inv.push({ id: p.id, tipo: "producto", nombre: p.nombre, precio: p.precioFinal ?? 0, imagenUrl: p.imagenUrl ?? null, categoria: p.categoria ?? null });
      }
      if (re.ok) {
        for (const eq of (await re.json()).equipos as { id: string; descripcion?: string; marca?: string; modelo?: string; precioRenta?: number; imagenUrl?: string | null; categoria?: { nombre: string } | null }[])
          inv.push({ id: eq.id, tipo: "equipo", nombre: [eq.descripcion, eq.marca, eq.modelo].filter(Boolean).join(" ").trim() || "Equipo", precio: eq.precioRenta ?? 0, imagenUrl: eq.imagenUrl ?? null, categoria: eq.categoria?.nombre ?? null });
      }
      setInventario(inv);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  const vacio = cat.tipos.length === 0 && cat.nichos.length === 0 && cat.adicionales.length === 0 && cat.preguntas.length === 0;

  async function sembrar() {
    setSembrando(true);
    try {
      const r = await fetch("/api/catalogo/seed", { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      const { resultado } = await r.json();
      success(`Catálogo sembrado: ${resultado.tipos} tipos, ${resultado.nichos} nichos, ${resultado.adicionales} adicionales, ${resultado.preguntas} preguntas`);
      await cargar();
    } catch (e) {
      error(e instanceof Error ? e.message : "No se pudo sembrar");
    } finally {
      setSembrando(false);
    }
  }

  async function sembrarBase() {
    setSembrandoBase(true);
    try {
      const r = await fetch("/api/catalogo/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base: true }) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      const { resultado } = await r.json();
      success(`Preguntas base: ${resultado.generales} generales + ${resultado.otros} de "Otros"`);
      await cargar();
    } catch (e) {
      error(e instanceof Error ? e.message : "No se pudo sembrar");
    } finally {
      setSembrandoBase(false);
    }
  }

  async function borrar(entidad: string, id: string, nombre: string) {
    const ok = await confirm({ title: "Eliminar", message: `¿Eliminar "${nombre}"?`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const r = await fetch(`/api/catalogo/${entidad}/${id}`, { method: "DELETE" });
    if (!r.ok) { error((await r.json()).error || "No se pudo eliminar"); return; }
    success("Eliminado");
    await cargar();
  }

  const tipoNombre = (slug: string) => cat.tipos.find((t) => t.slug.toUpperCase() === slug.toUpperCase())?.nombre || slug;

  // Agrega una pieza (producto o equipo del inventario) a la composición de un
  // adicional desde la lista, con un solo clic. Optimista + PATCH; si falla recarga.
  async function agregarPiezaAdicional(a: Adicional, item: ItemInv) {
    const comp = parseComposicion(a.composicion);
    if (comp.some((l) => l.tipo === item.tipo && l.referenciaId === item.id)) { error("Ya está en la composición"); return; }
    const nueva: LineaComp[] = [...comp, { tipo: item.tipo, referenciaId: item.id, cantidad: 1, obligatorio: true }];
    setCat((prev) => ({ ...prev, adicionales: prev.adicionales.map((x) => (x.id === a.id ? { ...x, composicion: JSON.stringify(nueva) } : x)) }));
    const r = await fetch(`/api/catalogo/adicionales/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ composicion: nueva }) });
    if (!r.ok) { error("No se pudo agregar la pieza"); await cargar(); return; }
    success(`Agregado a ${a.nombre}`);
  }

  // Reordena adicionales: recibe los ids en su nuevo orden global (arriba→abajo,
  // secciones concatenadas). Actualiza orden optimista y persiste solo los que
  // cambiaron. El orden es global aunque se muestre agrupado por tipo.
  async function reordenarAdicionales(idsEnOrden: string[]) {
    const ordenActual = new Map(cat.adicionales.map((a) => [a.id, a.orden]));
    setCat((prev) => ({
      ...prev,
      adicionales: prev.adicionales.map((a) => {
        const i = idsEnOrden.indexOf(a.id);
        return i >= 0 ? { ...a, orden: i } : a;
      }),
    }));
    const cambiados = idsEnOrden
      .map((id, i) => ({ id, i }))
      .filter(({ id, i }) => ordenActual.get(id) !== i);
    await Promise.all(
      cambiados.map(({ id, i }) =>
        fetch(`/api/catalogo/adicionales/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: i }),
        })
      )
    );
  }

  // Reordena preguntas: recibe los ids en su nuevo orden global (secciones
  // concatenadas). Igual que adicionales: orden global, persiste solo lo cambiado.
  async function reordenarPreguntas(idsEnOrden: string[]) {
    const ordenActual = new Map(cat.preguntas.map((q) => [q.id, q.orden]));
    setCat((prev) => ({
      ...prev,
      preguntas: prev.preguntas.map((q) => {
        const i = idsEnOrden.indexOf(q.id);
        return i >= 0 ? { ...q, orden: i } : q;
      }),
    }));
    const cambiados = idsEnOrden
      .map((id, i) => ({ id, i }))
      .filter(({ id, i }) => ordenActual.get(id) !== i);
    await Promise.all(
      cambiados.map(({ id, i }) =>
        fetch(`/api/catalogo/preguntas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: i }),
        })
      )
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="text-xl font-semibold text-white">Catálogo de Eventos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fuente única: tipos, nichos, adicionales y preguntas. Alimenta el descubrimiento y las cotizaciones.</p>
        </div>
        {vacio && (
          <button onClick={sembrar} disabled={sembrando} className="shrink-0 inline-flex items-center gap-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
            <Sparkles size={15} /> {sembrando ? "Sembrando…" : "Sembrar catálogo base"}
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-[#1a1a1a] mt-4 mb-5">
        {SECCIONES.map((s) => {
          const Icon = s.icon;
          const count = cat[s.key].length;
          return (
            <button key={s.key} onClick={() => setSeccion(s.key)} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${seccion === s.key ? "border-[#B3985B] text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              <Icon size={15} /> {s.label} <span className="text-[11px] text-gray-600">{count}</span>
            </button>
          );
        })}
      </div>

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          {/* ── TIPOS ── */}
          {seccion === "tipos" && (
            <Seccionable titulo="Tipos de evento" onNuevo={() => setEditTipo({ orden: 0, activo: true })}>
              {cat.tipos.map((t) => (
                <Fila key={t.id} activo={t.activo} titulo={`${t.emoji ?? ""} ${t.nombre}`.trim()} sub={t.subtitulo || t.slug}
                  onEdit={() => setEditTipo(t)} onDelete={() => borrar("tipos-evento", t.id, t.nombre)} />
              ))}
              {cat.tipos.length === 0 && <Vacio />}
            </Seccionable>
          )}

          {/* ── NICHOS ── */}
          {seccion === "nichos" && (
            <Seccionable titulo="Nichos por tipo de evento" onNuevo={() => setEditNicho({ tipoEventoSlug: cat.tipos[0]?.slug.toUpperCase() || "SOCIAL", orden: 0, activo: true })}>
              {cat.tipos.map((tp) => {
                const nichos = cat.nichos.filter((n) => n.tipoEventoSlug.toUpperCase() === tp.slug.toUpperCase());
                if (!nichos.length) return null;
                return (
                  <div key={tp.id} className="mb-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{tp.nombre}</p>
                    {nichos.map((n) => (
                      <Fila key={n.id} activo={n.activo} titulo={n.nombre} sub={n.notasComerciales || n.descripcion || undefined}
                        onEdit={() => setEditNicho(n)} onDelete={() => borrar("nichos", n.id, n.nombre)} />
                    ))}
                  </div>
                );
              })}
              {cat.nichos.length === 0 && <Vacio />}
            </Seccionable>
          )}

          {/* ── ADICIONALES ── */}
          {seccion === "adicionales" && (
            <AdicionalesSeccion
              adicionales={cat.adicionales}
              tipos={cat.tipos}
              inventario={inventario}
              tipoNombre={tipoNombre}
              onNuevo={() => setEditAdicional({ frecuencia: "frecuente", activo: true, _tipos: [], _nichos: [] })}
              onEdit={(a) => setEditAdicional({ ...a, _tipos: parseArr(a.tiposEvento), _nichos: parseArr(a.nichos) })}
              onDelete={(a) => borrar("adicionales", a.id, a.nombre)}
              onReordenar={reordenarAdicionales}
              onAgregarPieza={agregarPiezaAdicional}
            />
          )}

          {/* ── PREGUNTAS ── */}
          {seccion === "preguntas" && (
            <PreguntasSeccion
              preguntas={cat.preguntas}
              tipos={cat.tipos}
              nichos={cat.nichos}
              onNuevo={(prefill) => setEditPregunta({ tipoRespuesta: "SI_NO", activa: true, reglas: [], _nichos: [], _adicionalIds: [], ...prefill })}
              onEdit={(q) => setEditPregunta({ ...q, _nichos: parseArr(q.nichos), _adicionalIds: q.reglas.flatMap((r) => parseArr(r.adicionalIds)) })}
              onDelete={(q) => borrar("preguntas", q.id, q.texto.slice(0, 30))}
              onReordenar={reordenarPreguntas}
              onSembrarBase={sembrarBase}
              sembrandoBase={sembrandoBase}
            />
          )}
        </>
      )}

      {/* Editores */}
      {editTipo && <TipoEditor value={editTipo} onClose={() => setEditTipo(null)} onSaved={() => { setEditTipo(null); cargar(); }} toast={{ success, error }} />}
      {editNicho && <NichoEditor value={editNicho} tipos={cat.tipos} onClose={() => setEditNicho(null)} onSaved={() => { setEditNicho(null); cargar(); }} toast={{ success, error }} />}
      {editAdicional && <AdicionalEditor value={editAdicional} tipos={cat.tipos} nichos={cat.nichos} inventario={inventario} onClose={() => setEditAdicional(null)} onSaved={() => { setEditAdicional(null); cargar(); }} toast={{ success, error }} />}
      {editPregunta && <PreguntaEditor value={editPregunta} tipos={cat.tipos} nichos={cat.nichos} adicionales={cat.adicionales} preguntas={cat.preguntas} onClose={() => setEditPregunta(null)} onSaved={() => { setEditPregunta(null); cargar(); }} toast={{ success, error }} />}
    </div>
  );
}

// ── Componentes de lista ──────────────────────────────────────────────────────
function Seccionable({ titulo, onNuevo, extra, children }: { titulo: string; onNuevo: () => void; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-300">{titulo}</p>
        <div className="flex items-center gap-2">
          {extra}
          <button onClick={onNuevo} className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

type Badge = { label: string; tone: "gold" | "green" | "red" | "gray" };
function Fila({ activo, titulo, sub, badges, onEdit, onDelete }: { activo: boolean; titulo: string; sub?: string; badges?: Badge[]; onEdit: () => void; onDelete: () => void }) {
  const toneCls: Record<Badge["tone"], string> = {
    gold: "bg-[#B3985B]/15 text-[#B3985B]",
    green: "bg-green-500/15 text-green-400",
    red: "bg-red-500/15 text-red-400",
    gray: "bg-[#2a2a2a] text-gray-400",
  };
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-[#111] border border-[#1f1f1f] ${activo ? "" : "opacity-50"}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate">{titulo}{!activo && <span className="ml-2 text-[10px] text-gray-500">(inactivo)</span>}</p>
        {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {badges.map((b, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${toneCls[b.tone]}`}>{b.label}</span>)}
          </div>
        )}
      </div>
      <button onClick={onEdit} className="text-gray-500 hover:text-white p-1"><Pencil size={14} /></button>
      <button onClick={onDelete} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
    </div>
  );
}

function Vacio() {
  return <p className="text-sm text-gray-600 py-6 text-center">Sin registros. Usa “Nuevo” o siembra el catálogo base.</p>;
}

// Adicionales agrupados por tipo de evento (por su tipo primario = primero de la
// lista) y reordenables por arrastre dentro de cada sección. El orden persistido
// es global; al soltar se recalcula la secuencia completa arriba→abajo.
function AdicionalesSeccion({ adicionales, tipos, inventario, tipoNombre, onNuevo, onEdit, onDelete, onReordenar, onAgregarPieza }: {
  adicionales: Adicional[];
  tipos: TipoEvento[];
  inventario: ItemInv[];
  tipoNombre: (slug: string) => string;
  onNuevo: () => void;
  onEdit: (a: Adicional) => void;
  onDelete: (a: Adicional) => void;
  onReordenar: (idsEnOrden: string[]) => void;
  onAgregarPieza: (a: Adicional, item: ItemInv) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  // Secciones en orden de catálogo de tipos; adicional filed bajo su tipo primario.
  const grupos = useMemo(() => {
    const ordenados = [...adicionales].sort((a, b) => a.orden - b.orden);
    const porTipo = new Map<string, Adicional[]>();
    const sinTipo: Adicional[] = [];
    for (const a of ordenados) {
      const primario = parseArr(a.tiposEvento)[0];
      if (!primario) { sinTipo.push(a); continue; }
      const key = primario.toUpperCase();
      const arr = porTipo.get(key) || [];
      arr.push(a);
      porTipo.set(key, arr);
    }
    const out = tipos
      .map((t) => ({ key: t.slug.toUpperCase(), label: t.nombre, items: porTipo.get(t.slug.toUpperCase()) || [] }))
      .filter((g) => g.items.length > 0);
    // Tipos presentes en datos pero fuera del catálogo activo.
    for (const [key, items] of porTipo) {
      if (!out.some((g) => g.key === key) && !tipos.some((t) => t.slug.toUpperCase() === key)) {
        out.push({ key, label: tipoNombre(key), items });
      }
    }
    if (sinTipo.length) out.push({ key: "__none", label: "Sin tipo de evento", items: sinTipo });
    return out;
  }, [adicionales, tipos, tipoNombre]);

  // Reordena dentro de una sección y emite la nueva secuencia global de ids.
  function soltarEn(grupoKey: string, targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const nuevoGlobal: string[] = [];
    for (const g of grupos) {
      if (g.key !== grupoKey) { nuevoGlobal.push(...g.items.map((a) => a.id)); continue; }
      const ids = g.items.map((a) => a.id).filter((id) => id !== dragId);
      const at = ids.indexOf(targetId);
      if (at < 0) { nuevoGlobal.push(...g.items.map((a) => a.id)); continue; }
      ids.splice(at, 0, dragId);
      nuevoGlobal.push(...ids);
    }
    setDragId(null);
    onReordenar(nuevoGlobal);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-300">Adicionales</p>
        <button onClick={onNuevo} className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Nuevo
        </button>
      </div>
      {adicionales.length === 0 ? (
        <Vacio />
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.key}>
              <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{g.label} <span className="text-gray-700">({g.items.length})</span></p>
              <div className="space-y-1.5">
                {g.items.map((a) => {
                  const nLineas = parseComposicion(a.composicion).length || (a.productoId ? 1 : 0);
                  const arrastrando = dragId === a.id;
                  return (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => soltarEn(g.key, a.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border ${arrastrando ? "border-[#B3985B] opacity-60" : "border-[#1f1f1f]"} ${a.activo ? "" : "opacity-50"}`}
                    >
                      <span className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 shrink-0"><GripVertical size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{a.nombre}{!a.activo && <span className="ml-2 text-[10px] text-gray-500">(inactivo)</span>}</p>
                        <p className="text-[11px] text-gray-500 truncate">{parseArr(a.tiposEvento).map(tipoNombre).join(" · ")}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.frecuencia === "ocasional" ? "bg-[#2a2a2a] text-gray-400" : "bg-[#B3985B]/15 text-[#B3985B]"}`}>{a.frecuencia === "ocasional" ? "ocasional" : "frecuente"}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${nLineas > 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{nLineas > 0 ? `${nLineas} pza${nLineas > 1 ? "s" : ""}` : "Sin composición"}</span>
                        </div>
                      </div>
                      <QuickAddPieza inventario={inventario} existentes={new Set(parseComposicion(a.composicion).map((l) => `${l.tipo}:${l.referenciaId}`))} onAgregar={(i) => onAgregarPieza(a, i)} />
                      <button onClick={() => onEdit(a)} className="text-gray-500 hover:text-white p-1"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(a)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Preguntas seccionadas por jerarquía: Generales (por bloque) → cada tipo de
// evento → sus nichos. Cada sección tiene su botón de "+ pregunta" que pre-llena
// el alcance, y las preguntas se reordenan por arrastre dentro de su sección.
type PrefillPregunta = Partial<Pregunta> & { _nichos?: string[] };
type GrupoPreg = { key: string; tipoKey: string | null; tipoLabel: string; grupoLabel: string; esNicho: boolean; prefill: PrefillPregunta; items: Pregunta[] };

function PreguntasSeccion({ preguntas, tipos, nichos, onNuevo, onEdit, onDelete, onReordenar, onSembrarBase, sembrandoBase }: {
  preguntas: Pregunta[];
  tipos: TipoEvento[];
  nichos: Nicho[];
  onNuevo: (prefill: PrefillPregunta) => void;
  onEdit: (q: Pregunta) => void;
  onDelete: (q: Pregunta) => void;
  onReordenar: (idsEnOrden: string[]) => void;
  onSembrarBase: () => void;
  sembrandoBase: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragGrupo, setDragGrupo] = useState<string | null>(null);

  const grupos = useMemo<GrupoPreg[]>(() => {
    const porOrden = (arr: Pregunta[]) => [...arr].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const out: GrupoPreg[] = [];
    // Generales por bloque (A/B/C siempre visibles para poder agregar).
    const generales = preguntas.filter((q) => alcanceEfectivo(q) === "general");
    const extra = [...new Set(generales.map((q) => (q.bloque || "A").toUpperCase()))].filter((b) => !["A", "B", "C"].includes(b));
    for (const b of ["A", "B", "C", ...extra]) {
      const items = porOrden(generales.filter((q) => (q.bloque || "A").toUpperCase() === b));
      out.push({ key: `gen:${b}`, tipoKey: null, tipoLabel: "Generales", grupoLabel: `Bloque ${b}`, esNicho: false, prefill: { alcance: "general", bloque: b }, items });
    }
    // Por tipo: preguntas del tipo + un subgrupo por nicho.
    for (const t of tipos) {
      const slug = t.slug;
      const tipoQs = porOrden(preguntas.filter((q) => alcanceEfectivo(q) === "tipo" && (q.tipoEventoSlug || "").toUpperCase() === slug.toUpperCase()));
      out.push({ key: `tipo:${slug}`, tipoKey: slug.toUpperCase(), tipoLabel: t.nombre, grupoLabel: "Preguntas del tipo", esNicho: false, prefill: { alcance: "tipo", tipoEventoSlug: slug }, items: tipoQs });
      for (const n of nichos.filter((x) => x.tipoEventoSlug.toUpperCase() === slug.toUpperCase())) {
        const nq = porOrden(preguntas.filter((q) => alcanceEfectivo(q) === "nicho" && parseArr(q.nichos).includes(n.slug)));
        out.push({ key: `nicho:${slug}:${n.slug}`, tipoKey: slug.toUpperCase(), tipoLabel: t.nombre, grupoLabel: n.nombre, esNicho: true, prefill: { alcance: "nicho", _nichos: [n.slug] }, items: nq });
      }
    }
    // Sin ubicar: nicho sin nichos válidos o tipo sin tipo del catálogo.
    const ubicadas = new Set(out.flatMap((g) => g.items.map((i) => i.id)));
    const sueltas = porOrden(preguntas.filter((q) => !ubicadas.has(q.id)));
    if (sueltas.length) out.push({ key: "__suelto", tipoKey: "__x", tipoLabel: "Sin ubicar", grupoLabel: "Revisa su clasificación", esNicho: false, prefill: {}, items: sueltas });
    return out;
  }, [preguntas, tipos, nichos]);

  function dedupe(ids: string[]): string[] {
    const seen = new Set<string>();
    return ids.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
  }

  function soltarEn(grupoKey: string, targetId: string) {
    if (!dragId || dragId === targetId || dragGrupo !== grupoKey) { setDragId(null); setDragGrupo(null); return; }
    const nuevo: string[] = [];
    for (const g of grupos) {
      if (g.key !== grupoKey) { nuevo.push(...g.items.map((i) => i.id)); continue; }
      const ids = g.items.map((i) => i.id).filter((id) => id !== dragId);
      const at = ids.indexOf(targetId);
      if (at < 0) { nuevo.push(...g.items.map((i) => i.id)); continue; }
      ids.splice(at, 0, dragId);
      nuevo.push(...ids);
    }
    setDragId(null);
    setDragGrupo(null);
    onReordenar(dedupe(nuevo));
  }

  let lastTipo: string | null | undefined = undefined;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-300">Preguntas por jerarquía</p>
        <button onClick={onSembrarBase} disabled={sembrandoBase} className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
          <Sparkles size={14} /> {sembrandoBase ? "Sembrando…" : "Sembrar generales"}
        </button>
      </div>
      <div className="space-y-2">
        {grupos.map((g) => {
          const nuevoTipo = g.tipoKey !== lastTipo;
          lastTipo = g.tipoKey;
          return (
            <div key={g.key}>
              {nuevoTipo && (
                <p className="text-xs font-semibold text-white mt-4 mb-1.5 border-b border-[#1a1a1a] pb-1">{g.tipoLabel}</p>
              )}
              <div className={g.esNicho ? "pl-3 border-l border-[#1a1a1a] ml-1" : ""}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{g.grupoLabel} <span className="text-gray-700">({g.items.length})</span></p>
                  {g.key !== "__suelto" && (
                    <button onClick={() => onNuevo(g.prefill)} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#B3985B]"><Plus size={12} /> Pregunta</button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {g.items.map((q) => {
                    const encendidos = q.reglas.flatMap((r) => parseArr(r.adicionalIds));
                    const arrastrando = dragId === q.id;
                    return (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={() => { setDragId(q.id); setDragGrupo(g.key); }}
                        onDragEnd={() => { setDragId(null); setDragGrupo(null); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => soltarEn(g.key, q.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border ${arrastrando ? "border-[#B3985B] opacity-60" : "border-[#1f1f1f]"} ${q.activa ? "" : "opacity-50"}`}
                      >
                        <span className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 shrink-0"><GripVertical size={14} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{q.texto}{!q.activa && <span className="ml-2 text-[10px] text-gray-500">(inactiva)</span>}</p>
                          <p className="text-[11px] text-gray-500 truncate">{TIPO_RESPUESTA_LABEL[q.tipoRespuesta] || q.tipoRespuesta}{q.obligatoria ? " · obligatoria" : ""}{q.preguntaPadreId ? " · condicional" : ""}{encendidos.length ? ` · enciende ${encendidos.length}` : ""}</p>
                        </div>
                        <button onClick={() => onEdit(q)} className="text-gray-500 hover:text-white p-1"><Pencil size={14} /></button>
                        <button onClick={() => onDelete(q)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                  {g.items.length === 0 && <p className="text-[11px] text-gray-700 py-1.5">Sin preguntas aquí. Usa “+ Pregunta”.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Botón de un clic para sumar una pieza (producto/equipo del inventario) a la
// composición de un adicional, con buscador emergente. `existentes` evita repetir.
function QuickAddPieza({ inventario, existentes, onAgregar }: { inventario: ItemInv[]; existentes: Set<string>; onAgregar: (i: ItemInv) => void }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [] as ItemInv[];
    return inventario.filter((i) => !existentes.has(`${i.tipo}:${i.id}`) && i.nombre.toLowerCase().includes(q)).slice(0, 8);
  }, [busca, inventario, existentes]);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} title="Agregar pieza a la composición" className="text-gray-500 hover:text-[#B3985B] p-1"><Plus size={14} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-2 shadow-xl">
            <input autoFocus className={inputCls} placeholder="Buscar producto o equipo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            {busca.trim() && (
              <div className="mt-1 max-h-56 overflow-auto">
                {resultados.length === 0 ? (
                  <p className="text-xs text-gray-600 px-2 py-1.5">Sin resultados.</p>
                ) : resultados.map((i) => (
                  <button key={`${i.tipo}:${i.id}`} type="button" onClick={() => { onAgregar(i); setBusca(""); setOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-[#161616]">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${i.tipo === "equipo" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400"}`}>{i.tipo === "equipo" ? "Equipo" : "Prod"}</span>
                    <span className="flex-1 text-sm text-gray-200 truncate">{i.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Inputs compartidos ──────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#B3985B] outline-none";

function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={`text-xs px-2.5 py-1 rounded-lg border ${on ? "bg-[#B3985B] border-[#B3985B] text-black" : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-400 hover:text-white"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type ToastFns = { success: (m: string) => void; error: (m: string) => void };

// ── Editores ────────────────────────────────────────────────────────────────
function TipoEditor({ value, onClose, onSaved, toast }: { value: Partial<TipoEvento>; onClose: () => void; onSaved: () => void; toast: ToastFns }) {
  const [f, setF] = useState({ nombre: value.nombre || "", emoji: value.emoji || "", subtitulo: value.subtitulo || "", descripcion: value.descripcion || "", activo: value.activo ?? true });
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    if (!f.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setGuardando(true);
    try {
      const url = value.id ? `/api/catalogo/tipos-evento/${value.id}` : "/api/catalogo/tipos-evento";
      const r = await fetch(url, { method: value.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      toast.success("Guardado"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setGuardando(false); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Editar tipo de evento" : "Nuevo tipo de evento"} maxWidth="max-w-lg">
      <div className="p-6">
        <Campo label="Nombre"><input className={inputCls} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Emoji"><input className={inputCls} value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} /></Campo>
          <Campo label="Subtítulo"><input className={inputCls} value={f.subtitulo} onChange={(e) => setF({ ...f, subtitulo: e.target.value })} /></Campo>
        </div>
        <Campo label="Descripción"><textarea className={inputCls} rows={3} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-4"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo</label>
        <Acciones onClose={onClose} onSave={guardar} guardando={guardando} />
      </div>
    </Modal>
  );
}

function NichoEditor({ value, tipos, onClose, onSaved, toast }: { value: Partial<Nicho>; tipos: TipoEvento[]; onClose: () => void; onSaved: () => void; toast: ToastFns }) {
  const [f, setF] = useState({ nombre: value.nombre || "", tipoEventoSlug: (value.tipoEventoSlug || tipos[0]?.slug || "SOCIAL").toUpperCase(), descripcion: value.descripcion || "", notasComerciales: value.notasComerciales || "", activo: value.activo ?? true });
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    if (!f.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setGuardando(true);
    try {
      const url = value.id ? `/api/catalogo/nichos/${value.id}` : "/api/catalogo/nichos";
      const r = await fetch(url, { method: value.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      toast.success("Guardado"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setGuardando(false); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Editar nicho" : "Nuevo nicho"} maxWidth="max-w-lg">
      <div className="p-6">
        <Campo label="Tipo de evento">
          <select className={inputCls} value={f.tipoEventoSlug} onChange={(e) => setF({ ...f, tipoEventoSlug: e.target.value })}>
            {tipos.map((t) => <option key={t.id} value={t.slug.toUpperCase()}>{t.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Nombre"><input className={inputCls} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <Campo label="Descripción corta"><input className={inputCls} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        <Campo label="Notas de criterio comercial"><textarea className={inputCls} rows={3} value={f.notasComerciales} onChange={(e) => setF({ ...f, notasComerciales: e.target.value })} placeholder="Lo que el vendedor debe saber de este nicho…" /></Campo>
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-4"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo</label>
        <Acciones onClose={onClose} onSave={guardar} guardando={guardando} />
      </div>
    </Modal>
  );
}

function AdicionalEditor({ value, tipos, nichos, inventario, onClose, onSaved, toast }: { value: Partial<Adicional> & { _tipos?: string[]; _nichos?: string[] }; tipos: TipoEvento[]; nichos: Nicho[]; inventario: ItemInv[]; onClose: () => void; onSaved: () => void; toast: ToastFns }) {
  // Composición inicial: usa composicion si existe; si no, migra el productoId legacy a una línea.
  const compInicial = useMemo<LineaComp[]>(() => {
    const c = parseComposicion(value.composicion);
    if (c.length) return c;
    if (value.productoId) return [{ tipo: "producto", referenciaId: value.productoId, cantidad: 1, obligatorio: true }];
    return [];
  }, [value.composicion, value.productoId]);
  const [f, setF] = useState({
    nombre: value.nombre || "", descripcion: value.descripcion || "", frecuencia: value.frecuencia || "frecuente",
    imagenUrl: value.imagenUrl || "", activo: value.activo ?? true,
    tipos: value._tipos || [], nichosSel: value._nichos || [], composicion: compInicial,
  });
  const [busca, setBusca] = useState("");
  const [guardando, setGuardando] = useState(false);
  const nichosDisponibles = useMemo(() => nichos.filter((n) => f.tipos.includes(n.tipoEventoSlug.toUpperCase())), [nichos, f.tipos]);
  const invMap = useMemo(() => new Map(inventario.map((i) => [`${i.tipo}:${i.id}`, i])), [inventario]);
  const claveInv = (l: LineaComp) => `${l.tipo}:${l.referenciaId}`;
  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [] as ItemInv[];
    const enComp = new Set(f.composicion.map(claveInv));
    return inventario.filter((i) => !enComp.has(`${i.tipo}:${i.id}`) && i.nombre.toLowerCase().includes(q)).slice(0, 8);
  }, [busca, inventario, f.composicion]);
  const total = useMemo(() => f.composicion.reduce((s, l) => s + l.cantidad * (invMap.get(claveInv(l))?.precio ?? 0), 0), [f.composicion, invMap]);

  function agregar(i: ItemInv) {
    setF((p) => ({ ...p, composicion: [...p.composicion, { tipo: i.tipo, referenciaId: i.id, cantidad: 1, obligatorio: true }] }));
    setBusca("");
  }
  function actualizar(idx: number, patch: Partial<LineaComp>) {
    setF((p) => ({ ...p, composicion: p.composicion.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));
  }
  function quitar(idx: number) {
    setF((p) => ({ ...p, composicion: p.composicion.filter((_, i) => i !== idx) }));
  }

  async function guardar() {
    if (!f.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setGuardando(true);
    try {
      const url = value.id ? `/api/catalogo/adicionales/${value.id}` : "/api/catalogo/adicionales";
      const productoId = f.composicion.find((l) => l.tipo === "producto")?.referenciaId || null; // compat legacy
      const body = { nombre: f.nombre, descripcion: f.descripcion, frecuencia: f.frecuencia, productoId, composicion: f.composicion, imagenUrl: f.imagenUrl || null, activo: f.activo, tiposEvento: f.tipos, nichos: f.nichosSel };
      const r = await fetch(url, { method: value.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      toast.success("Guardado"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setGuardando(false); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Editar adicional" : "Nuevo adicional"} maxWidth="max-w-lg">
      <div className="p-6">
        <Campo label="Nombre"><input className={inputCls} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
        <Campo label="Descripción"><input className={inputCls} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        <Campo label="Aplica a tipos de evento"><Chips options={tipos.map((t) => ({ value: t.slug.toUpperCase(), label: t.nombre }))} value={f.tipos} onChange={(v) => setF({ ...f, tipos: v, nichosSel: f.nichosSel.filter((s) => nichos.find((n) => n.slug === s && v.includes(n.tipoEventoSlug.toUpperCase()))) })} /></Campo>
        {nichosDisponibles.length > 0 && (
          <Campo label="Nichos (opcional — vacío = todo el tipo)"><Chips options={nichosDisponibles.map((n) => ({ value: n.slug, label: n.nombre }))} value={f.nichosSel} onChange={(v) => setF({ ...f, nichosSel: v })} /></Campo>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Frecuencia">
            <select className={inputCls} value={f.frecuencia} onChange={(e) => setF({ ...f, frecuencia: e.target.value })}>
              <option value="frecuente">Frecuente</option>
              <option value="ocasional">Ocasional</option>
            </select>
          </Campo>
          <Campo label="Imagen (URL)"><input className={inputCls} value={f.imagenUrl} onChange={(e) => setF({ ...f, imagenUrl: e.target.value })} /></Campo>
        </div>

        {/* ── Composición (productos + equipos del inventario) ── */}
        <Campo label="Composición (qué incluye este adicional)">
          <div className="space-y-1.5">
            {f.composicion.map((l, idx) => {
              const it = invMap.get(claveInv(l));
              return (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-[#111] border border-[#1f1f1f] px-2.5 py-1.5">
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${l.tipo === "equipo" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400"}`}>{l.tipo === "equipo" ? "Equipo" : "Prod"}</span>
                  <span className="flex-1 text-sm text-gray-200 truncate">{it?.nombre || <span className="text-red-400">No encontrado</span>}</span>
                  <input type="number" min={1} value={l.cantidad} onChange={(e) => actualizar(idx, { cantidad: Math.max(1, Number(e.target.value) || 1) })} className="w-14 bg-[#0a0a0a] border border-[#222] rounded px-2 py-1 text-sm text-white text-center" />
                  <button type="button" onClick={() => actualizar(idx, { obligatorio: !l.obligatorio })} className={`text-[10px] px-2 py-1 rounded font-medium ${l.obligatorio ? "bg-[#B3985B]/20 text-[#B3985B]" : "bg-[#1a1a1a] text-gray-500"}`}>{l.obligatorio ? "Obligatorio" : "Opcional"}</button>
                  <button type="button" onClick={() => quitar(idx)} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              );
            })}
            {f.composicion.length === 0 && <p className="text-xs text-gray-600 py-1">Aún sin piezas. Busca productos o equipos del inventario abajo.</p>}
          </div>
          <div className="relative mt-2">
            <input className={inputCls} placeholder="Buscar producto o equipo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            {resultados.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-[#0d0d0d] border border-[#242424] rounded-lg shadow-xl max-h-56 overflow-auto">
                {resultados.map((i) => (
                  <button key={`${i.tipo}:${i.id}`} type="button" onClick={() => agregar(i)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#161616]">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${i.tipo === "equipo" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400"}`}>{i.tipo === "equipo" ? "Equipo" : "Prod"}</span>
                    <span className="flex-1 text-sm text-gray-200 truncate">{i.nombre}</span>
                    {i.categoria && <span className="text-[10px] text-gray-600 truncate max-w-[90px]">{i.categoria}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {f.composicion.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1.5">Estimado (renta): <span className="text-gray-300">${total.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</span></p>
          )}
        </Campo>
        <Link href="/comercial/productos/lista?nuevoProducto=1" className="inline-flex items-center gap-1.5 text-xs text-[#B3985B] hover:underline mb-3">
          <PlusCircle size={13} /> Dar de alta en inventario
        </Link>

        <label className="flex items-center gap-2 text-sm text-gray-400 mb-4"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo</label>
        <Acciones onClose={onClose} onSave={guardar} guardando={guardando} />
      </div>
    </Modal>
  );
}

function PreguntaEditor({ value, tipos, nichos, adicionales, preguntas, onClose, onSaved, toast }: { value: Partial<Pregunta> & { _nichos?: string[]; _adicionalIds?: string[] }; tipos: TipoEvento[]; nichos: Nicho[]; adicionales: Adicional[]; preguntas: Pregunta[]; onClose: () => void; onSaved: () => void; toast: ToastFns }) {
  const alcanceInicial = (value.alcance === "general" || value.alcance === "tipo" || value.alcance === "nicho")
    ? value.alcance
    : ((value._nichos?.length ?? 0) ? "nicho" : "general");
  const [f, setF] = useState({
    texto: value.texto || "", tipoRespuesta: value.tipoRespuesta || "SI_NO", activa: value.activa ?? true,
    alcance: alcanceInicial as "general" | "tipo" | "nicho",
    tipoEventoSlug: value.tipoEventoSlug || "", bloque: value.bloque || "A", obligatoria: value.obligatoria ?? false,
    preguntaPadreId: value.preguntaPadreId || "", condicionValor: value.condicionValor || "",
    nichosSel: value._nichos || [], adicionalIds: value._adicionalIds || [],
    opciones: parseArr(value.opciones) as string[],
  });
  const [nuevaOpcion, setNuevaOpcion] = useState("");
  const conOpciones = f.tipoRespuesta === "OPCION_UNICA" || f.tipoRespuesta === "OPCION_MULTIPLE";
  const [guardando, setGuardando] = useState(false);
  // Posibles padres: cualquier otra pregunta (no ella misma). El valor esperado es libre
  // para respetar SI_NO ("Sí"/"No") u opciones personalizadas.
  const posiblesPadres = preguntas.filter((p) => p.id !== value.id);
  async function guardar() {
    if (!f.texto.trim()) { toast.error("Texto requerido"); return; }
    if (f.alcance === "tipo" && !f.tipoEventoSlug) { toast.error("Elige el tipo de evento"); return; }
    if (conOpciones && f.opciones.length === 0) { toast.error("Agrega al menos una opción de respuesta"); return; }
    setGuardando(true);
    try {
      const url = value.id ? `/api/catalogo/preguntas/${value.id}` : "/api/catalogo/preguntas";
      const reglas = [{ condicion: { op: "truthy" }, categoriasEquipo: [], adicionalIds: f.adicionalIds }];
      const body = {
        texto: f.texto, tipoRespuesta: f.tipoRespuesta, activa: f.activa,
        opciones: conOpciones ? f.opciones : [],
        alcance: f.alcance,
        nichos: f.alcance === "nicho" ? f.nichosSel : [],
        tipoEventoSlug: f.alcance === "tipo" ? f.tipoEventoSlug : null,
        bloque: f.alcance === "general" ? f.bloque : null,
        obligatoria: f.obligatoria,
        preguntaPadreId: f.preguntaPadreId || null,
        condicionValor: f.preguntaPadreId ? (f.condicionValor || null) : null,
        reglas,
      };
      const r = await fetch(url, { method: value.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      toast.success("Guardado"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setGuardando(false); }
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Editar pregunta" : "Nueva pregunta"} maxWidth="max-w-lg">
      <div className="p-6">
        <Campo label="Pregunta (redáctala por resultado, no por equipo)"><textarea className={inputCls} rows={2} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} /></Campo>
        <Campo label="Tipo de respuesta">
          <select className={inputCls} value={f.tipoRespuesta} onChange={(e) => setF({ ...f, tipoRespuesta: e.target.value })}>
            {Object.entries(TIPO_RESPUESTA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        {conOpciones && (
          <Campo label={`Opciones de respuesta (${f.tipoRespuesta === "OPCION_MULTIPLE" ? "el cliente elige varias" : "el cliente elige una"})`}>
            <div className="space-y-1.5">
              {f.opciones.map((op, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-[#111] border border-[#1f1f1f] px-2.5 py-1.5">
                  <span className="flex-1 text-sm text-gray-200 truncate">{op}</span>
                  <button type="button" onClick={() => setF({ ...f, opciones: f.opciones.filter((_, i) => i !== idx) })} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
              {f.opciones.length === 0 && <p className="text-xs text-gray-600 py-1">Sin opciones todavía. Escribe una y pulsa Agregar.</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <input className={inputCls} placeholder="Nueva opción…" value={nuevaOpcion}
                onChange={(e) => setNuevaOpcion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = nuevaOpcion.trim(); if (v && !f.opciones.includes(v)) setF({ ...f, opciones: [...f.opciones, v] }); setNuevaOpcion(""); } }} />
              <button type="button" onClick={() => { const v = nuevaOpcion.trim(); if (v && !f.opciones.includes(v)) setF({ ...f, opciones: [...f.opciones, v] }); setNuevaOpcion(""); }}
                className="shrink-0 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white text-xs font-medium px-3 rounded-lg">Agregar</button>
            </div>
          </Campo>
        )}
        <Campo label="¿Dónde se pregunta? (jerarquía: general → tipo → nicho)">
          <div className="flex gap-2">
            {([["general", "General"], ["tipo", "Por tipo"], ["nicho", "Por nicho"]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setF({ ...f, alcance: k })}
                className={`flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ${f.alcance === k ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-[#2a2a2a] bg-[#111] text-gray-400 hover:border-[#444]"}`}>{lbl}</button>
            ))}
          </div>
        </Campo>
        {f.alcance === "general" && (
          <Campo label="Bloque (agrupa las generales)">
            <select className={inputCls} value={f.bloque} onChange={(e) => setF({ ...f, bloque: e.target.value })}>
              {["A", "B", "C"].map((b) => <option key={b} value={b}>Bloque {b}</option>)}
            </select>
          </Campo>
        )}
        {f.alcance === "tipo" && (
          <Campo label="Tipo de evento">
            <select className={inputCls} value={f.tipoEventoSlug} onChange={(e) => setF({ ...f, tipoEventoSlug: e.target.value })}>
              <option value="">— Elige —</option>
              {tipos.map((t) => <option key={t.slug} value={t.slug}>{t.nombre}</option>)}
            </select>
          </Campo>
        )}
        {f.alcance === "nicho" && (
          <Campo label="Nichos donde aplica (vacío = todo el tipo)"><Chips options={nichos.map((n) => ({ value: n.slug, label: n.nombre }))} value={f.nichosSel} onChange={(v) => setF({ ...f, nichosSel: v })} /></Campo>
        )}
        <Campo label="Al responder, enciende estos adicionales"><Chips options={adicionales.map((a) => ({ value: a.id, label: a.nombre }))} value={f.adicionalIds} onChange={(v) => setF({ ...f, adicionalIds: v })} /></Campo>
        <Campo label="Condicional: mostrar solo si otra pregunta se respondió…">
          <select className={inputCls} value={f.preguntaPadreId} onChange={(e) => setF({ ...f, preguntaPadreId: e.target.value })}>
            <option value="">— No es condicional —</option>
            {posiblesPadres.map((p) => <option key={p.id} value={p.id}>{p.texto.slice(0, 60)}</option>)}
          </select>
        </Campo>
        {f.preguntaPadreId && (
          <Campo label="…con este valor (vacío = cualquier respuesta afirmativa)"><input className={inputCls} value={f.condicionValor} onChange={(e) => setF({ ...f, condicionValor: e.target.value })} placeholder="Ej. Sí" /></Campo>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-3"><input type="checkbox" checked={f.obligatoria} onChange={(e) => setF({ ...f, obligatoria: e.target.checked })} /> Obligatoria</label>
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-4"><input type="checkbox" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} /> Activa</label>
        <Acciones onClose={onClose} onSave={guardar} guardando={guardando} />
      </div>
    </Modal>
  );
}

function Acciones({ onClose, onSave, guardando }: { onClose: () => void; onSave: () => void; guardando: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancelar</button>
      <button onClick={onSave} disabled={guardando} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{guardando ? "Guardando…" : "Guardar"}</button>
    </div>
  );
}
