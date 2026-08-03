// ── Overrides de diseño (edición manual) ─────────────────────────────────────
// Módulo PURO (sin server ni next/og): lo usa tanto el editor (cliente) como el
// render (servidor). Un diseño guardado puede sobreescribir texto (por ruta al
// campo) y fotos de fondo (por slide). Esta lógica es genérica para cualquier
// plantilla del registro.

export type DesignOverrides = {
  texto?: Record<string, string>; // "brief.descripcion" → valor
  fotos?: Record<string, string>; // slideId → URL (Vercel Blob)
};

export type EditableField = {
  path: string; // ruta al campo dentro de los datos de la plantilla
  label: string;
  slideId: string; // agrupa los campos por slide en la UI
  slideLabel: string;
  kind: "text" | "textarea" | "lines"; // lines = una línea por renglón (arrays)
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
}

// Setea por ruta SIN crear ramas nuevas (solo edita lo que ya existe).
function setByPath(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) return;
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

// Aplica los overrides de texto sobre una copia de los datos. Si el campo destino
// es un arreglo (ej. footer), el valor se parte por saltos de línea.
export function applyOverrides<T>(data: T, ov?: DesignOverrides | null): T {
  if (!ov?.texto || Object.keys(ov.texto).length === 0) return data;
  const out = clone(data);
  for (const [path, raw] of Object.entries(ov.texto)) {
    if (raw == null) continue;
    const current = getByPath(out, path);
    if (Array.isArray(current)) {
      setByPath(out, path, raw.split("\n").map((s) => s.trim()).filter(Boolean));
    } else {
      setByPath(out, path, raw);
    }
  }
  return out;
}

// Valor "en vivo" de un campo editable: override si existe, si no el original.
export function fieldValue(data: any, field: EditableField, ov?: DesignOverrides | null): string {
  const o = ov?.texto?.[field.path];
  if (o != null) return o;
  const v = getByPath(data, field.path);
  if (Array.isArray(v)) return v.join("\n");
  return v == null ? "" : String(v);
}
