"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Modal } from "@/components/Modal";
import ModuleTabs from "@/components/ModuleTabs";
import PaquetesSection from "./PaquetesSection";
import GruposEquipoPage from "../../admin/grupos-equipo/page";

// ── Tipos ───────────────────────────────────────────────────────────────────
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

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  tiposEvento: string | null;
  imagenUrl: string | null;
  equipoDominanteId: string | null;
  precioManual: number | null;
  precioFinal: number;
  activo: boolean;
  items: ProductoItem[];
};

type EquipoSinPaquetear = EquipoItem;

const TIPOS_EVENTO = [
  { key: "MUSICAL", label: "Musical", emoji: "🎸" },
  { key: "SOCIAL", label: "Social", emoji: "🎉" },
  { key: "EMPRESARIAL", label: "Empresarial", emoji: "💼" },
];

const CATEGORIAS_PRODUCTO = ["AUDIO", "ILUMINACION", "VIDEO", "DJ", "ESTRUCTURA", "OTRO"];

function fmx(n: number) {
  return `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function nombreEq(e: EquipoItem): string {
  return e.marca && e.modelo ? `${e.marca} ${e.modelo}` : e.marca || e.modelo || e.descripcion;
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

// ── Editor de producto (crear/editar) ────────────────────────────────────────
type FormItem = { equipoId: string; cantidad: number };
type FormState = {
  nombre: string;
  descripcion: string;
  categoria: string;
  tiposEvento: string[];
  imagenUrl: string;
  equipoDominanteId: string;
  precioManual: string;
  items: FormItem[];
};

const FORM_EMPTY: FormState = {
  nombre: "",
  descripcion: "",
  categoria: "AUDIO",
  tiposEvento: [],
  imagenUrl: "",
  equipoDominanteId: "",
  precioManual: "",
  items: [],
};

function ProductoEditor({
  form,
  setForm,
  equipos,
  categorias,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  equipos: EquipoItem[];
  categorias: string[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const equipoMap = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos]);

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
  function toggleTag(k: string) {
    setForm({
      ...form,
      tiposEvento: form.tiposEvento.includes(k)
        ? form.tiposEvento.filter((t) => t !== k)
        : [...form.tiposEvento, k],
    });
  }
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
            {(categorias.length > 0 ? categorias : CATEGORIAS_PRODUCTO).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {form.categoria && !categorias.includes(form.categoria) && !CATEGORIAS_PRODUCTO.includes(form.categoria) && (
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    on ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              );
            })}
          </div>
        </div>
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
                      <span className="text-gray-700">📦</span>
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
                <span className="text-gray-700 text-2xl">📦</span>
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
function ProductosSection() {
  const toast = useToast();
  const confirm = useConfirm();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [equipos, setEquipos] = useState<EquipoItem[]>([]);
  const [categoriasInv, setCategoriasInv] = useState<string[]>([]);
  const [sinPaquetear, setSinPaquetear] = useState<EquipoSinPaquetear[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState<string>("TODAS");
  const [showSinPaquetear, setShowSinPaquetear] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_EMPTY);
  const [saving, setSaving] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [rp, re, rs, rc] = await Promise.all([
        fetch("/api/productos").then((r) => r.json()),
        fetch("/api/equipos").then((r) => r.json()),
        fetch("/api/productos/sin-paquetear").then((r) => r.json()),
        fetch("/api/inventario/categorias").then((r) => r.json()),
      ]);
      setProductos(rp.productos ?? []);
      setEquipos(re.equipos ?? []);
      setSinPaquetear(rs.equipos ?? []);
      setCategoriasInv((rc.categorias ?? []).map((c: { nombre: string }) => c.nombre));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo(prefillEquipoId?: string) {
    setEditId(null);
    const base = { ...FORM_EMPTY, categoria: categoriasInv[0] ?? FORM_EMPTY.categoria };
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
      categoria: p.categoria ?? "AUDIO",
      tiposEvento: parseTags(p.tiposEvento),
      imagenUrl: p.imagenUrl && p.imagenUrl.startsWith("data:") ? p.imagenUrl : p.imagenUrl ?? "",
      equipoDominanteId: p.equipoDominanteId ?? "",
      precioManual: p.precioManual != null ? String(p.precioManual) : "",
      items: p.items.map((it) => ({ equipoId: it.equipo.id, cantidad: it.cantidad })),
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
        tiposEvento: form.tiposEvento,
        imagenUrl: form.imagenUrl || null,
        equipoDominanteId: form.equipoDominanteId || null,
        precioManual: form.precioManual,
        items: form.items,
      };
      const res = await fetch(editId ? `/api/productos/${editId}` : "/api/productos", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success(editId ? "Producto actualizado." : "Producto creado.");
      setModalOpen(false);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
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

  const visibles = useMemo(
    () => (filtroCat === "TODAS" ? productos : productos.filter((p) => (p.categoria ?? "OTRO") === filtroCat)),
    [productos, filtroCat]
  );

  const porCategoria = useMemo(() => {
    const cats = [...new Set(visibles.map((p) => p.categoria ?? "OTRO"))].sort();
    return cats
      .map((cat) => ({ cat, items: visibles.filter((p) => (p.categoria ?? "OTRO") === cat) }))
      .filter((g) => g.items.length > 0);
  }, [visibles]);

  return (
    <div>
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-gray-500 text-sm">
          Sistemas armados a partir del inventario. La fuente y disponibilidad siempre es el inventario.
        </p>
        <div className="flex items-center gap-2">
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
                      <span className="text-gray-700 text-xs">📦</span>
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
                  <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Nº eq</th>
                  <th className="text-right px-3 py-2.5 font-medium">Precio</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {porCategoria.map(({ cat, items }) => (
                  <Fragment key={`cat-${cat}`}>
                    <tr className="border-t border-[#1a1a1a]">
                      <td colSpan={5} className="px-4 py-1.5 bg-[#0d0d0d]">
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
                              <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0 flex items-center justify-center text-gray-700 text-xs">📦</div>
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
        <ProductoEditor form={form} setForm={setForm} equipos={equipos} categorias={categoriasInv} />
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
    </div>
  );
}

// ── Página del módulo: Productos de equipos + Paquetes + Grupos de equipo ──────
export default function ProductosModulePage() {
  return (
    <ModuleTabs
      tabs={[
        {
          key: "productos",
          label: "Productos de equipos",
          accessKey: "comercial-productos",
          content: (
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              <ProductosSection />
            </div>
          ),
        },
        {
          key: "paquetes",
          label: "Paquetes",
          accessKey: "comercial-productos",
          content: (
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
              <PaquetesSection />
            </div>
          ),
        },
        {
          key: "grupos-equipo",
          label: "Grupos de equipo",
          accessKey: "grupos-equipo",
          adminOnly: true,
          content: <GruposEquipoPage />,
        },
      ]}
    />
  );
}
