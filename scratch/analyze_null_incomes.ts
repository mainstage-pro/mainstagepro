import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      tipo: 'INGRESO',
      cuentaDestinoId: null
    }
  });

  const cobros = await prisma.abono.findMany({
    where: { cuentaDestinoId: null }
  });

  const cxc = await prisma.cuentaCobrar.findMany({
    where: { estado: 'LIQUIDADO', cuentaDestinoId: null }
  });

  const totalMovs = movs.reduce((a, b) => a + b.monto, 0);
  const totalCobros = cobros.reduce((a, b) => a + b.monto, 0);
  const totalCxc = cxc.reduce((a, b) => a + b.montoCobrado, 0);

  console.log(`Movimientos de Ingreso sin cuenta: $${totalMovs.toLocaleString()}`);
  console.log(`Abonos sin cuenta: $${totalCobros.toLocaleString()}`);
  console.log(`Cuentas por Cobrar liquidadas sin cuenta: $${totalCxc.toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
