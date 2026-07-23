import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { CajaChicaPDF, type CajaChicaMovData } from "@/components/CajaChicaPDF";
import React from "react";

const CUENTA_ID = "caja-chica-mainstage";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [cuenta, movimientos] = await Promise.all([
    prisma.cuentaBancaria.findUnique({
      where: { id: CUENTA_ID },
      select: {
        movimientosEntrada: { select: { monto: true } },
        movimientosSalida: { select: { monto: true } },
      },
    }),
    prisma.movimientoFinanciero.findMany({
      where: { OR: [{ cuentaOrigenId: CUENTA_ID }, { cuentaDestinoId: CUENTA_ID }] },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { fecha: "desc" },
      take: 200,
    }),
  ]);

  const saldo = (cuenta?.movimientosEntrada.reduce((s, m) => s + m.monto, 0) ?? 0)
              - (cuenta?.movimientosSalida.reduce((s, m) => s + m.monto, 0) ?? 0);

  const movData: CajaChicaMovData[] = movimientos.map(m => ({
    id: m.id,
    fecha: m.fecha.toISOString(),
    concepto: m.concepto,
    categoria: m.categoria?.nombre ?? null,
    metodoPago: m.metodoPago,
    esIngreso: m.cuentaDestinoId === CUENTA_ID,
    monto: m.monto,
  }));

  const totalIngresos = movData.filter(m => m.esIngreso).reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movData.filter(m => !m.esIngreso).reduce((s, m) => s + m.monto, 0);

  const pdfData = { movimientos: movData, saldo, totalIngresos, totalEgresos, generadoEn: new Date().toISOString() };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(CajaChicaPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Caja-Chica-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
