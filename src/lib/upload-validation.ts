const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "video/mp4", "video/quicktime",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function validarArchivo(file: File): { ok: true } | { ok: false; error: string; status: number } {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB.`, status: 413 };
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `Tipo de archivo no permitido: ${file.type}`, status: 415 };
  }
  return { ok: true };
}
