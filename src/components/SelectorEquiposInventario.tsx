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

export type SeleccionEquipos = {
  /** IDs de CategoriaEquipo elegidas en el paso 1 */
  categorias: string[];
  /** IDs de Equipo específico seleccionado en el paso 2 */
  equipos: string[];
  /** equipoId → cantidad de piezas. Ausente = seleccionado sin cantidad definida */
  cantidades?: Record<string, number>;
};

interface Props {
  value: SeleccionEquipos;
  onChange: (sel: SeleccionEquipos) => void;
  readOnly?: boolean;
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

// ── Componente ─────────────────────────────────────────────────────────────────

export function SelectorEquiposInventario({ value, onChange, readOnly = false }: Props) {
  const [categorias, setCategorias] = useState<CategoriaPublica[]>([]);
  const [loading, setLoading] = useState(true);
  const [paso, setPaso] = useState<1 | 2>(() =>
    value.categorias.length > 0 || value.equipos.length > 0 ? 2 : 1
  );
  const [catActivaRaw, setCatActivaRaw] = useState<string | null>(null);

  const cantidades = value.cantidades ?? {};

  useEffect(() => {
    fetch("/api/inventario/publico")
      .then((r) => r.json())
      .then((d) => {
        if (d.categorias) setCategorias(d.categorias);
      })
      .finally(() => setLoading(false));
  }, []);

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

  // Categoría activa efectiva: la elegida por el usuario si sigue vigente, si no la primera
  const catActiva =
    catActivaRaw && categoriasElegidas.some((c) => c.id === catActivaRaw)
      ? catActivaRaw
      : categoriasElegidas[0]?.id ?? null;

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
      nuevasCant[eqId] = cant;
    }
    onChange({
      ...value,
      // Ajustar cantidad implica seleccionar el equipo
      equipos: seleccionado ? value.equipos : [...value.equipos, eqId],
      cantidades: nuevasCant,
    });
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

  if (categoriasVisibles.length === 0) {
    return (
      <p className="text-gray-600 text-sm py-4 text-center">
        No hay equipos disponibles en el inventario todavía.
      </p>
    );
  }

  // ── Vista de solo lectura (resumen) ──
  if (readOnly) {
    const conEquipos = categoriasElegidas.length > 0 || value.equipos.length > 0;
    if (!conEquipos) {
      return <p className="text-gray-600 text-sm py-3">Sin equipos seleccionados.</p>;
    }
    return (
      <div className="space-y-3">
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
      </div>
    );
  }

  const totalEquipos = value.equipos.length;

  // ── UI interactiva ──
  return (
    <div className="space-y-3">
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
            ¿Qué tipo de equipo o servicio necesitas? Elige las categorías que te
            interesan. En el siguiente paso eliges los equipos exactos y cuántas piezas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categoriasVisibles.map((cat) => {
              const sel = value.categorias.includes(cat.id);
              const nEq = cat.equipos.filter((e) => value.equipos.includes(e.id)).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategoria(cat.id)}
                  className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                    sel
                      ? "border-[#B3985B] bg-[#B3985B]/10"
                      : "border-[#1e1e1e] bg-[#111] hover:border-[#B3985B]/40"
                  }`}
                >
                  <span className="text-2xl leading-none">{catEmoji(cat.nombre)}</span>
                  <span className="text-white text-xs font-medium leading-tight">{cat.nombre}</span>
                  <span className="text-gray-600 text-[10px]">
                    {cat.equipos.length} equipo{cat.equipos.length !== 1 ? "s" : ""}
                  </span>
                  {nEq > 0 && (
                    <span className="absolute top-2 right-2 text-[10px] text-[#B3985B] bg-[#B3985B]/15 rounded-full px-1.5 leading-4">
                      {nEq}
                    </span>
                  )}
                  <div
                    className={`absolute top-2 right-2 w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                      sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"
                    } ${nEq > 0 ? "hidden" : ""}`}
                  >
                    {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
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

      {/* ── PASO 2: elegir equipos + cantidades ── */}
      {paso === 2 && (
        <div className="space-y-3">
          {categoriasElegidas.length === 0 ? (
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
              {/* Tabs de categorías elegidas */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {categoriasElegidas.map((cat) => {
                  const nEq = cat.equipos.filter((e) => value.equipos.includes(e.id)).length;
                  const activa = catActiva === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCatActivaRaw(cat.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                        activa
                          ? "bg-[#1e1e1e] text-white border border-[#B3985B]/50"
                          : "bg-[#111] text-gray-400 border border-[#1e1e1e] hover:text-white"
                      }`}
                    >
                      <span>{catEmoji(cat.nombre)}</span>
                      <span className="whitespace-nowrap">{cat.nombre}</span>
                      {nEq > 0 && (
                        <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/15 rounded-full px-1.5 leading-4">
                          {nEq}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Carrusel de equipos de la categoría activa */}
              {(() => {
                const cat = categoriasElegidas.find((c) => c.id === catActiva);
                if (!cat) return null;
                if (cat.equipos.length === 0) {
                  return (
                    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 text-center">
                      <p className="text-gray-500 text-xs">
                        No hay equipos listados en <span className="text-white">{cat.nombre}</span>.
                        Se queda marcada como interés — lo definimos juntos.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                    {cat.equipos.map((eq) => {
                      const sel = value.equipos.includes(eq.id);
                      const cant = cantidades[eq.id];
                      return (
                        <div
                          key={eq.id}
                          className={`snap-start shrink-0 w-[160px] rounded-xl border overflow-hidden transition-all ${
                            sel ? "border-[#B3985B] bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                          }`}
                        >
                          {/* Imagen + toggle */}
                          <button
                            type="button"
                            onClick={() => toggleEquipo(eq.id)}
                            className="relative w-full h-[110px] bg-[#1a1a1a] flex items-center justify-center"
                          >
                            {eq.imagenUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={eq.imagenUrl} alt={eq.descripcion} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-700 text-3xl">{catEmoji(cat.nombre)}</span>
                            )}
                            <div
                              className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                sel ? "bg-[#B3985B] border-[#B3985B]" : "border-white/40 bg-black/40"
                              }`}
                            >
                              {sel && <span className="text-black text-xs font-bold leading-none">✓</span>}
                            </div>
                          </button>

                          {/* Info */}
                          <div className="p-2.5 space-y-2">
                            <div className="min-h-[34px]">
                              <p className="text-white text-xs font-medium leading-tight line-clamp-2">
                                {nombreEquipo(eq)}
                              </p>
                            </div>

                            {/* Selector de cantidad */}
                            {sel ? (
                              <div className="flex items-center justify-between gap-1 bg-[#111] rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => setCantidad(eq.id, (cant ?? 0) - 1)}
                                  className="w-7 h-7 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-base flex items-center justify-center leading-none"
                                >
                                  −
                                </button>
                                <div className="flex-1 text-center">
                                  {cant ? (
                                    <span className="text-white text-sm font-semibold">{cant} pz</span>
                                  ) : (
                                    <span className="text-gray-500 text-[11px]">sin cantidad</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCantidad(eq.id, (cant ?? 0) + 1)}
                                  className="w-7 h-7 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-base flex items-center justify-center leading-none"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleEquipo(eq.id)}
                                className="w-full text-[11px] py-1.5 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors"
                              >
                                + Seleccionar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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

      <p className="text-gray-700 text-[11px] pt-1 text-center">
        Si no encuentras lo que necesitas, menciónalo en las notas o escríbenos directamente.
      </p>
    </div>
  );
}
