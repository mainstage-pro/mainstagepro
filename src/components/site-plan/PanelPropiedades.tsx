"use client";

import { ArrowDownToLine, ArrowUpToLine, Copy, Trash2 } from "lucide-react";
import {
  type Capa,
  type ObjetoPlano,
  ETIQUETA_TIPO,
  PALETA_COLORES,
  colorDe,
  medidaDe,
} from "@/lib/site-plan";
import SelectorIcono from "./SelectorIcono";

export default function PanelPropiedades({
  objeto,
  capas,
  escala,
  onCambiar,
  onBorrar,
  onDuplicar,
  onOrden,
}: {
  objeto: ObjetoPlano;
  capas: Capa[];
  escala: number | null;
  onCambiar: (parcial: Partial<ObjetoPlano>) => void;
  onBorrar: () => void;
  onDuplicar: () => void;
  onOrden: (dir: "FRENTE" | "ATRAS") => void;
}) {
  const medida = medidaDe(objeto, escala);
  const esArea = objeto.tipo === "ZONA" || objeto.tipo === "CIRCULO";

  return (
    <div className="flex flex-col gap-3 min-h-0 overflow-y-auto ms-no-scrollbar">
      <div className="flex items-center justify-between">
        <p className="ms-section-label">{ETIQUETA_TIPO[objeto.tipo]}</p>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onOrden("FRENTE")} className="ms-btn-icon" title="Traer al frente">
            <ArrowUpToLine size={13} />
          </button>
          <button type="button" onClick={() => onOrden("ATRAS")} className="ms-btn-icon" title="Mandar atrás">
            <ArrowDownToLine size={13} />
          </button>
          <button type="button" onClick={onDuplicar} className="ms-btn-icon" title="Duplicar">
            <Copy size={13} />
          </button>
          <button type="button" onClick={onBorrar} className="ms-btn-icon hover:text-[#D9444F]" title="Borrar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div>
        <label className="ms-label">Nombre</label>
        <input
          className="ms-input"
          value={objeto.etiqueta}
          onChange={e => onCambiar({ etiqueta: e.target.value })}
          placeholder={ETIQUETA_TIPO[objeto.tipo]}
        />
      </div>

      <div>
        <label className="ms-label">Capa</label>
        <select
          className="ms-input"
          value={objeto.capaId}
          onChange={e => onCambiar({ capaId: e.target.value })}
        >
          {capas.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ms-label">Color</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCambiar({ color: undefined })}
            className={`px-2 h-6 rounded-md border text-[10px] ${
              objeto.color ? "border-[#1f1f1f] text-[#666]" : "border-[#B3985B] text-[#B3985B]"
            }`}
            title="Usar el color de la capa"
          >
            capa
          </button>
          {PALETA_COLORES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onCambiar({ color: c })}
              className={`w-6 h-6 rounded-md border ${
                objeto.color === c ? "border-white" : "border-black/40"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {esArea ? (
        <div>
          <label className="ms-label">Relleno · {Math.round((objeto.relleno ?? 0.3) * 100)}%</label>
          <input
            type="range"
            min={0}
            max={0.85}
            step={0.05}
            value={objeto.relleno ?? 0.3}
            onChange={e => onCambiar({ relleno: Number(e.target.value) })}
            className="w-full accent-[#B3985B]"
          />
        </div>
      ) : null}

      {objeto.tipo === "TRAZO" ? (
        <>
          <div>
            <label className="ms-label">Grosor · {Math.round(objeto.grosor ?? 6)} px</label>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={objeto.grosor ?? 6}
              onChange={e => onCambiar({ grosor: Number(e.target.value) })}
              className="w-full accent-[#B3985B]"
            />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#bbb]">
            <input
              type="checkbox"
              checked={!!objeto.flecha}
              onChange={e => onCambiar({ flecha: e.target.checked })}
              className="accent-[#B3985B]"
            />
            Punta de flecha
          </label>
        </>
      ) : null}

      {objeto.tipo === "PIN" || objeto.tipo === "TEXTO" ? (
        <div>
          <label className="ms-label">Tamaño · {Math.round(objeto.tamano ?? (objeto.tipo === "PIN" ? 44 : 28))} px</label>
          <input
            type="range"
            min={10}
            max={200}
            step={2}
            value={objeto.tamano ?? (objeto.tipo === "PIN" ? 44 : 28)}
            onChange={e => onCambiar({ tamano: Number(e.target.value) })}
            className="w-full accent-[#B3985B]"
          />
        </div>
      ) : null}

      {objeto.tipo !== "PIN" && objeto.tipo !== "TEXTO" ? (
        <label className="flex items-center gap-2 text-[12px] text-[#bbb]">
          <input
            type="checkbox"
            checked={!!objeto.punteado}
            onChange={e => onCambiar({ punteado: e.target.checked })}
            className="accent-[#B3985B]"
          />
          Línea punteada
        </label>
      ) : null}

      {objeto.tipo === "PIN" ? (
        <div className="min-h-0">
          <label className="ms-label">Icono</label>
          <SelectorIcono compacto valor={objeto.icono ?? null} onElegir={clave => onCambiar({ icono: clave })} />
        </div>
      ) : null}

      <div>
        <label className="ms-label">Notas</label>
        <textarea
          className="ms-textarea"
          rows={2}
          value={objeto.notas ?? ""}
          onChange={e => onCambiar({ notas: e.target.value })}
          placeholder="Lo que haya que aclarar de este elemento"
        />
      </div>

      {medida ? (
        <p className="ms-meta">
          Medida: <span style={{ color: colorDe(objeto, capas) }}>{medida}</span>
        </p>
      ) : esArea || objeto.tipo === "TRAZO" ? (
        <p className="ms-meta">Calibra la escala del plano para medir.</p>
      ) : null}
    </div>
  );
}
