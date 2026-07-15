"use client";

import { useState } from "react";

export interface ModuleTab {
  key: string;
  label: string;
  content: React.ReactNode;
}

export default function ModuleTabs({ tabs }: { tabs: ModuleTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex gap-1 border-b border-[#1a1a1a] px-4 md:px-6 shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              active === t.key
                ? "border-[#B3985B] text-white"
                : "border-transparent text-[#6b7280] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {tabs.map((t) => (active === t.key ? <div key={t.key}>{t.content}</div> : null))}
      </div>
    </div>
  );
}
