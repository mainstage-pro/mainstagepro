"use client";

import { useEffect, useState } from "react";

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
  /** IDs de CategoriaEquipo: "sé que necesito algo de aquí, defino después" */
  categorias: string[];
  /** IDs de Equipo específico seleccionado */
  equipos: string[];
};

interface Props {
  value: SeleccionEquipos;
  onChange: (sel: SeleccionEquipos) => void;
  readOnly?: boolean;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function SelectorEquiposInventario({ value, onChange, readOnly = false }: Props) {
  const [categorias, setCategorias] = useState<CategoriaPublica[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/inventario/publico")
      .then((r) => r.json())
      .then((d) => {
        if (d.categorias) setCategorias(d.categorias);
      })
      .finally(() => setLoading(false));
  }, []);

  // Inicialmente expandir categorías que ya tienen equipos seleccionados
  useEffect(() => {
    if (categorias.length === 0) return;
    const toExpand = new Set<string>();
    value.equipos.forEach((eqId) => {
      const cat = categorias.find((c) => c.equipos.some((e) => e.id === eqId));
      if (cat) toExpand.add(cat.id);
    });
    if (toExpand.size > 0) setExpandidas((prev) => new Set([...prev, ...toExpand]));
  }, [categorias]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpandida(catId: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  function toggleCategoria(catId: string) {
    if (readOnly) return;
    const tiene = value.categorias.includes(catId);
    onChange({
      ...value,
      categorias: tiene
        ? value.categorias.filter((id) => id !== catId)
        : [...value.categorias, catId],
    });
  }

  function toggleEquipo(eqId: string) {
    if (readOnly) return;
    const tiene = value.equipos.includes(eqId);
    onChange({
      ...value,
      equipos: tiene
        ? value.equipos.filter((id) => id !== eqId)
        : [...value.equipos, eqId],
    });
  }

  const totalSeleccionado = value.categorias.length + value.equipos.length;

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <p className="text-gray-600 text-sm py-4 text-center">
        No hay equipos disponibles en el inventario todavía.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {/* Leyenda */}
      <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 mb-3">
        <p className="text-gray-400 text-xs leading-relaxed">
          <span className="text-white font-medium">¿Cómo funciona?</span>
          <br />
          Marca la casilla ☐ de una categoría si sabes que necesitas algo de ahí
          pero aún no sabes exactamente qué equipo. Despliega con{" "}
          <span className="text-[#B3985B]">▸</span> para ver los equipos
          disponibles y marcar los que te interesan.
        </p>
        {totalSeleccionado > 0 && (
          <p className="text-[#B3985B] text-xs mt-2 font-medium">
            ✓ {value.equipos.length} equipo{value.equipos.length !== 1 ? "s" : ""} y{" "}
            {value.categorias.length} categoría
            {value.categorias.length !== 1 ? "s" : ""} seleccionada
            {value.categorias.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {categorias.map((cat) => {
        const catSeleccionada = value.categorias.includes(cat.id);
        const eqsEnCat = value.equipos.filter((eid) =>
          cat.equipos.some((e) => e.id === eid)
        );
        const estaExpandida = expandidas.has(cat.id);
        const tieneEquipos = cat.equipos.length > 0;

        return (
          <div
            key={cat.id}
            className={`border rounded-xl overflow-hidden transition-all ${
              catSeleccionada || eqsEnCat.length > 0
                ? "border-[#B3985B]/40"
                : "border-[#1e1e1e]"
            }`}
          >
            {/* Fila de categoría */}
            <div className="flex items-center gap-0 bg-[#111]">
              {/* Checkbox de categoría */}
              <button
                type="button"
                disabled={readOnly}
                onClick={() => toggleCategoria(cat.id)}
                className="flex items-center gap-2.5 px-3 py-3 shrink-0 disabled:cursor-default"
                title="Marcar categoría completa (defino equipos después)"
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                    catSeleccionada
                      ? "bg-[#B3985B] border-[#B3985B]"
                      : "border-[#333] bg-transparent hover:border-[#B3985B]/50"
                  }`}
                >
                  {catSeleccionada && (
                    <span className="text-black text-xs font-bold leading-none">✓</span>
                  )}
                </div>
              </button>

              {/* Nombre de categoría + expander */}
              <button
                type="button"
                disabled={!tieneEquipos}
                onClick={() => tieneEquipos && toggleExpandida(cat.id)}
                className="flex-1 flex items-center justify-between py-3 pr-3 disabled:cursor-default"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm font-medium truncate">
                    {(() => {
                      const n = cat.nombre.toLowerCase();
                      let emoji = "📦";
                      if (n.includes("audio")) emoji = "🔊";
                      else if (n.includes("iluminaci")) emoji = "💡";
                      else if (n.includes("video") || n.includes("pantalla") || n.includes("led")) emoji = "📺";
                      else if (n.includes("estruct")) emoji = "🏗️";
                      else if (n.includes("backline")) emoji = "🎸";
                      else if (n.includes("efecto")) emoji = "✨";
                      else if (n.includes("pista")) emoji = "💃";
                      else if (n.includes("dj") || n.includes("cdj")) emoji = "🎚️";
                      else if (n.includes("energ") || n.includes("planta")) emoji = "⚡";
                      else if (n.includes("escenograf") || n.includes("mobiliario")) emoji = "🛋️";
                      return `${emoji} ${cat.nombre}`;
                    })()}
                  </span>
                  {eqsEnCat.length > 0 && (
                    <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 rounded-full px-2 py-0.5 shrink-0">
                      {eqsEnCat.length} seleccionado{eqsEnCat.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {catSeleccionada && eqsEnCat.length === 0 && (
                    <span className="text-[10px] text-amber-500/70 bg-amber-900/20 rounded-full px-2 py-0.5 shrink-0">
                      Por definir
                    </span>
                  )}
                </div>
                {tieneEquipos && (
                  <span
                    className={`text-gray-500 text-xs ml-2 shrink-0 transition-transform duration-200 ${
                      estaExpandida ? "rotate-90" : ""
                    }`}
                  >
                    ▸
                  </span>
                )}
                {!tieneEquipos && (
                  <span className="text-gray-700 text-[10px] ml-2 shrink-0">Sin equipos</span>
                )}
              </button>
            </div>

            {/* Lista de equipos — se despliega */}
            {estaExpandida && tieneEquipos && (
              <div className="border-t border-[#1e1e1e] divide-y divide-[#1a1a1a] bg-[#0d0d0d]">
                {cat.equipos.map((eq) => {
                  const seleccionado = value.equipos.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleEquipo(eq.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                        seleccionado
                          ? "bg-[#B3985B]/8"
                          : "hover:bg-[#151515]"
                      }`}
                    >
                      {/* Miniatura */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0 flex items-center justify-center">
                        {eq.imagenUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={eq.imagenUrl}
                            alt={eq.descripcion}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 text-lg">📦</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium leading-tight truncate">
                          {eq.marca && eq.modelo
                            ? `${eq.marca} ${eq.modelo}`
                            : eq.marca || eq.modelo || eq.descripcion}
                        </p>
                        {(eq.marca || eq.modelo) && (
                          <p className="text-gray-500 text-[11px] leading-tight mt-0.5 truncate">
                            {eq.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                          seleccionado
                            ? "bg-[#B3985B] border-[#B3985B]"
                            : "border-[#333]"
                        }`}
                      >
                        {seleccionado && (
                          <span className="text-black text-xs font-bold leading-none">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Nota final */}
      <p className="text-gray-700 text-[11px] pt-2 text-center">
        Si no encuentras lo que necesitas, mencionalo en las notas o escríbenos directamente.
      </p>
    </div>
  );
}
