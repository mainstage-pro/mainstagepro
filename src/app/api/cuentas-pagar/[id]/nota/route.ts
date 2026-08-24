import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { NotaPagoPDF } from "@/components/NotaPagoPDF";
import React from "react";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cxp = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: {
      proveedor: { select: { nombre: true, empresa: true, banco: true, cuentaBancaria: true, clabe: true, noTarjeta: true, rfc: true } },
      tecnico:   { select: { nombre: true, cuentaBancaria: true } },
      empresa:   { select: { nombre: true } },
      socio:     { select: { nombre: true } },
      proyecto:  { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
    },
  });

  if (!cxp) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Determinar nombre del beneficiario según tipo de acreedor
  let beneficiario = "Beneficiario";
  let empresaBeneficiario: string | null = null;

  if (cxp.proveedor) {
    beneficiario = cxp.proveedor.nombre;
    empresaBeneficiario = cxp.proveedor.empresa || null;
  } else if (cxp.tecnico) {
    beneficiario = cxp.tecnico.nombre;
  } else if (cxp.empresa) {
    beneficiario = cxp.empresa.nombre;
  } else if (cxp.socio) {
    beneficiario = cxp.socio.nombre;
  }

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc  = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  // Datos bancarios según tipo de acreedor
  let banco: string | null = null;
  let cuentaBancaria: string | null = null;
  let clabe: string | null = null;
  let noTarjeta: string | null = null;
  let rfc: string | null = null;

  if (cxp.proveedor) {
    banco          = cxp.proveedor.banco          ?? null;
    cuentaBancaria = cxp.proveedor.cuentaBancaria ?? null;
    clabe          = cxp.proveedor.clabe          ?? null;
    noTarjeta      = cxp.proveedor.noTarjeta      ?? null;
    rfc            = cxp.proveedor.rfc            ?? null;
  } else if (cxp.tecnico) {
    cuentaBancaria = cxp.tecnico.cuentaBancaria ?? null;
  }

  const notaData = {
    id:               cxp.id,
    logoSrc,
    concepto:         cxp.concepto,
    monto:            cxp.monto,
    fechaCompromiso:  cxp.fechaCompromiso.toISOString(),
    fechaPagoReal:    cxp.fechaPagoReal?.toISOString() ?? null,
    estado:           cxp.estado,
    beneficiario,
    empresaBeneficiario,
    banco,
    cuentaBancaria,
    clabe,
    noTarjeta,
    rfc,
    proyecto: cxp.proyecto
      ? { nombre: cxp.proyecto.nombre, numeroProyecto: cxp.proyecto.numeroProyecto, fechaEvento: cxp.proyecto.fechaEvento?.toISOString() ?? null }
      : null,
  };

  try {
    const pdfStream = await ReactPDF.renderToStream(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(NotaPagoPDF, { nota: notaData }) as React.ReactElement<React.ComponentProps<typeof Document>>
    );

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="NotaPago-${id.slice(-8).toUpperCase()}.pdf"`,
        "Content-Length":      String(pdfBuffer.length),
        "Cache-Control":       "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Error generando nota de pago PDF:", err);
    return NextResponse.json({ error: "Error al generar PDF", detail: String(err) }, { status: 500 });
  }
}
