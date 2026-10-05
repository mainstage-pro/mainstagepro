"use client";

import { useMemo, useState } from "react";
import { GRUPOS_ICONOS, ICONOS_SITE_PLAN } from "@/lib/site-plan-iconos";

/** Normaliza para buscar "baños" escribiendo "banos". */
function plano(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function SelectorIcono({
  valor,
  onElegir,
  compacto,
}: {
  valor: string | null;
  onElegir: (clave: string) => void;
  compacto?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");

  const grupos = useMemo(() => {
    const q = plano(busqueda.trim());
    const lista = q ? ICONOS_SITE_PLAN.filter(i => plano(`${i.etiqueta} ${i.grupo}`).includes(q)) : ICONOS_SITE_PLAN;
    return GRUPOS_ICONOS.map(g => ({ grupo: g, iconos: lista.filter(i => i.grupo === g) })).filter(
      g => g.iconos.length > 0,
    );
  }, [busqueda]);

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <input
        className="ms-input-search"
        placeholder="Buscar punto…"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />
      <div className={`overflow-y-auto ms-no-scrollbar flex flex-col gap-3 ${compacto ? "max-h-56" : "max-h-80"}`}>
        {grupos.map(({ grupo, iconos }) => (
          <div key={grupo}>
            <p className="ms-section-label mb-1.5">{grupo}</p>
            <div className="grid grid-cols-6 gap-1">
              {iconos.map(({ clave, etiqueta, Icono, color }) => (
                <button
                  key={clave}
                  type="button"
                  title={etiqueta}
                  onClick={() => onElegir(clave)}
                  className={`aspect-square rounded-md border flex items-center justify-center transition-colors ${
                    valor === clave
                      ? "border-[#B3985B] bg-[#B3985B]/15"
                      : "border-[#1f1f1f] bg-[#111] hover:border-[#333]"
                  }`}
                >
                  <Icono size={16} color={color} />
                </button>
              ))}
            </div>
          </div>
        ))}
        {grupos.length === 0 ? <p className="ms-meta">Sin resultados.</p> : null}
      </div>
    </div>
  );
}
