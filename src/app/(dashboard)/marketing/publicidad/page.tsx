"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import CampanasDashboard from "../campanas/calendario/page";
import TiposCampanaContent from "../campanas/page";

type Vista = "campanas" | "plantillas";

const TABS: { key: Vista; label: string }[] = [
  { key: "campanas",   label: "Campañas"  },
  { key: "plantillas", label: "Plantillas" },
];

function PublicidadInner() {
  const params = useSearchParams();
  const router = useRouter();
  // Compat: rutas viejas (?vista=calendario / meta) caen en Campañas.
  const raw = params.get("vista");
  const vista: Vista = raw === "plantillas" ? "plantillas" : "campanas";

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-[#1a1a1a] px-4 flex items-center gap-1 shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => router.push(`/marketing/publicidad?vista=${t.key}`)}
            className={`px-4 py-3 text-sm border-b-2 transition-colors ${
              vista === t.key
                ? "border-[#B3985B] text-white font-medium"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {vista === "campanas"   && <CampanasDashboard />}
        {vista === "plantillas" && <TiposCampanaContent />}
      </div>
    </div>
  );
}

export default function PublicidadPage() {
  return (
    <Suspense>
      <PublicidadInner />
    </Suspense>
  );
}
