"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface EnlaceSub {
  href: string;
  label: string;
  /// El índice se marca solo con la ruta exacta; si no, quedaría activo siempre
  /// porque es prefijo de todos sus hermanos.
  exacto?: boolean;
}

export default function SubNav({ enlaces }: { enlaces: EnlaceSub[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto ms-no-scrollbar">
      {enlaces.map((e) => {
        const activo = e.exacto ? pathname === e.href : pathname === e.href || pathname.startsWith(`${e.href}/`);
        return (
          <Link
            key={e.href}
            href={e.href}
            className={`px-3.5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activo ? "border-[#B3985B] text-white" : "border-transparent text-[#6b7280] hover:text-white"
            }`}
          >
            {e.label}
          </Link>
        );
      })}
    </nav>
  );
}
