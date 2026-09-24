import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

// Mismo criterio de pago que el resto del proyecto: el miércoles siguiente al evento.
function proximoMiercolesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, pid } = await params;

  const bloque = await prisma.proveedorEvento.findUnique({
    where: { id: pid },
    include: {
      proyecto: { select: { numeroProyecto: true, fechaEvento: true } },
      items: { orderBy: { orden: "asc" } },
      lineas: { select: { descripcion: true, cantidad: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!bloque || bloque.proyectoId !== id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (!bloque.costoAcordado || bloque.costoAcordado <= 0) {
    return NextResponse.json({ error: "Captura primero el costo acordado con el proveedor" }, { status: 400 });
  }
  if (!bloque.proveedorId) {
    return NextResponse.json(
      { error: "Registra al proveedor en el catálogo para poder generarle la cuenta por pagar" },
      { status: 400 },
    );
  }

  // Si nadie escribió el servicio, la CxP se describe con lo que el proveedor renta:
  // sus conceptos manuales y las líneas de la cotización que se le asignaron.
  const rentado = [
    ...bloque.items.map((it) => `${it.cantidad}× ${it.descripcion}`),
    ...bloque.lineas.map((l) => `${l.cantidad}× ${l.descripcion}`),
  ].join(", ");
  const servicio = (bloque.servicioEquipo?.trim() || rentado || "Servicio de proveedor").slice(0, 180);
  const concepto = `${servicio} — ${bloque.nombreProveedor} · ${bloque.proyecto.numeroProyecto}`;
  const fechaCompromiso = proximoMiercolesTraEvento(bloque.proyecto.fechaEvento ?? new Date());

  if (bloque.cuentaPagarId) {
    const cuentaPagar = await prisma.cuentaPagar.update({
      where: { id: bloque.cuentaPagarId },
      data: { concepto, monto: bloque.costoAcordado, proveedorId: bloque.proveedorId, fechaCompromiso },
    });
    return NextResponse.json({ cuentaPagar, creada: false });
  }

  const cuentaPagar = await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: "PROVEEDOR",
      proveedorId: bloque.proveedorId,
      proyectoId: id,
      concepto,
      monto: bloque.costoAcordado,
      fechaCompromiso,
      estado: "PENDIENTE",
      notas: bloque.notas?.trim() || null,
    },
  });
  await prisma.proveedorEvento.update({ where: { id: pid }, data: { cuentaPagarId: cuentaPagar.id } });
  await logActividad(session.id, "CREAR", "cuenta_pagar", cuentaPagar.id, `CxP a proveedor del evento: ${concepto}`);

  return NextResponse.json({ cuentaPagar, creada: true });
}
