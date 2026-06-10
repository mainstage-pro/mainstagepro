import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fixHtml, getLogoUrl } from "@/lib/presentation-utils";

/**
 * GET /api/presentaciones-venta/[id]/html
 * Serves the sales presentation as a real HTML page.
 * Supports ?token=xxx for public access via tokenPublico.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  let presentacion: { htmlContent: string } | null = null;

  if (token) {
    // Public access via tokenPublico — no auth required
    presentacion = await prisma.presentacionVenta.findFirst({
      where: { tokenPublico: token },
      select: { htmlContent: true },
    });
  } else {
    // Authenticated access
    const session = await getSession();
    if (!session) {
      return new NextResponse("No autorizado", { status: 401 });
    }
    presentacion = await prisma.presentacionVenta.findFirst({
      where: { id, creadaPorId: session.id },
      select: { htmlContent: true },
    });
  }

  if (!presentacion) {
    return new NextResponse("Presentación no encontrada", { status: 404 });
  }

  const logoUrl = getLogoUrl();
  const patchEndpoint = `/api/presentaciones-venta/${id}`;
  const fixed = fixHtml(presentacion.htmlContent, logoUrl, id, id, patchEndpoint);

  return new NextResponse(fixed, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
