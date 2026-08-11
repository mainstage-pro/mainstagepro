"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import { Layers, Tags, PlusCircle, HelpCircle, Pencil, Trash2, Plus, Sparkles } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type TipoEvento = { id: string; slug: string; nombre: string; emoji: string | null; subtitulo: string | null; descripcion: string | null; orden: number; activo: boolean };
type Nicho = { id: string; tipoEventoSlug: string; nombre: string; slug: string; descripcion: string | null; notasComerciales: string | null; orden: number; activo: boolean };
type Regla = { id?: string; condicion: string; categoriasEquipo: string | null; adicionalIds: string | null };
type Adicional = { id: string; nombre: string; descripcion: string | null; tiposEvento: string; nichos: string | null; frecuencia: string; productoId: string | null; imagenUrl: string | null; orden: number; activo: boolean; producto: { id: string; nombre: string } | null };
type Pregunta = { id: string; texto: string; tipoRespuesta: string; opciones: string | null; nichos: string | null; orden: number; activa: boolean; reglas: Regla[] };
type Catalogo = { tipos: TipoEvento[]; nichos: Nicho[]; adicionales: Adicional[]; preguntas: Pregunta[] };
type ProductoLite = { id: string; nombre: string };

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

export default function CatalogoEventosPage() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [cat, setCat] = useState<Catalogo>({ tipos: [], nichos: [], adicionales: [], preguntas: [] });
  const [productos, setProductos] = useState<ProductoLite[]>([]);
  const [seccion, setSeccion] = useState<Seccion>("tipos");
  const [cargando, setCargando] = useState(true);
  const [sembrando, setSembrando] = useState(false);

  // editores
  const [editTipo, setEditTipo] = useState<Partial<TipoEvento> | null>(null);
  const [editNicho, setEditNicho] = useState<Partial<Nicho> | null>(null);
  const [editAdicional, setEditAdicional] = useState<Partial<Adicional> & { _tipos?: string[]; _nichos?: string[] } | null>(null);
  const [editPregunta, setEditPregunta] = useState<(Partial<Pregunta> & { _nichos?: string[]; _adicionalIds?: string[] }) | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const [rc, rp] = await Promise.all([fetch("/api/catalogo?todos=true"), fetch("/api/productos")]);
      if (rc.ok) setCat(await rc.json());
      if (rp.ok) setProductos((await rp.json()).productos.map((p: ProductoLite) => ({ id: p.id, nombre: p.nombre })));
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

  async function borrar(entidad: string, id: string, nombre: string) {
    const ok = await confirm({ title: "Eliminar", message: `¿Eliminar "${nombre}"?`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const r = await fetch(`/api/catalogo/${entidad}/${id}`, { method: "DELETE" });
    if (!r.ok) { error((await r.json()).error || "No se pudo eliminar"); return; }
    success("Eliminado");
    await cargar();
  }

  const tipoNombre = (slug: string) => cat.tipos.find((t) => t.slug.toUpperCase() === slug.toUpperCase())?.nombre || slug;

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
            <Seccionable titulo="Adicionales" onNuevo={() => setEditAdicional({ frecuencia: "frecuente", activo: true, _tipos: [], _nichos: [] })}>
              {cat.adicionales.map((a) => (
                <Fila key={a.id} activo={a.activo}
                  titulo={a.nombre}
                  sub={parseArr(a.tiposEvento).map(tipoNombre).join(" · ")}
                  badges={[
                    a.frecuencia === "ocasional" ? { label: "ocasional", tone: "gray" as const } : { label: "frecuente", tone: "gold" as const },
                    a.producto ? { label: a.producto.nombre, tone: "green" as const } : { label: "Sin producto vinculado", tone: "red" as const },
                  ]}
                  onEdit={() => setEditAdicional({ ...a, _tipos: parseArr(a.tiposEvento), _nichos: parseArr(a.nichos) })}
                  onDelete={() => borrar("adicionales", a.id, a.nombre)} />
              ))}
              {cat.adicionales.length === 0 && <Vacio />}
            </Seccionable>
          )}

          {/* ── PREGUNTAS ── */}
          {seccion === "preguntas" && (
            <Seccionable titulo="Preguntas de descubrimiento" onNuevo={() => setEditPregunta({ tipoRespuesta: "SI_NO", activa: true, reglas: [], _nichos: [], _adicionalIds: [] })}>
              {cat.preguntas.map((q) => {
                const encendidos = q.reglas.flatMap((r) => parseArr(r.adicionalIds));
                return (
                  <Fila key={q.id} activo={q.activa} titulo={q.texto}
                    sub={`${TIPO_RESPUESTA_LABEL[q.tipoRespuesta] || q.tipoRespuesta} · enciende ${encendidos.length} adicional(es)`}
                    onEdit={() => setEditPregunta({ ...q, _nichos: parseArr(q.nichos), _adicionalIds: encendidos })}
                    onDelete={() => borrar("preguntas", q.id, q.texto.slice(0, 30))} />
                );
              })}
              {cat.preguntas.length === 0 && <Vacio />}
            </Seccionable>
          )}
        </>
      )}

      {/* Editores */}
      {editTipo && <TipoEditor value={editTipo} onClose={() => setEditTipo(null)} onSaved={() => { setEditTipo(null); cargar(); }} toast={{ success, error }} />}
      {editNicho && <NichoEditor value={editNicho} tipos={cat.tipos} onClose={() => setEditNicho(null)} onSaved={() => { setEditNicho(null); cargar(); }} toast={{ success, error }} />}
      {editAdicional && <AdicionalEditor value={editAdicional} tipos={cat.tipos} nichos={cat.nichos} productos={productos} onClose={() => setEditAdicional(null)} onSaved={() => { setEditAdicional(null); cargar(); }} toast={{ success, error }} />}
      {editPregunta && <PreguntaEditor value={editPregunta} nichos={cat.nichos} adicionales={cat.adicionales} onClose={() => setEditPregunta(null)} onSaved={() => { setEditPregunta(null); cargar(); }} toast={{ success, error }} />}
    </div>
  );
}

// ── Componentes de lista ──────────────────────────────────────────────────────
function Seccionable({ titulo, onNuevo, children }: { titulo: string; onNuevo: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-300">{titulo}</p>
        <button onClick={onNuevo} className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Nuevo
        </button>
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

function AdicionalEditor({ value, tipos, nichos, productos, onClose, onSaved, toast }: { value: Partial<Adicional> & { _tipos?: string[]; _nichos?: string[] }; tipos: TipoEvento[]; nichos: Nicho[]; productos: ProductoLite[]; onClose: () => void; onSaved: () => void; toast: ToastFns }) {
  const [f, setF] = useState({
    nombre: value.nombre || "", descripcion: value.descripcion || "", frecuencia: value.frecuencia || "frecuente",
    productoId: value.productoId || "", imagenUrl: value.imagenUrl || "", activo: value.activo ?? true,
    tipos: value._tipos || [], nichosSel: value._nichos || [],
  });
  const [guardando, setGuardando] = useState(false);
  const nichosDisponibles = useMemo(() => nichos.filter((n) => f.tipos.includes(n.tipoEventoSlug.toUpperCase())), [nichos, f.tipos]);
  async function guardar() {
    if (!f.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setGuardando(true);
    try {
      const url = value.id ? `/api/catalogo/adicionales/${value.id}` : "/api/catalogo/adicionales";
      const body = { nombre: f.nombre, descripcion: f.descripcion, frecuencia: f.frecuencia, productoId: f.productoId || null, imagenUrl: f.imagenUrl || null, activo: f.activo, tiposEvento: f.tipos, nichos: f.nichosSel };
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
        <Campo label="Producto vinculado (inventario)">
          <select className={inputCls} value={f.productoId} onChange={(e) => setF({ ...f, productoId: e.target.value })}>
            <option value="">— Sin producto vinculado —</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        {!f.productoId && (
          <Link href="/comercial/productos/lista?nuevoProducto=1" className="inline-flex items-center gap-1.5 text-xs text-[#B3985B] hover:underline mb-3">
            <PlusCircle size={13} /> Dar de alta en inventario
          </Link>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-4"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo</label>
        <Acciones onClose={onClose} onSave={guardar} guardando={guardando} />
      </div>
    </Modal>
  );
}

function PreguntaEditor({ value, nichos, adicionales, onClose, onSaved, toast }: { value: Partial<Pregunta> & { _nichos?: string[]; _adicionalIds?: string[] }; nichos: Nicho[]; adicionales: Adicional[]; onClose: () => void; onSaved: () => void; toast: ToastFns }) {
  const [f, setF] = useState({
    texto: value.texto || "", tipoRespuesta: value.tipoRespuesta || "SI_NO", activa: value.activa ?? true,
    nichosSel: value._nichos || [], adicionalIds: value._adicionalIds || [],
  });
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    if (!f.texto.trim()) { toast.error("Texto requerido"); return; }
    setGuardando(true);
    try {
      const url = value.id ? `/api/catalogo/preguntas/${value.id}` : "/api/catalogo/preguntas";
      const reglas = [{ condicion: { op: "truthy" }, categoriasEquipo: [], adicionalIds: f.adicionalIds }];
      const body = { texto: f.texto, tipoRespuesta: f.tipoRespuesta, activa: f.activa, nichos: f.nichosSel, reglas };
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
        <Campo label="Nichos donde aplica (vacío = todos)"><Chips options={nichos.map((n) => ({ value: n.slug, label: n.nombre }))} value={f.nichosSel} onChange={(v) => setF({ ...f, nichosSel: v })} /></Campo>
        <Campo label="Al responder, enciende estos adicionales"><Chips options={adicionales.map((a) => ({ value: a.id, label: a.nombre }))} value={f.adicionalIds} onChange={(v) => setF({ ...f, adicionalIds: v })} /></Campo>
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
