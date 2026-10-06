"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccess } from "@/components/AccessProvider";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
import { EditInput, useSingleDoubleClick } from "@/components/nav/editable";
import {
  ContextoArrastreTabs,
  claseTab,
  ordenarPorLlaves,
  useTabArrastrable,
} from "@/components/nav/tabs-ordenables";

export interface ModuleNavTab {
  href: string;
  label: string;
  accessKey?: string;
  adminOnly?: boolean;
}

export function applyOrder(tabs: ModuleNavTab[], ids?: string[]) {
  return ordenarPorLlaves(tabs, ids, (t) => t.href);
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
  const { ref, style, atributos, arrastre } = useTabArrastrable(tab.href);
  const handleClick = useSingleDoubleClick(onNavigate, onStartEdit);

  if (editing) {
    return (
      <span ref={ref} style={style} className="flex items-center px-2 py-1.5 shrink-0 w-40">
        <EditInput initial={label} onCommit={onCommit} onCancel={onCancel} />
      </span>
    );
  }

  return (
    <div
      ref={ref}
      style={style}
      {...atributos}
      {...arrastre}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className={`${claseTab(active)} cursor-pointer select-none`}
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

  return (
    <div className="flex flex-col min-h-full">
      {isAdmin ? (
        <ContextoArrastreTabs
          llaves={ordered.map((t) => t.href)}
          onReordenar={(llaves) => saveTabsOrder(scope, llaves)}
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
        </ContextoArrastreTabs>
      ) : (
        <div className={barClass}>
          {ordered.map((t) => (
            <Link key={t.href} href={t.href} className={claseTab(isActive(t))}>
              {labelOf(t)}
            </Link>
          ))}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
