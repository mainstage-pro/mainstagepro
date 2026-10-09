import { NextRequest, NextResponse } from "next/server";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LayoutProduccionPDF from "@/components/LayoutProduccionPDF";
import { logoBase64, makePdfImageResolver } from "@/components/pdf/PdfShared";
import { construirDocumentoLayout, nombreArchivoLayout } from "@/lib/layout-produccion";

type Params = { params: Promise<{ id: string; escenarioId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, escenarioId } = await params;
  const dueño = await prisma.proyectoEscenario.findFirst({
    where: { id: escenarioId, proyectoId: id },
    select: { id: true },
  });
  if (!dueño) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const doc = await construirDocumentoLayout(escenarioId);
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const publicDir = path.join(process.cwd(), "public");
  const resolver = makePdfImageResolver(publicDir);

  // Una miniatura por URL, no por renglón: el mismo modelo se repite muchas veces.
  // El plano también dibuja la foto, y una pieza puede traer una que ya no esté en la lista.
  const urls = [
    ...new Set(
      [
        ...doc.zonas.flatMap(z => z.subzonas.flatMap(s => s.equipos.map(e => e.imagenUrl))),
        ...doc.plano.piezas.map(p => p.imagenUrl),
      ].filter(Boolean) as string[],
    ),
  ];
  const resueltas = await Promise.all(urls.map(u => resolver(u)));
  const thumbs: Record<string, string> = {};
  urls.forEach((u, i) => {
    const dato = resueltas[i];
    if (dato) thumbs[u] = dato;
  });

  const buffer = await renderToBuffer(
    React.createElement(LayoutProduccionPDF, { doc, logo: logoBase64(publicDir), thumbs }) as Parameters<
      typeof renderToBuffer
    >[0],
  );

  const archivo = nombreArchivoLayout(doc);
  const enLinea = req.nextUrl.searchParams.get("preview") === "1";
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${enLinea ? "inline" : "attachment"}; filename="${archivo}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
