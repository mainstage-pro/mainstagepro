import { renderDesign } from "@/lib/diseno/og";

export const runtime = "nodejs";

// Ruta de compatibilidad: delega en el render genérico con template fijo.
// Mantiene vivos los links existentes (?story=…&proyectoId=…).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slide = url.searchParams.get("story") ?? url.searchParams.get("slide");
  return renderDesign(url.origin, "brief-tecnico", slide, {
    proyectoId: url.searchParams.get("proyectoId"),
  });
}
