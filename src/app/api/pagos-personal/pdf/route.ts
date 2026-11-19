import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rangoNomina, compararJornada } from "@/lib/ciclo-pago";
import { desgloseBonos, totalPagoPersonal } from "@/lib/pago-personal";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { PagosPersonalPDF, type PagosPersonalPDFData } from "@/components/PagosPersonalPDF";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ciclo, desde, hasta, personalizado } = rangoNomina(req.nextUrl.searchParams);

  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: desde, lte: hasta }, personal: { some: {} } },
    include: {
      cliente: { select: { nombre: true } },
      cotizacion: { select: { subtotalOperacion: true } },
      personal: {
        include: {
          tecnico: { select: { id: true, nombre: true } },
          rolTecnico: { select: { nombre: true } },
          movimiento: { select: { id: true, monto: true } },
        },
        orderBy: [{ participacion: "asc" }, { fechaJornada: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  const proyectosData = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cliente: p.cliente?.nombre ?? "",
    fechaEvento: p.fechaEvento?.toISOString().slice(0, 10) ?? "",
    presupuestoOp: p.cotizacion?.subtotalOperacion ?? 0,
    personal: [...p.personal].sort(compararJornada).map((pp) => {
      const pagoTotal = totalPagoPersonal(pp);
      const tarifaTotal = pagoTotal ?? 0;
      const montoPagado = pp.movimiento?.monto ?? (pp.estadoPago === "PAGADO" ? tarifaTotal : 0);
      const montoPendiente = Math.max(0, tarifaTotal - montoPagado);
      let estadoEfectivo = pp.estadoPago;
      if (tarifaTotal > 0) {
        if (montoPendiente <= 0.01) estadoEfectivo = "PAGADO";
        else if (montoPagado > 0.01) estadoEfectivo = "PARCIAL";
        else estadoEfectivo = "PENDIENTE";
      }

      return {
        tecnicoNombre: pp.tecnico?.nombre ?? null,
        rolNombre: pp.rolTecnico?.nombre ?? null,
        jornada: pp.jornada,
        tarifaAcordada: pp.tarifaAcordada,
        bonos: desgloseBonos(pp),
        pagoTotal,
        montoPagado,
        montoPendiente,
        estadoPago: estadoEfectivo,
      };
    }),
  }));

  const tecMap = new Map<
    string,
    {
      tecnicoNombre: string;
      pagos: {
        proyectoNombre: string;
        monto: number;
        totalTarifa: number;
        montoPagado: number;
        montoPendiente: number;
        estadoPago: string;
      }[];
    }
  >();

  let totalPresupuestado = 0;
  let totalAsignado = 0;

  for (const p of proyectos) {
    totalPresupuestado += p.cotizacion?.subtotalOperacion ?? 0;
    for (const pp of p.personal) {
      const pagoPP = totalPagoPersonal(pp);
      if (pagoPP != null) totalAsignado += pagoPP;
      if (!pp.tecnicoId || !pp.tecnico || pagoPP == null) continue;
      
      const key = pp.tecnicoId;
      if (!tecMap.has(key)) {
        tecMap.set(key, { tecnicoNombre: pp.tecnico.nombre, pagos: [] });
      }
      const entry = tecMap.get(key)!;
      const tarifaSlot = pagoPP;
      const pagadoSlot = pp.movimiento?.monto ?? (pp.estadoPago === "PAGADO" ? tarifaSlot : 0);
      const pendienteSlot = Math.max(0, tarifaSlot - pagadoSlot);

      const existing = entry.pagos.find((x) => x.proyectoNombre === p.nombre);
      if (existing) {
        existing.totalTarifa += tarifaSlot;
        existing.montoPagado += pagadoSlot;
        existing.montoPendiente += pendienteSlot;
        existing.monto = existing.montoPendiente > 0 ? existing.montoPendiente : existing.totalTarifa;
        existing.estadoPago = existing.montoPendiente <= 0.01 ? "PAGADO" : existing.montoPagado > 0.01 ? "PARCIAL" : "PENDIENTE";
      } else {
        const estadoEfectivo = pendienteSlot <= 0.01 ? "PAGADO" : pagadoSlot > 0.01 ? "PARCIAL" : "PENDIENTE";
        entry.pagos.push({
          proyectoNombre: p.nombre,
          monto: pendienteSlot > 0 ? pendienteSlot : tarifaSlot,
          totalTarifa: tarifaSlot,
          montoPagado: pagadoSlot,
          montoPendiente: pendienteSlot,
          estadoPago: estadoEfectivo,
        });
      }
    }
  }

  const nomina = Array.from(tecMap.values())
    .map((t) => ({
      ...t,
      total: t.pagos.reduce((s, x) => s + x.montoPendiente, 0),
      todosPagados: t.pagos.every((x) => x.estadoPago === "PAGADO"),
    }))
    .sort((a, b) => a.tecnicoNombre.localeCompare(b.tecnicoNombre));

  const totalPendiente = nomina.filter((r) => !r.todosPagados).reduce((s, r) => s + r.total, 0);
  const totalPagado = nomina.filter((r) => r.todosPagados).reduce((s, r) => s + r.total, 0);

  const pdfData: PagosPersonalPDFData = {
    ciclo,
    personalizado,
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
    proyectos: proyectosData,
    nomina,
    totalPresupuestado,
    totalAsignado,
    totalPendiente,
    totalPagado,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(PagosPersonalPDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `attachment; filename="Pagos-Personal-${pdfData.ciclo}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
