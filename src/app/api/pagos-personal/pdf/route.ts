import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { PagosPersonalPDF, type PagosPersonalPDFData } from "@/components/PagosPersonalPDF";
import React from "react";

function cicloDesde(cicloDate: Date): { desde: Date; hasta: Date } {
  const ciclo = new Date(cicloDate);
  ciclo.setHours(12, 0, 0, 0);
  const desde = new Date(ciclo);
  desde.setDate(desde.getDate() - 6);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(ciclo);
  hasta.setDate(hasta.getDate() - 1);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cicloStr = req.nextUrl.searchParams.get("ciclo");
  const cicloDate = cicloStr
    ? new Date(cicloStr + "T12:00:00Z")
    : (() => {
        const d = new Date();
        const dow = d.getDay();
        d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
        return d;
      })();

  const { desde, hasta } = cicloDesde(cicloDate);

  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: desde, lte: hasta }, personal: { some: {} } },
    include: {
      cliente: { select: { nombre: true } },
      cotizacion: { select: { subtotalOperacion: true } },
      personal: {
        include: {
          tecnico: { select: { id: true, nombre: true } },
          rolTecnico: { select: { nombre: true } },
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
    personal: p.personal.map((pp) => ({
      tecnicoNombre: pp.tecnico?.nombre ?? null,
      rolNombre: pp.rolTecnico?.nombre ?? null,
      jornada: pp.jornada,
      tarifaAcordada: pp.tarifaAcordada,
      estadoPago: pp.estadoPago,
    })),
  }));

  const tecMap = new Map<
    string,
    {
      tecnicoNombre: string;
      pagos: { proyectoNombre: string; monto: number; estadoPago: string }[];
    }
  >();

  let totalPresupuestado = 0;
  let totalAsignado = 0;

  for (const p of proyectos) {
    totalPresupuestado += p.cotizacion?.subtotalOperacion ?? 0;
    for (const pp of p.personal) {
      if (pp.tarifaAcordada != null) totalAsignado += pp.tarifaAcordada;
      if (!pp.tecnicoId || !pp.tecnico || pp.tarifaAcordada == null) continue;
      
      const key = pp.tecnicoId;
      if (!tecMap.has(key)) {
        tecMap.set(key, { tecnicoNombre: pp.tecnico.nombre, pagos: [] });
      }
      const entry = tecMap.get(key)!;
      const existing = entry.pagos.find((x) => x.proyectoNombre === p.nombre);
      if (existing) {
        existing.monto += pp.tarifaAcordada;
        if (pp.estadoPago !== "PAGADO") existing.estadoPago = "PENDIENTE";
      } else {
        entry.pagos.push({
          proyectoNombre: p.nombre,
          monto: pp.tarifaAcordada,
          estadoPago: pp.estadoPago,
        });
      }
    }
  }

  const nomina = Array.from(tecMap.values())
    .map((t) => ({
      ...t,
      total: t.pagos.reduce((s, x) => s + x.monto, 0),
      todosPagados: t.pagos.every((x) => x.estadoPago === "PAGADO"),
    }))
    .sort((a, b) => a.tecnicoNombre.localeCompare(b.tecnicoNombre));

  const totalPendiente = nomina.filter((r) => !r.todosPagados).reduce((s, r) => s + r.total, 0);
  const totalPagado = nomina.filter((r) => r.todosPagados).reduce((s, r) => s + r.total, 0);

  const pdfData: PagosPersonalPDFData = {
    ciclo: cicloDate.toISOString().slice(0, 10),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
