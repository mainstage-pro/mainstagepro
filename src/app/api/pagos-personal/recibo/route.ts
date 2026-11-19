import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoNomina, compararJornada } from "@/lib/ciclo-pago";
import { desgloseBonos, totalPagoPersonal } from "@/lib/pago-personal";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { ReciboNominaTecnicoPDF, type ReciboNominaTecnicoPDFData } from "@/components/ReciboNominaTecnicoPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tecnicoId = req.nextUrl.searchParams.get("tecnico");
  
  if (!tecnicoId) return NextResponse.json({ error: "Falta técnico ID" }, { status: 400 });

  const { ciclo, desde, hasta, personalizado } = rangoNomina(req.nextUrl.searchParams);

  const tecnico = await prisma.tecnico.findUnique({
    where: { id: tecnicoId },
    select: { nombre: true }
  });
  
  if (!tecnico) return NextResponse.json({ error: "Técnico no encontrado" }, { status: 404 });

  const asignaciones = await prisma.proyectoPersonal.findMany({
    where: { 
      tecnicoId,
      proyecto: {
        fechaEvento: { gte: desde, lte: hasta }
      },
    },
    include: {
      proyecto: {
        select: { nombre: true, cliente: { select: { nombre: true } }, fechaEvento: true }
      },
      rolTecnico: { select: { nombre: true } }
    },
    orderBy: { proyecto: { fechaEvento: "asc" } }
  });

  const pagos = [...asignaciones]
    .sort((a, b) =>
      (a.proyecto.fechaEvento?.getTime() ?? 0) - (b.proyecto.fechaEvento?.getTime() ?? 0) ||
      compararJornada(a, b)
    )
    .filter(a => totalPagoPersonal(a) != null)
    .map(a => ({
    proyectoNombre: a.proyecto.nombre,
    clienteNombre: a.proyecto.cliente?.nombre ?? "Sin cliente",
    fechaEvento: a.proyecto.fechaEvento ? a.proyecto.fechaEvento.toISOString() : "",
    rolNombre: a.rolTecnico?.nombre ?? null,
    jornada: a.jornada,
    tarifa: a.tarifaAcordada,
    bonos: desgloseBonos(a),
    monto: totalPagoPersonal(a) ?? 0,
    estadoPago: a.estadoPago,
  }));

  const total = pagos.reduce((s, p) => s + p.monto, 0);
  const todosPagados = pagos.length > 0 && pagos.every(p => p.estadoPago === "PAGADO");

  const pdfData: ReciboNominaTecnicoPDFData = {
    tecnicoNombre: tecnico.nombre,
    ciclo,
    personalizado,
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
    pagos,
    total,
    todosPagados
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ReciboNominaTecnicoPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `attachment; filename="Recibo-${tecnico.nombre.replace(/\s+/g, "-")}-${pdfData.ciclo}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
