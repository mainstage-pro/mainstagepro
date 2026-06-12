import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { PlanPagosPDF } from "@/components/PlanPagosPDF";
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

  const cxp = await prisma.cuentaPagar.findUnique({
    where: { id },
    include: {
      proveedor:  { select: { nombre: true, empresa: true } },
      tecnico:    { select: { nombre: true } },
      empresa:    { select: { nombre: true } },
      socio:      { select: { nombre: true } },
      proyecto:   { select: { nombre: true, numeroProyecto: true } },
      cuotas: {
        orderBy: { numeroCuota: "asc" },
        include: {
          abonoPago: {
            select: { fecha: true, monto: true, metodoPago: true, notas: true },
          },
        },
      },
    },
  });

  if (!cxp) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!cxp.cuotas.length) {
    return NextResponse.json({ error: "Esta cuenta no tiene un plan de pagos" }, { status: 404 });
  }

  // Nombre del beneficiario
  let contraparte = "Beneficiario";
  let empresaContraparte: string | null = null;
  if (cxp.tipoAcreedor === "PROVEEDOR" && cxp.proveedor) {
    contraparte = cxp.proveedor.nombre;
    empresaContraparte = (cxp.proveedor as unknown as Record<string, unknown>).empresa as string | null ?? null;
  } else if (cxp.tipoAcreedor === "TECNICO" && cxp.tecnico) {
    contraparte = cxp.tecnico.nombre;
  } else if (cxp.tipoAcreedor === "EMPRESA" && cxp.empresa) {
    contraparte = cxp.empresa.nombre;
  } else if (cxp.tipoAcreedor === "SOCIO" && cxp.socio) {
    contraparte = cxp.socio.nombre;
  }

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc  = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data = {
    tipo: "pago" as const,
    concepto: cxp.concepto,
    montoTotal: cxp.monto,
    montoPagado: cxp.montoPagado,
    contraparte,
    empresaContraparte,
    proyecto: cxp.proyecto
      ? { nombre: cxp.proyecto.nombre, numeroProyecto: String((cxp.proyecto as unknown as Record<string, unknown>).numeroProyecto ?? "") }
      : null,
    cuotas: cxp.cuotas.map(c => ({
      numeroCuota: c.numeroCuota,
      monto: c.monto,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      estado: c.estado,
      abono: c.abonoPago
        ? {
            fecha: c.abonoPago.fecha.toISOString(),
            monto: c.abonoPago.monto,
            metodoPago: c.abonoPago.metodoPago,
            notas: c.abonoPago.notas ?? null,
          }
        : null,
    })),
    generadoEn: new Date().toISOString(),
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(PlanPagosPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const filename = `PlanPagos-${id.slice(0, 8)}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
