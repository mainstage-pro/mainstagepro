"use client";
import { useCallback } from "react";
import { useDescarga } from "@/components/DescargaProvider";

/**
 * Descarga un archivo desde una URL de API sin abrir pestañas nuevas.
 * En escritorio guarda directo; en móvil abre la hoja nativa para compartir
 * (WhatsApp, correo) o guardar.
 */
export function usePdfDownload() {
  const { descargar, ocupado } = useDescarga();

  const downloadPdf = useCallback(
    (url: string, filename: string, titulo?: string, init?: RequestInit) =>
      descargar({ url, filename, titulo, init }),
    [descargar]
  );

  return { downloading: ocupado, downloadPdf };
}
