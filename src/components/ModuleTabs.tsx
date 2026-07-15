"use client";

import { useState } from "react";
import { useAccess } from "@/components/AccessProvider";

export interface ModuleTab {
  key: string;
  label: string;
  content: React.ReactNode;
  accessKey?: string;
  adminOnly?: boolean;
}

export default function ModuleTabs({ tabs }: { tabs: ModuleTab[] }) {
  const { canAccess } = useAccess();
  const visible = tabs.filter((t) => canAccess(t.accessKey, t.adminOnly));
  const [active, setActive] = useState(visible[0]?.key);

  const activeKey = visible.some((t) => t.key === active) ? active : visible[0]?.key;

  if (visible.length === 0) {
    return <div className="p-6 text-sm text-gray-600">Sin acceso a este módulo.</div>;
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex gap-1 border-b border-[#1a1a1a] px-4 md:px-6 shrink-0 overflow-x-auto">
        {visible.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeKey === t.key
                ? "border-[#B3985B] text-white"
                : "border-transparent text-[#6b7280] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {visible.map((t) => (activeKey === t.key ? <div key={t.key}>{t.content}</div> : null))}
      </div>
    </div>
  );
}
