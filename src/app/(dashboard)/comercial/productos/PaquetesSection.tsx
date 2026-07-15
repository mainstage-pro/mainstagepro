"use client";

import { useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";

// ── Constantes ────────────────────────────────────────────────────────────────
const TIPOS_EVENTO = [
  { key: "MUSICAL", label: "Musical", emoji: "🎵" },
  { key: "SOCIAL", label: "Social", emoji: "🥂" },
  { key: "EMPRESARIAL", label: "Empresarial", emoji: "🏢" },
] as const;

const RANGOS_PERSONAS = [
  "1-100", "100-300", "300-500", "500-800", "800-1000",
  "1000-1500", "1500-2000", "2000-3000", "3000-5000",
];

const SUBTIPOS_EVENTO: Record<string, string[]> = {
  MUSICAL: ["Concierto", "Festival", "Música Electrónica", "Presentación Musical"],
  SOCIAL: ["Boda", "XV Años", "Bautizo", "Cumpleaños", "Fiesta Privada"],
  EMPRESARIAL: ["Congreso / Convención", "Lanzamiento de Marca", "Feria / Expo", "Taller / Capacitación"],
};

const CONCEPTOS_COMIDA = [
  { label: "1 comida por persona", precio: 150 },
  { label: "2 comidas por persona", precio: 300 },
  { label: "3 comidas por persona", precio: 450 },
];
const CONCEPTOS_TRANSPORTE = [
  { label: "Gasolina (corta)", precio: 250 },
  { label: "Gasolina (media)", precio: 500 },
  { label: "Gasolina (larga)", precio: 1000 },
  { label: "Gasolina (foránea)", precio: 1500 },
  { label: "Casetas", precio: 0 },
  { label: "Otros gastos", precio: 0 },
];
const CONCEPTOS_HOSPEDAJE = [
  { label: "Habitación doble", precio: 1200 },
  { label: "Habitación sencilla", precio: 1500 },
  { label: "Viáticos por elemento", precio: 500 },
];

const NIVELES = ["AAA", "AA", "A"];
const JORNADAS = ["CORTA", "MEDIA", "LARGA"];

// ── Tipos ─────────────────────────────────────────────────────────────────────
type EquipoItem = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  precioRenta: number;
  imagenUrl: string | null;
  categoria: { id: string; nombre: string } | null;
};

type ProductoLite = {
  id: string;
  nombre: string;
  categoria: string | null;
  imagenUrl: string | null;
  precioFinal: number;
};

type RolTecnico = {
  id: string;
  nombre: string;
  tipoPago: string;
  tarifaAAACorta: number | null; tarifaAAAMedia: number | null; tarifaAAALarga: number | null;
  tarifaAACorta: number | null; tarifaAAMedia: number | null; tarifaAALarga: number | null;
  tarifaACorta: number | null; tarifaAMedia: number | null; tarifaALarga: number | null;
  tarifaPlanaAAA: number | null; tarifaPlanaAA: number | null; tarifaPlanaA: number | null;
  tarifaHoraAAA: number | null; tarifaHoraAA: number | null; tarifaHoraA: number | null;
};

type PaqueteItem = {
  id: string;
  tipo: string;
  cantidad: number;
  equipo: EquipoItem | null;
  producto: (ProductoLite & { items: { cantidad: number; equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null } }[] }) | null;
};

type PaqueteConcepto = {
  id: string;
  tipo: string;
  descripcion: string;
  rolTecnicoId: string | null;
  nivel: string | null;
  jornada: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
};

type Paquete = {
  id: string;
  nombre: string;
  tipoEvento: string;
  rangoPersonas: string | null;
  subtiposEvento: string | null;
  resumen: string | null;
  descripcion: string | null;
  propuestaValor: string | null;
  items: PaqueteItem[];
  conceptos: PaqueteConcepto[];
  imagenes: { id: string; url: string; orden: number }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmx(n: number) {
  return `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}
function nombreEq(e: EquipoItem) {
  return e.marca && e.modelo ? `${e.marca} ${e.modelo}` : e.marca || e.modelo || e.descripcion;
}
function parseTags(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}
function getRolTarifa(rol: RolTecnico, nivel: string, jornada: string): number {
  if (rol.tipoPago === "TARIFA_PLANA" || rol.tipoPago === "POR_PROYECTO") {
    return (rol[`tarifaPlana${nivel}` as keyof RolTecnico] as number | null) ?? 0;
  }
  if (rol.tipoPago === "POR_HORA") {
    return (rol[`tarifaHora${nivel}` as keyof RolTecnico] as number | null) ?? 0;
  }
  const j = jornada.charAt(0) + jornada.slice(1).toLowerCase();
  return (rol[`tarifa${nivel}${j}` as keyof RolTecnico] as number | null) ?? 0;
}

// ── Estado del formulario ───────────────────────────────────────────────────────
type FormItem = { tipo: "EQUIPO" | "PRODUCTO"; equipoId?: string; productoId?: string; cantidad: number };
type FormConcepto = {
  key: string; tipo: string; descripcion: string; rolTecnicoId?: string;
  nivel?: string; jornada?: string; cantidad: number; dias: number; precioUnitario: number;
};
type FormState = {
  nombre: string;
  rangoPersonas: string;
  subtipos: string[];
  resumen: string;
  descripcion: string;
  propuestaValor: string;
  items: FormItem[];
  conceptos: FormConcepto[];
  imagenes: { url: string }[];
};

const FORM_EMPTY: FormState = {
  nombre: "", rangoPersonas: "", subtipos: [], resumen: "", descripcion: "",
  propuestaValor: "", items: [], conceptos: [], imagenes: [],
};

function uid() { return Math.random().toString(36).slice(2); }

// ── Editor ──────────────────────────────────────────────────────────────────────
function PaqueteEditor({
  form, setForm, tipoEvento, equipos, productos, roles, generandoIA, onGenerarIA,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  tipoEvento: string;
  equipos: EquipoItem[];
  productos: ProductoLite[];
  roles: RolTecnico[];
  generandoIA: boolean;
  onGenerarIA: () => void;
}) {
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [nuevoConcepto, setNuevoConcepto] = useState<{ tipo: string; rolTecnicoId: string; nivel: string; jornada: string; concepto: string; descripcion: string; precio: string; cantidad: string; dias: string }>({
    tipo: "OPERACION_TECNICA", rolTecnicoId: "", nivel: "AA", jornada: "MEDIA",
    concepto: CONCEPTOS_COMIDA[0].label, descripcion: "", precio: "", cantidad: "1", dias: "1",
  });

  const equipoMap = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos]);
  const productoMap = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const rolMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const subtiposDisponibles = SUBTIPOS_EVENTO[tipoEvento] ?? [];

  // Búsqueda combinada equipos + productos
  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return { equipos: [] as EquipoItem[], productos: [] as ProductoLite[] };
    const eqSel = new Set(form.items.filter((i) => i.tipo === "EQUIPO").map((i) => i.equipoId));
    const prodSel = new Set(form.items.filter((i) => i.tipo === "PRODUCTO").map((i) => i.productoId));
    return {
      equipos: equipos.filter((e) => !eqSel.has(e.id) && (nombreEq(e).toLowerCase().includes(q) || e.descripcion.toLowerCase().includes(q))).slice(0, 20),
      productos: productos.filter((p) => !prodSel.has(p.id) && p.nombre.toLowerCase().includes(q)).slice(0, 12),
    };
  }, [busqueda, equipos, productos, form.items]);

  const precioItems = form.items.reduce((s, it) => {
    if (it.tipo === "PRODUCTO") return s + it.cantidad * (productoMap.get(it.productoId!)?.precioFinal ?? 0);
    return s + it.cantidad * (equipoMap.get(it.equipoId!)?.precioRenta ?? 0);
  }, 0);
  const precioConceptos = form.conceptos.reduce((s, c) => s + c.precioUnitario * c.cantidad * c.dias, 0);
  const totalBase = precioItems + precioConceptos;

  function toggleSubtipo(s: string) {
    setForm({ ...form, subtipos: form.subtipos.includes(s) ? form.subtipos.filter((x) => x !== s) : [...form.subtipos, s] });
  }
  function addEquipo(id: string) {
    if (form.items.some((i) => i.tipo === "EQUIPO" && i.equipoId === id)) return;
    setForm({ ...form, items: [...form.items, { tipo: "EQUIPO", equipoId: id, cantidad: 1 }] });
    setBusqueda("");
  }
  function addProducto(id: string) {
    if (form.items.some((i) => i.tipo === "PRODUCTO" && i.productoId === id)) return;
    setForm({ ...form, items: [...form.items, { tipo: "PRODUCTO", productoId: id, cantidad: 1 }] });
    setBusqueda("");
  }
  function setItemCant(idx: number, c: number) {
    setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, cantidad: Math.max(1, c) } : it)) });
  }
  function removeItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  async function onImgs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setSubiendo(true);
    try {
      const nuevas: { url: string }[] = [];
      for (const file of files) {
        const blob = await upload(`paquetes/${Date.now()}-${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload/token",
        });
        nuevas.push({ url: blob.url });
      }
      setForm({ ...form, imagenes: [...form.imagenes, ...nuevas] });
    } catch {
      toast.error("No se pudo subir alguna imagen.");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }
  function removeImg(url: string) {
    setForm({ ...form, imagenes: form.imagenes.filter((im) => im.url !== url) });
  }

  function addConcepto() {
    const nc = nuevoConcepto;
    let concepto: FormConcepto | null = null;
    if (nc.tipo === "OPERACION_TECNICA") {
      const rol = rolMap.get(nc.rolTecnicoId);
      if (!rol) { toast.error("Elige un rol técnico."); return; }
      const tarifa = getRolTarifa(rol, nc.nivel, nc.jornada);
      concepto = {
        key: uid(), tipo: "OPERACION_TECNICA", descripcion: rol.nombre, rolTecnicoId: rol.id,
        nivel: nc.nivel, jornada: nc.jornada, cantidad: Math.max(1, parseInt(nc.cantidad) || 1),
        dias: Math.max(1, parseInt(nc.dias) || 1), precioUnitario: parseFloat(nc.precio) || tarifa,
      };
    } else if (nc.tipo === "OTRO") {
      if (!nc.descripcion.trim()) { toast.error("Describe el concepto adicional."); return; }
      concepto = {
        key: uid(), tipo: "OTRO", descripcion: nc.descripcion.trim(),
        cantidad: Math.max(1, parseInt(nc.cantidad) || 1), dias: Math.max(1, parseInt(nc.dias) || 1),
        precioUnitario: parseFloat(nc.precio) || 0,
      };
    } else {
      // COMIDA | TRANSPORTE | HOSPEDAJE
      concepto = {
        key: uid(), tipo: nc.tipo, descripcion: nc.concepto,
        cantidad: Math.max(1, parseInt(nc.cantidad) || 1), dias: Math.max(1, parseInt(nc.dias) || 1),
        precioUnitario: parseFloat(nc.precio) || 0,
      };
    }
    setForm({ ...form, conceptos: [...form.conceptos, concepto] });
  }
  function removeConcepto(key: string) {
    setForm({ ...form, conceptos: form.conceptos.filter((c) => c.key !== key) });
  }

  const conceptoPresets = nuevoConcepto.tipo === "COMIDA" ? CONCEPTOS_COMIDA
    : nuevoConcepto.tipo === "TRANSPORTE" ? CONCEPTOS_TRANSPORTE
    : nuevoConcepto.tipo === "HOSPEDAJE" ? CONCEPTOS_HOSPEDAJE : [];

  const inputCls = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";
  const labelCls = "text-[11px] text-[#B3985B] font-medium block mb-1";

  return (
    <div className="space-y-5">
      {/* Nombre + rango */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nombre del paquete *</label>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Paquete Boda Premium — Audio + Iluminación" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Rango de personas</label>
          <select value={form.rangoPersonas} onChange={(e) => setForm({ ...form, rangoPersonas: e.target.value })} className={inputCls}>
            <option value="">— Selecciona —</option>
            {RANGOS_PERSONAS.map((r) => <option key={r} value={r}>{r} personas</option>)}
          </select>
        </div>
      </div>

      {/* Subtipos */}
      <div>
        <label className={labelCls}>Tipo de evento específico (recomendación)</label>
        <div className="flex flex-wrap gap-1.5">
          {subtiposDisponibles.map((s) => {
            const on = form.subtipos.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSubtipo(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${on ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Descripción IA */}
      <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium">Descripción del paquete</p>
          <button type="button" onClick={onGenerarIA} disabled={generandoIA}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30 disabled:opacity-40 transition-colors font-semibold">
            {generandoIA ? "Generando…" : "✨ Generar con IA"}
          </button>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Resumen</label>
          <textarea value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} rows={2}
            placeholder="Resumen corto del paquete…" className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Descripción general</label>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3}
            placeholder="Alcance técnico y experiencia que entrega…" className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Propuesta de valor</label>
          <textarea value={form.propuestaValor} onChange={(e) => setForm({ ...form, propuestaValor: e.target.value })} rows={2}
            placeholder="Diferenciadores y valor para el cliente…" className={`${inputCls} resize-none`} />
        </div>
      </div>

      {/* Imágenes de referencia */}
      <div>
        <label className={labelCls}>Imágenes de referencia</label>
        <div className="flex flex-wrap gap-2">
          {form.imagenes.map((im) => (
            <div key={im.url} className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#1a1a1a] group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImg(im.url)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-md bg-black/70 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </div>
          ))}
          <label className="w-20 h-20 rounded-lg border border-dashed border-[#333] flex items-center justify-center cursor-pointer hover:border-[#B3985B] text-gray-600 hover:text-[#B3985B] text-xs text-center">
            <input type="file" accept="image/*" multiple onChange={onImgs} className="hidden" />
            {subiendo ? "Subiendo…" : "+ Imagen"}
          </label>
        </div>
      </div>

      {/* Equipos y productos */}
      <div>
        <label className={labelCls}>Equipos y productos ({form.items.length})</label>
        {form.items.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {form.items.map((it, idx) => {
              const eq = it.tipo === "EQUIPO" ? equipoMap.get(it.equipoId!) : null;
              const prod = it.tipo === "PRODUCTO" ? productoMap.get(it.productoId!) : null;
              const nombre = eq ? nombreEq(eq) : prod?.nombre ?? "—";
              const precio = eq ? eq.precioRenta : prod?.precioFinal ?? 0;
              const img = eq?.imagenUrl ?? prod?.imagenUrl ?? null;
              return (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-2 py-1.5">
                  <span className="w-9 h-9 rounded-md bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : <span className="text-gray-700">{it.tipo === "PRODUCTO" ? "🧩" : "📦"}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{nombre}</p>
                    <p className="text-gray-500 text-[10px]">{it.tipo === "PRODUCTO" ? "Producto" : "Equipo"} · {fmx(precio)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setItemCant(idx, it.cantidad - 1)} className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm">−</button>
                    <input type="number" value={it.cantidad} onChange={(e) => setItemCant(idx, parseInt(e.target.value) || 1)}
                      className="w-12 h-6 bg-[#111] border border-[#2a2a2a] rounded-md text-white text-xs text-center focus:outline-none focus:border-[#B3985B]" />
                    <button type="button" onClick={() => setItemCant(idx, it.cantidad + 1)} className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm">+</button>
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="w-6 h-6 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm shrink-0">×</button>
                </div>
              );
            })}
          </div>
        )}
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar equipo del inventario o producto…" className={inputCls} />
        {busqueda.trim() && (
          <div className="mt-1.5 max-h-56 overflow-y-auto space-y-1 border border-[#1e1e1e] rounded-lg p-1.5 bg-[#0d0d0d]">
            {resultados.productos.length === 0 && resultados.equipos.length === 0 && (
              <p className="text-gray-600 text-xs px-2 py-1">Sin resultados.</p>
            )}
            {resultados.productos.map((p) => (
              <button key={`p-${p.id}`} type="button" onClick={() => addProducto(p.id)}
                className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors">
                <span className="text-[10px] bg-[#B3985B]/15 text-[#B3985B] rounded px-1.5 py-0.5 shrink-0">Producto</span>
                <span className="text-white text-xs flex-1 truncate">{p.nombre}</span>
                <span className="text-[#B3985B] text-[10px]">{fmx(p.precioFinal)}</span>
              </button>
            ))}
            {resultados.equipos.map((e) => (
              <button key={`e-${e.id}`} type="button" onClick={() => addEquipo(e.id)}
                className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors">
                <span className="text-[10px] bg-[#1a1a1a] text-gray-400 rounded px-1.5 py-0.5 shrink-0">Equipo</span>
                <span className="text-white text-xs flex-1 truncate">{nombreEq(e)}</span>
                <span className="text-gray-500 text-[10px]">{e.categoria?.nombre}</span>
                <span className="text-[#B3985B] text-[10px]">{fmx(e.precioRenta)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conceptos operativos */}
      <div>
        <label className={labelCls}>Conceptos operativos ({form.conceptos.length})</label>
        {form.conceptos.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {form.conceptos.map((c) => (
              <div key={c.key} className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-2.5 py-1.5">
                <span className="text-[10px] bg-[#1a1a1a] text-gray-400 rounded px-1.5 py-0.5 shrink-0">{ETIQUETA_TIPO[c.tipo] ?? c.tipo}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs truncate">{c.descripcion}{c.nivel ? ` · ${c.nivel}/${c.jornada}` : ""}</p>
                  <p className="text-gray-500 text-[10px]">{c.cantidad} × {c.dias} día(s) × {fmx(c.precioUnitario)}</p>
                </div>
                <span className="text-[#B3985B] text-xs shrink-0">{fmx(c.precioUnitario * c.cantidad * c.dias)}</span>
                <button type="button" onClick={() => removeConcepto(c.key)} className="w-6 h-6 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm shrink-0">×</button>
              </div>
            ))}
          </div>
        )}
        {/* Alta de concepto */}
        <div className="rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { t: "OPERACION_TECNICA", l: "Personal técnico" },
              { t: "TRANSPORTE", l: "Transporte" },
              { t: "HOSPEDAJE", l: "Hospedaje" },
              { t: "COMIDA", l: "Comida / Viáticos" },
              { t: "OTRO", l: "Adicional" },
            ].map((o) => (
              <button key={o.t} type="button"
                onClick={() => setNuevoConcepto((p) => ({ ...p, tipo: o.t, concepto: (o.t === "COMIDA" ? CONCEPTOS_COMIDA : o.t === "TRANSPORTE" ? CONCEPTOS_TRANSPORTE : o.t === "HOSPEDAJE" ? CONCEPTOS_HOSPEDAJE : [{ label: "" }])[0].label, precio: "" }))}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${nuevoConcepto.tipo === o.t ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>
                {o.l}
              </button>
            ))}
          </div>

          {nuevoConcepto.tipo === "OPERACION_TECNICA" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={nuevoConcepto.rolTecnicoId}
                onChange={(e) => {
                  const rol = rolMap.get(e.target.value);
                  const tarifa = rol ? getRolTarifa(rol, nuevoConcepto.nivel, nuevoConcepto.jornada) : 0;
                  setNuevoConcepto((p) => ({ ...p, rolTecnicoId: e.target.value, precio: tarifa ? String(tarifa) : p.precio }));
                }}
                className={`${inputCls} col-span-2`}>
                <option value="">— Rol técnico —</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <select value={nuevoConcepto.nivel}
                onChange={(e) => {
                  const rol = rolMap.get(nuevoConcepto.rolTecnicoId);
                  const tarifa = rol ? getRolTarifa(rol, e.target.value, nuevoConcepto.jornada) : 0;
                  setNuevoConcepto((p) => ({ ...p, nivel: e.target.value, precio: tarifa ? String(tarifa) : p.precio }));
                }}
                className={inputCls}>
                {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={nuevoConcepto.jornada}
                onChange={(e) => {
                  const rol = rolMap.get(nuevoConcepto.rolTecnicoId);
                  const tarifa = rol ? getRolTarifa(rol, nuevoConcepto.nivel, e.target.value) : 0;
                  setNuevoConcepto((p) => ({ ...p, jornada: e.target.value, precio: tarifa ? String(tarifa) : p.precio }));
                }}
                className={inputCls}>
                {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          ) : nuevoConcepto.tipo === "OTRO" ? (
            <input value={nuevoConcepto.descripcion} onChange={(e) => setNuevoConcepto((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Describe el concepto adicional…" className={inputCls} />
          ) : (
            <select value={nuevoConcepto.concepto}
              onChange={(e) => {
                const preset = conceptoPresets.find((c) => c.label === e.target.value);
                setNuevoConcepto((p) => ({ ...p, concepto: e.target.value, precio: preset ? String(preset.precio) : p.precio }));
              }}
              className={inputCls}>
              {conceptoPresets.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
            </select>
          )}

          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Cantidad</label>
              <input type="number" min="1" value={nuevoConcepto.cantidad} onChange={(e) => setNuevoConcepto((p) => ({ ...p, cantidad: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Días</label>
              <input type="number" min="1" value={nuevoConcepto.dias} onChange={(e) => setNuevoConcepto((p) => ({ ...p, dias: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Precio unit.</label>
              <input type="number" min="0" value={nuevoConcepto.precio} onChange={(e) => setNuevoConcepto((p) => ({ ...p, precio: e.target.value }))} placeholder="0" className={inputCls} />
            </div>
          </div>
          <button type="button" onClick={addConcepto}
            className="w-full py-2 rounded-lg bg-[#1a1a1a] text-[#B3985B] text-xs font-semibold hover:bg-[#222] transition-colors">
            + Agregar concepto
          </button>
        </div>
      </div>

      {/* Total base */}
      <div className="rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-[10px]">Total base estimado (equipos/productos + operativo)</p>
          <p className="text-[10px] text-gray-600">Equipos/productos {fmx(precioItems)} · Operativo {fmx(precioConceptos)}</p>
        </div>
        <p className="text-white text-lg font-semibold">{fmx(totalBase)}</p>
      </div>
    </div>
  );
}

const ETIQUETA_TIPO: Record<string, string> = {
  OPERACION_TECNICA: "Personal",
  TRANSPORTE: "Transporte",
  HOSPEDAJE: "Hospedaje",
  COMIDA: "Comida",
  OTRO: "Adicional",
};

// ── Sección ──────────────────────────────────────────────────────────────────────
export default function PaquetesSection() {
  const toast = useToast();
  const confirm = useConfirm();

  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [equipos, setEquipos] = useState<EquipoItem[]>([]);
  const [productos, setProductos] = useState<ProductoLite[]>([]);
  const [roles, setRoles] = useState<RolTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoTab, setTipoTab] = useState<string>("MUSICAL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [generandoIA, setGenerandoIA] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [rp, re, rpr, rr] = await Promise.all([
        fetch("/api/paquetes").then((r) => r.json()),
        fetch("/api/equipos").then((r) => r.json()),
        fetch("/api/productos").then((r) => r.json()),
        fetch("/api/roles-tecnicos").then((r) => r.json()),
      ]);
      setPaquetes(rp.paquetes ?? []);
      setEquipos(re.equipos ?? []);
      setProductos(rpr.productos ?? []);
      setRoles(rr.roles ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditId(null);
    setForm(FORM_EMPTY);
    setModalOpen(true);
  }
  function abrirEditar(p: Paquete) {
    setEditId(p.id);
    setTipoTab(p.tipoEvento);
    setForm({
      nombre: p.nombre,
      rangoPersonas: p.rangoPersonas ?? "",
      subtipos: parseTags(p.subtiposEvento),
      resumen: p.resumen ?? "",
      descripcion: p.descripcion ?? "",
      propuestaValor: p.propuestaValor ?? "",
      items: p.items.map((it) => ({
        tipo: it.tipo === "PRODUCTO" ? "PRODUCTO" : "EQUIPO",
        equipoId: it.equipo?.id, productoId: it.producto?.id, cantidad: it.cantidad,
      })),
      conceptos: p.conceptos.map((c) => ({
        key: uid(), tipo: c.tipo, descripcion: c.descripcion, rolTecnicoId: c.rolTecnicoId ?? undefined,
        nivel: c.nivel ?? undefined, jornada: c.jornada ?? undefined, cantidad: c.cantidad, dias: c.dias, precioUnitario: c.precioUnitario,
      })),
      imagenes: p.imagenes.map((im) => ({ url: im.url })),
    });
    setModalOpen(true);
  }

  async function generarIA() {
    if (!form.nombre.trim()) { toast.error("Ponle nombre al paquete primero."); return; }
    setGenerandoIA(true);
    try {
      const equipoMap = new Map(equipos.map((e) => [e.id, e]));
      const productoMap = new Map(productos.map((p) => [p.id, p]));
      const equiposNombres = form.items.map((it) =>
        it.tipo === "PRODUCTO" ? productoMap.get(it.productoId!)?.nombre : (() => { const e = equipoMap.get(it.equipoId!); return e ? nombreEq(e) : undefined; })()
      ).filter(Boolean);
      const conceptosNombres = form.conceptos.map((c) => `${ETIQUETA_TIPO[c.tipo] ?? c.tipo}: ${c.descripcion}`);
      const res = await fetch("/api/paquetes/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre, tipoEvento: tipoTab, rangoPersonas: form.rangoPersonas,
          subtiposEvento: form.subtipos, equipos: equiposNombres, conceptos: conceptosNombres,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setForm((f) => ({ ...f, resumen: data.resumen || f.resumen, descripcion: data.descripcion || f.descripcion, propuestaValor: data.propuestaValor || f.propuestaValor }));
      toast.success("Texto generado con IA.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar.");
    } finally {
      setGenerandoIA(false);
    }
  }

  async function guardar() {
    if (!form.nombre.trim()) return toast.error("Ponle un nombre al paquete.");
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipoEvento: tipoTab,
        rangoPersonas: form.rangoPersonas || null,
        subtiposEvento: form.subtipos,
        resumen: form.resumen,
        descripcion: form.descripcion,
        propuestaValor: form.propuestaValor,
        items: form.items,
        conceptos: form.conceptos,
        imagenes: form.imagenes,
      };
      const res = await fetch(editId ? `/api/paquetes/${editId}` : "/api/paquetes", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success(editId ? "Paquete actualizado." : "Paquete creado.");
      setModalOpen(false);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(p: Paquete) {
    const ok = await confirm({ message: `¿Eliminar el paquete "${p.nombre}"?`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const res = await fetch(`/api/paquetes/${p.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Paquete eliminado."); cargar(); }
    else toast.error("No se pudo eliminar.");
  }

  const visibles = useMemo(() => paquetes.filter((p) => p.tipoEvento === tipoTab), [paquetes, tipoTab]);

  function precioPaquete(p: Paquete): number {
    const items = p.items.reduce((s, it) => {
      if (it.tipo === "PRODUCTO") return s + it.cantidad * (it.producto?.precioFinal ?? 0);
      return s + it.cantidad * (it.equipo?.precioRenta ?? 0);
    }, 0);
    const conceptos = p.conceptos.reduce((s, c) => s + c.precioUnitario * c.cantidad * c.dias, 0);
    return items + conceptos;
  }

  return (
    <div>
      {/* Sub-pestañas por tipo de evento */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl">
          {TIPOS_EVENTO.map((t) => (
            <button key={t.key} onClick={() => setTipoTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${tipoTab === t.key ? "bg-[#B3985B] text-black font-semibold" : "text-gray-400 hover:text-white"}`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <button onClick={abrirNuevo}
          className="px-4 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold transition-colors">
          + Nuevo paquete
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-[#111] rounded-xl animate-pulse" />)}
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Aún no hay paquetes para eventos {TIPOS_EVENTO.find((t) => t.key === tipoTab)?.label.toLowerCase()}.</p>
          <button onClick={abrirNuevo} className="px-4 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold">+ Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibles.map((p) => {
            const subtipos = parseTags(p.subtiposEvento);
            return (
              <div key={p.id} onClick={() => abrirEditar(p)}
                className="group rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] overflow-hidden cursor-pointer hover:border-[#B3985B]/40 transition-colors">
                <div className="h-32 bg-[#111] relative overflow-hidden">
                  {p.imagenes[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagenes[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl">🧩</div>
                  )}
                  {p.rangoPersonas && (
                    <span className="absolute top-2 left-2 text-[10px] bg-black/70 text-white rounded-full px-2 py-0.5">{p.rangoPersonas} pers.</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white font-medium text-sm truncate">{p.nombre}</p>
                  {p.resumen && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{p.resumen}</p>}
                  {subtipos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {subtipos.slice(0, 3).map((s) => (
                        <span key={s} className="text-[9px] bg-[#1a1a1a] text-gray-400 rounded-full px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-gray-600">{p.items.length} equipos/prod · {p.conceptos.length} conceptos</span>
                    <span className="text-[#B3985B] font-semibold text-sm">{fmx(precioPaquete(p))}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 justify-end mt-2">
                    <button onClick={(e) => { e.stopPropagation(); abrirEditar(p); }} className="text-[10px] text-[#555] hover:text-[#B3985B]">Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); eliminar(p); }} className="text-[10px] text-[#333] hover:text-red-400">Eliminar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={`${editId ? "Editar" : "Nuevo"} paquete · ${TIPOS_EVENTO.find((t) => t.key === tipoTab)?.label}`}
        maxWidth="max-w-3xl">
        <PaqueteEditor form={form} setForm={setForm} tipoEvento={tipoTab} equipos={equipos} productos={productos} roles={roles} generandoIA={generandoIA} onGenerarIA={generarIA} />
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#1a1a1a]">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-gray-300 text-sm hover:text-white">Cancelar</button>
          <button onClick={guardar} disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold">
            {saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear paquete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
