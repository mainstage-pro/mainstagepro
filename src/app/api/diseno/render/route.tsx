import { renderDesign } from "@/lib/diseno/og";

export const runtime = "nodejs";

// Render genérico de cualquier plantilla: ?template=<id>&slide=<id>&proyectoId=<id>
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slide = url.searchParams.get("slide") ?? url.searchParams.get("story");
  return renderDesign(url.origin, url.searchParams.get("template"), slide, {
    proyectoId: url.searchParams.get("proyectoId"),
    disenoId: url.searchParams.get("disenoId"),
    formato: url.searchParams.get("formato"),
    pieza: url.searchParams.get("pieza"),
    brief: url.searchParams.get("brief"),
  });
}
