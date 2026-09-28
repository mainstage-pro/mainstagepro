import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  FASES_PROVEEDOR,
  TITULO_FASE,
  TIPOS_ACREEDOR,
  CAMPO_ACREEDOR,
  esTipoAcreedor,
  type TipoAcreedor,
} from "@/lib/proveedor-evento";

export const proveedorEventoInclude: Prisma.ProveedorEventoInclude = {
  proveedor: { select: { id: true, nombre: true, telefono: true } },
  tecnico: { select: { id: true, nombre: true, celular: true } },
  personal: { select: { id: true, nombre: true, telefono: true } },
  cuentaPagar: { select: { id: true, monto: true, montoPagado: true, estado: true, fechaCompromiso: true } },
  bloques: { orderBy: [{ orden: "asc" }, { horaInicio: "asc" }] },
  items: { orderBy: { orden: "asc" } },
  lineas: {
    select: { id: true, descripcion: true, marca: true, modelo: true, cantidad: true, dias: true, tipo: true },
    orderBy: { orden: "asc" },
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const filtro = req.nextUrl.searchParams.get("imprevisto");
  const proveedores = await prisma.proveedorEvento.findMany({
    where: { proyectoId: id, ...(filtro != null ? { imprevisto: filtro === "1" } : {}) },
    orderBy: { createdAt: "asc" },
    include: proveedorEventoInclude,
  });
  return NextResponse.json({ proveedores });
}

type Acreedor = {
  nombre: string;
  telefono: string | null;
  proveedorId: string | null;
  tecnicoId: string | null;
  personalId: string | null;
};

type AltaAcreedor = {
  nombreProveedor?: string;
  telefonoProveedor?: string;
  crearEnCatalogo?: boolean;
  proveedorId?: string | null;
  tecnicoId?: string | null;
  personalId?: string | null;
};

/**
 * Cuelga el registro de su catálogo. `crearEnCatalogo` es el alta rápida del panel:
 * nombre y celular, lo mínimo para poder generarle después la cuenta por pagar. Sin id
 * ni alta rápida el nombre queda suelto, y el panel avisa que falta registrarlo.
 */
async function resolverAcreedor(
  tipo: TipoAcreedor,
  body: AltaAcreedor,
): Promise<Acreedor | { error: string }> {
  const { singular } = TIPOS_ACREEDOR.find((t) => t.valor === tipo)!;
  let nombre: string = body.nombreProveedor?.trim() || "";
  let telefono: string | null = body.telefonoProveedor?.trim() || null;
  let acreedorId: string | null = body[CAMPO_ACREEDOR[tipo]] || null;

  if (acreedorId) {
    const cat =
      tipo === "TECNICO"
        ? await prisma.tecnico.findUnique({ where: { id: acreedorId }, select: { nombre: true, celular: true } })
        : tipo === "PERSONAL_INTERNO"
          ? await prisma.personalInterno.findUnique({ where: { id: acreedorId }, select: { nombre: true, telefono: true } })
          : await prisma.proveedor.findUnique({ where: { id: acreedorId }, select: { nombre: true, telefono: true } });
    if (!cat) return { error: `No existe el ${singular} que elegiste` };
    nombre = nombre || cat.nombre;
    telefono = telefono ?? ("celular" in cat ? cat.celular : cat.telefono);
  } else if (body.crearEnCatalogo) {
    if (!nombre) return { error: `El nombre del ${singular} es requerido` };
    const creado =
      tipo === "TECNICO"
        ? await prisma.tecnico.create({ data: { nombre, celular: telefono } })
        : tipo === "PERSONAL_INTERNO"
          ? await prisma.personalInterno.create({ data: { nombre, puesto: "Por definir", telefono } })
          : await prisma.proveedor.create({ data: { nombre, telefono } });
    acreedorId = creado.id;
  }

  if (!nombre) return { error: `El nombre del ${singular} es requerido` };

  return {
    nombre,
    telefono,
    proveedorId: tipo === "PROVEEDOR" ? acreedorId : null,
    tecnicoId: tipo === "TECNICO" ? acreedorId : null,
    personalId: tipo === "PERSONAL_INTERNO" ? acreedorId : null,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const tipoAcreedor: TipoAcreedor = esTipoAcreedor(body.tipoAcreedor) ? body.tipoAcreedor : "PROVEEDOR";
  const acreedor = await resolverAcreedor(tipoAcreedor, body);
  if ("error" in acreedor) return NextResponse.json({ error: acreedor.error }, { status: 400 });
  const { nombre, telefono } = acreedor;

  const imprevisto = body.imprevisto === true;

  const creado = await prisma.proveedorEvento.create({
    data: {
      proyectoId: id,
      tipoAcreedor,
      proveedorId: acreedor.proveedorId,
      tecnicoId: acreedor.tecnicoId,
      personalId: acreedor.personalId,
      nombreProveedor: nombre,
      servicioEquipo: body.servicioEquipo?.trim() || null,
      telefonoProveedor: telefono,
      responsable: body.responsable?.trim() || null,
      notas: body.notas?.trim() || null,
      modalidadEntrega: body.modalidadEntrega?.trim() || null,
      modalidadRegreso: body.modalidadRegreso?.trim() || null,
      costoAcordado: body.costoAcordado != null && body.costoAcordado !== "" ? parseFloat(body.costoAcordado) : null,
      imprevisto,
      fechaSolicitud: imprevisto ? (body.fechaSolicitud ? new Date(body.fechaSolicitud) : new Date()) : null,
      solicitadoPor: body.solicitadoPor?.trim() || (imprevisto ? session.name ?? null : null),
      unidades: body.unidades != null && body.unidades !== "" ? Math.max(1, Math.round(Number(body.unidades))) : null,
    },
  });

  // Las tres ventanas nacen con el proveedor, ya fechadas con lo que el proyecto sabe.
  // La recolección es lo que más se queda al aire: que exista desde el inicio la obliga
  // a aparecer en la cronología aunque nadie la haya llenado.
  // El imprevisto no las abre: se pide con el evento encima y la cronología ya corrió.
  if (!imprevisto) {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { fechaEvento: true, fechaMontaje: true, fechaDesmontaje: true },
    });
    const fechaPorFase = {
      INSTALACION: proyecto?.fechaMontaje ?? proyecto?.fechaEvento ?? null,
      OPERACION: proyecto?.fechaEvento ?? null,
      RECOLECCION: proyecto?.fechaDesmontaje ?? proyecto?.fechaEvento ?? null,
    };
    await prisma.proyectoBloqueTiempo.createMany({
      data: FASES_PROVEEDOR.map((fase, i) => ({
        proyectoId: id,
        proveedorEventoId: creado.id,
        tipo: "PROVEEDOR",
        fase,
        fecha: fechaPorFase[fase],
        titulo: `${TITULO_FASE[fase]} — ${nombre}`,
        responsable: creado.responsable,
        orden: i * 10,
      })),
    });
  }

  const proveedor = await prisma.proveedorEvento.findUnique({
    where: { id: creado.id },
    include: proveedorEventoInclude,
  });
  return NextResponse.json({ proveedor });
}
