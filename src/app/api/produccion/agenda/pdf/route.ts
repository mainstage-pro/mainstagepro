import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { AgendaEventosPDF, type AgendaEventoData } from "@/components/AgendaEventosPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes");
  let desde: Date, hasta: Date, periodoLabel: string;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    desde = new Date(y, m - 1, 1);
    hasta = new Date(y, m, 1);
    periodoLabel = desde.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  } else {
    const now = new Date();
    desde = new Date(now.getFullYear(), now.getMonth(), 1);
    hasta = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    periodoLabel = desde.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  }

  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: desde, lt: hasta }, estado: { not: "CANCELADO" } },
    include: {
      cliente: { select: { nombre: true } },
      encargado: { select: { name: true } },
    },
    orderBy: { fechaEvento: "asc" },
  });

  const eventos: AgendaEventoData[] = proyectos.map(p => ({
    id: p.id,
    numeroProyecto: p.numeroProyecto,
    nombre: p.nombre,
    cliente: p.cliente.nombre,
    estado: p.estado,
    tipoEvento: p.tipoEvento,
    fechaEvento: p.fechaEvento.toISOString(),
    horaInicio: p.horaInicioEvento ?? p.horaInicio ?? null,
    lugar: p.lugarEvento ?? p.direccionVenue ?? null,
    encargado: p.encargado?.name ?? null,
  }));

  const pdfData = {
    eventos,
    periodoLabel,
    totalEventos: eventos.length,
    confirmados: eventos.filter(e => e.estado === "CONFIRMADO" || e.estado === "EN_CURSO").length,
    enPlaneacion: eventos.filter(e => e.estado === "PLANEACION").length,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(AgendaEventosPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = mes ?? new Date().toISOString().slice(0, 7);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Agenda-Eventos-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
