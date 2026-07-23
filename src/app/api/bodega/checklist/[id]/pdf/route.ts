import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ChecklistBodegaPDF, type ChecklistItemData } from "@/components/ChecklistBodegaPDF";
import React from "react";

// Misma lógica de semáforo que la página de detalle del checklist
function colorSemaforo(item: { estado: string; cantidadEsperada: number | null; cantidadContada: number | null; equipoCantidadTotal: number | null }): "green" | "orange" | "red" | "gray" {
  const esperada = item.cantidadEsperada ?? item.equipoCantidadTotal ?? 1;
  const contada = item.cantidadContada;
  if (contada === null || contada === undefined) {
    if (item.estado === "EN_BODEGA") return "green";
    if (item.estado === "EN_RENTA_O_USO") return "orange";
    if (item.estado === "EXTRAVIADO" || item.estado === "PERDIDO") return "red";
    return "gray";
  }
  if (contada >= esperada) return "green";
  if (item.estado === "EN_RENTA_O_USO") return "orange";
  return "red";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const checklist = await prisma.checklistBodega.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ categoria: "asc" }, { orden: "asc" }],
        include: { equipo: { select: { cantidadTotal: true } } },
      },
    },
  });

  if (!checklist) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const itemsConColor = checklist.items.map(it => ({
    ...it,
    color: colorSemaforo({
      estado: it.estado,
      cantidadEsperada: it.cantidadEsperada,
      cantidadContada: it.cantidadContada,
      equipoCantidadTotal: it.equipo?.cantidadTotal ?? null,
    }),
  }));

  const total = itemsConColor.length;
  const revisados = itemsConColor.filter(i => i.estado !== "PENDIENTE" || i.cantidadContada !== null).length;
  const verdes = itemsConColor.filter(i => i.color === "green").length;
  const naranjas = itemsConColor.filter(i => i.color === "orange").length;
  const rojos = itemsConColor.filter(i => i.color === "red").length;
  const pct = total > 0 ? Math.round((revisados / total) * 100) : 0;

  const categoriasNombres = [...new Set(itemsConColor.map(i => i.categoria))].sort();
  const categorias = categoriasNombres.map(nombre => ({
    nombre,
    items: itemsConColor
      .filter(i => i.categoria === nombre)
      .sort((a, b) => a.orden - b.orden)
      .map((i): ChecklistItemData => ({
        id: i.id,
        descripcion: i.descripcion,
        categoria: i.categoria,
        estado: i.estado,
        notas: i.notas,
        cantidadEsperada: i.cantidadEsperada ?? i.equipo?.cantidadTotal ?? null,
        cantidadContada: i.cantidadContada,
        color: i.color,
      })),
  }));

  const iso = checklist.fechaInicio.toISOString();
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  const fechaLabel = new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const pdfData = {
    fechaLabel: fechaLabel.charAt(0).toUpperCase() + fechaLabel.slice(1),
    creadoPor: checklist.creadoPor,
    estado: checklist.estado,
    total, verdes, naranjas, rojos, pct,
    categorias,
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ChecklistBodegaPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `attachment; filename="Checklist-Bodega-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
