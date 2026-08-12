"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TipoEventoCell, type TipoEventoOpcion } from "@/components/TipoEventoCell";
import { useToast } from "@/components/Toast";

type Categoria = { id: string; nombre: string };
type Proveedor = { id: string; nombre: string; empresa?: string | null };
type EquipoLink = { equipo: { id: string; marca: string | null; modelo: string | null; descripcion: string } };

export type Accesorio = {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  descripcion: string | null;
  fotoUrl: string | null;
  estado: string;
  tipoConteo: string;
  cantidad: number | null;
  precioRenta: number | null;
  valorAdquisicion: number | null;
  tiposEvento: string | null;
  equipoOrigenId: string | null;
  categoria: Categoria | null;
  proveedor: Proveedor | null;
  equipoLinks: EquipoLink[];
};

function parseTE(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

async function compressImage(file: File, maxPx = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img error")); };
    img.src = url;
  });
}

const FORM_EMPTY = {
  nombre: "", marca: "", modelo: "", descripcion: "", categoriaId: "", proveedorId: "",
  tipoConteo: "default" as "default" | "cuantificable", cantidad: "", tiposEvento: [] as string[], fotoUrl: "" as string | null,
  equipoId: "",
};
type Form = typeof FORM_EMPTY;

export function AccesoriosTab({ categorias, catalogoTipos }: { categorias: Categoria[]; catalogoTipos: TipoEventoOpcion[] }) {
  const toast = useToast();
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fEvento, setFEvento] = useState("");
  const [soloSinPrecio, setSoloSinPrecio] = useState(false);
  const [agrupar, setAgrupar] = useState<"plana" | "equipo">("plana");
  const [modal, setModal] = useState<null | "nuevo" | string>(null); // "nuevo" | accesorioId
  const [form, setForm] = useState<Form>(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  // Migración equipo → accesorio
  const [migrarOpen, setMigrarOpen] = useState(false);
  const [equiposCand, setEquiposCand] = useState<{ id: string; marca: string | null; modelo: string | null; descripcion: string; imagenUrl: string | null; categoria: { nombre: string } | null }[]>([]);
  const [busqMig, setBusqMig] = useState("");
  const [migrando, setMigrando] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [aRes, pRes] = await Promise.all([
      fetch("/api/accesorios"),
      fetch("/api/proveedores").catch(() => null),
    ]);
    const aData = await aRes.json();
    setAccesorios(aData.accesorios ?? []);
    if (pRes?.ok) { const p = await pRes.json(); setProveedores(p.proveedores ?? []); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function cargarCandidatos() {
    const res = await fetch("/api/equipos?tipo=PROPIO").catch(() => null);
    if (res?.ok) { const d = await res.json(); setEquiposCand(d.equipos ?? []); }
  }
  function abrirMigrar() { setBusqMig(""); setMigrarOpen(true); cargarCandidatos(); }

  async function migrarEquipo(id: string) {
    setMigrando(id);
    try {
      const res = await fetch(`/api/equipos/${id}/migrar-accesorio`, { method: "POST" });
      if (!res.ok) { toast.error("No se pudo migrar"); return; }
      toast.success("Equipo promovido a accesorio");
      setEquiposCand(prev => prev.filter(e => e.id !== id));
      await load();
    } finally { setMigrando(null); }
  }

  async function revertirMigracion(a: Accesorio) {
    if (!a.equipoOrigenId) return;
    if (!confirm(`¿Revertir la migración de "${a.nombre}"? El equipo volverá a los selectores y el accesorio se desactivará.`)) return;
    const res = await fetch(`/api/equipos/${a.equipoOrigenId}/migrar-accesorio`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo revertir"); return; }
    toast.success("Migración revertida");
    await load();
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return accesorios.filter(a => {
      if (fEstado && a.estado !== fEstado) return false;
      if (fCategoria && a.categoria?.id !== fCategoria) return false;
      if (fEvento && !parseTE(a.tiposEvento).map(s => s.toUpperCase()).includes(fEvento.toUpperCase())) return false;
      if (soloSinPrecio && a.precioRenta != null && a.precioRenta > 0) return false;
      if (q) {
        const hay = [a.nombre, a.marca, a.modelo, a.descripcion].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [accesorios, busqueda, fEstado, fCategoria, fEvento, soloSinPrecio]);

  const porEquipo = useMemo(() => {
    const map = new Map<string, { equipoId: string; equipoNombre: string; items: Accesorio[] }>();
    const sinEquipo: Accesorio[] = [];
    for (const a of filtrados) {
      if (a.equipoLinks.length === 0) { sinEquipo.push(a); continue; }
      for (const l of a.equipoLinks) {
        const nombre = [l.equipo.marca, l.equipo.modelo].filter(Boolean).join(" · ") || l.equipo.descripcion;
        const g = map.get(l.equipo.id) ?? { equipoId: l.equipo.id, equipoNombre: nombre, items: [] };
        g.items.push(a);
        map.set(l.equipo.id, g);
      }
    }
    const grupos = Array.from(map.values()).sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre));
    return { grupos, sinEquipo };
  }, [filtrados]);

  const kpiCuant = accesorios.filter(a => a.tipoConteo === "cuantificable").length;
  const kpiDefault = accesorios.length - kpiCuant;
  const kpiSinPrecio = accesorios.filter(a => a.precioRenta == null || a.precioRenta <= 0).length;

  function abrirNuevo() { setForm(FORM_EMPTY); setModal("nuevo"); }
  function abrirEdit(a: Accesorio) {
    setForm({
      nombre: a.nombre, marca: a.marca ?? "", modelo: a.modelo ?? "", descripcion: a.descripcion ?? "",
      categoriaId: a.categoria?.id ?? "", proveedorId: a.proveedor?.id ?? "",
      tipoConteo: a.tipoConteo === "cuantificable" ? "cuantificable" : "default",
      cantidad: a.cantidad != null ? String(a.cantidad) : "", tiposEvento: parseTE(a.tiposEvento), fotoUrl: a.fotoUrl,
      equipoId: "",
    });
    setModal(a.id);
  }

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const b64 = await compressImage(file); setForm(f => ({ ...f, fotoUrl: b64 })); }
    catch { toast.error("No se pudo procesar la imagen"); }
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(), marca: form.marca.trim() || null, modelo: form.modelo.trim() || null,
        descripcion: form.descripcion.trim() || null, categoriaId: form.categoriaId || null,
        proveedorId: form.proveedorId || null, tipoConteo: form.tipoConteo,
        cantidad: form.tipoConteo === "cuantificable" ? (parseInt(form.cantidad || "0", 10) || 0) : null,
        tiposEvento: form.tiposEvento, fotoUrl: form.fotoUrl || null,
      };
      let res: Response;
      if (modal === "nuevo") {
        res = await fetch("/api/accesorios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, equipoId: form.equipoId || undefined }) });
      } else {
        res = await fetch(`/api/accesorios/${modal}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!res.ok) { toast.error("Error al guardar"); return; }
      toast.success(modal === "nuevo" ? "Accesorio creado" : "Guardado");
      setModal(null);
      await load();
    } finally { setSaving(false); }
  }

  async function eliminar(a: Accesorio) {
    if (!confirm(`¿Eliminar "${a.nombre}" del catálogo? (se conserva el histórico)`)) return;
    const res = await fetch(`/api/accesorios/${a.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar"); return; }
    setAccesorios(prev => prev.filter(x => x.id !== a.id));
    toast.success("Eliminado");
  }

  async function saveTiposEvento(id: string, next: string[]) {
    setAccesorios(prev => prev.map(a => a.id === id ? { ...a, tiposEvento: JSON.stringify(next) } : a));
    await fetch(`/api/accesorios/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tiposEvento: next }) });
  }

  function Foto({ url, alt }: { url: string | null; alt: string }) {
    if (url) return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity" onClick={() => setLightbox(url)} />
    );
    return <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0" />;
  }

  function Fila({ a }: { a: Accesorio }) {
    return (
      <tr className="border-t border-[#161616] transition-colors group hover:bg-[#0d0d0d]">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Foto url={a.fotoUrl} alt={a.nombre} />
            <div className="min-w-0">
              <p className="text-white font-medium truncate flex items-center gap-1.5">
                <span className="truncate">{(a.marca || a.modelo) ? [a.marca, a.modelo].filter(Boolean).join(" · ") : a.nombre}</span>
                {a.equipoOrigenId && <span className="text-[9px] px-1 py-0.5 rounded bg-[#1a1a1a] text-[#6b7280] shrink-0" title="Migrado desde inventario de equipos">desde equipo</span>}
              </p>
              <p className="text-[#555] text-xs truncate">{a.descripcion || a.nombre}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${a.estado === "activo" ? "bg-green-900/20 text-green-400" : "bg-[#1a1a1a] text-[#6b7280]"}`}>
            {a.estado === "activo" ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <TipoEventoCell value={parseTE(a.tiposEvento)} tipos={catalogoTipos} onSave={next => saveTiposEvento(a.id, next)} triggerId={`acc-te-${a.id}`} />
        </td>
        <td className="px-3 py-2.5 hidden md:table-cell">
          {a.proveedor
            ? <span className="text-[11px] text-white">{a.proveedor.nombre}</span>
            : <span className="text-[11px] text-[#B3985B] font-medium">Mainstage Pro</span>}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">
          {a.tipoConteo === "cuantificable" ? <span className="text-white font-medium">{a.cantidad ?? 0}</span> : <span className="text-[#333]">—</span>}
        </td>
        <td className="px-3 py-2.5 text-right hidden xl:table-cell">
          <Link href="/admin/valuacion" title="Editar precio en Activos" className="text-[11px] hover:text-[#B3985B] transition-colors">
            {a.precioRenta != null && a.precioRenta > 0 ? <span className="text-white">{fmx(a.precioRenta)}</span> : <span className="text-[#444] italic">sin precio</span>}
          </Link>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => abrirEdit(a)} className="text-[#555] hover:text-[#B3985B] p-1" title="Editar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            {a.equipoOrigenId && (
              <button onClick={() => revertirMigracion(a)} className="text-[#555] hover:text-amber-400 p-1" title="Revertir migración (devolver a equipos)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </button>
            )}
            <button onClick={() => eliminar(a)} className="text-[#333] hover:text-red-500 p-1" title="Eliminar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="ms-stat-card"><p className="text-[#6b7280] text-xs mb-1">Total accesorios</p><p className="text-white text-2xl font-semibold">{accesorios.length}</p></div>
        <div className="ms-stat-card"><p className="text-[#6b7280] text-xs mb-1">Cuantificables</p><p className="text-[#B3985B] text-2xl font-semibold">{kpiCuant}</p></div>
        <div className="ms-stat-card"><p className="text-[#6b7280] text-xs mb-1">Default</p><p className="text-gray-300 text-2xl font-semibold">{kpiDefault}</p></div>
        <div className="ms-stat-card"><p className="text-[#6b7280] text-xs mb-1">Sin precio de renta</p><p className="text-red-400 text-2xl font-semibold">{kpiSinPrecio}</p></div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-0.5 bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5">
          {(["plana", "equipo"] as const).map(g => (
            <button key={g} onClick={() => setAgrupar(g)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${agrupar === g ? "bg-[#B3985B] text-black" : "text-[#555] hover:text-white"}`}>
              {g === "plana" ? "Lista plana" : "Por equipo"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
            className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50 w-40" />
          <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="ms-card rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
            <option value="">Estado: todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} className="ms-card rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
            <option value="">Categoría: todas</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={fEvento} onChange={e => setFEvento(e.target.value)} className="ms-card rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
            <option value="">Tipo de evento: todos</option>
            {catalogoTipos.map(t => <option key={t.slug} value={t.slug.toUpperCase()}>{t.nombre}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
            <input type="checkbox" checked={soloSinPrecio} onChange={e => setSoloSinPrecio(e.target.checked)} className="accent-[#B3985B]" />
            Sin precio de renta
          </label>
          <button onClick={abrirMigrar} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] hover:border-[#B3985B]/40 text-[#9ca3af] hover:text-[#B3985B] text-sm rounded-lg transition-colors" title="Promover un equipo del inventario a accesorio">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
            Migrar equipo
          </button>
          <button onClick={abrirNuevo} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B3985B] hover:bg-[#c9a960] text-black text-sm font-semibold rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo accesorio
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]"><p className="text-sm">Sin accesorios con los filtros actuales.</p></div>
      ) : (
        <div className="ms-table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2.5 font-medium">Accesorio</th>
                  <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Estado</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Tipo de evento</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Proveedor</th>
                  <th className="text-right px-3 py-2.5 font-medium">Cant.</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden xl:table-cell">Precio renta</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {agrupar === "plana"
                  ? filtrados.map(a => <Fila key={a.id} a={a} />)
                  : (
                    <>
                      {porEquipo.grupos.map(g => (
                        <>
                          <tr key={`g-${g.equipoId}`} className="border-t border-[#1a1a1a]">
                            <td colSpan={7} className="px-4 py-1.5 bg-[#0d0d0d]">
                              <span className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold">{g.equipoNombre}</span>
                              <span className="text-[#333] text-[10px] ml-2">({g.items.length})</span>
                            </td>
                          </tr>
                          {g.items.map(a => <Fila key={`${g.equipoId}-${a.id}`} a={a} />)}
                        </>
                      ))}
                      {porEquipo.sinEquipo.length > 0 && (
                        <>
                          <tr className="border-t border-[#1a1a1a]">
                            <td colSpan={7} className="px-4 py-1.5 bg-[#0a0a0a]">
                              <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">Sin equipo padre</span>
                              <span className="text-[#333] text-[10px] ml-2">({porEquipo.sinEquipo.length})</span>
                            </td>
                          </tr>
                          {porEquipo.sinEquipo.map(a => <Fila key={`ne-${a.id}`} a={a} />)}
                        </>
                      )}
                    </>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal alta / edición */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
              <h2 className="text-white font-semibold">{modal === "nuevo" ? "Nuevo accesorio" : "Editar accesorio"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] flex items-center justify-center overflow-hidden shrink-0">
                  {form.fotoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={form.fotoUrl} alt="" className="w-full h-full object-contain p-1" />
                    : <svg className="w-6 h-6 text-[#2a2a2a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input ref={imgRef} type="file" accept="image/*" onChange={onFoto} className="hidden" />
                  <button onClick={() => imgRef.current?.click()} className="text-xs px-3 py-1.5 border border-[#2a2a2a] rounded-lg text-[#9ca3af] hover:text-white hover:border-[#B3985B]/40 transition-colors">Subir foto</button>
                  {form.fotoUrl && <button onClick={() => setForm(f => ({ ...f, fotoUrl: null }))} className="text-[10px] text-[#555] hover:text-red-400">Quitar</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Marca</label>
                  <input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
                </div>
                <div>
                  <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Modelo</label>
                  <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
              </div>
              <div>
                <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Descripción</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Categoría</label>
                  <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))} className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50">
                    <option value="">— Sin categoría —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Proveedor</label>
                  <select value={form.proveedorId} onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))} className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50">
                    <option value="">Mainstage Pro (propio)</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Conteo</label>
                  <div className="flex gap-0.5 bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5 mt-1">
                    {(["default", "cuantificable"] as const).map(tc => (
                      <button key={tc} onClick={() => setForm(f => ({ ...f, tipoConteo: tc }))}
                        className={`flex-1 px-2 py-1.5 rounded text-[11px] font-medium transition-all ${form.tipoConteo === tc ? "bg-[#B3985B] text-black" : "text-[#555] hover:text-white"}`}>
                        {tc === "default" ? "Default" : "Cuantificable"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Cantidad</label>
                  <input type="number" min={0} disabled={form.tipoConteo !== "cuantificable"} value={form.cantidad}
                    onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                    className="w-full mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50 disabled:opacity-40" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#6b7280] uppercase tracking-wider">Tipos de evento</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {catalogoTipos.map(t => {
                    const on = form.tiposEvento.includes(t.slug);
                    return (
                      <button key={t.slug} onClick={() => setForm(f => ({ ...f, tiposEvento: on ? f.tiposEvento.filter(s => s !== t.slug) : (f.tiposEvento.length >= 3 ? f.tiposEvento : [...f.tiposEvento, t.slug]) }))}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${on ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1e1e1e] text-[#6b7280] hover:text-white"}`}>
                        {t.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
              {modal === "nuevo" && (
                <div className="text-[10px] text-[#555]">El valor y precio de renta se capturan en Activos → Valuación.</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#1e1e1e] flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal migrar equipo → accesorio */}
      {migrarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl w-full max-w-xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
              <div>
                <h2 className="text-white font-semibold">Migrar equipo a accesorio</h2>
                <p className="text-[11px] text-[#6b7280] mt-0.5">El equipo se oculta de los selectores y se conserva su histórico. Reversible.</p>
              </div>
              <button onClick={() => setMigrarOpen(false)} className="text-gray-500 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-3 border-b border-[#1e1e1e]">
              <input value={busqMig} onChange={e => setBusqMig(e.target.value)} placeholder="Buscar equipo propio..."
                className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {(() => {
                const q = busqMig.trim().toLowerCase();
                const list = equiposCand.filter(e => !q || [e.marca, e.modelo, e.descripcion, e.categoria?.nombre].filter(Boolean).join(" ").toLowerCase().includes(q));
                if (list.length === 0) return <p className="text-center text-[#333] text-sm py-10">Sin equipos propios disponibles para migrar.</p>;
                return list.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111] transition-colors">
                    {e.imagenUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={e.imagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                      : <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{(e.marca || e.modelo) ? [e.marca, e.modelo].filter(Boolean).join(" · ") : e.descripcion}</p>
                      <p className="text-[#555] text-xs truncate">{e.categoria?.nombre ?? "Sin categoría"} · {e.descripcion}</p>
                    </div>
                    <button onClick={() => migrarEquipo(e.id)} disabled={migrando === e.id}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-50 text-black rounded-lg transition-colors">
                      {migrando === e.id ? "..." : "Migrar"}
                    </button>
                  </div>
                ));
              })()}
            </div>
            <div className="px-6 py-3 border-t border-[#1e1e1e] flex justify-end">
              <button onClick={() => setMigrarOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 cursor-zoom-out" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
