"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export interface HubTab {
  key: string;
  label: string;
}

interface HubTabsProps {
  basePath: string;
  defaultVista: string;
  tabs: HubTab[];
  children: (active: string) => React.ReactNode;
}

function HubTabsInner({ basePath, defaultVista, tabs, children }: HubTabsProps) {
  const params = useSearchParams();
  const router = useRouter();
  const active = params.get("vista") ?? defaultVista;

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-[#1a1a1a] px-4 flex items-center gap-1 shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`${basePath}?vista=${t.key}`)}
            className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              active === t.key
                ? "border-[#B3985B] text-white font-medium"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1">{children(active)}</div>
    </div>
  );
}

export default function HubTabs(props: HubTabsProps) {
  return (
    <Suspense>
      <HubTabsInner {...props} />
    </Suspense>
  );
}
