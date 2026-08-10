import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { AsistenciaPDF, type AsistenciaEmpleadoData } from "@/components/AsistenciaPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes");
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fin = req.nextUrl.searchParams.get("fin");
  const where: Record<string, unknown> = {};
  let periodoLabel = "Historial completo";
  let fechaNombrePdf = new Date().toISOString().slice(0, 10);

  if (inicio && fin) {
    const dInicio = new Date(inicio + "T00:00:00");
    const dFin = new Date(fin + "T23:59:59");
    where.fecha = { gte: dInicio, lte: dFin };
    periodoLabel = `Del ${dInicio.getDate()} de ${dInicio.toLocaleDateString("es-MX", { month: "long" })} al ${dFin.getDate()} de ${dFin.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}`;
    fechaNombrePdf = `Semanal-${inicio}-al-${fin}`;
  } else if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    where.fecha = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    periodoLabel = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    fechaNombrePdf = mes;
  }

  const asistencias = await prisma.asistencia.findMany({
    where,
    include: { personal: { select: { id: true, nombre: true, puesto: true } } },
    orderBy: { fecha: "desc" },
  });

  const map = new Map<string, AsistenciaEmpleadoData>();
  for (const a of asistencias) {
    const id = a.personal.id;
    if (!map.has(id)) {
      map.set(id, {
        personalId: id, nombre: a.personal.nombre, puesto: a.personal.puesto,
        presente: 0, falta: 0, retardo: 0, permiso: 0, vacaciones: 0, incapacidad: 0,
        minutosRetardo: 0, totalDias: 0,
      });
    }
    const e = map.get(id)!;
    e.totalDias++;
    e.minutosRetardo += a.minutosRetardo ?? 0;
    if (a.estado === "PRESENTE") e.presente++;
    else if (a.estado === "FALTA") e.falta++;
    else if (a.estado === "RETARDO") e.retardo++;
    else if (a.estado === "PERMISO") e.permiso++;
    else if (a.estado === "VACACIONES") e.vacaciones++;
    else if (a.estado === "INCAPACIDAD") e.incapacidad++;
  }
  const empleados = Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const pdfData = {
    empleados,
    periodoLabel,
    totalRegistros: asistencias.length,
    totalPresentes: empleados.reduce((s, e) => s + e.presente, 0),
    totalFaltas: empleados.reduce((s, e) => s + e.falta, 0),
    totalRetardos: empleados.reduce((s, e) => s + e.retardo, 0),
  };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(AsistenciaPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Asistencia-${fechaNombrePdf}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
