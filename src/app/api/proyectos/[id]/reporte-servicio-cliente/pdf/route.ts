import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReporteServicioCliente } from "@/components/pdf/ReporteServicioCliente";
import { logoBase64, logoBase64Dark, fmtFecha } from "@/components/pdf/PdfShared";
import type { EvalPostEventoData } from "@/lib/evaluacion-post-evento";
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
      direccionVenue: true,
      evaluacionPostEvento: true,
      cliente: { select: { nombre: true, empresa: true } },
      equipos: { select: { cantidad: true, equipo: { select: { descripcion: true } } } },
      cotizacion: { select: { lineas: { select: { tipo: true, descripcion: true, cantidad: true, marca: true } } } },
    },
  });
  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Equipos "en general" (mismo criterio que la evaluación): primero los del
  // proyecto; si no hay (renta), se toman de las líneas de la cotización.
  type Eq = { nombre: string; cantidad: number };
  let equiposFuente: Eq[] = (proyecto.equipos ?? [])
    .map((pe) => ({ nombre: (pe.equipo?.descripcion ?? "").trim(), cantidad: pe.cantidad ?? 1 }))
    .filter((e) => e.nombre);
  if (equiposFuente.length === 0 && proyecto.cotizacion) {
    const tiposEquipo = ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE", "OTRO"];
    equiposFuente = (proyecto.cotizacion.lineas ?? [])
      .filter((l) => tiposEquipo.includes(l.tipo))
      .map((l) => ({ nombre: `${l.marca ? `${l.marca} ` : ""}${l.descripcion ?? ""}`.trim(), cantidad: l.cantidad ?? 1 }))
      .filter((e) => e.nombre);
  }
  const agrupados = new Map<string, number>();
  for (const e of equiposFuente) agrupados.set(e.nombre, (agrupados.get(e.nombre) ?? 0) + e.cantidad);
  const equipos = [...agrupados.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad }));

  // Fecha(s) del evento: un solo día o rango a partir de fechasEvento (JSON).
  let fechasTexto = fmtFecha(proyecto.fechaEvento?.toISOString() ?? null);
  try {
    const fechas: string[] = proyecto.fechasEvento ? JSON.parse(proyecto.fechasEvento) : [];
    if (Array.isArray(fechas) && fechas.length > 1) {
      const ord = [...fechas].sort();
      fechasTexto = `${fmtFecha(ord[0])} al ${fmtFecha(ord[ord.length - 1])}`;
    }
  } catch { /* usa fechaEvento */ }

  const evaluacion = (proyecto.evaluacionPostEvento as EvalPostEventoData | null) ?? null;
  const fotos = (evaluacion?.fotos ?? [])
    .filter((f) => f.tipo === "imagen" && typeof f.url === "string" && f.url.startsWith("http"))
    .map((f) => f.url);

  const publicDir = path.join(process.cwd(), "public");
  const data = {
    numeroProyecto: proyecto.numeroProyecto,
    nombre: proyecto.nombre,
    cliente: { nombre: proyecto.cliente.nombre, empresa: proyecto.cliente.empresa ?? null },
    fechasTexto,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    tipoServicio: proyecto.tipoServicio ?? null,
    equipos,
    fotos,
    logoSrc: logoBase64(publicDir),
    logoSrcDark: logoBase64Dark(publicDir),
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ReporteServicioCliente, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const isPreview = req.nextUrl?.searchParams?.get("preview") === "1";
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="ReporteServicio-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
