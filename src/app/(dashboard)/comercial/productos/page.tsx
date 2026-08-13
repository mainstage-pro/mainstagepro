"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import ModuleIndexRedirect from "@/components/ModuleIndexRedirect";
import { comercialProductosTabs } from "./tabs";
import { SUBTIPOS_EVENTO, parseCoberturas, type Cobertura } from "@/lib/constants";
import { Guitar, PartyPopper, Briefcase, Package, type LucideIcon } from "lucide-react";
import { TipoEventoCell, type TipoEventoOpcion } from "@/components/TipoEventoCell";
import { FAMILIAS, SUBFAMILIAS_ILUMINACION } from "@/lib/producto-familias";

// ── Tipos ───────────────────────────────────────────────────────────────────
type CambioClasifProp = { id: string; nombre: string; tiposAntes: string[]; tiposDespues: string[]; nichosAntes: string[]; nichosDespues: string[] };

type EquipoItem = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  precioRenta: number;
  cantidadTotal: number;
  imagenUrl: string | null;
  categoria: { id: string; nombre: string } | null;
};

type ProductoItem = {
  cantidad: number;
  equipo: EquipoItem;
};

type AccesorioCat = {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  precioRenta: number | null;
  fotoUrl: string | null;
  categoria: { id: string; nombre: string } | null;
};

type ProductoAccesorioItem = {
  cantidad: number;
  accesorio: AccesorioCat;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  familia: string | null;
  subfamilia: string | null;
  tiposEvento: string | null;
  imagenUrl: string | null;
  equipoDominanteId: string | null;
  precioManual: number | null;
  precioFinal: number;
  capacidadUniversal?: boolean;
  activo: boolean;
  nichos: string | null;
  rol: string | null;
  disponibilidad: string | null;
  proveedorRef: string | null;
  costoRef: number | null;
  items: ProductoItem[];
  accesorios?: ProductoAccesorioItem[];
  coberturas?: { tipoEvento: string; rangos: string | null; subtipos: string | null }[];
};

type EquipoSinPaquetear = EquipoItem;

const TIPOS_EVENTO: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "MUSICAL", label: "Musical", icon: Guitar },
  { key: "SOCIAL", label: "Social", icon: PartyPopper },
  { key: "EMPRESARIAL", label: "Empresarial", icon: Briefcase },
];

function fmx(n: number) {
  return `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function nombreEq(e: EquipoItem): string {
  return e.marca && e.modelo ? `${e.marca} ${e.modelo}` : e.marca || e.modelo || e.descripcion;
}

function nombreAcc(a: AccesorioCat): string {
  return [a.nombre, a.marca, a.modelo].filter(Boolean).join(" · ");
}

async function compressImage(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Capacidad global derivada del producto: mínimo de los mínimos y máximo de los
// máximos entre todos los rangos por tipo de evento. El rango preciso vive por
// tipo (ProductoCobertura); este chip es la lectura resumida para la lista.
function capacidadProducto(p: Producto): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const c of p.coberturas ?? []) {
    for (const label of parseTags(c.rangos)) {
      const m = label.match(/(\d+)\D+(\d+)/);
      if (!m) continue;
      min = Math.min(min, parseInt(m[1], 10));
      max = Math.max(max, parseInt(m[2], 10));
    }
  }
  if (!isFinite(min) || !isFinite(max)) return null;
  return { min, max };
}

// Celda de capacidad editable en línea: al pasar el cursor aparece "Definir";
// al dar clic se abre un panel con los rangos disponibles (chips) para elegir la
// cantidad de personas que cubre. Guarda uniforme a todos los tipos del producto.
function CapacidadCell({ producto, rangos, onSave }: { producto: Producto; rangos: string[]; onSave: (rangosSel: string[], universal: boolean) => Promise<void> }) {
  const tipos = parseTags(producto.tiposEvento);
  const actuales = useMemo(() => {
    const s = new Set<string>();
    for (const c of producto.coberturas ?? []) for (const r of parseTags(c.rangos)) s.add(r);
    return [...s];
  }, [producto]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>(actuales);
  const [universal, setUniversal] = useState<boolean>(!!producto.capacidadUniversal);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setSel(actuales); setUniversal(!!producto.capacidadUniversal); } }, [open, actuales, producto]);

  const cap = capacidadProducto(producto);
  const sinTipo = tipos.length === 0;

  async function guardar() {
    setSaving(true);
    try { await onSave(sel, universal); setOpen(false); }
    catch { /* el toast lo maneja el padre */ }
    finally { setSaving(false); }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={producto.capacidadUniversal ? "Aplica a cualquier capacidad" : sinTipo ? "Clasifica el tipo de evento primero" : "Definir capacidad"}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] tabular-nums transition-colors hover:bg-[#222]"
      >
        {producto.capacidadUniversal ? (
          <span className="text-[#B3985B]">Cualquier tamaño</span>
        ) : cap ? (
          <span className="text-gray-300">{cap.min}–{cap.max} pers.</span>
        ) : (
          <span className="text-[#555] group-hover:text-[#B3985B]">+ capacidad</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-1 left-0 w-60 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-2.5 shadow-xl">
            <label className="flex items-center gap-2 cursor-pointer mb-2.5">
              <input type="checkbox" checked={universal} onChange={(e) => setUniversal(e.target.checked)} className="accent-[#B3985B]" />
              <span className="text-[11px] text-gray-300">Aplica a cualquier capacidad</span>
            </label>
            {universal ? (
              <p className="text-[10px] text-gray-500 mb-2.5">Sirve para cualquier tamaño de evento; no depende de un rango de personas.</p>
            ) : sinTipo ? (
              <p className="text-[11px] text-gray-500 mb-2.5">Clasifica el tipo de evento del producto para poder asignarle capacidad.</p>
            ) : rangos.length === 0 ? (
              <p className="text-[11px] text-gray-500 mb-2.5">No hay rangos configurados en paquetes todavía.</p>
            ) : (
              <>
                <p className="text-[10px] text-gray-500 mb-1.5">Rangos de personas que cubre</p>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {rangos.map((r) => {
                    const on = sel.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSel((prev) => (on ? prev.filter((x) => x !== r) : [...prev, r]))}
                        className={`px-2 py-1 rounded-md text-[11px] transition-colors ${on ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-gray-400 hover:text-white px-2 py-1">Cancelar</button>
              <button type="button" onClick={guardar} disabled={saving || (!universal && sinTipo)} className="text-[11px] bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-3 py-1 rounded-md disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Editor de producto (crear/editar) ────────────────────────────────────────
type FormItem = { equipoId: string; cantidad: number };
type FormAccesorio = { accesorioId: string; cantidad: number };
type FormState = {
  nombre: string;
  descripcion: string;
  categoria: string;
  familia: string;
  subfamilia: string;
  tiposEvento: string[];
  nichos: string[];
  rol: string;
  disponibilidad: string;
  proveedorRef: string;
  costoRef: string;
  imagenUrl: string;
  equipoDominanteId: string;
  precioManual: string;
  items: FormItem[];
  accesorios: FormAccesorio[];
  coberturas: Cobertura[];
  capacidadUniversal: boolean;
};

const FORM_EMPTY: FormState = {
  nombre: "",
  descripcion: "",
  categoria: "",
  familia: "",
  subfamilia: "",
  tiposEvento: [],
  nichos: [],
  rol: "base",
  disponibilidad: "propio",
  proveedorRef: "",
  costoRef: "",
  imagenUrl: "",
  equipoDominanteId: "",
  precioManual: "",
  items: [],
  accesorios: [],
  coberturas: [],
  capacidadUniversal: false,
};

type NichoCatalogo = { id: string; tipoEventoSlug: string; nombre: string; slug: string; activo: boolean };

function ProductoEditor({
  form,
  setForm,
  equipos,
  accesoriosCat,
  categorias,
  rangos,
  nichosCat,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  equipos: EquipoItem[];
  accesoriosCat: AccesorioCat[];
  categorias: string[];
  rangos: string[];
  nichosCat: NichoCatalogo[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [busqAcc, setBusqAcc] = useState("");
  const equipoMap = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos]);
  const accMap = useMemo(() => new Map(accesoriosCat.map((a) => [a.id, a])), [accesoriosCat]);

  function cobDe(tipo: string): Cobertura {
    return form.coberturas.find((c) => c.tipoEvento === tipo) ?? { tipoEvento: tipo, rangos: [], subtipos: [] };
  }
  function setCob(tipo: string, next: Cobertura) {
    const otros = form.coberturas.filter((c) => c.tipoEvento !== tipo);
    setForm({ ...form, coberturas: [...otros, next] });
  }
  function toggleRango(tipo: string, label: string) {
    const cob = cobDe(tipo);
    const has = cob.rangos.includes(label);
    setCob(tipo, { ...cob, rangos: has ? cob.rangos.filter((r) => r !== label) : [...cob.rangos, label] });
  }
  function toggleSubtipo(tipo: string, label: string) {
    const cob = cobDe(tipo);
    const has = cob.subtipos.includes(label);
    setCob(tipo, { ...cob, subtipos: has ? cob.subtipos.filter((s) => s !== label) : [...cob.subtipos, label] });
  }

  const precioAuto = form.items.reduce(
    (s, it) => s + it.cantidad * (equipoMap.get(it.equipoId)?.precioRenta ?? 0),
    0
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const seleccionados = new Set(form.items.map((i) => i.equipoId));
    return equipos
      .filter((e) => !seleccionados.has(e.id))
      .filter((e) => !q || nombreEq(e).toLowerCase().includes(q) || e.descripcion.toLowerCase().includes(q))
      .slice(0, 40);
  }, [equipos, busqueda, form.items]);

  function addEquipo(id: string) {
    if (form.items.some((i) => i.equipoId === id)) return;
    const nuevos = [...form.items, { equipoId: id, cantidad: 1 }];
    setForm({ ...form, items: nuevos, equipoDominanteId: form.equipoDominanteId || id });
    setBusqueda("");
  }
  function setCant(id: string, c: number) {
    setForm({
      ...form,
      items: form.items.map((i) => (i.equipoId === id ? { ...i, cantidad: Math.max(1, c) } : i)),
    });
  }
  function removeEquipo(id: string) {
    const items = form.items.filter((i) => i.equipoId !== id);
    const dom = form.equipoDominanteId === id ? items[0]?.equipoId ?? "" : form.equipoDominanteId;
    setForm({ ...form, items, equipoDominanteId: dom });
  }

  const accFiltrados = useMemo(() => {
    const q = busqAcc.trim().toLowerCase();
    const seleccionados = new Set(form.accesorios.map((a) => a.accesorioId));
    return accesoriosCat
      .filter((a) => !seleccionados.has(a.id))
      .filter((a) => !q || nombreAcc(a).toLowerCase().includes(q))
      .slice(0, 40);
  }, [accesoriosCat, busqAcc, form.accesorios]);

  function addAccesorio(id: string) {
    if (form.accesorios.some((a) => a.accesorioId === id)) return;
    setForm({ ...form, accesorios: [...form.accesorios, { accesorioId: id, cantidad: 1 }] });
    setBusqAcc("");
  }
  function setCantAcc(id: string, c: number) {
    setForm({
      ...form,
      accesorios: form.accesorios.map((a) => (a.accesorioId === id ? { ...a, cantidad: Math.max(1, c) } : a)),
    });
  }
  function removeAccesorio(id: string) {
    setForm({ ...form, accesorios: form.accesorios.filter((a) => a.accesorioId !== id) });
  }
  function toggleTag(k: string) {
    setForm({
      ...form,
      tiposEvento: form.tiposEvento.includes(k)
        ? form.tiposEvento.filter((t) => t !== k)
        : [...form.tiposEvento, k],
    });
  }
  function toggleNicho(slug: string) {
    setForm({
      ...form,
      nichos: form.nichos.includes(slug)
        ? form.nichos.filter((n) => n !== slug)
        : [...form.nichos, slug],
    });
  }
  // Nichos del catálogo relevantes a los tipos de evento marcados (o todos si ninguno).
  const nichosVisibles =
    form.tiposEvento.length === 0
      ? nichosCat.filter((n) => n.activo)
      : nichosCat.filter((n) => n.activo && form.tiposEvento.includes(n.tipoEventoSlug));
  async function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await compressImage(file);
    setForm({ ...form, imagenUrl: b64 });
  }

  const imgPreview =
    form.imagenUrl || (form.equipoDominanteId ? equipoMap.get(form.equipoDominanteId)?.imagenUrl : null);

  return (
    <div className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Nombre del producto *</label>
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Sistema Electro Voice EKX12P — 2 medios + 2 bajos"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
        />
      </div>

      {/* Categoría + tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Categoría</label>
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">— Selecciona categoría —</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {form.categoria && !categorias.includes(form.categoria) && (
              <option value={form.categoria}>{form.categoria}</option>
            )}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Tipo de evento (sugerencia)</label>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_EVENTO.map((t) => {
              const on = form.tiposEvento.includes(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTag(t.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 ${
                    on ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
                  }`}
                >
                  <t.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Familia comercial (agrupa alternativas para el botón ⇄) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Familia (intercambio)</label>
          <select
            value={form.familia}
            onChange={(e) => setForm({ ...form, familia: e.target.value, subfamilia: e.target.value === "set-iluminacion" ? form.subfamilia : "" })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          >
            <option value="">— Sin familia —</option>
            {FAMILIAS.map((f) => (
              <option key={f.slug} value={f.slug}>{f.label}</option>
            ))}
          </select>
        </div>
        {form.familia === "set-iluminacion" && (
          <div>
            <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Subfamilia (fixture)</label>
            <select
              value={form.subfamilia}
              onChange={(e) => setForm({ ...form, subfamilia: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            >
              <option value="">— Sin subfamilia —</option>
              {SUBFAMILIAS_ILUMINACION.map((s) => (
                <option key={s.slug} value={s.slug}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Clasificación comercial: rol + disponibilidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Rol en la propuesta</label>
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          >
            <option value="base">Base</option>
            <option value="adicional">Adicional</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Disponibilidad</label>
          <select
            value={form.disponibilidad}
            onChange={(e) => setForm({ ...form, disponibilidad: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          >
            <option value="propio">Propio</option>
            <option value="subrenta">Subrenta</option>
            <option value="bajo_pedido">Bajo pedido</option>
          </select>
        </div>
      </div>

      {/* Proveedor + costo (solo si no es propio) */}
      {form.disponibilidad !== "propio" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Proveedor (referencia)</label>
            <input
              value={form.proveedorRef}
              onChange={(e) => setForm({ ...form, proveedorRef: e.target.value })}
              placeholder="Nombre del proveedor o subrenta"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Costo de referencia</label>
            <input
              type="number"
              value={form.costoRef}
              onChange={(e) => setForm({ ...form, costoRef: e.target.value })}
              placeholder="Costo estimado (interno)"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
          </div>
        </div>
      )}

      {/* Nichos del catálogo (sugerencia) */}
      <div>
        <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Nichos (sugerencia)</label>
        {nichosVisibles.length === 0 ? (
          <p className="text-[11px] text-gray-500 rounded-lg border border-dashed border-[#222] px-3 py-2">
            {nichosCat.length === 0
              ? "No hay nichos en el catálogo todavía."
              : "Marca un tipo de evento arriba para ver sus nichos."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {nichosVisibles.map((n) => {
              const on = form.nichos.includes(n.slug);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => toggleNicho(n.slug)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    on ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
                  }`}
                >
                  {n.nombre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          rows={2}
          placeholder="Explica puntualmente de qué consta el producto..."
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
        />
      </div>

      {/* Equipos que lo componen */}
      <div>
        <label className="text-[11px] text-[#B3985B] font-medium block mb-1">
          Equipos del inventario ({form.items.length})
        </label>
        {form.items.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {form.items.map((it) => {
              const eq = equipoMap.get(it.equipoId);
              if (!eq) return null;
              const esDom = form.equipoDominanteId === it.equipoId;
              return (
                <div
                  key={it.equipoId}
                  className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-2 py-1.5"
                >
                  <span className="w-9 h-9 rounded-md bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                    {eq.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={eq.imagenUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package strokeWidth={1.75} className="w-4 h-4 text-gray-700" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{nombreEq(eq)}</p>
                    <p className="text-gray-500 text-[10px]">{fmx(eq.precioRenta)} c/u</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, equipoDominanteId: it.equipoId })}
                    title="Usar su imagen como imagen del producto"
                    className={`text-[10px] px-2 py-1 rounded-md shrink-0 ${
                      esDom ? "bg-[#B3985B]/20 text-[#B3985B]" : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {esDom ? "★ imagen" : "☆"}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCant(it.equipoId, it.cantidad - 1)}
                      className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={it.cantidad}
                      onChange={(e) => setCant(it.equipoId, parseInt(e.target.value) || 1)}
                      className="w-12 h-6 bg-[#111] border border-[#2a2a2a] rounded-md text-white text-xs text-center focus:outline-none focus:border-[#B3985B]"
                    />
                    <button
                      type="button"
                      onClick={() => setCant(it.equipoId, it.cantidad + 1)}
                      className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEquipo(it.equipoId)}
                    className="w-6 h-6 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm shrink-0"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {/* Buscador para agregar */}
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar equipo del inventario para agregar..."
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
        />
        {busqueda.trim() && (
          <div className="mt-1.5 max-h-48 overflow-y-auto space-y-1 border border-[#1e1e1e] rounded-lg p-1.5 bg-[#0d0d0d]">
            {filtrados.length === 0 ? (
              <p className="text-gray-600 text-xs px-2 py-1">Sin resultados.</p>
            ) : (
              filtrados.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => addEquipo(e.id)}
                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-white text-xs flex-1 truncate">{nombreEq(e)}</span>
                  <span className="text-gray-500 text-[10px]">{e.categoria?.nombre}</span>
                  <span className="text-[#B3985B] text-[10px]">{fmx(e.precioRenta)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Accesorios que lo componen (sin precio — van al checklist/rider) */}
      <div>
        <label className="text-[11px] text-[#B3985B] font-medium block mb-1">
          Accesorios ({form.accesorios.length})
        </label>
        <p className="text-[10px] text-gray-600 mb-1.5">
          Cables, soportes, casos y demás. No suman al precio del producto; sirven para el checklist de carga.
        </p>
        {form.accesorios.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {form.accesorios.map((a) => {
              const acc = accMap.get(a.accesorioId);
              if (!acc) return null;
              return (
                <div
                  key={a.accesorioId}
                  className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-2 py-1.5"
                >
                  <span className="w-9 h-9 rounded-md bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                    {acc.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.fotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package strokeWidth={1.75} className="w-4 h-4 text-gray-700" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{nombreAcc(acc)}</p>
                    <p className="text-gray-500 text-[10px]">{acc.categoria?.nombre ?? "Accesorio"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCantAcc(a.accesorioId, a.cantidad - 1)}
                      className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={a.cantidad}
                      onChange={(e) => setCantAcc(a.accesorioId, parseInt(e.target.value) || 1)}
                      className="w-12 h-6 bg-[#111] border border-[#2a2a2a] rounded-md text-white text-xs text-center focus:outline-none focus:border-[#B3985B]"
                    />
                    <button
                      type="button"
                      onClick={() => setCantAcc(a.accesorioId, a.cantidad + 1)}
                      className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAccesorio(a.accesorioId)}
                    className="w-6 h-6 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm shrink-0"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {accesoriosCat.length === 0 ? (
          <p className="text-[11px] text-gray-500 rounded-lg border border-dashed border-[#222] px-3 py-2">
            No hay accesorios en el catálogo todavía.
          </p>
        ) : (
          <>
            <input
              value={busqAcc}
              onChange={(e) => setBusqAcc(e.target.value)}
              placeholder="Buscar accesorio del catálogo para agregar..."
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
            />
            {busqAcc.trim() && (
              <div className="mt-1.5 max-h-48 overflow-y-auto space-y-1 border border-[#1e1e1e] rounded-lg p-1.5 bg-[#0d0d0d]">
                {accFiltrados.length === 0 ? (
                  <p className="text-gray-600 text-xs px-2 py-1">Sin resultados.</p>
                ) : (
                  accFiltrados.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => addAccesorio(a.id)}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
                    >
                      <span className="text-white text-xs flex-1 truncate">{nombreAcc(a)}</span>
                      <span className="text-gray-500 text-[10px]">{a.categoria?.nombre}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cobertura de capacidad — por tipo de evento */}
      <div>
        <label className="text-[11px] text-[#B3985B] font-medium block mb-1">
          Cobertura de capacidad (personas)
        </label>
        <p className="text-[10px] text-gray-600 mb-2">
          Define a cuántas personas alcanza este producto en cada tipo de evento y, opcionalmente, para qué
          eventos específicos aplica. El mismo equipo cubre distinta gente según el tipo de evento.
        </p>
        <label className="flex items-center gap-2 cursor-pointer mb-2.5">
          <input
            type="checkbox"
            checked={form.capacidadUniversal}
            onChange={(e) => setForm({ ...form, capacidadUniversal: e.target.checked })}
            className="accent-[#B3985B]"
          />
          <span className="text-[11px] text-gray-300">
            Aplica a cualquier capacidad <span className="text-gray-600">(independiente del tamaño del evento)</span>
          </span>
        </label>
        {form.capacidadUniversal ? (
          <p className="text-[11px] text-gray-500 rounded-lg border border-dashed border-[#222] px-3 py-2">
            Este producto sirve para cualquier tamaño de evento; no depende de un rango de personas.
          </p>
        ) : form.tiposEvento.length === 0 ? (
          <p className="text-[11px] text-gray-500 rounded-lg border border-dashed border-[#222] px-3 py-2">
            Marca uno o más tipos de evento arriba para definir su cobertura.
          </p>
        ) : (
          <div className="space-y-2.5">
            {TIPOS_EVENTO.filter((t) => form.tiposEvento.includes(t.key)).map((t) => {
              const cob = cobDe(t.key);
              const subs = SUBTIPOS_EVENTO[t.key] ?? [];
              return (
                <div key={t.key} className="rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <t.icon strokeWidth={1.75} className="w-3.5 h-3.5 text-[#B3985B]" />
                    <span className="text-white text-xs font-semibold">{t.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-1">Rangos de personas que cubre</p>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {rangos.length === 0 ? (
                      <span className="text-[10px] text-gray-600">No hay rangos configurados en paquetes.</span>
                    ) : (
                      rangos.map((r) => {
                        const on = cob.rangos.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleRango(t.key, r)}
                            className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                              on ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mb-1">
                    Eventos específicos <span className="text-gray-600">(vacío = todos)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((s) => {
                      const on = cob.subtipos.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSubtipo(t.key, s)}
                          className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                            on ? "bg-[#B3985B]/20 text-[#B3985B] font-medium" : "bg-[#1a1a1a] text-gray-500 hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Imagen + precio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Imagen del producto</label>
          <div className="flex items-center gap-3">
            <span className="w-16 h-16 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
              {imgPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package strokeWidth={1.75} className="w-6 h-6 text-gray-700" />
              )}
            </span>
            <div className="space-y-1">
              <label className="block text-xs text-gray-400 cursor-pointer hover:text-white">
                <input type="file" accept="image/*" onChange={onImg} className="hidden" />
                <span className="underline">Subir imagen</span>
              </label>
              <p className="text-[10px] text-gray-600">Por default usa la del equipo dominante (★).</p>
              {form.imagenUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imagenUrl: "" })}
                  className="text-[10px] text-red-400/80 hover:text-red-400"
                >
                  Quitar imagen subida
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="text-[11px] text-[#B3985B] font-medium block mb-1">Precio final</label>
          <div className="rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2">
            <p className="text-gray-500 text-[10px]">Suma de rentas del inventario</p>
            <p className="text-white text-lg font-semibold">{fmx(precioAuto)}</p>
          </div>
          <label className="text-[10px] text-gray-500 block mt-2 mb-1">Override manual (opcional)</label>
          <input
            type="number"
            value={form.precioManual}
            onChange={(e) => setForm({ ...form, precioManual: e.target.value })}
            placeholder={`${precioAuto}`}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sección: Productos de equipos ─────────────────────────────────────────────
export function ProductosSection() {
  const toast = useToast();
  const confirm = useConfirm();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [equipos, setEquipos] = useState<EquipoItem[]>([]);
  const [accesoriosCat, setAccesoriosCat] = useState<AccesorioCat[]>([]);
  const [rangos, setRangos] = useState<string[]>([]);
  const [nichosCat, setNichosCat] = useState<NichoCatalogo[]>([]);
  const [catalogoTipos, setCatalogoTipos] = useState<TipoEventoOpcion[]>([]);
  const [categoriasInv, setCategoriasInv] = useState<string[]>([]);
  const [sinPaquetear, setSinPaquetear] = useState<EquipoSinPaquetear[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState<string>("TODAS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroRol, setFiltroRol] = useState<string>("TODOS");
  const [filtroDisp, setFiltroDisp] = useState<string>("TODAS");
  const [showSinPaquetear, setShowSinPaquetear] = useState(false);
  const [soloSinClasificar, setSoloSinClasificar] = useState(false);
  const [soloSinCapacidad, setSoloSinCapacidad] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  // Propagación producto→equipos: preview antes de aplicar (nada se propaga en silencio).
  const [propagacion, setPropagacion] = useState<{ productoId: string; cambios: CambioClasifProp[] } | null>(null);
  const [propagando, setPropagando] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [rp, re, rs, rc, rr, rcat, racc] = await Promise.all([
        fetch("/api/productos").then((r) => r.json()),
        fetch("/api/equipos").then((r) => r.json()),
        fetch("/api/productos/sin-paquetear").then((r) => r.json()),
        fetch("/api/inventario/categorias").then((r) => r.json()),
        fetch("/api/paquetes/rangos").then((r) => r.json()),
        fetch("/api/catalogo").then((r) => r.json()).catch(() => ({})),
        fetch("/api/accesorios").then((r) => r.json()).catch(() => ({})),
      ]);
      setProductos(rp.productos ?? []);
      setEquipos(re.equipos ?? []);
      setAccesoriosCat(racc.accesorios ?? []);
      setSinPaquetear(rs.equipos ?? []);
      setCategoriasInv((rc.categorias ?? []).map((c: { nombre: string }) => c.nombre));
      setRangos((rr.rangos ?? []).map((x: { label: string }) => x.label));
      setNichosCat(rcat.nichos ?? []);
      setCatalogoTipos(rcat.tipos ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo(prefillEquipoId?: string) {
    setEditId(null);
    const base = { ...FORM_EMPTY, categoria: categoriasInv[0] ?? "" };
    setForm(
      prefillEquipoId
        ? { ...base, items: [{ equipoId: prefillEquipoId, cantidad: 1 }], equipoDominanteId: prefillEquipoId }
        : base
    );
    setModalOpen(true);
  }

  function abrirEditar(p: Producto) {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      categoria: p.categoria ?? "",
      familia: p.familia ?? "",
      subfamilia: p.subfamilia ?? "",
      tiposEvento: parseTags(p.tiposEvento),
      nichos: parseTags(p.nichos),
      rol: p.rol === "adicional" ? "adicional" : "base",
      disponibilidad: ["subrenta", "bajo_pedido"].includes(p.disponibilidad ?? "") ? p.disponibilidad! : "propio",
      proveedorRef: p.proveedorRef ?? "",
      costoRef: p.costoRef != null ? String(p.costoRef) : "",
      imagenUrl: p.imagenUrl && p.imagenUrl.startsWith("data:") ? p.imagenUrl : p.imagenUrl ?? "",
      equipoDominanteId: p.equipoDominanteId ?? "",
      precioManual: p.precioManual != null ? String(p.precioManual) : "",
      items: p.items.map((it) => ({ equipoId: it.equipo.id, cantidad: it.cantidad })),
      accesorios: (p.accesorios ?? []).map((a) => ({ accesorioId: a.accesorio.id, cantidad: a.cantidad })),
      coberturas: parseCoberturas(p.coberturas),
      capacidadUniversal: !!p.capacidadUniversal,
    });
    setModalOpen(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) return toast.error("Ponle un nombre al producto.");
    if (form.items.length === 0) return toast.error("Agrega al menos un equipo.");
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
        familia: form.familia || null,
        subfamilia: form.familia === "set-iluminacion" ? (form.subfamilia || null) : null,
        tiposEvento: form.tiposEvento,
        nichos: form.nichos,
        rol: form.rol,
        disponibilidad: form.disponibilidad,
        proveedorRef: form.disponibilidad === "propio" ? null : form.proveedorRef.trim() || null,
        costoRef: form.disponibilidad === "propio" ? null : form.costoRef,
        imagenUrl: form.imagenUrl || null,
        equipoDominanteId: form.equipoDominanteId || null,
        precioManual: form.precioManual,
        items: form.items,
        accesorios: form.accesorios,
        coberturas: form.coberturas.filter((c) => form.tiposEvento.includes(c.tipoEvento)),
        capacidadUniversal: form.capacidadUniversal,
      };
      const res = await fetch(editId ? `/api/productos/${editId}` : "/api/productos", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      toast.success(editId ? "Producto actualizado." : "Producto creado.");
      setModalOpen(false);
      // Actualizamos en sitio para no recargar la lista ni perder la posición de scroll.
      if (json.producto) {
        setProductos((prev) =>
          editId ? prev.map((p) => (p.id === editId ? json.producto : p)) : [...prev, json.producto]
        );
      }
      // Preview de propagación producto→equipos (unión, un salto, respeta manual).
      const prodId = json.producto?.id || editId;
      if (prodId && form.tiposEvento.length > 0) {
        try {
          const rp = await fetch("/api/inventario/clasificacion/sync", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direccion: "producto-a-equipo", ids: [prodId], preview: true }),
          });
          if (rp.ok) {
            const dp = await rp.json();
            if (Array.isArray(dp.preview) && dp.preview.length > 0) setPropagacion({ productoId: prodId, cambios: dp.preview });
          }
        } catch { /* la clasificación se guardó; la propagación es opcional */ }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function aplicarPropagacion() {
    if (!propagacion) return;
    setPropagando(true);
    try {
      const r = await fetch("/api/inventario/clasificacion/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direccion: "producto-a-equipo", ids: [propagacion.productoId] }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      const d = await r.json();
      toast.success(`${d.cambios} equipo(s) actualizados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo propagar.");
    } finally {
      setPropagando(false);
      setPropagacion(null);
    }
  }

  // Guardado inline del tipo de evento (optimista, sin abrir el editor completo).
  async function saveTiposEventoProducto(id: string, next: string[]) {
    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiposEvento: next }),
    });
    if (!res.ok) { toast.error("No se pudo clasificar"); throw new Error("save-failed"); }
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, tiposEvento: next.length ? JSON.stringify(next) : null } : p)));
  }

  // Guardado inline de capacidad: aplica los rangos elegidos de forma uniforme a
  // cada tipo de evento del producto (conserva sus subtipos). El editor completo
  // sigue permitiendo rangos distintos por tipo. Requiere al menos un tipo.
  async function saveCapacidadProducto(id: string, rangosSel: string[], universal: boolean) {
    const p = productos.find((x) => x.id === id);
    if (!p) return;
    let payload: Record<string, unknown>;
    if (universal) {
      // No depende del tamaño: basta con marcar la bandera; los rangos previos se conservan.
      payload = { capacidadUniversal: true };
    } else {
      const tipos = parseTags(p.tiposEvento);
      if (tipos.length === 0) { toast.error("Clasifica el tipo de evento primero"); throw new Error("sin-tipo"); }
      const existentes = new Map((p.coberturas ?? []).map((c) => [c.tipoEvento, c]));
      const cobs = tipos.map((t) => ({ tipoEvento: t, rangos: rangosSel, subtipos: parseTags(existentes.get(t)?.subtipos ?? null) }));
      payload = { coberturas: cobs, capacidadUniversal: false };
    }
    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("No se pudo guardar la capacidad"); throw new Error("save-failed"); }
    const json = await res.json();
    if (json.producto) setProductos((prev) => prev.map((x) => (x.id === id ? json.producto : x)));
  }

  async function eliminar(p: Producto) {
    const ok = await confirm({
      message: `¿Eliminar el producto "${p.nombre}"?`,
      danger: true,
      confirmText: "Eliminar",
    });
    if (!ok) return;
    const res = await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Producto eliminado.");
      cargar();
    } else {
      toast.error("No se pudo eliminar.");
    }
  }

  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => set.add(p.categoria ?? "OTRO"));
    return ["TODAS", ...[...set].sort()];
  }, [productos]);

  const visibles = useMemo(() => {
    return productos.filter((p) => {
      if (filtroCat !== "TODAS" && (p.categoria ?? "OTRO") !== filtroCat) return false;
      if (filtroTipo !== "TODOS" && !parseTags(p.tiposEvento).includes(filtroTipo)) return false;
      if (filtroRol !== "TODOS" && (p.rol ?? "base") !== filtroRol) return false;
      if (filtroDisp !== "TODAS" && (p.disponibilidad ?? "propio") !== filtroDisp) return false;
      if (soloSinClasificar && parseTags(p.tiposEvento).length > 0) return false;
      if (soloSinCapacidad && (p.capacidadUniversal || capacidadProducto(p) !== null)) return false;
      return true;
    });
  }, [productos, filtroCat, filtroTipo, filtroRol, filtroDisp, soloSinClasificar, soloSinCapacidad]);

  const sinCapacidadCount = useMemo(
    () => productos.filter((p) => !p.capacidadUniversal && capacidadProducto(p) === null).length,
    [productos]
  );

  const porCategoria = useMemo(() => {
    // Orden de categorías = mismo que el inventario de equipos (CategoriaEquipo.orden),
    // que es como llega categoriasInv desde /api/inventario/categorias. Las que no
    // estén en ese catálogo van al final, alfabéticas.
    const orderIdx = (c: string) => {
      const i = categoriasInv.indexOf(c);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const cats = [...new Set(visibles.map((p) => p.categoria ?? "OTRO"))].sort((a, b) => {
      const d = orderIdx(a) - orderIdx(b);
      return d !== 0 ? d : a.localeCompare(b);
    });
    return cats
      .map((cat) => ({ cat, items: visibles.filter((p) => (p.categoria ?? "OTRO") === cat) }))
      .filter((g) => g.items.length > 0);
  }, [visibles, categoriasInv]);

  return (
    <div>
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-gray-500 text-sm">
          Sistemas armados a partir del inventario. La fuente y disponibilidad siempre es el inventario.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoloSinClasificar((v) => !v)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              soloSinClasificar ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-300 hover:text-white"
            }`}
          >
            Sin clasificar
          </button>
          <button
            onClick={() => setSoloSinCapacidad((v) => !v)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              soloSinCapacidad ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-300 hover:text-white"
            }`}
          >
            Sin capacidad ({sinCapacidadCount})
          </button>
          <button
            onClick={() => setShowSinPaquetear((v) => !v)}
            className="px-3 py-2 rounded-lg bg-[#1a1a1a] text-gray-300 text-sm hover:text-white transition-colors"
          >
            Sin paquetear ({sinPaquetear.length})
          </button>
          <button
            onClick={() => abrirNuevo()}
            className="px-4 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold transition-colors"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Panel equipos sin paquetear */}
      {showSinPaquetear && (
        <div className="mb-6 rounded-2xl border border-[#1e1e1e] bg-[#0d0d0d] p-4">
          <p className="text-white text-sm font-medium mb-2">Equipos del inventario sin paquetear</p>
          {sinPaquetear.length === 0 ? (
            <p className="text-gray-500 text-sm">Todos los equipos propios están en al menos un producto. 🎉</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sinPaquetear.map((e) => (
                <button
                  key={e.id}
                  onClick={() => abrirNuevo(e.id)}
                  title="Crear producto con este equipo"
                  className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-left hover:border-[#B3985B]/40 transition-colors"
                >
                  <span className="w-8 h-8 rounded-md bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                    {e.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.imagenUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package strokeWidth={1.75} className="w-3.5 h-3.5 text-gray-700" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-white text-[11px] font-medium truncate">{nombreEq(e)}</span>
                    <span className="block text-gray-600 text-[9px]">{fmx(e.precioRenta)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categorias.map((c) => (
          <button
            key={c}
            onClick={() => setFiltroCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
              filtroCat === c ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            {c === "TODAS" ? "Todas" : c}
          </button>
        ))}
      </div>

      {/* Filtros de clasificación */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
        >
          <option value="TODOS">Todos los tipos</option>
          {TIPOS_EVENTO.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
        >
          <option value="TODOS">Todo rol</option>
          <option value="base">Base</option>
          <option value="adicional">Adicional</option>
        </select>
        <select
          value={filtroDisp}
          onChange={(e) => setFiltroDisp(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
        >
          <option value="TODAS">Toda disponibilidad</option>
          <option value="propio">Propio</option>
          <option value="subrenta">Subrenta</option>
          <option value="bajo_pedido">Bajo pedido</option>
        </select>
        {(filtroTipo !== "TODOS" || filtroRol !== "TODOS" || filtroDisp !== "TODAS" || soloSinClasificar || soloSinCapacidad) && (
          <button
            onClick={() => { setFiltroTipo("TODOS"); setFiltroRol("TODOS"); setFiltroDisp("TODAS"); setSoloSinClasificar(false); setSoloSinCapacidad(false); }}
            className="text-[11px] text-gray-500 hover:text-white px-2 py-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Productos por categoría — vista lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Aún no hay productos en esta vista.</p>
          <button
            onClick={() => abrirNuevo()}
            className="px-4 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold"
          >
            + Crear el primero
          </button>
        </div>
      ) : (
        <div className="ms-table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2.5 font-medium">Producto</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Equipos que lo componen</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Tipo de evento</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Capacidad</th>
                  <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Nº eq</th>
                  <th className="text-right px-3 py-2.5 font-medium">Precio</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {porCategoria.map(({ cat, items }) => (
                  <Fragment key={`cat-${cat}`}>
                    <tr className="border-t border-[#1a1a1a]">
                      <td colSpan={7} className="px-4 py-1.5 bg-[#0d0d0d]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat}</span>
                          <span className="text-[#333] text-[10px]">({items.length})</span>
                        </div>
                      </td>
                    </tr>
                    {items.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => abrirEditar(p)}
                        className="border-t border-[#161616] transition-colors group hover:bg-[#0d0d0d] cursor-pointer"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {p.imagenUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0 flex items-center justify-center text-gray-700"><Package strokeWidth={1.75} className="w-4 h-4" /></div>
                            )}
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">{p.nombre}</p>
                              {p.descripcion && <p className="text-[#555] text-xs truncate">{p.descripcion}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <p className="text-[#6b7280] truncate max-w-[320px]">
                            {p.items.map((it) => `${it.cantidad}× ${nombreEq(it.equipo)}`).join(", ")}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 hidden sm:table-cell" onClick={(ev) => ev.stopPropagation()}>
                          <TipoEventoCell
                            value={parseTags(p.tiposEvento)}
                            tipos={catalogoTipos}
                            onSave={(next) => saveTiposEventoProducto(p.id, next)}
                          />
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell relative" onClick={(ev) => ev.stopPropagation()}>
                          <CapacidadCell producto={p} rangos={rangos} onSave={(sel, universal) => saveCapacidadProducto(p.id, sel, universal)} />
                        </td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell text-white tabular-nums">
                          {p.items.length}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-[#B3985B] font-semibold">{fmx(p.precioFinal)}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 justify-end">
                            <button onClick={(ev) => { ev.stopPropagation(); abrirEditar(p); }} className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">Editar</button>
                            <button onClick={(ev) => { ev.stopPropagation(); eliminar(p); }} className="text-[10px] text-[#333] hover:text-red-400 transition-colors">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
            <p className="text-[#555] text-xs">{visibles.length} productos mostrados</p>
            <p className="text-[#444] text-xs">{porCategoria.length} categorías</p>
          </div>
        </div>
      )}

      {/* Modal editor */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar producto" : "Nuevo producto"}
        maxWidth="max-w-3xl"
      >
        <ProductoEditor form={form} setForm={setForm} equipos={equipos} accesoriosCat={accesoriosCat} categorias={categoriasInv} rangos={rangos} nichosCat={nichosCat} />
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#1a1a1a]">
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-gray-300 text-sm hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold"
          >
            {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </Modal>

      {/* Confirmación de propagación a equipos componentes */}
      <Modal open={!!propagacion} onClose={() => setPropagacion(null)} title="Propagar a equipos" maxWidth="max-w-lg">
        <div className="p-1">
          <p className="text-sm text-gray-300 mb-3">
            Esto va a marcar también <span className="text-white font-semibold">{propagacion?.cambios.length ?? 0}</span> equipo(s) que componen este producto. Se suma a lo que ya tienen; no se quita nada ni se toca lo fijado manualmente.
          </p>
          <div className="space-y-2 max-h-64 overflow-auto mb-4">
            {propagacion?.cambios.map((c) => (
              <div key={c.id} className="rounded-lg bg-[#111] border border-[#1f1f1f] px-3 py-2">
                <p className="text-sm text-white">{c.nombre}</p>
                <p className="text-[11px] text-gray-500">Tipos: {c.tiposAntes.join(", ") || "—"} → <span className="text-[#B3985B]">{c.tiposDespues.join(", ")}</span></p>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPropagacion(null)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Solo este producto</button>
            <button onClick={aplicarPropagacion} disabled={propagando} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{propagando ? "Aplicando…" : "Aplicar a los equipos"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Página del módulo: redirige a la primera sección accesible ─────────────────
export default function ProductosModulePage() {
  return <ModuleIndexRedirect tabs={comercialProductosTabs} />;
}
