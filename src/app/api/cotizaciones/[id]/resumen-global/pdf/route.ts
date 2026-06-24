import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ResumenGlobalPDF } from "@/components/ResumenGlobalPDF";
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

  // Buscar la cotización raíz para obtener tratoId / grupoId
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    select: {
      id: true,
      tratoId: true,
      grupoId: true,
      vigenciaDias: true,
      createdAt: true,
      cliente: {
        select: { nombre: true, empresa: true, telefono: true, correo: true },
      },
      trato: {
        select: {
          id: true,
          nombreEvento: true,
          responsable: { select: { name: true } },
        },
      },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Obtener todos los eventos del trato (representante de cada grupo)
  let todasCotizaciones: {
    id: string;
    numeroCotizacion: string;
    nombreCotizacion: string | null;
    nombreEvento: string | null;
    fechaEvento: Date | null;
    lugarEvento: string | null;
    total: number;
    aplicaIva: boolean;
    montoIva: number;
    granTotal: number;
    gastosProduccionActivo: boolean;
    gastosProduccionMonto: number;
    opcionLetra: string;
    grupoId: string | null;
    estado: string;
    createdAt: Date;
  }[] = [];

  const selectFields = {
    id: true,
    numeroCotizacion: true,
    nombreCotizacion: true,
    nombreEvento: true,
    fechaEvento: true,
    lugarEvento: true,
    total: true,
    aplicaIva: true,
    montoIva: true,
    granTotal: true,
    gastosProduccionActivo: true,
    gastosProduccionMonto: true,
    opcionLetra: true,
    grupoId: true,
    estado: true,
    createdAt: true,
  } as const;

  if (cotizacion.tratoId) {
    todasCotizaciones = await prisma.cotizacion.findMany({
      where: { tratoId: cotizacion.tratoId },
      select: selectFields,
      orderBy: { createdAt: "asc" },
    });
  } else if (cotizacion.grupoId) {
    todasCotizaciones = await prisma.cotizacion.findMany({
      where: { grupoId: cotizacion.grupoId },
      select: selectFields,
      orderBy: { createdAt: "asc" },
    });
  } else {
    todasCotizaciones = [await prisma.cotizacion.findUnique({ where: { id }, select: selectFields })] as typeof todasCotizaciones;
  }

  // Agrupar por grupoId y seleccionar representante de cada grupo
  const PRIORIDAD: Record<string, number> = {
    APROBADA: 5, ENVIADA: 4, REENVIADA: 3, EN_REVISION: 2, BORRADOR: 1, RECHAZADA: 0, VENCIDA: 0,
  };
  const grupos = new Map<string, typeof todasCotizaciones[0]>();
  for (const c of todasCotizaciones) {
    const key = c.grupoId ?? c.id;
    const existing = grupos.get(key);
    if (!existing || (PRIORIDAD[c.estado] ?? 0) > (PRIORIDAD[existing.estado] ?? 0)) {
      grupos.set(key, c);
    }
  }
  const eventos = Array.from(grupos.values());

  // Calcular totales
  const totalBruto = eventos.reduce((s, e) => s + e.total, 0);
  const totalGastosProd = eventos.filter(e => e.gastosProduccionActivo).reduce((s, e) => s + e.gastosProduccionMonto, 0);
  const totalIva = eventos.reduce((s, e) => s + (e.aplicaIva ? e.montoIva : 0), 0);
  const granTotalProyecto = eventos.reduce((s, e) => s + e.granTotal, 0);

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data = {
    cliente: cotizacion.cliente,
    trato: cotizacion.trato ? {
      nombreEvento: cotizacion.trato.nombreEvento,
      responsable: cotizacion.trato.responsable,
    } : null,
    eventos: eventos.map(e => ({
      id: e.id,
      numeroCotizacion: e.numeroCotizacion,
      nombreCotizacion: e.nombreCotizacion,
      nombreEvento: e.nombreEvento,
      fechaEvento: e.fechaEvento ? e.fechaEvento.toISOString() : null,
      lugarEvento: e.lugarEvento,
      total: e.total,
      aplicaIva: e.aplicaIva,
      montoIva: e.montoIva,
      granTotal: e.granTotal,
      gastosProduccionActivo: e.gastosProduccionActivo,
      gastosProduccionMonto: e.gastosProduccionMonto,
    })),
    totales: { totalBruto, totalGastosProd, totalIva, granTotalProyecto, numeroEventos: grupos.size },
    vigenciaDias: cotizacion.vigenciaDias,
    createdAt: cotizacion.createdAt.toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ResumenGlobalPDF, { data, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const proyectoLabel = cotizacion.trato?.nombreEvento || cotizacion.cliente.nombre;
  const filename = `CotizacionGlobal-${proyectoLabel.replace(/[^a-zA-Z0-9\-_]/g, "_")}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
