import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import React from "react";
import ReactPDF, { Document } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEquipoDisplayName, getEquipoMarcaModelo } from "@/lib/equipoNombre";
import { ListaPreciosPDF, type ListaPreciosGrupo, type ListaPreciosItem } from "@/components/ListaPreciosPDF";

const ORIGENES = {
  PROPIO:  { label: "Propios",  detalle: "Inventario propio de Mainstage Pro", archivo: "Propios" },
  EXTERNO: { label: "Externos", detalle: "Subrenta con proveedores",           archivo: "Externos" },
  PREMIUM: { label: "Premium",  detalle: "Marcas premium en subrenta",         archivo: "Premium" },
} as const;

type Origen = keyof typeof ORIGENES;

function agrupar(items: (ListaPreciosItem & { categoria: string; orden: number })[]): ListaPreciosGrupo[] {
  const grupos = new Map<string, { orden: number; grupo: ListaPreciosGrupo }>();
  for (const it of items) {
    if (!grupos.has(it.categoria)) {
      grupos.set(it.categoria, { orden: it.orden, grupo: { nombre: it.categoria, items: [] } });
    }
    grupos.get(it.categoria)!.grupo.items.push(it);
  }
  return Array.from(grupos.values())
    .sort((a, b) => a.orden - b.orden || a.grupo.nombre.localeCompare(b.grupo.nombre))
    .map(g => g.grupo);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const origen = (req.nextUrl.searchParams.get("origen") ?? "PROPIO").toUpperCase() as Origen;
  if (!(origen in ORIGENES)) {
    return NextResponse.json({ error: "Origen inválido" }, { status: 400 });
  }
  // El costo de proveedor y el margen son datos internos: solo para administración.
  const incluyeCostos = session.role === "ADMIN";

  const [equipos, accesorios] = await Promise.all([
    prisma.equipo.findMany({
      where: { tipo: origen, activo: true, estadoMigracion: null },
      select: {
        id: true, descripcion: true, marca: true, modelo: true,
        cantidadTotal: true, precioRenta: true, costoProveedor: true, noCotizable: true,
        categoria: { select: { nombre: true, orden: true } },
        proveedoresPrecios: {
          where: { activo: true },
          select: { precio: true },
          orderBy: { proveedor: { prioridad: "desc" } },
        },
      },
      orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
    }),
    // El origen de un accesorio se deriva de si tiene proveedor; no hay premium.
    origen === "PREMIUM" ? [] : prisma.accesorio.findMany({
      where: { activo: true, proveedorId: origen === "EXTERNO" ? { not: null } : null },
      select: {
        id: true, nombre: true, marca: true, modelo: true,
        tipoConteo: true, cantidad: true, precioRenta: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const equiposItems = equipos.map(e => ({
    id: e.id,
    nombre: getEquipoDisplayName(e),
    subtitulo: getEquipoMarcaModelo(e) ? e.descripcion : null,
    cantidad: e.cantidadTotal,
    precioRenta: e.precioRenta,
    costo: e.costoProveedor ?? e.proveedoresPrecios[0]?.precio ?? null,
    noCotizable: e.noCotizable,
    categoria: e.categoria.nombre,
    orden: e.categoria.orden,
  }));

  const accesoriosItems = accesorios.map(a => ({
    id: a.id,
    nombre: a.nombre,
    subtitulo: [a.marca, a.modelo].filter(Boolean).join(" · ") || null,
    cantidad: a.tipoConteo === "cuantificable" ? (a.cantidad ?? 0) : null,
    precioRenta: a.precioRenta ?? 0,
    costo: null,
    categoria: a.categoria?.nombre ?? "Sin categoría",
    orden: a.categoria ? 0 : 1,
  }));

  const sinPrecio =
    equiposItems.filter(e => e.precioRenta <= 0).length +
    accesoriosItems.filter(a => a.precioRenta <= 0).length;

  const logoPath = path.join(process.cwd(), "public", "logo-white.png");
  const logoSrc = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const pdfStream = await ReactPDF.renderToStream(
    React.createElement(ListaPreciosPDF, {
      logoSrc,
      data: {
        origenLabel: ORIGENES[origen].label,
        origenDetalle: ORIGENES[origen].detalle,
        equipos: agrupar(equiposItems),
        accesorios: agrupar(accesoriosItems),
        totalEquipos: equiposItems.length,
        totalUnidades: equiposItems.reduce((t, e) => t + (e.cantidad ?? 0), 0),
        totalAccesorios: accesoriosItems.length,
        sinPrecio,
        incluyeCostos,
        generadoEn: new Date().toISOString(),
      },
    }) as React.ReactElement<React.ComponentProps<typeof Document>>
  );

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    pdfStream.on("error", reject);
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Lista-de-precios-${ORIGENES[origen].archivo}-${fecha}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
