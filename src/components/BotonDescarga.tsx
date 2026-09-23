"use client";

import { useDescarga } from "@/components/DescargaProvider";

/** Botón de descarga usable desde Server Components (reemplaza a `<a download>`). */
export function BotonDescarga({
  url,
  filename,
  titulo,
  className,
  style,
  children,
}: {
  url: string;
  filename: string;
  titulo?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { descargar } = useDescarga();
  return (
    <button type="button" onClick={() => descargar({ url, filename, titulo })} className={className} style={style}>
      {children}
    </button>
  );
}
