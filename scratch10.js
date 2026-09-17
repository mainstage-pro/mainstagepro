const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({ where: { estado: { not: 'LIQUIDADO' } } });
  let total = 0;
  for (const c of cxc) {
    total += (c.monto - c.montoCobrado);
  }
  console.log("Total pendiente en Cuentas por Cobrar:", total);
}
main().then(() => prisma.$disconnect()).catch(console.error);
