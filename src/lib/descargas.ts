export function esMovil(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/Android|iPhone|iPod/i.test(navigator.userAgent)) return true;
  // iPadOS 13+ se identifica como Macintosh; se distingue por el touch.
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

function tipoPorExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "zip") return "application/zip";
  if (ext === "csv") return "text/csv";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

function nombreDesdeHeaders(res: Response): string | null {
  const cd = res.headers.get("Content-Disposition");
  if (!cd) return null;
  const utf8 = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1]);
  return cd.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
}

export async function obtenerArchivo(url: string, filename?: string, init?: RequestInit): Promise<File> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) throw new Error(`No se pudo generar el archivo (${res.status})`);
  const blob = await res.blob();
  const nombre = filename || nombreDesdeHeaders(res) || "documento.pdf";
  return new File([blob], nombre, { type: blob.type || tipoPorExtension(nombre) });
}

export function guardarArchivo(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function abrirArchivo(file: File) {
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function puedeCompartirArchivo(file: File): boolean {
  return typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });
}

/** Devuelve false si el usuario canceló; lanza si el share falla de verdad. */
export async function compartirArchivo(file: File, titulo?: string): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title: titulo || file.name });
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return false;
    throw e;
  }
}
