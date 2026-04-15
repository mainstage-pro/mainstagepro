import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { InventarioPDF } from "@/components/InventarioPDF";
import React from "react";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo equipos propios y activos, ordenados por categoría
  const equipos = await prisma.equipo.findMany({
    where: { tipo: "PROPIO", activo: true },
    include: { categoria: { select: { nombre: true, orden: true } } },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  // Agrupar por categoría
  const catMap = new Map<string, { nombre: string; orden: number; equipos: typeof equipos }>();
  for (const eq of equipos) {
    const key = eq.categoria.nombre;
    if (!catMap.has(key)) {
      catMap.set(key, { nombre: eq.categoria.nombre, orden: eq.categoria.orden, equipos: [] });
    }
    catMap.get(key)!.equipos.push(eq);
  }
  const categorias = Array.from(catMap.values()).sort((a, b) => a.orden - b.orden);

  const pdfData = {
    categorias: categorias.map(cat => ({
      nombre: cat.nombre,
      orden: cat.orden,
      equipos: cat.equipos.map(eq => ({
        id: eq.id,
        descripcion: eq.descripcion,
        marca: eq.marca,
        modelo: eq.modelo,
        cantidadTotal: eq.cantidadTotal,
        estado: eq.estado,
        notas: eq.notas,
        categoria: { nombre: cat.nombre, orden: cat.orden },
      })),
    })),
    totalEquipos: equipos.length,
    totalUnidades: equipos.reduce((s, e) => s + e.cantidadTotal, 0),
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(InventarioPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Inventario-MainstagePro-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
