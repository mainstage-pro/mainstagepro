import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { MantenimientoEquiposPDF, type MantenimientoRegistroData } from "@/components/MantenimientoEquiposPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Filtro opcional por día: ?fecha=YYYY-MM-DD
  const fechaParam = req.nextUrl.searchParams.get("fecha");
  let where: Record<string, unknown> = {};
  let diaLabel: string | null = null;
  if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
    const [y, m, d] = fechaParam.split("-").map(Number);
    const desde = new Date(y, m - 1, d, 0, 0, 0, 0);
    const hasta = new Date(y, m - 1, d, 23, 59, 59, 999);
    where = { fecha: { gte: desde, lte: hasta } };
    diaLabel = desde.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  }

  const registros = await prisma.mantenimientoEquipo.findMany({
    where,
    include: {
      equipo: {
        select: {
          id: true,
          descripcion: true,
          marca: true,
          modelo: true,
          categoria: { select: { nombre: true, orden: true } },
        },
      },
      unidad: { select: { codigo: true } },
    },
    orderBy: { fecha: "desc" },
  });

  // Agrupar por categoría del equipo
  const catMap = new Map<string, { nombre: string; orden: number; registros: MantenimientoRegistroData[] }>();
  const equiposConHistorial = new Set<string>();
  for (const r of registros) {
    equiposConHistorial.add(r.equipo.id);
    const nombre = r.equipo.categoria?.nombre ?? "Sin categoría";
    const orden = r.equipo.categoria?.orden ?? 999;
    if (!catMap.has(nombre)) catMap.set(nombre, { nombre, orden, registros: [] });
    catMap.get(nombre)!.registros.push({
      id: r.id,
      fecha: r.fecha.toISOString(),
      tipo: r.tipo,
      accionRealizada: r.accionRealizada,
      comentarios: r.comentarios,
      proximoMantenimiento: r.proximoMantenimiento ? r.proximoMantenimiento.toISOString() : null,
      equipoDescripcion: r.equipo.descripcion,
      equipoMarca: r.equipo.marca,
      equipoModelo: r.equipo.modelo,
      unidadCodigo: r.unidad?.codigo ?? null,
    });
  }
  const categorias = Array.from(catMap.values()).sort((a, b) => a.orden - b.orden);

  const pdfData = {
    categorias,
    totalRegistros: registros.length,
    totalEquipos: equiposConHistorial.size,
    diaLabel,
    generadoEn: new Date().toISOString(),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(MantenimientoEquiposPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = fechaParam && diaLabel ? fechaParam : new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Mantenimiento-Equipos-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
