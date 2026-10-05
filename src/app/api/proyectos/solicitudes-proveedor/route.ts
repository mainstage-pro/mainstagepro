import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Todo lo que se le pidió a proveedores en un rango de fechas de evento, de todos los
 * proyectos a la vez: lo coordinado en preproducción y lo que salió de imprevisto.
 * Es la vista que el coordinador baja el lunes y la que administración usa para cerrar
 * los pagos del fin de semana.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const desde = req.nextUrl.searchParams.get("desde");
  const hasta = req.nextUrl.searchParams.get("hasta");
  if (!desde || !hasta) {
    return NextResponse.json({ error: "Faltan las fechas del rango" }, { status: 400 });
  }

  const filas = await prisma.proveedorEvento.findMany({
    where: {
      proyecto: {
        fechaEvento: { gte: new Date(`${desde}T00:00:00.000Z`), lte: new Date(`${hasta}T23:59:59.999Z`) },
        estado: { not: "CANCELADO" },
      },
    },
    orderBy: [{ proyecto: { fechaEvento: "asc" } }, { createdAt: "asc" }],
    include: {
      proyecto: {
        select: {
          id: true,
          numeroProyecto: true,
          nombre: true,
          fechaEvento: true,
          lugarEvento: true,
          cliente: { select: { nombre: true } },
          encargado: { select: { name: true } },
        },
      },
      cuentaPagar: { select: { id: true, monto: true, montoPagado: true, estado: true, fechaCompromiso: true } },
      items: { select: { descripcion: true, cantidad: true }, orderBy: { orden: "asc" } },
      lineas: { select: { descripcion: true, cantidad: true }, orderBy: { orden: "asc" } },
    },
  });

  const solicitudes = filas.map((f) => ({
    id: f.id,
    imprevisto: f.imprevisto,
    proyectoId: f.proyecto.id,
    numeroProyecto: f.proyecto.numeroProyecto,
    evento: f.proyecto.nombre,
    cliente: f.proyecto.cliente.nombre,
    fechaEvento: f.proyecto.fechaEvento,
    venue: f.proyecto.lugarEvento,
    coordinador: f.proyecto.encargado?.name ?? null,
    proveedor: f.nombreProveedor,
    frente: f.frente,
    telefono: f.telefonoProveedor,
    tipoAcreedor: f.tipoAcreedor,
    enCatalogo: (f.proveedorId ?? f.tecnicoId ?? f.personalId) != null,
    // El imprevisto describe todo en un renglón; el coordinado reparte sus conceptos
    // entre items manuales y líneas de la cotización.
    detalle:
      f.servicioEquipo?.trim() ||
      [...f.items, ...f.lineas].map((x) => `${x.cantidad}× ${x.descripcion}`).join(", ") ||
      null,
    unidades: f.unidades,
    costo: f.costoAcordado,
    solicitadoPor: f.solicitadoPor,
    fechaSolicitud: f.fechaSolicitud,
    cuentaPagar: f.cuentaPagar,
  }));

  return NextResponse.json({ solicitudes });
}
