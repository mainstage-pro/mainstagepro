"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  estado: string;
  activo: boolean;
  cantidadTotal: number;
  precioRenta: number;
  costoProveedor: number | null;
  costoInternoEstimado: number | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  imagenUrl: string | null;
  notas: string | null;
  amperajeRequerido: number | null;
  voltajeRequerido: number | null;
  _count: { accesorios: number };
};

type Categoria = { id: string; nombre: string; orden: number };
type Proveedor = { id: string; nombre: string; empresa: string | null };

type Kpis = {
  totalEquipos: number;
  totalPropios: number;
  totalExternos: number;
  valorTotalActivo: number;
  potencialRentaMensual: number;
};

type Form = {
  descripcion: string; marca: string; modelo: string; tipo: string;
  categoriaId: string; cantidadTotal: string; estado: string;
  precioRenta: string; costoProveedor: string; costoInternoEstimado: string;
  proveedorDefaultId: string; notas: string;
  amperajeRequerido: string; voltajeRequerido: string;
};

const FORM_EMPTY: Form = {
  descripcion: "", marca: "", modelo: "", tipo: "PROPIO",
  categoriaId: "", cantidadTotal: "1", estado: "ACTIVO",
  precioRenta: "0", costoProveedor: "", costoInternoEstimado: "",
  proveedorDefaultId: "", notas: "",
  amperajeRequerido: "", voltajeRequerido: "",
};

function fmx(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/20 text-green-400",
  EN_MANTENIMIENTO: "bg-yellow-900/20 text-yellow-400",
  DADO_DE_BAJA: "bg-red-900/20 text-red-400",
};
const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo", EN_MANTENIMIENTO: "En mantenimiento", DADO_DE_BAJA: "Dado de baja",
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50 ${className}`} />
  );
}

export default function InventarioMaestroPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  const [filtroTipo, setFiltroTipo] = useState<"" | "PROPIO" | "EXTERNO">("");
  const [filtroEstado, setFiltroEstado] = useState<"" | "ACTIVO" | "EN_MANTENIMIENTO" | "DADO_DE_BAJA">("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroInactivos, setFiltroInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [panel, setPanel] = useState<"nuevo" | string | null>(null); // "nuevo" | equipoId | null
  const [form, setForm] = useState<Form>(FORM_EMPTY);
  const [imagen, setImagen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filtroTipo) qs.set("tipo", filtroTipo);
    if (filtroEstado) qs.set("estado", filtroEstado);
    if (filtroCategoria) qs.set("categoriaId", filtroCategoria);
    if (filtroInactivos) qs.set("inactivos", "true");

    const [mRes, provRes] = await Promise.all([
      fetch(`/api/inventario/maestro?${qs}`),
      fetch("/api/proveedores"),
    ]);
    const [mData, provData] = await Promise.all([mRes.json(), provRes.json()]);
    setEquipos(mData.equipos ?? []);
    setCategorias(mData.categorias ?? []);
    setKpis(mData.kpis ?? null);
    setProveedores(provData.proveedores ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filtroTipo, filtroEstado, filtroCategoria, filtroInactivos]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrirNuevo() {
    setForm({ ...FORM_EMPTY });
    setImagen(null);
    setPanel("nuevo");
  }

  function abrirEdit(e: Equipo) {
    setForm({
      descripcion: e.descripcion,
      marca: e.marca ?? "", modelo: e.modelo ?? "",
      tipo: e.tipo, categoriaId: e.categoria.id,
      cantidadTotal: String(e.cantidadTotal),
      estado: e.estado,
      precioRenta: String(e.precioRenta),
      costoProveedor: e.costoProveedor != null ? String(e.costoProveedor) : "",
      costoInternoEstimado: e.costoInternoEstimado != null ? String(e.costoInternoEstimado) : "",
      proveedorDefaultId: e.proveedorDefault?.id ?? "",
      notas: e.notas ?? "",
      amperajeRequerido: e.amperajeRequerido != null ? String(e.amperajeRequerido) : "",
      voltajeRequerido: e.voltajeRequerido != null ? String(e.voltajeRequerido) : "",
    });
    setImagen(null);
    setPanel(e.id);
  }

  function cerrarPanel() { setPanel(null); setImagen(null); }

  async function handleImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagen(await compressImage(file));
  }

  async function guardar() {
    if (!form.descripcion || !form.categoriaId) {
      toast.error("Descripción y categoría son requeridos");
      return;
    }
    setSaving(true);
    const body = {
      descripcion: form.descripcion,
      marca: form.marca || null, modelo: form.modelo || null,
      tipo: form.tipo, categoriaId: form.categoriaId,
      cantidadTotal: parseInt(form.cantidadTotal) || 1,
      estado: form.estado,
      precioRenta: form.precioRenta !== "" ? parseFloat(form.precioRenta) : 0,
      costoProveedor: form.costoProveedor !== "" ? form.costoProveedor : null,
      costoInternoEstimado: form.costoInternoEstimado !== "" ? form.costoInternoEstimado : null,
      proveedorDefaultId: form.proveedorDefaultId || null,
      notas: form.notas || null,
      amperajeRequerido: form.amperajeRequerido !== "" ? form.amperajeRequerido : null,
      voltajeRequerido: form.voltajeRequerido !== "" ? form.voltajeRequerido : null,
      ...(imagen !== null ? { imagenUrl: imagen } : {}),
    };

    const url = panel === "nuevo" ? "/api/equipos" : `/api/equipos/${panel}`;
    const method = panel === "nuevo" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    toast.success(panel === "nuevo" ? "Equipo creado" : "Equipo actualizado");
    cerrarPanel();
    await load();
    setSaving(false);
  }

  async function eliminar(e: Equipo) {
    const ok = await confirm({
      message: `¿Eliminar permanentemente "${e.descripcion}"? Esta acción no se puede deshacer.`,
      danger: true, confirmText: "Eliminar",
    });
    if (!ok) return;
    setEliminando(e.id);
    const res = await fetch(`/api/equipos/${e.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.error ?? "No se pudo eliminar"); setEliminando(null); return; }
    toast.success("Equipo eliminado");
    if (panel === e.id) cerrarPanel();
    setEquipos(prev => prev.filter(x => x.id !== e.id));
    setEliminando(null);
  }

  const equiposFiltrados = useMemo(() => {
    if (!busqueda.trim()) return equipos;
    const q = busqueda.toLowerCase();
    return equipos.filter(e =>
      e.descripcion.toLowerCase().includes(q) ||
      (e.marca ?? "").toLowerCase().includes(q) ||
      (e.modelo ?? "").toLowerCase().includes(q) ||
      e.categoria.nombre.toLowerCase().includes(q)
    );
  }, [equipos, busqueda]);

  const valorTotal = useMemo(() =>
    equiposFiltrados.filter(e => e.tipo === "PROPIO")
      .reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0),
    [equiposFiltrados]
  );

  // ── Form panel ──────────────────────────────────────────────────────────────
  function FormPanel() {
    const equipoActual = panel !== "nuevo" ? equipos.find(e => e.id === panel) : null;
    return (
      <div className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#B3985B] font-semibold text-sm">
            {panel === "nuevo" ? "Nuevo equipo" : `Editando: ${equipoActual?.descripcion ?? ""}`}
          </h2>
          <button onClick={cerrarPanel} className="text-[#555] hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Col 1 — descripción + imagen */}
          <div className="space-y-3">
            <FieldGroup label="Descripción *">
              <FInput value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Ej. Subwoofer 18'' RCF" />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup label="Marca">
                <FInput value={form.marca} onChange={v => setForm(p => ({ ...p, marca: v }))} placeholder="RCF" />
              </FieldGroup>
              <FieldGroup label="Modelo">
                <FInput value={form.modelo} onChange={v => setForm(p => ({ ...p, modelo: v }))} placeholder="SUB 9004-AS" />
              </FieldGroup>
            </div>
            <FieldGroup label="Imagen">
              <div className="flex items-center gap-3">
                {(imagen || equipoActual?.imagenUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagen ?? equipoActual?.imagenUrl ?? ""} alt="" className="w-12 h-12 object-contain rounded bg-[#111] p-1 shrink-0" />
                )}
                <div>
                  <input ref={imgRef} type="file" accept="image/*" onChange={handleImagen} className="hidden" />
                  <button onClick={() => imgRef.current?.click()}
                    className="text-xs px-3 py-1.5 border border-[#333] rounded-lg text-[#9ca3af] hover:text-white hover:border-[#B3985B]/50 transition-colors">
                    {imagen || equipoActual?.imagenUrl ? "Cambiar foto" : "Subir foto"}
                  </button>
                  {imagen && <p className="text-[10px] text-[#B3985B] mt-1">Nueva imagen lista</p>}
                </div>
              </div>
            </FieldGroup>
            <FieldGroup label="Notas">
              <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50 resize-none"
                placeholder="Notas internas..." />
            </FieldGroup>
          </div>

          {/* Col 2 — clasificación */}
          <div className="space-y-3">
            <FieldGroup label="Categoría *">
              <select value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
                <option value="">— Selecciona —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup label="Tipo">
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
                  <option value="PROPIO">Propio</option>
                  <option value="EXTERNO">Externo</option>
                </select>
              </FieldGroup>
              <FieldGroup label="Estado">
                <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_MANTENIMIENTO">En mantenimiento</option>
                  <option value="DADO_DE_BAJA">Dado de baja</option>
                </select>
              </FieldGroup>
            </div>
            <FieldGroup label="Cantidad total">
              <FInput type="number" value={form.cantidadTotal} onChange={v => setForm(p => ({ ...p, cantidadTotal: v }))} />
            </FieldGroup>
            <FieldGroup label="Proveedor (externo)">
              <select value={form.proveedorDefaultId} onChange={e => setForm(p => ({ ...p, proveedorDefaultId: e.target.value }))}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50">
                <option value="">— Ninguno —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.empresa ? ` · ${p.empresa}` : ""}</option>)}
              </select>
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup label="Amperaje (A)">
                <FInput type="number" value={form.amperajeRequerido} onChange={v => setForm(p => ({ ...p, amperajeRequerido: v }))} placeholder="—" />
              </FieldGroup>
              <FieldGroup label="Voltaje (V)">
                <FInput type="number" value={form.voltajeRequerido} onChange={v => setForm(p => ({ ...p, voltajeRequerido: v }))} placeholder="—" />
              </FieldGroup>
            </div>
          </div>

          {/* Col 3 — financiero */}
          <div className="space-y-3">
            <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-4 space-y-3">
              <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">Información financiera</p>
              <FieldGroup label="Precio de renta (al cliente)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                  <FInput type="number" value={form.precioRenta} onChange={v => setForm(p => ({ ...p, precioRenta: v }))} className="pl-7" placeholder="0" />
                </div>
                <p className="text-[10px] text-[#555] mt-1">Precio que ve el cliente en cotizaciones</p>
              </FieldGroup>
              <FieldGroup label="Costo proveedor">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                  <FInput type="number" value={form.costoProveedor} onChange={v => setForm(p => ({ ...p, costoProveedor: v }))} className="pl-7" placeholder="—" />
                </div>
                <p className="text-[10px] text-[#555] mt-1">Lo que cobramos al proveedor (equipo externo)</p>
              </FieldGroup>
              <FieldGroup label="Valor del activo">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">$</span>
                  <FInput type="number" value={form.costoInternoEstimado} onChange={v => setForm(p => ({ ...p, costoInternoEstimado: v }))} className="pl-7" placeholder="—" />
                </div>
                <p className="text-[10px] text-[#555] mt-1">Costo de adquisición (equipo propio)</p>
              </FieldGroup>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
          <button onClick={guardar} disabled={saving || !form.descripcion || !form.categoriaId}
            className="px-5 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-semibold disabled:opacity-40 hover:bg-[#c4aa6b] transition-colors">
            {saving ? "Guardando..." : panel === "nuevo" ? "Crear equipo" : "Guardar cambios"}
          </button>
          <button onClick={cerrarPanel} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventario maestro</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Fuente de verdad · precios, costos y valor del activo</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-[#B3985B] hover:bg-[#c4aa6b] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo equipo
        </button>
      </div>

      {/* Panel nuevo */}
      {panel === "nuevo" && <FormPanel />}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Total equipos</p>
            <p className="text-white text-2xl font-semibold">{kpis.totalEquipos}</p>
            <p className="text-[#444] text-[10px] mt-0.5">{kpis.totalPropios} propios · {kpis.totalExternos} externos</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Valor del inventario</p>
            <p className="text-[#B3985B] text-2xl font-semibold">{fmx(kpis.valorTotalActivo)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Costo activo equipos propios</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Renta mensual potencial</p>
            <p className="text-green-400 text-2xl font-semibold">{fmx(kpis.potencialRentaMensual)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Suma precio renta × cantidad</p>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-1">Valor filtrado</p>
            <p className="text-white text-2xl font-semibold">{fmx(valorTotal)}</p>
            <p className="text-[#444] text-[10px] mt-0.5">Propios en vista actual</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar equipo..."
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#B3985B]/40 w-44" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Tipo: todos</option>
          <option value="PROPIO">Propios</option>
          <option value="EXTERNO">Externos</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Estado: todos</option>
          <option value="ACTIVO">Activo</option>
          <option value="EN_MANTENIMIENTO">En mantenimiento</option>
          <option value="DADO_DE_BAJA">Dado de baja</option>
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] focus:outline-none">
          <option value="">Categoría: todas</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
          <input type="checkbox" checked={filtroInactivos} onChange={e => setFiltroInactivos(e.target.checked)} className="accent-[#B3985B]" />
          Incluir inactivos
        </label>
        <span className="ml-auto text-xs text-[#444]">{equiposFiltrados.length} equipos</span>
      </div>

      {/* Panel editar (encima de tabla) */}
      {panel !== null && panel !== "nuevo" && <FormPanel />}

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="text-center py-16 text-[#333]">
          <p className="text-sm">Sin equipos con los filtros actuales.</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-3 font-medium">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoría</th>
                  <th className="text-center px-3 py-3 font-medium">Tipo</th>
                  <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">Estado</th>
                  <th className="text-right px-3 py-3 font-medium">Cant.</th>
                  <th className="text-right px-4 py-3 font-medium">Precio renta</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Valor activo</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Valor total</th>
                  <th className="text-center px-3 py-3 font-medium hidden xl:table-cell">Acc.</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161616]">
                {equiposFiltrados.map(e => {
                  const valorActivo = e.costoInternoEstimado ?? null;
                  const valorFilaTotal = valorActivo != null ? valorActivo * e.cantidadTotal : null;
                  const isEditing = panel === e.id;
                  return (
                    <tr key={e.id} className={`transition-colors group ${isEditing ? "bg-[#0d0d0d]" : "hover:bg-[#0d0d0d]"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {e.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.imagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-[#0a0a0a] p-0.5 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{e.descripcion}</p>
                            {(e.marca || e.modelo) && (
                              <p className="text-[#555] truncate">{[e.marca, e.modelo].filter(Boolean).join(" · ")}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">{e.categoria.nombre}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.tipo === "PROPIO" ? "bg-[#1a1a1a] text-[#6b7280]" : "bg-blue-900/20 text-blue-400"}`}>
                          {e.tipo === "PROPIO" ? "Propio" : "Externo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center hidden sm:table-cell">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ESTADO_BADGE[e.estado] ?? "bg-[#1a1a1a] text-[#6b7280]"}`}>
                          {ESTADO_LABEL[e.estado] ?? e.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-white font-medium">{e.cantidadTotal}</td>
                      <td className="px-4 py-3 text-right text-[#B3985B] font-medium">
                        {e.precioRenta === 0 ? <span className="text-[#444]">Incluye</span> : fmx(e.precioRenta)}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {valorActivo != null ? <span className="text-[#9ca3af]">{fmx(valorActivo)}</span> : <span className="text-[#333]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {valorFilaTotal != null ? <span className="text-white font-medium">{fmx(valorFilaTotal)}</span> : <span className="text-[#333]">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center hidden xl:table-cell">
                        {e._count.accesorios > 0 ? <span className="text-[#B3985B] font-medium">{e._count.accesorios}</span> : <span className="text-[#333]">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2">
                          <button onClick={() => isEditing ? cerrarPanel() : abrirEdit(e)}
                            className={`text-[10px] transition-colors ${isEditing ? "text-[#B3985B]" : "text-[#555] hover:text-[#B3985B]"}`}>
                            {isEditing ? "Cerrar ↑" : "Editar"}
                          </button>
                          <button onClick={() => eliminar(e)} disabled={eliminando === e.id}
                            className="text-[10px] text-[#333] hover:text-red-400 transition-colors disabled:opacity-50">
                            {eliminando === e.id ? "..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-[#1a1a1a] px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0d0d0d]">
            <p className="text-[#555] text-xs">{equiposFiltrados.length} equipos mostrados</p>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-right hidden lg:block">
                <p className="text-[#555]">Total valor del activo (vista)</p>
                <p className="text-[#B3985B] font-semibold">
                  {fmx(equiposFiltrados.reduce((s, e) => s + (e.costoInternoEstimado ?? 0) * e.cantidadTotal, 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#555]">Renta potencial (vista)</p>
                <p className="text-green-400 font-semibold">
                  {fmx(equiposFiltrados.reduce((s, e) => s + e.precioRenta * e.cantidadTotal, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
