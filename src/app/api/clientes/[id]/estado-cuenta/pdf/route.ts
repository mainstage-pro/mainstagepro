import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { EstadoCuentaPDF, EstadoCuentaLinea } from "@/components/EstadoCuentaPDF";
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

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { id: true, nombre: true, empresa: true, empresaId: true },
  });
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const empresaId = cliente.empresaId;

  const cuentasCobrar = await prisma.cuentaCobrar.findMany({
    where: {
      OR: [
        { clienteId: id },
        ...(empresaId ? [{ empresaId }] : []),
      ],
    },
    select: {
      id: true,
      concepto: true,
      monto: true,
      montoCobrado: true,
      estado: true,
      fechaCompromiso: true,
      cotizacion: { select: { numeroCotizacion: true } },
      proyecto: { select: { numeroProyecto: true, nombre: true } },
    },
    orderBy: { fechaCompromiso: "asc" },
  });

  type CxPRow = {
    id: string; concepto: string; monto: number; montoPagado: number; estado: string;
    fechaCompromiso: Date; proveedor: { nombre: string } | null;
    proyecto: { numeroProyecto: string; nombre: string } | null;
  };
  let cuentasPagar: CxPRow[] = [];
  if (empresaId) {
    cuentasPagar = await prisma.cuentaPagar.findMany({
      where: {
        OR: [
          { empresaId },
          { proveedor: { empresaId } },
        ],
      },
      select: {
        id: true,
        concepto: true,
        monto: true,
        montoPagado: true,
        estado: true,
        fechaCompromiso: true,
        proveedor: { select: { nombre: true } },
        proyecto: { select: { numeroProyecto: true, nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    });
  }

  const porCobrar: EstadoCuentaLinea[] = cuentasCobrar.map((c) => ({
    id: c.id,
    concepto: c.concepto,
    referencia: c.cotizacion?.numeroCotizacion ?? (c.proyecto ? `#${c.proyecto.numeroProyecto}` : null),
    detalle: c.proyecto?.nombre ?? null,
    fecha: c.fechaCompromiso.toISOString(),
    monto: c.monto,
    pagado: c.montoCobrado,
    estado: c.estado,
  }));

  const porPagar: EstadoCuentaLinea[] = cuentasPagar.map((c) => ({
    id: c.id,
    concepto: c.concepto,
    referencia: c.proyecto ? `#${c.proyecto.numeroProyecto}` : null,
    detalle: c.proveedor?.nombre ?? c.proyecto?.nombre ?? null,
    fecha: c.fechaCompromiso.toISOString(),
    monto: c.monto,
    pagado: c.montoPagado,
    estado: c.estado,
  }));

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data = {
    logoSrc,
    cliente: cliente.nombre,
    empresa: cliente.empresa ?? null,
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

  const slug = cliente.nombre.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
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
