import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReporteEvaluacion } from "@/components/pdf/ReporteEvaluacion";
import { logoBase64, logoBase64Dark, fmtFecha } from "@/components/pdf/PdfShared";
import { emptyEvalData, getEvalConfig, type EvalPostEventoData } from "@/lib/evaluacion-post-evento";
import React from "react";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureOperacionTecnicaColumns();
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      nombre: true,
      numeroProyecto: true,
      tipoServicio: true,
      fechaEvento: true,
      fechasEvento: true,
      lugarEvento: true,
      evaluacionPostEvento: true,
      cliente: { select: { nombre: true, empresa: true } },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Fecha(s) del evento: un solo día o rango a partir de fechasEvento (JSON).
  let fechasTexto = fmtFecha(proyecto.fechaEvento?.toISOString() ?? null);
  try {
    const fechas: string[] = proyecto.fechasEvento ? JSON.parse(proyecto.fechasEvento) : [];
    if (Array.isArray(fechas) && fechas.length > 1) {
      const ord = [...fechas].sort();
      fechasTexto = `${fmtFecha(ord[0])} al ${fmtFecha(ord[ord.length - 1])}`;
    }
  } catch { /* usa fechaEvento */ }

  const evaluacion = (proyecto.evaluacionPostEvento as EvalPostEventoData | null) ?? emptyEvalData();
  const config = getEvalConfig(proyecto.tipoServicio ?? null);

  const publicDir = path.join(process.cwd(), "public");
  const data = {
    numeroProyecto: proyecto.numeroProyecto,
    nombre: proyecto.nombre,
    cliente: { nombre: proyecto.cliente.nombre, empresa: proyecto.cliente.empresa ?? null },
    tipoServicio: proyecto.tipoServicio ?? null,
    fechasTexto,
    lugarEvento: proyecto.lugarEvento ?? null,
    evaluacion,
    logoSrc: logoBase64(publicDir),
    logoSrcDark: logoBase64Dark(publicDir),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ReporteEvaluacion, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  const nombreArchivo = config.variante === "renta" ? "EvaluacionPostRenta" : "EvaluacionPostEvento";
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${nombreArchivo}-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
