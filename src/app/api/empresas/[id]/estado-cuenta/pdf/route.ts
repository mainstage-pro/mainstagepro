import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { EstadoCuentaPDF } from "@/components/EstadoCuentaPDF";
import { getCuentasScope, toEstadoCuentaLineas } from "@/lib/estado-cuenta";
import React from "react";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });
  if (!empresa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const scope = await getCuentasScope({ empresaId: id });
  const { porCobrar, porPagar } = toEstadoCuentaLineas(scope);

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data = {
    logoSrc,
    cliente: empresa.nombre,
    empresa: null,
    generadoEn: new Date().toISOString(),
    porCobrar,
    porPagar,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(EstadoCuentaPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const slug = empresa.nombre.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `EstadoCuenta-${slug || id.slice(0, 8)}-${fecha}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
