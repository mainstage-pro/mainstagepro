import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ventanasIniciales } from "@/lib/proveedor-evento";
import { proveedorEventoInclude } from "../../proveedores-evento/route";

/**
 * Le pone proveedor a los equipos de tercero de la cotización, desde el proyecto.
 *
 * La cotización solo deja una sugerencia de quién suele rentar cada equipo; aquí se
 * decide de verdad. Un proveedor tiene un solo renglón por evento: si ya lo trae, los
 * equipos se le suman a ese en lugar de abrirle otro, para que su cuenta por pagar y
 * sus horarios sigan siendo uno.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { lineaIds, proveedorId, costoAcordado } = (await req.json()) as {
    lineaIds?: string[];
    proveedorId?: string;
    costoAcordado?: number | string | null;
  };

  if (!proveedorId) return NextResponse.json({ error: "Elige un proveedor" }, { status: 400 });
  if (!lineaIds?.length) return NextResponse.json({ error: "Elige al menos un equipo" }, { status: 400 });

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      cotizacionId: true,
      fechaEvento: true,
      fechaMontaje: true,
      fechaDesmontaje: true,
    },
  });
  if (!proyecto?.cotizacionId) {
    return NextResponse.json({ error: "El proyecto no tiene cotización" }, { status: 400 });
  }

  const proveedor = await prisma.proveedor.findUnique({
    where: { id: proveedorId },
    select: { id: true, nombre: true, empresa: true, telefono: true },
  });
  if (!proveedor) return NextResponse.json({ error: "No existe ese proveedor" }, { status: 404 });

  let bloque = await prisma.proveedorEvento.findFirst({
    where: { proyectoId: id, proveedorId, imprevisto: false },
    select: { id: true },
  });

  if (!bloque) {
    bloque = await prisma.proveedorEvento.create({
      data: {
        proyectoId: id,
        tipoAcreedor: "PROVEEDOR",
        proveedorId,
        nombreProveedor: proveedor.empresa || proveedor.nombre,
        telefonoProveedor: proveedor.telefono,
      },
      select: { id: true },
    });
    await prisma.proyectoBloqueTiempo.createMany({
      data: ventanasIniciales({
        proyectoId: id,
        proveedorEventoId: bloque.id,
        nombreProveedor: proveedor.empresa || proveedor.nombre,
        responsable: null,
        fechaMontaje: proyecto.fechaMontaje,
        fechaEvento: proyecto.fechaEvento,
        fechaDesmontaje: proyecto.fechaDesmontaje,
      }),
    });
  }

  await prisma.cotizacionLinea.updateMany({
    where: { id: { in: lineaIds }, cotizacionId: proyecto.cotizacionId },
    data: { proveedorEventoId: bloque.id },
  });

  const costo = costoAcordado === "" || costoAcordado == null ? null : Number(costoAcordado);
  if (costo != null && !Number.isNaN(costo)) {
    await prisma.proveedorEvento.update({
      where: { id: bloque.id },
      data: { costoAcordado: costo },
    });
  }

  const actualizado = await prisma.proveedorEvento.findUnique({
    where: { id: bloque.id },
    include: proveedorEventoInclude,
  });
  return NextResponse.json({ proveedor: actualizado });
}
