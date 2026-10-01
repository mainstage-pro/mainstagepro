"use client";

import { useState } from "react";
import { ChevronDown, Pencil, X } from "lucide-react";
import { getPerfilMontaje, soportePideAltura, ZONAS } from "@/lib/montaje-vocabulario";
import type { ItemDeZona } from "@/lib/layout-zonas";
import type { Carga } from "@/lib/consumo-electrico";

export type CambioPosicion = {
  zona?: string | null;
  funcion?: string | null;
  soporte?: string | null;
  alturaM?: number | null;
  notas?: string | null;
};

const SELECT =
  "w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#B3985B]";

function Fila({
  item,
  zonaId,
  guardando,
  onGuardar,
}: {
  item: ItemDeZona;
  zonaId: string;
  guardando: boolean;
  onGuardar: (item: ItemDeZona, cambio: CambioPosicion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [notas, setNotas] = useState(item.notas ?? "");
  const perfil = getPerfilMontaje(item.categoria, item.disciplina);
  const pideAltura = soportePideAltura(item.soporte, item.categoria, item.disciplina);

  const detalle = [
    item.soporteLabel || null,
    item.alturaM != null ? `${item.alturaM} m` : null,
    item.amperajeUnitario != null ? `${item.amperajeTotal.toFixed(1)} A @${item.voltaje}` : "sin amperaje",
    item.pesoUnitarioKg != null ? `${item.pesoKg.toFixed(1)} kg` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded border border-[#1f1f1f] bg-[#0d0d0d]">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="w-9 h-9 shrink-0 rounded bg-[#0e0e0e] border border-[#1f1f1f] overflow-hidden flex items-center justify-center">
          {item.imagenUrl ? (
            <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[9px] text-gray-700">s/f</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-white truncate">
            {item.cantidad} × {item.nombre}
          </span>
          <span className="block text-[10px] text-gray-500 truncate">{detalle || "Sin montaje capturado"}</span>
        </span>
        <button
          onClick={() => setAbierto(a => !a)}
          className="shrink-0 text-gray-500 hover:text-white transition-colors p-1"
          title="Editar montaje y notas"
        >
          {abierto ? <ChevronDown size={13} /> : <Pencil size={12} />}
        </button>
      </div>

      {item.notas && !abierto && (
        <p className="px-2 pb-1.5 text-[10px] text-[#B3985B]/80 leading-tight">{item.notas}</p>
      )}

      {abierto && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-[#1a1a1a] pt-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="ms-label block mb-0.5">Zona</label>
              <select
                value={ZONAS.some(z => z.id === zonaId) ? zonaId : ""}
                onChange={e => onGuardar(item, { zona: e.target.value || null })}
                className={SELECT}
              >
                <option value="">Sin zona</option>
                {ZONAS.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label block mb-0.5">Configuración</label>
              <select
                value={item.funcion ?? ""}
                onChange={e => onGuardar(item, { funcion: e.target.value || null })}
                className={SELECT}
              >
                <option value="">Sin configuración</option>
                {perfil.configuraciones.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label block mb-0.5">Montaje</label>
              <select
                value={item.soporte ?? ""}
                onChange={e => onGuardar(item, { soporte: e.target.value || null })}
                className={SELECT}
              >
                <option value="">Sin soporte</option>
                {perfil.soportes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {pideAltura && (
              <div>
                <label className="ms-label block mb-0.5">Altura (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={item.alturaM ?? ""}
                  onBlur={e => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    if (v !== (item.alturaM ?? null)) onGuardar(item, { alturaM: v });
                  }}
                  className={SELECT}
                />
              </div>
            )}
          </div>
          <div>
            <label className="ms-label block mb-0.5">Notas</label>
            <textarea
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              onBlur={() => {
                if (notas !== (item.notas ?? "")) onGuardar(item, { notas: notas || null });
              }}
              placeholder="Qué hay que saber para montarlo"
              className={`${SELECT} resize-none`}
            />
          </div>
          {guardando && <p className="text-[10px] text-gray-600">Guardando…</p>}
        </div>
      )}
    </div>
  );
}

export default function DetalleZonaLayout({
  titulo,
  subtitulo,
  color,
  zonaId,
  items,
  carga,
  pesoKg,
  guardando,
  onGuardar,
  onCerrar,
}: {
  titulo: string;
  subtitulo?: string;
  color: string;
  zonaId: string;
  items: ItemDeZona[];
  carga: Carga;
  pesoKg: number;
  guardando: boolean;
  onGuardar: (item: ItemDeZona, cambio: CambioPosicion) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="ms-card p-3">
      <div className="flex items-start gap-2">
        <span className="w-2.5 h-2.5 rounded-sm mt-1 shrink-0" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white font-semibold leading-tight">{titulo}</p>
          {subtitulo && <p className="text-[10px] text-gray-500 leading-tight">{subtitulo}</p>}
        </div>
        <button onClick={onCerrar} className="text-gray-600 hover:text-white transition-colors shrink-0">
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[10px] text-gray-500">
        <span>
          {items.reduce((s, i) => s + i.cantidad, 0)} <span className="text-gray-600">unidades</span>
        </span>
        <span>
          {pesoKg.toFixed(1)} <span className="text-gray-600">kg</span>
        </span>
        {carga.amperaje110 > 0 && (
          <span className="text-[#B3985B]">
            {carga.amperaje110.toFixed(1)} A <span className="text-gray-600">110V</span>
          </span>
        )}
        {carga.amperaje220 > 0 && (
          <span className="text-[#B3985B]">
            {carga.amperaje220.toFixed(1)} A <span className="text-gray-600">220V</span>
          </span>
        )}
        {carga.sinDato > 0 && <span className="text-amber-600">{carga.sinDato} sin amperaje</span>}
      </div>

      <div className="mt-2 space-y-1 max-h-[26rem] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[11px] text-gray-600 leading-tight">
            Todavía no hay equipo en esta área. Asígnalo desde el rider o cambia la zona de un equipo
            abriendo su detalle en otra área.
          </p>
        ) : (
          items.map(i => (
            <Fila key={i.clave} item={i} zonaId={zonaId} guardando={guardando} onGuardar={onGuardar} />
          ))
        )}
      </div>
    </div>
  );
}
