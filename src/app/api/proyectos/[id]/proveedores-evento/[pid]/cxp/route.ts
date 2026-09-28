import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { TIPOS_ACREEDOR, CAMPO_ACREEDOR, esTipoAcreedor } from "@/lib/proveedor-evento";

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
    return NextResponse.json({ error: "Captura primero el costo acordado" }, { status: 400 });
  }

  // Al técnico y a la gente de casa se les debe igual que a un proveedor: lo pagaron de
  // su bolsa. CuentaPagar solo tiene llave para proveedor y técnico; el reembolso al
  // personal interno se identifica por tipo y lleva el nombre en el concepto.
  const tipoAcreedor = esTipoAcreedor(bloque.tipoAcreedor) ? bloque.tipoAcreedor : "PROVEEDOR";
  const acreedorId = bloque[CAMPO_ACREEDOR[tipoAcreedor]];
  if (!acreedorId) {
    const { singular } = TIPOS_ACREEDOR.find((t) => t.valor === tipoAcreedor)!;
    return NextResponse.json(
      { error: `Registra al ${singular} en el catálogo para poder generarle la cuenta por pagar` },
      { status: 400 },
    );
  }

  // Si nadie escribió el servicio, la CxP se describe con lo que el proveedor renta:
  // sus conceptos manuales y las líneas de la cotización que se le asignaron.
  const rentado = [
    ...bloque.items.map((it) => `${it.cantidad}× ${it.descripcion}`),
    ...bloque.lineas.map((l) => `${l.cantidad}× ${l.descripcion}`),
  ].join(", ");
  const descrito = bloque.servicioEquipo?.trim() || rentado || "Servicio del evento";
  // El imprevisto lleva su cantidad en `unidades` porque se captura en un solo renglón.
  const servicio = (bloque.unidades ? `${bloque.unidades}× ${descrito}` : descrito).slice(0, 180);
  const etiqueta = bloque.imprevisto ? "Imprevisto: " : "";
  const concepto = `${etiqueta}${servicio} — ${bloque.nombreProveedor} · ${bloque.proyecto.numeroProyecto}`;
  const fechaCompromiso = proximoMiercolesTraEvento(bloque.proyecto.fechaEvento ?? new Date());

  const llaves = {
    tipoAcreedor,
    proveedorId: bloque.proveedorId,
    tecnicoId: bloque.tecnicoId,
  };

  if (bloque.cuentaPagarId) {
    const cuentaPagar = await prisma.cuentaPagar.update({
      where: { id: bloque.cuentaPagarId },
      data: { ...llaves, concepto, monto: bloque.costoAcordado, fechaCompromiso },
    });
    return NextResponse.json({ cuentaPagar, creada: false });
  }

  const cuentaPagar = await prisma.cuentaPagar.create({
    data: {
      ...llaves,
      proyectoId: id,
      concepto,
      monto: bloque.costoAcordado,
      fechaCompromiso,
      estado: "PENDIENTE",
      notas: bloque.notas?.trim() || null,
    },
  });
  await prisma.proveedorEvento.update({ where: { id: pid }, data: { cuentaPagarId: cuentaPagar.id } });
  await logActividad(session.id, "CREAR", "cuenta_pagar", cuentaPagar.id, `CxP del evento: ${concepto}`);

  return NextResponse.json({ cuentaPagar, creada: true });
}
