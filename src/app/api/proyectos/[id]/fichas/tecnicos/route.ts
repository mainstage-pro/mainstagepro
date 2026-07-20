import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaTecnicos } from "@/components/pdf/FichaTecnicos";
import { logoBase64, EquipoFlat, TransporteSlot } from "@/components/pdf/PdfShared";
import { ProveedorEvento } from "@/components/pdf/FichaCoordinador";
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
      encargado: { select: { name: true } },
      personal: {
        include: {
          tecnico: { select: { nombre: true, celular: true, rol: { select: { nombre: true } } } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
      equipos: {
        include: {
          equipo: { select: { descripcion: true, marca: true, imagenUrl: true, categoria: { select: { nombre: true } } } },
          proveedor: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
      proveedoresEvento: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoSrc = logoBase64(path.join(process.cwd(), "public"));

  // Parse transportes JSON
  let transportes: TransporteSlot[] = [];
  try {
    const raw = proyecto.transportes ? JSON.parse(proyecto.transportes) : [];
    transportes = Array.isArray(raw) ? raw : [];
    if (transportes.length > 0) {
      const vehiculoIds = transportes.map((t: TransporteSlot) => t.vehiculoId).filter(Boolean);
      const choferIds = transportes.map((t: TransporteSlot) => t.choferId).filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [vehiculos, choferes] = await Promise.all([
        vehiculoIds.length > 0 ? (prisma.vehiculo as any).findMany({ where: { id: { in: vehiculoIds } }, select: { id: true, nombre: true } }) : [],
        choferIds.length > 0 ? (prisma.tecnico as any).findMany({ where: { id: { in: choferIds } }, select: { id: true, nombre: true } }) : [],
      ]);
      const vMap = new Map(vehiculos.map((v: { id: string; nombre: string }) => [v.id, v.nombre]));
      const cMap = new Map(choferes.map((c: { id: string; nombre: string }) => [c.id, c.nombre]));
      transportes = transportes.map((t: TransporteSlot): TransporteSlot => ({
        ...t,
        vehiculoNombre: (vMap.get(t.vehiculoId) ?? t.vehiculoId) as string,
        choferNombre: (cMap.get(t.choferId) ?? t.choferId) as string,
      }));
    }
  } catch { /* ignore */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipos: EquipoFlat[] = (proyecto.equipos ?? []).map((e: any) => ({
    descripcion: e.equipo?.descripcion ?? "",
    marca: e.equipo?.marca ?? null,
    categoria: e.equipo?.categoria?.nombre ?? "Sin categoría",
    cantidad: e.cantidad,
    tipo: e.tipo,
    confirmado: e.confirmado,
    proveedor: e.proveedor?.nombre ?? null,
    imagenUrl: e.equipo?.imagenUrl ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proveedoresEvento: ProveedorEvento[] = (proyecto.proveedoresEvento ?? []).map((p: any) => ({
    nombreProveedor: p.nombreProveedor,
    servicioEquipo: p.servicioEquipo ?? null,
    telefonoProveedor: p.telefonoProveedor ?? null,
  }));

  const data = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    horaSalidaBodega: proyecto.horaSalidaBodega ?? null,
    puntoSalidaBodega: proyecto.puntoSalidaBodega ?? null,
    horaMontaje: proyecto.horaMontaje ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    horaInicioEvento: proyecto.horaInicioEvento ?? null,
    horaDesmontaje: proyecto.horaDesmontaje ?? null,
    horaFinEvento: proyecto.horaFinEvento ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesAcceso: proyecto.indicacionesAcceso ?? null,
    encargadoNombre: proyecto.encargado?.name ?? null,
    encargadoLugar: proyecto.encargadoLugar ?? null,
    encargadoLugarContacto: proyecto.encargadoLugarContacto ?? null,
    comentariosFinales: proyecto.comentariosFinales ?? null,
    detallesEspecificos: proyecto.detallesEspecificos ?? null,
    equipos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personal: (proyecto.personal ?? []).filter((p: any) => p.tecnico).map((p: any) => ({
      nombre: p.tecnico.nombre,
      rolEnEvento: p.rolEnEvento ?? null,
      rolTecnico: p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? null,
      celular: p.tecnico.celular ?? null,
      confirmado: p.confirmado,
      fechaJornada: p.fechaJornada ?? null,
      participacion: p.participacion ?? null,
      jornada: p.jornada ?? null,
    })),
    proveedoresEvento,
    transportes,
    logoSrc,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FichaTecnicos, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="brief-tecnicos-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(buf.length),
    },
  });
}
