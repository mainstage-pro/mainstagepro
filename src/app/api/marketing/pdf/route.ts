import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF from "@react-pdf/renderer";
import { ReporteMarketingPDF, ReporteMarketingData } from "@/components/ReporteMarketingPDF";
import React from "react";
import fs from "fs";
import path from "path";

type TabTipo = "ejecucion-organica" | "resultados-organicos" | "ejecucion-campanas" | "resultados-campanas";

function getMesAnterior() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMeses3(endMes: string): string[] {
  const [y, m] = endMes.split("-").map(Number);
  const result: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function mesRange(mes: string): { gte: Date; lt: Date } {
  const [y, m] = mes.split("-").map(Number);
  const gte = new Date(y, m - 1, 1);
  const lt  = new Date(y, m, 1);
  return { gte, lt };
}

const MESES_LABEL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function getMesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES_LABEL[parseInt(m) - 1]} ${y}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url  = new URL(request.url);
  const mes  = url.searchParams.get("mes") ?? getMesAnterior();
  const tipo = (url.searchParams.get("tipo") ?? "ejecucion-organica") as TabTipo;

  // Logo en base64 para react-pdf
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc  = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const mesLabel = getMesLabel(mes);
  const meses3   = getMeses3(mes);
  const range    = mesRange(mes);

  let data: ReporteMarketingData = { mes, mesLabel, tipo, logoSrc };

  // ── Fetch datos según tab ──────────────────────────────────────────────────

  if (tipo === "ejecucion-organica") {
    const [publicaciones, reporte] = await Promise.all([
      prisma.publicacion.findMany({
        where: { fecha: range },
        orderBy: { fecha: "asc" },
        select: {
          id: true, fecha: true, formato: true, objetivo: true, descripcion: true,
          enFacebook: true, enInstagram: true, enTiktok: true, enYoutube: true,
          estado: true, comentarios: true,
          tipo: { select: { nombre: true, formato: true } },
        },
      }),
      prisma.reporteContenidoOrganico.findFirst({ where: { mes } }),
    ]);
    data = {
      ...data,
      publicaciones: publicaciones.map(p => ({
        id: p.id,
        fecha: p.fecha.toISOString(),
        formato: p.formato,
        objetivo: p.objetivo,
        descripcion: p.descripcion,
        enFacebook: p.enFacebook,
        enInstagram: p.enInstagram,
        enTiktok: p.enTiktok,
        enYoutube: p.enYoutube,
        estado: p.estado,
        comentarios: p.comentarios,
        tipo: p.tipo,
      })),
      rpOrganico: reporte
        ? { comentariosGenerales: reporte.comentariosGenerales, logros: reporte.logros }
        : null,
    };
  }

  else if (tipo === "resultados-organicos") {
    // Para métricas comparamos meses completos como string "YYYY-MM"
    const mesesRange = meses3;
    const [metricas, reporte] = await Promise.all([
      prisma.metricaOrganica.findMany({
        where: { mes: { in: mesesRange } },
        select: {
          id: true, mes: true, plataforma: true, seguidores: true, alcance: true,
          impresiones: true, interacciones: true, guardados: true, publicaciones: true,
        },
      }),
      prisma.reporteResultadosOrganicos.findFirst({ where: { mes } }),
    ]);
    data = {
      ...data,
      metricas,
      meses3,
      rpResultados: reporte
        ? {
            analisis: reporte.analisis, propuesta1: reporte.propuesta1,
            propuesta2: reporte.propuesta2, propuesta3: reporte.propuesta3,
            comentariosFinales: reporte.comentariosFinales,
          }
        : null,
    };
  }

  else if (tipo === "ejecucion-campanas") {
    const [ejecuciones, reporte] = await Promise.all([
      prisma.ejecucionCampana.findMany({
        where: { mes },
        orderBy: { fechaInicio: "asc" },
        select: {
          id: true, nombre: true, objetivo: true, canal: true, estado: true,
          fechaInicio: true, fechaFin: true, presupuesto: true,
          alcance: true, impresiones: true, clics: true, ctr: true,
          cantResultados: true, costoResultado: true,
          tipo: { select: { nombre: true } },
        },
      }),
      prisma.reporteCampanasEjecucion.findFirst({ where: { mes } }),
    ]);
    data = {
      ...data,
      ejecuciones: ejecuciones.map(e => ({
        id: e.id,
        nombre: e.nombre,
        objetivo: e.objetivo,
        canal: e.canal,
        estado: e.estado,
        fechaInicio: e.fechaInicio.toISOString(),
        fechaFin: e.fechaFin.toISOString(),
        presupuesto: e.presupuesto != null ? Number(e.presupuesto) : null,
        alcance: e.alcance,
        impresiones: e.impresiones,
        clics: e.clics,
        ctr: e.ctr != null ? Number(e.ctr) : null,
        cantResultados: e.cantResultados,
        costoResultado: e.costoResultado != null ? Number(e.costoResultado) : null,
        tipo: e.tipo,
      })),
      rpCampEj: reporte
        ? { comentariosEjecucion: reporte.comentariosEjecucion, comentariosFinales: reporte.comentariosFinales }
        : null,
    };
  }

  else if (tipo === "resultados-campanas") {
    const [ejecuciones, reporte] = await Promise.all([
      prisma.ejecucionCampana.findMany({
        where: { mes },
        orderBy: { fechaInicio: "asc" },
        select: {
          id: true, nombre: true, objetivo: true, canal: true, estado: true,
          fechaInicio: true, fechaFin: true, presupuesto: true,
          alcance: true, impresiones: true, clics: true, ctr: true,
          cantResultados: true, costoResultado: true,
          tipo: { select: { nombre: true } },
        },
      }),
      prisma.reporteCampanasResultados.findFirst({ where: { mes } }),
    ]);
    data = {
      ...data,
      ejecuciones: ejecuciones.map(e => ({
        id: e.id,
        nombre: e.nombre,
        objetivo: e.objetivo,
        canal: e.canal,
        estado: e.estado,
        fechaInicio: e.fechaInicio.toISOString(),
        fechaFin: e.fechaFin.toISOString(),
        presupuesto: e.presupuesto != null ? Number(e.presupuesto) : null,
        alcance: e.alcance,
        impresiones: e.impresiones,
        clics: e.clics,
        ctr: e.ctr != null ? Number(e.ctr) : null,
        cantResultados: e.cantResultados,
        costoResultado: e.costoResultado != null ? Number(e.costoResultado) : null,
        tipo: e.tipo,
      })),
      rpCampRes: reporte
        ? {
            analisis: reporte.analisis, propuesta1: reporte.propuesta1,
            propuesta2: reporte.propuesta2, propuesta3: reporte.propuesta3,
            comentariosFinales: reporte.comentariosFinales,
          }
        : null,
    };
  }

  // ── Render PDF ─────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfStream = await ReactPDF.renderToStream(React.createElement(ReporteMarketingPDF, { data }) as any);

  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  const pdfBuffer = Buffer.concat(chunks);

  const TIPO_LABELS: Record<string, string> = {
    "ejecucion-organica":   "Ejecucion-Organica",
    "resultados-organicos": "Resultados-Organicos",
    "ejecucion-campanas":   "Ejecucion-Campanas",
    "resultados-campanas":  "Resultados-Campanas",
  };

  const filename = `Reporte-Marketing-${TIPO_LABELS[tipo] ?? tipo}-${mes}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      String(pdfBuffer.length),
    },
  });
}
