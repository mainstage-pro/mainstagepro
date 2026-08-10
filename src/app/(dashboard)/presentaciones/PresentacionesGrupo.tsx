"use client";

import { useState } from "react";
import type { PresentacionItem } from "@/lib/presentaciones-catalogo";

const BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app";

const PUBLIC_INDEX_HREF = "/presentacion";

// Galerías por tipo de evento — se editan en la propia página pública
// (subir fotos, marcar destacadas) y alimentan las presentaciones de cotización.
const GALERIAS_EVENTO = [
  { label: "Musical", href: "/presentacion/evento/musical" },
  { label: "Social", href: "/presentacion/evento/social" },
  { label: "Empresarial", href: "/presentacion/evento/empresarial" },
];

function buildWAMessage(label: string, url: string): string {
  const msg = `Hola 👋\n\nTe comparto la presentación de *${label}* de Mainstage Pro:\n\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export default function PresentacionesGrupo({
  grupo,
}: {
  grupo: { grupo: string; items: PresentacionItem[] };
}) {
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
      {grupo.grupo === "General" && (
        <div className="mb-4 bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Índice público para clientes</h3>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Un solo link que agrupa todas las presentaciones comerciales. Nada interno se muestra aquí.
            </p>
            <span className="text-white/20 text-xs font-mono block mt-2 truncate">{`${BASE_URL}${PUBLIC_INDEX_HREF}`}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={PUBLIC_INDEX_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-semibold py-2 px-3 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              Abrir →
            </a>
            <button
              onClick={() => handleCopy("__public_index__", PUBLIC_INDEX_HREF)}
              className="text-center text-xs font-semibold py-2 px-3 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              {copied === "__public_index__" ? "✓ Copiado" : "Copiar link"}
            </button>
            <a
              href={buildWAMessage("presentaciones Mainstage Pro", `${BASE_URL}${PUBLIC_INDEX_HREF}`)}
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
      )}
      {grupo.grupo === "Paquetes" && (
        <div className="mb-4 bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Paquetes armados por tipo de evento</h3>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Comparte una vitrina lista por categoría. Los paquetes, sus imágenes de render y lo que incluyen se editan en el catálogo comercial.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/comercial/productos/paquetes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-semibold py-2 px-3 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-[#B3985B]/40 transition-colors"
            >
              Editar paquetes →
            </a>
          </div>
        </div>
      )}
      {grupo.grupo === "Galería" && (
        <div className="mb-4 bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Galerías por tipo de evento</h3>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Sube fotos y marca las destacadas en cada página. Esas imágenes alimentan la galería y el hero de las presentaciones de cotización de ese tipo de evento.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {GALERIAS_EVENTO.map((g) => (
              <a
                key={g.href}
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs font-semibold py-2 px-3 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-[#B3985B]/40 transition-colors"
              >
                {g.label} →
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {grupo.items.map((item) => {
          const fullUrl = `${BASE_URL}${item.href}`;
          const isCopied = copied === item.key;
          return (
            <div
              key={item.key}
              className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-4 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-start gap-3">
                <item.icon strokeWidth={1.75} className="w-5 h-5 mt-0.5 shrink-0 text-[#8b8f97]" />
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

              <div className="bg-black/30 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
                <span className="text-white/20 text-xs truncate flex-1 font-mono">{fullUrl}</span>
              </div>

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
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
