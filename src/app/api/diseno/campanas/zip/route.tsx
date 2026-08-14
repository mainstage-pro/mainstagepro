import { zipSync } from "fflate";
import { renderDesign } from "@/lib/diseno/og";
import { FORMATOS, type FormatoId } from "@/lib/diseno/formatos";

export const runtime = "nodejs";
// Renderizar 3 creativos 1080x1920 (con fetch de fuentes/fondo cada uno) puede
// pasarse del timeout por defecto de la función; damos margen holgado.
export const maxDuration = 60;

const FORMATOS_ZIP: FormatoId[] = ["story", "post", "cuadrado"];

// Limpia un nombre para usarlo como archivo (sin acentos ni caracteres raros).
function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "campana"
  );
}

// Descarga los 3 formatos del creativo (story/post/cuadrado) en un solo ZIP.
// Acepta el brief en vivo (?brief=) o una plantilla guardada (?disenoId=).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const brief = url.searchParams.get("brief");
  const disenoId = url.searchParams.get("disenoId");
  const base = slug(url.searchParams.get("nombre") ?? "campana");

  if (!brief && !disenoId) return new Response("Falta brief o disenoId", { status: 400 });

  // Los 3 formatos se renderizan en paralelo: en serie el fetch de fuentes/fondo
  // de cada creativo se acumula y la función se pasa del timeout en producción.
  const renders = await Promise.all(
    FORMATOS_ZIP.map(async (formato) => {
      const res = await renderDesign(url.origin, "contenido-campanas", "creativo", { brief, disenoId, formato });
      if (!res.ok) return { formato, bytes: null as Uint8Array | null };
      return { formato, bytes: new Uint8Array(await res.arrayBuffer()) };
    }),
  );

  const files: Record<string, Uint8Array> = {};
  for (const { formato, bytes } of renders) {
    if (!bytes) return new Response(`No se pudo generar el formato ${formato}`, { status: 502 });
    files[`${base}-${FORMATOS[formato].label.toLowerCase()}.png`] = bytes;
  }

  // level 0 = store: los PNG ya vienen comprimidos, no vale la pena recomprimir.
  const zipped = zipSync(files, { level: 0 });

  return new Response(Buffer.from(zipped), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
