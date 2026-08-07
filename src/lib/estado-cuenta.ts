import { prisma } from "@/lib/prisma";
import type { EstadoCuentaLinea } from "@/components/EstadoCuentaPDF";

// ─── Estado de cuenta agregado por empresa ───────────────────────────────────
// Regla de negocio: se cobra/paga a la EMPRESA, no a los contactos. Por eso las
// cuentas se agregan a nivel empresa — abrir cualquier contacto (o la empresa)
// muestra el mismo saldo total de la compañía.

export interface CuentaCobrarDetalle {
  id: string;
  concepto: string;
  monto: number;
  montoCobrado: number;
  estado: string;
  fechaCompromiso: string;
  fechaCobroReal: string | null;
  cotizacion: { numeroCotizacion: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
}

export interface CuentaPagarDetalle {
  id: string;
  concepto: string;
  monto: number;
  montoPagado: number;
  estado: string;
  fechaCompromiso: string;
  fechaPagoReal: string | null;
  tipoAcreedor: string;
  proveedor: { nombre: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
}

export interface CuentasScope {
  empresaId: string | null;
  cuentasCobrar: CuentaCobrarDetalle[];
  cuentasPagar: CuentaPagarDetalle[];
}

/**
 * Reúne las cuentas por cobrar/pagar con alcance de empresa.
 * - Por cobrar: cuentas ligadas a la empresa + cuentas de TODOS sus contactos cliente.
 * - Por pagar: cuentas ligadas a la empresa + cuentas de proveedores que comparten empresa.
 * Si no hay empresa, se limita al contacto (clienteId).
 */
export async function getCuentasScope(opts: {
  clienteId?: string;
  proveedorId?: string;
  empresaId?: string | null;
}): Promise<CuentasScope> {
  const empresaId = opts.empresaId ?? null;

  let contactoIds: string[] = [];
  if (empresaId) {
    const contactos = await prisma.cliente.findMany({
      where: { empresaId },
      select: { id: true },
    });
    contactoIds = contactos.map((c) => c.id);
  }
  if (opts.clienteId && !contactoIds.includes(opts.clienteId)) {
    contactoIds.push(opts.clienteId);
  }

  const cobrarOr: Array<Record<string, unknown>> = [];
  if (empresaId) cobrarOr.push({ empresaId });
  if (contactoIds.length) cobrarOr.push({ clienteId: { in: contactoIds } });

  const cobrarRaw = cobrarOr.length
    ? await prisma.cuentaCobrar.findMany({
        where: { OR: cobrarOr },
        select: {
          id: true,
          concepto: true,
          monto: true,
          montoCobrado: true,
          estado: true,
          fechaCompromiso: true,
          fechaCobroReal: true,
          cotizacion: { select: { numeroCotizacion: true } },
          proyecto: { select: { numeroProyecto: true, nombre: true } },
          cliente: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaCompromiso: "asc" },
      })
    : [];

  let pagarRaw: Array<{
    id: string; concepto: string; monto: number; montoPagado: number; estado: string;
    fechaCompromiso: Date; fechaPagoReal: Date | null; tipoAcreedor: string;
    proveedor: { nombre: string } | null;
    proyecto: { numeroProyecto: string; nombre: string } | null;
  }> = [];
  if (empresaId) {
    pagarRaw = await prisma.cuentaPagar.findMany({
      where: { OR: [{ empresaId }, { proveedor: { empresaId } }] },
      select: {
        id: true,
        concepto: true,
        monto: true,
        montoPagado: true,
        estado: true,
        fechaCompromiso: true,
        fechaPagoReal: true,
        tipoAcreedor: true,
        proveedor: { select: { nombre: true } },
        proyecto: { select: { numeroProyecto: true, nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    });
  } else if (opts.proveedorId) {
    pagarRaw = await prisma.cuentaPagar.findMany({
      where: { proveedorId: opts.proveedorId },
      select: {
        id: true,
        concepto: true,
        monto: true,
        montoPagado: true,
        estado: true,
        fechaCompromiso: true,
        fechaPagoReal: true,
        tipoAcreedor: true,
        proveedor: { select: { nombre: true } },
        proyecto: { select: { numeroProyecto: true, nombre: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
    });
  }

  return {
    empresaId,
    cuentasCobrar: cobrarRaw.map((c) => ({
      id: c.id,
      concepto: c.concepto,
      monto: c.monto,
      montoCobrado: c.montoCobrado,
      estado: c.estado,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      fechaCobroReal: c.fechaCobroReal?.toISOString() ?? null,
      cotizacion: c.cotizacion,
      proyecto: c.proyecto,
      contacto: c.cliente,
    })),
    cuentasPagar: pagarRaw.map((c) => ({
      id: c.id,
      concepto: c.concepto,
      monto: c.monto,
      montoPagado: c.montoPagado,
      estado: c.estado,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      fechaPagoReal: c.fechaPagoReal?.toISOString() ?? null,
      tipoAcreedor: c.tipoAcreedor,
      proveedor: c.proveedor,
      proyecto: c.proyecto,
    })),
  };
}

/** Convierte el scope a las líneas que consume el PDF de estado de cuenta. */
export function toEstadoCuentaLineas(scope: CuentasScope): {
  porCobrar: EstadoCuentaLinea[];
  porPagar: EstadoCuentaLinea[];
} {
  const porCobrar: EstadoCuentaLinea[] = scope.cuentasCobrar.map((c) => ({
    id: c.id,
    concepto: c.concepto,
    referencia: c.cotizacion?.numeroCotizacion ?? (c.proyecto ? `#${c.proyecto.numeroProyecto}` : null),
    detalle: c.contacto?.nombre ?? c.proyecto?.nombre ?? null,
    fecha: c.fechaCompromiso,
    monto: c.monto,
    pagado: c.montoCobrado,
    estado: c.estado,
  }));
  const porPagar: EstadoCuentaLinea[] = scope.cuentasPagar.map((c) => ({
    id: c.id,
    concepto: c.concepto,
    referencia: c.proyecto ? `#${c.proyecto.numeroProyecto}` : null,
    detalle: c.proveedor?.nombre ?? c.proyecto?.nombre ?? null,
    fecha: c.fechaCompromiso,
    monto: c.monto,
    pagado: c.montoPagado,
    estado: c.estado,
  }));
  return { porCobrar, porPagar };
}
