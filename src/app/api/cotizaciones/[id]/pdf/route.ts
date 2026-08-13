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
      trato: { select: { tradeCalificado: true, tipoEvento: true } },
      paquete: { select: { nombre: true, resumen: true } },
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

  // Las líneas PAQUETE no tienen equipo asociado; representan un producto
  // armado del catálogo. Su ícono es la imagen del producto, referenciado por
  // su id dentro de notasInternas (guardado bajo la clave "paqueteId").
  function getProductoId(notasInternas: string | null): string | null {
    if (!notasInternas) return null;
    try { return (JSON.parse(notasInternas).paqueteId as string) || null; } catch { return null; }
  }
  const productoIds = [...new Set(
    cotizacion.lineas
      .filter(l => l.tipo === "PAQUETE")
      .map(l => getProductoId(l.notasInternas))
      .filter((id): id is string => Boolean(id))
  )];
  const productoImgMap = new Map<string, string | null>();
  if (productoIds.length > 0) {
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      select: { id: true, imagenUrl: true },
    });
    for (const p of productos) {
      productoImgMap.set(p.id, p.imagenUrl ?? null);
    }
  }

  const cotizacionWithImgs = {
    ...cotizacion,
    tradeCalificado: cotizacion.trato?.tradeCalificado ?? false,
    mainstageTradeData: cotizacion.mainstageTradeData ?? null,
    paqueteNombre: cotizacion.paquete?.nombre ?? null,
    paqueteResumen: cotizacion.paquete?.resumen ?? null,
    lineas: await Promise.all(cotizacion.lineas.map(async l => {
      if (l.tipo === "PAQUETE") {
        // El nombre del producto (ya en descripcion) es autodescriptivo; va solo
        // en la columna ancha. Evita amontonar marca+desc en la columna angosta.
        const productoId = getProductoId(l.notasInternas) ?? "";
        return {
          ...l,
          marca: null,
          modelo: null,
          imagenUrl: await resolveImg(productoImgMap.get(productoId)),
        };
      }
      return {
        ...l,
        imagenUrl: await resolveImg(l.equipo?.imagenUrl),
      };
    })),
  };

  // Descripción amigable por categoría según el tipo de evento del trato/cotización.
  const tipoEvento = (cotizacion.tipoEvento ?? cotizacion.trato?.tipoEvento ?? "MUSICAL").toUpperCase();
  const campoDesc = tipoEvento === "SOCIAL" ? "descSocial" : tipoEvento === "EMPRESARIAL" ? "descEmpresarial" : "descMusical";
  const categorias = await prisma.categoriaEquipo.findMany({
    select: { nombre: true, descMusical: true, descSocial: true, descEmpresarial: true },
  });
  const descCategorias: Record<string, string> = {};
  for (const cat of categorias) {
    const txt = (cat as Record<string, string | null>)[campoDesc];
    if (txt) descCategorias[cat.nombre] = txt;
  }

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(CotizacionPDF, { cotizacion: cotizacionWithImgs, logoSrc, descCategorias }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Cotizacion-${cotizacion.numeroCotizacion}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
