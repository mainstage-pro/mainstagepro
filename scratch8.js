const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany();
  const diffs = cxc.filter(c => c.monto === 2780 || c.montoCobrado === 2780 || (c.monto - c.montoCobrado) === 2780 || c.monto === 26320);
  console.log("Matches:", diffs.length);
  for (const c of diffs) {
    console.log(`ID: ${c.id}, Concepto: ${c.concepto}, Monto: ${c.monto}, Cobrado: ${c.montoCobrado}, Diff: ${c.monto - c.montoCobrado}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
