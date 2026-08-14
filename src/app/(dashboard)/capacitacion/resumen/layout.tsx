"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ResumenProvider } from "./ResumenData";

const TABS = [
  { href: "/capacitacion/resumen", label: "Panorama" },
  { href: "/capacitacion/resumen/personas", label: "Personas" },
  { href: "/capacitacion/resumen/evaluaciones", label: "Evaluaciones" },
  { href: "/capacitacion/resumen/cursos", label: "Cursos" },
];

export default function ResumenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/capacitacion" className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-white" style={{ color: "#6b7280" }}>
          <ArrowLeft size={14} /> Portal de capacitación
        </Link>

        <h1 className="ms-h1 tracking-tight mb-1">Panel de capacitación</h1>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Avance del equipo, personas, evaluaciones y catálogo</p>

        <div className="flex gap-1 border-b mb-8 overflow-x-auto" style={{ borderColor: "#1a1a1a" }}>
          {TABS.map((t) => {
            const active = t.href === "/capacitacion/resumen"
              ? pathname === t.href
              : pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${active ? "border-[#B3985B] text-white" : "border-transparent text-[#6b7280] hover:text-white"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <ResumenProvider>{children}</ResumenProvider>
      </div>
    </div>
  );
}
