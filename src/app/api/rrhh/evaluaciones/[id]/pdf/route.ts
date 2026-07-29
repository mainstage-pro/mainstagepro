import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import React from "react";
import { EvaluacionEmpleadoPDF, type EvaluacionEmpleadoPDFData } from "@/components/pdf/EvaluacionEmpleadoPDF";
import { METRICAS, safeParseCriterios, safeParseAcuerdos, safeParseObjetivos } from "@/lib/evaluaciones";

export const maxDuration = 60;

function parseObj<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { const v = JSON.parse(raw); return v && typeof v === "object" ? (v as T) : null; } catch { return null; }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const e = await prisma.evaluacionEmpleado.findUnique({
    where: { id },
    include: { personal: { select: { nombre: true, puesto: true, departamento: true } } },
  });
  if (!e) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const metricas: Record<string, number> = {};
  for (const m of METRICAS) metricas[m] = Number((e as Record<string, unknown>)[m]) || 0;

  const data: EvaluacionEmpleadoPDFData = {
    nombre: e.personal.nombre,
    puesto: e.personal.puesto,
    departamento: e.personal.departamento,
    periodo: e.periodo,
    fecha: e.fecha.toISOString(),
    evaluador: e.evaluador,
    estado: e.estado,
    calificacionFinal: e.calificacionFinal,
    puntajeTotal: e.puntajeTotal,
    puntajeGeneral: e.puntajeGeneral,
    puntajePuesto: e.puntajePuesto,
    metricas,
    competenciaNotas: parseObj<Record<string, string>>(e.competenciaNotas) ?? {},
    aspectosPositivos: e.aspectosPositivos,
    areasMejora: e.areasMejora,
    incidentesNota: e.incidentesNota,
    observaciones: e.observaciones,
    criterios: safeParseCriterios(e.criterios),
    objetivos: safeParseObjetivos(e.objetivos),
    acuerdos: safeParseAcuerdos(e.acuerdos),
    autoData: parseObj<EvaluacionEmpleadoPDFData["autoData"]>(e.autoData),
    firmada: e.firmada,
    firmadaNombre: e.firmadaNombre,
    firmadaEn: e.firmadaEn ? e.firmadaEn.toISOString() : null,
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(EvaluacionEmpleadoPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>,
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const slug = e.personal.nombre.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Evaluacion-${slug}-${e.periodo.replace(/[^a-zA-Z0-9]+/g, "-")}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
