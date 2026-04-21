import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReciboTecnicoPDF } from "@/components/ReciboTecnicoPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json({ error: "Sin conceptos seleccionados" }, { status: 400 });

  const cxps = await prisma.cuentaPagar.findMany({
    where: { id: { in: ids } },
    include: {
      tecnico: { select: { id: true, nombre: true } },
      proveedor: { select: { id: true, nombre: true } },
      proyecto: { select: { nombre: true, numeroProyecto: true } },
    },
    orderBy: { fechaCompromiso: "asc" },
  });

  if (cxps.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const first = cxps[0];
  const beneficiarioNombre =
    cxps.find(c => c.tecnico?.nombre)?.tecnico?.nombre ??
    cxps.find(c => c.proveedor?.nombre)?.proveedor?.nombre ??
    first.concepto.split("·")[0].replace(/^Honorarios\s*[-–]\s*/i, "").trim();

  const tipoAcreedor = first.tipoAcreedor;
  const total = cxps.reduce((sum, c) => sum + c.monto, 0);
  const refNum = Date.now().toString(36).toUpperCase().slice(-6);

  const reciboData = {
    tecnicoNombre: beneficiarioNombre,
    tipoAcreedor,
    conceptos: cxps.map(c => ({
      id: c.id,
      concepto: c.concepto,
      monto: c.monto,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      proyecto: c.proyecto
        ? { nombre: c.proyecto.nombre, numeroProyecto: c.proyecto.numeroProyecto }
        : null,
    })),
    total,
    fechaEmision: new Date().toISOString(),
    refNum,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ReciboTecnicoPDF, { recibo: reciboData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Recibo-${beneficiarioNombre.replace(/\s+/g, "-")}-${refNum}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
