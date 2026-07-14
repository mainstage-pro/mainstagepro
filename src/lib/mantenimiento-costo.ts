// Registro del costo de mantenimiento/reparación al devolver un equipo a servicio.
// Genera una cuenta por pagar categorizada en "Mantenimiento de equipos".

import { prisma } from "@/lib/prisma";
import { esRetornoAServicio } from "@/lib/equipo-estado";

export { esRetornoAServicio };

export const CATEGORIA_MANTENIMIENTO = "Mantenimiento de equipos";

let columnaAsegurada = false;

// Migración lazy: agrega la columna categoriaId a cuentas_pagar si no existe (patrón Neon).
export async function ensureCuentaPagarCategoria(): Promise<void> {
  if (columnaAsegurada) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE cuentas_pagar ADD COLUMN IF NOT EXISTS "categoriaId" TEXT REFERENCES categorias_financieras(id) ON DELETE SET NULL`,
  );
  columnaAsegurada = true;
}

export type CostoMantenimientoInput = {
  hubo: boolean;
  monto?: number | string | null;
  descripcion?: string | null;
  proveedorId?: string | null;
};

// Crea la cuenta por pagar del costo de mantenimiento/reparación.
// No hace nada si no hubo costo o si el payload es inválido.
export async function registrarCostoMantenimiento(params: {
  costo: CostoMantenimientoInput | null | undefined;
  estadoAnterior: string;
  equipoDescripcion: string;
  unidadCodigo?: string | null;
}): Promise<void> {
  const { costo, estadoAnterior, equipoDescripcion, unidadCodigo } = params;
  if (!costo || !costo.hubo) return;

  const monto = typeof costo.monto === "string" ? parseFloat(costo.monto) : costo.monto;
  if (!monto || !Number.isFinite(monto) || monto <= 0) return;

  await ensureCuentaPagarCategoria();

  const categoria = await prisma.categoriaFinanciera.findFirst({
    where: { nombre: CATEGORIA_MANTENIMIENTO, tipo: "GASTO" },
    select: { id: true },
  });

  const tipoTrabajo = estadoAnterior === "EN_REPARACION" ? "Reparación" : "Mantenimiento";
  const equipoLabel = unidadCodigo ? `${equipoDescripcion} (${unidadCodigo})` : equipoDescripcion;
  const concepto = `${tipoTrabajo} — ${equipoLabel}`;

  await prisma.cuentaPagar.create({
    data: {
      tipoAcreedor: costo.proveedorId ? "PROVEEDOR" : "OTRO",
      concepto,
      monto,
      fechaCompromiso: new Date(),
      estado: "PENDIENTE",
      notas: costo.descripcion?.trim() || null,
      proveedorId: costo.proveedorId || null,
      categoriaId: categoria?.id ?? null,
    },
  });
}
