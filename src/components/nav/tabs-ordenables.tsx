"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function claseTab(activo: boolean, compacto = false) {
  return `${compacto ? "px-3.5 py-2" : "px-4 py-2.5"} text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
    activo ? "border-[#B3985B] text-white" : "border-transparent text-[#6b7280] hover:text-white"
  }`;
}

/// El orden guardado envejece: puede traer llaves que ya no existen y no traer
/// las pestañas nuevas. Lo desconocido se va al final sin perder su orden.
export function ordenarPorLlaves<T>(
  items: T[],
  llaves: string[] | undefined,
  llaveDe: (i: T) => string,
): T[] {
  if (!llaves || llaves.length === 0) return items;
  const idx = new Map(llaves.map((l, i) => [l, i]));
  return [...items].sort((a, b) => (idx.get(llaveDe(a)) ?? Infinity) - (idx.get(llaveDe(b)) ?? Infinity));
}

// Mouse: arrastra tras 6px. Touch: mantener presionado 220ms para arrastrar,
// así un deslizamiento rápido hace scroll normal en vez de reordenar.
function useSensoresTabs() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );
}

// Soltar una pestaña dispara también el clic del enlace que quedó debajo del
// cursor. Marcamos el instante del arrastre para ignorar ese clic fantasma.
let ultimoArrastre = 0;

export function arrastreReciente() {
  return Date.now() - ultimoArrastre < 250;
}

export function ContextoArrastreTabs({
  llaves,
  onReordenar,
  children,
}: {
  llaves: string[];
  onReordenar: (llaves: string[]) => void;
  children: React.ReactNode;
}) {
  const sensores = useSensoresTabs();

  function onDragEnd(e: DragEndEvent) {
    ultimoArrastre = Date.now();
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReordenar(
      arrayMove(llaves, llaves.indexOf(active.id as string), llaves.indexOf(over.id as string)),
    );
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={llaves} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function useTabArrastrable(llave: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: llave,
  });
  // Movimiento solo horizontal: anula el eje vertical del transform.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform ? { ...transform, y: 0 } : null),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return { ref: setNodeRef, style, atributos: attributes, arrastre: listeners, arrastrando: isDragging };
}
