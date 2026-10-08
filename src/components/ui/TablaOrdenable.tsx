"use client";

/**
 * Tabla de captura cuyo orden se arrastra.
 *
 * El renglón entero no es arrastrable: está lleno de inputs, y hacerlo
 * arrastrable completo impediría seleccionar el texto de una celda para
 * corregirlo. La manija es su propia celda y siempre va primero.
 */

import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/// La cabecera de la columna de la manija. Sin ella el `<thead>` queda con una
/// columna menos que el cuerpo y los títulos se recorren.
export function ThArrastre() {
  return <th className="ms-th w-[34px]" />;
}

/// Envuelve la tabla y su contenedor con scroll: sustituye al
/// `<div className="ms-table-wrapper overflow-x-auto">` que ya traía la página.
export function TablaOrdenable<T>({
  filas,
  claveDe,
  onReordenar,
  children,
}: {
  filas: T[];
  claveDe: (fila: T) => string;
  /// Recibe la lista ya reordenada; quien la usa decide si además renumera.
  onReordenar: (filas: T[]) => void;
  children: ReactNode;
}) {
  const sensores = useSensors(
    // Sin el umbral, un clic en la manija contaría como arrastre de cero píxeles
    // y se comería el foco de la celda.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function alSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const i = filas.findIndex((f) => claveDe(f) === active.id);
    const j = filas.findIndex((f) => claveDe(f) === over.id);
    if (i < 0 || j < 0) return;
    onReordenar(arrayMove(filas, i, j));
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={filas.map(claveDe)} strategy={verticalListSortingStrategy}>
        <div className="ms-table-wrapper overflow-x-auto">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

export function FilaArrastrable({
  clave,
  titulo,
  className = "ms-tr align-top",
  children,
}: {
  clave: string;
  titulo: string;
  className?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clave });

  return (
    <tr
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <td className="ms-td">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[#444] hover:text-white transition-colors touch-none"
          title={titulo}
        >
          ⠿
        </button>
      </td>
      {children}
    </tr>
  );
}
