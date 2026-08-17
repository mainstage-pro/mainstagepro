import { prisma } from "@/lib/prisma";
import { logActividad } from "@/lib/actividad";
import { unidadesEnVenta } from "@/lib/equipo-venta-shared";

// Venta de equipo propio: se marca a la venta desde Activos y sigue operando normal en
// inventario (renta, cotizaciones, proyectos) hasta que se registra la venta. Al registrarla
// se descuentan las unidades vendidas; si ya no quedan, el equipo baja del inventario.

/**
 * Registra la venta: descuenta unidades del inventario y, si se vendió todo, da de baja
 * el equipo en el momento (activo = false, estado DADO_DE_BAJA). En venta parcial el
 * equipo sale del catálogo de venta con las unidades restantes operando.
 */
export async function registrarVentaEquipo(equipoId: string, cantidad: number | null, userId: string) {
  const eq = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { id: true, descripcion: true, marca: true, modelo: true, cantidadTotal: true, precioVenta: true, ventaCantidad: true },
  });
  if (!eq) return null;

  const vendidas = Math.max(1, Math.min(cantidad ?? unidadesEnVenta(eq), eq.cantidadTotal));
  const restantes = eq.cantidadTotal - vendidas;
  const ahora = new Date();
  const baja = restantes <= 0;

  const equipo = await prisma.equipo.update({
    where: { id: equipoId },
    data: {
      cantidadTotal: baja ? 0 : restantes,
      enVenta: false,
      ventaCantidad: null,
      ventaDesde: null,
      fechaVenta: ahora,
      ...(baja ? { activo: false, estado: "DADO_DE_BAJA", fechaBaja: ahora } : {}),
    },
    select: { id: true, descripcion: true, cantidadTotal: true, activo: true, estado: true },
  });

  const nombre = [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion;
  await logActividad(
    userId,
    "VENTA_EQUIPO",
    "Equipo",
    equipoId,
    baja
      ? `Vendió ${vendidas} unidad(es) de ${nombre} — equipo dado de baja del inventario`
      : `Vendió ${vendidas} unidad(es) de ${nombre} — quedan ${restantes} en inventario`,
    { vendidas, restantes, precioVenta: eq.precioVenta, baja },
  );

  return { equipo, vendidas, restantes, baja };
}
