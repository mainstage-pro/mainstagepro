"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import TiposCampanaContent from "../campanas/page";
import CalendarioCampanasContent from "../campanas/calendario/page";
import MetaAdsContent from "../meta-ads/page";

type Vista = "campanas" | "calendario" | "meta";

const TABS: { key: Vista; label: string }[] = [
  { key: "campanas",   label: "Campañas"   },
  { key: "calendario", label: "Calendario" },
  { key: "meta",       label: "Meta Ads"   },
];

function PublicidadInner() {
  const params = useSearchParams();
  const router = useRouter();
  const vista = (params.get("vista") as Vista) ?? "campanas";

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab bar */}
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

      {/* Tab content */}
      <div className="flex-1">
        {vista === "campanas"   && <TiposCampanaContent />}
        {vista === "calendario" && <CalendarioCampanasContent />}
        {vista === "meta"       && <MetaAdsContent />}
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
