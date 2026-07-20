"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Settings, type LucideIcon } from "lucide-react";

import MarketingCalendarioPage from "../calendario/page";
import LevantamientosPage from "../levantamientos/page";
import KanbanPage from "../kanban/page";
import ContenidosPage from "../contenidos/page";

type TabKey = "calendario" | "parrilla" | "proximas" | "tipo" | "feed" | "shoots" | "kanban" | "tipos";
type Vista   = "calendario" | "proximas" | "parrilla" | "tipo" | "feed";

const TABS: { key: TabKey; label: string; icon?: LucideIcon }[] = [
  { key: "calendario", label: "Calendario" },
  { key: "parrilla",   label: "Parrilla"   },
  { key: "proximas",   label: "Próximas"   },
  { key: "tipo",       label: "Por tipo"   },
  { key: "feed",       label: "Feed IG"    },
  { key: "shoots",     label: "Shoots"     },
  { key: "kanban",     label: "Kanban"     },
  { key: "tipos",      label: "Tipos", icon: Settings },
];

const CALENDAR_VISTAS: TabKey[] = ["calendario", "parrilla", "proximas", "tipo", "feed"];

function ContenidoInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("vista") as TabKey) ?? "parrilla";

  const isCalendarTab = CALENDAR_VISTAS.includes(tab);
  const vistaForzada  = isCalendarTab ? (tab as Vista) : undefined;

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab bar */}
      <div className="border-b border-[#1a1a1a] px-4 flex items-center gap-1 shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => router.push(`/marketing/contenido?vista=${t.key}`)}
            className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              tab === t.key
                ? "border-[#B3985B] text-white font-medium"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {t.icon && <t.icon strokeWidth={1.75} className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {isCalendarTab && (
          <MarketingCalendarioPage embedded vistaForzada={vistaForzada} />
        )}
        {tab === "shoots" && <LevantamientosPage />}
        {tab === "kanban" && <KanbanPage />}
        {tab === "tipos" && <ContenidosPage />}
      </div>
    </div>
  );
}

export default function ContenidoPage() {
  return (
    <Suspense>
      <ContenidoInner />
    </Suspense>
  );
}
