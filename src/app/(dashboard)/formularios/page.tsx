"use client";

import { useState } from "react";
import Link from "next/link";

// Definición de formularios disponibles — agregar más aquí en el futuro
const FORMULARIOS = [
  {
    id: "reporte-semanal",
    titulo: "Reporte General Semanal",
    descripcion:
      "Formulario semanal para que el equipo reporte logros, pendientes, tareas próximas e incidencias de la semana.",
    icono: "📋",
    href: "/formularios/reporte-semanal",
    hrefNuevo: "/formularios/reporte-semanal/nuevo",
    disponible: true,
  },
  {
    id: "incidencias-semanales",
    titulo: "Incidencias Semanales",
    descripcion:
      "Documenta y clasifica por urgencia las incidencias operativas de cada área durante la semana. Con exportación a PDF.",
    icono: "⚠️",
    href: "/formularios/incidencias-semanales",
    hrefNuevo: "/formularios/incidencias-semanales/nuevo",
    disponible: true,
  },
  // Próximamente
  {
    id: "satisfaccion-cliente",
    titulo: "Satisfacción del Cliente",
    descripcion: "Reporte post-evento para evaluar la experiencia del cliente y áreas de mejora.",
    icono: "⭐",
    href: "/formularios/satisfaccion-cliente",
    hrefNuevo: "/formularios/satisfaccion-cliente/nuevo",
    disponible: false,
  },
  {
    id: "reporte-post-evento",
    titulo: "Reporte Post-Evento",
    descripcion: "Evaluación técnica y operativa después de cada evento producido.",
    icono: "🎛️",
    href: "/formularios/reporte-post-evento",
    hrefNuevo: "/formularios/reporte-post-evento/nuevo",
    disponible: false,
  },
];

function CopyLinkButton({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copiar link de ${label}`}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
        copied
          ? "bg-green-900/30 border-green-700/50 text-green-400"
          : "border-[#2a2a2a] text-gray-500 hover:border-[#B3985B]/40 hover:text-[#B3985B]"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          ¡Copiado!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3c.482 0 .938-.114 1.342-.316m3.316-3.316C15.114 9.886 15.568 10 16 10c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3c0 .482.114.938.316 1.342m-3.316 3.316l3.316-3.316" />
          </svg>
          Copiar link
        </>
      )}
    </button>
  );
}

export default function FormulariosPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-1">
          Módulo
        </p>
        <h1 className="text-xl font-semibold text-white">Formularios</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">
          Centro de formularios operativos del equipo Mainstage Pro.
        </p>
      </div>

      {/* Grid de formularios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORMULARIOS.map((f) => (
          <div
            key={f.id}
            className={`bg-[#111] border rounded-2xl p-6 transition-all ${
              f.disponible
                ? "border-[#1e1e1e] hover:border-[#2a2a2a]"
                : "border-[#161616] opacity-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xl shrink-0">
                {f.icono}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-white font-semibold text-sm">{f.titulo}</h2>
                  {!f.disponible && (
                    <span className="text-[10px] text-gray-600 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{f.descripcion}</p>

                {f.disponible && (
                  <>
                    {/* Botón para compartir el link */}
                    <div className="mt-3 flex items-center gap-2 p-2.5 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl">
                      <svg className="w-3.5 h-3.5 text-gray-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <code className="flex-1 text-[10px] text-gray-600 truncate">
                        mainstagepro.vercel.app{f.hrefNuevo}
                      </code>
                      <CopyLinkButton href={f.hrefNuevo} label={f.titulo} />
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Link
                        href={f.hrefNuevo}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Llenar formulario
                      </Link>
                      <Link
                        href={f.href}
                        className="text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Ver historial
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
