const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany();
  for (const c of cxc) {
      if (Math.abs(c.monto - 2780) < 1 || Math.abs(c.montoCobrado - 2780) < 1 || Math.abs((c.monto - c.montoCobrado) - 2780) < 1) {
          console.log(`Match in CxC: ID ${c.id}, Monto: ${c.monto}, Cobrado: ${c.montoCobrado}`);
      }
  }
  const cxp = await prisma.cuentaPagar.findMany();
  for (const c of cxp) {
      if (Math.abs(c.monto - 2780) < 1 || Math.abs(c.montoPagado - 2780) < 1 || Math.abs((c.monto - c.montoPagado) - 2780) < 1) {
          console.log(`Match in CxP: ID ${c.id}, Monto: ${c.monto}, Pagado: ${c.montoPagado}`);
      }
  }
  const movs = await prisma.movimientoFinanciero.findMany();
  for (const m of movs) {
      if (Math.abs(m.monto - 2780) < 1) {
          console.log(`Match in Movs: ID ${m.id}, Monto: ${m.monto}, Concepto: ${m.concepto}`);
      }
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
