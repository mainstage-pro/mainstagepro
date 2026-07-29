"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccess } from "@/components/AccessProvider";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
import { EditInput, useSingleDoubleClick } from "@/components/nav/editable";
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

export interface ModuleNavTab {
  href: string;
  label: string;
  accessKey?: string;
  adminOnly?: boolean;
}

function tabClass(active: boolean) {
  return `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
    active
      ? "border-[#B3985B] text-white"
      : "border-transparent text-[#6b7280] hover:text-white"
  }`;
}

export function applyOrder(tabs: ModuleNavTab[], ids?: string[]) {
  if (!ids || ids.length === 0) return tabs;
  const idx = new Map(ids.map((h, i) => [h, i]));
  return [...tabs].sort((a, b) => {
    const ai = idx.has(a.href) ? (idx.get(a.href) as number) : Infinity;
    const bi = idx.has(b.href) ? (idx.get(b.href) as number) : Infinity;
    return ai - bi;
  });
}

function SortableTab({
  tab,
  label,
  active,
  editing,
  onNavigate,
  onStartEdit,
  onCommit,
  onCancel,
}: {
  tab: ModuleNavTab;
  label: string;
  active: boolean;
  editing: boolean;
  onNavigate: () => void;
  onStartEdit: () => void;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tab.href });
  const handleClick = useSingleDoubleClick(onNavigate, onStartEdit);
  // Movimiento solo horizontal: anula el eje vertical del transform.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform ? { ...transform, y: 0 } : null),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (editing) {
    return (
      <span
        ref={setNodeRef}
        style={style}
        className="flex items-center px-2 py-1.5 shrink-0 w-40"
      >
        <EditInput initial={label} onCommit={onCommit} onCancel={onCancel} />
      </span>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className={`${tabClass(active)} cursor-pointer select-none`}
    >
      {label}
    </div>
  );
}

export default function ModuleTabsLayout({
  tabs,
  children,
}: {
  tabs: ModuleNavTab[];
  children: React.ReactNode;
}) {
  const { canAccess, isAdmin } = useAccess();
  const { labels, tabsOrder, saveLabel, saveTabsOrder } = useNavConfig();
  const pathname = usePathname();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  // Mouse: arrastra tras 6px. Touch: mantener presionado 220ms para arrastrar,
  // así un deslizamiento rápido hace scroll normal en vez de reordenar.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const visible = tabs.filter((t) => canAccess(t.accessKey, t.adminOnly));
  if (visible.length === 0) {
    return <div className="p-6 text-sm text-gray-600">Sin acceso a este módulo.</div>;
  }

  const scope = visible[0].href.split("/").filter(Boolean)[0] ?? "tabs";
  const ordered = applyOrder(visible, tabsOrder[scope]);
  const isActive = (t: ModuleNavTab) =>
    pathname === t.href || pathname.startsWith(t.href + "/");
  const labelOf = (t: ModuleNavTab) => labels[t.href] ?? t.label;

  const barClass =
    "flex gap-1 border-b border-[#1a1a1a] px-4 md:px-6 pt-4 md:pt-6 shrink-0 overflow-x-auto";

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((t) => t.href);
    const next = arrayMove(
      ids,
      ids.indexOf(active.id as string),
      ids.indexOf(over.id as string),
    );
    saveTabsOrder(scope, next);
  }

  return (
    <div className="flex flex-col min-h-full">
      {isAdmin ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={ordered.map((t) => t.href)}
            strategy={horizontalListSortingStrategy}
          >
            <div className={barClass}>
              {ordered.map((t) => (
                <SortableTab
                  key={t.href}
                  tab={t}
                  label={labelOf(t)}
                  active={isActive(t)}
                  editing={editing === t.href}
                  onNavigate={() => router.push(t.href)}
                  onStartEdit={() => setEditing(t.href)}
                  onCommit={(v) => {
                    saveLabel(t.href, v);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className={barClass}>
          {ordered.map((t) => (
            <Link key={t.href} href={t.href} className={tabClass(isActive(t))}>
              {labelOf(t)}
            </Link>
          ))}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
