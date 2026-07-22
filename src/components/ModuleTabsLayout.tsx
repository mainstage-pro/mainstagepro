"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccess } from "@/components/AccessProvider";

export interface ModuleNavTab {
  href: string;
  label: string;
  accessKey?: string;
  adminOnly?: boolean;
}

export default function ModuleTabsLayout({
  tabs,
  children,
}: {
  tabs: ModuleNavTab[];
  children: React.ReactNode;
}) {
  const { canAccess } = useAccess();
  const pathname = usePathname();
  const visible = tabs.filter((t) => canAccess(t.accessKey, t.adminOnly));

  if (visible.length === 0) {
    return <div className="p-6 text-sm text-gray-600">Sin acceso a este módulo.</div>;
  }

  const isActive = (t: ModuleNavTab) =>
    pathname === t.href || pathname.startsWith(t.href + "/");

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex gap-1 border-b border-[#1a1a1a] px-4 md:px-6 pt-4 md:pt-6 shrink-0 overflow-x-auto">
        {visible.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              isActive(t)
                ? "border-[#B3985B] text-white"
                : "border-transparent text-[#6b7280] hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
