import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { VisionSemanalPDF, type VisionSemanalPDFData } from "@/components/VisionSemanalPDF";
import React from "react";
import path from "path";
import fs from "fs";
import {
  VISION_CONFIG,
  PREPRODUCCION_EXTRA_VACIO,
  ensureVisionSemanalTable,
  isVisionArea,
  puntosDefault,
  semanaKey,
  tareasDelArea,
  proyectosDelArea,
  type EntregaPunto,
} from "@/lib/vision-semanal";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");
  const semana = searchParams.get("semana") || semanaKey();

  if (!isVisionArea(area)) {
    return NextResponse.json({ error: "Área inválida" }, { status: 400 });
  }

  await ensureVisionSemanalTable();

  const doc = await prisma.visionSemanal.findUnique({
    where: { area_semana: { area, semana } },
    include: {
      autor: { select: { name: true } },
      responsable: { select: { name: true } },
    },
  });

  const config = VISION_CONFIG[area];
  const entregaInfo: EntregaPunto[] = doc
    ? (doc.entregaInfo as unknown as EntregaPunto[])
    : puntosDefault(area);
  const extra = doc
    ? { ...PREPRODUCCION_EXTRA_VACIO, ...(doc.extra as object) }
    : PREPRODUCCION_EXTRA_VACIO;

  // Tareas y proyectos solo se muestran cuando aportan a las secciones tabulares.
  const [tareas, proyectos] = await Promise.all([
    config.tipo === "STANDARD" ? tareasDelArea(area) : Promise.resolve([]),
    proyectosDelArea(area),
  ]);

  const data: VisionSemanalPDFData = {
    areaLabel: config.label,
    tipo: config.tipo,
    entregaLabel: config.entregaLabel,
    semana,
    enfoque: doc?.enfoque ?? "",
    entregaInfo,
    desbloqueo: doc?.desbloqueo ?? "",
    comentarios: doc?.comentarios ?? "",
    extra,
    responsable: doc?.responsable ?? null,
    autor: doc?.autor ?? null,
    actualizadoEn: doc?.updatedAt?.toISOString() ?? null,
    tareas: tareas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      prioridad: t.prioridad,
      estado: t.estado,
      fecha: t.fecha,
      asignadoA: t.asignadoA ? { name: t.asignadoA.name } : null,
    })),
    proyectos: proyectos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      estado: p.estado,
      porcentajeAvance: p.porcentajeAvance,
      fechaFin: p.fechaFin,
      totalFases: p.totalFases,
      fasesCompletadas: p.fasesCompletadas,
      lider: p.lider ? { name: p.lider.name } : null,
    })),
  };

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(VisionSemanalPDF, { data, logoSrc }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const isPreview = searchParams.get("preview") === "1";
  const filename = `VisionSemanal-${config.label.replace(/\s+/g, "")}-${semana}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
