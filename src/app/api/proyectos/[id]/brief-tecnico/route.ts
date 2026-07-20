import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { BriefTecnico } from "@/components/pdf/BriefTecnico";
import { logoBase64 } from "@/components/pdf/PdfShared";
import React from "react";
import path from "path";

export async function GET(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyecto = await (prisma.proyecto.findUnique as any)({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      encargado: { select: { name: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const logoSrc = logoBase64(path.join(process.cwd(), "public"));

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(BriefTecnico, {
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        numeroProyecto: proyecto.numeroProyecto,
        tipoEvento: proyecto.tipoEvento,
        tipoServicio: proyecto.tipoServicio ?? null,
        fechaEvento: proyecto.fechaEvento?.toISOString() ?? "",
        fechasEvento: proyecto.fechasEvento ?? null,
        horariosEvento: proyecto.horariosEvento ?? null,
        horaInicioEvento: proyecto.horaInicioEvento ?? null,
        horaFinEvento: proyecto.horaFinEvento ?? null,
        fechaMontaje: proyecto.fechaMontaje?.toISOString() ?? null,
        horaMontaje: proyecto.horaMontaje ?? null,
        horaInicioMontaje: proyecto.horaInicioMontaje ?? null,
        duracionMontajeHrs: proyecto.duracionMontajeHrs ?? null,
        horaSalidaBodega: proyecto.horaSalidaBodega ?? null,
        puntoSalidaBodega: proyecto.puntoSalidaBodega ?? null,
        horaDesmontaje: proyecto.horaDesmontaje ?? null,
        llamadoBodega: proyecto.llamadoBodega?.toISOString() ?? null,
        lugarLlamado: proyecto.lugarLlamado ?? null,
        lugarEvento: proyecto.lugarEvento ?? null,
        direccionVenue: proyecto.direccionVenue ?? null,
        linkMaps: proyecto.linkMaps ?? null,
        indicacionesAcceso: proyecto.indicacionesAcceso ?? null,
        encargadoLugar: proyecto.encargadoLugar ?? null,
        encargadoLugarContacto: proyecto.encargadoLugarContacto ?? null,
        encargadoCliente: proyecto.encargadoCliente ?? null,
        encargadoClienteContacto: proyecto.encargadoClienteContacto ?? null,
        contactosEmergencia: proyecto.contactosEmergencia ?? null,
        transportes: proyecto.transportes ?? null,
        choferNombre: proyecto.choferNombre ?? null,
        comentariosFinales: proyecto.comentariosFinales ?? null,
        notasBriefTecnico: proyecto.notasBriefTecnico ?? null,
        cliente: {
          nombre: proyecto.cliente.nombre,
          empresa: proyecto.cliente.empresa ?? null,
        },
        encargado: proyecto.encargado ? { name: proyecto.encargado.name } : null,
      },
      logoSrc,
    }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const buf = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const isPreview = req.nextUrl?.searchParams?.get('preview') === '1';
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="info-tecnicos-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(buf.length),
    },
  });
}
