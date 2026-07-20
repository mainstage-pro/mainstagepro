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

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: {
      cliente:   { select: { nombre: true, empresa: true } },
      empresa:   { select: { nombre: true } },
      proyecto:  { select: { nombre: true, numeroProyecto: true } },
      cuotas: {
        orderBy: { numeroCuota: "asc" },
        include: {
          abono: {
            select: { fecha: true, monto: true, metodoPago: true, notas: true },
          },
        },
      },
    },
  });

  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!cxc.cuotas.length) {
    return NextResponse.json({ error: "Esta cuenta no tiene un plan de cobros" }, { status: 404 });
  }

  // Nombre del cliente
  let contraparte = "Cliente";
  let empresaContraparte: string | null = null;
  if (cxc.empresa) {
    contraparte = cxc.empresa.nombre;
  } else if (cxc.cliente) {
    contraparte = cxc.cliente.nombre;
    empresaContraparte = (cxc.cliente as unknown as Record<string, unknown>).empresa as string | null ?? null;
  }

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc  = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data = {
    tipo: "cobro" as const,
    concepto: cxc.concepto,
    montoTotal: cxc.monto,
    montoPagado: cxc.montoCobrado,
    contraparte,
    empresaContraparte,
    proyecto: cxc.proyecto
      ? { nombre: cxc.proyecto.nombre, numeroProyecto: String((cxc.proyecto as unknown as Record<string, unknown>).numeroProyecto ?? "") }
      : null,
    cuotas: cxc.cuotas.map(c => ({
      numeroCuota: c.numeroCuota,
      monto: c.monto,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      estado: c.estado,
      abono: c.abono
        ? {
            fecha: c.abono.fecha.toISOString(),
            monto: c.abono.monto,
            metodoPago: c.abono.metodoPago,
            notas: c.abono.notas ?? null,
          }
        : null,
    })),
    generadoEn: new Date().toISOString(),
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(PlanPagosPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const filename = `PlanCobros-${id.slice(0, 8)}.pdf`;
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
