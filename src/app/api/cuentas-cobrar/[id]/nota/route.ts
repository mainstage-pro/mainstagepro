import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { NotaCobroPDF } from "@/components/NotaCobroPDF";
import React from "react";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cxc = await prisma.cuentaCobrar.findUnique({
    where: { id },
    include: {
      cliente:       { select: { nombre: true, empresa: true, telefono: true } },
      proyecto:      { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
      cotizacion:    { select: { numeroCotizacion: true, granTotal: true } },
      cuentaDestino: { select: { nombre: true, banco: true } },
      abonos:        { select: { monto: true, fecha: true, metodoPago: true }, orderBy: { fecha: "asc" } },
    },
  });

  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // ── 1. granTotal ────────────────────────────────────────────────────────────
  let granTotal: number | null = cxc.cotizacion?.granTotal ?? null;

  if (!granTotal && cxc.proyectoId) {
    const proy = await prisma.proyecto.findUnique({
      where: { id: cxc.proyectoId },
      select: { cotizacion: { select: { granTotal: true } } },
    });
    granTotal = proy?.cotizacion?.granTotal ?? null;
  }

  // ── 2. Anticipo / Pagos recibidos ───────────────────────────────────────────
  // Sumar todos los abonos o pagos YA REALIZADOS previamente para este proyecto/cotización.
  // 1. Otras CxCs de tipo ANTICIPO del mismo proyecto (id !== cxc.id y solo lo realmente cobrado)
  // 2. Lo que ya se haya cobrado en esta misma CxC (montoCobrado)
  let montoAnticipo: number | null = null;
  let cobradoOtrasCxC = 0;

  if (cxc.proyectoId || cxc.cotizacionId) {
    const otras = await prisma.cuentaCobrar.findMany({
      where: {
        id: { not: cxc.id },
        ...(cxc.proyectoId ? { proyectoId: cxc.proyectoId } : { cotizacionId: cxc.cotizacionId! }),
      },
      select: { monto: true, montoCobrado: true, estado: true, tipoPago: true },
    });

    for (const otra of otras) {
      if (cxc.tipoPago === "LIQUIDACION" || cxc.tipoPago === "TOTAL" || cxc.tipoPago === "OTRO") {
        const pagado = otra.estado === "LIQUIDADO" ? otra.monto : (otra.montoCobrado || 0);
        cobradoOtrasCxC += pagado;
      } else if (otra.tipoPago === "ANTICIPO") {
        const pagado = otra.estado === "LIQUIDADO" ? otra.monto : (otra.montoCobrado || 0);
        cobradoOtrasCxC += pagado;
      }
    }
  }

  const totalRecibido = cobradoOtrasCxC + (cxc.montoCobrado || 0);
  if (totalRecibido > 0) {
    montoAnticipo = totalRecibido;
  }

  // ── 3. Logo ─────────────────────────────────────────────────────────────────
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc  = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  // ── 4. Armar datos para el PDF ───────────────────────────────────────────────
  const notaData = {
    logoSrc,
    id:              cxc.id,
    concepto:        cxc.concepto,
    tipoPago:        cxc.tipoPago,
    monto:           cxc.monto,
    montoOriginal:   cxc.montoOriginal,
    fechaCompromiso: cxc.fechaCompromiso.toISOString(),
    granTotal,
    montoAnticipo,
    montoCobrado:    cxc.montoCobrado,
    estado:          cxc.estado,
    fechaCobroReal:  cxc.fechaCobroReal?.toISOString() ?? null,
    cuentaDestino:   cxc.cuentaDestino ? { nombre: cxc.cuentaDestino.nombre, banco: cxc.cuentaDestino.banco } : null,
    cliente:         cxc.cliente
      ? { nombre: cxc.cliente.nombre, empresa: cxc.cliente.empresa ?? null, telefono: cxc.cliente.telefono ?? null }
      : null,
    proyecto:        cxc.proyecto
      ? { nombre: cxc.proyecto.nombre, numeroProyecto: cxc.proyecto.numeroProyecto, fechaEvento: cxc.proyecto.fechaEvento?.toISOString() ?? null }
      : null,
    cotizacion:      cxc.cotizacion ? { numeroCotizacion: cxc.cotizacion.numeroCotizacion } : null,
    abonos:          cxc.abonos?.map(a => ({
      monto: a.monto,
      fecha: a.fecha.toISOString(),
      metodoPago: a.metodoPago,
    })) ?? [],
  };

  try {
    const pdfStream = await ReactPDF.renderToStream(
      React.createElement(NotaCobroPDF, { nota: notaData }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
        "Content-Disposition": `inline; filename="NotaCobro-${id.slice(-8).toUpperCase()}.pdf"`,
        "Content-Length":      String(pdfBuffer.length),
        "Cache-Control":       "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Error generando nota de cobro PDF:", err);
    return NextResponse.json({ error: "Error al generar PDF", detail: String(err) }, { status: 500 });
  }
}
