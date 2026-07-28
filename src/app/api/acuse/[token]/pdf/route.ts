import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { renderDocLaboralPdf } from "@/lib/render-doc-laboral";
import type { DocLaboralSnapshot } from "@/lib/documentos-laborales";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 });
  const doc = await prisma.documentoLaboral.findUnique({ where: { token } });
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const snapshot = JSON.parse(doc.datos) as DocLaboralSnapshot;
  const pdf = await renderDocLaboralPdf(snapshot);
  const nombre = snapshot.personaNombre.replace(/\s+/g, "-");
  const label = snapshot.tipo === "OFERTA" ? "Oferta" : "Acuerdo";
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${label}-${nombre}.pdf"`,
    },
  });
}
