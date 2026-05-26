"use client";
import { useState, useCallback } from "react";

/**
 * Hook para descargar un PDF desde una URL de API sin abrir nuevas pestañas.
 * Hace fetch en background, crea un blob URL temporal y lo descarga.
 * Retorna: { downloading, downloadPdf }
 */
export function usePdfDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadPdf = useCallback(async (url: string, filename: string) => {
    if (downloading) return;
    setDownloading(filename);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Liberar el blob URL después de un momento
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Error descargando PDF:", err);
    } finally {
      setDownloading(null);
    }
  }, [downloading]);

  return { downloading, downloadPdf };
}
