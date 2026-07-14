"use client";

import { useEffect, useMemo, useState } from "react";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EquipoPublico = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  imagenUrl: string | null;
  categoriaId: string;
};

export type CategoriaPublica = {
  id: string;
  nombre: string;
  equipos: EquipoPublico[];
};

/** Categoría o equipo agregado manualmente para este trato/descubrimiento.
 *  No existe en el inventario ni se registra en la BD — vive dentro del JSON. */
export type ExtraEquipo = {
  id: string;
  nombre: string;
  categoria?: string;
  cantidad?: number;
};

/** Producto/paquete armado seleccionado en el descubrimiento. */
export type SeleccionProducto = {
  id: string;
  cantidad?: number;
};

export type ProductoPublico = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  tiposEvento: string | null;
  imagenUrl: string | null;
  precioFinal: number;
  items: { cantidad: number; equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null } }[];
};

export type SeleccionEquipos = {
  /** IDs de CategoriaEquipo elegidas en el paso 1 */
  categorias: string[];
  /** IDs de Equipo específico seleccionado en el paso 2 */
  equipos: string[];
  /** equipoId → cantidad de piezas. Ausente = seleccionado sin cantidad definida */
  cantidades?: Record<string, number>;
  /** Equipos/categorías adicionales tecleados a mano (solo este trato) */
  extras?: ExtraEquipo[];
  /** Productos/paquetes armados seleccionados */
  productos?: SeleccionProducto[];
};

interface Props {
  value: SeleccionEquipos;
  onChange: (sel: SeleccionEquipos) => void;
  readOnly?: boolean;
  /** Notas técnicas / equipo faltante. Si se pasa onNotasChange, se muestra el campo tras las categorías. */
  notas?: string;
  onNotasChange?: (v: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function catEmoji(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes("microfon")) return "🎤";
  if (n.includes("in ear")) return "🎧";
  if (n.includes("consolas de audio") || n.includes("mixer")) return "🎚️";
  if (n.includes("dj") || n.includes("cdj")) return "💽";
  if (n.includes("audio")) return "🔊";
  if (n.includes("iluminaci")) return "💡";
  if (n.includes("video") || n.includes("pantalla") || n.includes("led")) return "📺";
  if (n.includes("estruct")) return "🏗️";
  if (n.includes("backline")) return "🎸";
  if (n.includes("efecto")) return "✨";
  if (n.includes("pista")) return "💃";
  if (n.includes("energ") || n.includes("planta")) return "⚡";
  if (n.includes("escenograf") || n.includes("mobiliario")) return "🛋️";
  return "📦";
}

function nombreEquipo(eq: EquipoPublico): string {
  return eq.marca && eq.modelo
    ? `${eq.marca} ${eq.modelo}`
    : eq.marca || eq.modelo || eq.descripcion;
}

/** Marcas principales de la categoría, derivadas del inventario real (máx. 3). */
function marcasPrincipales(cat: CategoriaPublica): string {
  const seen = new Set<string>();
  for (const e of cat.equipos) {
    const m = (e.marca ?? "").trim();
    if (m) seen.add(m);
  }
  return [...seen].slice(0, 3).join(" · ");
}

const CANTIDADES = Array.from({ length: 32 }, (_, i) => i + 1);

// ── Componente ─────────────────────────────────────────────────────────────────

export function SelectorEquiposInventario({ value, onChange, readOnly = false, notas, onNotasChange }: Props) {
  const [categorias, setCategorias] = useState<CategoriaPublica[]>([]);
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<"productos" | "equipos">(() =>
    (value.productos?.length ?? 0) > 0 ? "productos" : "equipos"
  );
  const [paso, setPaso] = useState<1 | 2>(() =>
    value.categorias.length > 0 || value.equipos.length > 0 ? 2 : 1
  );
  const [extraNombre, setExtraNombre] = useState("");
  const [extraCategoria, setExtraCategoria] = useState("");

  const cantidades = value.cantidades ?? {};
  const extras = value.extras ?? [];
  const productosSel = value.productos ?? [];

  useEffect(() => {
    Promise.all([
      fetch("/api/inventario/publico").then((r) => r.json()).catch(() => ({})),
      fetch("/api/productos/publico").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([inv, prod]) => {
        if (inv.categorias) setCategorias(inv.categorias);
        if (prod.productos) setProductos(prod.productos);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Mutadores de productos ──
  function toggleProducto(id: string) {
    if (readOnly) return;
    const tiene = productosSel.some((p) => p.id === id);
    onChange({
      ...value,
      productos: tiene
        ? productosSel.filter((p) => p.id !== id)
        : [...productosSel, { id, cantidad: 1 }],
    });
  }
  function setProductoCantidad(id: string, cant: number) {
    if (readOnly) return;
    const c = Math.max(1, Math.min(cant, 32));
    const existe = productosSel.some((p) => p.id === id);
    onChange({
      ...value,
      productos: existe
        ? productosSel.map((p) => (p.id === id ? { ...p, cantidad: c } : p))
        : [...productosSel, { id, cantidad: c }],
    });
  }

  // Categorías visibles (excluye vehículos / externos)
  const categoriasVisibles = useMemo(
    () =>
      categorias.filter(
        (cat) =>
          !cat.nombre.toLowerCase().includes("veh") &&
          !cat.nombre.toLowerCase().includes("externo")
      ),
    [categorias]
  );

  const categoriasElegidas = useMemo(
    () => categoriasVisibles.filter((c) => value.categorias.includes(c.id)),
    [categoriasVisibles, value.categorias]
  );

  // ── Mutadores ──
  function toggleCategoria(catId: string) {
    if (readOnly) return;
    const tiene = value.categorias.includes(catId);
    if (tiene) {
      // Al quitar la categoría, quitamos sus equipos y cantidades
      const cat = categorias.find((c) => c.id === catId);
      const idsCat = new Set((cat?.equipos ?? []).map((e) => e.id));
      const nuevasCant = { ...cantidades };
      Object.keys(nuevasCant).forEach((id) => {
        if (idsCat.has(id)) delete nuevasCant[id];
      });
      onChange({
        ...value,
        categorias: value.categorias.filter((id) => id !== catId),
        equipos: value.equipos.filter((id) => !idsCat.has(id)),
        cantidades: nuevasCant,
      });
    } else {
      onChange({ ...value, categorias: [...value.categorias, catId], cantidades });
    }
  }

  function toggleEquipo(eqId: string) {
    if (readOnly) return;
    const tiene = value.equipos.includes(eqId);
    const nuevasCant = { ...cantidades };
    if (tiene) delete nuevasCant[eqId];
    onChange({
      ...value,
      equipos: tiene
        ? value.equipos.filter((id) => id !== eqId)
        : [...value.equipos, eqId],
      cantidades: nuevasCant,
    });
  }

  function setCantidad(eqId: string, cant: number) {
    if (readOnly) return;
    const nuevasCant = { ...cantidades };
    const seleccionado = value.equipos.includes(eqId);
    if (cant <= 0) {
      delete nuevasCant[eqId]; // "sin cantidad definida"
    } else {
      nuevasCant[eqId] = Math.min(cant, 32);
    }
    onChange({
      ...value,
      // Ajustar cantidad implica seleccionar el equipo
      equipos: seleccionado ? value.equipos : [...value.equipos, eqId],
      cantidades: nuevasCant,
    });
  }

  // ── Extras (categoría/equipo adicional a mano) ──
  function addExtra() {
    if (readOnly) return;
    const nombre = extraNombre.trim();
    if (!nombre) return;
    const item: ExtraEquipo = {
      id: `extra-${Date.now()}`,
      nombre,
      categoria: extraCategoria.trim() || undefined,
      cantidad: undefined,
    };
    onChange({ ...value, extras: [...extras, item] });
    setExtraNombre("");
    setExtraCategoria("");
  }

  function setExtraCantidad(id: string, cant: number) {
    if (readOnly) return;
    onChange({
      ...value,
      extras: extras.map((e) =>
        e.id === id ? { ...e, cantidad: cant <= 0 ? undefined : Math.min(cant, 32) } : e
      ),
    });
  }

  function removeExtra(id: string) {
    if (readOnly) return;
    onChange({ ...value, extras: extras.filter((e) => e.id !== id) });
  }

  // ── Estados de carga / vacío ──
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (categoriasVisibles.length === 0 && extras.length === 0 && productos.length === 0) {
    return (
      <p className="text-gray-600 text-sm py-4 text-center">
        No hay equipos disponibles en el inventario todavía.
      </p>
    );
  }

  const productosElegidos = productos.filter((p) => productosSel.some((s) => s.id === p.id));

  // ── Vista de solo lectura (resumen) ──
  if (readOnly) {
    const conEquipos =
      categoriasElegidas.length > 0 || value.equipos.length > 0 || extras.length > 0 || productosElegidos.length > 0;
    if (!conEquipos) {
      return <p className="text-gray-600 text-sm py-3">Sin equipos seleccionados.</p>;
    }
    return (
      <div className="space-y-3">
        {productosElegidos.length > 0 && (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-3">
            <p className="text-white text-sm font-medium mb-1.5">📦 Productos armados</p>
            <ul className="space-y-1">
              {productosElegidos.map((p) => {
                const cant = productosSel.find((s) => s.id === p.id)?.cantidad ?? 1;
                return (
                  <li key={p.id} className="text-gray-300 text-xs flex justify-between gap-2">
                    <span>
                      {cant > 1 ? `${cant}× ` : ""}
                      {p.nombre}
                    </span>
                    <span className="text-[#B3985B]">${(p.precioFinal * cant).toLocaleString("es-MX")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {categoriasElegidas.map((cat) => {
          const eqs = cat.equipos.filter((e) => value.equipos.includes(e.id));
          return (
            <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              <p className="text-white text-sm font-medium mb-1.5">
                {catEmoji(cat.nombre)} {cat.nombre}
              </p>
              {eqs.length === 0 ? (
                <p className="text-amber-500/70 text-xs">Por definir</p>
              ) : (
                <ul className="space-y-1">
                  {eqs.map((eq) => (
                    <li key={eq.id} className="text-gray-300 text-xs flex justify-between gap-2">
                      <span>{nombreEquipo(eq)}</span>
                      <span className="text-[#B3985B]">
                        {cantidades[eq.id] ? `${cantidades[eq.id]} pz` : "sin cantidad"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {extras.length > 0 && (
          <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-xl p-3">
            <p className="text-white text-sm font-medium mb-1.5">➕ Adicionales (a mano)</p>
            <ul className="space-y-1">
              {extras.map((ex) => (
                <li key={ex.id} className="text-gray-300 text-xs flex justify-between gap-2">
                  <span>
                    {ex.nombre}
                    {ex.categoria ? <span className="text-gray-600"> · {ex.categoria}</span> : null}
                  </span>
                  <span className="text-[#B3985B]">
                    {ex.cantidad ? `${ex.cantidad} pz` : "sin cantidad"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const totalEquipos = value.equipos.length + extras.length;

  // Control de cantidad reutilizable: −  [1–32 ▾]  +
  const controlCantidad = (
    cant: number | undefined,
    onSet: (n: number) => void
  ) => (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onSet((cant ?? 0) - 1)}
        className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm flex items-center justify-center leading-none"
      >
        −
      </button>
      <select
        value={cant ?? 0}
        onChange={(e) => onSet(Number(e.target.value))}
        className="h-6 bg-[#111] border border-[#2a2a2a] rounded-md text-white text-xs px-1 focus:outline-none focus:border-[#B3985B]"
      >
        <option value={0}>—</option>
        {CANTIDADES.map((n) => (
          <option key={n} value={n}>
            {n} pz
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSet((cant ?? 0) + 1)}
        className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm flex items-center justify-center leading-none"
      >
        +
      </button>
    </div>
  );

  // ── UI interactiva ──
  return (
    <div className="space-y-3">
      {/* Selector de modo: productos armados vs equipos individuales */}
      {productos.length > 0 && (
        <div className="flex items-center gap-1.5 p-1 bg-[#111] rounded-xl">
          <button
            type="button"
            onClick={() => setModo("productos")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              modo === "productos" ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            📦 Productos armados
          </button>
          <button
            type="button"
            onClick={() => setModo("equipos")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              modo === "equipos" ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            🎛️ Equipos individuales
          </button>
        </div>
      )}

      {/* ── MODO PRODUCTOS ── */}
      {modo === "productos" && (
        <div className="space-y-2">
          <p className="text-gray-500 text-xs">
            Sistemas y paquetes ya armados. Al elegir uno se consideran todos sus equipos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {productos.map((p) => {
              const sel = productosSel.some((s) => s.id === p.id);
              const cant = productosSel.find((s) => s.id === p.id)?.cantidad ?? 1;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-2.5 transition-all ${
                    sel ? "border-[#B3985B] bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleProducto(p.id)}
                    className="flex items-start gap-2.5 w-full text-left"
                  >
                    <span className="w-12 h-12 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                      {p.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagenUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-700">📦</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"
                          }`}
                        >
                          {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                        </span>
                        <span className="text-white text-xs font-medium leading-tight">{p.nombre}</span>
                      </span>
                      {p.descripcion && (
                        <span className="block text-gray-500 text-[10px] leading-tight line-clamp-2 mt-0.5">
                          {p.descripcion}
                        </span>
                      )}
                      <span className="block text-[#B3985B] text-[11px] font-semibold mt-1">
                        ${p.precioFinal.toLocaleString("es-MX")}
                      </span>
                    </span>
                  </button>
                  {sel && (
                    <div className="flex items-center justify-end mt-1.5">
                      {controlCantidad(cant, (n) => setProductoCantidad(p.id, n))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODO EQUIPOS INDIVIDUALES ── */}
      {modo === "equipos" && (
      <>
      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setPaso(1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
            paso === 1
              ? "bg-[#B3985B] text-black font-semibold"
              : "bg-[#1a1a1a] text-gray-400 hover:text-white"
          }`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${paso === 1 ? "bg-black/20" : "bg-[#B3985B]/20 text-[#B3985B]"}`}>1</span>
          Categorías
        </button>
        <span className="text-gray-700">→</span>
        <button
          type="button"
          onClick={() => value.categorias.length > 0 && setPaso(2)}
          disabled={value.categorias.length === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            paso === 2
              ? "bg-[#B3985B] text-black font-semibold"
              : "bg-[#1a1a1a] text-gray-400 hover:text-white"
          }`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${paso === 2 ? "bg-black/20" : "bg-[#B3985B]/20 text-[#B3985B]"}`}>2</span>
          Equipos y cantidades
        </button>
      </div>

      {/* ── PASO 1: elegir categorías ── */}
      {paso === 1 && (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">
            ¿Qué tipo de equipo o servicio necesitas? Elige las categorías; en el
            siguiente paso defines los equipos exactos y las piezas.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categoriasVisibles.map((cat) => {
              const sel = value.categorias.includes(cat.id);
              const marcas = marcasPrincipales(cat);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategoria(cat.id)}
                  title={marcas ? `Marcas: ${marcas}` : undefined}
                  className={`relative flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all ${
                    sel
                      ? "border-[#B3985B] bg-[#B3985B]/10"
                      : "border-[#1e1e1e] bg-[#111] hover:border-[#B3985B]/40"
                  }`}
                >
                  <span className="text-lg leading-none">{catEmoji(cat.nombre)}</span>
                  <span className="text-white text-[11px] font-medium leading-tight line-clamp-2">{cat.nombre}</span>
                  {marcas && (
                    <span className="text-gray-600 text-[9px] leading-tight line-clamp-1">{marcas}</span>
                  )}
                  {sel && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-md bg-[#B3985B] flex items-center justify-center">
                      <span className="text-black text-[8px] font-bold leading-none">✓</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notas técnicas / equipo faltante — capturar en cuanto se detecte */}
          {onNotasChange && (
            <div className="pt-1">
              <label className="text-[11px] text-[#B3985B] font-medium block mb-1">
                Notas técnicas / equipo faltante
              </label>
              <p className="text-[10px] text-gray-600 mb-1.5">
                Marcas o modelos específicos, o cualquier equipo que no encuentres en las categorías.
              </p>
              <textarea
                value={notas ?? ""}
                onChange={(e) => onNotasChange(e.target.value)}
                rows={2}
                placeholder="Ej: 4 micrófonos Shure ULXD, consola Digico SD12..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setPaso(2)}
            disabled={value.categorias.length === 0}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {value.categorias.length === 0
              ? "Elige al menos una categoría"
              : `Continuar a equipos (${value.categorias.length}) →`}
          </button>
        </div>
      )}

      {/* ── PASO 2: elegir equipos + cantidades (vista única scrolleable) ── */}
      {paso === 2 && (
        <div className="space-y-4">
          {categoriasElegidas.length === 0 && extras.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-3">Primero elige una o más categorías.</p>
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="text-[#B3985B] text-sm hover:underline"
              >
                ← Volver a categorías
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-xs">
                Marca los equipos que necesitas y ajusta las piezas con − / + o el menú.
              </p>

              {/* Todas las categorías elegidas, una debajo de otra */}
              {categoriasElegidas.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <p className="text-[#B3985B] text-xs font-semibold sticky top-0 bg-black/80 backdrop-blur-sm py-1 z-10">
                    {catEmoji(cat.nombre)} {cat.nombre}
                  </p>
                  {cat.equipos.length === 0 ? (
                    <p className="text-gray-600 text-[11px] px-1">
                      Sin equipos listados — se queda marcada como interés, lo definimos juntos.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {cat.equipos.map((eq) => {
                        const sel = value.equipos.includes(eq.id);
                        const cant = cantidades[eq.id];
                        return (
                          <div
                            key={eq.id}
                            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all ${
                              sel ? "border-[#B3985B]/60 bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                            }`}
                          >
                            {/* Miniatura + toggle */}
                            <button
                              type="button"
                              onClick={() => toggleEquipo(eq.id)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              <span className="relative w-9 h-9 rounded-md bg-[#1a1a1a] flex items-center justify-center shrink-0 overflow-hidden">
                                {eq.imagenUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={eq.imagenUrl} alt={eq.descripcion} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-gray-700 text-base">{catEmoji(cat.nombre)}</span>
                                )}
                              </span>
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"}`}>
                                {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                              </span>
                              <span className="flex flex-col min-w-0">
                                <span className="text-white text-xs font-medium leading-tight truncate">
                                  {nombreEquipo(eq)}
                                </span>
                                {eq.descripcion && eq.descripcion !== nombreEquipo(eq) && (
                                  <span className="text-gray-500 text-[10px] leading-tight line-clamp-2">
                                    {eq.descripcion}
                                  </span>
                                )}
                              </span>
                            </button>

                            {/* Cantidad (solo si está seleccionado) */}
                            {sel && controlCantidad(cant, (n) => setCantidad(eq.id, n))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* ── Categoría / equipo adicional (a mano, solo este trato) ── */}
              <div className="space-y-2 pt-1 border-t border-[#1a1a1a]">
                <p className="text-gray-400 text-xs font-medium">
                  ➕ ¿Falta una categoría o equipo?
                </p>
                <p className="text-gray-600 text-[10px] -mt-1">
                  Agrégalo a mano solo para este trato (no se guarda en el inventario).
                </p>
                {extras.length > 0 && (
                  <div className="space-y-1.5">
                    {extras.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-[#2a2a2a] bg-[#0d0d0d] px-2 py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium leading-tight truncate">{ex.nombre}</p>
                          {ex.categoria && (
                            <p className="text-gray-600 text-[10px] leading-tight truncate">{ex.categoria}</p>
                          )}
                        </div>
                        {controlCantidad(ex.cantidad, (n) => setExtraCantidad(ex.id, n))}
                        <button
                          type="button"
                          onClick={() => removeExtra(ex.id)}
                          className="w-6 h-6 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm flex items-center justify-center shrink-0"
                          aria-label="Quitar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={extraNombre}
                    onChange={(e) => setExtraNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExtra();
                      }
                    }}
                    placeholder="Equipo o categoría (ej: Máquina de humo Antari)"
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <input
                    value={extraCategoria}
                    onChange={(e) => setExtraCategoria(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExtra();
                      }
                    }}
                    placeholder="Categoría (opcional)"
                    className="sm:w-40 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <button
                    type="button"
                    onClick={addExtra}
                    disabled={!extraNombre.trim()}
                    className="bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed text-[#B3985B] text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Resumen + navegación */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="text-gray-400 text-xs hover:text-white transition-colors"
                >
                  ← Categorías
                </button>
                {totalEquipos > 0 && (
                  <span className="text-[#B3985B] text-xs font-medium">
                    ✓ {totalEquipos} equipo{totalEquipos !== 1 ? "s" : ""} seleccionado
                    {totalEquipos !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
      </>
      )}

      {modo === "equipos" && (
        <p className="text-gray-700 text-[11px] pt-1 text-center">
          Si no encuentras lo que necesitas, agrégalo arriba o menciónalo en las notas.
        </p>
      )}
    </div>
  );
}
