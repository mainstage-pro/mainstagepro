"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/Toast";

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
const ACC_CAT_LABEL: Record<string, string> = { cable: "Cable", herramienta: "Herramienta", consumible: "Consumible", soporte: "Soporte", otro: "Otro", "sin-categoria": "Sin categor\u00eda" };
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
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[#444] text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

const inlineCls = "w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded text-right text-xs focus:outline-none focus:border-[#B3985B]/50 px-1.5 py-0.5 disabled:opacity-50";

type Tab = "resumen" | "produccion" | "accesorios" | "oficina";

export default function InventarioActivosPage() {
  const toast = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [activosOficina, setActivosOficina] = useState<HervamActivo[]>([]);
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
      setActivosOficina((dataOf.activos ?? []).filter((a: HervamActivo) => a.categoria === "OFICINA"));
      // Flatten accessories from all production equipment
      const flat: AccProduccion[] = [];
      for (const eq of (dataAcc.equipos ?? [])) {
        const eqNombre = [eq.marca, eq.modelo].filter(Boolean).join(" \u00b7 ") || eq.descripcion;
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
      const eqNombre = eq ? ([eq.marca, eq.modelo].filter(Boolean).join(" \u00b7 ") || eq.descripcion) : "";
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
    if (!confirm("\u00bfEliminar este accesorio de la biblioteca del equipo?")) return;
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
    if (!confirm("\u00bfEliminar este activo?")) return;
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
    { key: "produccion",  label: `Equipos de Producci\u00f3n (${equiposProd.length})` },
    { key: "accesorios",  label: `Accesorios de Producci\u00f3n (${accesoriosProd.length})` },
    { key: "oficina",     label: `Equipos de Oficina (${activosOficina.length})` },
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
        equipoNombre: [eq.marca, eq.modelo].filter(Boolean).join(" \u00b7 ") || eq.descripcion,
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

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario de Activos</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Gestión financiera del inventario · solo administración</p>
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
      <div className="flex flex-wrap gap-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
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

        /* ── REPORTE GENERAL ── */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Equipos de Producción" value={String(equiposProd.length)} sub={`${porCategoriaProd.length} categorías`} />
            <KpiCard label="Valor total del activo" value={fmx(valorTotalProd)} sub="Costo de adquisición" color="text-[#B3985B]" />
            <KpiCard label="Renta mensual potencial" value={fmx(rentaTotalProd)} sub="Precio renta × cantidad" color="text-emerald-400" />
            <KpiCard label="Rentabilidad anual" value={pct(rentabilidadProm)} sub="Renta × 12 / valor" color="text-blue-400" />
          </div>

          {/* Desglose por categoría */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e1e]">
              <p className="text-white text-sm font-medium">Desglose por categoría — Equipos de Producción</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                    <th className="text-left px-4 py-2.5 font-medium">Categoría</th>
                    <th className="text-right px-4 py-2.5 font-medium">Equipos</th>
                    <th className="text-right px-4 py-2.5 font-medium">Valor total</th>
                    <th className="text-right px-4 py-2.5 font-medium">% del total</th>
                    <th className="text-right px-4 py-2.5 font-medium">Renta mensual</th>
                    <th className="text-right px-4 py-2.5 font-medium">Rentabilidad anual</th>
                  </tr>
                </thead>
                <tbody>
                  {porCategoriaProd.map(({ cat, items }) => {
                    const catValor = items.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0);
                    const catRenta = items.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0);
                    const catPct = valorTotalProd > 0 ? (catValor / valorTotalProd) * 100 : 0;
                    const catRentabilidad = catValor > 0 ? (catRenta * 12 / catValor) * 100 : 0;
                    return (
                      <tr key={cat.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                        <td className="px-4 py-2.5 text-white font-medium">{cat.nombre}</td>
                        <td className="px-4 py-2.5 text-right text-[#9ca3af]">{items.length}</td>
                        <td className="px-4 py-2.5 text-right text-[#B3985B] font-semibold tabular-nums">{fmx(catValor)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                              <div className="h-full bg-[#B3985B] rounded-full" style={{ width: `${catPct}%` }} />
                            </div>
                            <span className="text-[#6b7280] tabular-nums">{pct(catPct)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 tabular-nums">{fmx(catRenta)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-medium tabular-nums ${catRentabilidad >= 30 ? "text-emerald-400" : catRentabilidad >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                            {pct(catRentabilidad)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#222] bg-[#0d0d0d]">
                    <td className="px-4 py-3 text-[#6b7280] text-xs font-semibold uppercase tracking-wider">TOTAL</td>
                    <td className="px-4 py-3 text-right text-white font-bold">{equiposProd.length}</td>
                    <td className="px-4 py-3 text-right text-[#B3985B] font-bold tabular-nums">{fmx(valorTotalProd)}</td>
                    <td className="px-4 py-3 text-right text-[#6b7280]">100%</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold tabular-nums">{fmx(rentaTotalProd)}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-bold">{pct(rentabilidadProm)}</td>
                  </tr>
                </tfoot>
              </table>
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
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                      <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                      <th className="text-right px-4 py-2.5 font-medium w-16">Cant.</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Valor unitario</th>
                      <th className="text-right px-4 py-2.5 font-medium w-36">Precio de renta</th>
                      <th className="text-right px-4 py-2.5 font-medium w-32">Rentabilidad</th>
                      <th className="text-center px-4 py-2.5 font-medium w-28">Propietario</th>
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
                            const esHervam = e.propietario === "HERVAM";
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
                                {/* Propietario toggle */}
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    disabled={savingInline === e.id}
                                    onClick={() => patchEquipo(e.id, "propietario", esHervam ? "MAINSTAGE" : "HERVAM")}
                                    title={`Click para cambiar a ${esHervam ? "MAINSTAGE" : "HERVAM"}`}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all disabled:opacity-50 ${
                                      esHervam
                                        ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                        : "bg-[#B3985B]/20 text-[#B3985B] hover:bg-[#B3985B]/30"
                                    }`}
                                  >
                                    {esHervam ? "HERVAM" : "Mainstage"}
                                  </button>
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
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Categor\u00eda</label>
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
                        className={`w-full bg-[#111] border rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none transition-colors ${
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
                          .map(eq => ({ id: eq.id, label: [eq.marca, eq.modelo].filter(Boolean).join(" \u00b7 ") || eq.descripcion, sub: eq.descripcion }))
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
            <KpiCard label="Equipos con accesorios" value={String(accesoriosPorEquipo.length)} sub={`de ${equiposProd.length} en producci\u00f3n`} color="text-[#B3985B]" />
            <KpiCard label="Sin accesorios" value={String(equiposSinAcc.length)} sub="Pendientes por registrar" color="text-red-400" />
            <KpiCard label="Cables" value={String(accesoriosProd.filter(a => a.categoria === "cable").length)} sub="Clasificados" color="text-blue-400" />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input value={busquedaAcc} onChange={e => setBusquedaAcc(e.target.value)} placeholder="Buscar accesorio o equipo..."
                className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-56" />
              <div className="flex gap-0.5 bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5">
                {(["equipo", "categoria"] as const).map(g => (
                  <button key={g} onClick={() => setAgruparAcc(g)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      agruparAcc === g ? "bg-[#B3985B] text-black" : "text-[#555] hover:text-white"
                    }`}>
                    {g === "equipo" ? "Por equipo" : "Por categor\u00eda"}
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
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
              <p className="text-[#555] text-sm">No hay equipos propios en el inventario.</p>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e] bg-[#0a0a0a]">
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Accesorio</th>
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{agruparAcc === "equipo" ? "Categor\u00eda" : "Equipo origen"}</th>
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

      ) : (

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
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Art\u00edculo *</label>
                    <input value={formOf.nombre} onChange={e => setFormOf(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Silla ergon\u00f3mica"
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                  {/* Row 2: marca + modelo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Marca</label>
                      <input value={formOf.marca} onChange={e => setFormOf(p => ({ ...p, marca: e.target.value }))}
                        placeholder="Ej: Sony"
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Modelo</label>
                      <input value={formOf.modelo} onChange={e => setFormOf(p => ({ ...p, modelo: e.target.value }))}
                        placeholder="Ej: A7 IV"
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
                    </div>
                  </div>
                  {/* Row 3: cantidad + valor adq + valor actual */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cantidad</label>
                      <input type="number" min="1" value={formOf.cantidad} onChange={e => setFormOf(p => ({ ...p, cantidad: e.target.value }))}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Valor adquisici\u00f3n</label>
                      <input type="number" value={formOf.valorAdquisicion} onChange={e => setFormOf(p => ({ ...p, valorAdquisicion: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Valor actual</label>
                      <input type="number" value={formOf.valorActual} onChange={e => setFormOf(p => ({ ...p, valorActual: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
                    </div>
                  </div>
                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notas</label>
                    <input value={formOf.notas} onChange={e => setFormOf(p => ({ ...p, notas: e.target.value }))}
                      placeholder="N\u00famero de serie, ubicaci\u00f3n, etc."
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/50" />
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
            <KpiCard label="Total art\u00edculos" value={String(activosOficina.length)} sub="Equipos de oficina" />
            <KpiCard label="Total unidades" value={String(activosOficina.reduce((s,a) => s + a.cantidad, 0))} sub="Conteo f\u00edsico" />
            <KpiCard label="Valor adquisici\u00f3n" color="text-[#B3985B]"
              value={fmx(activosOficina.reduce((s, a) => s + a.valorAdquisicion, 0))}
              sub="Costo hist\u00f3rico" />
            <KpiCard label="Valor actual" color="text-blue-400"
              value={fmx(activosOficina.reduce((s, a) => s + a.valorActual, 0))}
              sub="Valuaci\u00f3n estimada" />
          </div>

          {/* Barra superior: búsqueda + agregar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <input value={busquedaOf} onChange={e => setBusquedaOf(e.target.value)} placeholder="Buscar activo..."
              className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-56" />
            <button onClick={() => abrirModalOf()}
              className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a960] text-black text-sm font-semibold rounded-lg transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar activo
            </button>
          </div>

          {/* Tabla estilo inventario */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2.5 font-medium">Art\u00edculo</th>
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
                            ? <span className="text-[#6b7280]">{[a.marca, a.modelo].filter(Boolean).join(" \u00b7 ")}</span>
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
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor adquisici\u00f3n</p>
                <p className="text-[#B3985B] font-bold text-base tabular-nums">{fmx(activosOficina.reduce((s, a) => s + a.valorAdquisicion, 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Valor actual</p>
                <p className="text-blue-400 font-bold text-base tabular-nums">{fmx(activosOficina.reduce((s, a) => s + a.valorActual, 0))}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
