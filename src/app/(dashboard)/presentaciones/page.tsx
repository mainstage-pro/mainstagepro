"use client";

import { useState } from "react";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app";

const PRESENTACIONES = [
  {
    grupo: "Negocio",
    items: [
      {
        key: "servicios",
        label: "Servicios",
        desc: "Presentación general de Mainstage Pro: lo que ofrecemos, cómo trabajamos y por qué elegirnos.",
        href: "/presentacion/servicios",
        icon: "🎛",
        audience: "Clientes potenciales",
      },
      {
        key: "alineacion",
        label: "Alineación estratégica",
        desc: "Identidad, servicios, mercado, cultura, ejecución y equipo. Para alinear a todo el team.",
        href: "/presentacion/alineacion",
        icon: "🧭",
        audience: "Equipo interno",
      },
      {
        key: "brandbook",
        label: "Brandbook",
        desc: "Identidad visual: logotipo, paleta de color, tipografía, tono de voz y guía de uso de marca.",
        href: "/presentacion/brandbook",
        icon: "🎨",
        audience: "Equipo interno · Agencias",
      },
    ],
  },
  {
    grupo: "Por tipo de evento",
    items: [
      {
        key: "musical",
        label: "Eventos musicales",
        desc: "Conciertos, festivales, DJ sets y showcases. Audio, iluminación y video para shows en vivo.",
        href: "/presentacion/evento/musical",
        icon: "🎵",
        audience: "Promotores · Artistas",
      },
      {
        key: "social",
        label: "Eventos sociales",
        desc: "Bodas, XV años, fiestas privadas. La producción técnica que hace memorables los momentos que importan.",
        href: "/presentacion/evento/social",
        icon: "🥂",
        audience: "Parejas · Familias",
      },
      {
        key: "empresarial",
        label: "Eventos empresariales",
        desc: "Conferencias, lanzamientos, corporativos. La imagen de tu empresa cuidada en cada detalle técnico.",
        href: "/presentacion/evento/empresarial",
        icon: "🏢",
        audience: "Empresas · Agencias",
      },
    ],
  },
  {
    grupo: "Reclutamiento y equipo",
    items: [
      {
        key: "equipo",
        label: "Únete al equipo",
        desc: "Por qué trabajar en Mainstage Pro, valores, beneficios y proceso de integración.",
        href: "/presentacion/equipo",
        icon: "🤝",
        audience: "Candidatos",
      },
    ],
  },
  {
    grupo: "Inventario",
    items: [
      {
        key: "inventario",
        label: "Inventario de equipo",
        desc: "Catálogo completo del inventario audiovisual de Mainstage Pro.",
        href: "/presentacion/inventario",
        icon: "📦",
        audience: "Clientes · Equipo interno",
      },
    ],
  },
];

const WA_NUMBER = "524461432565";

function buildWAMessage(label: string, url: string): string {
  const msg = `Hola 👋\n\nTe comparto la presentación de *${label}* de Mainstage Pro:\n\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export default function PresentacionesPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function handleCopy(key: string, href: string) {
    const url = `${BASE_URL}${href}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Dirección</p>
        <h1 className="text-2xl font-bold text-white">Presentaciones</h1>
        <p className="text-white/40 text-sm mt-1">
          Acceso directo a todas las presentaciones públicas del negocio.
        </p>
      </div>

      {/* Grupos */}
      <div className="space-y-10">
        {PRESENTACIONES.map((grupo) => (
          <div key={grupo.grupo}>
            <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-widest mb-4">
              {grupo.grupo}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grupo.items.map((item) => {
                const fullUrl = `${BASE_URL}${item.href}`;
                const isCopied = copied === item.key;
                return (
                  <div
                    key={item.key}
                    className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-4 hover:border-white/[0.12] transition-colors"
                  >
                    {/* Top */}
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold text-sm">{item.label}</h3>
                          <span className="text-[10px] text-white/30 border border-white/10 rounded-full px-2 py-0.5 leading-none">
                            {item.audience}
                          </span>
                        </div>
                        <p className="text-white/40 text-xs mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    {/* URL */}
                    <div className="bg-black/30 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
                      <span className="text-white/20 text-xs truncate flex-1 font-mono">
                        {fullUrl}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
                      >
                        Abrir →
                      </a>
                      <button
                        onClick={() => handleCopy(item.key, item.href)}
                        className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
                      >
                        {isCopied ? "✓ Copiado" : "Copiar link"}
                      </button>
                      <a
                        href={buildWAMessage(item.label, fullUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-green-800/30 bg-green-900/10 text-green-400 hover:bg-green-900/20 transition-colors shrink-0"
                        title="Compartir por WhatsApp"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
