import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { CotizacionPDF } from "@/components/CotizacionPDF";
import { makePdfImageResolver } from "@/components/pdf/PdfShared";
import React from "react";
import fs from "fs";
import path from "path";

import { validarTokenPresentacion } from "@/lib/presentacion-token";
import { ensureCotizacionIdiomaColumn, ensureCotizacionHorarioColumns } from "@/lib/migraciones-lazy";
import { traducirTextosCotizacion, extraerNotaLibre, conNotaTraducida } from "@/lib/traduccion-cotizacion";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const token = req.nextUrl.searchParams.get("token");
  const session = await getSession();

  await ensureCotizacionIdiomaColumn();
  await ensureCotizacionHorarioColumns();

  if (!session && !validarTokenPresentacion(id, token ?? undefined)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true, telefono: true, correo: true, tipoCliente: true } },
      trato: { select: { tradeCalificado: true, tipoEvento: true, horaInicioEvento: true, horaFinEvento: true } },
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

  const resolveImg = makePdfImageResolver(path.join(process.cwd(), "public"));

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
    horaInicioEvento: cotizacion.horaInicioEvento ?? cotizacion.trato?.horaInicioEvento ?? null,
    horaFinEvento: cotizacion.horaFinEvento ?? cotizacion.trato?.horaFinEvento ?? null,
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

  // ── Traducción a inglés (solo si la cotización está marcada como idioma "en") ──
  // Los textos fijos de UI se traducen vía diccionario dentro de CotizacionPDF; aquí
  // solo se traducen los textos LIBRES (escritos a mano) que vienen de la base de datos.
  let cotizacionFinal = cotizacionWithImgs;
  let descCategoriasFinal = descCategorias;
  const catLabels: Record<string, string> = {};
  if (cotizacion.idioma === "en") {
    const notasSecciones: Record<string, string> = cotizacion.notasSecciones ? JSON.parse(cotizacion.notasSecciones) : {};
    const textos: Record<string, string> = {};
    if (cotizacion.observaciones) textos["observaciones"] = cotizacion.observaciones;
    if (cotizacion.pagoAnticipadoTexto) textos["pagoAnticipadoTexto"] = cotizacion.pagoAnticipadoTexto;
    if (cotizacion.descuentoManualRazon) textos["descuentoManualRazon"] = cotizacion.descuentoManualRazon;
    if (cotizacion.descuentoPatrocinioNota) textos["descuentoPatrocinioNota"] = cotizacion.descuentoPatrocinioNota;
    if (cotizacion.descuentoEspecialNota) textos["descuentoEspecialNota"] = cotizacion.descuentoEspecialNota;
    if (cotizacion.paquete?.resumen) textos["paqueteResumen"] = cotizacion.paquete.resumen;
    for (const [cat, nota] of Object.entries(notasSecciones)) {
      textos[`catLabel:${cat}`] = cat;
      if (nota) textos[`notaSeccion:${cat}`] = nota;
    }
    for (const [cat, desc] of Object.entries(descCategorias)) {
      textos[`catLabel:${cat}`] = cat;
      textos[`catDesc:${cat}`] = desc;
    }
    for (const l of cotizacion.lineas) {
      if (l.descripcion) textos[`lineaDesc:${l.id}`] = l.descripcion;
      const nota = extraerNotaLibre(l.notas);
      if (nota) textos[`lineaNota:${l.id}`] = nota;
    }

    const traducciones = await traducirTextosCotizacion(cotizacion.id, textos, cotizacion.traduccionEn);

    const notasSeccionesEn: Record<string, string> = {};
    for (const cat of Object.keys(notasSecciones)) {
      notasSeccionesEn[cat] = traducciones[`notaSeccion:${cat}`] ?? notasSecciones[cat];
      catLabels[cat] = traducciones[`catLabel:${cat}`] ?? cat;
    }
    const descCategoriasEn: Record<string, string> = {};
    for (const cat of Object.keys(descCategorias)) {
      descCategoriasEn[cat] = traducciones[`catDesc:${cat}`] ?? descCategorias[cat];
      catLabels[cat] = traducciones[`catLabel:${cat}`] ?? cat;
    }
    descCategoriasFinal = descCategoriasEn;

    cotizacionFinal = {
      ...cotizacionWithImgs,
      observaciones: traducciones["observaciones"] ?? cotizacionWithImgs.observaciones,
      pagoAnticipadoTexto: traducciones["pagoAnticipadoTexto"] ?? cotizacionWithImgs.pagoAnticipadoTexto,
      descuentoManualRazon: traducciones["descuentoManualRazon"] ?? cotizacionWithImgs.descuentoManualRazon,
      descuentoPatrocinioNota: traducciones["descuentoPatrocinioNota"] ?? cotizacionWithImgs.descuentoPatrocinioNota,
      descuentoEspecialNota: traducciones["descuentoEspecialNota"] ?? cotizacionWithImgs.descuentoEspecialNota,
      paqueteResumen: traducciones["paqueteResumen"] ?? cotizacionWithImgs.paqueteResumen,
      notasSecciones: JSON.stringify(notasSeccionesEn),
      lineas: cotizacionWithImgs.lineas.map(l => ({
        ...l,
        descripcion: traducciones[`lineaDesc:${l.id}`] ?? l.descripcion,
        notas: traducciones[`lineaNota:${l.id}`] ? conNotaTraducida(l.notas, traducciones[`lineaNota:${l.id}`]) : l.notas,
      })),
    };
  }

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(CotizacionPDF, {
      cotizacion: cotizacionFinal,
      logoSrc,
      descCategorias: descCategoriasFinal,
      catLabels,
      idioma: cotizacion.idioma === "en" ? "en" : "es",
    }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
