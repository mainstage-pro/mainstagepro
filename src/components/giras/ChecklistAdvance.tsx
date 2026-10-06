"use client";

import { useState } from "react";
import { ChevronDown, Trash2, User } from "lucide-react";
import { ESTADOS_CHECKLIST, FRENTES, type FrenteKey } from "@/lib/gira-advance-checklist";

export interface ItemChecklist {
  id: string;
  showId: string | null;
  frente: string;
  item: string;
  detalle: string | null;
  llave: string | null;
  estado: string;
  responsable: string | null;
  notas: string | null;
}

// El estado y el frente llegan de la BD como string, no como el literal de la
// plantilla: los mapas se tipan con llave string a propósito.
const ESTADO_MAP = new Map<string, (typeof ESTADOS_CHECKLIST)[number]>(ESTADOS_CHECKLIST.map(e => [e.key, e]));
const FRENTE_MAP = new Map<string, (typeof FRENTES)[number]>(FRENTES.map(f => [f.key, f]));

export const resueltoChecklist = (i: ItemChecklist) => i.estado === "LISTO" || i.estado === "NO_APLICA";

/** Un renglón del checklist: estado en 4 toques, nota y responsable inline. */
function Renglon({
  item, onPatch, onDelete,
}: {
  item: ItemChecklist;
  onPatch: (cambios: Partial<ItemChecklist>) => void;
  onDelete: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [notas, setNotas] = useState(item.notas ?? "");
  const [responsable, setResponsable] = useState(item.responsable ?? "");
  const est = ESTADO_MAP.get(item.estado) ?? ESTADOS_CHECKLIST[0];
  const resuelto = resueltoChecklist(item);

  // Siguiente estado al tocar el círculo: sin pedir → pedido → resuelto → sin pedir.
  const siguiente = item.estado === "PENDIENTE" ? "PEDIDO" : item.estado === "PEDIDO" ? "LISTO" : "PENDIENTE";

  return (
    <div className="group">
      <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#0f0f0f] transition-colors">
        <button
          onClick={() => onPatch({ estado: siguiente })}
          title={`${est.label} — toca para marcar «${ESTADO_MAP.get(siguiente)?.label}»`}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all text-[10px]"
          style={{
            borderColor: est.color,
            background: item.estado === "LISTO" ? est.color + "33" : "transparent",
            color: est.color,
          }}
        >
          {item.estado === "LISTO" ? "✓" : item.estado === "PEDIDO" ? "·" : item.estado === "NO_APLICA" ? "–" : ""}
        </button>

        <button onClick={() => setAbierto(a => !a)} className="flex-1 min-w-0 text-left">
          <p className={`text-[13px] leading-snug ${resuelto ? "text-gray-600" : "text-white"}`}>
            {item.item}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ color: est.color, background: est.color + "18" }}>
              {est.label}
            </span>
            {item.responsable && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                <User strokeWidth={1.75} className="w-3 h-3" /> {item.responsable}
              </span>
            )}
            {item.notas && !abierto && (
              <span className="text-[10px] text-[#666] truncate max-w-[22rem]">— {item.notas}</span>
            )}
          </div>
        </button>

        <div className="shrink-0 flex items-center gap-2 self-center">
          {item.estado !== "NO_APLICA" && (
            <button
              onClick={() => onPatch({ estado: "NO_APLICA" })}
              className="text-[10px] text-[#555] hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            >
              No aplica
            </button>
          )}
          {!item.llave && (
            <button
              onClick={onDelete}
              title="Borrar renglón"
              className="text-[#444] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 strokeWidth={1.75} className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <div className="px-4 pb-3 pl-12 space-y-2">
          {/* El texto de un punto del rider trae sus renglones en líneas: se respetan. */}
          {item.detalle && (
            <p className="text-[11.5px] text-[#7d8590] leading-relaxed whitespace-pre-line">{item.detalle}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              onBlur={() => { if (responsable !== (item.responsable ?? "")) onPatch({ responsable }); }}
              placeholder="¿Quién lo persigue?"
              className="ms-input-inline sm:col-span-1"
            />
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              onBlur={() => { if (notas !== (item.notas ?? "")) onPatch({ notas }); }}
              placeholder="Qué contestaron, qué falta…"
              className="ms-input-inline sm:col-span-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Bloque de un frente (management / venue / promotor / nosotros). */
function BloqueFrente({
  frente, items, onPatch, onDelete, onAgregar,
}: {
  frente: FrenteKey;
  items: ItemChecklist[];
  onPatch: (id: string, cambios: Partial<ItemChecklist>) => void;
  onDelete: (id: string) => void;
  onAgregar: (frente: FrenteKey, texto: string) => void;
}) {
  const [nuevo, setNuevo] = useState("");
  const def = FRENTE_MAP.get(frente)!;
  const resueltos = items.filter(resueltoChecklist).length;

  if (items.length === 0) return null;

  return (
    <div className="ms-card-deep overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#141414]">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: def.color }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: def.color }}>
          {def.label}
        </span>
        <span className="text-[10px] text-[#555] shrink-0">{resueltos}/{items.length}</span>
      </div>

      <div className="divide-y divide-[#141414]">
        {items.map(i => (
          <Renglon
            key={i.id}
            item={i}
            onPatch={cambios => onPatch(i.id, cambios)}
            onDelete={() => onDelete(i.id)}
          />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-[#141414]">
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && nuevo.trim()) { onAgregar(frente, nuevo.trim()); setNuevo(""); }
          }}
          placeholder="Agregar renglón y Enter…"
          className="w-full bg-transparent text-[12px] text-white placeholder:text-[#3a3a3a] focus:outline-none py-1"
        />
      </div>
    </div>
  );
}

/**
 * El checklist del advance de un alcance (la gira, o una fecha), plegado. Vive
 * debajo de los pendientes a propósito: lo que se captura a diario son los
 * pendientes; el checklist se abre cuando toca sentarse a cotejar punto por
 * punto con el venue.
 */
export default function ChecklistAdvance({
  giraId, showId, itemsIniciales, etiqueta, abiertoInicial = false,
}: {
  giraId: string;
  showId: string | null;
  itemsIniciales: ItemChecklist[];
  etiqueta: string;
  abiertoInicial?: boolean;
}) {
  const [items, setItems] = useState<ItemChecklist[]>(itemsIniciales);
  const [abierto, setAbierto] = useState(abiertoInicial);

  async function patchItem(id: string, cambios: Partial<ItemChecklist>) {
    const antes = items.find(i => i.id === id);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...cambios } : i)));
    const res = await fetch(`/api/giras/${giraId}/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    if (!res.ok && antes) setItems(prev => prev.map(i => (i.id === id ? antes : i)));
  }

  async function agregarItem(frente: FrenteKey, texto: string) {
    const res = await fetch(`/api/giras/${giraId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frente, item: texto, showId }),
    });
    if (res.ok) { const d = await res.json(); setItems(prev => [...prev, d.item]); }
  }

  async function borrarItem(id: string) {
    const res = await fetch(`/api/giras/${giraId}/checklist/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    else { const d = await res.json().catch(() => ({})); if (d?.error) alert(d.error); }
  }

  const resueltos = items.filter(resueltoChecklist).length;

  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-[#141414] text-left hover:bg-[#0f0f0f] transition-colors"
      >
        <ChevronDown strokeWidth={2}
          className={`w-3.5 h-3.5 text-[#444] shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
        <span className="text-[11px] text-[#8b9099] truncate">{etiqueta}</span>
        <span className="text-[10px] text-[#555] shrink-0 ml-auto">{resueltos}/{items.length}</span>
      </button>

      {abierto && (
        <div className="p-3 space-y-3 bg-[#0b0b0b]">
          {FRENTES.map(f => (
            <BloqueFrente
              key={f.key}
              frente={f.key}
              items={items.filter(i => i.frente === f.key)}
              onPatch={patchItem}
              onDelete={borrarItem}
              onAgregar={agregarItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
