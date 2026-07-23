import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { FichaOperativa, FichaOperativaData } from "@/components/pdf/FichaOperativa";
import {
  logoBase64, logoBase64Dark, EquipoFlat, CronoRow, TransporteSlot,
  DocsData, EquipoRiderExtra, ProveedorRenta,
} from "@/components/pdf/PdfShared";
import { sembrarNotasEquiposProyecto } from "@/lib/notas-equipos";
import React from "react";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Auto-siembra notas de equipo desde la cotización (solo rellena vacías).
  await sembrarNotasEquiposProyecto(id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyecto = await (prisma.proyecto.findUnique as any)({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true } },
      encargado: { select: { name: true } },
      trato: { select: { notas: true } },
      personal: {
        include: {
          tecnico: { select: { nombre: true, celular: true, rol: { select: { nombre: true } } } },
          rolTecnico: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
      equipos: {
        include: {
          equipo: { select: { descripcion: true, marca: true, modelo: true, categoria: { select: { nombre: true } } } },
          proveedor: { select: { nombre: true, telefono: true } },
          riderAccesorios: { orderBy: { orden: "asc" } },
        },
        orderBy: { id: "asc" },
      },
      checklist: { orderBy: { orden: "asc" } },
      archivos: { orderBy: { createdAt: "desc" } },
      proveedoresEvento: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const logoSrc = logoBase64(path.join(process.cwd(), "public"));
  const logoSrcDark = logoBase64Dark(path.join(process.cwd(), "public"));

  // ── Parse JSON fields ──────────────────────────────────────────────────────
  let cronograma: CronoRow[] = [];
  try { cronograma = proyecto.cronograma ? JSON.parse(proyecto.cronograma) : []; } catch { /* ignore */ }

  let transportes: TransporteSlot[] = [];
  try {
    const raw = proyecto.transportes ? JSON.parse(proyecto.transportes) : [];
    transportes = Array.isArray(raw) ? raw : [];
    // Resolve vehiculo/chofer names
    if (transportes.length > 0) {
      const vehiculoIds = transportes.map((t: TransporteSlot) => t.vehiculoId).filter(Boolean);
      const choferIds = transportes.map((t: TransporteSlot) => t.choferId).filter(Boolean);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [vData, cData] = await Promise.all([
          vehiculoIds.length > 0 ? (prisma.vehiculo as any).findMany({ where: { id: { in: vehiculoIds } }, select: { id: true, nombre: true } }) : [],
          choferIds.length > 0 ? (prisma.tecnico as any).findMany({ where: { id: { in: choferIds } }, select: { id: true, nombre: true } }) : [],
        ]);
        const vMap = new Map(vData.map((v: { id: string; nombre: string }) => [v.id, v.nombre]));
        const cMap = new Map(cData.map((c: { id: string; nombre: string }) => [c.id, c.nombre]));
        transportes = transportes.map((t: TransporteSlot): TransporteSlot => ({
          ...t,
          vehiculoNombre: (vMap.get(t.vehiculoId) ?? t.vehiculoId) as string,
          choferNombre: (cMap.get(t.choferId) ?? t.choferId) as string,
        }));
      } catch { /* use raw IDs */ }
    }
  } catch { /* ignore */ }

  let docsTecnicos: DocsData | null = null;
  try { if (proyecto.docsTecnicos) docsTecnicos = JSON.parse(proyecto.docsTecnicos); } catch { /* ignore */ }

  let equiposRiderExtra: EquipoRiderExtra[] = [];
  try { equiposRiderExtra = proyecto.equiposRiderExtra ? JSON.parse(proyecto.equiposRiderExtra) : []; } catch { /* ignore */ }

  let proveedoresRenta: ProveedorRenta[] = [];
  try { proveedoresRenta = proyecto.proveedoresRenta ? JSON.parse(proyecto.proveedoresRenta) : []; } catch { /* ignore */ }

  // ── Map equipos incluyendo accesorios ──────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipos: EquipoFlat[] = (proyecto.equipos ?? []).map((e: any) => ({
    descripcion: e.equipo?.descripcion ?? "",
    marca: e.equipo?.marca ?? null,
    modelo: e.equipo?.modelo ?? null,
    categoria: e.equipo?.categoria?.nombre ?? "General",
    cantidad: e.cantidad,
    tipo: e.tipo,
    confirmado: e.confirmado,
    proveedor: e.proveedor?.nombre ?? null,
    notas: e.notas ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accesorios: (e.riderAccesorios ?? []).map((a: any) => ({
      nombre: a.nombre,
      cantidad: a.cantidad,
      categoria: a.categoria ?? null,
    })),
  }));

  const data: FichaOperativaData = {
    nombre: proyecto.nombre,
    numeroProyecto: proyecto.numeroProyecto,
    estado: proyecto.estado,
    tipoEvento: proyecto.tipoEvento,
    tipoServicio: proyecto.tipoServicio ?? null,
    zona: proyecto.zona ?? "LOCAL",
    fechaEvento: proyecto.fechaEvento?.toISOString() ?? null,
    fechasEvento: (proyecto as { fechasEvento?: string | null }).fechasEvento ?? null,
    horariosEvento: (proyecto as { horariosEvento?: string | null }).horariosEvento ?? null,
    horaInicioEvento: proyecto.horaInicioEvento ?? null,
    horaFinEvento: proyecto.horaFinEvento ?? null,
    horaInicio: proyecto.horaInicio ?? null,
    horaDesmontaje: proyecto.horaDesmontaje ?? null,
    fechaMontaje: proyecto.fechaMontaje?.toISOString() ?? null,
    horaInicioMontaje: proyecto.horaInicioMontaje ?? null,
    duracionMontajeHrs: proyecto.duracionMontajeHrs ?? null,
    montajeDiaAparte: proyecto.montajeDiaAparte ?? null,
    desmontajeDiaAparte: proyecto.desmontajeDiaAparte ?? null,
    fechaDesmontaje: proyecto.fechaDesmontaje?.toISOString() ?? null,
    duracionDesmontajeHrs: proyecto.duracionDesmontajeHrs ?? null,
    horaMontaje: proyecto.horaMontaje ?? null,
    horaSalidaBodega: proyecto.horaSalidaBodega ?? null,
    puntoSalidaBodega: proyecto.puntoSalidaBodega ?? null,
    lugarLlamado: proyecto.lugarLlamado ?? null,
    lugarEvento: proyecto.lugarEvento ?? null,
    direccionVenue: proyecto.direccionVenue ?? null,
    linkMaps: proyecto.linkMaps ?? null,
    indicacionesAcceso: proyecto.indicacionesAcceso ?? null,
    indicacionesCliente: proyecto.indicacionesCliente ?? null,
    descripcionGeneral: proyecto.descripcionGeneral ?? null,
    detallesEspecificos: proyecto.detallesEspecificos ?? null,
    comentariosFinales: proyecto.comentariosFinales ?? null,
    encargadoNombre: proyecto.encargado?.name ?? null,
    encargadoCliente: proyecto.encargadoCliente ?? null,
    encargadoClienteContacto: proyecto.encargadoClienteContacto ?? null,
    encargadoLugar: proyecto.encargadoLugar ?? null,
    encargadoLugarContacto: proyecto.encargadoLugarContacto ?? null,
    contactosEmergencia: proyecto.contactosEmergencia ?? null,
    llamadoBodega: proyecto.llamadoBodega?.toISOString() ?? null,
    choferNombre: proyecto.choferNombre ?? null,
    aplicaCatering: proyecto.aplicaCatering ?? false,
    proveedorCatering: proyecto.proveedorCatering ?? null,
    cliente: {
      nombre: proyecto.cliente.nombre,
      empresa: proyecto.cliente.empresa ?? null,
      telefono: proyecto.cliente.telefono ?? null,
    },
    equipos,
    equiposRiderExtra,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proveedoresEvento: (proyecto.proveedoresEvento ?? []).map((p: any) => ({
      nombreProveedor: p.nombreProveedor,
      servicioEquipo: p.servicioEquipo ?? null,
      telefonoProveedor: p.telefonoProveedor ?? null,
    })),
    proveedoresRenta,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    archivos: (proyecto.archivos ?? []).map((a: any) => ({ tipo: a.tipo, nombre: a.nombre, url: a.url })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checklist: (proyecto.checklist ?? []).map((c: any) => ({ item: c.item, completado: c.completado, tipo: c.tipo })),
    cronograma,
    transportes,
    docsTecnicos,
    tratoNotas: proyecto.trato?.notas ?? null,
    logoSrc,
    logoSrcDark,
  };

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(FichaOperativa, { data }) as React.ReactElement<React.ComponentProps<typeof Document>>
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
      "Content-Disposition": `${isPreview ? 'inline' : 'attachment'}; filename="ficha-operativa-${proyecto.numeroProyecto}.pdf"`,
      "Content-Length": String(buf.length),
    },
  });
}
