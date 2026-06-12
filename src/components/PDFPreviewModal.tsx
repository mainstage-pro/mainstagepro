"use client";

import { useEffect, useRef, useState } from "react";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** URL del API route que genera el PDF (sin ?preview=1) */
  apiUrl: string;
  /** Nombre del archivo para descargar */
  filename: string;
}

export function PDFPreviewModal({ isOpen, onClose, title, apiUrl, filename }: PDFPreviewModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const previewUrl = `${apiUrl}?preview=1`;
  const downloadUrl = apiUrl;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoaded(false);
      setError(false);
    }
  }, [isOpen, apiUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-4 px-5 py-3 shrink-0"
        style={{
          background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        {/* PDF icon */}
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 32, height: 32, backgroundColor: "#B3985B20", border: "1px solid #B3985B40" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{title}</p>
          <p className="text-gray-500 text-xs">Vista previa · PDF</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download */}
          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black transition-all"
            style={{ backgroundColor: "#B3985B" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#c9a96a")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#B3985B")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-gray-400 hover:text-white"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            title="Cerrar (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── PDF iframe area ── */}
      <div className="flex-1 relative overflow-hidden p-4">
        {/* Loading state */}
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="relative w-12 h-12">
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: "2px solid #2a2a2a",
                  borderTopColor: "#B3985B",
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium">Generando documento…</p>
              <p className="text-gray-600 text-xs mt-1">Esto puede tomar unos segundos</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full"
              style={{ backgroundColor: "#ef444420", border: "1px solid #ef444440" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-200 text-sm font-medium">No se pudo cargar la vista previa</p>
              <p className="text-gray-500 text-xs mt-1">Intenta descargar el PDF directamente</p>
            </div>
            <a
              href={downloadUrl}
              download={filename}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black"
              style={{ backgroundColor: "#B3985B" }}
            >
              Descargar PDF
            </a>
          </div>
        )}

        {/* iframe */}
        <iframe
          key={previewUrl}
          src={previewUrl}
          className="w-full h-full rounded-lg"
          style={{
            border: "1px solid #2a2a2a",
            opacity: loaded && !error ? 1 : 0,
            transition: "opacity 0.3s ease",
            backgroundColor: "#fff",
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          title={title}
        />
      </div>
    </div>
  );
}
