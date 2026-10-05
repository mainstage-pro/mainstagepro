"use client";

import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { type Capa, type ObjetoPlano, ETIQUETA_TIPO, PALETA_COLORES, colorDe } from "@/lib/site-plan";
import { iconoDe } from "@/lib/site-plan-iconos";

/**
 * El árbol de capas: lo que convierte un dibujo en un plano consultable. Apagar
 * "Producción" y dejar "Accesos" es como el venue y protección civil leen el mismo
 * archivo para cosas distintas.
 */
export default function PanelCapas({
  capas,
  objetos,
  seleccion,
  capaActiva,
  onSeleccionar,
  onCapaActiva,
  onCambiarCapa,
  onAgregarCapa,
  onBorrarCapa,
  onCambiarObjeto,
}: {
  capas: Capa[];
  objetos: ObjetoPlano[];
  seleccion: string | null;
  capaActiva: string;
  onSeleccionar: (id: string | null) => void;
  onCapaActiva: (id: string) => void;
  onCambiarCapa: (id: string, parcial: Partial<Capa>) => void;
  onAgregarCapa: () => void;
  onBorrarCapa: (id: string) => void;
  onCambiarObjeto: (id: string, parcial: Partial<ObjetoPlano>) => void;
}) {
  const [cerradas, setCerradas] = useState<Set<string>>(new Set());
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [paleta, setPaleta] = useState<string | null>(null);

  function alternar(id: string) {
    setCerradas(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <p className="ms-section-label">Capas</p>
        <button type="button" onClick={onAgregarCapa} className="ms-btn-icon" title="Nueva capa">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto ms-no-scrollbar flex flex-col gap-1">
        {capas.map(capa => {
          const suyos = objetos.filter(o => o.capaId === capa.id);
          const abierta = !cerradas.has(capa.id);
          const activa = capaActiva === capa.id;

          return (
            <div key={capa.id} className={`rounded-md border ${activa ? "border-[#B3985B]/50" : "border-[#161616]"}`}>
              <div className="flex items-center gap-1 px-1.5 py-1">
                <button type="button" onClick={() => alternar(capa.id)} className="text-[#666] hover:text-[#aaa]">
                  {abierta ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                <button
                  type="button"
                  onClick={() => setPaleta(paleta === capa.id ? null : capa.id)}
                  className="w-3 h-3 rounded-sm shrink-0 border border-black/40"
                  style={{ background: capa.color }}
                  title="Color de la capa"
                />

                {renombrando === capa.id ? (
                  <input
                    autoFocus
                    defaultValue={capa.nombre}
                    onBlur={e => {
                      onCambiarCapa(capa.id, { nombre: e.target.value.trim() || capa.nombre });
                      setRenombrando(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setRenombrando(null);
                    }}
                    className="ms-input-inline flex-1 min-w-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onCapaActiva(capa.id)}
                    onDoubleClick={() => setRenombrando(capa.id)}
                    className={`flex-1 min-w-0 text-left text-[12px] truncate ${
                      activa ? "text-[#B3985B]" : "text-[#ccc]"
                    }`}
                    title="Clic para dibujar en esta capa · doble clic para renombrar"
                  >
                    {capa.nombre}
                  </button>
                )}

                <span className="ms-micro text-[#555] shrink-0">{suyos.length}</span>

                <button
                  type="button"
                  onClick={() => onCambiarCapa(capa.id, { bloqueada: !capa.bloqueada })}
                  className={capa.bloqueada ? "text-[#B3985B]" : "text-[#444] hover:text-[#888]"}
                  title={capa.bloqueada ? "Desbloquear" : "Bloquear"}
                >
                  {capa.bloqueada ? <Lock size={12} /> : <LockOpen size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarCapa(capa.id, { visible: !capa.visible })}
                  className={capa.visible ? "text-[#888] hover:text-[#ccc]" : "text-[#444]"}
                  title={capa.visible ? "Ocultar" : "Mostrar"}
                >
                  {capa.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => onBorrarCapa(capa.id)}
                  className="text-[#444] hover:text-[#D9444F]"
                  title="Borrar la capa y lo que tenga dentro"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {paleta === capa.id ? (
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {PALETA_COLORES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onCambiarCapa(capa.id, { color: c });
                        setPaleta(null);
                      }}
                      className="w-4 h-4 rounded-sm border border-black/40"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              ) : null}

              {abierta && suyos.length > 0 ? (
                <div className="pb-1">
                  {suyos.map(o => {
                    const def = iconoDe(o.icono);
                    const Icono = def?.Icono;
                    return (
                      <div
                        key={o.id}
                        className={`flex items-center gap-1.5 pl-6 pr-1.5 py-0.5 cursor-pointer ${
                          seleccion === o.id ? "bg-[#B3985B]/15" : "hover:bg-[#121212]"
                        }`}
                        onClick={() => onSeleccionar(o.id)}
                      >
                        {Icono ? (
                          <Icono size={11} color={colorDe(o, capas)} />
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                            style={{ background: colorDe(o, capas) }}
                          />
                        )}
                        <span className={`flex-1 min-w-0 truncate text-[11px] ${o.oculto ? "text-[#555]" : "text-[#bbb]"}`}>
                          {o.etiqueta || ETIQUETA_TIPO[o.tipo]}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onCambiarObjeto(o.id, { oculto: !o.oculto });
                          }}
                          className={o.oculto ? "text-[#444]" : "text-[#666] hover:text-[#aaa]"}
                        >
                          {o.oculto ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
