import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTipoMovimientoMap, naturalezaDe, ensureTiposMovimiento } from "@/lib/tipos-movimiento";
import { esCategoriaPrestamo } from "@/lib/prestamos-capital-ui";

// ─── Préstamos de capital → cuenta por pagar ─────────────────────────────────
//
// Una aportación de capital con categoría "Préstamo" es dinero que la empresa
// debe devolver. Al registrar ese movimiento nace sola una CuentaPagar
// (esPrestamo = true, movimientoOrigenId = el movimiento) y desde ahí se elige
// a quién se le paga (socio o proveedor) y cuándo (fechaCompromiso).
//
// La devolución NO es gasto: al pagar la CxP el movimiento sale con el tipo
// DEVOLUCION_DE_PRESTAMO (salida que no afecta el estado de resultados), igual
// que la entrada del préstamo tampoco fue ingreso.

export const TIPO_DEVOLUCION_PRESTAMO = "DEVOLUCION_DE_PRESTAMO";

// Días por default para la fecha de pago cuando nadie la eligió.
const DIAS_DEFAULT_PAGO = 30;

type Tx = Prisma.TransactionClient;

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export { esCategoriaPrestamo };

/** Categoría con la que se clasifica la devolución ("Pago Préstamo"). */
async function categoriaPagoPrestamoId(tx: Tx): Promise<string | null> {
  const cats = await tx.categoriaFinanciera.findMany({
    where: { tipo: TIPO_DEVOLUCION_PRESTAMO },
    select: { id: true, nombre: true },
  });
  const cat = cats.find((c) => normalizar(c.nombre).includes("prestamo")) ?? cats[0];
  return cat?.id ?? null;
}

/** El tipo de movimiento con que sale el pago de una CxP. */
export function tipoMovimientoPagoCxP(cxp: { esPrestamo?: boolean | null }, porDefecto: string): string {
  return cxp.esPrestamo ? TIPO_DEVOLUCION_PRESTAMO : porDefecto;
}

export interface AcreedorPrestamo {
  /** "socio:<id>" | "prov:<id>" | "" */
  acreedor?: string | null;
  /** YYYY-MM-DD */
  fechaPago?: string | null;
}

/** Traduce "socio:<id>" / "prov:<id>" a los campos de la CxP. */
export function camposAcreedor(acreedor: string | null | undefined) {
  if (acreedor?.startsWith("socio:")) {
    return { tipoAcreedor: "SOCIO", socioId: acreedor.slice(6) || null, proveedorId: null, tecnicoId: null };
  }
  if (acreedor?.startsWith("prov:")) {
    return { tipoAcreedor: "PROVEEDOR", socioId: null, proveedorId: acreedor.slice(5) || null, tecnicoId: null };
  }
  // Sin elegir: queda como préstamo de socio "por asignar".
  return { tipoAcreedor: "SOCIO", socioId: null, proveedorId: null, tecnicoId: null };
}

export const conceptoPrestamo = (conceptoMov: string) => `Préstamo — ${conceptoMov.trim()}`;

/**
 * Deja la CxP del préstamo en línea con su movimiento: la crea si el
 * movimiento ahora es préstamo, la actualiza si cambió el monto o el concepto,
 * y la borra si dejó de serlo (solo si aún no tiene pagos).
 *
 * Devuelve un aviso cuando no pudo hacer algo (p. ej. bajar el monto por
 * debajo de lo ya pagado).
 */
export async function sincronizarCxPPrestamo(
  tx: Tx,
  movimientoId: string,
  opciones: AcreedorPrestamo = {},
): Promise<{ cxpId: string | null; aviso?: string }> {
  const mov = await tx.movimientoFinanciero.findUnique({
    where: { id: movimientoId },
    include: { categoria: { select: { nombre: true } } },
  });
  if (!mov) return { cxpId: null };

  const tipoMap = await getTipoMovimientoMap();
  const debeTener =
    naturalezaDe(tipoMap, mov.tipo) === "ENTRADA" && esCategoriaPrestamo(mov.categoria?.nombre) && mov.monto > 0;

  const existente = await tx.cuentaPagar.findUnique({ where: { movimientoOrigenId: movimientoId } });

  if (!debeTener) {
    if (!existente) return { cxpId: null };
    if (existente.montoPagado > 0) {
      return {
        cxpId: existente.id,
        aviso: "El movimiento ya no es préstamo, pero su cuenta por pagar tiene pagos; se dejó intacta.",
      };
    }
    await tx.cuentaPagar.delete({ where: { id: existente.id } });
    return { cxpId: null };
  }

  if (existente) {
    const data: Prisma.CuentaPagarUpdateInput = { concepto: conceptoPrestamo(mov.concepto) };
    let aviso: string | undefined;
    if (existente.monto !== mov.monto) {
      if (mov.monto < existente.montoPagado) {
        aviso = "El nuevo monto es menor a lo ya devuelto; la cuenta por pagar conserva su monto.";
      } else {
        data.monto = mov.monto;
        data.estado = existente.montoPagado >= mov.monto ? "LIQUIDADO" : existente.montoPagado > 0 ? "PARCIAL" : "PENDIENTE";
      }
    }
    await tx.cuentaPagar.update({ where: { id: existente.id }, data });
    return { cxpId: existente.id, aviso };
  }

  const fechaCompromiso = opciones.fechaPago
    ? new Date(opciones.fechaPago)
    : new Date(mov.fecha.getTime() + DIAS_DEFAULT_PAGO * 86_400_000);

  const cxp = await tx.cuentaPagar.create({
    data: {
      ...camposAcreedor(opciones.acreedor),
      concepto: conceptoPrestamo(mov.concepto),
      monto: mov.monto,
      fechaCompromiso,
      estado: "PENDIENTE",
      esPrestamo: true,
      movimientoOrigenId: mov.id,
      proyectoId: mov.proyectoId,
      categoriaId: await categoriaPagoPrestamoId(tx),
    },
  });
  return { cxpId: cxp.id };
}

let tipoAsegurado = false;

/**
 * Siembra (idempotente) el tipo "Devolución de préstamo": salida que no afecta
 * el estado de resultados. Si alguien lo desactivó o lo editó, se respeta.
 */
export async function asegurarTipoDevolucionPrestamo(): Promise<void> {
  if (tipoAsegurado) return;
  await ensureTiposMovimiento();
  await prisma.tipoMovimiento.upsert({
    where: { clave: TIPO_DEVOLUCION_PRESTAMO },
    update: {},
    create: {
      clave: TIPO_DEVOLUCION_PRESTAMO,
      nombre: "Devolución de préstamo",
      naturaleza: "SALIDA",
      afectaResultado: false,
      color: "teal",
      orden: 6,
      sistema: false,
      activo: true,
    },
  });
  tipoAsegurado = true;
}
