import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { CotizacionPDF } from "@/components/CotizacionPDF";
import React from "react";
import fs from "fs";
import path from "path";

import { validarTokenPresentacion } from "@/lib/presentacion-token";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const token = req.nextUrl.searchParams.get("token");
  const session = await getSession();
  
  if (!session && !validarTokenPresentacion(id, token ?? undefined)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true, tipoCliente: true } },
      trato: { select: { tradeCalificado: true } },
      creadaPor: { select: { name: true } },
      lineas: {
        orderBy: { orden: "asc" },
        select: {
          id: true, tipo: true, descripcion: true, marca: true, modelo: true,
          nivel: true, jornada: true, cantidad: true, dias: true,
          precioUnitario: true, subtotal: true, esIncluido: true, notas: true,
          notasInternas: true,
          equipo: { select: { imagenUrl: true } },
        },
      },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  // Resolve equipment/product images to base64 for react-pdf.
  // Local images (/public) are read from disk; remote images (Vercel Blob) are fetched.
  async function resolveImg(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith("data:")) return url; // already base64
    if (url.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
      }
      return null;
    }
    if (url.startsWith("http")) {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const mime = res.headers.get("content-type") ?? "image/png";
        return `data:${mime};base64,${buf.toString("base64")}`;
      } catch { return null; }
    }
    return null;
  }

  // Los paquetes (PAQUETE) no tienen equipo asociado; su ícono es la primera
  // imagen del paquete, referenciado por paqueteId dentro de notasInternas.
  function getPaqueteId(notasInternas: string | null): string | null {
    if (!notasInternas) return null;
    try { return (JSON.parse(notasInternas).paqueteId as string) || null; } catch { return null; }
  }
  const paqueteIds = [...new Set(
    cotizacion.lineas
      .filter(l => l.tipo === "PAQUETE")
      .map(l => getPaqueteId(l.notasInternas))
      .filter((id): id is string => Boolean(id))
  )];
  const paqueteImgMap = new Map<string, string | null>();
  if (paqueteIds.length > 0) {
    const paquetes = await prisma.paquete.findMany({
      where: { id: { in: paqueteIds } },
      select: { id: true, imagenes: { orderBy: { orden: "asc" }, take: 1, select: { url: true } } },
    });
    for (const p of paquetes) paqueteImgMap.set(p.id, p.imagenes[0]?.url ?? null);
  }

  const cotizacionWithImgs = {
    ...cotizacion,
    tradeCalificado: cotizacion.trato?.tradeCalificado ?? false,
    mainstageTradeData: cotizacion.mainstageTradeData ?? null,
    lineas: await Promise.all(cotizacion.lineas.map(async l => ({
      ...l,
      imagenUrl: await resolveImg(
        l.tipo === "PAQUETE" ? paqueteImgMap.get(getPaqueteId(l.notasInternas) ?? "") : l.equipo?.imagenUrl
      ),
    }))),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(CotizacionPDF, { cotizacion: cotizacionWithImgs, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Cotizacion-${cotizacion.numeroCotizacion}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
