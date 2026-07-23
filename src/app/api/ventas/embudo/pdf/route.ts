import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { EmbudoVentasPDF, type EmbudoTratoData } from "@/components/EmbudoVentasPDF";
import React from "react";

const ETAPAS: { etapa: string; label: string }[] = [
  { etapa: "PROSPECCION", label: "Prospección" },
  { etapa: "DESCUBRIMIENTO", label: "Descubrimiento" },
  { etapa: "OPORTUNIDAD", label: "Oportunidad" },
  { etapa: "VENTA_CERRADA", label: "Venta cerrada" },
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tratos = await prisma.trato.findMany({
    where: { etapa: { not: "VENTA_PERDIDA" } },
    include: {
      cliente: { select: { nombre: true } },
      responsable: { select: { name: true } },
    },
    orderBy: { fechaProximaAccion: "asc" },
  });

  const etapas = ETAPAS.map(({ etapa, label }) => {
    const enEtapa = tratos.filter(t => t.etapa === etapa);
    const tratosData: EmbudoTratoData[] = enEtapa.map(t => ({
      id: t.id,
      nombreEvento: t.nombreEvento ?? "Sin nombre",
      cliente: t.cliente.nombre,
      responsable: t.responsable?.name ?? null,
      presupuesto: t.presupuestoEstimado ?? null,
      fechaEvento: t.fechaEventoEstimada ? t.fechaEventoEstimada.toISOString() : null,
      proximaAccion: t.proximaAccion ?? null,
    }));
    return {
      etapa, label,
      count: enEtapa.length,
      valor: enEtapa.reduce((s, t) => s + (t.presupuestoEstimado ?? 0), 0),
      tratos: tratosData,
    };
  });

  const activos = tratos.filter(t => t.etapa !== "VENTA_CERRADA");
  const pdfData = {
    etapas,
    totalActivos: activos.length,
    valorPipeline: activos.reduce((s, t) => s + (t.presupuestoEstimado ?? 0), 0),
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(EmbudoVentasPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `attachment; filename="Embudo-Ventas-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
