import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { CuentasReportePDF, type CuentaReporteRow } from "@/components/CuentasReportePDF";
import React from "react";

const ACTIVO = { estado: { notIn: ["LIQUIDADO", "CANCELADO"] } };

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo: "cobrar" | "pagar" = req.nextUrl.searchParams.get("tipo") === "pagar" ? "pagar" : "cobrar";
  const hoyStr = new Date().toISOString().slice(0, 10);

  let rows: CuentaReporteRow[];

  if (tipo === "cobrar") {
    const cuentas = await prisma.cuentaCobrar.findMany({
      where: ACTIVO,
      include: {
        cliente: { select: { nombre: true } },
        empresa: { select: { nombre: true } },
        proyecto: { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
      },
      orderBy: [{ proyecto: { fechaEvento: "asc" } }, { fechaCompromiso: "asc" }],
    });
    rows = cuentas.map((c) => {
      const fecha = c.fechaCompromiso.toISOString();
      return {
        id: c.id,
        fechaCompromiso: fecha,
        entidad: c.empresa?.nombre ?? c.cliente?.nombre ?? "Sin cliente",
        concepto: c.concepto,
        proyecto: c.proyecto ? `${c.proyecto.numeroProyecto} · ${c.proyecto.nombre}` : null,
        monto: c.monto,
        pagado: c.montoCobrado,
        saldo: c.monto - c.montoCobrado,
        estado: c.estado,
        vencida: fecha.slice(0, 10) < hoyStr,
      };
    });
  } else {
    const cuentas = await prisma.cuentaPagar.findMany({
      where: ACTIVO,
      include: {
        tecnico: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
        empresa: { select: { nombre: true } },
        socio: { select: { nombre: true } },
        proyecto: { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
      },
      orderBy: [{ proyecto: { fechaEvento: "asc" } }, { fechaCompromiso: "asc" }],
    });
    rows = cuentas.map((c) => {
      const fecha = c.fechaCompromiso.toISOString();
      return {
        id: c.id,
        fechaCompromiso: fecha,
        entidad: c.empresa?.nombre ?? c.proveedor?.nombre ?? c.tecnico?.nombre ?? c.socio?.nombre ?? "Sin acreedor",
        concepto: c.concepto,
        proyecto: c.proyecto ? `${c.proyecto.numeroProyecto} · ${c.proyecto.nombre}` : null,
        monto: c.monto,
        pagado: c.montoPagado,
        saldo: c.monto - c.montoPagado,
        estado: c.estado,
        vencida: fecha.slice(0, 10) < hoyStr,
      };
    });
  }

  const totalPendiente = rows.reduce((s, r) => s + r.saldo, 0);
  const totalVencido = rows.filter((r) => r.vencida).reduce((s, r) => s + r.saldo, 0);
  const totalCubierto = rows.reduce((s, r) => s + r.pagado, 0);

  const pdfData = { tipo, rows, totalPendiente, totalVencido, totalCubierto, generadoEn: new Date().toISOString() };

  const pdfStream = await ReactPDF.renderToStream(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(CuentasReportePDF, { data: pdfData }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = tipo === "cobrar" ? "Cuentas-por-Cobrar" : "Cuentas-por-Pagar";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
