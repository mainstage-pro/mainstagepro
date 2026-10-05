import { prisma } from "@/lib/prisma";

export interface CuentaConSaldo {
  id: string;
  nombre: string;
  banco: string | null;
  numeroCuenta: string | null;
  clabe: string | null;
  titular: string | null;
  rfc: string | null;
  activa: boolean;
  orden: number;
  entradas: number;
  salidas: number;
  saldo: number;
}

/**
 * Saldo de cada cuenta: todo lo que entró menos todo lo que salió.
 * El saldo con el que arrancó la cuenta vive como un movimiento de ingreso
 * ("Saldo inicial — …", ver /finanzas/cuentas), así que ya va incluido.
 */
export async function getCuentasConSaldo(): Promise<CuentaConSaldo[]> {
  const [cuentas, entradas, salidas] = await Promise.all([
    prisma.cuentaBancaria.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoFinanciero.groupBy({
      by: ["cuentaDestinoId"],
      where: { cuentaDestinoId: { not: null } },
      _sum: { monto: true },
    }),
    prisma.movimientoFinanciero.groupBy({
      by: ["cuentaOrigenId"],
      where: { cuentaOrigenId: { not: null } },
      _sum: { monto: true },
    }),
  ]);

  const entradaPorCuenta = new Map(entradas.map((e) => [e.cuentaDestinoId, e._sum.monto ?? 0]));
  const salidaPorCuenta = new Map(salidas.map((s) => [s.cuentaOrigenId, s._sum.monto ?? 0]));

  return cuentas.map((c) => {
    const entrada = entradaPorCuenta.get(c.id) ?? 0;
    const salida = salidaPorCuenta.get(c.id) ?? 0;
    return {
      ...c,
      entradas: entrada,
      salidas: salida,
      saldo: Math.round((entrada - salida) * 100) / 100,
    };
  });
}
