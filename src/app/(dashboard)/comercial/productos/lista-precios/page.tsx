"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { getEquipoDisplayName, getEquipoMarcaModelo } from "@/lib/equipoNombre";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  cantidadTotal: number;
  precioRenta: number;
  costoProveedor: number | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; empresa: string | null } | null;
  imagenUrl: string | null;
  noCotizable: boolean;
  proveedoresPrecios: { precio: number; proveedor: { id: string; nombre: string; empresa: string | null } }[];
};

type Accesorio = {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  tipoConteo: string;
  cantidad: number | null;
  precioRenta: number | null;
  categoria: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string; empresa: string | null } | null;
};

type Categoria = { id: string; nombre: string; orden: number };
type Vista = "EQUIPOS" | "ACCESORIOS";
type Origen = "TODOS" | "PROPIO" | "EXTERNO";

const fmx = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const SIN_CAT = "__sin-categoria__";

export default function ListaPreciosPage() {
  const toast = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [vista, setVista] = useState<Vista>("EQUIPOS");
  const [origen, setOrigen] = useState<Origen>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [soloSinPrecio, setSoloSinPrecio] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventario/maestro", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/accesorios", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/auth/me").then(r => r.ok ? r.json() : { user: null }),
    ])
      .then(([inv, acc, me]) => {
        setEquipos(inv.equipos ?? []);
        setCategorias(inv.categorias ?? []);
        setAccesorios(acc.accesorios ?? []);
        setEsAdmin(me?.user?.role === "ADMIN");
      })
      .finally(() => setLoading(false));
  }, []);

  const propios = equipos.filter(e => e.tipo === "PROPIO");
  const externos = equipos.filter(e => e.tipo === "EXTERNO");
  const sinPrecioEquipos = equipos.filter(e => !e.precioRenta || e.precioRenta <= 0).length;
  const sinPrecioAcc = accesorios.filter(a => !a.precioRenta || a.precioRenta <= 0).length;

  const q = busqueda.trim().toLowerCase();

  const equiposFiltrados = useMemo(() => equipos.filter(e => {
    if (origen !== "TODOS" && e.tipo !== origen) return false;
    if (soloSinPrecio && e.precioRenta > 0) return false;
    if (!q) return true;
    return [e.descripcion, e.marca, e.modelo, e.categoria.nombre, e.proveedorDefault?.nombre, e.proveedorDefault?.empresa]
      .some(v => v?.toLowerCase().includes(q));
  }), [equipos, origen, soloSinPrecio, q]);

  const accesoriosFiltrados = useMemo(() => accesorios.filter(a => {
    const tipo = a.proveedor ? "EXTERNO" : "PROPIO";
    if (origen !== "TODOS" && tipo !== origen) return false;
    if (soloSinPrecio && (a.precioRenta ?? 0) > 0) return false;
    if (!q) return true;
    return [a.nombre, a.marca, a.modelo, a.categoria?.nombre, a.proveedor?.nombre, a.proveedor?.empresa]
      .some(v => v?.toLowerCase().includes(q));
  }), [accesorios, origen, soloSinPrecio, q]);

  const equiposPorCategoria = useMemo(() =>
    categorias
      .map(cat => ({ id: cat.id, nombre: cat.nombre, items: equiposFiltrados.filter(e => e.categoria.id === cat.id) }))
      .filter(g => g.items.length > 0),
    [categorias, equiposFiltrados]
  );

  const accesoriosPorCategoria = useMemo(() => {
    const grupos = new Map<string, { id: string; nombre: string; items: Accesorio[] }>();
    accesoriosFiltrados.forEach(a => {
      const id = a.categoria?.id ?? SIN_CAT;
      if (!grupos.has(id)) grupos.set(id, { id, nombre: a.categoria?.nombre ?? "Sin categoría", items: [] });
      grupos.get(id)!.items.push(a);
    });
    return Array.from(grupos.values()).sort((a, b) =>
      a.id === SIN_CAT ? 1 : b.id === SIN_CAT ? -1 : a.nombre.localeCompare(b.nombre)
    );
  }, [accesoriosFiltrados]);

  async function guardarPrecio(tipo: Vista, id: string, precio: number) {
    setGuardando(id);
    const url = tipo === "EQUIPOS" ? `/api/equipos/${id}` : `/api/accesorios/${id}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precioRenta: precio }),
      });
      if (!res.ok) { toast.error("No se pudo guardar el precio"); return; }
      if (tipo === "EQUIPOS") setEquipos(prev => prev.map(e => e.id === id ? { ...e, precioRenta: precio } : e));
      else setAccesorios(prev => prev.map(a => a.id === id ? { ...a, precioRenta: precio } : a));
    } finally {
      setGuardando(null);
    }
  }

  function PrecioCell({ tipo, id, precio }: { tipo: Vista; id: string; precio: number }) {
    if (esAdmin && editando === id) {
      return (
        <input type="number" autoFocus min={0} defaultValue={precio}
          disabled={guardando === id}
          className="ms-input-inline text-right text-[#B3985B] w-28"
          onBlur={ev => {
            const v = parseFloat(ev.target.value) || 0;
            if (v !== precio) guardarPrecio(tipo, id, v);
            setEditando(null);
          }}
          onKeyDown={ev => {
            if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
            if (ev.key === "Escape") setEditando(null);
          }} />
      );
    }
    const valor = precio > 0
      ? fmx(precio)
      : <span className={`italic font-normal ${esAdmin ? "text-amber-500/70" : "text-[#444]"}`}>sin precio</span>;
    if (!esAdmin) return <span className="font-semibold tabular-nums text-[#B3985B]">{valor}</span>;
    return (
      <button onClick={() => setEditando(id)}
        className="font-semibold tabular-nums text-[#B3985B] hover:opacity-75 transition-opacity">
        {valor}
      </button>
    );
  }

  function OrigenBadge({ proveedor }: { proveedor: string | null }) {
    if (!proveedor) return <span className="ms-badge ms-badge-gold">Propio</span>;
    return <span className="ms-badge ms-badge-blue" title={proveedor}>Ext · {proveedor}</span>;
  }

  const total = vista === "EQUIPOS" ? equiposFiltrados.length : accesoriosFiltrados.length;
  const grupos = vista === "EQUIPOS" ? equiposPorCategoria.length : accesoriosPorCategoria.length;
  const colSpanEquipos = esAdmin ? 6 : 4;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5">

      <div>
        <h1 className="ms-h1">Lista de precios de renta</h1>
        <p className="ms-subtitle mt-0.5">
          Precio unitario de renta de cada equipo y accesorio — el mismo que se usa al cotizar. Inventario propio y de subrenta.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="text-[10px] text-[#555] uppercase tracking-wider">Equipos propios</p>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{propios.length}</p>
          <p className="text-[10px] text-[#444] mt-0.5">inventario Mainstage</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] text-[#555] uppercase tracking-wider">Equipos externos</p>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{externos.length}</p>
          <p className="text-[10px] text-[#444] mt-0.5">subrenta con proveedor</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] text-[#555] uppercase tracking-wider">Accesorios</p>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{accesorios.length}</p>
          <p className="text-[10px] text-[#444] mt-0.5">catálogo cotizable</p>
        </div>
        <div className="ms-stat-card">
          <p className="text-[10px] text-[#555] uppercase tracking-wider">Sin precio</p>
          <p className={`text-xl font-bold tabular-nums mt-1 ${sinPrecioEquipos + sinPrecioAcc > 0 ? "text-amber-400" : "text-[#444]"}`}>
            {sinPrecioEquipos + sinPrecioAcc}
          </p>
          <p className="text-[10px] text-[#444] mt-0.5">entran en $0 al cotizar</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5">
          {([
            { key: "EQUIPOS", label: `Equipos (${equipos.length})` },
            { key: "ACCESORIOS", label: `Accesorios (${accesorios.length})` },
          ] as const).map(v => (
            <button key={v.key} onClick={() => { setVista(v.key); setEditando(null); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${vista === v.key ? "bg-[#B3985B] text-black font-medium" : "text-[#6b7280] hover:text-white"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex bg-[#111] border border-[#1e1e1e] rounded-lg p-0.5">
          {([
            { key: "TODOS", label: "Todos" },
            { key: "PROPIO", label: "Propios" },
            { key: "EXTERNO", label: "Externos" },
          ] as const).map(o => (
            <button key={o.key} onClick={() => setOrigen(o.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${origen === o.key ? "bg-[#1f1f1f] text-white font-medium" : "text-[#6b7280] hover:text-white"}`}>
              {o.label}
            </button>
          ))}
        </div>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, marca, categoría o proveedor..."
          className="ms-input-search flex-1 min-w-[220px]" />
        <button onClick={() => setSoloSinPrecio(v => !v)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${soloSinPrecio ? "border-amber-800/50 bg-amber-900/20 text-amber-400" : "border-[#1e1e1e] text-[#6b7280] hover:text-white"}`}>
          Solo sin precio
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-lg animate-pulse" />)}
        </div>
      ) : total === 0 ? (
        <p className="text-center text-[#333] text-sm py-12">No hay resultados con los filtros actuales.</p>
      ) : (
        <div className="ms-table-wrapper">
          <div className="overflow-x-auto">
            {vista === "EQUIPOS" ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                    <th className="text-left px-4 py-2.5 font-medium">Equipo</th>
                    <th className="text-center px-4 py-2.5 font-medium w-40">Origen</th>
                    <th className="text-right px-4 py-2.5 font-medium w-16">Cant.</th>
                    {esAdmin && <th className="text-right px-4 py-2.5 font-medium w-32">Costo proveedor</th>}
                    <th className="text-right px-4 py-2.5 font-medium w-36">Precio de renta</th>
                    {esAdmin && <th className="text-right px-4 py-2.5 font-medium w-24">Margen</th>}
                  </tr>
                </thead>
                <tbody>
                  {equiposPorCategoria.map(g => (
                    <Fragment key={g.id}>
                      <tr className="border-t border-[#1a1a1a]">
                        <td colSpan={colSpanEquipos} className="px-4 py-1.5 bg-[#0d0d0d]">
                          <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{g.nombre}</span>
                          <span className="text-[#333] text-[10px] ml-2">({g.items.length})</span>
                        </td>
                      </tr>
                      {g.items.map(e => {
                        const proveedor = e.tipo === "EXTERNO"
                          ? (e.proveedorDefault?.empresa || e.proveedorDefault?.nombre || "Externo")
                          : null;
                        const costo = e.costoProveedor ?? e.proveedoresPrecios[0]?.precio ?? null;
                        const margen = costo != null && costo > 0 && e.precioRenta > 0
                          ? ((e.precioRenta - costo) / e.precioRenta) * 100
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
                                  <p className="text-white font-medium">{getEquipoDisplayName(e)}</p>
                                  <div className="flex items-center gap-2">
                                    {getEquipoMarcaModelo(e) && <p className="text-[#555] text-[10px]">{e.descripcion}</p>}
                                    {e.noCotizable && <span className="ms-badge ms-badge-gray">No cotizable</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center"><OrigenBadge proveedor={proveedor} /></td>
                            <td className="px-4 py-2.5 text-right text-[#9ca3af] tabular-nums">{e.cantidadTotal}</td>
                            {esAdmin && (
                              <td className="px-4 py-2.5 text-right text-[#6b7280] tabular-nums">
                                {costo != null ? fmx(costo) : <span className="text-[#333]">—</span>}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-right">
                              <PrecioCell tipo="EQUIPOS" id={e.id} precio={e.precioRenta} />
                            </td>
                            {esAdmin && (
                              <td className="px-4 py-2.5 text-right">
                                {margen != null ? (
                                  <span className={`font-medium tabular-nums ${margen >= 40 ? "text-emerald-400" : margen >= 20 ? "text-yellow-400" : "text-red-400"}`}>
                                    {margen.toFixed(0)}%
                                  </span>
                                ) : <span className="text-[#333]">—</span>}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                    <th className="text-left px-4 py-2.5 font-medium">Accesorio</th>
                    <th className="text-center px-4 py-2.5 font-medium w-40">Origen</th>
                    <th className="text-right px-4 py-2.5 font-medium w-16">Cant.</th>
                    <th className="text-right px-4 py-2.5 font-medium w-36">Precio de renta</th>
                  </tr>
                </thead>
                <tbody>
                  {accesoriosPorCategoria.map(g => (
                    <Fragment key={g.id}>
                      <tr className="border-t border-[#1a1a1a]">
                        <td colSpan={4} className="px-4 py-1.5 bg-[#0d0d0d]">
                          <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">{g.nombre}</span>
                          <span className="text-[#333] text-[10px] ml-2">({g.items.length})</span>
                        </td>
                      </tr>
                      {g.items.map(a => (
                        <tr key={a.id} className="border-t border-[#161616] hover:bg-[#0d0d0d] transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="text-white font-medium">{a.nombre}</p>
                            {(a.marca || a.modelo) && (
                              <p className="text-[#555] text-[10px]">{[a.marca, a.modelo].filter(Boolean).join(" · ")}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <OrigenBadge proveedor={a.proveedor ? (a.proveedor.empresa || a.proveedor.nombre) : null} />
                          </td>
                          <td className="px-4 py-2.5 text-right text-[#9ca3af] tabular-nums">
                            {a.tipoConteo === "cuantificable" ? (a.cantidad ?? 0) : <span className="text-[#333]">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <PrecioCell tipo="ACCESORIOS" id={a.id} precio={a.precioRenta ?? 0} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="border-t border-[#222] px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0d0d0d]">
            <p className="text-[#6b7280] text-xs">{total} {vista === "EQUIPOS" ? "equipos" : "accesorios"} · {grupos} categorías</p>
            <p className="text-[10px] text-[#444]">
              {esAdmin ? "Haz clic en un precio para editarlo." : "Solo administración puede modificar precios."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
