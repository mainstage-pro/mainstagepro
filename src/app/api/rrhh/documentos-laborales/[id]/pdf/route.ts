import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { renderDocLaboralPdf } from "@/lib/render-doc-laboral";
import type { DocLaboralSnapshot } from "@/lib/documentos-laborales";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.documentoLaboral.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const snapshot = JSON.parse(doc.datos) as DocLaboralSnapshot;
  const pdf = await renderDocLaboralPdf(snapshot);
  const nombre = snapshot.personaNombre.replace(/\s+/g, "-");
  const label = snapshot.tipo === "OFERTA" ? "Oferta"
    : snapshot.tipo === "CONVENIO_TECNICO" ? "Convenio-Tecnico"
    : "Acuerdo";
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${label}-${nombre}.pdf"`,
    },
  });
}
