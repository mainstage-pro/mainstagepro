"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { Sliders, Armchair, Lightbulb, Plug } from "lucide-react";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  activo: boolean;
  cantidadTotal: number;
  precioRenta: number;
  costoProveedor: number | null;
  costoInternoEstimado: number | null;
  propietario: string;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  proveedoresPrecios: { precio: number; proveedor: { id: string; nombre: string; empresa: string | null } }[];
  imagenUrl: string | null;
  accesorios: Accesorio[];
};

type Accesorio = {
  id: string;
  nombre: string;
  cantidad: number;
  descripcion: string | null;
  categoria: { id: string; nombre: string } | null;
};

type AccProduccion = {
  id: string;
  nombre: string;
  categoria: string | null;
  equipoId: string;
  equipoNombre: string;
};

const ACC_CATS = ["cable", "herramienta", "consumible", "soporte", "otro"] as const;
const ACC_CAT_LABEL: Record<string, string> = { cable: "Cable", herramienta: "Herramienta", consumible: "Consumible", soporte: "Soporte", otro: "Otro", "sin-categoria": "Sin categoría" };
const ACC_CAT_COLOR: Record<string, string> = { cable: "text-blue-400", herramienta: "text-orange-400", consumible: "text-purple-400", soporte: "text-green-400", otro: "text-gray-500", "sin-categoria": "text-[#555]" };

type HervamActivo = {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  descripcion: string | null;
  cantidad: number;
  categoria: string;
  propietario: string;
  valorAdquisicion: number;
  valorActual: number;
  precioRenta: number;
  notas: string | null;
};

type Categoria = { id: string; nombre: string; orden: number };

const OFICINA_FORM_EMPTY = { nombre: "", marca: "", modelo: "", descripcion: "", cantidad: "1", notas: "", valorAdquisicion: "", valorActual: "" };
type OficinaForm = typeof OFICINA_FORM_EMPTY;

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function KpiCard({ label, value, sub, color = "text-white" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="ms-stat-card">
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[#444] text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

const inlineCls = "w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded text-right text-xs focus:outline-none focus:border-[#B3985B]/50 px-1.5 py-0.5 disabled:opacity-50";

type Tab = "resumen" | "produccion" | "accesorios" | "oficina" | "intangibles";

export default function InventarioActivosPage() {
  const toast = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [activosOficina, setActivosOficina] = useState<HervamActivo[]>([]);
  const [activosIntangibles, setActivosIntangibles] = useState<HervamActivo[]>([]);
  const [busquedaOf, setBusquedaOf] = useState("");
  const [modalOf, setModalOf] = useState<null | "nuevo" | HervamActivo>(null);
  const [formOf, setFormOf] = useState<OficinaForm>(OFICINA_FORM_EMPTY);
  const [savingOf, setSavingOf] = useState(false);
  // ── Accesorios de Producción
  const [accesoriosAPI, setAccesoriosAPI] = useState<AccProduccion[]>([]);
  const [busquedaAcc, setBusquedaAcc] = useState("");
  const [modalAcc, setModalAcc] = useState(false);
  const [formAcc, setFormAcc] = useState({ nombre: "", categoria: "", equipoId: "" });
  const [savingAcc, setSavingAcc] = useState(false);
  const [agruparAcc, setAgruparAcc] = useState<"categoria" | "equipo">("equipo");
  const [equipoBusq, setEquipoBusq] = useState("");   // combobox search text
  const [equipoOpen, setEquipoOpen] = useState(false); // dropdown visible

  function startEdit(id: string, field: string) { setEditingCell({ id, field }); }
  function stopEdit() { setEditingCell(null); }
  function isEditing(id: string, field: string) { return editingCell?.id === id && editingCell?.field === field; }

  async function load() {
    setLoading(true);
    try {
      const [resEq, resOf, resAcc] = await Promise.all([
        fetch("/api/inventario/maestro"),
        fetch("/api/finanzas/hervam/activos"),
        fetch("/api/finanzas/hervam/accesorios-produccion"),
      ]);
      const dataEq = await resEq.json();
      const dataOf = await resOf.json();
      const dataAcc = await resAcc.json();
      setEquipos(dataEq.equipos ?? []);
      setCategorias(dataEq.categorias ?? []);
      const todosActivos: HervamActivo[] = dataOf.activos ?? [];
      setActivosOficina(todosActivos.filter((a: HervamActivo) => a.categoria === "OFICINA"));
      setActivosIntangibles(todosActivos.filter((a: HervamActivo) => a.categoria === "INTANGIBLE"));
      // Flatten accessories from all production equipment
      const flat: AccProduccion[] = [];
      for (const eq of (dataAcc.equipos ?? [])) {
        const eqNombre = [eq.marca, eq.modelo].filter(Boolean).join(" · ") || eq.descripcion;
        for (const acc of (eq.accesorios ?? [])) {
          flat.push({ id: acc.id, nombre: acc.nombre, categoria: acc.categoria, equipoId: eq.id, equipoNombre: eqNombre });
        }
      }
      setAccesoriosAPI(flat.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } finally {
      setLoading(false);
    }
  }

  async function crearAccesorio() {
    if (!formAcc.nombre.trim() || !formAcc.equipoId) { toast.error("Nombre y equipo requeridos"); return; }
    setSavingAcc(true);
    try {
      const res = await fetch(`/api/equipos/${formAcc.equipoId}/accesorios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: formAcc.nombre.trim(), categoria: formAcc.categoria || null }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      const d = await res.json();
      const eq = equiposProd.find(e => e.id === formAcc.equipoId);
      const eqNombre = eq ? ([eq.marca, eq.modelo].filter(Boolean).join(" · ") || eq.descripcion) : "";
      // If already exists, accesorio is returned without creating new — update or add
      setAccesoriosAPI(prev => {
        const exists = prev.find(a => a.id === d.accesorio.id);
        if (exists) return prev;
        return [...prev, { id: d.accesorio.id, nombre: d.accesorio.nombre, categoria: d.accesorio.categoria, equipoId: formAcc.equipoId, equipoNombre: eqNombre }].sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      setModalAcc(false);
      setFormAcc({ nombre: "", categoria: "", equipoId: "" });
      setEquipoBusq("");
      toast.success("Accesorio agregado");
    } finally {
      setSavingAcc(false);
    }
  }

  async function deleteAccesorio(equipoId: string, accId: string) {
    if (!confirm("¿Eliminar este accesorio de la biblioteca del equipo?")) return;
    await fetch(`/api/equipos/${equipoId}/accesorios/${accId}`, { method: "DELETE" });
    setAccesoriosAPI(prev => prev.filter(a => a.id !== accId));
    toast.success("Eliminado");
  }

  useEffect(() => { load(); }, []);

  function abrirModalOf(activo?: HervamActivo) {
    if (activo) {
      setFormOf({
        nombre: activo.nombre,
        marca: activo.marca ?? "",
        modelo: activo.modelo ?? "",
        descripcion: activo.descripcion ?? "",
        cantidad: String(activo.cantidad),
        notas: activo.notas ?? "",
        valorAdquisicion: activo.valorAdquisicion ? String(activo.valorAdquisicion) : "",
        valorActual: activo.valorActual ? String(activo.valorActual) : "",
      });
      setModalOf(activo);
    } else {
      setFormOf(OFICINA_FORM_EMPTY);
      setModalOf("nuevo");
    }
  }

  async function guardarOficina() {
    if (!formOf.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setSavingOf(true);
    try {
      const payload = {
        nombre: formOf.nombre.trim(),
        marca: formOf.marca.trim() || null,
        modelo: formOf.modelo.trim() || null,
        descripcion: formOf.descripcion.trim() || null,
        cantidad: parseInt(formOf.cantidad) || 1,
        notas: formOf.notas.trim() || null,
        valorAdquisicion: parseFloat(formOf.valorAdquisicion) || 0,
        valorActual: parseFloat(formOf.valorActual) || 0,
        categoria: "OFICINA",
        propietario: "MAINSTAGE",
      };
      if (modalOf === "nuevo") {
        const res = await fetch("/api/finanzas/hervam/activos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { toast.error("Error al crear"); return; }
        const d = await res.json();
        setActivosOficina(prev => [...prev, d.activo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        toast.success("Activo agregado");
      } else if (modalOf && typeof modalOf !== "string") {
        const res = await fetch(`/api/finanzas/hervam/activos/${modalOf.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { toast.error("Error al guardar"); return; }
        const d = await res.json();
        setActivosOficina(prev => prev.map(a => a.id === d.activo.id ? d.activo : a));
        toast.success("Guardado");
      }
      setModalOf(null);
    } finally {
      setSavingOf(false);
    }
  }

  async function eliminarOficina(id: string) {
    if (!confirm("¿Eliminar este activo?")) return;
    await fetch(`/api/finanzas/hervam/activos/${id}`, { method: "DELETE" });
    setActivosOficina(prev => prev.filter(a => a.id !== id));
    toast.success("Eliminado");
  }

  async function patchEquipo(id: string, campo: string, valor: number | string | null) {
    setSavingInline(id);
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      setEquipos(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e));
      if (campo === "propietario") toast.success(`Cambiado a ${valor}`);
    } finally {
      setSavingInline(null);
    }
  }

  async function patchActivo(id: string, campo: string, valor: number) {
    setSavingInline(id);
    try {
      const res = await fetch(`/api/finanzas/hervam/activos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      setActivosOficina(prev => prev.map(a => a.id === id ? { ...a, [campo]: valor } : a));
    } finally {
      setSavingInline(null);
    }
  }

  async function descargarPDF() {
    try {
      const res = await fetch("/api/inventario/pdf", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventario-Activos-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF");
    }
  }

  // ── Equipos de Producción = equipos propios activos
  const equiposProd = useMemo(() =>
    equipos.filter(e => e.tipo === "PROPIO" && e.activo),
    [equipos]
  );

  // ── Accesorios de Producción = datos reales desde la API dedicada
  const accesoriosProd = accesoriosAPI;

  // ── KPIs globales
  const valorTotalProd = equiposProd.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
  const rentaTotalProd = equiposProd.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
  const rentabilidadProm = valorTotalProd > 0 ? (rentaTotalProd * 12 / valorTotalProd) * 100 : 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumen",     label: "Reporte General" },
    { key: "produccion",  label: `Equipos de Producción (${equiposProd.length})` },
    { key: "accesorios",  label: `Accesorios de Producción (${accesoriosProd.length})` },
    { key: "oficina",     label: `Equipos de Oficina (${activosOficina.length})` },
    { key: "intangibles", label: `Activos Intangibles (${activosIntangibles.length})` },
  ];

  // ── Agrupar propios por categoría
  const porCategoriaProd = useMemo(() =>
    categorias
      .map(cat => ({ cat, items: equiposProd.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, equiposProd]
  );

  // ── Agrupar accesorios por categoría de accesorio
  const accesoriosPorCat = useMemo(() => {
    const map = new Map<string, AccProduccion[]>();
    accesoriosProd.forEach(a => {
      const key = a.categoria && (ACC_CATS as readonly string[]).includes(a.categoria) ? a.categoria : "sin-categoria";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    const order = [...ACC_CATS, "sin-categoria"];
    return order.filter(k => map.has(k)).map(k => ({ cat: k, items: map.get(k)! }));
  }, [accesoriosProd]);

  // ── Agrupar accesorios por equipo origen (incluye equipoId)
  const accesoriosPorEquipo = useMemo(() => {
    const map = new Map<string, { equipoId: string; equipoNombre: string; items: AccProduccion[] }>();
    accesoriosProd.forEach(a => {
      if (!map.has(a.equipoId)) map.set(a.equipoId, { equipoId: a.equipoId, equipoNombre: a.equipoNombre, items: [] });
      map.get(a.equipoId)!.items.push(a);
    });
    return Array.from(map.values()).sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre));
  }, [accesoriosProd]);

  // ── Equipos propios SIN ningún accesorio registrado
  const equiposSinAcc = useMemo(() => {
    const conAcc = new Set(accesoriosProd.map(a => a.equipoId));
    return equiposProd
      .filter(eq => !conAcc.has(eq.id))
      .map(eq => ({
        equipoId: eq.id,
        equipoNombre: [eq.marca, eq.modelo].filter(Boolean).join(" · ") || eq.descripcion,
        descripcion: eq.descripcion,
        categoria: eq.categoria.nombre,
      }))
      .filter(eq => !busquedaAcc || eq.equipoNombre.toLowerCase().includes(busquedaAcc.toLowerCase()))
      .sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre));
  }, [equiposProd, accesoriosProd, busquedaAcc]);

  function openModalParaEquipo(equipoId: string, equipoNombre: string) {
    setFormAcc({ nombre: "", categoria: "", equipoId });
    setEquipoBusq(equipoNombre);
    setModalAcc(true);
  }

  // ── Filtrado por búsqueda
  const accesoriosFiltrados = useMemo(() =>
    busquedaAcc
      ? accesoriosProd.filter(a =>
          a.nombre.toLowerCase().includes(busquedaAcc.toLowerCase()) ||
          (a.equipoNombre ?? "").toLowerCase().includes(busquedaAcc.toLowerCase())
        )
      : accesoriosProd,
    [accesoriosProd, busquedaAcc]
  );

  // ── Resumen: vars computadas fuera del JSX para evitar IIFE
  const resumenTotalOficina = activosOficina.reduce((s, a) => s + (a.valorActual > 0 ? a.valorActual : a.valorAdquisicion), 0);
  const resumenTotalIntangibles = activosIntangibles.reduce((s, a) => s + (a.valorActual > 0 ? a.valorActual : a.valorAdquisicion), 0);
  const resumenTotalPropios = resumenTotalOficina + resumenTotalIntangibles;
  const resumenGrandTotal = valorTotalProd + resumenTotalPropios;
  const RESUMEN_COLORS = ["bg-amber-500","bg-blue-500","bg-emerald-500","bg-purple-500","bg-rose-500","bg-cyan-500","bg-orange-500","bg-teal-500","bg-indigo-500","bg-pink-500","bg-lime-500","bg-sky-500","bg-violet-500"];
  const resumenCatValores = [...porCategoriaProd]
    .map(g => ({
      nombre: g.cat.nombre,
      cantidad: g.items.reduce((s, e) => s + e.cantidadTotal, 0),
      valor: g.items.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0),
      renta: g.items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0),
    }))
    .sort((a, b) => b.valor - a.valor);
  const resumenMaxValorCat = Math.max(...resumenCatValores.map(c => c.valor), 1);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Inventario de Activos</h1>
          <p className="ms-subtitle mt-0.5">Gestión financiera del inventario · solo administración</p>
        </div>
        <button
          onClick={descargarPDF}
          className="flex items-center gap-2 border border-[#333] hover:border-[#B3985B]/50 text-[#6b7280] hover:text-[#B3985B] text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="ms-tabs w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-[#B3985B] text-black" : "text-[#6b7280] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>

      ) : tab === "resumen" ? (
            <div className="space-y-5">

              {/* ── KPIs por tipo de activo ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* Producción — ADMINISTRADO */}
                <div className="ms-stat-card relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/60" />
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] text-amber-500/80 uppercase tracking-widest font-semibold">Administrado por Mainstage</p>
                      <p className="text-sm text-white/80 mt-0.5">Equipos de Producción</p>
                    </div>
                    <Sliders strokeWidth={1.75} className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400 tabular-nums">{fmx(valorTotalProd)}</p>
                  <p className="text-[10px] text-[#555] mt-1">Valor de adquisición · {equiposProd.length} equipos</p>
                  <div className="mt-3 pt-3 border-t border-[#1e1e1e] grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-[#555]">Renta mensual</p>
                      <p className="text-sm font-semibold text-emerald-400">{fmx(rentaTotalProd)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555]">Rentabilidad</p>
                      <p className="text-sm font-semibold text-blue-400">{pct(rentabilidadProm)} anual</p>
                    </div>
                  </div>
                </div>

                {/* Oficina — PROPIO */}
                <div className="ms-stat-card relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#B3985B]/60" />
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold">Activo Propio Mainstage</p>
                      <p className="text-sm text-white/80 mt-0.5">Oficina y Mobiliario</p>
                    </div>
                    <Armchair strokeWidth={1.75} className="w-5 h-5 text-gray-400" />
                  </div>
                  {resumenTotalOficina > 0
                    ? <p className="text-2xl font-bold text-[#B3985B] tabular-nums">{fmx(resumenTotalOficina)}</p>
                    : <p className="text-2xl font-bold text-[#444]">—</p>}
                  <p className="text-[10px] text-[#555] mt-1">{activosOficina.length} activos registrados</p>
                  <button onClick={() => setTab("oficina")} className="mt-3 pt-3 border-t border-[#1e1e1e] w-full text-left text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">Ver detalle →</button>
                </div>

                {/* Intangibles — PROPIO */}
                <div className="ms-stat-card relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500/60" />
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold">Activo Propio Mainstage</p>
                      <p className="text-sm text-white/80 mt-0.5">Activos Intangibles</p>
                    </div>
                    <Lightbulb strokeWidth={1.75} className="w-5 h-5 text-gray-400" />
                  </div>
                  {resumenTotalIntangibles > 0
                    ? <p className="text-2xl font-bold text-purple-400 tabular-nums">{fmx(resumenTotalIntangibles)}</p>
                    : <p className="text-2xl font-bold text-[#444]">—</p>}
                  <p className="text-[10px] text-[#555] mt-1">{activosIntangibles.length} activos · software y PI</p>
                  <button onClick={() => setTab("intangibles")} className="mt-3 pt-3 border-t border-[#1e1e1e] w-full text-left text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">Ver detalle →</button>
                </div>
              </div>

              {/* ── Gráfica por categoría + Composición del portafolio ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Gráfica horizontal — valor por categoría de producción */}
                <div className="ms-table-wrapper">
                  <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Valor por categoría</p>
                      <p className="text-[10px] text-[#555] mt-0.5">Equipos de producción administrados</p>
                    </div>
                    <span className="text-[10px] text-[#444] border border-[#222] px-2 py-0.5 rounded-full">Por adquisición</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {resumenCatValores.length === 0 ? (
                      <p className="text-[#444] text-sm text-center py-6">Sin datos de valor registrados</p>
                    ) : resumenCatValores.map((c, i) => {
                      const pctBar = (c.valor / resumenMaxValorCat) * 100;
                      return (
                        <div key={c.nombre}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white/70 truncate max-w-[160px]">{c.nombre}</span>
                            <div className="text-right shrink-0 ml-2">
                              <span className="text-xs font-semibold text-white/90">{fmx(c.valor)}</span>
                              <span className="text-[10px] text-[#555] ml-2">{c.cantidad} u</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className={`h-full ${RESUMEN_COLORS[i % RESUMEN_COLORS.length]} rounded-full transition-all duration-700`} style={{ width: `${pctBar}%` }} />
                          </div>
                          {c.renta > 0 && <p className="text-[10px] text-emerald-500/70 mt-0.5">Renta: {fmx(c.renta)}/mes</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Composición del portafolio */}
                <div className="ms-table-wrapper">
                  <div className="px-4 py-3 border-b border-[#1e1e1e]">
                    <p className="text-sm font-medium text-white">Composición del portafolio</p>
                    <p className="text-[10px] text-[#555] mt-0.5">Distribución por tipo de activo</p>
                  </div>
                  <div className="p-4">
                    {resumenGrandTotal > 0 ? (
                      <>
                        <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-5">
                          {valorTotalProd > 0 && <div className="bg-amber-500/80 transition-all" style={{ width: `${(valorTotalProd / resumenGrandTotal) * 100}%` }} />}
                          {resumenTotalOficina > 0 && <div className="bg-[#B3985B]/80 transition-all" style={{ width: `${(resumenTotalOficina / resumenGrandTotal) * 100}%` }} />}
                          {resumenTotalIntangibles > 0 && <div className="bg-purple-500/80 transition-all" style={{ width: `${(resumenTotalIntangibles / resumenGrandTotal) * 100}%` }} />}
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: "Equipos de Producción", nota: "Administrado", valor: valorTotalProd, dot: "bg-amber-500", text: "text-amber-400" },
                            { label: "Oficina y Mobiliario",  nota: "Propio",       valor: resumenTotalOficina,    dot: "bg-[#B3985B]", text: "text-[#B3985B]" },
                            { label: "Activos Intangibles",   nota: "Propio",       valor: resumenTotalIntangibles, dot: "bg-purple-500", text: "text-purple-400" },
                          ].filter(s => s.valor > 0).map(s => (
                            <div key={s.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-sm ${s.dot}`} />
                                <div>
                                  <p className="text-xs text-white/80">{s.label}</p>
                                  <p className="text-[10px] text-[#555]">{s.nota}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${s.text}`}>{fmx(s.valor)}</p>
                                <p className="text-[10px] text-[#444]">{pct((s.valor / resumenGrandTotal) * 100)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-[#1e1e1e] flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-[#555] uppercase tracking-wider">Portafolio total</p>
                            <p className="text-[10px] text-[#444] mt-0.5">Activos propios: {resumenTotalPropios > 0 ? fmx(resumenTotalPropios) : "—"}</p>
                          </div>
                          <p className="text-xl font-bold text-[#B3985B] tabular-nums">{fmx(resumenGrandTotal)}</p>
                        </div>
                        <div className="mt-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 flex items-center justify-between">
                          <p className="text-[10px] text-[#555]">Solo activos propios Mainstage</p>
                          <p className="text-sm font-semibold text-[#B3985B]">{resumenTotalPropios > 0 ? fmx(resumenTotalPropios) : "—"}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-[#444] text-sm">Sin datos de valor registrados</p>
                        <p className="text-[#333] text-xs mt-1">Agrega costos en cada sección</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Tabla consolidada ── */}
              <div className="ms-table-wrapper">
                <div className="px-4 py-3 border-b border-[#1e1e1e]">
                  <p className="text-sm font-medium text-white">Inventario consolidado</p>
                  <p className="text-[#555] text-xs mt-0.5">Resumen por sección</p>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Sliders strokeWidth={1.75} className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white/90">Equipos de Producción</p>
                          <span className="text-[9px] bg-amber-900/30 text-amber-500 border border-amber-800/30 px-1.5 py-0.5 rounded-full font-medium">Administrado</span>
                        </div>
                        <p className="text-xs text-[#555]">{equiposProd.length} equipos · {porCategoriaProd.length} categorías · renta {fmx(rentaTotalProd)}/mes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-400">{fmx(valorTotalProd)}</p>
                      <button onClick={() => setTab("produccion")} className="text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">Ver detalle →</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Armchair strokeWidth={1.75} className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white/90">Equipos y Mobiliario de Oficina</p>
                          <span className="text-[9px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20 px-1.5 py-0.5 rounded-full font-medium">Propio</span>
                        </div>
                        <p className="text-xs text-[#555]">{activosOficina.length} activos registrados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {resumenTotalOficina > 0 ? <p className="text-sm font-semibold text-[#B3985B]">{fmx(resumenTotalOficina)}</p> : <p className="text-xs text-[#444] italic">sin valorar</p>}
                      <button onClick={() => setTab("oficina")} className="text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">Ver detalle →</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Plug strokeWidth={1.75} className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-white/90">Accesorios de Producción</p>
                        <p className="text-xs text-[#555]">{accesoriosProd.length} accesorios catalogados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#444] italic">sin valorar</p>
                      <button onClick={() => setTab("accesorios")} className="text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">Ver detalle →</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Lightbulb strokeWidth={1.75} className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white/90">Activos Intangibles</p>
                          <span className="text-[9px] bg-purple-900/30 text-purple-400 border border-purple-800/30 px-1.5 py-0.5 rounded-full font-medium">Propio</span>
                        </div>
                        <p className="text-xs text-[#555]">{activosIntangibles.length} activos · software y PI</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {resumenTotalIntangibles > 0 ? <p className="text-sm font-semibold text-purple-400">{fmx(resumenTotalIntangibles)}</p> : <p className="text-xs text-[#444] italic">sin valorar</p>}
                      <button onClick={() => setTab("intangibles")} className="text-[10px] text-[#444] hover:text-[#B3985B] transition-colors">Ver detalle →</button>
                    </div>
                  </div>
                  {resumenGrandTotal > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d0d]">
                      <div>
                        <p className="text-xs text-[#555] font-medium uppercase tracking-wider">Portafolio total</p>
                        <p className="text-[10px] text-[#444] mt-0.5">Activos propios: {resumenTotalPropios > 0 ? fmx(resumenTotalPropios) : "—"}</p>
                      </div>
                      <p className="text-lg font-bold text-[#B3985B] tabular-nums">{fmx(resumenGrandTotal)}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

      ) : tab === "produccion" ? (

        /* ── EQUIPOS DE PRODUCCIÓN ── */
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Equipos propios" value={String(equiposProd.length)} sub={`${porCategoriaProd.length} categorías`} />
            <KpiCard label="Valor total del activo" value={fmx(valorTotalProd)} sub="Costo de adquisición" color="text-[#B3985B]" />
            <KpiCard label="Renta mensual potencial" value={fmx(rentaTotalProd)} sub="Precio renta × cantidad" color="text-emerald-400" />
          </div>

          {equiposProd.length === 0 ? (
            <p className="text-center text-[#333] text-sm py-12">No hay equipos de producción registrados.</p>
          ) : (
            <div className="ms-table-wrapper">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                      <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                      <th className="text-right px-4 py-2.5 font-medium w-16">Cant.</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Valor unitario</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Precio de renta</th>
                      <th className="text-right px-4 py-2.5 font-medium w-32">Rentabilidad</th>
                      <th className="text-center px-4 py-2.5 font-medium w-36">Propietario</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Subtotal valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoriaProd.map(({ cat, items }) => {
                      const catValor = items.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
                      const catRenta = items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
                      return (
                        <>
                          <tr key={`cat-${cat.id}`} className="border-t border-[#1a1a1a]">
                            <td colSpan={7} className="px-4 py-1.5 bg-[#0d0d0d]">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{cat.nombre}</span>
                                <span className="text-[#333] text-[10px]">({items.length})</span>
                                <div className="flex-1" />
                                {catValor > 0 && <span className="text-[10px] text-[#555]">Activo {fmx(catValor)}</span>}
                                {catRenta > 0 && <span className="text-[10px] text-emerald-900">Renta pot. {fmx(catRenta)}</span>}
                              </div>
                            </td>
                          </tr>
                          {items.map(e => {
                            const valorUnitario = e.costoInternoEstimado;
                            const subtotal = valorUnitario != null ? valorUnitario * e.cantidadTotal : null;
                            const rentabilidad = valorUnitario && valorUnitario > 0
                              ? (e.precioRenta * 12 / valorUnitario) * 100
                              : null;
                            return (
                              <tr key={e.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {e.imagenUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={e.imagenUrl} alt="" className="w-7 h-7 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                                    ) : (
                                      <div className="w-7 h-7 rounded bg-[#1a1a1a] shrink-0" />
                                    )}
                                    <div>
                                      <p className="text-white font-medium">{(e.marca || e.modelo) ? [e.marca, e.modelo].filter(Boolean).join(" · ") : e.descripcion}</p>
                                      {(e.marca || e.modelo) && <p className="text-[#555] text-[10px]">{e.descripcion}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className="text-white font-medium tabular-nums">{e.cantidadTotal}</span>
                                </td>
                                {/* Valor unitario — editable */}
                                <td className="px-4 py-2.5 text-right">
                                  {isEditing(e.id, "costoInternoEstimado") ? (
                                    <input type="number" autoFocus defaultValue={valorUnitario ?? ""} min={0} placeholder="0"
                                      disabled={savingInline === e.id}
                                      className={`${inlineCls} text-[#9ca3af]`}
                                      onBlur={ev => { const raw = ev.target.value; const v = raw === "" ? null : parseFloat(raw); if (v !== valorUnitario) patchEquipo(e.id, "costoInternoEstimado", v); stopEdit(); }}
                                      onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                                  ) : (
                                    <button onClick={() => startEdit(e.id, "costoInternoEstimado")}
                                      className="text-[#9ca3af] font-medium hover:opacity-75 transition-opacity tabular-nums">
                                      {valorUnitario != null ? fmx(valorUnitario) : <span className="text-[#333]">—</span>}
                                    </button>
                                  )}
                                </td>
                                {/* Precio renta — editable */}
                                <td className="px-4 py-2.5 text-right">
                                  {isEditing(e.id, "precioRenta") ? (
                                    <input type="number" autoFocus defaultValue={e.precioRenta} min={0}
                                      disabled={savingInline === e.id}
                                      className={`${inlineCls} text-[#B3985B]`}
                                      onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v !== e.precioRenta) patchEquipo(e.id, "precioRenta", v); stopEdit(); }}
                                      onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                                  ) : (
                                    <button onClick={() => startEdit(e.id, "precioRenta")}
                                      className="text-[#B3985B] font-medium hover:opacity-75 transition-opacity tabular-nums">
                                      {fmx(e.precioRenta)}
                                    </button>
                                  )}
                                </td>
                                {/* Rentabilidad */}
                                <td className="px-4 py-2.5 text-right">
                                  {rentabilidad != null ? (
                                    <span className={`font-medium tabular-nums ${rentabilidad >= 30 ? "text-emerald-400" : rentabilidad >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                                      {pct(rentabilidad)}
                                    </span>
                                  ) : <span className="text-[#333]">—</span>}
                                </td>
                                {/* Propietario — estático, sin toggle */}
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#B3985B]/20 text-[#B3985B]">
                                    Mainstage Pro
                                  </span>
                                </td>
                                {/* Subtotal */}
                                <td className="px-4 py-2.5 text-right">
                                  {subtotal != null
                                    ? <span className="text-white font-semibold tabular-nums">{fmx(subtotal)}</span>
                                    : <span className="text-[#333]">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Total global */}
              <div className="border-t border-[#222] px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-[#0d0d0d]">
                <p className="text-[#6b7280] text-xs">{equiposProd.length} equipos de producción</p>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor total del activo</p>
                    <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmx(valorTotalProd)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Renta mensual potencial</p>
                    <p className="text-emerald-400 font-bold text-base tabular-nums">{fmx(rentaTotalProd)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Rentabilidad anual</p>
                    <p className="text-blue-400 font-bold text-base tabular-nums">{pct(rentabilidadProm)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : tab === "accesorios" ? (

        /* ── ACCESORIOS DE PRODUCCIÓN ── */
        <div className="space-y-4">

          {/* Modal agregar accesorio */}
          {modalAcc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
                  <h2 className="text-white font-semibold">Agregar accesorio</h2>
                  <button onClick={() => { setModalAcc(false); setEquipoBusq(""); }} className="text-gray-500 hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nombre del accesorio *</label>
                    <input value={formAcc.nombre} onChange={e => setFormAcc(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Clamp de 50mm, Cable XLR 5m..."
                      className="ms-input" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Categoría</label>
                    <div className="flex flex-wrap gap-2">
                      {ACC_CATS.map(cat => (
                        <button key={cat} onClick={() => setFormAcc(p => ({ ...p, categoria: p.categoria === cat ? "" : cat }))}
                          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                            formAcc.categoria === cat ? "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/40" : "text-[#555] border-[#222] hover:border-[#444]"
                          }`}>
                          {ACC_CAT_LABEL[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Equipo al que pertenece *</label>
                    <div className="relative">
                      <input
                        value={equipoBusq}
                        onChange={e => { setEquipoBusq(e.target.value); setEquipoOpen(true); if (!e.target.value) setFormAcc(p => ({ ...p, equipoId: "" })); }}
                        onFocus={() => setEquipoOpen(true)}
                        placeholder="Escribe para buscar equipo..."
                        autoComplete="off"
                        className={`w-full bg-[#111] border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none transition-colors ${
                          formAcc.equipoId ? "border-[#B3985B]/50" : "border-[#2a2a2a] focus:border-[#B3985B]/50"
                        }`}
                      />
                      {formAcc.equipoId && (
                        <button onClick={() => { setFormAcc(p => ({ ...p, equipoId: "" })); setEquipoBusq(""); setEquipoOpen(false); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                      {equipoOpen && equipoBusq && (() => {
                        const opts = equiposProd
                          .map(eq => ({ id: eq.id, label: [eq.marca, eq.modelo].filter(Boolean).join(" · ") || eq.descripcion, sub: eq.descripcion }))
                          .filter(o => o.label.toLowerCase().includes(equipoBusq.toLowerCase()) || o.sub.toLowerCase().includes(equipoBusq.toLowerCase()))
                          .sort((a, b) => a.label.localeCompare(b.label));
                        return opts.length > 0 ? (
                          <div className="absolute z-10 mt-1 w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                            {opts.map(o => (
                              <button key={o.id} type="button"
                                onMouseDown={e => { e.preventDefault(); setFormAcc(p => ({ ...p, equipoId: o.id })); setEquipoBusq(o.label); setEquipoOpen(false); }}
                                className="w-full text-left px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0">
                                <p className="text-white text-sm">{o.label}</p>
                                {o.label !== o.sub && <p className="text-[#555] text-[10px] mt-0.5">{o.sub}</p>}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="absolute z-10 mt-1 w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-3 text-[#444] text-xs">
                            Sin resultados para &ldquo;{equipoBusq}&rdquo;
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#1e1e1e] flex gap-2 justify-end">
                  <button onClick={() => { setModalAcc(false); setEquipoBusq(""); }} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">Cancelar</button>
                  <button onClick={crearAccesorio} disabled={savingAcc}
                    className="px-5 py-2 bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
                    {savingAcc ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total accesorios" value={String(accesoriosProd.length)} sub="En biblioteca de equipos" />
            <KpiCard label="Equipos con accesorios" value={String(accesoriosPorEquipo.length)} sub={`de ${equiposProd.length} en producción`} color="text-[#B3985B]" />
            <KpiCard label="Sin accesorios" value={String(equiposSinAcc.length)} sub="Pendientes por registrar" color="text-red-400" />
            <KpiCard label="Cables" value={String(accesoriosProd.filter(a => a.categoria === "cable").length)} sub="Clasificados" color="text-blue-400" />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input value={busquedaAcc} onChange={e => setBusquedaAcc(e.target.value)} placeholder="Buscar accesorio o equipo..."
                className="ms-card rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40 w-56" />
              <div className="flex gap-0.5 bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5">
                {(["equipo", "categoria"] as const).map(g => (
                  <button key={g} onClick={() => setAgruparAcc(g)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      agruparAcc === g ? "bg-[#B3985B] text-black" : "text-[#555] hover:text-white"
                    }`}>
                    {g === "equipo" ? "Por equipo" : "Por categoría"}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setModalAcc(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a960] text-black text-sm font-semibold rounded-lg transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar accesorio
            </button>
          </div>

          {/* Tabla: siempre visible si hay equipos de produccion */}
          {equiposProd.length === 0 ? (
            <div className="ms-card p-12 text-center">
              <p className="text-[#555] text-sm">No hay equipos propios en el inventario.</p>
            </div>
          ) : (
            <div className="ms-table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e] bg-[#0a0a0a]">
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Accesorio</th>
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{agruparAcc === "equipo" ? "Categoría" : "Equipo origen"}</th>
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold hidden md:table-cell">{agruparAcc === "equipo" ? "Equipo" : ""}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {agruparAcc === "equipo"
                    ? (
                      <>
                        {accesoriosPorEquipo
                          .filter(g => !busquedaAcc || g.items.some(a => a.nombre.toLowerCase().includes(busquedaAcc.toLowerCase()) || g.equipoNombre.toLowerCase().includes(busquedaAcc.toLowerCase())))
                          .map(({ equipoId, equipoNombre, items }) => (
                          <>
                            <tr key={`eq-${equipoId}`}>
                              <td colSpan={4} className="px-4 py-2 bg-[#0d0d0d] border-b border-[#1e1e1e]">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-[11px] text-[#B3985B] font-semibold">{equipoNombre}</span>
                                    <span className="text-[#333] text-[10px] ml-2">({items.length})</span>
                                  </div>
                                  <button onClick={() => openModalParaEquipo(equipoId, equipoNombre)}
                                    className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#B3985B] transition-colors pr-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    Agregar
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {items.filter(a => !busquedaAcc || a.nombre.toLowerCase().includes(busquedaAcc.toLowerCase())).map(a => (
                              <tr key={a.id} className="hover:bg-[#0d0d0d] transition-colors group">
                                <td className="px-4 py-2.5 pl-8 text-gray-300 font-medium">{a.nombre}</td>
                                <td className="px-4 py-2.5">
                                  {a.categoria ? (
                                    <span className={`text-xs ${ACC_CAT_COLOR[a.categoria] ?? "text-gray-500"}`}>{ACC_CAT_LABEL[a.categoria] ?? a.categoria}</span>
                                  ) : <span className="text-[#333] text-xs">—</span>}
                                </td>
                                <td className="px-4 py-2.5 hidden md:table-cell"></td>
                                <td className="px-2">
                                  <button onClick={() => deleteAccesorio(a.equipoId, a.id)}
                                    className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-500 transition-all p-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </>
                        ))}

                        {/* Equipos sin accesorios — solo en vista Por equipo */}
                        {equiposSinAcc.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={4} className="px-4 py-2 bg-[#0a0a0a] border-t-2 border-[#1e1e1e]">
                                <span className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider">Sin accesorios registrados</span>
                                <span className="text-[#333] text-[10px] ml-2">({equiposSinAcc.length})</span>
                              </td>
                            </tr>
                            {equiposSinAcc.map(eq => (
                              <tr key={eq.equipoId} className="hover:bg-[#0d0d0d] transition-colors group">
                                <td className="px-4 py-2.5 pl-8" colSpan={2}>
                                  <p className="text-[#555] text-sm font-medium">{eq.equipoNombre}</p>
                                  {eq.equipoNombre !== eq.descripcion && <p className="text-[#333] text-[10px]">{eq.descripcion}</p>}
                                </td>
                                <td className="px-4 py-2.5 hidden md:table-cell">
                                  <span className="text-[#2a2a2a] text-xs">{eq.categoria}</span>
                                </td>
                                <td className="px-2">
                                  <button onClick={() => openModalParaEquipo(eq.equipoId, eq.equipoNombre)}
                                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-[#555] hover:text-[#B3985B] border border-[#2a2a2a] hover:border-[#B3985B]/40 px-2 py-0.5 rounded transition-all whitespace-nowrap">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    + accesorio
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </>
                    )
                    : accesoriosPorCat.map(({ cat, items }) => (
                        <>
                          <tr key={`cat-${cat}`}>
                            <td colSpan={4} className="px-4 py-2 bg-[#0d0d0d] border-b border-[#1e1e1e]">
                              <span className={`text-[11px] font-semibold ${ACC_CAT_COLOR[cat]}`}>{ACC_CAT_LABEL[cat]}</span>
                              <span className="text-[#333] text-[10px] ml-2">({items.length})</span>
                            </td>
                          </tr>
                          {items.filter(a => !busquedaAcc || a.nombre.toLowerCase().includes(busquedaAcc.toLowerCase()) || a.equipoNombre.toLowerCase().includes(busquedaAcc.toLowerCase())).map(a => (
                            <tr key={a.id} className="hover:bg-[#0d0d0d] transition-colors group">
                              <td className="px-4 py-2.5 pl-8 text-gray-300 font-medium">{a.nombre}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">{a.equipoNombre}</td>
                              <td className="px-4 py-2.5 hidden md:table-cell"></td>
                              <td className="px-2">
                                <button onClick={() => deleteAccesorio(a.equipoId, a.id)}
                                  className="opacity-0 group-hover:opacity-100 text-[#333] hover:text-red-500 transition-all p-1">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </>
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : tab === "oficina" ? (

        /* ── EQUIPOS DE OFICINA ── */
        <div className="space-y-4">

          {/* Modal agregar / editar */}
          {modalOf !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
                  <h2 className="text-white font-semibold">{modalOf === "nuevo" ? "Agregar activo" : "Editar activo"}</h2>
                  <button onClick={() => setModalOf(null)} className="text-gray-500 hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {/* Row 1 */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Artículo *</label>
                    <input value={formOf.nombre} onChange={e => setFormOf(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Silla ergonómica"
                      className="ms-input" />
                  </div>
                  {/* Row 2: marca + modelo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Marca</label>
                      <input value={formOf.marca} onChange={e => setFormOf(p => ({ ...p, marca: e.target.value }))}
                        placeholder="Ej: Sony"
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Modelo</label>
                      <input value={formOf.modelo} onChange={e => setFormOf(p => ({ ...p, modelo: e.target.value }))}
                        placeholder="Ej: A7 IV"
                        className="ms-input" />
                    </div>
                  </div>
                  {/* Row 3: cantidad + valor adq + valor actual */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cantidad</label>
                      <input type="number" min="1" value={formOf.cantidad} onChange={e => setFormOf(p => ({ ...p, cantidad: e.target.value }))}
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Valor adquisición</label>
                      <input type="number" value={formOf.valorAdquisicion} onChange={e => setFormOf(p => ({ ...p, valorAdquisicion: e.target.value }))}
                        placeholder="0"
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Valor actual</label>
                      <input type="number" value={formOf.valorActual} onChange={e => setFormOf(p => ({ ...p, valorActual: e.target.value }))}
                        placeholder="0"
                        className="ms-input" />
                    </div>
                  </div>
                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notas</label>
                    <input value={formOf.notas} onChange={e => setFormOf(p => ({ ...p, notas: e.target.value }))}
                      placeholder="Número de serie, ubicación, etc."
                      className="ms-input" />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#1e1e1e] flex gap-2 justify-end">
                  <button onClick={() => setModalOf(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">Cancelar</button>
                  <button onClick={guardarOficina} disabled={savingOf}
                    className="px-5 py-2 bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
                    {savingOf ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total artículos" value={String(activosOficina.length)} sub="Equipos de oficina" />
            <KpiCard label="Total unidades" value={String(activosOficina.reduce((s,a) => s + a.cantidad, 0))} sub="Conteo físico" />
            <KpiCard label="Valor adquisición" color="text-[#B3985B]"
              value={fmx(activosOficina.reduce((s, a) => s + a.valorAdquisicion, 0))}
              sub="Costo histórico" />
            <KpiCard label="Valor actual" color="text-blue-400"
              value={fmx(activosOficina.reduce((s, a) => s + a.valorActual, 0))}
              sub="Valuación estimada" />
          </div>

          {/* Barra superior: búsqueda + agregar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <input value={busquedaOf} onChange={e => setBusquedaOf(e.target.value)} placeholder="Buscar activo..."
              className="ms-card rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/40 w-56" />
            <button onClick={() => abrirModalOf()}
              className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a960] text-black text-sm font-semibold rounded-lg transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar activo
            </button>
          </div>

          {/* Tabla estilo inventario */}
          <div className="ms-table-wrapper">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2.5 font-medium">Artículo</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Marca · Modelo</th>
                  <th className="text-right px-4 py-2.5 font-medium w-16">Cant.</th>
                  <th className="text-right px-4 py-2.5 font-medium w-36">Valor adq.</th>
                  <th className="text-right px-4 py-2.5 font-medium w-36">Valor actual</th>
                  <th className="text-right px-4 py-2.5 font-medium w-28">Depreci.</th>
                  <th className="w-14"></th>
                </tr>
              </thead>
              <tbody>
                {activosOficina
                  .filter(a => !busquedaOf || a.nombre.toLowerCase().includes(busquedaOf.toLowerCase()) || (a.marca ?? "").toLowerCase().includes(busquedaOf.toLowerCase()))
                  .map(a => {
                    const dep = a.valorAdquisicion > 0 && a.valorActual > 0
                      ? ((1 - a.valorActual / a.valorAdquisicion) * 100)
                      : null;
                    return (
                      <tr key={a.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors group">
                        {/* Nombre */}
                        <td className="px-4 py-2.5">
                          <p className="text-white font-medium">{a.nombre}</p>
                          {a.notas && <p className="text-[#444] text-[10px] mt-0.5 truncate max-w-52">{a.notas}</p>}
                        </td>
                        {/* Marca · Modelo */}
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          {(a.marca || a.modelo)
                            ? <span className="text-[#6b7280]">{[a.marca, a.modelo].filter(Boolean).join(" · ")}</span>
                            : <span className="text-[#333]">—</span>}
                        </td>
                        {/* Cantidad — click to edit */}
                        <td className="px-4 py-2.5 text-right">
                          {isEditing(a.id, "cantidad") ? (
                            <input type="number" autoFocus defaultValue={a.cantidad} min={1}
                              disabled={savingInline === a.id}
                              className={`${inlineCls} text-white w-16`}
                              onBlur={ev => { const v = parseInt(ev.target.value) || 1; if (v !== a.cantidad) patchActivo(a.id, "cantidad", v); stopEdit(); }}
                              onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                          ) : (
                            <button onClick={() => startEdit(a.id, "cantidad")}
                              className="inline-block bg-[#1a1a1a] text-gray-300 text-xs px-2.5 py-0.5 rounded-full hover:bg-[#2a2a2a] transition-colors tabular-nums">
                              {a.cantidad}
                            </button>
                          )}
                        </td>
                        {/* Valor adquisición — click to edit */}
                        <td className="px-4 py-2.5 text-right">
                          {isEditing(a.id, "valorAdquisicion") ? (
                            <input type="number" autoFocus defaultValue={a.valorAdquisicion || ""} min={0} placeholder="0"
                              disabled={savingInline === a.id}
                              className={`${inlineCls} text-[#B3985B]`}
                              onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v !== a.valorAdquisicion) patchActivo(a.id, "valorAdquisicion", v); stopEdit(); }}
                              onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                          ) : (
                            <button onClick={() => startEdit(a.id, "valorAdquisicion")}
                              className="text-[#B3985B] font-medium hover:opacity-75 transition-opacity tabular-nums">
                              {a.valorAdquisicion > 0 ? fmx(a.valorAdquisicion) : <span className="text-[#333]">—</span>}
                            </button>
                          )}
                        </td>
                        {/* Valor actual — click to edit */}
                        <td className="px-4 py-2.5 text-right">
                          {isEditing(a.id, "valorActual") ? (
                            <input type="number" autoFocus defaultValue={a.valorActual || ""} min={0} placeholder="0"
                              disabled={savingInline === a.id}
                              className={`${inlineCls} text-blue-400`}
                              onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v !== a.valorActual) patchActivo(a.id, "valorActual", v); stopEdit(); }}
                              onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") stopEdit(); }} />
                          ) : (
                            <button onClick={() => startEdit(a.id, "valorActual")}
                              className="text-blue-400 font-medium hover:opacity-75 transition-opacity tabular-nums">
                              {a.valorActual > 0 ? fmx(a.valorActual) : <span className="text-[#333]">—</span>}
                            </button>
                          )}
                        </td>
                        {/* Depreciación (calculado) */}
                        <td className="px-4 py-2.5 text-right">
                          {dep != null ? (
                            <span className={`font-medium tabular-nums ${
                              dep >= 60 ? "text-red-400" : dep >= 30 ? "text-yellow-400" : "text-emerald-400"
                            }`}>{pct(dep)}</span>
                          ) : <span className="text-[#333]">—</span>}
                        </td>
                        {/* Acciones */}
                        <td className="px-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => abrirModalOf(a)}
                              className="text-[#555] hover:text-[#B3985B] transition-colors p-1" title="Editar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => eliminarOficina(a.id)}
                              className="text-[#333] hover:text-red-500 transition-colors p-1" title="Eliminar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
          {/* Footer de totales */}
          <div className="border-t border-[#222] px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-[#0d0d0d]">
            <p className="text-[#6b7280] text-xs">{activosOficina.length} activos de oficina</p>
            <div className="flex items-center gap-8 text-sm">
              <div className="text-right">
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor adquisición</p>
                <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmx(activosOficina.reduce((s, a) => s + a.valorAdquisicion, 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor actual</p>
                <p className="text-blue-400 font-bold text-base tabular-nums">{fmx(activosOficina.reduce((s, a) => s + a.valorActual, 0))}</p>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* ── ACTIVOS INTANGIBLES ── */
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Total intangibles" value={String(activosIntangibles.length)} sub="Software y propiedad intelectual" />
            <KpiCard label="Valor total" color="text-[#B3985B]"
              value={fmx(activosIntangibles.reduce((s, a) => s + (a.valorActual > 0 ? a.valorActual : a.valorAdquisicion), 0))}
              sub="Valuación estimada" />
            <KpiCard label="Valor adquisición"
              value={fmx(activosIntangibles.reduce((s, a) => s + a.valorAdquisicion, 0))}
              sub="Costo histórico" />
          </div>

          <div className="ms-table-wrapper">
            <div className="px-4 py-3 border-b border-[#1e1e1e]">
              <p className="text-white text-sm font-medium">Activos Intangibles</p>
              <p className="text-[#555] text-xs mt-0.5">Software propietario y propiedad intelectual de Mainstage Pro</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2.5 font-medium">Activo</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Descripción</th>
                  <th className="text-right px-4 py-2.5 font-medium w-36">Valor adq.</th>
                  <th className="text-right px-4 py-2.5 font-medium w-36">Valor actual</th>
                </tr>
              </thead>
              <tbody>
                {activosIntangibles.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-[#333] text-sm py-10">Sin activos intangibles registrados.</td></tr>
                ) : activosIntangibles.map(a => (
                  <tr key={a.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{a.nombre}</p>
                      {a.notas && <p className="text-[#444] text-[10px] mt-0.5">{a.notas}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#6b7280]">{a.descripcion ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#B3985B] font-medium tabular-nums">
                        {a.valorAdquisicion > 0 ? fmx(a.valorAdquisicion) : <span className="text-[#333]">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-blue-400 font-medium tabular-nums">
                        {a.valorActual > 0 ? fmx(a.valorActual) : <span className="text-[#333]">—</span>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-[#222] px-4 py-3 flex items-center justify-between bg-[#0d0d0d]">
              <p className="text-[#6b7280] text-xs">{activosIntangibles.length} activos intangibles</p>
              <div className="text-right">
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor total</p>
                <p className="text-[#B3985B] font-bold text-base tabular-nums">
                  {fmx(activosIntangibles.reduce((s, a) => s + (a.valorActual > 0 ? a.valorActual : a.valorAdquisicion), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

      )}
    </div>
  );
}
