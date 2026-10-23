import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { PasivoEstadoCuentaPDF, PasivoPDFData, PasivoCuotaPDF, PasivoAbonoPDF } from "@/components/PasivoEstadoCuentaPDF";
import React from "react";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const pasivo = await prisma.pasivoDeuda.findUnique({
    where: { id },
    include: {
      proveedor: true,
      cuotas: {
        orderBy: { numeroCuota: "asc" },
        include: {
          cuentaPagar: {
            include: {
              cuentaOrigen: true,
              abonos: {
                include: {
                  cuentaOrigen: true,
                },
                orderBy: { fecha: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!pasivo) return NextResponse.json({ error: "Pasivo no encontrado" }, { status: 404 });

  // Si todas las cuotas suman el total pagado o montoPagado >= montoTotal, marcar cuotas como PAGADAS para el reporte
  const saldoPendiente = Math.max(0, pasivo.montoTotal - pasivo.montoPagado);
  const esTotalmentePagado = saldoPendiente === 0;

  // Calcular amortización gradual
  let saldoInsoluto = pasivo.montoTotal;
  const cuotasData: PasivoCuotaPDF[] = pasivo.cuotas.map((c) => {
    saldoInsoluto = Math.max(0, saldoInsoluto - c.monto);

    const primerAbono = c.cuentaPagar?.abonos?.[0];
    const fechaPago = primerAbono
      ? primerAbono.fecha.toISOString()
      : c.cuentaPagar?.fechaPagoReal
      ? c.cuentaPagar.fechaPagoReal.toISOString()
      : null;
    const metodoPago = primerAbono?.metodoPago || (c.cuentaPagar?.estado === "LIQUIDADO" ? "Transferencia" : null);
    const cuentaOrigen = primerAbono?.cuentaOrigen?.nombre || c.cuentaPagar?.cuentaOrigen?.nombre || null;

    // Si la deuda global ya está 100% pagada o la cuota tiene estado PAGADO
    const estado = (esTotalmentePagado || c.estado === "PAGADO") ? "PAGADO" : c.estado;

    return {
      numeroCuota: c.numeroCuota,
      monto: c.monto,
      fechaVencimiento: c.fechaVencimiento.toISOString(),
      estado,
      fechaPago,
      metodoPago,
      cuentaOrigen,
      saldoInsoluto,
    };
  });

  // Recopilar todos los abonos registrados en CXPs de este pasivo
  const abonosData: PasivoAbonoPDF[] = [];
  pasivo.cuotas.forEach((c) => {
    if (c.cuentaPagar?.abonos) {
      c.cuentaPagar.abonos.forEach((a) => {
        abonosData.push({
          id: a.id,
          fecha: a.fecha.toISOString(),
          concepto: c.cuentaPagar?.concepto || `Cuota ${c.numeroCuota}`,
          monto: a.monto,
          metodoPago: a.metodoPago,
          cuentaOrigen: a.cuentaOrigen?.nombre || null,
        });
      });
    }
  });

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const data: PasivoPDFData = {
    id: pasivo.id,
    nombre: pasivo.nombre,
    categoria: pasivo.categoria,
    estado: esTotalmentePagado ? "LIQUIDADO" : pasivo.estado,
    fechaAdquisicion: pasivo.fechaAdquisicion.toISOString(),
    montoTotal: pasivo.montoTotal,
    montoPagado: pasivo.montoPagado,
    tasaInteres: pasivo.tasaInteres,
    notas: pasivo.notas,
    acreedorNombre: pasivo.proveedor?.nombre || pasivo.acreedorNombre || "Acreedor no especificado",
    acreedorEmpresa: pasivo.proveedor?.empresa || null,
    acreedorRFC: pasivo.proveedor?.rfc || null,
    acreedorBanco: pasivo.proveedor?.banco || null,
    acreedorClabe: pasivo.proveedor?.clabe || null,
    cuotas: cuotasData,
    abonos: abonosData,
    generadoEn: new Date().toISOString(),
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(PasivoEstadoCuentaPDF, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const slug = (pasivo.nombre || "Pasivo").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `EstadoCuenta-${slug}-${fecha}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
