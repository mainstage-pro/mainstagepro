import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaCliente, FichaClienteData } from "@/components/pdf/FichaCliente";
import { logoBase64, logoBase64Dark, EquipoFlat } from "@/components/pdf/PdfShared";
import React from "react";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyecto = await (prisma.proyecto.findUnique as any)({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true } },
      encargado: { select: { name: true } },
      equipos: {
        include: {
          equipo: { select: { descripcion: true, marca: true, categoria: { select: { nombre: true } } } },
          proveedor: { select: { nombre: true } },
          riderAccesorios: { orderBy: { orden: "asc" } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoSrc = logoBase64(path.join(process.cwd(), "public"));
  const logoSrcDark = logoBase64Dark(path.join(process.cwd(), "public"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipos: EquipoFlat[] = (proyecto.equipos ?? []).map((e: any) => ({
    descripcion: e.equipo?.descripcion ?? "",
    marca: e.equipo?.marca ?? null,
    categoria: e.equipo?.categoria?.nombre ?? "General",
    cantidad: e.cantidad,
    tipo: e.tipo,
    confirmado: e.confirmado,
    proveedor: e.proveedor?.nombre ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accesorios: (e.riderAccesorios ?? []).map((a: any) => ({
      nombre: a.nombre, cantidad: a.cantidad, categoria: a.categoria ?? null,
    })),
  }));

  const data: FichaClienteData = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    estado: proyecto.estado,
    tipoEvento: proyecto.tipoEvento,
    tipoServicio: proyecto.tipoServicio ?? null,
    zona: proyecto.zona ?? "LOCAL",
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    fechasEvento: proyecto.fechasEvento ?? null,
    horariosEvento: proyecto.horariosEvento ?? null,
    fechaMontaje: proyecto.fechaMontaje?.toISOString() ?? null,
    horaInicioMontaje: proyecto.horaInicioMontaje ?? null,
    horaInicioEvento: proyecto.horaInicioEvento ?? null,
    horaFinEvento: proyecto.horaFinEvento ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    horaDesmontaje: proyecto.horaDesmontaje ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesCliente: proyecto.indicacionesCliente ?? null,
    encargadoNombre: proyecto.encargado?.name ?? null,
    cliente: { nombre: proyecto.cliente.nombre, empresa: proyecto.cliente.empresa ?? null },
    equipos,
    logoSrc,
    logoSrcDark,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FichaCliente, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const buf = Buffer.concat(chunks);

  const isPreview = req.nextUrl?.searchParams?.get('preview') === '1';
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="confirmacion-cliente-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(buf.length),
    },
  });
}
