import { zipSync } from "fflate";
import { renderDesign } from "@/lib/diseno/og";
import { FORMATOS, type FormatoId } from "@/lib/diseno/formatos";

export const runtime = "nodejs";

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

  const files: Record<string, Uint8Array> = {};
  for (const formato of FORMATOS_ZIP) {
    const res = await renderDesign(url.origin, "contenido-campanas", "creativo", { brief, disenoId, formato });
    if (!res.ok) return new Response(`No se pudo generar el formato ${formato}`, { status: 502 });
    const bytes = new Uint8Array(await res.arrayBuffer());
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
