"use client";

/**
 * El atajo al PDF de la pestaña en la que ya estás.
 *
 * El catálogo completo sigue viviendo en la pestaña Documentos: ahí están los
 * enlaces públicos por token, el archivero y el recorte de secciones del libro.
 * Esto es nada más la descarga, puesta donde se trabaja — quien acaba de cerrar
 * el advance de una fecha no tiene por qué salirse del advance para imprimirlo.
 *
 * Si la pestaña está vacía no hay botón: en su lugar se dice qué falta capturar,
 * porque un PDF en blanco se manda igual de fácil que uno bueno.
 */

import { Download, FileText } from "lucide-react";
import { usePdfDownload } from "@/hooks/usePdfDownload";

export interface BotonDocumentoGiraProps {
  /// Endpoint que emite el PDF, sin query: el `inline=1` del botón "Ver" y el
  /// recorte de secciones los pega el componente.
  url: string;
  /// Cómo se llama el documento. Es el texto del botón y el título de la hoja
  /// de compartir en móvil.
  label: string;
  /// Query extra del generador, p. ej. `secciones=crew` para recortar el libro.
  query?: string | null;
  /// Qué hay que capturar para que el documento diga algo. Si viene, no se
  /// ofrece la descarga: se explica el hueco.
  falta?: string | null;
  /// Lo que el documento NO trae y se nota justo desde esta pestaña.
  nota?: string | null;
  className?: string;
}

export default function BotonDocumentoGira({
  url,
  label,
  query,
  falta,
  nota,
  className,
}: BotonDocumentoGiraProps) {
  const { downloading, downloadPdf } = usePdfDownload();

  const descarga = query ? `${url}?${query}` : url;
  const enLinea = query ? `${url}?inline=1&${query}` : `${url}?inline=1`;

  // `useDescarga` marca lo ocupado con la URL, así que dos documentos en la
  // misma pantalla no se apagan juntos.
  const generando = downloading === descarga;

  if (falta) {
    return (
      <p className={`ms-micro text-[#6b7280] flex items-start gap-1.5 ${className ?? ""}`}>
        <FileText className="w-3 h-3 shrink-0 mt-[1px]" />
        <span>
          {label}: falta {falta}.
        </span>
      </p>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className ?? ""}`}>
      <div className="flex items-center gap-1.5">
        <a className="ms-btn-ghost" href={enLinea} target="_blank" rel="noreferrer">
          Ver
        </a>
        <button
          type="button"
          onClick={() => downloadPdf(descarga, undefined, label)}
          disabled={generando}
          className="ms-btn-secondary inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {generando ? "Generando…" : label}
        </button>
      </div>
      {nota && <p className="ms-micro text-[#6b7280] max-w-xs leading-relaxed">{nota}</p>}
    </div>
  );
}
