import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ gfm: true, breaks: true });

// Convierte markdown a HTML sanitizado. Los autores son staff de confianza,
// pero la política se muestra en un portal público de acuse, así que igual
// pasamos el resultado por DOMPurify.
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md || "", { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
