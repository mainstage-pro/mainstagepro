"use client";

import { useState } from "react";
import { Presentation, Users, RefreshCw, Compass, Gem, Flag, Layers, Lock } from "lucide-react";
import { useEstrategia } from "../useEstrategia";
import { Lienzo, Encabezado, Panel, Rotulo, GOLD, oro } from "../ui";

const BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app";

const MAZOS = [
  {
    key: "cultura",
    icono: Presentation,
    label: "Cultura y estrategia",
    href: "/presentacion/cultura",
    audiencia: "Equipo interno",
    desc: "El recorrido completo: propósito, misión, visión, a quién no servimos, cada valor con sus conductas, la meta del periodo con sus números y la cascada por área. Se arma sola con lo que está capturado hoy.",
  },
  {
    key: "alineacion-2026",
    icono: Users,
    label: "Alineación estratégica 2026",
    href: "/presentacion/alineacion-2026",
    audiencia: "Equipo interno",
    desc: "El mazo narrativo de 13 láminas que se usa en la junta de arranque de temporada. Texto fijo, no se mueve cuando editas el módulo.",
  },
];

function mensajeWA(label: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(
    `Te comparto la presentación de *${label}* de Mainstage Pro:\n\n${url}`
  )}`;
}

export default function PresentacionTab() {
  const { data } = useEstrategia();
  const [copiado, setCopiado] = useState<string | null>(null);

  function copiar(key: string, href: string) {
    navigator.clipboard.writeText(`${BASE_URL}${href}`).then(() => {
      setCopiado(key);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  const valores = data?.valores.length ?? 0;
  const areas = data?.areas.length ?? 0;
  const laminas = data ? 6 + valores * 2 + areas + 3 : null;

  const contenido = [
    { icono: Compass, label: "Identidad", pie: data?.identidad ? `Versión ${data.identidad.version} vigente` : "—" },
    { icono: Gem, label: "Valores", pie: `${valores} con sus conductas` },
    { icono: Flag, label: "Meta global", pie: data?.meta ? data.meta.periodo : "sin capturar" },
    { icono: Layers, label: "Áreas", pie: `${data?.resumen.objetivos ?? 0} objetivos` },
  ];

  return (
    <Lienzo ancho="max-w-5xl">
      <Encabezado
        titulo="Presentación"
        bajada="El mazo se genera con lo que está capturado en este módulo. No hay una copia que mantener: si corriges la visión o cierras una táctica, la siguiente vez que se abra ya sale corregido."
      />

      <Panel acento>
        <div className="flex items-start gap-3">
          <RefreshCw strokeWidth={1.7} className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-white font-medium">Se lee en vivo del sistema</p>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              {laminas
                ? `Ahora mismo son ${laminas} láminas aproximadas, armadas desde la identidad, ${valores} valores, la meta del periodo y ${areas} áreas.`
                : "Cargando el contenido capturado…"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {contenido.map(c => (
                <div key={c.label}>
                  <div className="flex items-center gap-1.5">
                    <c.icono strokeWidth={1.7} className="w-3 h-3 shrink-0" style={{ color: oro(0.7) }} />
                    <p className="text-[11px] text-gray-400">{c.label}</p>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">{c.pie}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        <Rotulo icono={Presentation}>Mazos disponibles</Rotulo>

        <div className="grid sm:grid-cols-2 gap-3">
          {MAZOS.map(m => {
            const url = `${BASE_URL}${m.href}`;
            return (
              <div
                key={m.key}
                className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-4 hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <m.icono strokeWidth={1.75} className="w-5 h-5 mt-0.5 shrink-0 text-[#8b8f97]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold text-sm">{m.label}</h3>
                      <span className="text-[10px] text-white/30 border border-white/10 rounded-full px-2 py-0.5 leading-none">
                        {m.audiencia}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
                  <span className="text-white/20 text-xs truncate flex-1 font-mono">{url}</span>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <a
                    href={m.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
                  >
                    Abrir →
                  </a>
                  <button
                    onClick={() => copiar(m.key, m.href)}
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
                  >
                    {copiado === m.key ? "Copiado" : "Copiar link"}
                  </button>
                  <a
                    href={mensajeWA(m.label, url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-green-800/30 bg-green-900/10 text-green-400 hover:bg-green-900/20 transition-colors shrink-0"
                    title="Compartir por WhatsApp"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-gray-600 flex items-start gap-2 leading-relaxed">
        <Lock strokeWidth={1.7} className="w-3 h-3 mt-0.5 shrink-0" />
        El mazo de cultura pide sesión: enseña metas financieras y objetivos por área, así que el link solo
        abre para quien ya entró a Mainstage.
      </p>
    </Lienzo>
  );
}
