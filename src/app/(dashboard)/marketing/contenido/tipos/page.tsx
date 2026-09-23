"use client";

import { useState } from "react";
import ContenidosPage from "../../contenidos/page";
import MarketingCalendarioPage from "../../calendario/page";

/** La estrategia y las publicaciones que produce viven en la misma pestaña. */
export default function TiposPage() {
  const [vista, setVista] = useState<"estrategia" | "publicaciones">("estrategia");

  return (
    <div>
      <div className="px-4 md:px-6 pt-4 max-w-7xl mx-auto">
        <div className="inline-flex gap-1 ms-card rounded-lg p-1">
          {([["estrategia", "Estrategia"], ["publicaciones", "Publicaciones por tipo"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setVista(v)}
              className={`text-xs px-3 py-1 rounded transition-colors ${vista === v ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {vista === "estrategia"
        ? <ContenidosPage />
        : <MarketingCalendarioPage embedded vistaForzada="tipo" />}
    </div>
  );
}
